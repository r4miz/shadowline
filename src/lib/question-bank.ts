/**
 * Assessment question bank for the Shadow AI risk-assessment platform.
 *
 * CONVENTIONS (the Phase 3 scoring engine depends on these, do not violate):
 * 1. `options` arrays are ordered HIGHEST-RISK FIRST -> LOWEST-RISK LAST.
 *    The first option always represents the worst-case / highest-exposure
 *    answer; the last option always represents the best-practice / safest
 *    answer. Scoring can therefore treat array index as a risk-severity rank.
 * 2. `boolean` questions must be phrased so that `true` / "Yes" is the
 *    LOWER-RISK answer (e.g. "Does a written AI acceptable-use policy
 *    exist?" -> Yes = good). Never phrase a boolean question where "Yes"
 *    indicates a problem.
 * 3. `answerType: "scale"` and `"text"` are NOT used in this seed, v1 keeps
 *    scoring deterministic and limited to single/multi/boolean.
 *    `"multi"` is reserved for inventory-style questions (e.g. "which
 *    categories of AI tools are in use?") where MORE selections indicates
 *    MORE exposure.
 * 4. `weight` ranges 1-5, where 5 = most consequential for overall risk
 *    scoring.
 * 5. `helpText` is optional plain-language clarification aimed at
 *    non-technical respondents, and is encouraged on jargon-heavy questions
 *    (MCP, browser extensions, CASB, OAuth app consent, DNS/proxy logs, etc).
 */

export const NIST_FUNCTIONS = ["GOVERN", "MAP", "MEASURE", "MANAGE"] as const;

export type QuestionSeed = {
  domain: string;
  text: string;
  helpText?: string;
  answerType: "single" | "multi" | "boolean" | "text";
  options?: string[];
  nistFunction: (typeof NIST_FUNCTIONS)[number];
  owaspRefs: string[];
  weight: number;
};

