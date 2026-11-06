import { EU_AI_ACT_DATES } from "@/lib/constants";
import {
  EU_AI_ACT,
  NIST_AI_RMF,
  OWASP_LLM_TOP_10_2025,
  OWASP_SOURCE_CITATION,
} from "@/lib/frameworks";
import { catalogByKey } from "@/lib/ai-catalog";
import {
  EFFORT_LABEL,
  NIST_CITATION,
  OWASP_CITATION,
  RAG_LABEL,
  SUITE_LABEL,
  disclaimerBlock,
  headlineFacts,
  isoDate,
  money,
  overallPosture,
  pct,
  plural,
  postureCounts,
  preparedBy,
  toolInventoryTable,
  topFindings,
} from "@/lib/documents/shared";
import type { DocFinding, DocumentData } from "@/lib/documents/types";

function shortVersion(data: DocumentData): string {
  const facts = headlineFacts(data);
  const c = postureCounts(data.findings);
  const lines = ["## The short version", ""];
  if (facts.length === 0) {
    lines.push("_Run the employee survey, a workspace scan or an expense scan to populate this section._", "");
  } else {
    facts.forEach((f) => lines.push(`- ${f}`));
    lines.push("");
  }
  lines.push(
    `Overall posture: **${overallPosture(data.findings)}**, with ${c.red} high, ${c.amber} moderate and ${c.green} low findings.`,
    ""
  );
  return lines.join("\n");
}

function firstMoves(data: DocumentData): string {
  const top = topFindings(data.findings, 3);
  const lines = ["## What to do first", ""];
  if (top.length === 0) {
    lines.push("_Generate findings to populate this section._", "");
    return lines.join("\n");
  }
  top.forEach((f, i) => lines.push(`${i + 1}. **${f.title}.** ${f.recommendation}`));
  lines.push("");
  if (data.recommendation?.primary) {
    const p = data.recommendation.primary;
    lines.push(
      `${top.length + 1}. **Give staff an approved tool.** ${data.recommendation.summary.split(". ")[0]}. See the AI Platform Recommendation for the full comparison.`,
      ""
    );
    void p;
  }
  return lines.join("\n");
}

function evidenceSurvey(data: DocumentData): string {
  const s = data.survey;
  const lines = ["### Employee survey", ""];
  if (!s || s.respondentCount === 0) {
    lines.push("_No survey responses yet._", "");
    return lines.join("\n");
  }
  lines.push(
    `${plural(s.respondentCount, "employee")} answered anonymously. ${s.dailyUsers} use AI every day. ${pct(s.adoptionAppetite)} said they would use a company-approved tool if one were provided with training.`,
    ""
  );
  const usage = Object.entries(s.toolUsage).sort((a, b) => b[1] - a[1]);
  if (usage.length) {
    lines.push("| Tool | Staff using it | Share of respondents |", "| --- | --- | --- |");
    usage.forEach(([key, n]) => {
      const entry = catalogByKey(key);
      lines.push(`| ${entry?.name ?? key} | ${n} | ${pct(n / s.respondentCount)} |`);
    });
    lines.push("");
  }
  const roles = Object.entries(s.roles).sort((a, b) => b[1] - a[1]);
  if (roles.length) {
    lines.push(`Respondents by area: ${roles.map(([r, n]) => `${r} (${n})`).join(", ")}.`, "");
  }
  if (s.comments.length) {
    lines.push("What staff told us, in their own words:", "");
    s.comments.slice(0, 8).forEach((c) => lines.push(`- "${c.replace(/\s+/g, " ").trim()}"`));
    lines.push("");
  }
  return lines.join("\n");
}

