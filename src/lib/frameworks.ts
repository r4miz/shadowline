// Framework reference data, embedded verbatim from build spec Section 5.
// Always cite version numbers in generated documents. Never paraphrase.

export const OWASP_LLM_TOP_10_2025 = [
  {
    id: "LLM01",
    code: "LLM01:2025",
    name: "Prompt Injection",
    description:
      "crafted inputs (direct or indirect) alter model behavior/outputs.",
  },
  {
    id: "LLM02",
    code: "LLM02:2025",
    name: "Sensitive Information Disclosure",
    description: "model reveals PII, secrets, or confidential data.",
  },
  {
    id: "LLM03",
    code: "LLM03:2025",
    name: "Supply Chain",
    description:
      "vulnerabilities in third-party models, datasets, plugins, or components.",
  },
  {
    id: "LLM04",
    code: "LLM04:2025",
    name: "Data and Model Poisoning",
    description: "malicious data in pre-training, fine-tuning, or embeddings.",
  },
  {
    id: "LLM05",
    code: "LLM05:2025",
    name: "Improper Output Handling",
    description:
      "unsafe downstream use of model output (injection into other systems).",
  },
  {
    id: "LLM06",
    code: "LLM06:2025",
    name: "Excessive Agency",
    description:
      "over-permissioned agents/tools take unintended harmful actions.",
  },
  {
    id: "LLM07",
    code: "LLM07:2025",
    name: "System Prompt Leakage",
    description:
      "system/instruction prompts exposed, revealing logic or secrets.",
  },
  {
    id: "LLM08",
    code: "LLM08:2025",
    name: "Vector and Embedding Weaknesses",
    description:
      "RAG/embedding attacks, embedding inversion, data leakage.",
  },
  {
    id: "LLM09",
    code: "LLM09:2025",
    name: "Misinformation",
    description:
      "confident false/unreliable output (incl. hallucination) causing harm.",
  },
  {
    id: "LLM10",
    code: "LLM10:2025",
    name: "Unbounded Consumption",
    description:
      "uncontrolled resource use / denial-of-wallet / model extraction.",
  },
] as const;

export const OWASP_SOURCE_CITATION =
  'OWASP GenAI Project, "OWASP Top 10 for LLM Applications 2025."';

export const NIST_AI_RMF = {
  version: "NIST AI RMF 1.0",
  published: "2023-01-26",
  nature: "voluntary, non-certifiable; ~72 subcategories",
  functions: [
    {
      id: "GOVERN",
      description:
        "(cross-cutting) culture of AI risk management, accountability structures, policies/processes, oversight.",
    },
    {
      id: "MAP",
      description:
        "establish context: use case, stakeholders, system boundaries, categorization, potential harms/benefits.",
    },
    {
      id: "MEASURE",
      description:
        "analyze, assess, benchmark, and monitor AI risks and trustworthiness (test/eval/verify/validate).",
    },
    {
      id: "MANAGE",
      description:
        "prioritize and act on risks; allocate resources; respond to and recover from incidents; monitor for drift.",
    },
  ],
  trustworthyCharacteristics: [
    "valid & reliable",
    "safe",
    "secure & resilient",
    "accountable & transparent",
    "explainable & interpretable",
    "privacy-enhanced",
    "fair (with harmful bias managed)",
  ],
  iso42001Note:
    "NIST AI RMF and ISO/IEC 42001 are complementary \u2014 42001 is the certifiable management-system standard (Plan-Do-Check-Act). Mention 42001 in the report as 'next maturity step'.",
} as const;

export const EU_AI_ACT = {
  regulation: "Regulation 2024/1689",
  riskTiers: [
    "Unacceptable (prohibited)",
    "High",
    "Limited (transparency obligations)",
    "Minimal",
  ],
  penalties: "up to €35M or 7% of global annual turnover",
} as const;

export const SHADOW_AI_DISCOVERY_METHODS = [
  "Anonymous employee survey: which AI tools used, for what, with what data.",
  "DNS / web-proxy log review for known AI service domains (consultant enters findings manually in v1).",
  "OAuth app-consent review in identity provider (e.g., Microsoft Entra ID).",
  "CASB visibility (e.g., Microsoft Defender for Cloud Apps, Netskope) \u2014 note as recommended control, not a built integration.",
  "Browser-extension audit and MCP/agent/plugin inventory.",
] as const;

export const AUP_REQUIRED_SECTIONS = [
  "Purpose & scope",
  "Definitions",
  "Approved-use list (sanctioned tools + permitted use cases)",
  "Blocked-use list \u2014 mandatory rule: free/personal-tier public AI tools must NOT be used with data classified internal or confidential",
  "Data classification & handling rules",
  "Account & access rules (no personal accounts for company data)",
  "Human-oversight rules (no autonomous send/commit authority for high-impact actions)",
  "Browser extension / MCP / autonomous-agent rules",
  "Incident reporting process",
  "Roles & responsibilities (name a governance owner)",
  "Enforcement & consequences",
  "Training / AI-literacy expectations",
  "Review cadence (default: quarterly)",
] as const;
