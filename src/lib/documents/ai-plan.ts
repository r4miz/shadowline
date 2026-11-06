import { catalogByKey } from "@/lib/ai-catalog";
import { SUITE_LABEL, disclaimerBlock, isoDate, money, pct, preparedBy } from "@/lib/documents/shared";
import type { DocumentData } from "@/lib/documents/types";
import { labelDataType } from "./report";

const AVAILABILITY: Record<string, string> = {
  yes: "Yes",
  higher_tier: "Higher tier only",
  verify: "Confirm with vendor",
  no: "No",
};

/** AI Platform Recommendation as Markdown. Vendor-neutral, every price dated. */
export function generateAiPlan(data: DocumentData): string {
  const rec = data.recommendation;
  const parts = [
    "# AI Platform Recommendation",
    "",
    `**Prepared for:** ${data.organization.name}`,
    `**Date:** ${isoDate(data.generatedAt)}`,
    preparedBy(data),
    "",
    disclaimerBlock(),
    "",
    "_This comparison is independent. We have no referral or affiliate relationship with any vendor named here._",
    "",
    "---",
    "",
  ];

  if (!rec || rec.ranked.length === 0) {
    parts.push(
      "## Recommendation",
      "",
      "_Complete the company profile (office suite, headcount, data types) and the employee survey to generate a recommendation._",
      ""
    );
    return parts.join("\n");
  }

  parts.push("## Recommendation", "", rec.summary, "");

  parts.push(
    "## What we based this on",
    "",
    `- Office suite: ${SUITE_LABEL[data.profile?.suite ?? "unknown"]}`,
    `- Headcount: ${data.organization.employeeCount ?? "unknown"} employees`,
    `- Sensitive data in scope: ${data.profile?.dataTypes.length ? data.profile.dataTypes.map(labelDataType).join(", ") : "none declared"}${rec.regulated ? " (regulated)" : ""}`
  );
  if (data.survey && data.survey.respondentCount > 0) {
    const usage = Object.entries(data.survey.toolUsage).sort((a, b) => b[1] - a[1]).slice(0, 4);
    parts.push(
      `- Staff familiarity: ${usage.length ? usage.map(([k, n]) => `${catalogByKey(k)?.name ?? k} (${pct(n / data.survey!.respondentCount)})`).join(", ") : "no AI use reported"}`,
      `- Personal accounts today: ${pct(data.survey.personalAccountShare)} of staff`,
      `- Would use an approved tool: ${pct(data.survey.adoptionAppetite)} of staff`
    );
  }
  if (data.expenses && data.expenses.monthlyCents > 0) {
    parts.push(`- Current spend on individual AI subscriptions: about ${money(data.expenses.monthlyCents)} per month`);
  }
  parts.push("");

  parts.push(
    "## Side by side",
    "",
    "| Plan | Fit score | Est. monthly cost | Admin controls | SSO | No training on your data | HIPAA agreement |",
    "| --- | --- | --- | --- | --- | --- | --- |"
  );
  rec.ranked.forEach((r) => {
    const p = r.plan;
    parts.push(
      `| ${p.name} | ${r.score}/100 | ${r.estimatedMonthlyCents === 0 ? "Included in suite" : money(r.estimatedMonthlyCents)} | ${p.adminControls ? "Yes" : "No"} | ${AVAILABILITY[p.sso]} | ${p.noTrainingByDefault ? "Yes" : "Check"} | ${AVAILABILITY[p.baa]} |`
    );
  });
  parts.push("");

  rec.ranked.forEach((r, i) => {
    parts.push(`### ${i + 1}. ${r.plan.name} (${r.plan.vendor})`, "");
    parts.push("Why it fits:", "");
    r.reasons.forEach((x) => parts.push(`- ${x}`));
    r.plan.strengths.forEach((x) => parts.push(`- ${x}`));
    parts.push("", "Watch out for:", "");
    r.cautions.forEach((x) => parts.push(`- ${x}`));
    parts.push(
      "",
      `Price: ${r.plan.includedInSuite ? "included in the suite subscription" : `${money(r.plan.annualPerSeatCents)} per user per month billed annually, ${money(r.plan.monthlyPerSeatCents)} month to month`}. Checked ${r.plan.priceCheckedOn}. Source: ${r.plan.sources.join(", ")}`,
      ""
    );
  });

  const primary = rec.primary!;
  parts.push(
    "## Rollout plan",
    "",
    `1. Confirm the price and data terms with ${primary.plan.vendor} (prices were checked ${primary.plan.priceCheckedOn} and change often).`,
    rec.regulated
      ? "2. Sign the vendor's data-protection agreement before any regulated data touches the tool."
      : "2. Turn on the admin setting that keeps company data out of model training, and confirm retention settings.",
    "3. Create team accounts with single sign-on where available, so access ends when someone leaves.",
    "4. Publish the Acceptable Use Policy and have staff sign it; it names this tool as approved.",
    "5. Run a 45-minute training: what the tool is for, what never goes in, how to report a mistake.",
    "6. Cancel individual subscriptions found in the expense scan and move those users to the team plan.",
    "7. Re-check in 90 days: adoption, remaining personal-account use, and any new AI apps found by monitoring.",
    ""
  );

  return parts.join("\n");
}
