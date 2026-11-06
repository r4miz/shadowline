"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { InlineError, Panel, SectionTitle } from "@/components/app/primitives";
import { AI_CATALOG } from "@/lib/ai-catalog";
import { DATA_TYPE_LABELS } from "@/lib/documents/report";
import { PROFILE_DATA_TYPES, PROFILE_PRIORITIES, PROFILE_PRIORITY_LABELS } from "@/lib/validation";

interface OrgFields {
  name: string;
  industry: string;
  employeeCount: number;
  hasEUexposure: boolean;
  contactName: string;
  contactEmail: string;
  website: string;
}
interface ProfileFields {
  suite: "google" | "microsoft" | "both" | "none" | "unknown";
  dataTypes: string[];
  providedTools: string[];
  hasWrittenPolicy: boolean | null;
  remoteWork: string | null;
  priorities: string[];
  currentAiSpendCents: number | null;
  notes: string | null;
}

const SUITE_OPTIONS = [
  { value: "google", label: "Google Workspace", hint: "Gmail, Drive, Docs" },
  { value: "microsoft", label: "Microsoft 365", hint: "Outlook, Teams, SharePoint" },
  { value: "both", label: "Both", hint: "Mixed or mid-migration" },
  { value: "none", label: "Neither", hint: "Personal email, other tools" },
] as const;

const PROVIDED_TOOL_OPTIONS = AI_CATALOG.filter((c) => c.teamPlanKey || c.key === "github_copilot" || c.key === "grammarly");

