import { requireUser } from "@/lib/api-auth";
import { apiError, notFound, ok } from "@/lib/api-response";
import { prisma } from "@/lib/db";
import { FindingUpdateSchema } from "@/lib/findings-validation";
import { ragFromScore, riskScore } from "@/lib/scoring";

// Findings are scoped through engagement -> organization ownership.

async function ownedFinding(
  consultantId: string,
  engagementId: string,
  findingId: string
) {
  const engagement = await prisma.engagement.findFirst({
    where: { id: engagementId, organization: { consultantId } },
    select: { id: true },
  });
  if (!engagement) return null;
  return prisma.riskFinding.findFirst({
    where: { id: findingId, engagementId },
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; findingId: string }> }
) {
  try {
    const user = await requireUser();
    const { id, findingId } = await params;
    const body = FindingUpdateSchema.parse(
      await request.json().catch(() => null)
    );

    const existing = await ownedFinding(user.id, id, findingId);
    if (!existing) return notFound();

    // Recompute ragRating whenever likelihood/impact change so colour always
    // matches the score. Editing a finding adopts it as `manual` so a later
    // regenerate won't discard the consultant's work.
    const likelihood = body.likelihood ?? existing.likelihood;
    const impact = body.impact ?? existing.impact;

    const finding = await prisma.riskFinding.update({
      where: { id: findingId },
      data: {
        ...body,
        ragRating: ragFromScore(riskScore(likelihood, impact)),
        origin: "manual",
      },
    });
    return ok(finding);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; findingId: string }> }
) {
  try {
    const user = await requireUser();
    const { id, findingId } = await params;

    const existing = await ownedFinding(user.id, id, findingId);
    if (!existing) return notFound();

    await prisma.riskFinding.delete({ where: { id: findingId } });
    return ok({ id: findingId });
  } catch (error) {
    return apiError(error);
  }
}
