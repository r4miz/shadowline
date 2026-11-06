import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Bell, Building2, Plus } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatCents } from "@/lib/pricing";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader, Pill, Stat, StatusPill, fmtDate } from "@/components/app/primitives";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const [orgs, alerts, paid] = await Promise.all([
    prisma.organization.findMany({
      where: { consultantId: userId },
      orderBy: { createdAt: "desc" },
      include: {
        engagements: {
          orderBy: { startedAt: "desc" },
          take: 1,
          include: { _count: { select: { responses: true, riskFindings: true, documents: true, acknowledgements: true } } },
        },
        _count: { select: { alerts: { where: { resolvedAt: null } }, scans: { where: { status: "complete" } } } },
      },
    }),
    prisma.alert.findMany({
      where: { organization: { consultantId: userId }, resolvedAt: null },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { organization: { select: { id: true, name: true } } },
    }),
    prisma.quote.aggregate({ where: { organization: { consultantId: userId }, status: "paid" }, _sum: { totalCents: true }, _count: true }),
  ]);

  const monitored = orgs.filter((o) => o.monitoringActive).length;
  const inReview = orgs.filter((o) => o.engagements[0]?.status === "review").length;
  const employees = orgs.reduce((n, o) => n + o.employeeCount, 0);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Workshop"
        title="Dashboard"
        description="Every company you are auditing, what stage it is at, and anything that needs your attention."
        actions={
          <Button nativeButton={false} render={<Link href="/app/companies/new" />}>
            <Plus /> New company
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Companies" value={orgs.length} hint={`${employees.toLocaleString()} employees covered`} />
        <Stat label="In review" value={inReview} hint="Audits with documents generated" tone={inReview ? "accent" : "default"} />
        <Stat label="Monitored" value={monitored} hint="Active monthly subscriptions" tone={monitored ? "good" : "default"} />
        <Stat label="Collected" value={formatCents(paid._sum.totalCents ?? 0)} hint={`${paid._count} paid quote${paid._count === 1 ? "" : "s"}`} />
      </div>

      {orgs.length === 0 ? (
        <EmptyState
          icon={<Building2 className="size-8" />}
          title="Add your first company"
          body="A company is the client you are auditing. You will fill in a short profile with the owner, then run the scan, the survey and the expense check from one place."
          action={
            <Button nativeButton={false} render={<Link href="/app/companies/new" />}>
              <Plus /> New company
            </Button>
          }
        />
      ) : (
        <section className="space-y-3">
          <h2 className="font-heading text-lg font-semibold tracking-tight">Companies</h2>
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 text-left font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Company</th>
                  <th className="px-4 py-2.5 font-medium">Stage</th>
                  <th className="hidden px-4 py-2.5 font-medium md:table-cell">Evidence</th>
                  <th className="hidden px-4 py-2.5 font-medium lg:table-cell">Started</th>
                  <th className="px-4 py-2.5 text-right font-medium">Alerts</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orgs.map((o) => {
                  const e = o.engagements[0];
                  return (
                    <tr key={o.id} className="group hover:bg-secondary/40">
                      <td className="px-4 py-3">
                        <Link href={`/app/companies/${o.id}`} className="font-medium underline-offset-4 group-hover:underline">{o.name}</Link>
                        <p className="text-xs text-muted-foreground">{o.industry} · {o.employeeCount} employees</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <StatusPill status={e?.status ?? "draft"} />
                          {o.monitoringActive && <Pill tone="good">Monitored</Pill>}
                        </div>
                      </td>
                      <td className="hidden px-4 py-3 text-xs text-muted-foreground md:table-cell tabular">
                        {o._count.scans} scan{o._count.scans === 1 ? "" : "s"} · {e?._count.responses ?? 0} answers · {e?._count.riskFindings ?? 0} findings · {e?._count.documents ?? 0} docs
                      </td>
                      <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">{fmtDate(e?.startedAt ?? o.createdAt)}</td>
                      <td className="px-4 py-3 text-right tabular">
                        {o._count.alerts > 0 ? <Pill tone="accent">{o._count.alerts}</Pill> : <span className="text-muted-foreground">0</span>}
                      </td>
                      <td className="px-2 py-3 text-right">
                        <Button variant="ghost" size="icon-sm" nativeButton={false} render={<Link href={`/app/companies/${o.id}`} aria-label={`Open ${o.name}`} />}>
                          <ArrowRight />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {alerts.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 font-heading text-lg font-semibold tracking-tight"><Bell className="size-4 text-brand-accent" /> Needs attention</h2>
          <ul className="divide-y divide-border rounded-lg border border-border bg-card">
            {alerts.map((a) => (
              <li key={a.id} className="flex flex-wrap items-start justify-between gap-2 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{a.title}</p>
                  <p className="text-xs text-muted-foreground">{a.organization.name} · {fmtDate(a.createdAt)}</p>
                </div>
                <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`/app/companies/${a.organization.id}/monitoring`} />}>Review</Button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
