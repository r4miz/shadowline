import { describe, expect, it } from "vitest";

import { DISCLAIMER } from "@/lib/constants";
import { AUP_REQUIRED_SECTIONS } from "@/lib/frameworks";
import { generateAUP } from "@/lib/documents/aup";
import { generateAiPlan } from "@/lib/documents/ai-plan";
import { generateExecReadout } from "@/lib/documents/exec-readout";
import { generateRiskReport } from "@/lib/documents/report";
import { markdownToHtml } from "@/lib/documents/markdown";
import type { DocFinding, DocumentData } from "@/lib/documents/types";
import { recommendPlans } from "@/lib/recommend/engine";

const NIST_CITATION = "NIST AI RMF 1.0";
const OWASP_CITATION = "OWASP Top 10 for LLM Applications 2025";

function finding(overrides: Partial<DocFinding> = {}): DocFinding {
  return {
    title: "Data Handling & Classification: High risk",
    description: "Employees paste regulated data into public AI tools.",
    likelihood: 5,
    impact: 5,
    ragRating: "red",
    owaspRefs: ["LLM02"],
    nistFunction: "MEASURE",
    recommendation: "Prohibit pasting regulated data into public AI tools.",
    effort: "high",
    priorityRank: 1,
    ...overrides,
  };
}

function data(overrides: Partial<DocumentData> = {}): DocumentData {
  return {
    brandName: "Shadowline",
    preparerName: "Dana Operator",
    organization: {
      name: "Northwind Dental Group",
      industry: "Healthcare",
      employeeCount: 45,
      hasEUexposure: false,
    },
    generatedAt: new Date("2026-10-16T00:00:00Z"),
    findings: [
      finding(),
      finding({
        title: "Governance & Policy: Moderate risk",
        ragRating: "amber",
        nistFunction: "GOVERN",
        effort: "low",
        owaspRefs: [],
        priorityRank: 2,
      }),
    ],
    tools: [
      {
        name: "ChatGPT",
        vendor: "OpenAI",
        category: "chat_assistant",
        dataExposureLevel: "confidential",
        sanctioned: false,
        accessMethod: "personal_account",
        notes: null,
        reportedBy: 12,
      },
      {
        name: "Microsoft Copilot",
        vendor: "Microsoft",
        category: "chat_assistant",
        dataExposureLevel: "internal",
        sanctioned: true,
        accessMethod: "org_account",
        notes: null,
      },
    ],
    responseCount: 30,
    respondentCount: 6,
    profile: { suite: "microsoft", dataTypes: ["health"], hasWrittenPolicy: false, providedTools: ["copilot_m365"], priorities: ["compliance"] },
    survey: {
      respondentCount: 20,
      aiUsers: 14,
      toolUsage: { chatgpt: 12, meeting_notetaker: 3 },
      personalAccountShare: 0.6,
      sensitiveDataShare: 0.35,
      regulatedDataShare: 0.15,
      connectedShare: 0.2,
      extensionShare: 0.15,
      noGuidanceShare: 0.7,
      payingPersonallyShare: 0.2,
      adoptionAppetite: 0.8,
      dailyUsers: 6,
      comments: ["Please just tell us what we can use."],
      roles: { "Operations or delivery": 9, "Sales, marketing or customer service": 11 },
    },
    scan: {
      provider: "google",
      finishedAt: new Date("2026-10-15T00:00:00Z"),
      userCount: 44,
      appCount: 13,
      aiAppCount: 5,
      highRiskAi: 2,
      aiApps: [
        { name: "Otter.ai", userCount: 3, riskLevel: "high", riskNotes: ["Can access meetings or chat messages"], category: "meeting_notes" },
        { name: "ChatGPT", userCount: 20, riskLevel: "low", riskNotes: [], category: "chat_assistant" },
      ],
      builtInAi: null,
    },
    expenses: {
      monthlyCents: 18000,
      totalCents: 54000,
      vendors: 2,
      matches: [{ toolName: "ChatGPT", vendorName: "OpenAI", chargeCount: 9, monthlyCents: 18000, cardholder: "Ava Example" }],
    },
    recommendation: recommendPlans({
      employeeCount: 45,
      suite: "microsoft",
      dataTypes: ["health"],
      toolUsage: { chatgpt: 12 },
      respondentCount: 20,
      personalAccountShare: 0.6,
      adoptionAppetite: 0.8,
      currentMonthlySpendCents: 18000,
      priorities: ["compliance"],
    }),
    ...overrides,
  };
}

