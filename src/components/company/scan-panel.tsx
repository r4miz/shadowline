"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Link2, RefreshCw, ShieldOff, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyField } from "@/components/app/copy-field";
import { EmptyState, InlineError, InlineNote, Panel, Pill, SectionTitle, Stat, fmtDateTime } from "@/components/app/primitives";
import { TOOL_CATEGORY_LABELS, type ToolCategory } from "@/lib/ai-catalog";

interface App {
  id: string;
  name: string;
  publisher: string | null;
  isAi: boolean;
  aiConfidence: string;
  category: string | null;
  scopes: string[];
  userCount: number;
  users: string[];
  riskLevel: "high" | "medium" | "low";
  riskNotes: string[];
}
interface Scan {
  id: string;
  provider: string;
  finishedAt: string | null;
  startedAt: string;
  userCount: number | null;
  appCount: number | null;
  aiAppCount: number | null;
  summary: { builtInAi?: { product: string; activeUsers: number } | null; warnings?: string[]; highRiskAi?: number } | null;
  apps: App[];
  connection: { provider: string; adminEmail: string | null } | null;
}
interface Connection {
  id: string;
  provider: string;
  adminEmail: string | null;
  status: string;
  lastScanAt: string | null;
  lastError: string | null;
}
interface Data {
  scan: Scan | null;
  connections: Connection[];
  history: Array<{ id: string; provider: string; status: string; startedAt: string; finishedAt: string | null; aiAppCount: number | null; error: string | null }>;
  providers: { google: boolean; microsoft: boolean; demo: boolean };
}

const PROVIDER_LABEL: Record<string, string> = { google: "Google Workspace", microsoft: "Microsoft 365", demo: "Demo workspace" };
const RISK_TONE: Record<string, "bad" | "warn" | "neutral"> = { high: "bad", medium: "warn", low: "neutral" };

