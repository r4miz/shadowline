/**
 * Quotes and billing helpers. Stripe is optional: when STRIPE_SECRET_KEY is
 * unset the operator marks quotes paid by hand after invoicing outside the app.
 */
import Stripe from "stripe";
import { prisma } from "@/lib/db";
import { DEFAULT_PRICING, formatCents, priceFor } from "@/lib/pricing";
import { brand } from "@/lib/brand";

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
}

let stripeClient: Stripe | null = null;
export function stripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("Stripe is not configured");
  stripeClient ??= new Stripe(process.env.STRIPE_SECRET_KEY);
  return stripeClient;
}

export async function settingsFor(consultantId: string) {
  const s = await prisma.operatorSettings.findUnique({ where: { consultantId } });
  return {
    auditPricePerEmployeeCents: s?.auditPricePerEmployeeCents ?? DEFAULT_PRICING.auditPricePerEmployeeCents,
    auditMinimumCents: s?.auditMinimumCents ?? DEFAULT_PRICING.auditMinimumCents,
    monitoringPricePerEmployeeCents: s?.monitoringPricePerEmployeeCents ?? DEFAULT_PRICING.monitoringPricePerEmployeeCents,
    monitoringMinimumCents: s?.monitoringMinimumCents ?? DEFAULT_PRICING.monitoringMinimumCents,
    businessName: s?.businessName ?? brand.name,
    replyToEmail: s?.replyToEmail ?? null,
  };
}

export async function createQuote(input: {
  consultantId: string;
  organizationId: string;
  engagementId: string | null;
  kind: "audit" | "monitoring";
  employeeCount: number;
  notes?: string | null;
}) {
  const s = await settingsFor(input.consultantId);
  const rule =
    input.kind === "audit"
      ? { unitCents: s.auditPricePerEmployeeCents, minimumCents: s.auditMinimumCents }
      : { unitCents: s.monitoringPricePerEmployeeCents, minimumCents: s.monitoringMinimumCents };
  const p = priceFor(input.employeeCount, rule);
  return prisma.quote.create({
    data: {
      organizationId: input.organizationId,
      engagementId: input.engagementId,
      kind: input.kind,
      employeeCount: p.employeeCount,
      unitCents: p.unitCents,
      subtotalCents: p.subtotalCents,
      minimumCents: p.minimumCents,
      totalCents: p.totalCents,
      notes: input.notes ?? null,
    },
  });
}

export function quoteMarkdown(q: {
  kind: "audit" | "monitoring";
  employeeCount: number;
  unitCents: number;
  subtotalCents: number;
  minimumCents: number;
  totalCents: number;
  createdAt: Date;
  notes: string | null;
}, companyName: string, businessName: string): string {
  const label = q.kind === "audit" ? "Shadow AI Audit (one-time)" : "AI Monitoring (monthly)";
  const per = q.kind === "audit" ? "per employee" : "per employee per month";
  const minimumApplied = q.subtotalCents < q.minimumCents;
  const lines = [
    `# Quote: ${label}`,
    "",
    `**Prepared for:** ${companyName}`,
    `**Prepared by:** ${businessName}`,
    `**Date:** ${q.createdAt.toISOString().slice(0, 10)}`,
    "",
    "| Item | Quantity | Unit price | Amount |",
    "| --- | --- | --- | --- |",
    `| ${label} | ${q.employeeCount} employees | ${formatCents(q.unitCents)} ${per} | ${formatCents(q.subtotalCents)} |`,
    ...(minimumApplied ? [`| Minimum engagement fee | | | ${formatCents(q.minimumCents)} |`] : []),
    "",
    `**Total${q.kind === "monitoring" ? " per month" : ""}: ${formatCents(q.totalCents)}**`,
    "",
  ];
  if (q.kind === "audit") {
    lines.push(
      "## What is included",
      "",
      "- Workspace scan of apps connected to company Google Workspace or Microsoft 365 accounts",
      "- Expense scan for AI subscriptions on company cards",
      "- Anonymous employee survey on real AI usage",
      "- AI tool inventory with risk scoring",
      "- AI Risk Report, Acceptable Use Policy, Executive Readout and AI Platform Recommendation",
      "- Policy sign-off tracking for all staff",
      ""
    );
  } else {
    lines.push(
      "## What is included",
      "",
      "- Daily re-scan of connected workspaces with alerts for new AI apps",
      "- Automatic policy sign-off requests for new hires",
      "- Quarterly anonymous re-survey and refreshed report",
      "- Updated AI platform recommendation when vendor plans or prices change",
      ""
    );
  }
  if (q.notes) lines.push("## Notes", "", q.notes, "");
  lines.push("---", "", "_Valid for 30 days from the date above. Prices in USD._");
  return lines.join("\n");
}

export async function createCheckoutSession(quoteId: string, origin: string) {
  const q = await prisma.quote.findUniqueOrThrow({ where: { id: quoteId }, include: { organization: true } });
  const client = stripe();
  const productName = q.kind === "audit" ? `Shadow AI Audit for ${q.organization.name}` : `AI Monitoring for ${q.organization.name}`;
  const session = await client.checkout.sessions.create({
    mode: q.kind === "audit" ? "payment" : "subscription",
    customer_email: q.organization.contactEmail ?? undefined,
    client_reference_id: q.id,
    metadata: { quoteId: q.id, organizationId: q.organizationId, kind: q.kind },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: q.totalCents,
          product_data: { name: productName, description: `${q.employeeCount} employees` },
          ...(q.kind === "monitoring" ? { recurring: { interval: "month" as const } } : {}),
        },
      },
    ],
    success_url: `${origin}/pay/done?status=paid`,
    cancel_url: `${origin}/pay/done?status=cancelled`,
  });
  await prisma.quote.update({ where: { id: q.id }, data: { stripeSessionId: session.id, status: "sent" } });
  return session.url;
}

export async function markQuotePaid(quoteId: string, paymentRef: string | null) {
  const q = await prisma.quote.update({
    where: { id: quoteId },
    data: { status: "paid", paidAt: new Date(), stripePaymentId: paymentRef },
  });
  if (q.kind === "monitoring") {
    await activateMonitoring(q.organizationId);
  }
  return q;
}

export async function activateMonitoring(organizationId: string, subscriptionId?: string | null) {
  const now = new Date();
  const next = new Date(now);
  next.setUTCDate(next.getUTCDate() + 90);
  return prisma.organization.update({
    where: { id: organizationId },
    data: {
      monitoringActive: true,
      monitoringSince: now,
      nextResurveyAt: next,
      ...(subscriptionId ? { stripeSubscriptionId: subscriptionId } : {}),
    },
  });
}

export async function deactivateMonitoring(organizationId: string) {
  return prisma.organization.update({
    where: { id: organizationId },
    data: { monitoringActive: false, stripeSubscriptionId: null },
  });
}
