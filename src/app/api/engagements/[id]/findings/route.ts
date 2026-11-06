import { requireUser } from "@/lib/api-auth";
import { apiError, notFound, ok } from "@/lib/api-response";
import { prisma } from "@/lib/db";
import { FindingCreateSchema } from "@/lib/findings-validation";
import { listFindings } from "@/lib/findings";
import { ragFromScore, riskScore } from "@/lib/scoring";

// Findings are scoped through engagement -> organization ownership.

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const engagement = await prisma.engagement.findFirst({
      where: { id, organization: { consultantId: user.id } },
      select: { id: true },
    });
    if (!engagement) return notFound();

    return ok(await listFindings(id));
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = FindingCreateSchema.parse(
      await request.json().catch(() => null)
    );

    const engagement = await prisma.engagement.findFirst({
      where: { id, organization: { consultantId: user.id } },
      select: { id: true },
    });
    if (!engagement) return notFound();

    // New manual findings sort to the end of the roadmap by default.
    const last = await prisma.riskFinding.aggregate({
      where: { engagementId: id },
      _max: { priorityRank: true },
    });

    const finding = await prisma.riskFinding.create({
      data: {
        ...body,
        engagementId: id,
        ragRating: ragFromScore(riskScore(body.likelihood, body.impact)),
        priorityRank: (last._max.priorityRank ?? 0) + 1,
        origin: "manual",
      },
    });
    return ok(finding, 201);
  } catch (error) {
    return apiError(error);
  }
}
