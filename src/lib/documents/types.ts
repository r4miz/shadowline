import type { Effort, NistFunction, RagRating } from "@/lib/scoring";
import type { SurveyAggregates } from "@/lib/inventory/derive";
import type { Recommendation } from "@/lib/recommend/engine";

export interface DocFinding {
  title: string;
  description: string;
  likelihood: number;
  impact: number;
  ragRating: RagRating;
  owaspRefs: string[];
  nistFunction: NistFunction;
  recommendation: string;
  effort: Effort;
  priorityRank: number | null;
  // Text of the survey question this finding was derived from, if any.
  sourceQuestion?: string | null;
  // Name of the inventoried AI tool this finding was derived from, if any.
  sourceTool?: string | null;
}

export interface DocTool {
  name: string;
  vendor: string | null;
  category: string | null;
  dataExposureLevel: string | null;
  sanctioned: boolean;
  accessMethod: string;
  notes: string | null;
  source?: string;
  reportedBy?: number;
  monthlySpendCents?: number | null;
}

export interface DocOrganization {
  name: string;
  industry: string | null;
  employeeCount: number | null;
  hasEUexposure: boolean;
}

export interface DocProfile {
  suite: "google" | "microsoft" | "both" | "none" | "unknown";
  dataTypes: string[];
  hasWrittenPolicy: boolean | null;
  providedTools: string[];
  priorities: string[];
}

export interface DocScanApp {
  name: string;
  userCount: number;
  riskLevel: "high" | "medium" | "low";
  riskNotes: string[];
  category: string | null;
}

export interface DocScan {
  provider: string;
  finishedAt: Date;
  userCount: number;
  appCount: number;
  aiAppCount: number;
  highRiskAi: number;
  aiApps: DocScanApp[];
  builtInAi: { product: string; activeUsers: number } | null;
}

export interface DocExpenses {
  monthlyCents: number;
  totalCents: number;
  vendors: number;
  matches: Array<{
    toolName: string;
    vendorName: string;
    chargeCount: number;
    monthlyCents: number;
    cardholder: string | null;
  }>;
}

/** Everything the document generators need. Assembled from the audit. */
export interface DocumentData {
  brandName: string;
  preparerName: string;
  organization: DocOrganization;
  generatedAt: Date;
  findings: DocFinding[];
  tools: DocTool[];
  responseCount: number;
  respondentCount: number;
  profile: DocProfile | null;
  survey: SurveyAggregates | null;
  scan: DocScan | null;
  expenses: DocExpenses | null;
  recommendation: Recommendation | null;
}

export type GeneratedDocType = "report" | "aup" | "exec_readout" | "ai_plan";

export const DOC_TYPE_LABELS: Record<GeneratedDocType, string> = {
  report: "AI Risk Report",
  aup: "AI Acceptable Use Policy",
  exec_readout: "Executive Readout",
  ai_plan: "AI Platform Recommendation",
};

export const DOC_TYPE_DESCRIPTIONS: Record<GeneratedDocType, string> = {
  report: "The full picture: what staff use, what is connected, what it costs, and what to fix first.",
  aup: "The rules, written for this company and ready for staff to sign.",
  exec_readout: "One page for the owner: posture, three numbers, next steps.",
  ai_plan: "Which team AI plan fits, why, and what it costs.",
};
