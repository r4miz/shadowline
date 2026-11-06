import { AUP_REQUIRED_SECTIONS } from "@/lib/frameworks";
import { disclaimerBlock, isoDate, preparedBy } from "@/lib/documents/shared";
import type { DocumentData } from "@/lib/documents/types";

// Body text for each of the 13 required sections (spec 5.5), pre-filled from the
// audit. The operator edits these with the owner; they are sensible policy
// defaults, not legal advice (see disclaimer).
function sectionBody(index: number, data: DocumentData): string {
  const org = data.organization.name;
  const sanctioned = data.tools.filter((t) => t.sanctioned);
  const sanctionedList =
    sanctioned.length > 0
      ? sanctioned.map((t) => `- ${t.name}${t.vendor ? ` (${t.vendor})` : ""}`).join("\n")
      : "- _No approved tools recorded yet. Add approved tools here._";
  const recommended = data.recommendation?.primary?.plan.name;

  switch (index) {
    case 0: // Purpose & scope
      return `This Acceptable Use Policy governs how ${org} staff, contractors, and third parties may use artificial-intelligence (AI) tools for ${org} work. It applies to all AI tools, whether provided by ${org} or accessed personally, when used with ${org} information.`;
    case 1: // Definitions
      return `**AI tool:** any software using machine-learning or large-language-model capabilities (for example chat assistants, coding assistants, meeting note-takers, AI browser extensions, autonomous agents). **Public AI tool:** a free or personal-tier service not contracted by ${org}. **Approved tool:** an AI tool ${org} has approved for specific use cases.`;
    case 2: // Approved-use list
      return `The following AI tools are approved for ${org} work, within their approved use cases:\n\n${sanctionedList}${
        recommended && !sanctioned.some((t) => t.name === recommended)
          ? `\n\n${org} intends to provide **${recommended}** as the standard company tool. Once accounts are issued, it becomes the approved tool for general writing, analysis and research.`
          : ""
      }\n\nUse cases not listed here require approval from the governance owner (see Roles and responsibilities).`;
    case 3: {
      // Blocked-use list (mandatory rule)
      const base = `Free or personal-tier public AI tools **must NOT** be used with any data classified **internal** or **confidential**. The following are prohibited: pasting customer, financial, health, or other regulated data into public AI tools; uploading ${org} documents to unapproved services; and using AI output as the sole basis for legal, financial, or clinical decisions without human review.`;
      const shadow = data.tools.filter((t) => !t.sanctioned);
      if (shadow.length === 0) return base;
      const shadowList = shadow.map((t) => `- ${t.name}${t.vendor ? ` (${t.vendor})` : ""}`).join("\n");
      return `${base}\n\nThe following AI tools were identified in use but not yet approved during this assessment. They must not be used with internal, confidential, or regulated data until reviewed and approved (or blocked):\n\n${shadowList}`;
    }
    case 4: // Data classification & handling
      return `All data handled with AI tools must respect ${org}'s data-classification scheme (public, internal, confidential, regulated). Confidential and regulated data may only be processed by approved tools under a contract with appropriate data-protection terms. When in doubt, treat data as confidential.`;
    case 5: // Account & access
      return `Staff must use ${org}-provided accounts for any AI tool used with ${org} data. Personal AI accounts must not be used for company work. Access to approved tools is granted on a least-privilege basis and reviewed when roles change or when someone leaves.`;
    case 6: // Human oversight
      return `AI tools and agents must not be granted autonomous authority to send external communications, modify records, move funds, or trigger high-impact workflows without explicit human review and approval of each action.`;
    case 7: // Browser extension / MCP / agent rules
      return `AI browser extensions, meeting bots that join calls, Model Context Protocol (MCP) servers, plugins, and autonomous agents must be inventoried and approved before use. Extensions that can read or modify page content on ${org} systems, and bots that record meetings with clients, are prohibited unless centrally managed and approved by the governance owner.`;
    case 8: // Incident reporting
      return `Suspected misuse, data exposure, or harmful AI output must be reported to the governance owner within one business day. Do not attempt to conceal or independently remediate a suspected data exposure. Reporting an honest mistake promptly will not by itself lead to discipline.`;
    case 9: // Roles & responsibilities
      return `A named **governance owner** is accountable for this policy, the approved-tool list, exception approvals, and periodic review. Managers are responsible for their teams' compliance. All staff are responsible for following this policy and confirming they have read it.`;
    case 10: // Enforcement & consequences
      return `Violations may result in revocation of AI-tool access and disciplinary action up to and including termination, consistent with ${org}'s existing HR and security policies.`;
    case 11: // Training / AI literacy
      return `All staff who use AI tools must complete a short AI-literacy session covering safe data handling, the risks of public AI tools, and this policy. Training is refreshed at least annually and forms part of onboarding.`;
    case 12: // Review cadence
      return `This policy is reviewed on a **quarterly** cadence by the governance owner, and whenever a material change in AI tooling, regulation, or ${org}'s risk profile occurs.`;
    default:
      return "";
  }
}

// One-line preamble tying the policy to this audit (spec 5.5: "pre-filled from answers").
function assessmentPreamble(data: DocumentData): string {
  const n = data.findings.length;
  if (n === 0) {
    return `This policy was drafted following a Shadow AI assessment of ${data.organization.name}. Tailor each section to the organization's specific risks before adopting it.`;
  }
  const red = data.findings.filter((f) => f.ragRating === "red").length;
  return `This policy was drafted following a Shadow AI assessment of ${data.organization.name} that identified ${n} risk finding${n === 1 ? "" : "s"} (${red} high-risk). The sections below are pre-filled from that assessment. Review and tailor them before adopting.`;
}

/** AI Acceptable Use Policy (spec section 5.5, all 13 sections) as Markdown. */
export function generateAUP(data: DocumentData): string {
  const parts = [
    "# AI Acceptable Use Policy",
    "",
    `**Organization:** ${data.organization.name}`,
    `**Effective date:** ${isoDate(data.generatedAt)}`,
    preparedBy(data),
    "",
    disclaimerBlock(),
    "",
    assessmentPreamble(data),
    "",
    "---",
    "",
  ];

  AUP_REQUIRED_SECTIONS.forEach((section, i) => {
    const heading = section.split(" \u2014 ")[0];
    parts.push(`## ${i + 1}. ${heading}`, "", sectionBody(i, data), "");
  });

  return parts.join("\n");
}
