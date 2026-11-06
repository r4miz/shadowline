// Legal disclaimer, include verbatim on every generated document (spec section 8).
export const DISCLAIMER =
  "This assessment is for informational purposes and is not legal advice. NIST AI RMF and the OWASP Top 10 are voluntary references. Regulatory obligations (including the EU AI Act) should be confirmed with qualified counsel.";

// EU AI Act (Regulation 2024/1689) key dates, editable config, never hardcode in prose.
// Dates as of mid-2026; confirm current dates with counsel before relying on them.
export const EU_AI_ACT_DATES = {
  prohibitedPracticesAndAILiteracy: "2025-02-02", // in force since 2 Feb 2025
  gpaiModelObligations: "2025-08-02", // in force since 2 Aug 2025
  transparencyObligationsArt50: "2026-08-02", // from 2 Aug 2026
  highRiskAnnexIII: "2027-12-02", // ~2 Dec 2027, deferred under "Digital Omnibus" (political agreement 7 May 2026), subject to formal adoption
  highRiskAnnexI: "2028-08-02", // ~2 Aug 2028, deferred under "Digital Omnibus", subject to formal adoption
  counselNote:
    "Key dates reflect the Digital Omnibus political agreement of 7 May 2026 and are subject to formal adoption. Confirm current dates with counsel.",
} as const;

// Risk scoring thresholds (spec section 5.6): risk = likelihood (1-5) x impact (1-5)
export const RAG_THRESHOLDS = {
  greenMax: 6, // risk 1-6 -> green
  amberMax: 14, // risk 7-14 -> amber; 15-25 -> red
} as const;
