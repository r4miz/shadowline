/**
 * Classify a third-party app discovered in a client's workspace: is it AI, how
 * confident are we, and how risky is the access it was granted. Pure.
 */
import { matchAppToCatalog, type CatalogEntry, type ToolCategory } from "@/lib/ai-catalog";

export type AiConfidence = "high" | "medium" | "low" | "none";
export type RiskLevel = "high" | "medium" | "low";

export interface RawDiscoveredApp {
  externalId: string;
  name: string;
  publisher?: string | null;
  scopes: string[];
  users: string[];
  /** Provider says this is a first-party app (e.g. Microsoft's own). */
  firstParty?: boolean;
}

export interface ClassifiedApp extends RawDiscoveredApp {
  isAi: boolean;
  aiConfidence: AiConfidence;
  catalogKey: string | null;
  category: ToolCategory | null;
  riskLevel: RiskLevel;
  riskNotes: string[];
}

// Scope fragments that mean the app can read or act on sensitive company data.
const HIGH_SCOPES = [/(?<!e)mail/i, /gmail/i, /drive(?!\.file)/i, /files\.read\.all/i, /files\.readwrite/i, /sites\./i, /contacts/i, /directory/i, /admin/i, /user\.read\.all/i, /chat\./i, /channelmessage/i, /onlinemeeting/i, /calls\./i];
const MEDIUM_SCOPES = [/calendar/i, /drive\.file/i, /files\.read(?!write)(?!\.all)/i, /presence/i, /tasks/i];
const WRITE_HINT = [/write/i, /send/i, /modify/i, /compose/i, /manage/i];

export function scopeRisk(scopes: string[]): { level: RiskLevel; notes: string[] } {
  const notes: string[] = [];
  let level: RiskLevel = "low";
  const joined = scopes.join(" ");
  if (HIGH_SCOPES.some((p) => p.test(joined))) {
    level = "high";
    if (/(?<!e)mail|gmail/i.test(joined)) notes.push("Can read company email");
    if (/drive|files|sites/i.test(joined)) notes.push("Can read company files");
    if (/contacts|directory|user\.read\.all/i.test(joined)) notes.push("Can read the company directory or contacts");
    if (/chat\.|channelmessage|onlinemeeting|calls\./i.test(joined)) notes.push("Can access meetings or chat messages");
  } else if (MEDIUM_SCOPES.some((p) => p.test(joined))) {
    level = "medium";
    if (/calendar/i.test(joined)) notes.push("Can read calendars");
    if (/drive\.file|files\.read/i.test(joined)) notes.push("Can read files it is given");
  }
  if (WRITE_HINT.some((p) => p.test(joined))) notes.push("Has write access, not just read");
  return { level, notes };
}

export function classifyApp(app: RawDiscoveredApp): ClassifiedApp {
  const entry: CatalogEntry | undefined = app.firstParty
    ? undefined
    : matchAppToCatalog(app.name, app.publisher);

  let aiConfidence: AiConfidence = "none";
  if (entry) {
    aiConfidence = entry.key === "other_ai" ? "low" : "high";
    if (entry.key !== "other_ai" && app.publisher && entry.publisherPatterns?.some((p) => new RegExp(p, "i").test(app.publisher ?? ""))) {
      aiConfidence = "high";
    } else if (entry.key !== "other_ai") {
      aiConfidence = "medium";
    }
  }
  const isAi = aiConfidence !== "none";
  const { level, notes } = scopeRisk(app.scopes);

  // An AI app with broad access is the headline risk; a non-AI app keeps its
  // scope-based level so the owner still sees it in the full list.
  let riskLevel: RiskLevel = level;
  if (isAi && level === "medium" && app.users.length >= 3) riskLevel = "high";
  if (isAi && entry?.caution) notes.push(entry.caution);

  return {
    ...app,
    isAi,
    aiConfidence,
    catalogKey: entry?.key ?? null,
    category: entry?.category ?? null,
    riskLevel,
    riskNotes: notes,
  };
}

export function classifyAll(apps: RawDiscoveredApp[]): ClassifiedApp[] {
  return apps.map(classifyApp);
}
