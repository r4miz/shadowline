"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InlineError, InlineNote, Panel, Pill, SectionTitle, Stat, fmtDate, fmtDateTime } from "@/components/app/primitives";

interface Status {
  monitoringActive: boolean;
  monitoringSince: string | null;
  nextResurveyAt: string | null;
  openAlerts: number;
  pendingSignoffs: number;
  activeConnections: number;
  cronConfigured: boolean;
}
interface Alert {
  id: string;
  type: string;
  severity: "info" | "warning" | "critical";
  title: string;
  body: string;
  createdAt: string;
  resolvedAt: string | null;
}

const SEVERITY_TONE: Record<Alert["severity"], "neutral" | "warn" | "bad"> = { info: "neutral", warning: "warn", critical: "bad" };

export function MonitoringPanel({ organizationId }: { organizationId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [showResolved, setShowResolved] = useState(false);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [s, a] = await Promise.all([
        fetch(`/api/organizations/${organizationId}/monitoring`).then((r) => r.json()),
        fetch(`/api/organizations/${organizationId}/alerts${showResolved ? "?all=1" : ""}`).then((r) => r.json()),
      ]);
      if (!s.success || !a.success) throw new Error();
      setStatus(s.data);
      setAlerts(a.data);
      setState("ready");
    } catch {
      setState("error");
    }
  }, [organizationId, showResolved]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  async function runNow() {
    setBusy("run");
    setNotice(null);
    try {
      const res = await fetch(`/api/organizations/${organizationId}/monitoring`, { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error();
      const r = json.data;
      setNotice(`Cycle complete: ${r.scans} scan${r.scans === 1 ? "" : "s"}${r.scanErrors ? ` (${r.scanErrors} failed)` : ""}, ${r.newAlerts} new alert${r.newAlerts === 1 ? "" : "s"}${r.resurveyCreated ? ", quarterly re-survey created" : ""}.`);
      await load();
      router.refresh();
    } catch {
      setNotice("The cycle failed. Check the connections on the Scan stage.");
    } finally {
      setBusy(null);
    }
  }

  async function toggle(active: boolean) {
    if (!confirm(active ? "Turn monitoring on for this company? Use this when billing happens outside the app." : "Turn monitoring off? Daily scans and re-surveys stop.")) return;
    setBusy("toggle");
    try {
      await fetch(`/api/organizations/${organizationId}/monitoring`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active }) });
      await load();
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function resolve(alertId: string) {
    await fetch(`/api/organizations/${organizationId}/alerts`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ alertId, resolved: true }) });
    await load();
    router.refresh();
  }

  if (state === "loading") return <p className="text-sm text-muted-foreground">Loading</p>;
  if (state === "error" || !status) return <InlineError>Could not load monitoring status.</InlineError>;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Status" value={status.monitoringActive ? "Active" : "Off"} hint={status.monitoringActive && status.monitoringSince ? `since ${fmtDate(status.monitoringSince)}` : "Activate via a paid monitoring quote or manually"} tone={status.monitoringActive ? "good" : "default"} />
        <Stat label="Next re-survey" value={status.nextResurveyAt ? fmtDate(status.nextResurveyAt) : "n/a"} hint="A new audit opens automatically" />
        <Stat label="Open alerts" value={status.openAlerts} tone={status.openAlerts ? "accent" : "default"} hint="New AI apps, new users, failures" />
        <Stat label="Pending sign-offs" value={status.pendingSignoffs} tone={status.pendingSignoffs ? "warn" : "default"} hint="Including new hires found by scans" />
      </div>

      <Panel className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-heading text-lg font-semibold">Run a cycle now</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Re-scans {status.activeConnections} connected workspace{status.activeConnections === 1 ? "" : "s"}, checks for overdue sign-offs and opens the re-survey if it is due.
            {!status.cronConfigured && " The daily schedule is not configured yet (CRON_SECRET), so run cycles by hand or set up the cron."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={runNow} disabled={busy !== null}><Play /> {busy === "run" ? "Running" : "Run now"}</Button>
          <Button variant="outline" onClick={() => toggle(!status.monitoringActive)} disabled={busy !== null}>{status.monitoringActive ? "Turn off" : "Turn on manually"}</Button>
        </div>
      </Panel>
      {notice && <InlineNote>{notice}</InlineNote>}
      {status.activeConnections === 0 && <InlineNote tone="warn">No workspace is connected. Monitoring still tracks sign-offs and re-surveys, but new-app alerts need a connection. <Link className="underline" href={`/app/companies/${organizationId}/scan`}>Connect one</Link>.</InlineNote>}

      <section className="space-y-3">
        <SectionTitle title="Alerts" actions={<label className="flex items-center gap-2 text-sm text-muted-foreground"><input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} className="accent-current" /> Show resolved</label>} />
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing to review.</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border bg-card">
            {alerts.map((a) => (
              <li key={a.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill tone={SEVERITY_TONE[a.severity]}>{a.severity}</Pill>
                    <p className="text-sm font-medium">{a.title}</p>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{a.body}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{fmtDateTime(a.createdAt)}{a.resolvedAt ? ` · resolved ${fmtDate(a.resolvedAt)}` : ""}</p>
                </div>
                {!a.resolvedAt && <Button size="sm" variant="outline" onClick={() => resolve(a.id)}><Check /> Resolve</Button>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
