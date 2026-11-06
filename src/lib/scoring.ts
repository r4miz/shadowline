/**
 * Deterministic risk-scoring engine (spec section 5.6). NO AI inference, NO
 * randomness, every function here is pure so the whole engine is unit-testable
 * and a generated finding can always be explained to a client.
 *
 * Model:
 *   - impact     = the question's `weight` (1-5); "most consequential" = impact.
 *   - likelihood = how bad the chosen answer is, derived from the question's
 *     risk-ordered options (see question-bank.ts conventions): worst answer = 5,
 *     safest answer = 1.
 *   - risk       = likelihood x impact (1-25).
 *   - rag        = RAG_THRESHOLDS: 1-6 green, 7-14 amber, 15-25 red.
 *
 * A draft RiskFinding is generated for any non-green (amber/red) answer. The
 * consultant reviews, edits, and prunes these, they are drafts, not verdicts.
 */
import { RAG_THRESHOLDS } from "./constants";

export type RagRating = "green" | "amber" | "red";
export type Effort = "low" | "med" | "high";
export type NistFunction = "GOVERN" | "MAP" | "MEASURE" | "MANAGE";
export type AnswerType = "single" | "multi" | "boolean";
export type AnswerValue = string | string[] | boolean;

/** The subset of a Question needed to score an answer. */
export interface ScorableQuestion {
  text: string;
  domain: string;
  answerType: AnswerType;
  options: string[] | null;
  nistFunction: NistFunction;
  owaspRefs: string[];
  weight: number;
}

export interface AnswerScore {
  likelihood: number;
  impact: number;
  risk: number;
  rag: RagRating;
}

/** A draft finding ready to persist as a RiskFinding row (minus engagementId). */
export interface FindingDraft {
  title: string;
  description: string;
  likelihood: number;
  impact: number;
  ragRating: RagRating;
  owaspRefs: string[];
  nistFunction: NistFunction;
  recommendation: string;
  effort: Effort;
  // Source survey question, so regenerate can skip questions a consultant has
  // already adopted (edited → manual). Null for purely manual findings.
  questionId: string | null;
  // Source AI tool (inventory-derived findings). Same regenerate-skip role as
  // questionId. Null for question-derived or purely manual findings.
  aiToolId: string | null;
}

export interface RankedFindingDraft extends FindingDraft {
  priorityRank: number;
}

export interface ScorableResponse {
  question: ScorableQuestion;
  value: AnswerValue;
}

/** A response carrying its question id, so multiple respondents can be grouped. */
export interface IdentifiedResponse extends ScorableResponse {
  questionId: string;
}

function clampScale(n: number): number {
  if (Number.isNaN(n)) return 1;
  return Math.min(5, Math.max(1, Math.round(n)));
}

/** risk = likelihood x impact, each clamped to 1-5 → 1-25. */
export function riskScore(likelihood: number, impact: number): number {
  return clampScale(likelihood) * clampScale(impact);
}

/** RAG band for a 1-25 risk score using RAG_THRESHOLDS. */
export function ragFromScore(score: number): RagRating {
  if (score <= RAG_THRESHOLDS.greenMax) return "green";
  if (score <= RAG_THRESHOLDS.amberMax) return "amber";
  return "red";
}

/**
 * Likelihood (1-5) from how risky the chosen answer is.
 * Returns null when the answer can't be scored (unknown option / no selection).
 */
export function answerLikelihood(
  question: ScorableQuestion,
  value: AnswerValue
): number | null {
  if (question.answerType === "boolean") {
    if (typeof value !== "boolean") return null;
    // Convention: true/"Yes" is the safer answer.
    return value ? 1 : 5;
  }

  if (question.answerType === "multi") {
    if (!Array.isArray(value) || value.length === 0) return null;
    const opts = question.options ?? [];
    if (opts.length === 0) return null;
    // Convention: options are ordered worst-first, so the LAST option is the
    // "safe/none" sentinel (e.g. "None known"). More RISKY selections = more
    // exposure; selecting only the safe option is the lowest likelihood.
    const safe = opts[opts.length - 1];
    const riskyTotal = opts.length - 1;
    if (riskyTotal <= 0) return 1;
    const riskySelected = value.filter(
      (v) => v !== safe && opts.includes(v)
    ).length;
    if (riskySelected === 0) return 1;
    const fraction = Math.min(riskySelected, riskyTotal) / riskyTotal;
    return clampScale(1 + fraction * 4);
  }

  // single
  const options = question.options ?? [];
  if (typeof value !== "string") return null;
  const index = options.indexOf(value);
  if (index === -1) return null;
  const n = options.length;
  if (n <= 1) return 1;
  // Options are ordered worst-first: index 0 = highest severity.
  const severity = (n - 1 - index) / (n - 1); // 1 (worst) .. 0 (best)
  return clampScale(1 + severity * 4);
}