const ALL = [generateRiskReport, generateAUP, generateExecReadout, generateAiPlan];

describe("all documents", () => {
  it("contain no em dashes", () => {
    for (const gen of ALL) expect(gen(data()).includes("\u2014")).toBe(false);
  });
  it("include the legal disclaimer verbatim", () => {
    for (const gen of ALL) expect(gen(data())).toContain(DISCLAIMER);
  });
});

describe("generateRiskReport", () => {
  it("cites both frameworks with exact version strings", () => {
    const md = generateRiskReport(data());
    expect(md).toContain(NIST_CITATION);
    expect(md).toContain(OWASP_CITATION);
  });

  it("names the client and the preparer", () => {
    const md = generateRiskReport(data());
    expect(md).toContain("Northwind Dental Group");
    expect(md).toContain("Dana Operator");
  });

  it("opens with plain-English headline facts", () => {
    const md = generateRiskReport(data());
    const idx = md.indexOf("## The short version");
    expect(idx).toBeGreaterThan(0);
    expect(idx).toBeLessThan(md.indexOf("## Findings in detail"));
    expect(md).toContain("14 of 20 surveyed employees (70%) use AI tools for work.");
    expect(md).toContain("60% sign in with personal accounts");
    expect(md).toContain("The workspace scan found 5 AI apps connected to company accounts out of 13 third-party apps; 2 can read email, files or meetings.");
    expect(md).toContain("about $180 per month on individual AI subscriptions");
    expect(md).toContain("There is no written AI policy today.");
  });

  it("lists findings with their RAG rating and recommendation", () => {
    const md = generateRiskReport(data());
    expect(md).toContain("Data Handling & Classification: High risk");
    expect(md).toContain("Prohibit pasting regulated data into public AI tools.");
  });

  it("cites the source survey question when a finding has one", () => {
    const md = generateRiskReport(
      data({ findings: [finding({ sourceQuestion: "Do employees use personal AI accounts for work tasks?" })] })
    );
    expect(md).toContain('survey question, "Do employees use personal AI accounts for work tasks?"');
  });

  it("shows the evidence tables for survey, scan and expenses", () => {
    const md = generateRiskReport(data());
    expect(md).toContain("| ChatGPT | 12 | 60% |");
    expect(md).toContain("| Otter.ai | 3 | high | Can access meetings or chat messages |");
    expect(md).toContain("| ChatGPT | OpenAI | 9 | $180 | Ava Example |");
    expect(md).toContain('"Please just tell us what we can use."');
  });

  it("shows the AI tool inventory split into approved and shadow", () => {
    const md = generateRiskReport(data());
    expect(md).toContain("| ChatGPT | OpenAI | confidential | 12 people | Shadow |");
    expect(md).toContain("| Microsoft Copilot | Microsoft | internal | n/a | Approved |");
  });

  it("renders a Now / Next / Later remediation roadmap", () => {
    const md = generateRiskReport(data());
    expect(md).toContain("### Now");
    expect(md).toContain("### Next");
    expect(md).toContain("### Later");
  });

  it("omits the EU AI Act appendix when there is no EU exposure", () => {
    expect(generateRiskReport(data())).not.toContain("EU AI Act Exposure");
  });

  it("includes the EU AI Act appendix when hasEUexposure is true", () => {
    const md = generateRiskReport(data({ organization: { ...data().organization, hasEUexposure: true } }));
    expect(md).toContain("EU AI Act Exposure");
    expect(md).toContain("2024/1689");
  });

  it("degrades gracefully with no evidence at all", () => {
    const md = generateRiskReport(data({ survey: null, scan: null, expenses: null, recommendation: null, profile: null, findings: [], tools: [] }));
    expect(md).toContain("No scored findings yet");
    expect(md).toContain("No workspace scan was run");
    expect(md).toContain(DISCLAIMER);
  });
});

