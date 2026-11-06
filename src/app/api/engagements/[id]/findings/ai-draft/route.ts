import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/lib/api-auth";
import { apiError, notFound, ok } from "@/lib/api-response";
import { prisma } from "@/lib/db";
import { aiDraftingEnabled, draftRecommendation } from "@/lib/ai-draft";
import { enforceRateLimit } from "@/lib/rate-limit";
import { NIST_FUNCTIONS } from "@/lib/question-bank";

const BodySchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  ragRating: z.enum(["red", "amber", "green"]),
  nistFunction: z.enum(NIST_FUNCTIONS),
  owaspRefs: z.array(z.string().regex(/^LLM(0[1-9]|10)$/)).max(10).default([]),
});

// Optional, clearly-labeled AI drafting of a finding recommendation. Scoring is
// untouched, only the recommendation prose is generated. RBAC-scoped.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const engagement = await prisma.engagement.findFirst({
      where: { id, organization: { consultantId: user.id } },
      select: { id: true, organization: { select: { name: true } } },
    });
    if (!engagement) return notFound();

    if (!aiDraftingEnabled()) {
      return NextResponse.json(
        {
          success: false,
          error: "ai_not_configured",
          message:
            "AI-assisted drafting is not configured. Set ANTHROPIC_API_KEY to enable it.",
        },
        { status: 503 }
      );
    }

    // Rate-limit the paid model call (after RBAC so non-owners still get 404).
    const limited = enforceRateLimit(request, "ai-draft", 20, 60 * 1000);
    if (limited) return limited;

    const body = BodySchema.parse(await request.json().catch(() => null));
    const recommendation = await draftRecommendation({
      ...body,
      organizationName: engagement.organization.name,
    });

    return ok({ recommendation });
  } catch (error) {
    return apiError(error);
  }
}
