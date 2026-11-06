"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, InlineError, InlineNote, Panel, SectionTitle, Stat, fmtDate } from "@/components/app/primitives";
import { formatCents } from "@/lib/pricing";

interface Match {
  id: string;
  vendorName: string;
  toolName: string;
  chargeCount: number;
  totalCents: number;
  monthlyCents: number;
  firstChargeAt: string | null;
  lastChargeAt: string | null;
  cardholder: string | null;
}
interface Summary {
  monthlyCents: number;
  totalCents: number;
  vendors: number;
  seats: number;
}

export function ExpensesPanel({ engagementId }: { engagementId: string }) {
  const router = useRouter();
  const [matches, setMatches] = useState<Match[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pasted, setPasted] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/engagements/${engagementId}/expenses`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error();
      setMatches(json.data.matches);
      setSummary(json.data.summary);
      setState("ready");
    } catch {
      setState("error");
    }
  }, [engagementId]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  async function upload(body: FormData | string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/engagements/${engagementId}/expenses`, {
        method: "POST",
        ...(typeof body === "string" ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ csv: body }) } : { body }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? "Upload failed");
      setMatches(json.data.matches);
      setSummary(json.data.summary);
      setNotice(`Scanned ${json.data.rowsScanned.toLocaleString()} rows. Found ${json.data.matches.length} AI vendor line${json.data.matches.length === 1 ? "" : "s"}. The file was discarded.`);
      setPasted("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  function onFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("That file is larger than 2 MB. Export a shorter date range.");
      return;
    }
    const fd = new FormData();
    fd.append("file", file);
    void upload(fd);
  }

  async function clear() {
    if (!confirm("Remove the expense results for this audit?")) return;
    await fetch(`/api/engagements/${engagementId}/expenses`, { method: "DELETE" });
    await load();
    router.refresh();
  }

  if (state === "loading") return <p className="text-sm text-muted-foreground">Loading</p>;
  if (state === "error") return <InlineError>Could not load expense results.</InlineError>;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel className="space-y-4">
          <SectionTitle title="Upload a statement" description="Any CSV with a description and an amount column works. Date and cardholder columns are used when present." />
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              onFile(e.dataTransfer.files?.[0]);
            }}
            className={`paper-grain flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors ${dragging ? "border-brand-accent bg-brand-accent/5" : "border-border"}`}
          >
            <FileUp className="size-7 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">Drop a CSV here</p>
            <p className="text-xs text-muted-foreground">or</p>
            <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => fileRef.current?.click()} disabled={busy}>Choose file</Button>
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
            <p className="mt-3 text-xs text-muted-foreground">Up to 2 MB, 20,000 rows.</p>
          </div>
        </Panel>
        <Panel className="space-y-4">
          <SectionTitle title="Or paste rows" description="Copy from a spreadsheet, including the header row." />
          <div className="space-y-1.5">
            <Label htmlFor="pasted">CSV text</Label>
            <Textarea id="pasted" value={pasted} onChange={(e) => setPasted(e.target.value)} rows={7} className="font-mono text-xs" placeholder={"Date,Description,Amount\n2026-09-03,OPENAI *CHATGPT SUBSCR,20.00"} />
          </div>
          <Button type="button" onClick={() => upload(pasted)} disabled={busy || pasted.trim().length < 10}>{busy ? "Scanning" : "Scan pasted rows"}</Button>
        </Panel>
      </div>

      {error && <InlineError>{error}</InlineError>}
      {notice && <InlineNote tone="good">{notice}</InlineNote>}

      {matches.length === 0 ? (
        <EmptyState title="No expense results yet" body="Ask the owner or bookkeeper for a 3 to 6 month export of company card charges. Personal AI subscriptions on the company card are the most common finding." />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Monthly AI spend" value={formatCents(summary?.monthlyCents ?? 0)} hint="Estimated recurring, from charges found" tone="accent" />
            <Stat label="Vendors" value={summary?.vendors ?? 0} hint="Distinct AI vendors on the card" />
            <Stat label="Total in period" value={formatCents(summary?.totalCents ?? 0)} hint="All matched charges" />
          </div>
          <section className="space-y-3">
            <SectionTitle title="AI charges found" actions={<Button variant="ghost" size="sm" onClick={clear}><Trash2 /> Clear results</Button>} />
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <table className="w-full text-sm">
                <thead className="bg-secondary/60 text-left font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Tool</th>
                    <th className="hidden px-4 py-2.5 font-medium sm:table-cell">Cardholder</th>
                    <th className="px-4 py-2.5 text-right font-medium">Charges</th>
                    <th className="px-4 py-2.5 text-right font-medium">Monthly</th>
                    <th className="hidden px-4 py-2.5 text-right font-medium md:table-cell">Period</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {matches.map((m) => (
                    <tr key={m.id}>
                      <td className="px-4 py-3"><p className="font-medium">{m.toolName}</p><p className="text-xs text-muted-foreground">{m.vendorName}</p></td>
                      <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">{m.cardholder ?? "n/a"}</td>
                      <td className="px-4 py-3 text-right tabular">{m.chargeCount}</td>
                      <td className="px-4 py-3 text-right font-medium tabular">{formatCents(m.monthlyCents)}</td>
                      <td className="hidden px-4 py-3 text-right text-xs text-muted-foreground md:table-cell">{m.firstChargeAt ? `${fmtDate(m.firstChargeAt)} to ${fmtDate(m.lastChargeAt)}` : "n/a"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
