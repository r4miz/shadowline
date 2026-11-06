"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, CircleDashed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InlineError, InlineNote, Panel, SectionTitle } from "@/components/app/primitives";
import { formatCents, priceFor } from "@/lib/pricing";

interface Settings {
  auditPricePerEmployeeCents: number;
  auditMinimumCents: number;
  monitoringPricePerEmployeeCents: number;
  monitoringMinimumCents: number;
  businessName: string | null;
  replyToEmail: string | null;
}
interface Integrations {
  email: boolean;
  stripe: boolean;
  google: boolean;
  microsoft: boolean;
  demoScans: boolean;
  aiDrafting: boolean;
  cron: boolean;
}

const INTEGRATION_LABELS: Array<{ key: keyof Integrations; label: string; hint: string }> = [
  { key: "google", label: "Google Workspace connector", hint: "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET" },
  { key: "microsoft", label: "Microsoft 365 connector", hint: "MS_CLIENT_ID and MS_CLIENT_SECRET" },
  { key: "demoScans", label: "Demo scans", hint: "Fictional workspace data for demos (SCAN_DEMO_MODE)" },
  { key: "email", label: "Email delivery", hint: "RESEND_API_KEY and EMAIL_FROM" },
  { key: "stripe", label: "Stripe payments", hint: "STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET" },
  { key: "cron", label: "Daily monitoring cron", hint: "CRON_SECRET plus a scheduler hitting /api/cron/monitor" },
  { key: "aiDrafting", label: "AI-assisted drafting", hint: "ANTHROPIC_API_KEY (optional)" },
];

function dollars(cents: number) {
  return (cents / 100).toString();
}
function cents(dollars: string) {
  const n = Number(dollars);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

export function SettingsForm() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [integrations, setIntegrations] = useState<Integrations | null>(null);
  const [form, setForm] = useState({ auditUnit: "", auditMin: "", monUnit: "", monMin: "", businessName: "", replyTo: "" });
  const [state, setState] = useState<"loading" | "ready" | "saving" | "saved" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings")
      .then((r) => r.json())
      .then((json) => {
        if (cancelled || !json.success) throw new Error();
        const s: Settings = json.data.settings;
        setSettings(s);
        setIntegrations(json.data.integrations);
        setForm({
          auditUnit: dollars(s.auditPricePerEmployeeCents),
          auditMin: dollars(s.auditMinimumCents),
          monUnit: dollars(s.monitoringPricePerEmployeeCents),
          monMin: dollars(s.monitoringMinimumCents),
          businessName: s.businessName ?? "",
          replyTo: s.replyToEmail ?? "",
        });
        setState("ready");
      })
      .catch(() => !cancelled && setState("error"));
    return () => {
      cancelled = true;
    };
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setState("saving");
    setError(null);
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        auditPricePerEmployeeCents: cents(form.auditUnit),
        auditMinimumCents: cents(form.auditMin),
        monitoringPricePerEmployeeCents: cents(form.monUnit),
        monitoringMinimumCents: cents(form.monMin),
        businessName: form.businessName.trim() || null,
        replyToEmail: form.replyTo.trim() || null,
      }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      setError("Could not save. Check that every price is a valid number.");
      setState("ready");
      return;
    }
    setSettings(json.data);
    setState("saved");
    setTimeout(() => setState("ready"), 1500);
  }

  const example = (unit: string, min: string) => {
    const rule = { unitCents: cents(unit), minimumCents: cents(min) };
    return [10, 40, 120].map((n) => `${n} staff: ${formatCents(priceFor(n, rule).totalCents)}`).join(" · ");
  };

  if (state === "loading") return <p className="text-sm text-muted-foreground">Loading settings</p>;
  if (state === "error" && !settings) return <InlineError>Could not load settings. Refresh to try again.</InlineError>;

  return (
    <div className="space-y-6">
      <Panel>
        <form onSubmit={save} className="space-y-6">
          <SectionTitle title="Pricing" description="Per-employee rates with a minimum. Quotes use the rate in force when they are created." />
          <div className="grid gap-5 sm:grid-cols-2">
            <fieldset className="space-y-3 rounded-md border border-border p-4">
              <legend className="px-1 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">One-time audit</legend>
              <div className="space-y-1.5">
                <Label htmlFor="auditUnit">Price per employee (USD)</Label>
                <Input id="auditUnit" inputMode="decimal" value={form.auditUnit} onChange={(e) => setForm({ ...form, auditUnit: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="auditMin">Minimum fee (USD)</Label>
                <Input id="auditMin" inputMode="decimal" value={form.auditMin} onChange={(e) => setForm({ ...form, auditMin: e.target.value })} />
              </div>
              <p className="text-xs text-muted-foreground tabular">{example(form.auditUnit, form.auditMin)}</p>
            </fieldset>
            <fieldset className="space-y-3 rounded-md border border-border p-4">
              <legend className="px-1 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Monthly monitoring</legend>
              <div className="space-y-1.5">
                <Label htmlFor="monUnit">Price per employee per month (USD)</Label>
                <Input id="monUnit" inputMode="decimal" value={form.monUnit} onChange={(e) => setForm({ ...form, monUnit: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="monMin">Minimum per month (USD)</Label>
                <Input id="monMin" inputMode="decimal" value={form.monMin} onChange={(e) => setForm({ ...form, monMin: e.target.value })} />
              </div>
              <p className="text-xs text-muted-foreground tabular">{example(form.monUnit, form.monMin)}</p>
            </fieldset>
          </div>

          <SectionTitle title="On documents and quotes" />
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="businessName">Business name</Label>
              <Input id="businessName" value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} placeholder="Your firm" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="replyTo">Reply-to email</Label>
              <Input id="replyTo" type="email" value={form.replyTo} onChange={(e) => setForm({ ...form, replyTo: e.target.value })} placeholder="you@yourfirm.com" />
            </div>
          </div>

          {error && <InlineError>{error}</InlineError>}
          <div className="flex items-center justify-end gap-3">
            {state === "saved" && <span className="text-sm text-success">Saved</span>}
            <Button type="submit" disabled={state === "saving"}>{state === "saving" ? "Saving" : "Save settings"}</Button>
          </div>
        </form>
      </Panel>

      <Panel>
        <SectionTitle title="Integrations" description="Set in the environment, not here. Grey means the feature falls back to a manual path." />
        <ul className="mt-4 divide-y divide-border">
          {INTEGRATION_LABELS.map((i) => {
            const on = integrations?.[i.key] ?? false;
            return (
              <li key={i.key} className="flex items-start gap-3 py-3">
                {on ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" /> : <CircleDashed className="mt-0.5 size-4 shrink-0 text-muted-foreground" />}
                <div>
                  <p className="text-sm font-medium">{i.label} <span className={on ? "text-success" : "text-muted-foreground"}>· {on ? "live" : "not configured"}</span></p>
                  <p className="text-xs text-muted-foreground">{i.hint}</p>
                </div>
              </li>
            );
          })}
        </ul>
        {!integrations?.email && (
          <InlineNote tone="warn">Without email, sign-in links and sign-off invitations are shown on screen for you to send by hand.</InlineNote>
        )}
      </Panel>
    </div>
  );
}
