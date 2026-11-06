/**
 * Turn anonymous employee-survey answers into (a) an AI tool inventory and
 * (b) aggregate statistics for the report and the recommendation engine. Pure.
 *
 * Answers arrive already decrypted and grouped by respondent token. This file
 * never sees identities: a respondent is just an opaque token.
 */
import {
  catalogBySurveyLabel,
  SURVEY_TOOL_NONE,
  type CatalogEntry,
} from "@/lib/ai-catalog";
import {
  CONNECTED_OPTIONS,
  DATA_ENTERED_OPTIONS,
  EXTENSION_OPTIONS,
  GUIDANCE_OPTIONS,
  PAYMENT_OPTIONS,
  SIGN_IN_OPTIONS,
} from "@/lib/employee-survey";
import type { AnswerValue } from "@/lib/scoring";

export interface KeyedResponse {
  questionKey: string;
  respondentToken: string;
  value: AnswerValue;
}

export interface RespondentRecord {
  token: string;
  tools: CatalogEntry[];
  usesOther: boolean;
  signIn: string | null;
  dataTypes: string[];
  connected: string | null;
  extensions: string | null;
  payment: string | null;
  guidance: string | null;
  wouldAdopt: string | null;
  frequency: string | null;
  role: string | null;
  comment: string | null;
}

export type ExposureLevel = "public" | "internal" | "confidential" | "regulated";
const EXPOSURE_RANK: Record<ExposureLevel, number> = { public: 1, internal: 2, confidential: 3, regulated: 4 };

// Index-aligned with DATA_ENTERED_OPTIONS.
const DATA_TYPE_EXPOSURE: ExposureLevel[] = [
  "confidential", // passwords
  "regulated", // customer/patient records
  "regulated", // financial
  "confidential", // contracts
  "regulated", // HR
  "internal", // internal docs
  "confidential", // source code
  "public", // nothing sensitive
];

export function exposureForDataTypes(selected: string[]): ExposureLevel {
  let best: ExposureLevel = "public";
  for (const s of selected) {
    const idx = (DATA_ENTERED_OPTIONS as readonly string[]).indexOf(s);
    if (idx === -1) continue;
    const lvl = DATA_TYPE_EXPOSURE[idx];
    if (EXPOSURE_RANK[lvl] > EXPOSURE_RANK[best]) best = lvl;
  }
  return best;
}

function str(v: AnswerValue | undefined): string | null {
  return typeof v === "string" && v.trim() ? v : null;
}
function arr(v: AnswerValue | undefined): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

export function groupRespondents(responses: KeyedResponse[]): RespondentRecord[] {
  const byToken = new Map<string, Map<string, AnswerValue>>();
  for (const r of responses) {
    if (!byToken.has(r.respondentToken)) byToken.set(r.respondentToken, new Map());
    byToken.get(r.respondentToken)!.set(r.questionKey, r.value);
  }
  const out: RespondentRecord[] = [];
  for (const [token, answers] of byToken) {
    const toolLabels = arr(answers.get("tools_used")).filter((l) => l !== SURVEY_TOOL_NONE);
    const tools: CatalogEntry[] = [];
    let usesOther = false;
    for (const label of toolLabels) {
      const entry = catalogBySurveyLabel(label);
      if (!entry) continue;
      if (entry.key === "other_ai") usesOther = true;
      else tools.push(entry);
    }
    out.push({
      token,
      tools,
      usesOther,
      signIn: str(answers.get("sign_in")),
      dataTypes: arr(answers.get("data_entered")),
      connected: str(answers.get("connected")),
      extensions: str(answers.get("extensions")),
      payment: str(answers.get("payment")),
      guidance: str(answers.get("guidance")),
      wouldAdopt: str(answers.get("would_adopt")),
      frequency: str(answers.get("frequency")),
      role: str(answers.get("role_area")),
      comment: str(answers.get("open_comment")),
    });
  }
  return out;
}

export interface DerivedTool {
  catalogKey: string;
  name: string;
  vendor: string;
  category: string;
  reportedBy: number;
  accessMethod: "org_account" | "personal_account" | "browser_ext";
  dataExposureLevel: ExposureLevel;
  personalUsers: number;
  notes: string | null;
}