/** Full score for an answer, or null if it can't be scored. */
export function scoreAnswer(
  question: ScorableQuestion,
  value: AnswerValue
): AnswerScore | null {
  const likelihood = answerLikelihood(question, value);
  if (likelihood === null) return null;
  const impact = clampScale(question.weight);
  const risk = riskScore(likelihood, impact);
  return { likelihood, impact, risk, rag: ragFromScore(risk) };
}

/**
 * Default remediation effort by NIST function, a heuristic so the prioritized
 * roadmap is meaningful out of the box; the consultant can override per finding.
 * GOVERN = drafting policy (quick); MEASURE = standing up technical monitoring
 * (slow); MAP/MANAGE = discovery and process work (medium).
 */
export function effortForNistFunction(fn: NistFunction): Effort {
  switch (fn) {
    case "GOVERN":
      return "low";
    case "MEASURE":
      return "high";
    case "MAP":
    case "MANAGE":
      return "med";
  }
}

const RAG_LABEL: Record<Exclude<RagRating, "green">, string> = {
  red: "High",
  amber: "Moderate",
};

function answerLabel(question: ScorableQuestion, value: AnswerValue): string {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.join(", ");
  return value;
}

function recommendationFor(question: ScorableQuestion): string {
  if (question.answerType === "boolean") {
    return "Implement the missing control so this requirement is satisfied (target answer: Yes).";
  }
  if (question.answerType === "multi") {
    return "Reduce exposure by approving and consolidating the AI tools in use, moving staff onto company accounts, and removing those that are unnecessary or unapproved.";
  }
  const options = question.options ?? [];
  const safest = options[options.length - 1];
  return safest
    ? `Work toward the target state: "${safest}".`
    : "Move toward the lowest-risk practice for this control.";
}

/**
 * Build a draft finding for an answer, or null when the answer is safe (green)
 * or unscoreable.
 */
export function buildFindingDraft(
  question: ScorableQuestion,
  value: AnswerValue,
  questionId: string | null = null
): FindingDraft | null {
  const score = scoreAnswer(question, value);
  if (!score || score.rag === "green") return null;

  const label = answerLabel(question, value);
  return {
    title: `${question.domain}: ${RAG_LABEL[score.rag]} risk`,
    description: `Assessment responses for "${question.text}" indicated "${label}", which scores ${score.likelihood} (likelihood) × ${score.impact} (impact) = ${score.risk}, a ${score.rag} rating.`,
    likelihood: score.likelihood,
    impact: score.impact,
    ragRating: score.rag,
    owaspRefs: question.owaspRefs,
    nistFunction: question.nistFunction,
    recommendation: recommendationFor(question),
    effort: effortForNistFunction(question.nistFunction),
    questionId,
    aiToolId: null,
  };
}

// ---- AI tool inventory scoring (spec §4: findings are auto-generated from
// responses AND the inventory, the inventory is the heart of a shadow-AI audit).

/** The subset of an AITool needed to score it. */
export interface ScorableTool {
  id?: string;
  name: string;
  vendor?: string | null;
  dataExposureLevel?: string | null; // public | internal | confidential | regulated | null
  sanctioned: boolean;
  accessMethod: string; // org_account | personal_account | browser_ext | api | mcp_agent
}

// Impact is driven by how sensitive the data the tool can touch is.
const EXPOSURE_IMPACT: Record<string, number> = {
  regulated: 5,
  confidential: 4,
  internal: 3,
  public: 2,
};

// Access methods that lack central oversight or carry autonomous/broad agency
// raise the likelihood of misuse.
const ELEVATED_ACCESS = new Set([
  "personal_account",
  "browser_ext",
  "mcp_agent",
]);

const ACCESS_LABEL: Record<string, string> = {
  org_account: "an organization account",
  personal_account: "a personal account",
  browser_ext: "a browser extension",
  api: "an API integration",
  mcp_agent: "an MCP / autonomous agent",
};

/** Deterministic risk score for an inventoried AI tool. */
export function scoreTool(tool: ScorableTool): AnswerScore {
  const impact = clampScale(
    tool.dataExposureLevel
      ? (EXPOSURE_IMPACT[tool.dataExposureLevel] ?? 2)
      : 2
  );
  // Shadow (unsanctioned) tools have no governance, so they start higher.
  const base = tool.sanctioned ? 2 : 4;
  const likelihood = clampScale(base + (ELEVATED_ACCESS.has(tool.accessMethod) ? 1 : 0));
  const risk = riskScore(likelihood, impact);
  return { likelihood, impact, risk, rag: ragFromScore(risk) };
}

function toolOwaspRefs(tool: ScorableTool): string[] {
  const refs = new Set<string>();
  switch (tool.accessMethod) {
    case "mcp_agent":
      refs.add("LLM06"); // Excessive Agency
      refs.add("LLM05"); // Improper Output Handling
      break;
    case "browser_ext":
      refs.add("LLM02");
      refs.add("LLM05");
      break;
    case "api":
      refs.add("LLM03"); // Supply Chain
      break;
    case "personal_account":
      refs.add("LLM02");
      break;
  }
  if (tool.dataExposureLevel === "confidential" || tool.dataExposureLevel === "regulated") {
    refs.add("LLM02"); // Sensitive Information Disclosure
  }
  return [...refs].sort();
}

