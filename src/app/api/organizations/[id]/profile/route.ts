import { requireUser } from "@/lib/api-auth";
import { apiError, notFound, ok } from "@/lib/api-response";
import { prisma } from "@/lib/db";
import { ownedOrganization } from "@/lib/ownership";
import { CompanyProfileSchema } from "@/lib/validation";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    if (!(await ownedOrganization(user.id, id))) return notFound();
    const profile = await prisma.companyProfile.findUnique({ where: { organizationId: id } });
    return ok(profile);
  } catch (error) {
    return apiError(error);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    if (!(await ownedOrganization(user.id, id))) return notFound();
    const body = CompanyProfileSchema.parse(await request.json().catch(() => null));
    const profile = await prisma.companyProfile.upsert({
      where: { organizationId: id },
      update: body,
      create: { ...body, organizationId: id },
    });
    return ok(profile);
  } catch (error) {
    return apiError(error);
  }
}
