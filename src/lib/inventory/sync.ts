/**
 * Server-side inventory sync: merge evidence from the employee survey, the
 * latest workspace scan and the expense upload into AITool rows for an audit.
 *
 * Rules:
 *  - Rows are keyed by catalogKey. A row the operator created or edited by hand
 *    (source = manual) is never overwritten; only its evidence counters update.
 *  - Rows created by this sync are fully refreshed each run.
 *  - `sanctioned` follows the company profile's providedTools list unless the
 *    row is manual.
 *
 * NEVER log decrypted answer values here.
 */
import { decryptJson } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { catalogByKey } from "@/lib/ai-catalog";
import type { AnswerValue } from "@/lib/scoring";
import {
  deriveToolsFromSurvey,
  groupRespondents,
  surveyAggregates,
  type KeyedResponse,
  type RespondentRecord,
  type SurveyAggregates,
} from "./derive";

export async function loadRespondentRecords(engagementId: string): Promise<RespondentRecord[]> {
  const rows = await prisma.response.findMany({
    where: { engagementId, question: { audience: "employee" }, respondentToken: { not: null } },
    select: { value: true, respondentToken: true, question: { select: { key: true } } },
  });
  const keyed: KeyedResponse[] = [];
  for (const r of rows) {
    if (!r.question.key || !r.respondentToken) continue;
    try {
      keyed.push({
        questionKey: r.question.key,
        respondentToken: r.respondentToken,
        value: decryptJson<AnswerValue>(r.value as string),
      });
    } catch {
      continue; // undecryptable row is skipped, never fails the run
    }
  }
  return groupRespondents(keyed);
}

// Free-text comments are only released once enough people have answered, so a
// single respondent's words cannot be tied back to them. Every consumer (API,
// documents) goes through here.
export const COMMENT_RELEASE_THRESHOLD = 5;

export async function loadSurveyAggregates(
  engagementId: string
): Promise<SurveyAggregates & { commentsWithheld: boolean }> {
  const agg = surveyAggregates(await loadRespondentRecords(engagementId));
  if (agg.respondentCount < COMMENT_RELEASE_THRESHOLD && agg.comments.length > 0) {
    return { ...agg, comments: [], commentsWithheld: true };
  }
  return { ...agg, commentsWithheld: false };
}

type ExposureLevel = "public" | "internal" | "confidential" | "regulated";
const RANK: Record<ExposureLevel, number> = { public: 1, internal: 2, confidential: 3, regulated: 4 };
function worse(a: ExposureLevel, b: ExposureLevel): ExposureLevel {
  return RANK[a] >= RANK[b] ? a : b;
}

function exposureFromRisk(level: "high" | "medium" | "low"): ExposureLevel {
  return level === "high" ? "confidential" : level === "medium" ? "internal" : "public";
}

interface Candidate {
  catalogKey: string;
  name: string;
  vendor: string | null;
  category: string | null;
  accessMethod: "org_account" | "personal_account" | "browser_ext";
  dataExposureLevel: ExposureLevel;
  reportedBy: number;
  monthlySpendCents: number | null;
  notes: string[];
  sources: Set<"survey" | "scan" | "expense">;
}