export const QUESTION_BANK: QuestionSeed[] = [
  // ---------------------------------------------------------------------
  // Domain 1: Inventory & Discovery (nistFunction: MAP)
  // ---------------------------------------------------------------------
  {
    domain: "Inventory & Discovery",
    text: "Has the organization conducted any survey or log review to identify which AI tools employees use?",
    answerType: "single",
    options: ["No", "Informal/ad hoc", "Yes, documented"],
    nistFunction: "MAP",
    owaspRefs: [],
    weight: 3,
  },
  {
    domain: "Inventory & Discovery",
    text: "Has the organization reviewed DNS or web proxy logs for traffic to known AI tool domains (e.g. chat.openai.com, claude.ai, gemini.google.com)?",
    helpText: "DNS/proxy logs record which websites devices on the company network have visited, even if no account was set up by IT.",
    answerType: "single",
    options: ["Never reviewed", "Reviewed once informally", "Reviewed regularly as part of monitoring"],
    nistFunction: "MAP",
    owaspRefs: [],
    weight: 3,
  },
  {
    domain: "Inventory & Discovery",
    text: "Has the organization reviewed OAuth app consent grants in its identity provider (e.g. Microsoft Entra ID, Google Workspace) for AI-related third-party apps?",
    helpText: "When employees click 'Sign in with Microsoft/Google' for a new AI tool, it creates an OAuth app consent grant that IT admins can review centrally.",
    answerType: "single",
    options: ["Never reviewed", "Reviewed once, no ongoing process", "Reviewed regularly with alerts for new grants"],
    nistFunction: "MAP",
    owaspRefs: [],
    weight: 4,
  },
  {
    domain: "Inventory & Discovery",
    text: "Does the organization have visibility into AI tool usage through a CASB (Cloud Access Security Broker) or similar SaaS-discovery tool?",
    helpText: "A CASB is a security tool that sits between users and cloud services to monitor and control which cloud/SaaS apps (including AI tools) are being used.",
    answerType: "single",
    options: ["No such tool deployed", "Tool deployed but not actively monitored", "Tool deployed and actively monitored for AI usage"],
    nistFunction: "MAP",
    owaspRefs: [],
    weight: 3,
  },
  {
    domain: "Inventory & Discovery",
    text: "Has the organization audited browser extensions installed on employee devices for AI-related extensions (e.g. AI writing assistants, meeting summarizers, AI sidebars)?",
    helpText: "Browser extensions can read and modify everything a user sees and types, including in webmail and internal web apps, and many AI extensions send page content to third-party servers.",
    answerType: "single",
    options: ["No audit performed", "Spot-checked a few devices", "Centrally managed/audited via device management"],
    nistFunction: "MAP",
    owaspRefs: [],
    weight: 3,
  },
  {
    domain: "Inventory & Discovery",
    text: "Which categories of AI tools are currently in use across the organization (to your knowledge)?",
    helpText: "Select every category that applies, even if usage is informal or unsanctioned. More categories in use generally means a larger attack surface to assess.",
    answerType: "multi",
    options: [
      "General-purpose chat assistants (e.g. ChatGPT, Claude, Gemini)",
      "AI coding assistants (e.g. Copilot, Cursor)",
      "AI browser extensions/sidebars",
      "Autonomous agents or AI plugins/MCP servers",
      "Embedded AI features in existing SaaS tools (e.g. AI in CRM, productivity suite)",
      "None known",
    ],
    nistFunction: "MAP",
    owaspRefs: [],
    weight: 3,
  },
  {
    domain: "Inventory & Discovery",
    text: "Is there a single, maintained inventory (spreadsheet, CMDB, or dedicated tool) listing all AI tools approved for use in the organization?",
    answerType: "single",
    options: ["No inventory exists", "Informal/partial list exists", "Centralized inventory maintained and kept current"],
    nistFunction: "MAP",
    owaspRefs: [],
    weight: 4,
  },

  // ---------------------------------------------------------------------
  // Domain 2: Data Handling & Classification (nistFunction: MAP/MEASURE; owaspRefs LLM02, LLM08)
  // ---------------------------------------------------------------------
  {
    domain: "Data Handling & Classification",
    text: "Are employees permitted to paste customer, financial, or health data into public AI tools?",
    answerType: "single",
    options: ["Yes/unrestricted", "Unclear/no policy", "Prohibited by written policy"],
    nistFunction: "MEASURE",
    owaspRefs: ["LLM02"],
    weight: 5,
  },
  {
    domain: "Data Handling & Classification",
    text: "Does the organization have a data classification scheme (e.g. public/internal/confidential/restricted) that employees are trained to apply before using AI tools?",
    answerType: "single",
    options: ["No classification scheme exists", "Scheme exists but not consistently applied", "Scheme exists and is actively applied/enforced"],
    nistFunction: "MAP",
    owaspRefs: ["LLM02"],
    weight: 4,
  },
  {
    domain: "Data Handling & Classification",
    text: "Has the organization assessed whether data submitted to AI tools could be used by the vendor to train future models?",
    helpText: "Many free/consumer AI tiers reserve the right to use submitted content for model training unless an opt-out or enterprise agreement is in place. This is the core concern behind OWASP LLM08 (excessive data exposure).",
    answerType: "single",
    options: ["Not assessed", "Assessed informally for some tools", "Assessed and documented for all tools in use, with opt-outs configured where needed"],
    nistFunction: "MEASURE",
    owaspRefs: ["LLM08"],
    weight: 4,
  },
  {
    domain: "Data Handling & Classification",
    text: "Are source code, trade secrets, or proprietary algorithms ever submitted to AI coding assistants or chat tools?",
    answerType: "single",
    options: ["Yes/unrestricted", "Sometimes, with no clear guidance", "No, prohibited or restricted to vetted enterprise tools only"],
    nistFunction: "MEASURE",
    owaspRefs: ["LLM02", "LLM08"],
    weight: 4,
  },
  {
    domain: "Data Handling & Classification",
    text: "Does the organization have a process to detect when sensitive files (contracts, spreadsheets with PII, etc.) are uploaded to AI tools?",
    helpText: "This could be a DLP (data loss prevention) tool, CASB policy, or manual review process that flags file uploads to AI domains.",
    answerType: "single",
    options: ["No detection capability", "Limited/manual detection", "Automated detection (DLP/CASB) in place"],
    nistFunction: "MEASURE",
    owaspRefs: ["LLM02"],
    weight: 4,
  },
  {
    domain: "Data Handling & Classification",
    text: "When AI-generated outputs are used in customer-facing materials, is there a review step to check for leaked internal data or fabricated information?",
    answerType: "single",
    options: ["No review", "Inconsistent/ad hoc review", "Mandatory review before external use"],
    nistFunction: "MEASURE",
    owaspRefs: ["LLM08"],
    weight: 3,
  },
  {
    domain: "Data Handling & Classification",
    text: "Are AI tool outputs that contain regulated data (e.g. health records, financial account numbers) retained, logged, or stored in ways consistent with the organization's data retention and compliance requirements?",
    answerType: "single",
    options: ["Not addressed/unknown", "Partially addressed", "Fully addressed and documented"],
    nistFunction: "MAP",
    owaspRefs: ["LLM02"],
    weight: 3,
  },

  // ---------------------------------------------------------------------
  // Domain 3: Accounts & Access (nistFunction: GOVERN/MANAGE; owaspRefs LLM02)
  // ---------------------------------------------------------------------
  {
    domain: "Accounts & Access",
    text: "Do employees use personal AI accounts for work tasks?",
    answerType: "single",
    options: ["Commonly", "Sometimes", "Rarely/never"],
    nistFunction: "MANAGE",
    owaspRefs: ["LLM02"],
    weight: 4,
  },
  {
    domain: "Accounts & Access",
    text: "Are AI tool accounts provisioned and de-provisioned as part of the standard employee onboarding/offboarding process?",
    answerType: "single",
    options: ["Not part of the process", "Sometimes/inconsistently", "Always, as part of standard IT process"],
    nistFunction: "MANAGE",
    owaspRefs: ["LLM02"],
    weight: 4,
  },
  {
    domain: "Accounts & Access",
    text: "Is single sign-on (SSO) with multi-factor authentication (MFA) required for sanctioned AI tool accounts?",
    helpText: "SSO/MFA ensures AI tool access is tied to a centrally managed identity that can be revoked, rather than a standalone account with just a password.",
    answerType: "single",
    options: ["Not required/not available", "Available but optional", "Required for all sanctioned AI tools"],
    nistFunction: "GOVERN",
    owaspRefs: ["LLM02"],
    weight: 4,
  },
  {
    domain: "Accounts & Access",
    text: "Are AI tool accounts assigned at the individual user level (rather than shared team/department logins)?",
    answerType: "single",
    options: ["Shared accounts common", "Mix of shared and individual accounts", "Individual accounts only"],
    nistFunction: "MANAGE",
    owaspRefs: ["LLM02"],
    weight: 3,
  },
  {
    domain: "Accounts & Access",
    text: "Does the organization maintain a defined list of roles or individuals authorized to approve new AI tools for use?",
    answerType: "single",
    options: ["No defined approver", "Informal, varies by team", "Clearly defined approval authority"],
    nistFunction: "GOVERN",
    owaspRefs: [],
    weight: 3,
  },
  {
    domain: "Accounts & Access",
    text: "Are privileged accounts (admin, finance, HR systems) ever connected to AI tools or AI browser extensions?",
    helpText: "AI extensions and integrations that have access to privileged accounts can read or act on highly sensitive data, amplifying the impact of any compromise.",
    answerType: "single",
    options: ["Yes, no restrictions", "Unclear/not tracked", "No, privileged accounts excluded from AI tool access"],
    nistFunction: "MANAGE",
    owaspRefs: ["LLM02"],
    weight: 5,
  },
  {
    domain: "Accounts & Access",
    text: "Does the organization periodically review and revoke unused or stale AI tool access (accounts, API keys, OAuth grants)?",
    answerType: "single",
    options: ["No periodic review", "Reviewed occasionally/reactively", "Reviewed on a regular schedule"],
    nistFunction: "MANAGE",
    owaspRefs: ["LLM02"],
    weight: 3,
  },

  // ---------------------------------------------------------------------
  // Domain 4: Tooling, Agents & Integrations (nistFunction: MAP/MEASURE; owaspRefs LLM05, LLM06, LLM07, LLM03)
  // ---------------------------------------------------------------------
  {
    domain: "Tooling, Agents & Integrations",
    text: "Are any AI agents or assistants granted autonomous access to send email, modify records, or trigger workflows?",
    answerType: "single",
    options: ["Yes, without review", "Yes, with review", "No"],
    nistFunction: "MEASURE",
    owaspRefs: ["LLM06", "LLM05"],
    weight: 5,
  },
  {
    domain: "Tooling, Agents & Integrations",
    text: "Has the organization inventoried which AI tools or agents have access via MCP (Model Context Protocol) servers or similar plugin/connector frameworks?",
    helpText: "MCP is a standard that lets AI assistants connect to external tools and data sources (e.g. your file system, databases, or business apps). Each connector is a potential access path into company systems.",
    answerType: "single",
    options: ["No inventory/unknown", "Partial awareness, not documented", "Documented inventory maintained"],
    nistFunction: "MAP",
    owaspRefs: ["LLM07"],
    weight: 4,
  },
  {
    domain: "Tooling, Agents & Integrations",
    text: "Are AI plugins, agents, or integrations tested for prompt injection risks before being deployed (e.g. malicious instructions hidden in documents, emails, or web pages the AI processes)?",
    helpText: "Prompt injection is when an attacker hides instructions in content the AI reads (a document, email, or webpage) to manipulate the AI into taking unintended actions.",
    answerType: "single",
    options: ["Not tested", "Tested informally for some tools", "Tested systematically before deployment"],
    nistFunction: "MEASURE",
    owaspRefs: ["LLM03"],
    weight: 4,
  },
  {
    domain: "Tooling, Agents & Integrations",
    text: "Do AI agents/integrations operate with the minimum permissions needed for their task (least privilege), or do they typically use broad/admin-level access?",
    answerType: "single",
    options: ["Broad/admin access common", "Mixed, not consistently scoped", "Least-privilege scoping enforced"],
    nistFunction: "MEASURE",
    owaspRefs: ["LLM06"],
    weight: 4,
  },
  {
    domain: "Tooling, Agents & Integrations",
    text: "Does the organization rely on AI-generated code suggestions (e.g. from Copilot, Cursor, ChatGPT) without a code review or dependency-vetting process?",
    helpText: "AI coding assistants can suggest insecure code patterns or reference non-existent/malicious packages (OWASP LLM05 - supply chain risk).",
    answerType: "single",
    options: ["No review process", "Review process exists but inconsistently applied", "All AI-assisted code goes through standard review"],
    nistFunction: "MEASURE",
    owaspRefs: ["LLM05"],
    weight: 3,
  },
  {
    domain: "Tooling, Agents & Integrations",
    text: "Has the organization identified any AI tools or plugins installed by individual employees without IT approval (shadow integrations)?",
    answerType: "single",
    options: ["Known to exist, not addressed", "Some identified and being addressed", "None identified / actively prevented via policy and controls"],
    nistFunction: "MAP",
    owaspRefs: ["LLM07"],
    weight: 4,
  },
  {
    domain: "Tooling, Agents & Integrations",
    text: "Are outputs from AI agents that take real-world actions (sending messages, updating systems, executing code) monitored or logged for review?",
    answerType: "single",
    options: ["No logging/monitoring", "Partial logging, rarely reviewed", "Logged and regularly reviewed"],
    nistFunction: "MEASURE",
    owaspRefs: ["LLM06"],
    weight: 4,
  },
  {
    domain: "Tooling, Agents & Integrations",
    text: "Has the organization evaluated which AI tools/integrations could be manipulated by overreliance on their output for critical decisions (e.g. financial approvals, security alerts)?",
    helpText: "OWASP LLM09 'overreliance' risk: if staff trust AI output without verification for high-stakes decisions, errors or manipulated outputs can cause real harm.",
    answerType: "single",
    options: ["Not evaluated", "Evaluated for some high-stakes processes", "Evaluated across all high-stakes processes with safeguards in place"],
    nistFunction: "MAP",
    owaspRefs: ["LLM03"],
    weight: 3,
  },

  // ---------------------------------------------------------------------
  // Domain 5: Governance & Policy (nistFunction: GOVERN)
  // ---------------------------------------------------------------------
  {
    domain: "Governance & Policy",
    text: "Does a written AI acceptable-use policy exist?",
    answerType: "boolean",
    nistFunction: "GOVERN",
    owaspRefs: [],
    weight: 5,
  },
  {
    domain: "Governance & Policy",
    text: "Is there an executive sponsor or committee responsible for AI governance and risk oversight?",
    answerType: "single",
    options: ["No ownership assigned", "Informal/part-time ownership", "Formal sponsor/committee with defined responsibilities"],
    nistFunction: "GOVERN",
    owaspRefs: [],
    weight: 3,
  },
  {
    domain: "Governance & Policy",
    text: "Does the organization have a documented process for evaluating and approving new AI tools before they are adopted?",
    answerType: "single",
    options: ["No process", "Informal/inconsistent process", "Documented approval process followed consistently"],
    nistFunction: "GOVERN",
    owaspRefs: [],
    weight: 4,
  },
  {
    domain: "Governance & Policy",
    text: "Is AI risk considered as part of the organization's broader risk management or compliance program (e.g. alongside cybersecurity, privacy)?",
    answerType: "single",
    options: ["Not considered", "Considered informally", "Formally integrated into risk/compliance program"],
    nistFunction: "GOVERN",
    owaspRefs: [],
    weight: 3,
  },
  {
    domain: "Governance & Policy",
    text: "Are AI-related policies reviewed and updated on a recurring schedule (e.g. annually) to keep pace with new tools and threats?",
    answerType: "single",
    options: ["Never reviewed/no policy", "Reviewed occasionally, no set schedule", "Reviewed on a defined recurring schedule"],
    nistFunction: "GOVERN",
    owaspRefs: [],
    weight: 3,
  },
  {
    domain: "Governance & Policy",
    text: "Does the organization's policy address acceptable use of AI for regulated activities (e.g. legal, medical, financial advice generation)?",
    answerType: "single",
    options: ["Not addressed", "Partially addressed", "Clearly addressed with role-specific guidance"],
    nistFunction: "GOVERN",
    owaspRefs: [],
    weight: 3,
  },
  {
    domain: "Governance & Policy",
    text: "Are consequences for violating the AI acceptable-use policy clearly defined and communicated to staff?",
    answerType: "single",
    options: ["No, or no policy exists", "Defined but not communicated widely", "Clearly defined and communicated"],
    nistFunction: "GOVERN",
    owaspRefs: [],
    weight: 2,
  },

  // ---------------------------------------------------------------------
  // Domain 6: Training & Awareness (nistFunction: GOVERN)
  // ---------------------------------------------------------------------
  {
    domain: "Training & Awareness",
    text: "Have employees received training on safe and acceptable use of AI tools?",
    answerType: "single",
    options: ["No training provided", "One-time/optional training", "Regular, mandatory training for all staff"],
    nistFunction: "GOVERN",
    owaspRefs: [],
    weight: 4,
  },
  {
    domain: "Training & Awareness",
    text: "Does training cover how to recognize and report risky AI-related incidents (e.g. accidental data leakage, suspicious AI agent behavior)?",
    answerType: "single",
    options: ["Not covered", "Briefly mentioned", "Dedicated incident-recognition content included"],
    nistFunction: "GOVERN",
    owaspRefs: [],
    weight: 3,
  },
  {
    domain: "Training & Awareness",
    text: "Is there a clear, known channel for employees to report concerns about AI tool usage (their own or others') without fear of punitive action?",
    answerType: "single",
    options: ["No channel/unclear", "Channel exists but not well known", "Well-known channel with clear non-punitive reporting process"],
    nistFunction: "GOVERN",
    owaspRefs: [],
    weight: 3,
  },
  {
    domain: "Training & Awareness",
    text: "Does new-hire onboarding include guidance on which AI tools are approved and how to request access to new ones?",
    answerType: "single",
    options: ["Not included", "Mentioned briefly", "Covered explicitly as part of onboarding"],
    nistFunction: "GOVERN",
    owaspRefs: [],
    weight: 2,
  },
  {
    domain: "Training & Awareness",
    text: "Has leadership (executives, managers) received any AI risk awareness briefing distinct from general staff training?",
    helpText: "Leaders often set the tone for AI adoption and may need awareness of organizational risk exposure and approval responsibilities beyond general staff guidance.",
    answerType: "single",
    options: ["No", "Informal/ad hoc", "Yes, dedicated briefing delivered"],
    nistFunction: "GOVERN",
    owaspRefs: [],
    weight: 2,
  },
  {
    domain: "Training & Awareness",
    text: "Are real-world examples or simulations (e.g. phishing-style tests involving AI-generated content) used to reinforce AI risk training?",
    answerType: "single",
    options: ["Never used", "Used occasionally", "Used regularly as part of training program"],
    nistFunction: "GOVERN",
    owaspRefs: [],
    weight: 2,
  },
  {
    domain: "Training & Awareness",
    text: "Is completion of AI risk/awareness training tracked and reported to management?",
    answerType: "single",
    options: ["Not tracked", "Tracked informally", "Tracked and regularly reported"],
    nistFunction: "GOVERN",
    owaspRefs: [],
    weight: 2,
  },

  // ---------------------------------------------------------------------
  // Domain 7: Third-party / Vendor AI (nistFunction: MAP; owaspRefs LLM03)
  // ---------------------------------------------------------------------
  {
    domain: "Third-party / Vendor AI",
    text: "Does the organization assess whether its key vendors and SaaS providers have introduced AI features that process the organization's data?",
    helpText: "Many existing SaaS tools (CRM, helpdesk, productivity suites) have rolled out AI features that may process your data by default, sometimes without explicit notice.",
    answerType: "single",
    options: ["Not assessed", "Assessed for some key vendors", "Assessed systematically for all key vendors"],
    nistFunction: "MAP",
    owaspRefs: ["LLM03"],
    weight: 4,
  },
  {
    domain: "Third-party / Vendor AI",
    text: "Are AI-related questions (data use, training opt-out, security certifications) included in the organization's vendor due-diligence/security questionnaire process?",
    answerType: "single",
    options: ["Not included", "Included for some/major vendors only", "Included as standard for all vendors"],
    nistFunction: "MAP",
    owaspRefs: ["LLM03"],
    weight: 4,
  },
  {
    domain: "Third-party / Vendor AI",
    text: "Has the organization reviewed contractual terms with AI vendors regarding data ownership, retention, and use for model training?",
    answerType: "single",
    options: ["Not reviewed", "Reviewed for some vendors", "Reviewed and negotiated where needed for all key vendors"],
    nistFunction: "MAP",
    owaspRefs: ["LLM03"],
    weight: 4,
  },
  {
    domain: "Third-party / Vendor AI",
    text: "Does the organization have a process to be notified when a vendor enables a new AI feature by default (e.g. via release notes or admin announcements)?",
    answerType: "single",
    options: ["No process", "Relies on informal/occasional checks", "Proactive monitoring of vendor AI feature announcements"],
    nistFunction: "MAP",
    owaspRefs: ["LLM03"],
    weight: 3,
  },
  {
    domain: "Third-party / Vendor AI",
    text: "If a vendor's AI feature were found to expose company data inappropriately, does the organization know how to disable it and who to contact?",
    answerType: "single",
    options: ["No, unclear", "Partially known for some vendors", "Documented for all key vendors"],
    nistFunction: "MAP",
    owaspRefs: ["LLM03"],
    weight: 3,
  },
  {
    domain: "Third-party / Vendor AI",
    text: "Has the organization evaluated the supply-chain risk of AI models or components used by vendors (e.g. open-source models, third-party fine-tunes)?",
    helpText: "Vendors may build on third-party or open-source AI models with their own data and security risks (OWASP LLM05 - supply chain vulnerabilities).",
    answerType: "single",
    options: ["Not evaluated", "Evaluated for high-risk vendors only", "Evaluated as part of standard vendor risk assessment"],
    nistFunction: "MAP",
    owaspRefs: ["LLM03"],
    weight: 3,
  },
  {
    domain: "Third-party / Vendor AI",
    text: "Does the organization maintain a list of vendors known to use the organization's data for AI training, with opt-out status documented?",
    answerType: "single",
    options: ["No such list", "Informal/partial list", "Documented list with opt-out status tracked"],
    nistFunction: "MAP",
    owaspRefs: ["LLM03"],
    weight: 3,
  },
];