function evidenceScan(data: DocumentData): string {
  const sc = data.scan;
  const lines = ["### Workspace scan", ""];
  if (!sc) {
    lines.push("_No workspace scan was run. Connect Google Workspace or Microsoft 365 to see which apps staff have attached to company accounts._", "");
    return lines.join("\n");
  }
  lines.push(
    `Read-only scan of ${sc.provider === "demo" ? "the workspace (demo data)" : sc.provider === "google" ? "Google Workspace" : "Microsoft 365"} on ${isoDate(sc.finishedAt)}: ${plural(sc.userCount, "user account")}, ${plural(sc.appCount, "connected third-party app")}, ${plural(sc.aiAppCount, "of them AI", "of them AI")}.`,
    ""
  );
  if (sc.builtInAi) {
    lines.push(`Built-in AI: ${sc.builtInAi.activeUsers} active users of ${sc.builtInAi.product} in the last 30 days.`, "");
  }
  if (sc.aiApps.length) {
    lines.push("| AI app | Accounts connected | Access risk | Why it matters |", "| --- | --- | --- | --- |");
    sc.aiApps.forEach((a) =>
      lines.push(`| ${a.name} | ${a.userCount} | ${a.riskLevel} | ${a.riskNotes.length ? a.riskNotes.join("; ") : "Sign-in only"} |`)
    );
    lines.push("");
  }
  return lines.join("\n");
}

function evidenceExpenses(data: DocumentData): string {
  const e = data.expenses;
  const lines = ["### Expense scan", ""];
  if (!e || e.matches.length === 0) {
    lines.push("_No AI charges were found, or no expense export was uploaded._", "");
    return lines.join("\n");
  }
  lines.push(
    `About ${money(e.monthlyCents)} per month (${money(e.totalCents)} in the period reviewed) is going to ${plural(e.vendors, "AI vendor")} through individual subscriptions.`,
    "",
    "| Tool | Vendor | Charges | Monthly | Cardholder |",
    "| --- | --- | --- | --- | --- |"
  );
  e.matches.forEach((m) =>
    lines.push(`| ${m.toolName} | ${m.vendorName} | ${m.chargeCount} | ${money(m.monthlyCents)} | ${m.cardholder ?? "n/a"} |`)
  );
  lines.push("");
  return lines.join("\n");
}

function companyContext(data: DocumentData): string {
  const p = data.profile;
  const lines = ["## About the company", ""];
  lines.push(
    `${data.organization.name} is a ${data.organization.industry ?? "company"} with ${data.organization.employeeCount ?? "an unspecified number of"} employees, running on ${SUITE_LABEL[p?.suite ?? "unknown"]}.`
  );
  if (p?.dataTypes.length) {
    lines.push(`Sensitive data in scope: ${p.dataTypes.map(labelDataType).join(", ")}.`);
  }
  if (p?.providedTools.length) {
    lines.push(`AI tools the company already provides: ${p.providedTools.map((k) => catalogByKey(k)?.name ?? k).join(", ")}.`);
  } else {
    lines.push("The company does not currently provide any AI tool to staff.");
  }
  lines.push("");
  return lines.join("\n");
}

export const DATA_TYPE_LABELS: Record<string, string> = {
  health: "health or patient information",
  financial_accounts: "financial accounts and statements",
  payment_cards: "payment card details",
  legal: "contracts and legal matters",
  hr: "employee and HR records",
  customer_pii: "customer names and contact details",
  children: "information about minors",
  government_ids: "government identifiers",
  source_code: "source code or product designs",
  trade_secrets: "trade secrets or pricing",
};

export function labelDataType(key: string): string {
  return DATA_TYPE_LABELS[key] ?? key;
}

function methodology(): string {
  return [
    "## How we assessed this",
    "",
    "We combined three sources: an anonymous survey of staff about how they actually use AI, a read-only scan of third-party apps connected to company accounts, and a scan of expense records for AI subscriptions. Every risk was scored the same way: likelihood (1 to 5) times impact (1 to 5), banded Red, Amber or Green. Scoring is deterministic; no AI model decided any rating.",
    "",
    `Findings are mapped to ${NIST_CITATION} and the ${OWASP_CITATION} so they can be read alongside recognized frameworks. Source: ${OWASP_SOURCE_CITATION}`,
    "",
  ].join("\n");
}

