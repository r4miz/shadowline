"use client";

import { useEffect, useState } from "react";
import { EmptyState, InlineError, InlineNote, Panel, SectionTitle, Stat } from "@/components/app/primitives";
import { catalogByKey } from "@/lib/ai-catalog";
import type { SurveyAggregates } from "@/lib/inventory/derive";

type Summary = SurveyAggregates & { commentsWithheld: boolean };

function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}

export function SurveySummary({ engagementId, employeeCount }: { engagementId: string; employeeCount: number }) {
  const [data, setData] = useState<Summary | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/engagements/${engagementId}/survey-summary`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (!json.success) throw new Error();
        setData(json.data);
        setState("ready");
      })
      .catch(() => !cancelled && setState("error"));
    return () => {
      cancelled = true;
    };
  }, [engagementId]);

  if (state === "loading") return <p className="text-sm text-muted-foreground">Loading survey results</p>;
  if (state === "error" || !data) return <InlineError>Could not load survey results.</InlineError>;

  if (data.respondentCount === 0) {
    return (
      <EmptyState
        title="No responses yet"
        body="Generate the survey link above and send it to every employee. Results appear here as totals the moment the first person submits. Aim for at least 60% of staff for a representative picture."
      />
    );
  }

  const usage = Object.entries(data.toolUsage).sort((a, b) => b[1] - a[1]);
  const coverage = Math.min(1, data.respondentCount / Math.max(1, employeeCount));
  const bars: Array<{ label: string; share: number; tone: string }> = [
    { label: "Use AI for work", share: data.aiUsers / data.respondentCount, tone: "bg-foreground" },
    { label: "Sign in with personal accounts", share: data.personalAccountShare, tone: "bg-brand-accent" },
    { label: "Have entered sensitive data", share: data.sensitiveDataShare, tone: "bg-destructive" },
    { label: "Entered regulated data", share: data.regulatedDataShare, tone: "bg-destructive" },
    { label: "Connected AI to email, calendar or files", share: data.connectedShare, tone: "bg-warning" },
    { label: "Use AI extensions or meeting bots", share: data.extensionShare, tone: "bg-warning" },
    { label: "Never told the rules", share: data.noGuidanceShare, tone: "bg-brand-accent" },
    { label: "Pay for AI themselves", share: data.payingPersonallyShare, tone: "bg-chart-3" },
    { label: "Would use an approved tool", share: data.adoptionAppetite, tone: "bg-success" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Responses" value={data.respondentCount} hint={`${pct(coverage)} of ${employeeCount} employees`} tone={coverage >= 0.6 ? "good" : "warn"} />
        <Stat label="Use AI at work" value={pct(data.aiUsers / data.respondentCount)} hint={`${data.dailyUsers} every day`} />
        <Stat label="Personal accounts" value={pct(data.personalAccountShare)} hint="Company cannot see or shut these off" tone={data.personalAccountShare >= 0.3 ? "accent" : "default"} />
        <Stat label="Sensitive data entered" value={pct(data.sensitiveDataShare)} hint={`${pct(data.regulatedDataShare)} regulated`} tone={data.sensitiveDataShare > 0 ? "bad" : "good"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel className="space-y-4">
          <SectionTitle title="What staff told us" description="Share of respondents." />
          <ul className="space-y-3">
            {bars.map((b) => (
              <li key={b.label}>
                <div className="flex items-baseline justify-between text-sm">
                  <span>{b.label}</span>
                  <span className="font-mono text-xs tabular text-muted-foreground">{pct(b.share)}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary" role="img" aria-label={`${b.label}: ${pct(b.share)}`}>
                  <div className={`h-full rounded-full ${b.tone} transition-[width] duration-500`} style={{ width: `${Math.max(2, b.share * 100)}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </Panel>

        <div className="space-y-6">
          <Panel className="space-y-4">
            <SectionTitle title="Tools in use" description="Reported by staff. Feeds the inventory." />
            {usage.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tools reported yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {usage.map(([key, n]) => (
                  <li key={key} className="flex items-center justify-between py-2 text-sm">
                    <span>{catalogByKey(key)?.name ?? key}<span className="ml-2 text-xs text-muted-foreground">{catalogByKey(key)?.vendor}</span></span>
                    <span className="font-mono text-xs tabular">{n} · {pct(n / data.respondentCount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel className="space-y-3">
            <SectionTitle title="In their own words" />
            {data.commentsWithheld && <InlineNote>Comments are hidden until at least 5 people have responded, so no one can be identified.</InlineNote>}
            {data.comments.length > 0 ? (
              <ul className="space-y-2">
                {data.comments.map((c, i) => (
                  <li key={i} className="rounded-md border-l-2 border-brand-accent bg-secondary/40 px-3 py-2 text-sm italic">{c}</li>
                ))}
              </ul>
            ) : !data.commentsWithheld ? (
              <p className="text-sm text-muted-foreground">No comments yet.</p>
            ) : null}
          </Panel>
        </div>
      </div>
    </div>
  );
}