function toolNistFunction(tool: ScorableTool): NistFunction {
  if (tool.accessMethod === "mcp_agent") return "MEASURE";
  if (tool.accessMethod === "personal_account" || tool.accessMethod === "org_account")
    return "MANAGE";
  return "MAP";
}

function toolRecommendation(tool: ScorableTool): string {
  if (!tool.sanctioned) {
    return "Bring this tool under governance: approve it under a written agreement with appropriate data-protection terms, or block it, and prohibit its use with internal, confidential, or regulated data until then.";
  }
  if (tool.accessMethod === "mcp_agent") {
    return "Require human review before any autonomous send, commit, or workflow action, and keep all agent integrations inventoried and approved.";
  }
  if (tool.accessMethod === "personal_account") {
    return "Require organization-managed accounts for this tool; prohibit personal accounts for company data.";
  }
  return "Apply least-privilege access and restrict this tool from data above its approved classification.";
}

/** Build a draft finding for an inventoried tool, or null if it is low-risk. */
export function buildToolFindingDraft(
  tool: ScorableTool,
  aiToolId: string | null = null
): FindingDraft | null {
  const score = scoreTool(tool);
  if (score.rag === "green") return null;

  const nistFunction = toolNistFunction(tool);
  const exposure = tool.dataExposureLevel
    ? ` with ${tool.dataExposureLevel} data exposure`
    : "";
  const access = ACCESS_LABEL[tool.accessMethod] ?? tool.accessMethod;
  const status = tool.sanctioned ? "approved" : "shadow (not approved)";

  return {
    title: `${tool.name}: ${RAG_LABEL[score.rag]} risk (${tool.sanctioned ? "approved" : "shadow"} AI tool)`,
    description: `${tool.name}${tool.vendor ? ` (${tool.vendor})` : ""} is a ${status} AI tool accessed via ${access}${exposure}. Scores ${score.likelihood} (likelihood) × ${score.impact} (impact) = ${score.risk}, a ${score.rag} rating.`,
    likelihood: score.likelihood,
    impact: score.impact,
    ragRating: score.rag,
    owaspRefs: toolOwaspRefs(tool),
    nistFunction,
    recommendation: toolRecommendation(tool),
    effort: effortForNistFunction(nistFunction),
    questionId: null,
    aiToolId,
  };
}

const EFFORT_ORDER: Record<Effort, number> = { low: 0, med: 1, high: 2 };

/**
 * Sort findings into a remediation roadmap (spec 5.6: impact desc, then effort
 * asc) and assign priorityRank starting at 1. Pure; does not mutate input.
 */
export function prioritizeFindings(
  drafts: FindingDraft[]
): RankedFindingDraft[] {
  return [...drafts]
    .sort((a, b) => {
      if (b.impact !== a.impact) return b.impact - a.impact;
      return EFFORT_ORDER[a.effort] - EFFORT_ORDER[b.effort];
    })
    .map((draft, i) => ({ ...draft, priorityRank: i + 1 }));
}

/**
 * Anonymous surveys yield many responses per question. For risk scoring we keep
 * the worst-case (highest-likelihood) answer per question, if any respondent
 * reports the risky behavior, the exposure exists. Unscoreable answers are
 * ignored; a question with no scoreable answer is dropped. Order of first
 * appearance is preserved for stable downstream sorting.
 */
export function worstResponsePerQuestion(
  responses: IdentifiedResponse[]
): IdentifiedResponse[] {
  const worst = new Map<
    string,
    { response: IdentifiedResponse; likelihood: number }
  >();
  const order: string[] = [];

  for (const r of responses) {
    const likelihood = answerLikelihood(r.question, r.value);
    if (likelihood === null) continue;
    const existing = worst.get(r.questionId);
    if (!existing) {
      order.push(r.questionId);
      worst.set(r.questionId, { response: r, likelihood });
    } else if (likelihood > existing.likelihood) {
      existing.response = r;
      existing.likelihood = likelihood;
    }
  }

  return order.map((id) => worst.get(id)!.response);
}

/**
 * Score every response, drop safe/unscoreable ones, and return a prioritized
 * list of draft findings ready to persist.
 */
export function generateFindingDrafts(
  responses: Array<ScorableResponse | IdentifiedResponse>,
  tools: ScorableTool[] = []
): RankedFindingDraft[] {
  const responseDrafts = responses.map((r) =>
    buildFindingDraft(
      r.question,
      r.value,
      "questionId" in r ? r.questionId : null
    )
  );
  const toolDrafts = tools.map((t) => buildToolFindingDraft(t, t.id ?? null));
  const drafts = [...responseDrafts, ...toolDrafts].filter(
    (d): d is FindingDraft => d !== null
  );
  return prioritizeFindings(drafts);
}
