/**
 * Deterministic team-AI plan recommendation. Pure. Every point awarded is
 * written down as a reason so the operator can explain the result to an owner.
 *
 * Factors (max 100):
 *   suite fit        30   plan is native to / included in the company's suite
 *   familiarity      25   share of surveyed staff already using that vendor
 *   compliance       20   regulated data needs a BAA and admin controls
 *   cost             15   cheaper plans score higher, included plans max
 *   controls         10   admin controls, SSO, no training by default
 * Plans whose seat range does not fit the headcount are excluded.
 */
import type { PlanKey } from "@/lib/ai-catalog";
import { PLAN_CATALOG, type PlanProfile } from "./vendors";

export type Suite = "google" | "microsoft" | "both" | "none" | "unknown";

export interface RecommendationInput {
  employeeCount: number;
  suite: Suite;
  /** Owner-declared sensitive data types (see profile options). */
  dataTypes: string[];
  /** catalogKey -> number of survey respondents who reported using it. */
  toolUsage: Record<string, number>;
  respondentCount: number;
  /** Share (0..1) of respondents on personal or mixed accounts. */
  personalAccountShare: number;
  /** Share (0..1) of respondents who said they would adopt a company tool. */
  adoptionAppetite: number;
  /** Current monthly spend on consumer AI subscriptions found in expenses, cents. */
  currentMonthlySpendCents: number;
  /** Operator priorities from the profile, e.g. "lowest_cost", "compliance". */
  priorities: string[];
}

export interface PlanScore {
  plan: PlanProfile;
  score: number;
  reasons: string[];
  cautions: string[];
  estimatedMonthlyCents: number;
  /** Positive when the plan costs less than the consumer subscriptions it replaces. */
  consolidationSavingsCents: number;
  familiarityShare: number;
}

export interface Recommendation {
  ranked: PlanScore[];
  primary: PlanScore | null;
  /** Plain-English paragraph for the owner. */
  summary: string;
  regulated: boolean;
}

export const REGULATED_DATA_TYPES = new Set([
  "health",
  "financial_accounts",
  "payment_cards",
  "legal",
  "children",
  "government_ids",
]);

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

function suiteFit(plan: PlanProfile, suite: Suite): { pts: number; reason: string | null } {
  if (!plan.suiteAffinity) {
    return {
      pts: suite === "none" || suite === "unknown" ? 18 : 10,
      reason:
        suite === "none" || suite === "unknown"
          ? "Works regardless of which office suite the company uses"
          : null,
    };
  }
  const matches = suite === plan.suiteAffinity || suite === "both";
  if (matches) {
    return {
      pts: 30,
      reason: plan.includedInSuite
        ? `The company already runs on ${plan.suiteAffinity === "google" ? "Google Workspace" : "Microsoft 365"}, and this is included in it`
        : `The company already runs on ${plan.suiteAffinity === "google" ? "Google Workspace" : "Microsoft 365"}, so this works inside the tools staff use every day`,
    };
  }
  return { pts: -100, reason: null }; // excluded below
}

function familiarity(plan: PlanProfile, input: RecommendationInput) {
  if (input.respondentCount === 0) return { pts: 8, share: 0, reason: null as string | null };
  const users = plan.replacesCatalogKeys.reduce((n, k) => n + (input.toolUsage[k] ?? 0), 0);
  const share = clamp(users / input.respondentCount, 0, 1);
  const pts = Math.round(share * 25);
  const reason =
    share > 0
      ? `${Math.round(share * 100)}% of surveyed staff already use ${plan.vendor} tools, so adoption will be fast`
      : null;
  return { pts, share, reason };
}

function compliance(plan: PlanProfile, regulated: boolean) {
  if (!regulated) {
    return { pts: plan.adminControls ? 12 : 4, reason: null as string | null, caution: null as string | null };
  }
  switch (plan.baa) {
    case "yes":
      return { pts: 20, reason: "Offers a HIPAA-style agreement and admin data controls for regulated information", caution: null };
    case "higher_tier":
      return { pts: 8, reason: null, caution: "Regulated data is in scope: this vendor offers the required agreement only on a higher tier" };
    case "verify":
      return { pts: 6, reason: null, caution: "Regulated data is in scope: confirm data-protection and HIPAA terms with the vendor before rollout" };
    default:
      return { pts: 0, reason: null, caution: "Regulated data is in scope and this plan does not offer the required agreement" };
  }
}

function costScore(plan: PlanProfile, cheapest: number, priorities: string[]) {
  const monthly = plan.annualPerSeatCents;
  const weight = priorities.includes("lowest_cost") ? 1.4 : 1;
  if (plan.includedInSuite) return { pts: Math.round(15 * weight), reason: "No extra per-seat licence for staff already on the suite" };
  if (monthly <= cheapest) return { pts: Math.round(12 * weight), reason: "Lowest per-seat price among standalone plans" };
  const ratio = cheapest / monthly;
  return { pts: Math.round(12 * ratio * weight), reason: null as string | null };
}

