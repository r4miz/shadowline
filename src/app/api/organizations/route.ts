import { requireUser } from "@/lib/api-auth";
import { apiError, ok } from "@/lib/api-response";
import { prisma } from "@/lib/db";
import { OrganizationCreateSchema } from "@/lib/validation";

export async function GET() {
  try {
    const user = await requireUser();
    const organizations = await prisma.organization.findMany({
      where: { consultantId: user.id },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { engagements: true } } },
    });
    return ok(organizations);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = OrganizationCreateSchema.parse(
      await request.json().catch(() => null)
    );
    const organization = await prisma.organization.create({
      data: {
        ...body,
        contactEmail: body.contactEmail || null,
        consultantId: user.id,
        engagements: { create: {} },
      },
      include: { engagements: true },
    });
    return ok(organization, 201);
  } catch (error) {
    return apiError(error);
  }
}
