import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { loadCompanyContext } from "@/lib/company-context";
import { PageHeader } from "@/components/app/primitives";
import { BillingPanel } from "@/components/company/billing-panel";

export const metadata = { title: "Quotes and billing" };

export default async function BillingPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ paid?: string; cancelled?: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { id } = await params;
  const sp = await searchParams;
  const ctx = await loadCompanyContext(session.user.id, id);
  if (!ctx) notFound();
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Stage 11" title="Quotes and billing" description="Per-employee pricing from your settings. Create a quote, send the document or a Stripe checkout link, and mark it paid. A paid monitoring quote turns monitoring on." />
      <BillingPanel organizationId={ctx.org.id} flash={sp.paid ? "paid" : sp.cancelled ? "cancelled" : null} />
    </div>
  );
}
