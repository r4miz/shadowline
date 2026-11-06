import { describe, expect, it } from "vitest";

import {
  answerLikelihood,
  buildFindingDraft,
  buildToolFindingDraft,
  effortForNistFunction,
  generateFindingDrafts,
  ragFromScore,
  riskScore,
  scoreAnswer,
  scoreTool,
  worstResponsePerQuestion,
  type IdentifiedResponse,
  type ScorableQuestion,
} from "./scoring";

// Helper: build a scorable question with sensible defaults.
function q(overrides: Partial<ScorableQuestion> = {}): ScorableQuestion {
  return {
    text: "Are employees permitted to paste customer, financial, or health data into public AI tools?",
    domain: "Data Handling & Classification",
    answerType: "single",
    options: ["Yes/unrestricted", "Unclear/no policy", "Prohibited by written policy"],
    nistFunction: "MEASURE",
    owaspRefs: ["LLM02"],
    weight: 5,
    ...overrides,
  };
}

describe("riskScore", () => {
  it("multiplies likelihood by impact", () => {
    expect(riskScore(3, 4)).toBe(12);
  });

  it("returns the minimum score of 1", () => {
    expect(riskScore(1, 1)).toBe(1);
  });

  it("returns the maximum score of 25", () => {
    expect(riskScore(5, 5)).toBe(25);
  });

  it("clamps out-of-range inputs into 1-5 before multiplying", () => {
    expect(riskScore(0, 9)).toBe(5); // 1 * 5
    expect(riskScore(-2, 3)).toBe(3); // 1 * 3
  });
});

describe("ragFromScore", () => {
  it("rates 1 as green", () => {
    expect(ragFromScore(1)).toBe("green");
  });

  it("rates the green boundary (6) as green", () => {
    expect(ragFromScore(6)).toBe("green");
  });

  it("rates just past green (7) as amber", () => {
    expect(ragFromScore(7)).toBe("amber");
  });

  it("rates the amber boundary (14) as amber", () => {
    expect(ragFromScore(14)).toBe("amber");
  });

  it("rates just past amber (15) as red", () => {
    expect(ragFromScore(15)).toBe("red");
  });

  it("rates the maximum (25) as red", () => {
    expect(ragFromScore(25)).toBe("red");
  });
});

describe("answerLikelihood", () => {
  it("maps the worst single-choice option (index 0) to 5", () => {
    expect(answerLikelihood(q(), "Yes/unrestricted")).toBe(5);
  });

  it("maps the middle single-choice option to 3", () => {
    expect(answerLikelihood(q(), "Unclear/no policy")).toBe(3);
  });

  it("maps the safest single-choice option (last) to 1", () => {
    expect(answerLikelihood(q(), "Prohibited by written policy")).toBe(1);
  });

  it("maps a 4-option scale across the full 1-5 range", () => {
    const four = q({ options: ["A-worst", "B", "C", "D-best"] });
    expect(answerLikelihood(four, "A-worst")).toBe(5);
    expect(answerLikelihood(four, "D-best")).toBe(1);
  });

  it("returns null when the single answer is not a known option", () => {
    expect(answerLikelihood(q(), "not-an-option")).toBeNull();
  });

  it("scores a boolean false (worse answer) as 5", () => {
    const b = q({ answerType: "boolean", options: null });
    expect(answerLikelihood(b, false)).toBe(5);
  });

  it("scores a boolean true (safer answer) as 1", () => {
    const b = q({ answerType: "boolean", options: null });
    expect(answerLikelihood(b, true)).toBe(1);
  });

  it("scales multi-select likelihood with the fraction of RISKY options", () => {
    // Last option ("none") is the safe sentinel and is excluded from exposure.
    const m = q({
      answerType: "multi",
      options: ["a", "b", "c", "none"],
    });
    expect(answerLikelihood(m, ["a", "b", "c"])).toBe(5); // all 3 risky
    expect(answerLikelihood(m, ["a", "b"])).toBe(4); // 2 of 3 risky
  });

  it("scores selecting only the safe 'none' option as the lowest likelihood", () => {
    const m = q({ answerType: "multi", options: ["a", "b", "none"] });
    expect(answerLikelihood(m, ["none"])).toBe(1);
  });

  it("returns null for an empty multi-select (unanswered)", () => {
    const m = q({ answerType: "multi", options: ["a", "b"] });
    expect(answerLikelihood(m, [])).toBeNull();
  });
});

describe("scoreAnswer", () => {
  it("combines likelihood, impact, risk and rag for a worst-case answer", () => {
    expect(scoreAnswer(q(), "Yes/unrestricted")).toEqual({
      likelihood: 5,
      impact: 5,
      risk: 25,
      rag: "red",
    });
  });

  it("uses the question weight as impact", () => {
    const lowWeight = q({ weight: 2 });
    expect(scoreAnswer(lowWeight, "Yes/unrestricted")).toEqual({
      likelihood: 5,
      impact: 2,
      risk: 10,
      rag: "amber",
    });
  });

  it("rates the safest answer green", () => {
    expect(scoreAnswer(q(), "Prohibited by written policy")).toEqual({
      likelihood: 1,
      impact: 5,
      risk: 5,
      rag: "green",
    });
  });

  it("returns null for an unscoreable answer", () => {
    expect(scoreAnswer(q(), "garbage")).toBeNull();
  });
});

