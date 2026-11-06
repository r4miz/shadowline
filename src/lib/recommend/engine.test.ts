import { describe, expect, it } from "vitest";
import { recommendPlans, type RecommendationInput } from "./engine";
import { PLAN_CATALOG } from "./vendors";

const base: RecommendationInput = {
  employeeCount: 40,
  suite: "none",
  dataTypes: [],
  toolUsage: {},
  respondentCount: 0,
  personalAccountShare: 0,
  adoptionAppetite: 0,
  currentMonthlySpendCents: 0,
  priorities: [],
};

describe("recommendPlans", () => {
  it("is deterministic", () => {
    const a = recommendPlans({ ...base, toolUsage: { chatgpt: 10 }, respondentCount: 20 });
    const b = recommendPlans({ ...base, toolUsage: { chatgpt: 10 }, respondentCount: 20 });
    expect(a).toEqual(b);
  });

  it("excludes suite-bound plans when the company is on no suite", () => {
    const r = recommendPlans(base);
    const keys = r.ranked.map((p) => p.plan.key);
    expect(keys).not.toContain("m365_copilot");
    expect(keys).not.toContain("gemini_workspace");
    expect(keys).toContain("chatgpt_business");
    expect(keys).toContain("claude_team");
  });

  it("prefers Gemini for a Google Workspace company with no strong familiarity", () => {
    const r = recommendPlans({ ...base, suite: "google" });
    expect(r.primary?.plan.key).toBe("gemini_workspace");
    expect(r.primary?.estimatedMonthlyCents).toBe(0);
    expect(r.summary).toMatch(/Gemini/);
  });

  it("prefers Copilot for a Microsoft company handling regulated data", () => {
    const r = recommendPlans({ ...base, suite: "microsoft", dataTypes: ["health"] });
    expect(r.regulated).toBe(true);
    expect(r.primary?.plan.key).toBe("m365_copilot");
    expect(r.summary).toMatch(/regulated data/i);
  });

  it("lets strong staff familiarity lift ChatGPT on a Google suite", () => {
    const r = recommendPlans({
      ...base,
      suite: "google",
      toolUsage: { chatgpt: 19 },
      respondentCount: 20,
      priorities: ["staff_familiarity"],
    });
    const chat = r.ranked.find((p) => p.plan.key === "chatgpt_business")!;
    const gem = r.ranked.find((p) => p.plan.key === "gemini_workspace")!;
    expect(chat.familiarityShare).toBeCloseTo(0.95);
    expect(chat.reasons.join(" ")).toMatch(/95% of surveyed staff/);
    // Gemini still wins on cost but ChatGPT must be a close runner-up, not excluded.
    expect(gem.score - chat.score).toBeLessThan(25);
  });

  it("excludes Claude Team above 150 seats", () => {
    const r = recommendPlans({ ...base, employeeCount: 200 });
    expect(r.ranked.map((p) => p.plan.key)).not.toContain("claude_team");
  });

  it("reports consolidation savings when consumer spend exceeds the plan", () => {
    const r = recommendPlans({ ...base, employeeCount: 5, currentMonthlySpendCents: 30000 });
    const chat = r.ranked.find((p) => p.plan.key === "chatgpt_business")!;
    expect(chat.estimatedMonthlyCents).toBe(10000);
    expect(chat.consolidationSavingsCents).toBe(20000);
    expect(r.summary).toMatch(/saves roughly \$200/);
  });

  it("flags unverified compliance terms as a caution for regulated data", () => {
    const r = recommendPlans({ ...base, dataTypes: ["financial_accounts"] });
    const claude = r.ranked.find((p) => p.plan.key === "claude_team")!;
    expect(claude.cautions.join(" ")).toMatch(/confirm data-protection/i);
  });

  it("every plan has a dated price and at least one source", () => {
    for (const p of PLAN_CATALOG) {
      expect(p.priceCheckedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(p.sources.length).toBeGreaterThan(0);
    }
  });
});
