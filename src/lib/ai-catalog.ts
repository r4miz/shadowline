/**
 * Shared AI tool catalog. One table feeds four places so evidence merges:
 *   - the employee survey (option labels -> catalog keys)
 *   - workspace scan classification (app names / publishers -> catalog keys)
 *   - expense matching (card statement merchant strings -> catalog keys)
 *   - the recommendation engine (which team plan replaces this consumer use)
 *
 * Pure data + pure helpers. Patterns are case-insensitive regex sources.
 */

export type ToolCategory =
  | "chat_assistant"
  | "coding_assistant"
  | "meeting_notes"
  | "writing_assistant"
  | "image_video"
  | "search"
  | "productivity_ai"
  | "voice_audio"
  | "other";

export type PlanKey =
  | "chatgpt_business"
  | "claude_team"
  | "m365_copilot"
  | "gemini_workspace";

export interface CatalogEntry {
  key: string;
  name: string;
  vendor: string;
  category: ToolCategory;
  /** Exact label shown in the employee survey (omit to hide from the survey). */
  surveyLabel?: string;
  /** Regex sources matched against a discovered app's display name. */
  appNamePatterns: string[];
  /** Regex sources matched against a discovered app's publisher. */
  publisherPatterns?: string[];
  /** Regex sources matched against card-statement merchant descriptions. */
  merchantPatterns: string[];
  /** Team plan that would bring this usage under company control. */
  teamPlanKey?: PlanKey;
  /** Typical consumer subscription price, used for consolidation math. */
  consumerPriceCents?: number;
  /** Extra caution shown in reports (e.g. data residency). */
  caution?: string;
}

export const TOOL_CATEGORY_LABELS: Record<ToolCategory, string> = {
  chat_assistant: "Chat assistant",
  coding_assistant: "Coding assistant",
  meeting_notes: "Meeting notes / recorder",
  writing_assistant: "Writing assistant",
  image_video: "Image or video generation",
  search: "AI search",
  productivity_ai: "AI inside a productivity app",
  voice_audio: "Voice / audio AI",
  other: "Other AI tool",
};

export const AI_CATALOG: CatalogEntry[] = [
  {
    key: "chatgpt",
    name: "ChatGPT",
    vendor: "OpenAI",
    category: "chat_assistant",
    surveyLabel: "ChatGPT",
    appNamePatterns: ["chat\\s?gpt", "\\bopenai\\b", "\\bgpt\\b"],
    publisherPatterns: ["openai"],
    merchantPatterns: ["openai", "chatgpt", "chat\\s?gpt"],
    teamPlanKey: "chatgpt_business",
    consumerPriceCents: 2000,
  },
  {
    key: "claude",
    name: "Claude",
    vendor: "Anthropic",
    category: "chat_assistant",
    surveyLabel: "Claude",
    appNamePatterns: ["\\bclaude\\b", "anthropic"],
    publisherPatterns: ["anthropic"],
    merchantPatterns: ["anthropic", "claude\\.ai", "\\bclaude\\b"],
    teamPlanKey: "claude_team",
    consumerPriceCents: 2000,
  },
  {
    key: "gemini",
    name: "Gemini",
    vendor: "Google",
    category: "chat_assistant",
    surveyLabel: "Gemini",
    appNamePatterns: ["\\bgemini\\b", "\\bbard\\b"],
    merchantPatterns: ["google\\s*one\\s*ai", "gemini\\s*advanced", "google\\s*ai\\s*pro"],
    teamPlanKey: "gemini_workspace",
    consumerPriceCents: 1999,
  },
  {
    key: "github_copilot",
    name: "GitHub Copilot",
    vendor: "GitHub (Microsoft)",
    category: "coding_assistant",
    surveyLabel: "GitHub Copilot, Cursor or another coding assistant",
    appNamePatterns: ["github\\s*copilot", "\\bcursor\\b", "\\bwindsurf\\b", "\\bcodeium\\b", "\\btabnine\\b"],
    merchantPatterns: ["github", "cursor", "anysphere", "windsurf", "codeium", "tabnine", "replit"],
    consumerPriceCents: 1000,
  },
  {
    key: "copilot_m365",
    name: "Microsoft Copilot",
    vendor: "Microsoft",
    category: "chat_assistant",
    surveyLabel: "Microsoft Copilot",
    appNamePatterns: ["microsoft\\s*copilot", "^(?!.*github)(?!.*cursor).*\\bcopilot\\b", "bing\\s*chat"],
    merchantPatterns: ["copilot\\s*pro", "microsoft\\s*copilot"],
    teamPlanKey: "m365_copilot",
    consumerPriceCents: 2000,
  },
  {
    key: "grammarly",
    name: "Grammarly",
    vendor: "Grammarly",
    category: "writing_assistant",
    surveyLabel: "Grammarly",
    appNamePatterns: ["grammarly"],
    publisherPatterns: ["grammarly"],
    merchantPatterns: ["grammarly"],
    consumerPriceCents: 1200,
  },
  {
    key: "meeting_notetaker",
    name: "AI meeting note-taker",
    vendor: "Otter, Fireflies, Fathom, Read.ai, tl;dv",
    category: "meeting_notes",
    surveyLabel: "An AI meeting note-taker (Otter, Fireflies, Fathom, Read.ai, tl;dv)",
    appNamePatterns: ["otter", "fireflies", "fathom", "read\\.?\\s?ai", "tl;?dv", "notetaker", "note\\s*taker", "avoma", "gong", "krisp"],
    merchantPatterns: ["otter\\.?ai", "fireflies", "fathom", "read\\.?ai", "tldv", "avoma", "krisp"],
    consumerPriceCents: 1700,
    caution:
      "Meeting bots record and transcribe calls, often including clients who never agreed to be recorded.",
  },
  {
    key: "perplexity",
    name: "Perplexity",
    vendor: "Perplexity AI",
    category: "search",
    surveyLabel: "Perplexity",
    appNamePatterns: ["perplexity"],
    publisherPatterns: ["perplexity"],
    merchantPatterns: ["perplexity"],
    consumerPriceCents: 2000,
  },
  {
    key: "image_generators",
    name: "Image or video generator",
    vendor: "Midjourney, DALL-E, Runway, Pika",
    category: "image_video",
    surveyLabel: "Midjourney, DALL-E or another image or video generator",
    appNamePatterns: ["midjourney", "\\bdall-?e\\b", "runway", "\\bpika\\b", "stability", "leonardo", "ideogram", "synthesia", "heygen", "descript"],
    merchantPatterns: ["midjourney", "runway", "pika", "stability\\s*ai", "leonardo", "ideogram", "synthesia", "heygen", "descript"],
    consumerPriceCents: 1000,
  },
  {
    key: "builtin_assistants",
    name: "AI inside everyday apps",
    vendor: "Notion, Canva, Zoom, Slack, Adobe",
    category: "productivity_ai",
    surveyLabel: "AI built into other apps (Notion AI, Canva, Zoom AI Companion, Slack AI)",
    appNamePatterns: ["notion\\s*ai", "canva", "zoom\\s*ai", "slack\\s*ai", "adobe\\s*firefly", "gamma", "beautiful\\.?ai", "\\bjasper\\b", "copy\\.?ai", "writesonic", "quillbot"],
    merchantPatterns: ["notion", "canva", "jasper", "copy\\.?ai", "writesonic", "quillbot", "gamma\\.app"],
    consumerPriceCents: 1000,
  },
  {
    key: "voice_audio",
    name: "Voice or audio AI",
    vendor: "ElevenLabs, Suno",
    category: "voice_audio",
    appNamePatterns: ["elevenlabs", "\\bsuno\\b", "\\budio\\b", "murf", "play\\.?ht"],
    merchantPatterns: ["elevenlabs", "\\bsuno\\b", "murf", "play\\.?ht"],
    consumerPriceCents: 1100,
  },
  {
    key: "deepseek",
    name: "DeepSeek",
    vendor: "DeepSeek",
    category: "chat_assistant",
    appNamePatterns: ["deepseek"],
    merchantPatterns: ["deepseek"],
    caution:
      "Several governments and companies restrict DeepSeek over data residency and retention concerns.",
  },
  {
    key: "other_ai",
    name: "Other AI tool",
    vendor: "Various",
    category: "other",
    surveyLabel: "Another AI tool not listed",
    appNamePatterns: ["\\bai\\b", "\\.ai\\b", "\\bgpt\\b", "\\bllm\\b", "assistant", "chatbot", "\\bbot\\b"],
    merchantPatterns: [],
  },
];

