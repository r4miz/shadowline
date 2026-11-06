"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { CopyField } from "@/components/app/copy-field";
import { EmptyState, InlineError, InlineNote, Panel, Pill, SectionTitle, Stat, fmtDate } from "@/components/app/primitives";

interface Ack {
  id: string;
  name: string | null;
  email: string;
  status: "pending" | "signed";
  invitedAt: string;
  signedAt: string | null;
  documentVersion: number | null;
}
interface Summary {
  published: { id: string; version: number; publishedAt: string } | null;
  total: number;
  signed: number;
  pending: number;
  overdue: number;
  acknowledgements: Ack[];
  url: string | null;
}

export function SignoffPanel({ engagementId, hasDocuments, companyId }: { engagementId: string; hasDocuments: boolean; companyId: string }) {
  const router = useRouter();
  const [data, setData] = useState<Summary | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [emails, setEmails] = useState("");
  const [sendEmails, setSendEmails] = useState(false);
  const [personalLinks, setPersonalLinks] = useState<Array<{ email: string; url: string; delivered: boolean }>>([]);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/engagements/${engagementId}/signoff`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error();
      setData(json.data);
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

  async function publish() {
    setBusy("publish");
    setError(null);
    try {
      const res = await fetch(`/api/engagements/${engagementId}/signoff`, { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error === "generate_documents_first" ? "Generate the documents first." : "Could not publish.");
      await load();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not publish.");
    } finally {
      setBusy(null);
    }
  }

  async function invite() {
    const list = emails.split(/[\s,;]+/).map((e) => e.trim()).filter(Boolean);
    if (list.length === 0) return;
    setBusy("invite");
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/engagements/${engagementId}/signoff`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails: list, sendEmails }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error === "Validation failed" ? "One or more addresses are not valid emails." : "Could not add signers.");
      const results = json.data.results as Array<{ email: string; delivered: boolean; url: string }>;
      const delivered = results.filter((r) => r.delivered).length;
      setNotice(sendEmails ? `${results.length} added. ${delivered} email${delivered === 1 ? "" : "s"} sent${delivered < results.length ? "; the rest need the link sent by hand (email not configured)." : "."}` : `${results.length} added to the roster. Send them the link below.`);
      setPersonalLinks(results);
      setEmails("");
      await load();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add signers.");
    } finally {
      setBusy(null);
    }
  }

  if (state === "loading") return <p className="text-sm text-muted-foreground">Loading</p>;
  if (state === "error" || !data) return <InlineError>Could not load sign-off data.</InlineError>;

  if (!hasDocuments) {
    return (
      <EmptyState
        title="Generate the documents first"
        body="The policy is one of the four generated documents. Once it exists you can publish a version here for staff to sign."
        action={<Button nativeButton={false} render={<Link href={`/app/companies/${companyId}/documents`} />}>Go to documents</Button>}
      />
    );
  }

  const pct = data.total ? Math.round((data.signed / data.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Published" value={data.published ? `v${data.published.version}` : "Not yet"} hint={data.published ? `on ${fmtDate(data.published.publishedAt)}` : "Publish to open signing"} tone={data.published ? "good" : "warn"} />
        <Stat label="Signed" value={`${data.signed}/${data.total}`} hint={`${pct}% of the roster`} tone={data.total && data.signed === data.total ? "good" : "default"} />
        <Stat label="Pending" value={data.pending} hint="Invited, not yet signed" tone={data.pending ? "warn" : "default"} />
        <Stat label="Overdue" value={data.overdue} hint="Pending more than 14 days" tone={data.overdue ? "bad" : "default"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel className="space-y-4">
          <SectionTitle title="1. Publish the policy" description="Pins the current Acceptable Use Policy version. Regenerating documents later creates a new version; republish when you want staff to sign the new one." />
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={publish} disabled={busy === "publish"}>{data.published ? "Republish latest version" : "Publish policy"}</Button>
            {data.published && <a className="text-sm underline underline-offset-4" href={`/api/engagements/${engagementId}/documents/aup/download?format=view`} target="_blank" rel="noreferrer">Preview policy</a>}
          </div>
          {data.url && <CopyField id="sign-link" label="General sign link (anyone on the roster)" value={data.url} />}
        </Panel>

        <Panel className="space-y-4">
          <SectionTitle title="2. Add signers" description="Paste staff emails, one per line or comma separated. Each person gets a personal link that pins their identity." />
          <div className="space-y-1.5">
            <Label htmlFor="emails">Employee emails</Label>
            <Textarea id="emails" rows={5} value={emails} onChange={(e) => setEmails(e.target.value)} placeholder={"ava@company.com\nben@company.com"} className="font-mono text-xs" disabled={!data.published} />
          </div>
          <label className="flex items-center gap-3 text-sm">
            <Switch checked={sendEmails} onCheckedChange={(v) => setSendEmails(Boolean(v))} disabled={!data.published} />
            Email each person their link now
          </label>
          <Button onClick={invite} disabled={!data.published || busy === "invite" || !emails.trim()}><Send /> {busy === "invite" ? "Adding" : "Add to roster"}</Button>
          {!data.published && <p className="text-xs text-muted-foreground">Publish first.</p>}
        </Panel>
      </div>

      {error && <InlineError>{error}</InlineError>}
      {notice && <InlineNote tone="good">{notice}</InlineNote>}
      {personalLinks.length > 0 && personalLinks.some((l) => !l.delivered) && (
        <Panel className="space-y-2">
          <SectionTitle title="Personal links to send by hand" description="Email is not configured, so copy each link to the right person." />
          <ul className="space-y-2">
            {personalLinks.filter((l) => !l.delivered).map((l) => <li key={l.email}><CopyField id={`pl-${l.email}`} label={l.email} value={l.url} /></li>)}
          </ul>
        </Panel>
      )}

      <section className="space-y-3">
        <SectionTitle title="Roster" />
        {data.acknowledgements.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nobody on the roster yet. Add signers above, or share the general link; anyone who signs through it appears here.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 text-left font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Person</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="hidden px-4 py-2.5 font-medium sm:table-cell">Invited</th>
                  <th className="hidden px-4 py-2.5 font-medium sm:table-cell">Signed</th>
                  <th className="px-4 py-2.5 text-right font-medium">Version</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.acknowledgements.map((a) => (
                  <tr key={a.id}>
                    <td className="px-4 py-3"><p className="font-medium">{a.name ?? <span className="text-muted-foreground">Not signed</span>}</p><p className="text-xs text-muted-foreground">{a.email}</p></td>
                    <td className="px-4 py-3">{a.status === "signed" ? <Pill tone="good">Signed</Pill> : <Pill tone="warn">Pending</Pill>}</td>
                    <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">{fmtDate(a.invitedAt)}</td>
                    <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">{a.signedAt ? fmtDate(a.signedAt) : "n/a"}</td>
                    <td className="px-4 py-3 text-right tabular">{a.documentVersion ? `v${a.documentVersion}` : "n/a"}</td>
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
