import { requireUser } from "@/lib/api-auth";
import { apiError, notFound, ok } from "@/lib/api-response";
import { prisma } from "@/lib/db";
import { markQuotePaid } from "@/lib/quotes";
import { QuoteUpdateSchema } from "@/lib/validation";

async function ownedQuote(userId: string, quoteId: string) {
  return prisma.quote.findFirst({
    where: { id: quoteId, organization: { consultantId: userId } },
    include: { organization: { select: { name: true } } },
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ quoteId: string }> }
) {
  try {
    const user = await requireUser();
    const { quoteId } = await params;
    const quote = await ownedQuote(user.id, quoteId);
    if (!quote) return notFound();
    const { status } = QuoteUpdateSchema.parse(await request.json().catch(() => null));
    if (status === "paid") return ok(await markQuotePaid(quote.id, "manual"));
    return ok(await prisma.quote.update({ where: { id: quote.id }, data: { status } }));
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ quoteId: string }> }
) {
  try {
    const user = await requireUser();
    const { quoteId } = await params;
    const quote = await ownedQuote(user.id, quoteId);
    if (!quote) return notFound();
    if (quote.status === "paid") return ok(await prisma.quote.update({ where: { id: quote.id }, data: { status: "void" } }));
    await prisma.quote.delete({ where: { id: quote.id } });
    return ok({ deleted: true });
  } catch (error) {
    return apiError(error);
  }
}
