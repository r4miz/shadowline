/**
 * Team AI plan catalog used by the recommendation engine. Prices change often:
 * every entry carries `priceCheckedOn` and the public pages the figure came
 * from. Figures are list prices in US cents per user per month. Anything we
 * could not confirm from a vendor's own page is marked `verify`.
 *
 * The engine is vendor-neutral. There are no affiliate relationships.
 */
import type { PlanKey } from "@/lib/ai-catalog";

export type Availability = "yes" | "higher_tier" | "verify" | "no";

export interface PlanProfile {
  key: PlanKey;
  name: string;
  vendor: string;
  /** Per user per month, billed annually. */
  annualPerSeatCents: number;
  /** Per user per month, billed monthly. */
  monthlyPerSeatCents: number;
  seatMin: number;
  seatMax: number | null;
  /** Which suite this plan is bundled with or native to, if any. */
  suiteAffinity: "google" | "microsoft" | null;
  /** True when the AI is included in a suite tier the company may already pay for. */
  includedInSuite: boolean;
  adminControls: boolean;
  sso: Availability;
  /** Vendor states business data is not used to train models by default. */
  noTrainingByDefault: boolean;
  /** HIPAA Business Associate Agreement availability for this tier. */
  baa: Availability;
  /** Catalog keys of consumer tools this plan replaces. */
  replacesCatalogKeys: string[];
  strengths: string[];
  cautions: string[];
  priceCheckedOn: string;
  sources: string[];
}

export const PLAN_CATALOG: PlanProfile[] = [
  {
    key: "chatgpt_business",
    name: "ChatGPT Business",
    vendor: "OpenAI",
    annualPerSeatCents: 2000,
    monthlyPerSeatCents: 2500,
    seatMin: 2,
    seatMax: null,
    suiteAffinity: null,
    includedInSuite: false,
    adminControls: true,
    sso: "yes",
    noTrainingByDefault: true,
    baa: "higher_tier",
    replacesCatalogKeys: ["chatgpt", "image_generators"],
    strengths: [
      "The tool most staff already know, so training is short",
      "Strong general writing, analysis and image generation in one place",
      "Shared workspace with admin controls and usage reporting",
    ],
    cautions: [
      "HIPAA agreements are offered on higher tiers; confirm with OpenAI for health data",
      "Does not live inside your email and documents the way suite tools do",
    ],
    priceCheckedOn: "2026-10-16",
    sources: ["https://openai.com/chatgpt/pricing/"],
  },
  {
    key: "claude_team",
    name: "Claude Team",
    vendor: "Anthropic",
    annualPerSeatCents: 2000,
    monthlyPerSeatCents: 2500,
    seatMin: 2,
    seatMax: 150,
    suiteAffinity: null,
    includedInSuite: false,
    adminControls: true,
    sso: "higher_tier",
    noTrainingByDefault: true,
    baa: "verify",
    replacesCatalogKeys: ["claude"],
    strengths: [
      "Strong on long documents, careful writing and analysis",
      "Business data is not used for training by default",
      "Projects and shared knowledge for teams",
    ],
    cautions: [
      "Capped at 150 seats on the Team tier",
      "Single sign-on and HIPAA agreements are enterprise features; confirm with Anthropic",
      "Less familiar to most staff than ChatGPT",
    ],
    priceCheckedOn: "2026-10-16",
    sources: ["https://www.anthropic.com/pricing"],
  },
  {
    key: "m365_copilot",
    name: "Microsoft 365 Copilot",
    vendor: "Microsoft",
    // Microsoft 365 Copilot Business add-on list price (the enterprise add-on is
    // about $30). A promotional $18 rate was advertised through 31 Dec 2026.
    annualPerSeatCents: 2100,
    monthlyPerSeatCents: 2100,
    seatMin: 1,
    seatMax: 300,
    suiteAffinity: "microsoft",
    includedInSuite: false,
    adminControls: true,
    sso: "yes",
    noTrainingByDefault: true,
    baa: "yes",
    replacesCatalogKeys: ["copilot_m365", "chatgpt", "meeting_notetaker"],
    strengths: [
      "Works inside Outlook, Word, Excel and Teams, where staff already are",
      "Meeting recap in Teams removes the need for third-party note-takers",
      "Covered by the Microsoft 365 data protection and compliance terms your company already has",
    ],
    cautions: [
      "It is an add-on to a qualifying Microsoft 365 Business plan, not a standalone subscription",
      "Only useful if the company runs on Microsoft 365",
      "The Business add-on is capped at 300 users; larger companies pay the enterprise rate",
    ],
    priceCheckedOn: "2026-10-16",
    sources: ["https://www.microsoft.com/en-us/microsoft-365/copilot/business"],
  },
  {
    key: "gemini_workspace",
    name: "Gemini in Google Workspace",
    vendor: "Google",
    annualPerSeatCents: 0,
    monthlyPerSeatCents: 0,
    seatMin: 1,
    seatMax: null,
    suiteAffinity: "google",
    includedInSuite: true,
    adminControls: true,
    sso: "yes",
    noTrainingByDefault: true,
    baa: "yes",
    replacesCatalogKeys: ["gemini", "meeting_notetaker"],
    strengths: [
      "Included in Google Workspace Business plans, so there is often no extra licence",
      "Works inside Gmail, Docs, Sheets and Meet; Meet notes replace third-party recorders",
      "Covered by the Workspace admin controls and data terms the company already has",
    ],
    cautions: [
      "Feature depth depends on the Workspace tier; Business Starter gets less than Standard or Plus",
      "Only useful if the company runs on Google Workspace",
    ],
    priceCheckedOn: "2026-10-16",
    sources: ["https://workspace.google.com/pricing"],
  },
];

export const PLAN_BY_KEY = new Map(PLAN_CATALOG.map((p) => [p.key, p]));
