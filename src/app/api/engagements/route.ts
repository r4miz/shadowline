import { requireUser } from "@/lib/api-auth";
import { apiError, notFound, ok } from "@/lib/api-response";
import { prisma } from "@/lib/db";
import { EngagementCreateSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const { organizationId } = EngagementCreateSchema.parse(
      await request.json().catch(() => null)
    );

    const organization = await prisma.organization.findFirst({
      where: { id: organizationId, consultantId: user.id },
      select: { id: true },
    });
    if (!organization) return notFound();

    const engagement = await prisma.engagement.create({
      data: { organizationId },
    });
    return ok(engagement, 201);
  } catch (error) {
    return apiError(error);
  }
}
