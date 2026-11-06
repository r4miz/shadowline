"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CopyField } from "@/components/app/copy-field";
import { InlineError, InlineNote, Panel, Pill, SectionTitle, fmtDate } from "@/components/app/primitives";
import { formatCents, priceFor } from "@/lib/pricing";

interface Quote {
  id: string;
  kind: "audit" | "monitoring";
  employeeCount: number;
  unitCents: number;
  subtotalCents: number;
  minimumCents: number;
  totalCents: number;
  status: "draft" | "sent" | "accepted" | "paid" | "void";
  createdAt: string;
  paidAt: string | null;
}
interface Settings {
  auditPricePerEmployeeCents: number;
  auditMinimumCents: number;
  monitoringPricePerEmployeeCents: number;
  monitoringMinimumCents: number;
}
interface Data {
  quotes: Quote[];
  settings: Settings;
  stripeConfigured: boolean;
  employeeCount: number;
  monitoringActive: boolean;
}

const STATUS_TONE: Record<Quote["status"], "neutral" | "warn" | "good" | "bad" | "accent"> = { draft: "neutral", sent: "accent", accepted: "warn", paid: "good", void: "bad" };

export function BillingPanel({ organizationId, flash }: { organizationId: string; flash: "paid" | "cancelled" | null }) {
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [kind, setKind] = useState<"audit" | "monitoring">("audit");
  const [count, setCount] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/organizations/${organizationId}/quotes`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error();
      setData(json.data);
      setCount((c) => c || String(json.data.employeeCount));
      setState("ready");
    } catch {
      setState("error");
    }
  }, [organizationId]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  async function create() {
    setBusy("create");
    setError(null);
    try {
      const res = await fetch(`/api/organizations/${organizationId}/quotes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, employeeCount: Number(count) || undefined }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error();
      await load();
      router.refresh();
    } catch {
      setError("Could not create the quote.");
    } finally {
      setBusy(null);
    }
  }

  async function setStatus(id: string, status: Quote["status"]) {
    if (status === "paid" && !confirm("Mark this quote as paid? A monitoring quote will turn monitoring on.")) return;
    setBusy(id);
    try {
      await fetch(`/api/quotes/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      await load();
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function checkout(id: string) {
    setBusy(id);
    setError(null);
    try {
      const res = await fetch(`/api/quotes/${id}/checkout`, { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error();
      setCheckoutUrl(json.data.url);
      await load();
    } catch {
      setError("Could not create a checkout link.");
    } finally {
      setBusy(null);
    }
  }

  if (state === "loading") return <p className="text-sm text-muted-foreground">Loading</p>;
  if (state === "error" || !data) return <InlineError>Could not load quotes.</InlineError>;

  const rule = kind === "audit"
    ? { unitCents: data.settings.auditPricePerEmployeeCents, minimumCents: data.settings.auditMinimumCents }
    : { unitCents: data.settings.monitoringPricePerEmployeeCents, minimumCents: data.settings.monitoringMinimumCents };
  const preview = priceFor(Number(count) || data.employeeCount, rule);

  return (
    <div className="space-y-6">
      {flash === "paid" && <InlineNote tone="good">Payment received. The quote updates once Stripe confirms it.</InlineNote>}
      {flash === "cancelled" && <InlineNote tone="warn">Checkout was cancelled. The quote is still open.</InlineNote>}

      <Panel className="space-y-4">
        <SectionTitle title="New quote" description="Uses the per-employee rates from Settings." />
        <div className="grid gap-4 sm:grid-cols-[auto_1fr_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label>Type</Label>
            <div className="flex rounded-md border border-border p-0.5">
              {(["audit", "monitoring"] as const).map((k) => (
                <button key={k} type="button" onClick={() => setKind(k)} aria-pressed={kind === k} className={`rounded px-3 py-1.5 text-sm transition-colors ${kind === k ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}>
                  {k === "audit" ? "One-time audit" : "Monthly monitoring"}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="count">Employees</Label>
            <Input id="count" type="number" min={1} inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value)} />
          </div>
          <Button onClick={create} disabled={busy === "create"}><Plus /> Create quote</Button>
        </div>
        <p className="text-sm text-muted-foreground tabular">
          {preview.employeeCount} x {formatCents(preview.unitCents)} = {formatCents(preview.subtotalCents)}{preview.minimumApplied ? `, below the ${formatCents(preview.minimumCents)} minimum` : ""}.
          <span className="ml-1 font-medium text-foreground">Total {formatCents(preview.totalCents)}{kind === "monitoring" ? " per month" : ""}.</span>
        </p>
      </Panel>

      {error && <InlineError>{error}</InlineError>}
      {checkoutUrl && <CopyField id="checkout" label="Stripe checkout link (send to the client)" value={checkoutUrl} />}

      <section className="space-y-3">
        <SectionTitle title="Quotes" description={data.stripeConfigured ? "Checkout links are available." : "Stripe is not configured: send the quote document and mark it paid by hand."} />
        {data.quotes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No quotes yet.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 text-left font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Quote</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 text-right font-medium">Total</th>
                  <th className="px-4 py-2.5 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.quotes.map((q) => (
                  <tr key={q.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{q.kind === "audit" ? "Shadow AI Audit" : "AI Monitoring (monthly)"}</p>
                      <p className="text-xs text-muted-foreground">{q.employeeCount} employees · {fmtDate(q.createdAt)}{q.paidAt ? ` · paid ${fmtDate(q.paidAt)}` : ""}</p>
                    </td>
                    <td className="px-4 py-3"><Pill tone={STATUS_TONE[q.status]}>{q.status}</Pill></td>
                    <td className="px-4 py-3 text-right font-medium tabular">{formatCents(q.totalCents)}{q.kind === "monitoring" ? "/mo" : ""}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <Button size="sm" variant="outline" nativeButton={false} render={<a href={`/api/quotes/${q.id}/download?format=view`} target="_blank" rel="noreferrer" />}><FileText /> View</Button>
                        {q.status !== "paid" && q.status !== "void" && data.stripeConfigured && <Button size="sm" variant="outline" onClick={() => checkout(q.id)} disabled={busy === q.id}>Checkout link</Button>}
                        {q.status !== "paid" && q.status !== "void" && <Button size="sm" onClick={() => setStatus(q.id, "paid")} disabled={busy === q.id}>Mark paid</Button>}
                        {q.status !== "paid" && q.status !== "void" && <Button size="sm" variant="ghost" onClick={() => setStatus(q.id, "void")} disabled={busy === q.id}>Void</Button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