describe("generateAUP", () => {
  it("generates all 13 required sections", () => {
    const md = generateAUP(data());
    expect(AUP_REQUIRED_SECTIONS).toHaveLength(13);
    AUP_REQUIRED_SECTIONS.forEach((section, i) => {
      const heading = section.split(" \u2014 ")[0];
      expect(md).toContain(`## ${i + 1}. ${heading}`);
    });
  });

  it("names the organization and preparer", () => {
    const md = generateAUP(data());
    expect(md).toContain("Northwind Dental Group");
    expect(md).toContain("**Prepared by:** Dana Operator, Shadowline");
  });

  it("lists approved tools in the approved-use section", () => {
    expect(generateAUP(data())).toContain("- Microsoft Copilot (Microsoft)");
  });

  it("states the mandatory blocked-use rule about public AI tools", () => {
    const md = generateAUP(data());
    expect(md).toMatch(/public AI tools \*\*must NOT\*\* be used with any data classified \*\*internal\*\* or \*\*confidential\*\*/);
  });

  it("pre-fills from the assessment: references the findings in a preamble", () => {
    expect(generateAUP(data())).toContain("identified 2 risk findings (1 high-risk)");
  });

  it("pre-fills from the inventory: lists discovered shadow tools in blocked-use", () => {
    const md = generateAUP(data());
    expect(md).toContain("identified in use but not yet approved");
    expect(md).toContain("- ChatGPT (OpenAI)");
  });

  it("omits the shadow-tool callout when the inventory has none", () => {
    const md = generateAUP(data({ tools: data().tools.filter((t) => t.sanctioned) }));
    expect(md).not.toContain("identified in use but not yet approved");
  });
});

describe("generateExecReadout", () => {
  it("summarizes the top risks, numbers and next steps for the owner", () => {
    const md = generateExecReadout(data());
    expect(md).toContain("## Top Risks");
    expect(md).toContain("## The numbers that matter");
    expect(md).toContain("## Recommended Next Steps");
    expect(md).toContain("## Which AI platform fits");
    expect(md).toContain("Northwind Dental Group");
  });
});

describe("generateAiPlan", () => {
  it("recommends Copilot for a Microsoft healthcare company and dates its prices", () => {
    const md = generateAiPlan(data());
    expect(md).toContain("Recommend Microsoft 365 Copilot");
    expect(md).toContain("| Plan | Fit score |");
    expect(md).toMatch(/Checked \d{4}-\d{2}-\d{2}\. Source: https:\/\//);
    expect(md).toContain("no referral or affiliate relationship");
    expect(md).toContain("## Rollout plan");
    expect(md).toContain("regulated data touches the tool");
  });
  it("asks for the profile when there is nothing to recommend from", () => {
    expect(generateAiPlan(data({ recommendation: null }))).toContain("Complete the company profile");
  });
});

describe("markdownToHtml", () => {
  it("renders headings, bold, lists and escapes HTML in text", () => {
    const html = markdownToHtml("# Title\n\n**Bold** text\n\n- one\n- two");
    expect(html).toContain("<h1>Title</h1>");
    expect(html).toContain("<strong>Bold</strong>");
    expect(html).toContain("<li>one</li>");
  });

  it("escapes embedded HTML to prevent injection", () => {
    const html = markdownToHtml("Hello <script>alert(1)</script>");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("renders a table", () => {
    const html = markdownToHtml("| A | B |\n| --- | --- |\n| 1 | 2 |");
    expect(html).toContain("<table>");
    expect(html).toContain("<td>1</td>");
  });

  it("renders blockquotes, italics and keeps label lines on separate lines", () => {
    const html = markdownToHtml("**Organization:** Acme\n**Date:** 2026-10-16\n\n> _Not legal advice._\n\nsnake_case_name stays");
    expect(html).toContain("<strong>Organization:</strong> Acme<br><strong>Date:</strong> 2026-10-16");
    expect(html).toContain("<blockquote><p><em>Not legal advice.</em></p></blockquote>");
    expect(html).toContain("snake_case_name stays");
    expect(html).not.toContain("&gt; _");
  });

  it("never emits raw HTML from a quoted comment", () => {
    const html = markdownToHtml('> "<img src=x onerror=alert(1)>"');
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });
});
