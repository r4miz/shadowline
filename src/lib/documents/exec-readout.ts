import {
  RAG_LABEL,
  disclaimerBlock,
  headlineFacts,
  isoDate,
  overallPosture,
  postureCounts,
  topFindings,
} from "@/lib/documents/shared";
import type { DocumentData } from "@/lib/documents/types";

/** One-page Executive Readout for the owner, as Markdown. */
export function generateExecReadout(data: DocumentData): string {
  const c = postureCounts(data.findings);
  const top = topFindings(data.findings, 5);
  const nextSteps = topFindings(data.findings, 3);
  const facts = headlineFacts(data).slice(0, 4);

  const parts = [
    "# Executive Readout",
    "",
    `**${data.organization.name}**, ${isoDate(data.generatedAt)}, prepared by ${data.preparerName}, ${data.brandName}`,
    "",
    disclaimerBlock(),
    "",
    "---",
    "",
    "## Where you stand",
    "",
    `**${overallPosture(data.findings)}.** Discovery covered ${data.responseCount} survey answers from ${data.respondentCount} employees and ${data.tools.length} AI tool(s) in the inventory. Findings: ${c.red} high, ${c.amber} moderate, ${c.green} low.`,
    "",
  ];

  if (facts.length) {
    parts.push("## The numbers that matter", "");
    facts.forEach((f) => parts.push(`- ${f}`));
    parts.push("");
  }

  parts.push("## Top Risks", "");
  if (top.length === 0) {
    parts.push("_No scored findings yet._", "");
  } else {
    top.forEach((f) => parts.push(`- **${f.title}**: ${RAG_LABEL[f.ragRating]}`));
    parts.push("");
  }

  parts.push("## Recommended Next Steps", "");
  if (nextSteps.length === 0) {
    parts.push("_Generate findings to populate recommended next steps._", "");
  } else {
    nextSteps.forEach((f, i) => parts.push(`${i + 1}. ${f.recommendation}`));
    parts.push("");
  }

  if (data.recommendation?.primary) {
    parts.push("## Which AI platform fits", "", data.recommendation.summary, "");
  }

  parts.push(
    "## What happens next",
    "",
    "1. Adopt the Acceptable Use Policy and have every employee read and sign it (we track who has).",
    "2. Move staff from personal AI accounts onto the approved team plan.",
    "3. Review and remove AI apps that have email or file access and no business need.",
    "4. Re-check quarterly: new hires sign the policy, new AI apps trigger an alert, staff are re-surveyed.",
    ""
  );

  return parts.join("\n");
}
