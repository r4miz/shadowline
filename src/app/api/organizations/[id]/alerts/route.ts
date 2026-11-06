import { z } from "zod";
import { requireUser } from "@/lib/api-auth";
import { apiError, notFound, ok } from "@/lib/api-response";
import { prisma } from "@/lib/db";
import { ownedOrganization } from "@/lib/ownership";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    if (!(await ownedOrganization(user.id, id))) return notFound();
    const includeResolved = new URL(request.url).searchParams.get("all") === "1";
    const alerts = await prisma.alert.findMany({
      where: { organizationId: id, ...(includeResolved ? {} : { resolvedAt: null }) },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return ok(alerts);
  } catch (error) {
    return apiError(error);
  }
}

const ResolveSchema = z.object({ alertId: z.string().min(1), resolved: z.boolean().default(true) });

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    if (!(await ownedOrganization(user.id, id))) return notFound();
    const body = ResolveSchema.parse(await request.json().catch(() => null));
    const { count } = await prisma.alert.updateMany({
      where: { id: body.alertId, organizationId: id },
      data: { resolvedAt: body.resolved ? new Date() : null },
    });
    if (count === 0) return notFound();
    return ok({ updated: true });
  } catch (error) {
    return apiError(error);
  }
}
