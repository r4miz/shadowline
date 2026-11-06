import { DISCLAIMER } from "@/lib/constants";
import type { DocFinding, DocumentData } from "@/lib/documents/types";

// Exact framework citations. The Definition of Done requires these verbatim.
export const NIST_CITATION = "NIST AI RMF 1.0";
export const OWASP_CITATION = "OWASP Top 10 for LLM Applications 2025";

export const RAG_LABEL: Record<DocFinding["ragRating"], string> = {
  red: "Red (High)",
  amber: "Amber (Moderate)",
  green: "Green (Low)",
};

export const EFFORT_LABEL: Record<DocFinding["effort"], string> = {
  low: "Low",
  med: "Medium",
  high: "High",
};

export const SUITE_LABEL: Record<string, string> = {
  google: "Google Workspace",
  microsoft: "Microsoft 365",
  both: "Google Workspace and Microsoft 365",
  none: "no central office suite",
  unknown: "an office suite not yet confirmed",
};

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function pct(share: number): string {
  return `${Math.round(share * 100)}%`;
}

export function money(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

export function disclaimerBlock(): string {
  return `> _${DISCLAIMER}_`;
}

export function preparedBy(data: DocumentData): string {
  return `**Prepared by:** ${data.preparerName}, ${data.brandName}`;
}

export function postureCounts(findings: DocFinding[]) {
  return findings.reduce(
    (acc, f) => {
      acc[f.ragRating] += 1;
      return acc;
    },
    { red: 0, amber: 0, green: 0 }
  );
}

export function overallPosture(findings: DocFinding[]): string {
  const c = postureCounts(findings);
  if (c.red > 0) return "High exposure";
  if (c.amber > 0) return "Moderate exposure";
  if (findings.length > 0) return "Low exposure";
  return "No scored findings yet";
}

/** Top N findings by priorityRank (nulls last), preserving order otherwise. */
export function topFindings(findings: DocFinding[], n: number): DocFinding[] {
  return [...findings]
    .sort((a, b) => (a.priorityRank ?? 1e9) - (b.priorityRank ?? 1e9))
    .slice(0, n);
}

export function toolInventoryTable(data: DocumentData): string {
  if (data.tools.length === 0) {
    return "_No AI tools were recorded in the inventory._";
  }
  const rows = [...data.tools]
    .sort((a, b) => Number(a.sanctioned) - Number(b.sanctioned) || (b.reportedBy ?? 0) - (a.reportedBy ?? 0))
    .map(
      (t) =>
        `| ${t.name} | ${t.vendor ?? "n/a"} | ${t.dataExposureLevel ?? "n/a"} | ${
          t.reportedBy ? plural(t.reportedBy, "person", "people") : "n/a"
        } | ${t.sanctioned ? "Approved" : "Shadow"} |`
    );
  return [
    "| Tool | Vendor | Data it has touched | Staff reporting it | Status |",
    "| --- | --- | --- | --- | --- |",
    ...rows,
  ].join("\n");
}

/**
 * Plain-English headline facts shared by the report and the executive readout.
 * Each bullet is a complete sentence an owner can repeat in a meeting.
 */
export function headlineFacts(data: DocumentData): string[] {
  const facts: string[] = [];
  const s = data.survey;
  if (s && s.respondentCount > 0) {
    facts.push(
      `${s.aiUsers} of ${plural(s.respondentCount, "surveyed employee")} (${pct(s.aiUsers / s.respondentCount)}) use AI tools for work.`
    );
    if (s.personalAccountShare > 0) {
      facts.push(
        `${pct(s.personalAccountShare)} sign in with personal accounts the company cannot see, manage or shut off when they leave.`
      );
    }
    if (s.sensitiveDataShare > 0) {
      facts.push(
        `${pct(s.sensitiveDataShare)} have entered sensitive information (customer, financial, HR, contract or internal data) into an AI tool${
          s.regulatedDataShare > 0 ? `, and ${pct(s.regulatedDataShare)} entered regulated data` : ""
        }.`
      );
    }
    if (s.connectedShare > 0) {
      facts.push(`${pct(s.connectedShare)} have connected an AI tool to their work email, calendar or files.`);
    }
    if (s.noGuidanceShare > 0) {
      facts.push(`${pct(s.noGuidanceShare)} said nobody has told them which AI tools are allowed or what may go into them.`);
    }
  }
  if (data.scan) {
    const sc = data.scan;
    facts.push(
      `The workspace scan found ${plural(sc.aiAppCount, "AI app")} connected to company accounts out of ${plural(sc.appCount, "third-party app")}${
        sc.highRiskAi > 0 ? `; ${sc.highRiskAi} can read email, files or meetings` : ""
      }.`
    );
  }
  if (data.expenses && data.expenses.monthlyCents > 0) {
    facts.push(
      `Expense records show about ${money(data.expenses.monthlyCents)} per month on individual AI subscriptions across ${plural(data.expenses.vendors, "vendor")}.`
    );
  }
  if (data.profile) {
    if (data.profile.hasWrittenPolicy === false) facts.push("There is no written AI policy today.");
    else if (data.profile.hasWrittenPolicy === true && s && s.noGuidanceShare >= 0.3) {
      facts.push("A written policy exists, but most staff have not seen it.");
    }
  }
  return facts;
}
