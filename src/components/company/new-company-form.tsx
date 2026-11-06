"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { InlineError, Panel } from "@/components/app/primitives";

const INDUSTRIES = ["Healthcare", "Dental", "Legal", "Accounting", "Financial services", "Real estate", "Construction", "Manufacturing", "Retail", "Hospitality", "Professional services", "Marketing agency", "Software", "Education", "Nonprofit", "Other"];

export function NewCompanyForm() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", industry: "", employeeCount: "", contactName: "", contactEmail: "", website: "", hasEUexposure: false });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const res = await fetch("/api/organizations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name.trim(),
        industry: form.industry.trim(),
        employeeCount: Number(form.employeeCount),
        hasEUexposure: form.hasEUexposure,
        contactName: form.contactName.trim() || undefined,
        contactEmail: form.contactEmail.trim() || undefined,
        website: form.website.trim() || undefined,
      }),
    });
    const body = await res.json().catch(() => null);
    setPending(false);
    if (!res.ok || !body?.success) {
      setError(body?.error === "Validation failed" ? "Check the fields: name, industry and a headcount of at least 1 are required." : body?.error ?? "Could not create the company.");
      return;
    }
    router.push(`/app/companies/${body.data.id}/profile`);
  }

  return (
    <Panel>
      <form onSubmit={submit} className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="name">Company name</Label>
            <Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Northwind Dental Group" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="industry">Industry</Label>
            <Input id="industry" required list="industries" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} placeholder="Dental" />
            <datalist id="industries">{INDUSTRIES.map((i) => <option key={i} value={i} />)}</datalist>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="employees">Employees</Label>
            <Input id="employees" type="number" min={1} max={1000000} required inputMode="numeric" value={form.employeeCount} onChange={(e) => setForm({ ...form, employeeCount: e.target.value })} placeholder="45" />
            <p className="text-xs text-muted-foreground">Drives per-employee pricing and the plan recommendation.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contactName">Owner or main contact</Label>
            <Input id="contactName" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} autoComplete="off" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contactEmail">Contact email</Label>
            <Input id="contactEmail" type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} autoComplete="off" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="website">Website</Label>
            <Input id="website" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="northwinddental.com" />
          </div>
        </div>
        <label className="flex items-start gap-3 rounded-md border border-border p-3 text-sm">
          <Switch checked={form.hasEUexposure} onCheckedChange={(v) => setForm({ ...form, hasEUexposure: Boolean(v) })} />
          <span>
            <span className="font-medium">Serves customers in the EU</span>
            <span className="block text-xs text-muted-foreground">Adds the EU AI Act appendix to the report.</span>
          </span>
        </label>
        {error && <InlineError>{error}</InlineError>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" disabled={pending}>{pending ? "Creating" : "Create company"}</Button>
        </div>
      </form>
    </Panel>
  );
}