export async function syncInventory(engagementId: string) {
  const engagement = await prisma.engagement.findUnique({
    where: { id: engagementId },
    select: {
      organizationId: true,
      organization: { select: { profile: { select: { providedTools: true } } } },
    },
  });
  if (!engagement) return [];
  const provided = new Set(engagement.organization.profile?.providedTools ?? []);

  const [records, latestScan, expenses] = await Promise.all([
    loadRespondentRecords(engagementId),
    prisma.scan.findFirst({
      where: { organizationId: engagement.organizationId, status: "complete" },
      orderBy: { finishedAt: "desc" },
      include: { apps: { where: { isAi: true } } },
    }),
    prisma.expenseMatch.findMany({ where: { engagementId } }),
  ]);

  const candidates = new Map<string, Candidate>();
  const upsert = (key: string, init: () => Candidate) => candidates.get(key) ?? (candidates.set(key, init()), candidates.get(key)!);

  for (const t of deriveToolsFromSurvey(records)) {
    const c = upsert(t.catalogKey, () => ({
      catalogKey: t.catalogKey,
      name: t.name,
      vendor: t.vendor,
      category: t.category,
      accessMethod: t.accessMethod,
      dataExposureLevel: t.dataExposureLevel,
      reportedBy: 0,
      monthlySpendCents: null,
      notes: [],
      sources: new Set(),
    }));
    c.reportedBy = t.reportedBy;
    c.accessMethod = t.accessMethod;
    c.dataExposureLevel = worse(c.dataExposureLevel, t.dataExposureLevel);
    if (t.notes) c.notes.push(t.notes);
    c.sources.add("survey");
  }

  for (const app of latestScan?.apps ?? []) {
    const key = app.catalogKey ?? `scan:${app.externalId}`;
    const entry = app.catalogKey ? catalogByKey(app.catalogKey) : undefined;
    const c = upsert(key, () => ({
      catalogKey: key,
      name: entry?.name ?? app.name,
      vendor: entry?.vendor ?? app.publisher,
      category: entry?.category ?? app.category ?? null,
      accessMethod: "org_account",
      dataExposureLevel: "public",
      reportedBy: 0,
      monthlySpendCents: null,
      notes: [],
      sources: new Set(),
    }));
    c.dataExposureLevel = worse(c.dataExposureLevel, exposureFromRisk(app.riskLevel));
    c.notes.push(`Connected to ${app.userCount} work account${app.userCount === 1 ? "" : "s"} (workspace scan)`);
    for (const n of app.riskNotes) if (!c.notes.includes(n)) c.notes.push(n);
    c.sources.add("scan");
  }

  const spendByKey = new Map<string, number>();
  for (const e of expenses) spendByKey.set(e.vendorKey, (spendByKey.get(e.vendorKey) ?? 0) + e.monthlyCents);
  for (const [key, cents] of spendByKey) {
    const entry = catalogByKey(key);
    const c = upsert(key, () => ({
      catalogKey: key,
      name: entry?.name ?? key,
      vendor: entry?.vendor ?? null,
      category: entry?.category ?? null,
      accessMethod: "personal_account",
      dataExposureLevel: "public",
      reportedBy: 0,
      monthlySpendCents: null,
      notes: [],
      sources: new Set(),
    }));
    c.monthlySpendCents = cents;
    c.notes.push(`About $${(cents / 100).toFixed(0)}/month in card charges (expense scan)`);
    c.sources.add("expense");
  }

  const existing = await prisma.aITool.findMany({ where: { engagementId } });
  const byKey = new Map(existing.filter((t) => t.catalogKey).map((t) => [t.catalogKey as string, t]));
  const seen = new Set<string>();

  await prisma.$transaction(async (tx) => {
    for (const c of candidates.values()) {
      seen.add(c.catalogKey);
      const sourceLabel: "survey" | "scan" | "expense" = c.sources.has("survey") ? "survey" : c.sources.has("scan") ? "scan" : "expense";
      const row = byKey.get(c.catalogKey);
      const sanctioned = provided.has(c.catalogKey);
      if (row?.source === "manual") {
        await tx.aITool.update({
          where: { id: row.id },
          data: { reportedBy: c.reportedBy, monthlySpendCents: c.monthlySpendCents },
        });
        continue;
      }
      const data = {
        name: c.name,
        vendor: c.vendor,
        category: c.category,
        dataExposureLevel: c.dataExposureLevel,
        sanctioned,
        accessMethod: sanctioned && c.accessMethod === "personal_account" ? ("org_account" as const) : c.accessMethod,
        notes: c.notes.join(" ") || null,
        source: sourceLabel,
        reportedBy: c.reportedBy,
        monthlySpendCents: c.monthlySpendCents,
      };
      if (row) await tx.aITool.update({ where: { id: row.id }, data });
      else await tx.aITool.create({ data: { ...data, engagementId, catalogKey: c.catalogKey } });
    }
    // Derived rows whose evidence disappeared are removed; manual rows stay.
    const stale = existing.filter((t) => t.source !== "manual" && t.catalogKey && !seen.has(t.catalogKey));
    if (stale.length) await tx.aITool.deleteMany({ where: { id: { in: stale.map((t) => t.id) } } });
  });

  return prisma.aITool.findMany({ where: { engagementId }, orderBy: [{ sanctioned: "asc" }, { reportedBy: "desc" }, { name: "asc" }] });
}