function findingsSection(findings: DocFinding[]): string {
  if (findings.length === 0) {
    return ["## Findings in detail", "", "_No findings were generated._", ""].join("\n");
  }
  const out = ["## Findings in detail", ""];
  topFindings(findings, findings.length).forEach((f) => {
    out.push(
      `### ${f.priorityRank ? `${f.priorityRank}. ` : ""}${f.title}`,
      "",
      f.description,
      "",
      `- **Rating:** ${RAG_LABEL[f.ragRating]} (likelihood ${f.likelihood} x impact ${f.impact} = ${f.likelihood * f.impact})`,
      `- **NIST function:** ${f.nistFunction}`,
      `- **OWASP mapping:** ${f.owaspRefs.length ? f.owaspRefs.join(", ") : "n/a"}`,
      `- **Recommendation:** ${f.recommendation}`,
      `- **Effort:** ${EFFORT_LABEL[f.effort]}`,
      ...(f.sourceQuestion ? [`- **Source:** survey question, "${f.sourceQuestion}"`] : []),
      ...(f.sourceTool ? [`- **Source:** AI tool inventory, ${f.sourceTool}`] : []),
      ""
    );
  });
  return out.join("\n");
}

function roadmap(findings: DocFinding[]): string {
  const ranked = topFindings(findings, findings.length);
  const now = ranked.filter((f) => f.ragRating === "red");
  const next = ranked.filter((f) => f.ragRating === "amber");
  const later = ranked.filter((f) => f.ragRating === "green");

  const bucket = (label: string, items: DocFinding[]) => {
    const lines = [`### ${label}`, ""];
    if (items.length === 0) {
      lines.push("_Nothing in this horizon._", "");
    } else {
      items.forEach((f) => lines.push(`- ${f.title}: ${f.recommendation} (${EFFORT_LABEL[f.effort]} effort)`));
      lines.push("");
    }
    return lines.join("\n");
  };

  return ["## Prioritized Remediation Roadmap", "", bucket("Now", now), bucket("Next", next), bucket("Later", later)].join("\n");
}

function frameworkAppendix(): string {
  const owasp = OWASP_LLM_TOP_10_2025.map((o) => `- **${o.code} ${o.name}:** ${o.description}`).join("\n");
  const nist = NIST_AI_RMF.functions.map((f) => `- **${f.id}:** ${f.description}`).join("\n");
  return [
    "## Appendix A: Framework Reference",
    "",
    `### ${NIST_CITATION}`,
    `Published ${NIST_AI_RMF.published}; ${NIST_AI_RMF.nature}.`,
    "",
    nist,
    "",
    `### ${OWASP_CITATION}`,
    "",
    owasp,
    "",
  ].join("\n");
}

function euAppendix(): string {
  const d = EU_AI_ACT_DATES;
  return [
    "## Appendix B: EU AI Act Exposure",
    "",
    `This company indicated exposure to the EU market. The EU AI Act (${EU_AI_ACT.regulation}) applies a risk-tiered model (${EU_AI_ACT.riskTiers.join("; ")}), with penalties ${EU_AI_ACT.penalties}.`,
    "",
    "Key dates (from configuration; confirm with counsel):",
    "",
    `- Prohibited practices and AI literacy: ${d.prohibitedPracticesAndAILiteracy}`,
    `- GPAI model obligations: ${d.gpaiModelObligations}`,
    `- Transparency obligations (Art. 50): ${d.transparencyObligationsArt50}`,
    `- High-risk (Annex III): ${d.highRiskAnnexIII}`,
    `- High-risk (Annex I): ${d.highRiskAnnexI}`,
    "",
    `_${d.counselNote}_`,
    "",
  ].join("\n");
}

/** AI Risk Report as editable Markdown. Plain English first, framework detail after. */
export function generateRiskReport(data: DocumentData): string {
  const parts = [
    "# AI Risk Report",
    "",
    `**Client:** ${data.organization.name}`,
    `**Date:** ${isoDate(data.generatedAt)}`,
    preparedBy(data),
    "",
    disclaimerBlock(),
    "",
    "---",
    "",
    shortVersion(data),
    firstMoves(data),
    companyContext(data),
    "## What we found",
    "",
    evidenceSurvey(data),
    evidenceScan(data),
    evidenceExpenses(data),
    "## AI Tool Inventory",
    "",
    toolInventoryTable(data),
    "",
    methodology(),
    findingsSection(data.findings),
    roadmap(data.findings),
    frameworkAppendix(),
  ];
  if (data.organization.hasEUexposure) {
    parts.push(euAppendix());
  }
  return parts.join("\n");
}
