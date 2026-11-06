import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { loadCompanyContext } from "@/lib/company-context";
import { PageHeader } from "@/components/app/primitives";
import { MonitoringPanel } from "@/components/company/monitoring-panel";

export const metadata = { title: "Monitoring" };

export default async function MonitoringPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { id } = await params;
  const ctx = await loadCompanyContext(session.user.id, id);
  if (!ctx) notFound();
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Stage 10" title="Monitoring" description="The monthly subscription. Every day we re-scan connected workspaces, alert on new AI apps, queue a policy sign-off for new hires, and every 90 days open a fresh re-survey." />
      <MonitoringPanel organizationId={ctx.org.id} />
    </div>
  );
}