/** The option list for the "which tools" survey question. Last option is the safe sentinel. */
export const SURVEY_TOOL_OPTIONS: string[] = [
  ...AI_CATALOG.filter((c) => c.surveyLabel).map((c) => c.surveyLabel as string),
  "None of these",
];

export const SURVEY_TOOL_NONE = "None of these";

const byKey = new Map(AI_CATALOG.map((c) => [c.key, c]));
const bySurveyLabel = new Map(
  AI_CATALOG.filter((c) => c.surveyLabel).map((c) => [c.surveyLabel as string, c])
);

export function catalogByKey(key: string): CatalogEntry | undefined {
  return byKey.get(key);
}

export function catalogBySurveyLabel(label: string): CatalogEntry | undefined {
  return bySurveyLabel.get(label);
}

// Patterns are compiled once; matching runs over every uploaded expense row.
const compiledCache = new Map<string, RegExp>();
function compiled(source: string): RegExp {
  let re = compiledCache.get(source);
  if (!re) {
    re = new RegExp(source, "i");
    compiledCache.set(source, re);
  }
  return re;
}

function anyMatch(patterns: string[] | undefined, text: string): boolean {
  if (!patterns || !text) return false;
  return patterns.some((p) => compiled(p).test(text));
}

/**
 * Match a discovered app (name + publisher) to a catalog entry. Specific entries
 * win over the generic "other_ai" bucket, which only matches as a last resort.
 */
export function matchAppToCatalog(
  name: string,
  publisher?: string | null
): CatalogEntry | undefined {
  const specific = AI_CATALOG.filter((c) => c.key !== "other_ai");
  for (const entry of specific) {
    if (anyMatch(entry.appNamePatterns, name)) return entry;
    if (publisher && anyMatch(entry.publisherPatterns, publisher)) return entry;
  }
  const generic = byKey.get("other_ai");
  if (generic && anyMatch(generic.appNamePatterns, name)) return generic;
  return undefined;
}

/** Match a card-statement description to a catalog entry. */
export function matchMerchantToCatalog(description: string): CatalogEntry | undefined {
  for (const entry of AI_CATALOG) {
    if (entry.merchantPatterns.length && anyMatch(entry.merchantPatterns, description)) {
      return entry;
    }
  }
  return undefined;
}