describe("effortForNistFunction", () => {
  it("treats GOVERN (policy) work as low effort", () => {
    expect(effortForNistFunction("GOVERN")).toBe("low");
  });

  it("treats MEASURE (technical monitoring) as high effort", () => {
    expect(effortForNistFunction("MEASURE")).toBe("high");
  });

  it("treats MAP and MANAGE as medium effort", () => {
    expect(effortForNistFunction("MAP")).toBe("med");
    expect(effortForNistFunction("MANAGE")).toBe("med");
  });
});

describe("buildFindingDraft", () => {
  it("returns null for a green (safe) answer", () => {
    expect(buildFindingDraft(q(), "Prohibited by written policy")).toBeNull();
  });

  it("builds a populated draft for a red answer", () => {
    const draft = buildFindingDraft(q(), "Yes/unrestricted");
    expect(draft).not.toBeNull();
    expect(draft).toMatchObject({
      likelihood: 5,
      impact: 5,
      ragRating: "red",
      owaspRefs: ["LLM02"],
      nistFunction: "MEASURE",
      effort: "high",
    });
  });

  it("derives the recommendation from the question's safest option", () => {
    const draft = buildFindingDraft(q(), "Yes/unrestricted");
    expect(draft?.recommendation).toContain("Prohibited by written policy");
  });

  it("includes the chosen answer in the description", () => {
    const draft = buildFindingDraft(q(), "Unclear/no policy");
    expect(draft?.description).toContain("Unclear/no policy");
  });

  it("titles the finding with its domain", () => {
    const draft = buildFindingDraft(q(), "Yes/unrestricted");
    expect(draft?.title).toContain("Data Handling & Classification");
  });

  it("generates a finding for an amber answer too", () => {
    const draft = buildFindingDraft(q({ weight: 2 }), "Yes/unrestricted"); // 5*2=10 amber
    expect(draft?.ragRating).toBe("amber");
  });

  it("carries the source question id when provided, null otherwise", () => {
    expect(buildFindingDraft(q(), "Yes/unrestricted")?.questionId).toBeNull();
    expect(
      buildFindingDraft(q(), "Yes/unrestricted", "q-123")?.questionId
    ).toBe("q-123");
  });

  it("builds a finding for a boolean false answer", () => {
    const b = q({
      text: "Does a written AI acceptable-use policy exist?",
      domain: "Governance & Policy",
      answerType: "boolean",
      options: null,
      nistFunction: "GOVERN",
      owaspRefs: [],
      weight: 5,
    });
    const draft = buildFindingDraft(b, false);
    expect(draft).toMatchObject({
      likelihood: 5,
      impact: 5,
      ragRating: "red",
      nistFunction: "GOVERN",
      effort: "low",
    });
  });
});

describe("generateFindingDrafts", () => {
  const dataQ = q(); // MEASURE, weight 5 -> red, effort high
  const policyQ = q({
    domain: "Governance & Policy",
    answerType: "boolean",
    options: null,
    nistFunction: "GOVERN",
    owaspRefs: [],
    weight: 5,
  }); // boolean false -> 5*5=25 red, effort low
  const midQ = q({ weight: 2 }); // 5*2=10 amber, effort high

  it("skips green answers and keeps amber/red", () => {
    const drafts = generateFindingDrafts([
      { question: dataQ, value: "Yes/unrestricted" }, // red
      { question: q(), value: "Prohibited by written policy" }, // green -> skip
    ]);
    expect(drafts).toHaveLength(1);
  });

  it("ranks by impact desc, then effort asc", () => {
    const drafts = generateFindingDrafts([
      { question: midQ, value: "Yes/unrestricted" }, // impact 2
      { question: dataQ, value: "Yes/unrestricted" }, // impact 5, effort high
      { question: policyQ, value: false }, // impact 5, effort low
    ]);
    // Both impact-5 findings rank above the impact-2 finding; among the
    // impact-5 pair, the lower-effort (GOVERN/low) one ranks first.
    expect(drafts.map((d) => d.priorityRank)).toEqual([1, 2, 3]);
    expect(drafts[0]).toMatchObject({ nistFunction: "GOVERN", priorityRank: 1 });
    expect(drafts[1]).toMatchObject({ nistFunction: "MEASURE", priorityRank: 2 });
    expect(drafts[2].impact).toBe(2);
    expect(drafts[2].priorityRank).toBe(3);
  });

  it("returns an empty list when every answer is safe", () => {
    const drafts = generateFindingDrafts([
      { question: q(), value: "Prohibited by written policy" },
    ]);
    expect(drafts).toEqual([]);
  });

  it("propagates questionId from identified responses into drafts", () => {
    const drafts = generateFindingDrafts([
      { questionId: "q-42", question: dataQ, value: "Yes/unrestricted" },
    ]);
    expect(drafts[0].questionId).toBe("q-42");
  });

  it("includes inventory-derived findings alongside response findings, ranked together", () => {
    const drafts = generateFindingDrafts(
      [{ questionId: "q1", question: dataQ, value: "Yes/unrestricted" }], // impact 5
      [
        {
          id: "t1",
          name: "Shadow Chat",
          sanctioned: false,
          accessMethod: "personal_account",
          dataExposureLevel: "regulated",
        }, // impact 5
        {
          id: "t2",
          name: "Sanctioned Org Tool",
          sanctioned: true,
          accessMethod: "org_account",
          dataExposureLevel: "internal",
        }, // green -> skipped
      ]
    );
    expect(drafts).toHaveLength(2); // 1 response + 1 shadow tool (sanctioned one is green)
    expect(drafts.some((d) => d.aiToolId === "t1")).toBe(true);
    expect(drafts.map((d) => d.priorityRank)).toEqual([1, 2]);
  });
});

