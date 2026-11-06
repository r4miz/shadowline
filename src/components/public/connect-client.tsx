"use client";

import { useEffect, useState } from "react";
import { Check, Eye, LockKeyhole, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/brand-mark";
import { brand } from "@/lib/brand";

interface Info {
  organizationName: string;
  operatorName: string;
  providers: { google: boolean; microsoft: boolean; demo: boolean };
  existing: Array<{ provider: string; adminEmail: string | null; lastScanAt: string | null }>;
}

const WHAT_WE_READ = [
  "The list of user accounts in your workspace (names and emails, so we can count who has what)",
  "Which third-party apps each account has connected, and what permissions those apps were granted",
  "Nothing else: no email content, no files, no messages, no passwords",
];

export function ConnectClient({ token }: { token: string }) {
  const [info, setInfo] = useState<Info | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "invalid" | "starting">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/connect?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (!json.success) throw new Error();
        setInfo(json.data);
        setState("ready");
      })
      .catch(() => !cancelled && setState("invalid"));
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function start(provider: "google" | "microsoft" | "demo") {
    setState("starting");
    setError(null);
    try {
      const res = await fetch("/api/connect/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, provider }) });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error);
      const target = new URL(json.data.redirect, window.location.origin);
      const allowed = [window.location.host, "accounts.google.com", "login.microsoftonline.com"];
      if (target.protocol !== "https:" && target.origin !== window.location.origin) throw new Error("bad_redirect");
      if (!allowed.includes(target.host)) throw new Error("bad_redirect");
      window.location.assign(target.toString());
    } catch (e) {
      const code = e instanceof Error ? e.message : "";
      setError(code === "provider_unavailable" ? "That provider is not available right now. Ask the person who sent you this link." : "Could not start the connection. Try again or ask the person who sent this link.");
      setState("ready");
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-5 py-10 sm:py-16">
      <div className="flex items-center gap-2.5">
        <BrandMark className="size-7 text-foreground" />
        <span className="font-heading text-lg font-semibold">{brand.name}</span>
      </div>

      {state === "loading" && <p className="mt-10 text-sm text-muted-foreground">Checking your link</p>}

      {state === "invalid" && (
        <div className="mt-10 rounded-lg border border-border bg-card p-6">
          <h1 className="font-heading text-xl font-semibold">This link is no longer valid</h1>
          <p className="mt-2 text-sm text-muted-foreground">Connect links expire after 7 days. Ask the person running your audit for a new one.</p>
        </div>
      )}

      {info && state !== "invalid" && (
        <div className="mt-10 space-y-8">
          <div>
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Shadow AI audit for {info.organizationName}</p>
            <h1 className="mt-2 font-heading text-3xl font-semibold leading-tight sm:text-4xl">Connect your workspace for a read-only scan</h1>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              {info.operatorName} is auditing how AI tools are used at {info.organizationName}. This step lists the third-party apps your staff have connected to their work accounts, so the audit can show which AI tools have access to company data. It takes one click and installs nothing.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {[{ icon: Eye, t: "Read only", b: "We cannot change, delete or send anything." }, { icon: LockKeyhole, t: "Encrypted", b: "Access tokens are encrypted at rest and never shown to anyone." }, { icon: ShieldCheck, t: "Revocable", b: "You can revoke access in your admin console at any time." }].map((c) => (
              <div key={c.t} className="rounded-lg border border-border bg-card p-4">
                <c.icon className="size-5 text-brand-accent" />
                <p className="mt-2 font-medium">{c.t}</p>
                <p className="mt-1 text-sm text-muted-foreground">{c.b}</p>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-border bg-card p-5">
            <p className="font-medium">What we read</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {WHAT_WE_READ.map((w) => <li key={w} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-success" />{w}</li>)}
            </ul>
          </div>

          {info.existing.length > 0 && (
            <p className="rounded-md border border-success/30 bg-success/5 px-3 py-2 text-sm">
              Already connected: {info.existing.map((e) => `${e.provider === "google" ? "Google Workspace" : e.provider === "microsoft" ? "Microsoft 365" : "demo"}${e.adminEmail ? ` (${e.adminEmail})` : ""}`).join(", ")}. You can connect another provider or close this page.
            </p>
          )}

          <div className="space-y-3">
            <p className="font-medium">Which suite does {info.organizationName} use? You need to be an administrator of it.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button size="lg" className="h-12 justify-start" onClick={() => start("google")} disabled={!info.providers.google || state === "starting"}>
                <GoogleGlyph /> Connect Google Workspace
              </Button>
              <Button size="lg" className="h-12 justify-start" onClick={() => start("microsoft")} disabled={!info.providers.microsoft || state === "starting"}>
                <MicrosoftGlyph /> Connect Microsoft 365
              </Button>
            </div>
            {!info.providers.google && !info.providers.microsoft && (
              <p className="text-sm text-muted-foreground">Live connectors are not switched on for this audit yet. {info.providers.demo ? "You can run a demonstration with fictional data instead." : "Ask the person who sent this link."}</p>
            )}
            {info.providers.demo && (
              <Button variant="outline" onClick={() => start("demo")} disabled={state === "starting"}>Run a demo scan with fictional data</Button>
            )}
            {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          </div>

          <p className="text-xs leading-relaxed text-muted-foreground">
            Google Workspace: you will be asked to sign in as an admin and approve the Admin SDK read-only scopes. Microsoft 365: you will be asked to grant tenant-wide read consent (Directory.Read.All). Both can be revoked from your admin console.
          </p>
        </div>
      )}
    </div>
  );
}

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden><path fill="currentColor" d="M12 11v2.8h4.6c-.2 1.2-1.4 3.5-4.6 3.5a5.3 5.3 0 1 1 0-10.6c1.7 0 2.8.7 3.4 1.3l2.3-2.2A8.6 8.6 0 0 0 12 3.5a8.5 8.5 0 1 0 0 17c4.9 0 8.2-3.5 8.2-8.3 0-.6-.1-1-.1-1.4H12Z" /></svg>
  );
}
function MicrosoftGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden><path fill="currentColor" d="M3 3h8.5v8.5H3zm9.5 0H21v8.5h-8.5zM3 12.5h8.5V21H3zm9.5 0H21V21h-8.5z" /></svg>
  );
}
