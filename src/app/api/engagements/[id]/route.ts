import { requireUser } from "@/lib/api-auth";
import { apiError, notFound, ok } from "@/lib/api-response";
import { prisma } from "@/lib/db";
import { EngagementUpdateSchema } from "@/lib/validation";

// Engagements are scoped through organization ownership.

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const engagement = await prisma.engagement.findFirst({
      where: { id, organization: { consultantId: user.id } },
      include: { organization: true },
    });
    if (!engagement) return notFound();
    return ok(engagement);
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = EngagementUpdateSchema.parse(
      await request.json().catch(() => null)
    );

    const owned = await prisma.engagement.findFirst({
      where: { id, organization: { consultantId: user.id } },
      select: { id: true },
    });
    if (!owned) return notFound();

    const data: { status?: typeof body.status; completedAt?: Date | null } = {
      status: body.status,
    };
    if (body.completedAt !== undefined) {
      data.completedAt =
        body.completedAt === null ? null : new Date(body.completedAt);
    } else if (body.status === "complete") {
      data.completedAt = new Date();
    }

    const engagement = await prisma.engagement.update({
      where: { id },
      data,
    });
    return ok(engagement);
  } catch (error) {
    return apiError(error);
  }
}
