"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandMark } from "@/components/brand-mark";
import { brand } from "@/lib/brand";

interface PolicyInfo {
  organizationName: string;
  version: number;
  publishedAt: string;
  pinnedEmail: string | null;
  html: string;
}

export function SignClient({ token }: { token: string }) {
  const [info, setInfo] = useState<PolicyInfo | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "invalid" | "submitting" | "signed">("loading");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [agree, setAgree] = useState(false);
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const docRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/sign?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (!json.success) throw new Error();
        setInfo(json.data);
        if (json.data.pinnedEmail) setEmail(json.data.pinnedEmail);
        setState("ready");
      })
      .catch(() => !cancelled && setState("invalid"));
    return () => {
      cancelled = true;
    };
  }, [token]);

  function onScroll() {
    const el = docRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) setScrolledToEnd(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("submitting");
    setError(null);
    const res = await fetch("/api/sign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, name, email, agree: true }) });
    const json = await res.json().catch(() => null);
    if (res.ok && json?.success) {
      setState("signed");
      return;
    }
    setState("ready");
    if (json?.error === "already_signed") setError("This policy version has already been signed for that email address.");
    else if (json?.error === "not_on_roster") setError("That email is not on the sign-off list yet. Use the personal link you were sent, or ask your company to add you.");
    else if (json?.error === "invalid_or_expired") setError("This link is no longer valid. Ask your company for a new one.");
    else setError("Could not record your signature. Check your name and email and try again.");
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-5 py-10 sm:py-14">
      <div className="flex items-center gap-2.5">
        <BrandMark className="size-7 text-foreground" />
        <span className="font-heading text-lg font-semibold">{brand.name}</span>
      </div>

      {state === "loading" && <p className="mt-10 text-sm text-muted-foreground">Loading the policy</p>}
      {state === "invalid" && (
        <div className="mt-10 rounded-lg border border-border bg-card p-6">
          <h1 className="font-heading text-xl font-semibold">This link is no longer valid</h1>
          <p className="mt-2 text-sm text-muted-foreground">It may have expired or a newer policy version may have been published. Ask your company for a fresh link.</p>
        </div>
      )}

      {state === "signed" && info && (
        <div className="mt-10 rounded-lg border border-border bg-card p-8 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-success/15 text-success"><Check className="size-7" /></div>
          <h1 className="mt-5 font-heading text-2xl font-semibold">Signed</h1>
          <p className="mt-2 text-sm text-muted-foreground">Thank you. Your confirmation of the {info.organizationName} AI Acceptable Use Policy (version {info.version}) has been recorded. You can close this page.</p>
        </div>
      )}

      {info && (state === "ready" || state === "submitting") && (
        <div className="mt-10 space-y-6">
          <div>
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{info.organizationName} · version {info.version}</p>
            <h1 className="mt-2 font-heading text-3xl font-semibold leading-tight">Please read and confirm the AI Acceptable Use Policy</h1>
            <p className="mt-3 text-base text-muted-foreground">It explains which AI tools are approved at {info.organizationName}, what information may be used with them, and who to ask when unsure. Scroll to the end, then confirm below.</p>
          </div>

          <div
            ref={docRef}
            onScroll={onScroll}
            className="policy-doc max-h-[60vh] overflow-y-auto rounded-lg border border-border bg-card p-6 sm:p-8"
            // Server-rendered from our own Markdown with every text node escaped (see lib/documents/markdown.ts).
            dangerouslySetInnerHTML={{ __html: info.html }}
          />
          <style>{`
            .policy-doc h1 { font-family: var(--font-heading); font-size: 1.6rem; font-weight: 600; margin: 0 0 .5rem; }
            .policy-doc h2 { font-family: var(--font-heading); font-size: 1.15rem; font-weight: 600; margin: 1.5rem 0 .5rem; border-top: 1px solid var(--border); padding-top: .9rem; }
            .policy-doc p { margin: .5rem 0; line-height: 1.6; font-size: .95rem; }
            .policy-doc ul { padding-left: 1.2rem; margin: .5rem 0; } .policy-doc li { margin: .2rem 0; font-size: .95rem; }
            .policy-doc blockquote, .policy-doc p:has(> em:only-child) { color: var(--muted-foreground); font-size: .85rem; }
            .policy-doc hr { border: 0; border-top: 1px solid var(--border); margin: 1rem 0; }
            .policy-doc strong { font-weight: 600; }
          `}</style>

          <form onSubmit={submit} className="space-y-4 rounded-lg border border-border bg-card p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="name">Your full name</Label>
                <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className="text-base" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Your work email</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" readOnly={Boolean(info.pinnedEmail)} className="text-base" />
                {info.pinnedEmail && <p className="text-xs text-muted-foreground">This link was sent to you personally.</p>}
              </div>
            </div>
            <label htmlFor="agree" className="flex items-start gap-3 rounded-md border border-border p-3 text-sm">
              <Checkbox id="agree" checked={agree} onCheckedChange={(v) => setAgree(v === true)} className="mt-0.5" />
              <span>I have read the AI Acceptable Use Policy for {info.organizationName} and I agree to follow it.</span>
            </label>
            {!scrolledToEnd && <p className="text-xs text-muted-foreground">Scroll through the whole policy to enable the confirm button.</p>}
            {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
            <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={!agree || !scrolledToEnd || !name.trim() || !email.trim() || state === "submitting"}>
              {state === "submitting" ? "Recording" : "Confirm and sign"}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
