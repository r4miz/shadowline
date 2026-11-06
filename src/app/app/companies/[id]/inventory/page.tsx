import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { loadCompanyContext } from "@/lib/company-context";
import { PageHeader } from "@/components/app/primitives";
import { InventoryPanel } from "@/components/inventory/inventory-panel";

export const metadata = { title: "AI tool inventory" };

export default async function InventoryPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { id } = await params;
  const ctx = await loadCompanyContext(session.user.id, id);
  if (!ctx) notFound();
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Stage 5" title="AI tool inventory" description="Every AI tool in use at the company, where the evidence came from, and whether it is approved. Approval follows the tools listed in the company profile unless you change a row by hand." />
      <InventoryPanel engagementId={ctx.engagement.id} />
    </div>
  );
}