export function ProfileForm({ organizationId, organization, profile }: { organizationId: string; organization: OrgFields; profile: ProfileFields | null }) {
  const router = useRouter();
  const [org, setOrg] = useState({ ...organization, employeeCount: String(organization.employeeCount) });
  const [p, setP] = useState<ProfileFields>(
    profile ?? { suite: "unknown", dataTypes: [], providedTools: [], hasWrittenPolicy: null, remoteWork: null, priorities: [], currentAiSpendCents: null, notes: null }
  );
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  function toggle(list: string[], value: string) {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setState("saving");
    setError(null);
    const [orgRes, profRes] = await Promise.all([
      fetch(`/api/organizations/${organizationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: org.name.trim(),
          industry: org.industry.trim(),
          employeeCount: Number(org.employeeCount),
          hasEUexposure: org.hasEUexposure,
          contactName: org.contactName.trim(),
          contactEmail: org.contactEmail.trim(),
          website: org.website.trim(),
        }),
      }),
      fetch(`/api/organizations/${organizationId}/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          suite: p.suite,
          dataTypes: p.dataTypes,
          providedTools: p.providedTools,
          hasWrittenPolicy: p.hasWrittenPolicy,
          remoteWork: p.remoteWork,
          priorities: p.priorities,
          currentAiSpendCents: p.currentAiSpendCents,
          notes: p.notes,
        }),
      }),
    ]);
    if (!orgRes.ok || !profRes.ok) {
      setError("Could not save. Check the headcount and email fields.");
      setState("idle");
      return;
    }
    setState("saved");
    router.refresh();
    setTimeout(() => setState("idle"), 1500);
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <Panel className="space-y-5">
        <SectionTitle title="The company" />
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="name">Company name</Label>
            <Input id="name" required value={org.name} onChange={(e) => setOrg({ ...org, name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="industry">Industry</Label>
            <Input id="industry" required value={org.industry} onChange={(e) => setOrg({ ...org, industry: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="employees">Employees</Label>
            <Input id="employees" type="number" min={1} required inputMode="numeric" value={org.employeeCount} onChange={(e) => setOrg({ ...org, employeeCount: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contactName">Owner or main contact</Label>
            <Input id="contactName" value={org.contactName} onChange={(e) => setOrg({ ...org, contactName: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contactEmail">Contact email</Label>
            <Input id="contactEmail" type="email" value={org.contactEmail} onChange={(e) => setOrg({ ...org, contactEmail: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="website">Website</Label>
            <Input id="website" value={org.website} onChange={(e) => setOrg({ ...org, website: e.target.value })} />
          </div>
          <label className="flex items-center gap-3 rounded-md border border-border p-3 text-sm">
            <Switch checked={org.hasEUexposure} onCheckedChange={(v) => setOrg({ ...org, hasEUexposure: Boolean(v) })} />
            Serves customers in the EU
          </label>
        </div>
      </Panel>

      <Panel className="space-y-5">
        <SectionTitle title="Which office suite runs the company?" description="Ask: where does your email live? This decides whether Gemini or Copilot is already included." />
        <RadioGroup value={p.suite === "unknown" ? null : p.suite} onValueChange={(v) => setP({ ...p, suite: v as ProfileFields["suite"] })} className="grid gap-2 sm:grid-cols-2">
          {SUITE_OPTIONS.map((o) => (
            <label key={o.value} htmlFor={`suite-${o.value}`} className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3 text-sm has-data-checked:border-foreground has-data-checked:bg-secondary/50">
              <RadioGroupItem id={`suite-${o.value}`} value={o.value} className="mt-0.5" />
              <span>
                <span className="block font-medium">{o.label}</span>
                <span className="block text-xs text-muted-foreground">{o.hint}</span>
              </span>
            </label>
          ))}
        </RadioGroup>
      </Panel>

      <Panel className="space-y-5">
        <SectionTitle title="What sensitive information does the business handle?" description="Ask: what would be a disaster if it ended up in a chatbot? Regulated types turn on the compliance checks." />
        <div className="grid gap-2 sm:grid-cols-2">
          {PROFILE_DATA_TYPES.map((d) => (
            <label key={d} htmlFor={`dt-${d}`} className="flex cursor-pointer items-center gap-3 rounded-md border border-border p-3 text-sm has-data-checked:border-foreground has-data-checked:bg-secondary/50">
              <Checkbox id={`dt-${d}`} checked={p.dataTypes.includes(d)} onCheckedChange={() => setP({ ...p, dataTypes: toggle(p.dataTypes, d) })} />
              <span className="capitalize">{DATA_TYPE_LABELS[d]}</span>
            </label>
          ))}
        </div>
      </Panel>

      <Panel className="space-y-5">
        <SectionTitle title="Which AI tools does the company already provide?" description="Only tools with company-paid accounts. Anything staff use on their own is shadow AI and will show up in the survey." />
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {PROVIDED_TOOL_OPTIONS.map((c) => (
            <label key={c.key} htmlFor={`pt-${c.key}`} className="flex cursor-pointer items-center gap-3 rounded-md border border-border p-3 text-sm has-data-checked:border-foreground has-data-checked:bg-secondary/50">
              <Checkbox id={`pt-${c.key}`} checked={p.providedTools.includes(c.key)} onCheckedChange={() => setP({ ...p, providedTools: toggle(p.providedTools, c.key) })} />
              <span>
                <span className="block font-medium">{c.name}</span>
                <span className="block text-xs text-muted-foreground">{c.vendor}</span>
              </span>
            </label>
          ))}
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Is there a written AI policy today?</Label>
            <RadioGroup value={p.hasWrittenPolicy === null ? null : p.hasWrittenPolicy ? "yes" : "no"} onValueChange={(v) => setP({ ...p, hasWrittenPolicy: v === "yes" })} className="flex gap-4">
              <label htmlFor="pol-yes" className="flex items-center gap-2 text-sm"><RadioGroupItem id="pol-yes" value="yes" /> Yes</label>
              <label htmlFor="pol-no" className="flex items-center gap-2 text-sm"><RadioGroupItem id="pol-no" value="no" /> No</label>
            </RadioGroup>
          </div>
          <div className="space-y-2">
            <Label>How do people work?</Label>
            <RadioGroup value={p.remoteWork} onValueChange={(v) => setP({ ...p, remoteWork: v as string })} className="flex flex-wrap gap-4">
              {[["office", "In the office"], ["hybrid", "Hybrid"], ["remote", "Remote"]].map(([v, l]) => (
                <label key={v} htmlFor={`rw-${v}`} className="flex items-center gap-2 text-sm"><RadioGroupItem id={`rw-${v}`} value={v} /> {l}</label>
              ))}
            </RadioGroup>
          </div>
        </div>
      </Panel>

      <Panel className="space-y-5">
        <SectionTitle title="What matters most to the owner?" description="Pick up to three. These tilt the platform recommendation." />
        <div className="flex flex-wrap gap-2">
          {PROFILE_PRIORITIES.map((pr) => {
            const on = p.priorities.includes(pr);
            return (
              <button
                key={pr}
                type="button"
                aria-pressed={on}
                onClick={() => setP({ ...p, priorities: on ? p.priorities.filter((x) => x !== pr) : p.priorities.length >= 3 ? p.priorities : [...p.priorities, pr] })}
                className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${on ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground/40"}`}
              >
                {PROFILE_PRIORITY_LABELS[pr]}
              </button>
            );
          })}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="notes">Notes from the conversation</Label>
          <Textarea id="notes" value={p.notes ?? ""} onChange={(e) => setP({ ...p, notes: e.target.value || null })} placeholder="Anything the owner said that should shape the policy or the report." />
        </div>
      </Panel>

      {error && <InlineError>{error}</InlineError>}
      <div className="flex items-center justify-end gap-3">
        {state === "saved" && <span className="text-sm text-success">Saved</span>}
        <Button type="submit" disabled={state === "saving"}>{state === "saving" ? "Saving" : "Save profile"}</Button>
      </div>
    </form>
  );
}
