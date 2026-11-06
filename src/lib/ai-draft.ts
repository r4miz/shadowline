/**
 * OPTIONAL, clearly-labeled AI assist (spec §8: "'Draft with AI' is a Phase 5
 * add-on, clearly labeled"). It drafts *recommendation prose only*, scoring,
 * RAG ratings, and framework mappings stay fully deterministic. Gated on
 * ANTHROPIC_API_KEY; when unset the feature reports itself unavailable and the
 * rest of the app is unaffected.
 */
import Anthropic from "@anthropic-ai/sdk";

export function aiDraftingEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export interface DraftContext {
  title: string;
  description: string;
  ragRating: "red" | "amber" | "green";
  nistFunction: string;
  owaspRefs: string[];
  organizationName?: string | null;
}

const SYSTEM = `You are assisting an AI governance specialist who is writing a Shadow AI risk assessment for a small business. Never use em dashes. Given one risk finding, draft a single remediation RECOMMENDATION.

Rules:
- Output 2 to 4 sentences of plain prose. No preamble, no headings, no markdown, no bullet list, just the recommendation text.
- Be concrete and actionable: name the control or policy to put in place and who should own it.
- Match the urgency to the rating (red = act now, amber = plan soon).
- Do NOT invent regulation names, control numbers, statistics, product names, or legal citations. Speak in terms of practices and policies, not specific named standards.
- This is advisory drafting that the consultant will review and edit; do not claim it is legal advice.`;

export async function draftRecommendation(ctx: DraftContext): Promise<string> {
  const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env

  const userText = [
    ctx.organizationName ? `Client: ${ctx.organizationName}` : null,
    `Finding: ${ctx.title}`,
    `Details: ${ctx.description}`,
    `Risk rating: ${ctx.ragRating}`,
    `NIST AI RMF function: ${ctx.nistFunction}`,
    ctx.owaspRefs.length
      ? `OWASP LLM references: ${ctx.owaspRefs.join(", ")}`
      : null,
    "",
    "Draft the remediation recommendation.",
  ]
    .filter(Boolean)
    .join("\n");

  const response = await client.messages.create({
    model: "claude-sonnet-5-5",
    max_tokens: 2048,
    thinking: { type: "adaptive" },
    output_config: { effort: "low" },
    system: SYSTEM,
    messages: [{ role: "user", content: userText }],
  });

  if (response.stop_reason === "refusal") {
    throw new Error("The model declined to draft this recommendation.");
  }

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  if (!text) throw new Error("The model returned an empty recommendation.");
  return text;
}
