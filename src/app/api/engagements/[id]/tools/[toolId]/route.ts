import { requireUser } from "@/lib/api-auth";
import { apiError, notFound, ok } from "@/lib/api-response";
import { prisma } from "@/lib/db";
import { AIToolUpdateSchema } from "@/lib/inventory-validation";

// AI tool inventory is scoped through engagement -> organization ownership.

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; toolId: string }> }
) {
  try {
    const user = await requireUser();
    const { id, toolId } = await params;
    const body = AIToolUpdateSchema.parse(
      await request.json().catch(() => null)
    );

    const engagement = await prisma.engagement.findFirst({
      where: { id, organization: { consultantId: user.id } },
      select: { id: true },
    });
    if (!engagement) return notFound();

    const existing = await prisma.aITool.findFirst({
      where: { id: toolId, engagementId: id },
      select: { id: true },
    });
    if (!existing) return notFound();

    const tool = await prisma.aITool.update({
      where: { id: toolId },
      data: body,
    });
    return ok(tool);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; toolId: string }> }
) {
  try {
    const user = await requireUser();
    const { id, toolId } = await params;

    const engagement = await prisma.engagement.findFirst({
      where: { id, organization: { consultantId: user.id } },
      select: { id: true },
    });
    if (!engagement) return notFound();

    const existing = await prisma.aITool.findFirst({
      where: { id: toolId, engagementId: id },
      select: { id: true },
    });
    if (!existing) return notFound();

    await prisma.aITool.delete({ where: { id: toolId } });
    return ok({ id: toolId });
  } catch (error) {
    return apiError(error);
  }
}
