import { requireUser } from "@/lib/api-auth";
import { apiError, notFound, ok } from "@/lib/api-response";
import { prisma } from "@/lib/db";
import { FindingReorderSchema } from "@/lib/findings-validation";
import { listFindings } from "@/lib/findings";

// Reorder the remediation roadmap: the posted id order becomes priorityRank
// 1..n. Only ids belonging to this engagement are updated.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const { order } = FindingReorderSchema.parse(
      await request.json().catch(() => null)
    );

    const engagement = await prisma.engagement.findFirst({
      where: { id, organization: { consultantId: user.id } },
      select: { id: true },
    });
    if (!engagement) return notFound();

    const owned = await prisma.riskFinding.findMany({
      where: { engagementId: id },
      select: { id: true },
    });
    const ownedIds = new Set(owned.map((f) => f.id));
    if (!order.every((fid) => ownedIds.has(fid))) return notFound();

    await prisma.$transaction(
      order.map((fid, i) =>
        prisma.riskFinding.update({
          where: { id: fid },
          data: { priorityRank: i + 1 },
        })
      )
    );

    return ok(await listFindings(id));
  } catch (error) {
    return apiError(error);
  }
}
