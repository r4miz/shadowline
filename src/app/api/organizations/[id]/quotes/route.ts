import { requireUser } from "@/lib/api-auth";
import { apiError, notFound, ok } from "@/lib/api-response";
import { prisma } from "@/lib/db";
import { currentEngagement, ownedOrganization } from "@/lib/ownership";
import { createQuote, settingsFor, stripeConfigured } from "@/lib/quotes";
import { QuoteCreateSchema } from "@/lib/validation";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const org = await ownedOrganization(user.id, id);
    if (!org) return notFound();
    const [quotes, settings] = await Promise.all([
      prisma.quote.findMany({ where: { organizationId: id }, orderBy: { createdAt: "desc" } }),
      settingsFor(user.id),
    ]);
    return ok({ quotes, settings, stripeConfigured: stripeConfigured(), employeeCount: org.employeeCount, monitoringActive: org.monitoringActive });
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
    const org = await ownedOrganization(user.id, id);
    if (!org) return notFound();
    const body = QuoteCreateSchema.parse(await request.json().catch(() => null));
    const engagement = await currentEngagement(id);
    const quote = await createQuote({
      consultantId: user.id,
      organizationId: id,
      engagementId: engagement.id,
      kind: body.kind,
      employeeCount: body.employeeCount ?? org.employeeCount,
      notes: body.notes,
    });
    return ok(quote, 201);
  } catch (error) {
    return apiError(error);
  }
}
