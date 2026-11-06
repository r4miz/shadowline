import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/db";
import { activateMonitoring, deactivateMonitoring, markQuotePaid, stripe, stripeConfigured } from "@/lib/quotes";

// Stripe webhook. The raw body is verified against STRIPE_WEBHOOK_SECRET
// before anything is trusted. Unknown events are acknowledged and ignored.
export async function POST(request: Request) {
  if (!stripeConfigured()) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "missing_signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    const raw = await request.text();
    event = stripe().webhooks.constructEvent(raw, signature, process.env.STRIPE_WEBHOOK_SECRET as string);
  } catch {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object;
        // Delayed payment methods complete the session before money moves.
        if (session.payment_status !== "paid") break;
        const quoteId = session.metadata?.quoteId ?? session.client_reference_id;
        if (!quoteId) break;
        const quote = await prisma.quote.findUnique({ where: { id: quoteId } });
        if (!quote || quote.status === "paid") break;
        if (session.amount_total !== null && session.amount_total !== quote.totalCents) {
          console.error("[stripe] amount mismatch", { quoteId, expected: quote.totalCents, got: session.amount_total });
          break;
        }
        const paymentRef = typeof session.payment_intent === "string" ? session.payment_intent : typeof session.subscription === "string" ? session.subscription : session.id;
        await markQuotePaid(quote.id, paymentRef);
        if (quote.kind === "monitoring" && typeof session.subscription === "string") {
          await activateMonitoring(quote.organizationId, session.subscription);
        }
        if (typeof session.customer === "string") {
          await prisma.organization.update({ where: { id: quote.organizationId }, data: { stripeCustomerId: session.customer } });
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const org = await prisma.organization.findFirst({ where: { stripeSubscriptionId: sub.id } });
        if (org) await deactivateMonitoring(org.id);
        break;
      }
      default:
        break;
    }
  } catch (error) {
    console.error("[stripe] handler failed:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "handler_failed" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
