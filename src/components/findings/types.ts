export type RagRating = "red" | "amber" | "green";
export type Effort = "low" | "med" | "high";
export type NistFunction = "GOVERN" | "MAP" | "MEASURE" | "MANAGE";
export type FindingOrigin = "auto" | "manual";

export interface RiskFinding {
  id: string;
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
  origin: FindingOrigin;
}

export const NIST_FUNCTIONS: NistFunction[] = [
  "GOVERN",
  "MAP",
  "MEASURE",
  "MANAGE",
];

export const EFFORTS: Effort[] = ["low", "med", "high"];

export const EFFORT_LABELS: Record<Effort, string> = {
  low: "Low effort",
  med: "Medium effort",
  high: "High effort",
};

// OWASP LLM Top 10 2025 ids (spec section 5.1).
export const OWASP_LLM_REFS = [
  "LLM01",
  "LLM02",
  "LLM03",
  "LLM04",
  "LLM05",
  "LLM06",
  "LLM07",
  "LLM08",
  "LLM09",
  "LLM10",
];
