import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { auth } from "@/lib/auth";
import { STAGES, loadCompanyContext, type StageKey } from "@/lib/company-context";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Panel, SectionTitle, Stat, StatusPill, fmtDate } from "@/components/app/primitives";
import { BuildAuditButton } from "@/components/company/build-audit-button";

const STAGE_HINTS: Record<StageKey, string> = {
  overview: "",
  profile: "Office suite, data types, tools already provided. Five minutes with the owner.",
  scan: "Send the connect link to their Google or Microsoft admin, or run a demo scan.",
  survey: "Generate the anonymous link and send it to all staff. Thirteen plain questions.",
  expenses: "Upload a card or expense export. We keep only AI vendor totals.",
  inventory: "Built from the evidence above. Edit, approve or add tools by hand.",
  findings: "Scored automatically. Edit wording, reorder, add your own.",
  recommendation: "Which team AI plan fits, with reasons and dated prices.",
  documents: "Report, policy, executive readout and platform recommendation.",
  signoff: "Publish the policy and track who has read and signed it.",
  monitoring: "Daily re-scans, new-hire sign-offs, quarterly re-survey.",
  billing: "Per-employee quotes for the audit and for monitoring.",
};

export default async function CompanyOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { id } = await params;
  const ctx = await loadCompanyContext(session.user.id, id);
  if (!ctx) notFound();
  const { org, engagement, done, stats, history } = ctx;

  const latestScan = await prisma.scan.findFirst({
    where: { organizationId: org.id, status: "complete" },
    orderBy: { finishedAt: "desc" },
    select: { aiAppCount: true, appCount: true, userCount: true, finishedAt: true },
  });
  const expenseMonthly = await prisma.expenseMatch.aggregate({ where: { engagementId: engagement.id }, _sum: { monthlyCents: true } });

  const nextStage = STAGES.find((s) => s.key !== "overview" && !done[s.key]);
  const evidenceReady = done.survey || done.scan || done.expenses;

  return (
    <div className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Survey responses" value={stats.respondents} hint={stats.respondents ? `${stats.responses} answers captured` : "No responses yet"} tone={stats.respondents ? "good" : "default"} />
        <Stat label="AI apps connected" value={latestScan?.aiAppCount ?? "n/a"} hint={latestScan ? `of ${latestScan.appCount} apps across ${latestScan.userCount} accounts` : "No scan yet"} tone={latestScan?.aiAppCount ? "accent" : "default"} />
        <Stat label="AI spend found" value={expenseMonthly._sum.monthlyCents ? `$${Math.round(expenseMonthly._sum.monthlyCents / 100)}` : "n/a"} hint={expenseMonthly._sum.monthlyCents ? "per month on personal subscriptions" : "No expense scan yet"} />
        <Stat label="Findings" value={stats.findings} hint={stats.documents ? `${stats.documents} documents generated` : "Documents not generated"} tone={stats.findings ? "warn" : "default"} />
      </div>

      <Panel className="flex flex-wrap items-center justify-between gap-4 border-foreground/15 bg-secondary/40">
        <div>
          <p className="font-heading text-lg font-semibold">{nextStage ? `Next: ${nextStage.label}` : "Every stage has evidence"}</p>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            {nextStage ? STAGE_HINTS[nextStage.key] : "Re-run the build whenever evidence changes; manual edits are kept."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {nextStage && (
            <Button variant="outline" nativeButton={false} render={<Link href={`/app/companies/${org.id}/${nextStage.key}`} />}>
              Go to {nextStage.short} <ArrowRight />
            </Button>
          )}
          <BuildAuditButton engagementId={engagement.id} disabled={!evidenceReady} />
        </div>
      </Panel>

      <section className="space-y-3">
        <SectionTitle title="Audit checklist" description="Each stage adds evidence. Green means it has some." />
        <ol className="grid gap-2 sm:grid-cols-2">
          {STAGES.filter((s) => s.key !== "overview").map((s, i) => (
            <li key={s.key}>
              <Link
                href={`/app/companies/${org.id}/${s.key}`}
                className="group flex items-start gap-3 rounded-lg border border-border bg-card p-4 outline-none transition-colors hover:border-foreground/30 focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full font-mono text-[11px] tabular ${done[s.key] ? "bg-success text-success-foreground" : "border border-border text-muted-foreground"}`}>{i + 1}</span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{s.label}</span>
                  <span className="block text-xs leading-relaxed text-muted-foreground">{STAGE_HINTS[s.key]}</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      {history.length > 1 && (
        <section className="space-y-3">
          <SectionTitle title="Audit history" />
          <ul className="divide-y divide-border rounded-lg border border-border bg-card">
            {history.map((h) => (
              <li key={h.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <span>{h.kind === "resurvey" ? "Quarterly re-survey" : "Initial audit"} · started {fmtDate(h.startedAt)}</span>
                <span className="flex items-center gap-2">{h.id === engagement.id && <span className="text-xs text-muted-foreground">current</span>}<StatusPill status={h.status} /></span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
