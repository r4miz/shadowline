"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState, InlineError, InlineNote, Panel, Pill, SectionTitle } from "@/components/app/primitives";
import { formatCents } from "@/lib/pricing";
import type { Recommendation } from "@/lib/recommend/engine";

const AVAIL: Record<string, string> = { yes: "Yes", higher_tier: "Higher tier", verify: "Confirm", no: "No" };

export function RecommendationPanel({ engagementId, profileComplete, companyId }: { engagementId: string; profileComplete: boolean; companyId: string }) {
  const [rec, setRec] = useState<Recommendation | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/engagements/${engagementId}/recommendation`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (!json.success) throw new Error();
        setRec(json.data);
        setState("ready");
      })
      .catch(() => !cancelled && setState("error"));
    return () => {
      cancelled = true;
    };
  }, [engagementId]);

  if (!profileComplete) {
    return (
      <EmptyState
        title="Complete the company profile first"
        body="The recommendation needs the office suite, headcount and data types. Survey results and expense data sharpen it further."
        action={<Button nativeButton={false} render={<Link href={`/app/companies/${companyId}/profile`} />}>Open profile</Button>}
      />
    );
  }
  if (state === "loading") return <p className="text-sm text-muted-foreground">Scoring plans</p>;
  if (state === "error" || !rec) return <InlineError>Could not compute the recommendation.</InlineError>;
  if (rec.ranked.length === 0) return <InlineNote tone="warn">{rec.summary}</InlineNote>;

  return (
    <div className="space-y-6">
      <Panel className="border-foreground/20 bg-secondary/40">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Our recommendation</p>
        <p className="mt-2 font-heading text-2xl font-semibold tracking-tight">{rec.primary?.plan.name}</p>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed">{rec.summary}</p>
        {rec.regulated && <InlineNote tone="warn">Regulated data is in scope. Compliance terms weigh heavily in this ranking.</InlineNote>}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        {rec.ranked.map((r, i) => (
          <Panel key={r.plan.key} className={i === 0 ? "ring-2 ring-foreground/70" : ""}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">#{i + 1} · {r.plan.vendor}</p>
                <h3 className="mt-1 font-heading text-lg font-semibold">{r.plan.name}</h3>
              </div>
              <div className="text-right">
                <p className="font-heading text-2xl font-semibold tabular">{r.score}<span className="text-sm text-muted-foreground">/100</span></p>
                <p className="text-xs text-muted-foreground">fit score</p>
              </div>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary" aria-hidden>
              <div className="h-full rounded-full bg-foreground transition-[width] duration-500" style={{ width: `${r.score}%` }} />
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div><dt className="text-xs text-muted-foreground">Monthly</dt><dd className="font-medium tabular">{r.estimatedMonthlyCents === 0 ? "Included" : formatCents(r.estimatedMonthlyCents)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Per seat</dt><dd className="font-medium tabular">{r.plan.includedInSuite ? "In suite" : `${formatCents(r.plan.annualPerSeatCents)}/mo`}</dd></div>
              <div><dt className="text-xs text-muted-foreground">SSO</dt><dd className="font-medium">{AVAIL[r.plan.sso]}</dd></div>
              <div><dt className="text-xs text-muted-foreground">HIPAA terms</dt><dd className="font-medium">{AVAIL[r.plan.baa]}</dd></div>
            </dl>

            {r.consolidationSavingsCents > 0 && <div className="mt-3"><Pill tone="good">Saves about {formatCents(r.consolidationSavingsCents)}/month vs current subscriptions</Pill></div>}

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-success">Why it fits</p>
                <ul className="mt-1.5 space-y-1 text-sm">{[...r.reasons, ...r.plan.strengths].slice(0, 5).map((x) => <li key={x} className="flex gap-2"><span className="text-success">+</span><span>{x}</span></li>)}</ul>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-warning">Watch out for</p>
                <ul className="mt-1.5 space-y-1 text-sm">{r.cautions.slice(0, 4).map((x) => <li key={x} className="flex gap-2"><span className="text-warning">!</span><span>{x}</span></li>)}</ul>
              </div>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">Price checked {r.plan.priceCheckedOn}. {r.plan.sources.map((u) => <a key={u} href={u} target="_blank" rel="noreferrer" className="underline underline-offset-2">source</a>)}</p>
          </Panel>
        ))}
      </div>

      <SectionTitle title="How the score works" description="Suite fit 30, staff familiarity 25, compliance 20, cost 15, controls 10. Plans whose seat range does not fit the headcount are excluded. The same inputs always produce the same ranking." />
    </div>
  );
}
