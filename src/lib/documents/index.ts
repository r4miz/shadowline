/**
 * Document orchestration: assemble audit data, run the pure generators, and
 * persist PolicyDocument rows (the editable Markdown is the source of truth).
 * RBAC is enforced by the calling route before these run.
 */
import { brand } from "@/lib/brand";
import { prisma } from "@/lib/db";
import { generateAUP } from "@/lib/documents/aup";
import { generateAiPlan } from "@/lib/documents/ai-plan";
import { generateExecReadout } from "@/lib/documents/exec-readout";
import { generateRiskReport } from "@/lib/documents/report";
import {
  DOC_TYPE_LABELS,
  type DocumentData,
  type GeneratedDocType,
} from "@/lib/documents/types";
import { loadSurveyAggregates } from "@/lib/inventory/sync";
import { recommendPlans, type Recommendation } from "@/lib/recommend/engine";
import { summarizeExpenses } from "@/lib/expenses/match";
import { latestScanForOrganization } from "@/lib/connectors/run-scan";

const GENERATORS: Record<GeneratedDocType, (d: DocumentData) => string> = {
  report: generateRiskReport,
  aup: generateAUP,
  exec_readout: generateExecReadout,
  ai_plan: generateAiPlan,
};

export const DOC_TYPES: GeneratedDocType[] = ["report", "aup", "exec_readout", "ai_plan"];

/** Build the recommendation for an audit from profile + survey + expenses. */
export async function buildRecommendation(engagementId: string): Promise<Recommendation | null> {
  const engagement = await prisma.engagement.findUnique({
    where: { id: engagementId },
    include: { organization: { include: { profile: true } } },
  });
  if (!engagement) return null;
  const [survey, expenses] = await Promise.all([
    loadSurveyAggregates(engagementId),
    prisma.expenseMatch.findMany({ where: { engagementId } }),
  ]);
  const profile = engagement.organization.profile;
  return recommendPlans({
    employeeCount: engagement.organization.employeeCount,
    suite: profile?.suite ?? "unknown",
    dataTypes: profile?.dataTypes ?? [],
    toolUsage: survey.toolUsage,
    respondentCount: survey.respondentCount,
    personalAccountShare: survey.personalAccountShare,
    adoptionAppetite: survey.adoptionAppetite,
    currentMonthlySpendCents: expenses.reduce((n, e) => n + e.monthlyCents, 0),
    priorities: profile?.priorities ?? [],
  });
}

/** Assemble everything the generators need from the audit. */
export async function loadDocumentData(engagementId: string): Promise<DocumentData | null> {
  const engagement = await prisma.engagement.findUnique({
    where: { id: engagementId },
    include: { organization: { include: { consultant: true, profile: true } } },
  });
  if (!engagement) return null;

  const [findings, tools, responseCount, respondentGroups, survey, expenses, scan, recommendation] = await Promise.all([
    prisma.riskFinding.findMany({
      where: { engagementId },
      orderBy: [{ priorityRank: "asc" }, { impact: "desc" }],
      include: { question: { select: { text: true } }, aiTool: { select: { name: true } } },
    }),
    prisma.aITool.findMany({ where: { engagementId } }),
    prisma.response.count({ where: { engagementId } }),
    prisma.response.groupBy({ by: ["respondentToken"], where: { engagementId } }),
    loadSurveyAggregates(engagementId),
    prisma.expenseMatch.findMany({ where: { engagementId }, orderBy: { totalCents: "desc" } }),
    latestScanForOrganization(engagement.organizationId),
    buildRecommendation(engagementId),
  ]);

  const profile = engagement.organization.profile;
  const expenseSummary = summarizeExpenses(
    expenses.map((e) => ({ ...e, caution: undefined }))
  );

  return {
    brandName: brand.name,
    preparerName: engagement.organization.consultant.name,
    organization: {
      name: engagement.organization.name,
      industry: engagement.organization.industry,
      employeeCount: engagement.organization.employeeCount,
      hasEUexposure: engagement.organization.hasEUexposure,
    },
    generatedAt: new Date(),
    findings: findings.map((f) => ({
      ...f,
      sourceQuestion: f.question?.text ?? null,
      sourceTool: f.aiTool?.name ?? null,
    })),
    tools,
    responseCount,
    respondentCount: respondentGroups.length,
    profile: profile
      ? {
          suite: profile.suite,
          dataTypes: profile.dataTypes,
          hasWrittenPolicy: profile.hasWrittenPolicy,
          providedTools: profile.providedTools,
          priorities: profile.priorities,
        }
      : null,
    survey: survey.respondentCount > 0 ? (({ commentsWithheld: _w, ...rest }) => (void _w, rest))(survey) : null,
    scan: scan
      ? {
          provider: scan.provider,
          finishedAt: scan.finishedAt ?? scan.startedAt,
          userCount: scan.userCount ?? 0,
          appCount: scan.appCount ?? scan.apps.length,
          aiAppCount: scan.aiAppCount ?? scan.apps.filter((a) => a.isAi).length,
          highRiskAi: scan.apps.filter((a) => a.isAi && a.riskLevel === "high").length,
          aiApps: scan.apps
            .filter((a) => a.isAi)
            .map((a) => ({ name: a.name, userCount: a.userCount, riskLevel: a.riskLevel, riskNotes: a.riskNotes, category: a.category })),
          builtInAi: (scan.summary as { builtInAi?: { product: string; activeUsers: number } | null } | null)?.builtInAi ?? null,
        }
      : null,
    expenses: expenses.length
      ? {
          monthlyCents: expenseSummary.monthlyCents,
          totalCents: expenseSummary.totalCents,
          vendors: expenseSummary.vendors,
          matches: expenses.map((e) => ({
            toolName: e.toolName,
            vendorName: e.vendorName,
            chargeCount: e.chargeCount,
            monthlyCents: e.monthlyCents,
            cardholder: e.cardholder,
          })),
        }
      : null,
    recommendation,
  };
}

/** Generate all documents and persist them, bumping version on re-run. */
export async function generateDocuments(engagementId: string) {
  const data = await loadDocumentData(engagementId);
  if (!data) return [];

  for (const type of DOC_TYPES) {
    const contentMarkdown = GENERATORS[type](data);
    const existing = await prisma.policyDocument.findFirst({
      where: { engagementId, type },
      orderBy: { version: "desc" },
    });
    if (existing) {
      await prisma.policyDocument.update({
        where: { id: existing.id },
        data: { contentMarkdown, version: existing.version + 1, generatedAt: new Date() },
      });
    } else {
      await prisma.policyDocument.create({ data: { engagementId, type, contentMarkdown } });
    }
  }

  // Deliverables now exist: advance the audit to "review" (forward only).
  await prisma.engagement.updateMany({
    where: { id: engagementId, status: { in: ["draft", "in_progress"] } },
    data: { status: "review" },
  });

  return listDocuments(engagementId);
}

export function listDocuments(engagementId: string) {
  return prisma.policyDocument.findMany({
    where: { engagementId },
    orderBy: { type: "asc" },
  });
}

export { DOC_TYPE_LABELS };
