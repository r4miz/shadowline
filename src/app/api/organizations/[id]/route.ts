import { requireUser } from "@/lib/api-auth";
import { apiError, notFound, ok } from "@/lib/api-response";
import { prisma } from "@/lib/db";
import { OrganizationUpdateSchema } from "@/lib/validation";

// All queries scope by consultantId; a non-owned org returns 404 (never 403)
// so existence of other consultants' clients is not leaked.

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const organization = await prisma.organization.findFirst({
      where: { id, consultantId: user.id },
      include: { engagements: { orderBy: { startedAt: "desc" } } },
    });
    if (!organization) return notFound();
    return ok(organization);
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
    const body = OrganizationUpdateSchema.parse(
      await request.json().catch(() => null)
    );
    const { count } = await prisma.organization.updateMany({
      where: { id, consultantId: user.id },
      data: { ...body, ...(body.contactEmail !== undefined ? { contactEmail: body.contactEmail || null } : {}) },
    });
    if (count === 0) return notFound();
    const organization = await prisma.organization.findUnique({ where: { id } });
    return ok(organization);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const { count } = await prisma.organization.deleteMany({
      where: { id, consultantId: user.id },
    });
    if (count === 0) return notFound();
    return ok({ deleted: true });
  } catch (error) {
    return apiError(error);
  }
}
