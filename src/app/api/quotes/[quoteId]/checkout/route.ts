import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { apiError, notFound, ok } from "@/lib/api-response";
import { prisma } from "@/lib/db";
import { requestOrigin } from "@/lib/ownership";
import { createCheckoutSession, stripeConfigured } from "@/lib/quotes";

// Create a Stripe Checkout link for a quote. The operator sends it to the client.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ quoteId: string }> }
) {
  try {
    const user = await requireUser();
    const { quoteId } = await params;
    const quote = await prisma.quote.findFirst({ where: { id: quoteId, organization: { consultantId: user.id } } });
    if (!quote) return notFound();
    if (!stripeConfigured()) {
      return NextResponse.json({ success: false, error: "stripe_not_configured" }, { status: 400 });
    }
    if (quote.status === "paid" || quote.status === "void") {
      return NextResponse.json({ success: false, error: "quote_closed" }, { status: 400 });
    }
    const url = await createCheckoutSession(quote.id, requestOrigin(request));
    return ok({ url }, 201);
  } catch (error) {
    return apiError(error);
  }
}