function controls(plan: PlanProfile) {
  let pts = 0;
  const reasons: string[] = [];
  if (plan.adminControls) pts += 4;
  if (plan.sso === "yes") {
    pts += 3;
    reasons.push("Single sign-on, so access ends when an employee leaves");
  }
  if (plan.noTrainingByDefault) {
    pts += 3;
    reasons.push("Company data is not used to train the vendor's models by default");
  }
  return { pts, reasons };
}

export function recommendPlans(input: RecommendationInput): Recommendation {
  const regulated = input.dataTypes.some((d) => REGULATED_DATA_TYPES.has(d));
  const standalone = PLAN_CATALOG.filter((p) => !p.includedInSuite);
  const cheapest = Math.min(...standalone.map((p) => p.annualPerSeatCents));

  const ranked: PlanScore[] = [];
  for (const plan of PLAN_CATALOG) {
    if (input.employeeCount < plan.seatMin) continue;
    if (plan.seatMax !== null && input.employeeCount > plan.seatMax) continue;

    const fit = suiteFit(plan, input.suite);
    if (fit.pts < 0) continue;

    const fam = familiarity(plan, input);
    const comp = compliance(plan, regulated);
    const cost = costScore(plan, cheapest, input.priorities);
    const ctl = controls(plan);

    const reasons = [fit.reason, fam.reason, comp.reason, cost.reason, ...ctl.reasons].filter(
      (r): r is string => Boolean(r)
    );
    const cautions = [...plan.cautions, comp.caution].filter((c): c is string => Boolean(c));

    const estimatedMonthlyCents = plan.annualPerSeatCents * input.employeeCount;
    const consolidationSavingsCents = Math.max(0, input.currentMonthlySpendCents - estimatedMonthlyCents);
    if (consolidationSavingsCents > 0) {
      reasons.push(
        `Replaces about $${(input.currentMonthlySpendCents / 100).toFixed(0)}/month of scattered personal subscriptions found in expenses`
      );
    }

    let score = clamp(fit.pts + fam.pts + comp.pts + cost.pts + ctl.pts, 0, 100);
    if (input.priorities.includes("compliance") && comp.pts >= 18) score = clamp(score + 5, 0, 100);
    if (input.priorities.includes("staff_familiarity")) score = clamp(score + Math.round(fam.share * 8), 0, 100);

    ranked.push({
      plan,
      score,
      reasons,
      cautions,
      estimatedMonthlyCents,
      consolidationSavingsCents,
      familiarityShare: fam.share,
    });
  }

  ranked.sort((a, b) => b.score - a.score || a.estimatedMonthlyCents - b.estimatedMonthlyCents);
  const primary = ranked[0] ?? null;

  return {
    ranked,
    primary,
    regulated,
    summary: buildSummary(input, primary, ranked[1] ?? null, regulated),
  };
}

function buildSummary(
  input: RecommendationInput,
  primary: PlanScore | null,
  runnerUp: PlanScore | null,
  regulated: boolean
): string {
  if (!primary) {
    return "No plan in the catalog fits this headcount. Review the vendor list or talk to the vendors directly about enterprise options.";
  }
  const parts: string[] = [];
  const cost =
    primary.estimatedMonthlyCents === 0
      ? "at no extra licence cost on the current suite"
      : `at about $${(primary.estimatedMonthlyCents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })} per month for ${input.employeeCount} seats`;
  parts.push(`Recommend ${primary.plan.name} ${cost}.`);
  if (primary.familiarityShare > 0) {
    parts.push(
      `${Math.round(primary.familiarityShare * 100)}% of surveyed staff already use ${primary.plan.vendor} tools, so the switch is mostly a matter of moving them onto company accounts.`
    );
  }
  if (input.personalAccountShare >= 0.5) {
    parts.push(
      `${Math.round(input.personalAccountShare * 100)}% of staff currently sign in with personal accounts, which the company cannot see or shut off; a team plan fixes that first.`
    );
  }
  if (regulated) {
    parts.push(
      "Because regulated data is in scope, sign the vendor's data-protection agreement before anyone uses the tool with that data."
    );
  }
  if (primary.consolidationSavingsCents > 0) {
    parts.push(
      `It also saves roughly $${(primary.consolidationSavingsCents / 100).toFixed(0)} per month against the personal subscriptions found in expenses.`
    );
  }
  if (runnerUp) {
    parts.push(`Runner-up: ${runnerUp.plan.name}.`);
  }
  return parts.join(" ");
}

export const PLAN_KEYS: PlanKey[] = PLAN_CATALOG.map((p) => p.key);