export function ScanPanel({ organizationId }: { organizationId: string }) {
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [busy, setBusy] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/organizations/${organizationId}/scan`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error();
      setData(json.data);
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

  async function makeLink() {
    setBusy("link");
    setError(null);
    try {
      const res = await fetch(`/api/organizations/${organizationId}/connect-link`, { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error();
      setLink(json.data.url);
    } catch {
      setError("Could not create a connect link.");
    } finally {
      setBusy(null);
    }
  }

  async function run(body: object, key: string) {
    setBusy(key);
    setError(null);
    try {
      const res = await fetch(`/api/organizations/${organizationId}/scan`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error === "no_connections" ? "No connected workspace yet. Send the connect link first." : "Scan failed.");
      const failed = (json.data.results as Array<{ ok: boolean; error?: string }>).filter((r) => !r.ok);
      if (failed.length) setError(failed.map((f) => f.error).join("; "));
      await load();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scan failed.");
    } finally {
      setBusy(null);
    }
  }

  async function revoke(connectionId: string) {
    if (!confirm("Revoke this connection? Scan history is kept, but no new scans can run until the admin reconnects.")) return;
    setBusy(`revoke-${connectionId}`);
    try {
      await fetch(`/api/organizations/${organizationId}/connections/${connectionId}`, { method: "DELETE" });
      await load();
    } finally {
      setBusy(null);
    }
  }

  if (state === "loading") return <p className="text-sm text-muted-foreground">Loading scan</p>;
  if (state === "error" || !data) return <InlineError>Could not load scan data. <button className="underline" onClick={load}>Try again</button></InlineError>;

  const scan = data.scan;
  const aiApps = scan?.apps.filter((a) => a.isAi) ?? [];
  const otherApps = scan?.apps.filter((a) => !a.isAi) ?? [];
  const highRisk = aiApps.filter((a) => a.riskLevel === "high").length;
  const active = data.connections.filter((c) => c.status !== "revoked");
  const noRealProvider = !data.providers.google && !data.providers.microsoft;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-5">
        <Panel className="space-y-4 lg:col-span-3">
          <SectionTitle title="Connect the client's workspace" description="Send this link to whoever administers their Google Workspace or Microsoft 365. It expires in 7 days and only works for this company." />
          {noRealProvider && (
            <InlineNote tone="warn">Google and Microsoft connectors are not configured yet (see Settings). The link will still open, but the admin will only see the options that are live. Use a demo scan to show the flow.</InlineNote>
          )}
          {link ? (
            <CopyField id="connect-link" label="Connect link" value={link} />
          ) : (
            <Button variant="outline" onClick={makeLink} disabled={busy === "link"}><Link2 /> {busy === "link" ? "Creating" : "Create connect link"}</Button>
          )}
          {active.length > 0 && (
            <ul className="divide-y divide-border rounded-md border border-border">
              {active.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm">
                  <div>
                    <p className="font-medium">{PROVIDER_LABEL[c.provider] ?? c.provider}{c.adminEmail ? <span className="text-muted-foreground"> · {c.adminEmail}</span> : null}</p>
                    <p className="text-xs text-muted-foreground">{c.lastScanAt ? `Last scan ${fmtDateTime(c.lastScanAt)}` : "Not scanned yet"}{c.lastError ? ` · ${c.lastError}` : ""}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => run({ connectionId: c.id }, `run-${c.id}`)} disabled={busy !== null}><RefreshCw className={busy === `run-${c.id}` ? "animate-spin" : ""} /> Scan now</Button>
                    <Button size="sm" variant="ghost" onClick={() => revoke(c.id)} disabled={busy !== null} aria-label="Revoke connection"><ShieldOff /></Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel className="space-y-3 lg:col-span-2">
          <SectionTitle title="Demo scan" description="Fictional workspace data. Use it to show a prospect what the scan finds before they connect." />
          {data.providers.demo ? (
            <Button onClick={() => run({ demo: true }, "demo")} disabled={busy !== null}><Sparkles /> {busy === "demo" ? "Scanning" : "Run demo scan"}</Button>
          ) : (
            <p className="text-sm text-muted-foreground">Demo scans are off in this environment.</p>
          )}
        </Panel>
      </div>

      {error && <InlineError>{error}</InlineError>}

      {!scan ? (
        <EmptyState title="No scan yet" body="Once the admin connects, the first scan runs automatically and shows up here. For a demo, run the demo scan above." />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Accounts" value={scan.userCount ?? 0} hint={`${PROVIDER_LABEL[scan.provider] ?? scan.provider} · ${fmtDateTime(scan.finishedAt ?? scan.startedAt)}`} />
            <Stat label="Connected apps" value={scan.appCount ?? scan.apps.length} hint="Third-party apps with access to work accounts" />
            <Stat label="AI apps" value={aiApps.length} tone={aiApps.length ? "accent" : "default"} hint="Classified from our vendor catalog" />
            <Stat label="High-risk AI" value={highRisk} tone={highRisk ? "bad" : "good"} hint="Can read email, files or meetings" />
          </div>

          {scan.summary?.builtInAi && (
            <InlineNote>Built-in AI: {scan.summary.builtInAi.activeUsers} active users of {scan.summary.builtInAi.product} in the last 30 days.</InlineNote>
          )}
          {scan.summary?.warnings?.map((w) => <InlineNote key={w} tone="warn">{w}</InlineNote>)}

          <section className="space-y-3">
            <SectionTitle title="AI apps connected to company accounts" description="Sorted by risk. Expand a row to see which accounts granted access." />
            {aiApps.length === 0 ? (
              <p className="text-sm text-muted-foreground">No AI apps found.</p>
            ) : (
              <AppTable apps={aiApps} expanded={expanded} onToggle={(id) => setExpanded(expanded === id ? null : id)} />
            )}
          </section>

          {otherApps.length > 0 && (
            <section className="space-y-3">
              <button type="button" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground" onClick={() => setShowAll(!showAll)} aria-expanded={showAll}>
                <ChevronDown className={`size-4 transition-transform ${showAll ? "rotate-180" : ""}`} /> {otherApps.length} other connected apps (not AI)
              </button>
              {showAll && <AppTable apps={otherApps} expanded={expanded} onToggle={(id) => setExpanded(expanded === id ? null : id)} />}
            </section>
          )}
        </>
      )}

      {data.history.length > 1 && (
        <section className="space-y-2">
          <SectionTitle title="Scan history" />
          <ul className="divide-y divide-border rounded-md border border-border text-sm">
            {data.history.map((h) => (
              <li key={h.id} className="flex items-center justify-between px-3 py-2">
                <span>{fmtDateTime(h.finishedAt ?? h.startedAt)} · {PROVIDER_LABEL[h.provider] ?? h.provider}</span>
                <span className="text-muted-foreground">{h.status === "complete" ? `${h.aiAppCount ?? 0} AI apps` : h.status === "failed" ? `failed: ${h.error ?? "unknown"}` : h.status}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function AppTable({ apps, expanded, onToggle }: { apps: App[]; expanded: string | null; onToggle: (id: string) => void }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-secondary/60 text-left font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
          <tr>
            <th className="px-4 py-2.5 font-medium">App</th>
            <th className="hidden px-4 py-2.5 font-medium sm:table-cell">Category</th>
            <th className="px-4 py-2.5 font-medium">Risk</th>
            <th className="px-4 py-2.5 text-right font-medium">Accounts</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {apps.map((a) => (
            <AppRow key={a.id} app={a} open={expanded === a.id} onToggle={() => onToggle(a.id)} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AppRow({ app, open, onToggle }: { app: App; open: boolean; onToggle: () => void }) {
  return (
    <>
      <tr className="cursor-pointer hover:bg-secondary/40" onClick={onToggle} aria-expanded={open}>
        <td className="px-4 py-3">
          <p className="font-medium">{app.name}{app.isAi && app.aiConfidence === "low" && <span className="ml-1.5 text-xs text-muted-foreground">(likely AI)</span>}</p>
          {app.publisher && <p className="text-xs text-muted-foreground">{app.publisher}</p>}
        </td>
        <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">{app.category ? TOOL_CATEGORY_LABELS[app.category as ToolCategory] ?? app.category : app.isAi ? "AI" : "Other"}</td>
        <td className="px-4 py-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <Pill tone={RISK_TONE[app.riskLevel]}>{app.riskLevel}</Pill>
            {app.riskNotes.slice(0, 1).map((n) => <span key={n} className="text-xs text-muted-foreground">{n}</span>)}
          </div>
        </td>
        <td className="px-4 py-3 text-right tabular">{app.userCount}</td>
      </tr>
      {open && (
        <tr className="bg-secondary/30">
          <td colSpan={4} className="px-4 py-3 text-xs">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="font-mono uppercase tracking-wide text-muted-foreground">Accounts with access</p>
                <p className="mt-1 break-words font-mono">{app.users.length ? app.users.join(", ") : "Not listed by the provider"}</p>
              </div>
              <div>
                <p className="font-mono uppercase tracking-wide text-muted-foreground">Permissions granted</p>
                <p className="mt-1 break-words font-mono">{app.scopes.length ? app.scopes.join(" ") : "Sign-in only"}</p>
                {app.riskNotes.length > 0 && <p className="mt-2 text-foreground">{app.riskNotes.join(". ")}.</p>}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
