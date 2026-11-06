"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ragFromScore, riskScore } from "@/lib/scoring";
import {
  EFFORTS,
  EFFORT_LABELS,
  NIST_FUNCTIONS,
  OWASP_LLM_REFS,
  type Effort,
  type NistFunction,
  type RiskFinding,
} from "@/components/findings/types";

interface FormState {
  title: string;
  description: string;
  likelihood: number;
  impact: number;
  nistFunction: NistFunction;
  owaspRefs: string[];
  recommendation: string;
  effort: Effort;
}

const EMPTY_FORM: FormState = {
  title: "",
  description: "",
  likelihood: 3,
  impact: 3,
  nistFunction: "GOVERN",
  owaspRefs: [],
  recommendation: "",
  effort: "med",
};

function toFormState(finding: RiskFinding | null): FormState {
  if (!finding) return EMPTY_FORM;
  return {
    title: finding.title,
    description: finding.description,
    likelihood: finding.likelihood,
    impact: finding.impact,
    nistFunction: finding.nistFunction,
    owaspRefs: finding.owaspRefs,
    recommendation: finding.recommendation,
    effort: finding.effort,
  };
}

const SCALE = [1, 2, 3, 4, 5];

export function FindingDialog({
  engagementId,
  open,
  onOpenChange,
  finding,
  onSaved,
}: {
  engagementId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  finding: RiskFinding | null;
  onSaved: () => void | Promise<void>;
}) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [aiDrafting, setAiDrafting] = useState(false);
  const [aiNote, setAiNote] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      queueMicrotask(() => {
        setForm(toFormState(finding));
        setError(null);
        setAiNote(null);
      });
    }
  }, [open, finding]);

  const isEdit = Boolean(finding);

  async function draftWithAI() {
    if (!form.title.trim() || !form.description.trim()) {
      setAiNote("Add a title and description first so the draft has context.");
      return;
    }
    setAiNote(null);
    setAiDrafting(true);
    try {
      const ragRating = ragFromScore(riskScore(form.likelihood, form.impact));
      const res = await fetch(
        `/api/engagements/${engagementId}/findings/ai-draft`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: form.title.trim(),
            description: form.description.trim(),
            ragRating,
            nistFunction: form.nistFunction,
            owaspRefs: form.owaspRefs,
          }),
        }
      );
      const json = await res.json();
      if (res.status === 503) {
        setAiNote(json.message ?? "AI-assisted drafting is not configured.");
        return;
      }
      if (!res.ok || !json.success) throw new Error(json.error ?? "Failed");
      setForm((f) => ({ ...f, recommendation: json.data.recommendation }));
      setAiNote("AI-drafted. Review and edit before relying on it.");
    } catch {
      setAiNote("Couldn't draft a recommendation. Try again.");
    } finally {
      setAiDrafting(false);
    }
  }

  function toggleOwasp(ref: string) {
    setForm((f) => ({
      ...f,
      owaspRefs: f.owaspRefs.includes(ref)
        ? f.owaspRefs.filter((r) => r !== ref)
        : [...f.owaspRefs, ref].sort(),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.title.trim()) return setError("Title is required.");
    if (!form.description.trim()) return setError("Description is required.");
    if (!form.recommendation.trim())
      return setError("Recommendation is required.");

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      likelihood: form.likelihood,
      impact: form.impact,
      nistFunction: form.nistFunction,
      owaspRefs: form.owaspRefs,
      recommendation: form.recommendation.trim(),
      effort: form.effort,
    };

    setSubmitting(true);
    try {
      const url = isEdit
        ? `/api/engagements/${engagementId}/findings/${finding!.id}`
        : `/api/engagements/${engagementId}/findings`;
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success)
        throw new Error(json.error ?? "Failed to save finding");
      await onSaved();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save finding");
    } finally {
      setSubmitting(false);
    }
  }

  const risk = form.likelihood * form.impact;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit finding" : "Add finding"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="finding-title">Title</Label>
            <Input
              id="finding-title"
              value={form.title}
              onChange={(e) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="finding-description">Description</Label>
            <Textarea
              id="finding-description"
              value={form.description}
              rows={3}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="finding-likelihood">Likelihood (1 to 5)</Label>
              <Select
                value={String(form.likelihood)}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, likelihood: Number(v) }))
                }
              >
                <SelectTrigger id="finding-likelihood" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCALE.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="finding-impact">Impact (1 to 5)</Label>
              <Select
                value={String(form.impact)}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, impact: Number(v) }))
                }
              >
                <SelectTrigger id="finding-impact" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCALE.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Risk score = {form.likelihood} × {form.impact} ={" "}
            <span className="font-medium text-foreground">{risk}</span>. The RAG
            rating is recalculated from this score automatically.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="finding-nist">NIST function</Label>
              <Select
                value={form.nistFunction}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, nistFunction: v as NistFunction }))
                }
              >
                <SelectTrigger id="finding-nist" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NIST_FUNCTIONS.map((fn) => (
                    <SelectItem key={fn} value={fn}>
                      {fn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="finding-effort">Effort</Label>
              <Select
                value={form.effort}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, effort: v as Effort }))
                }
              >
                <SelectTrigger id="finding-effort" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EFFORTS.map((ef) => (
                    <SelectItem key={ef} value={ef}>
                      {EFFORT_LABELS[ef]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>OWASP LLM refs</Label>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {OWASP_LLM_REFS.map((ref) => (
                <label
                  key={ref}
                  className="flex items-center gap-1.5 text-sm font-normal"
                >
                  <Checkbox
                    checked={form.owaspRefs.includes(ref)}
                    onCheckedChange={() => toggleOwasp(ref)}
                  />
                  {ref}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="finding-recommendation">Recommendation</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void draftWithAI()}
                disabled={aiDrafting}
              >
                {aiDrafting ? "Drafting" : "Draft with AI"}
              </Button>
            </div>
            <Textarea
              id="finding-recommendation"
              value={form.recommendation}
              rows={3}
              onChange={(e) =>
                setForm((f) => ({ ...f, recommendation: e.target.value }))
              }
            />
            {aiNote && (
              <p className="text-xs text-muted-foreground">{aiNote}</p>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting
                ? "Saving"
                : isEdit
                  ? "Save changes"
                  : "Add finding"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