const PERSONAL_SIGNINS = new Set<string>([SIGN_IN_OPTIONS[0], SIGN_IN_OPTIONS[1]]);

export function deriveToolsFromSurvey(records: RespondentRecord[]): DerivedTool[] {
  const acc = new Map<string, DerivedTool>();
  for (const r of records) {
    const exposure = exposureForDataTypes(r.dataTypes);
    const personal = r.signIn !== null && PERSONAL_SIGNINS.has(r.signIn);
    for (const entry of r.tools) {
      const t =
        acc.get(entry.key) ??
        ({
          catalogKey: entry.key,
          name: entry.name,
          vendor: entry.vendor,
          category: entry.category,
          reportedBy: 0,
          accessMethod: "org_account",
          dataExposureLevel: "public",
          personalUsers: 0,
          notes: entry.caution ?? null,
        } satisfies DerivedTool);
      t.reportedBy += 1;
      if (personal) t.personalUsers += 1;
      if (EXPOSURE_RANK[exposure] > EXPOSURE_RANK[t.dataExposureLevel]) t.dataExposureLevel = exposure;
      acc.set(entry.key, t);
    }
  }
  for (const t of acc.values()) {
    if (t.personalUsers > 0) t.accessMethod = "personal_account";
    if (t.category === "meeting_notes") t.accessMethod = t.personalUsers > 0 ? "personal_account" : "browser_ext";
  }
  return [...acc.values()].sort((a, b) => b.reportedBy - a.reportedBy || a.name.localeCompare(b.name));
}

export interface SurveyAggregates {
  respondentCount: number;
  aiUsers: number;
  toolUsage: Record<string, number>;
  personalAccountShare: number;
  sensitiveDataShare: number;
  regulatedDataShare: number;
  connectedShare: number;
  extensionShare: number;
  noGuidanceShare: number;
  payingPersonallyShare: number;
  adoptionAppetite: number;
  dailyUsers: number;
  comments: string[];
  roles: Record<string, number>;
}

function share(n: number, d: number) {
  return d === 0 ? 0 : n / d;
}

export function surveyAggregates(records: RespondentRecord[]): SurveyAggregates {
  const n = records.length;
  const toolUsage: Record<string, number> = {};
  const roles: Record<string, number> = {};
  let aiUsers = 0,
    personal = 0,
    sensitive = 0,
    regulated = 0,
    connected = 0,
    extensions = 0,
    noGuidance = 0,
    paying = 0,
    adopt = 0,
    daily = 0;
  const comments: string[] = [];

  for (const r of records) {
    if (r.tools.length > 0 || r.usesOther) aiUsers += 1;
    for (const t of r.tools) toolUsage[t.key] = (toolUsage[t.key] ?? 0) + 1;
    if (r.signIn && PERSONAL_SIGNINS.has(r.signIn)) personal += 1;
    const exposure = exposureForDataTypes(r.dataTypes);
    if (exposure !== "public") sensitive += 1;
    if (exposure === "regulated") regulated += 1;
    if (r.connected === CONNECTED_OPTIONS[0] || r.connected === CONNECTED_OPTIONS[1]) connected += 1;
    if (r.extensions && r.extensions !== EXTENSION_OPTIONS[3]) extensions += 1;
    if (r.guidance === GUIDANCE_OPTIONS[0]) noGuidance += 1;
    if (r.payment === PAYMENT_OPTIONS[0] || r.payment === PAYMENT_OPTIONS[1] || r.payment === PAYMENT_OPTIONS[2]) paying += 1;
    if (r.wouldAdopt === "Yes") adopt += 1;
    if (r.frequency === "Every day") daily += 1;
    if (r.role) roles[r.role] = (roles[r.role] ?? 0) + 1;
    if (r.comment) comments.push(r.comment.slice(0, 500));
  }

  return {
    respondentCount: n,
    aiUsers,
    toolUsage,
    personalAccountShare: share(personal, n),
    sensitiveDataShare: share(sensitive, n),
    regulatedDataShare: share(regulated, n),
    connectedShare: share(connected, n),
    extensionShare: share(extensions, n),
    noGuidanceShare: share(noGuidance, n),
    payingPersonallyShare: share(paying, n),
    adoptionAppetite: share(adopt, n),
    dailyUsers: daily,
    comments,
    roles,
  };
}
