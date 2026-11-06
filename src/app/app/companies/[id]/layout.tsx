import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { STAGES, loadCompanyContext } from "@/lib/company-context";
import { SUITE_LABEL } from "@/lib/documents/shared";
import { Pill, StatusPill } from "@/components/app/primitives";
import { StageRail } from "@/components/company/stage-rail";
import { EngagementStatusControl } from "@/components/engagement/status-control";

export default async function CompanyLayout({
  params,
  children,
}: {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { id } = await params;
  const ctx = await loadCompanyContext(session.user.id, id);
  if (!ctx) notFound();

  const { org, engagement, done, stats } = ctx;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="mb-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            <Link href="/app" className="hover:text-foreground">Companies</Link> / {engagement.kind === "resurvey" ? "Quarterly re-survey" : "Audit"}
          </p>
          <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">{org.name}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {org.industry} · {org.employeeCount.toLocaleString()} employees · {SUITE_LABEL[org.profile?.suite ?? "unknown"]}
            {org.contactName ? ` · ${org.contactName}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {org.monitoringActive && <Pill tone="good">Monitored</Pill>}
          {stats.openAlerts > 0 && <Pill tone="accent">{stats.openAlerts} alert{stats.openAlerts === 1 ? "" : "s"}</Pill>}
          <StatusPill status={engagement.status} />
          <EngagementStatusControl engagementId={engagement.id} status={engagement.status} />
        </div>
      </div>

      <StageRail companyId={org.id} stages={STAGES.map((s) => ({ key: s.key, short: s.short, done: done[s.key] }))} />

      <div>{children}</div>
    </div>
  );
}