describe("scoreTool", () => {
  it("scores a shadow tool on regulated data via personal account as high risk", () => {
    expect(
      scoreTool({
        name: "X",
        sanctioned: false,
        accessMethod: "personal_account",
        dataExposureLevel: "confidential",
      })
    ).toEqual({ likelihood: 5, impact: 4, risk: 20, rag: "red" });
  });

  it("scores a sanctioned org-account tool with internal data as green", () => {
    expect(
      scoreTool({
        name: "Y",
        sanctioned: true,
        accessMethod: "org_account",
        dataExposureLevel: "internal",
      })
    ).toEqual({ likelihood: 2, impact: 3, risk: 6, rag: "green" });
  });

  it("flags even a sanctioned autonomous agent on regulated data", () => {
    const s = scoreTool({
      name: "Z",
      sanctioned: true,
      accessMethod: "mcp_agent",
      dataExposureLevel: "regulated",
    });
    expect(s.rag).toBe("red"); // (2+1) x 5 = 15
  });
});

describe("buildToolFindingDraft", () => {
  it("returns null for a low-risk sanctioned tool", () => {
    expect(
      buildToolFindingDraft({
        name: "Y",
        sanctioned: true,
        accessMethod: "org_account",
        dataExposureLevel: "internal",
      })
    ).toBeNull();
  });

  it("builds a draft for a shadow tool, carrying the tool id and OWASP mapping", () => {
    const d = buildToolFindingDraft(
      {
        name: "ChatGPT",
        vendor: "OpenAI",
        sanctioned: false,
        accessMethod: "personal_account",
        dataExposureLevel: "confidential",
      },
      "tool-1"
    );
    expect(d).toMatchObject({
      ragRating: "red",
      aiToolId: "tool-1",
      questionId: null,
    });
    expect(d?.owaspRefs).toContain("LLM02");
    expect(d?.title).toContain("ChatGPT");
    expect(d?.description).toContain("OpenAI");
  });

  it("maps autonomous agents to Excessive Agency (LLM06)", () => {
    const d = buildToolFindingDraft({
      name: "Agent",
      sanctioned: false,
      accessMethod: "mcp_agent",
      dataExposureLevel: "regulated",
    });
    expect(d?.owaspRefs).toContain("LLM06");
    expect(d?.nistFunction).toBe("MEASURE");
  });
});

describe("worstResponsePerQuestion", () => {
  const question = q();

  function r(questionId: string, value: IdentifiedResponse["value"]): IdentifiedResponse {
    return { questionId, question, value };
  }

  it("collapses multiple responses to a single question, keeping the worst", () => {
    const result = worstResponsePerQuestion([
      r("q1", "Prohibited by written policy"), // likelihood 1
      r("q1", "Yes/unrestricted"), // likelihood 5, worst
      r("q1", "Unclear/no policy"), // likelihood 3
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].value).toBe("Yes/unrestricted");
  });

  it("keeps one entry per distinct question", () => {
    const result = worstResponsePerQuestion([
      r("q1", "Unclear/no policy"),
      r("q2", "Yes/unrestricted"),
    ]);
    expect(result).toHaveLength(2);
  });

  it("ignores responses that cannot be scored", () => {
    const result = worstResponsePerQuestion([
      r("q1", "garbage"), // unscoreable
      r("q1", "Unclear/no policy"), // likelihood 3, only scoreable one
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].value).toBe("Unclear/no policy");
  });

  it("retains the questionId on the surviving response", () => {
    const result = worstResponsePerQuestion([
      r("q1", "Prohibited by written policy"),
      r("q1", "Yes/unrestricted"),
    ]);
    expect(result[0].questionId).toBe("q1");
  });

  it("drops a question whose every response is unscoreable", () => {
    const result = worstResponsePerQuestion([r("q1", "garbage")]);
    expect(result).toEqual([]);
  });
});
