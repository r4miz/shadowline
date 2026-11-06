"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FindingDialog } from "@/components/findings/finding-dialog";
import { RagBadge } from "@/components/findings/rag-badge";
import { EFFORT_LABELS, type RiskFinding } from "@/components/findings/types";

type FetchState = "loading" | "ready" | "error";

export function FindingsPanel({ engagementId }: { engagementId: string }) {
  const [findings, setFindings] = useState<RiskFinding[]>([]);
  const [state, setState] = useState<FetchState>("loading");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RiskFinding | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [busy, setBusy] = useState(false);

  const fetchFindings = useCallback(async () => {
    setState("loading");
    try {
      const res = await fetch(`/api/engagements/${engagementId}/findings`);
      const json = await res.json();
      if (!res.ok || !json.success)
        throw new Error(json.error ?? "Failed to load");
      setFindings(json.data as RiskFinding[]);
      setState("ready");
    } catch {
      setState("error");
    }
  }, [engagementId]);

  useEffect(() => {
    queueMicrotask(() => {
      fetchFindings();
    });
  }, [fetchFindings]);

  const counts = findings.reduce(
    (acc, f) => {
      acc[f.ragRating] += 1;
      return acc;
    },
    { red: 0, amber: 0, green: 0 }
  );

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await fetch(
        `/api/engagements/${engagementId}/findings/generate`,
        { method: "POST" }
      );
      const json = await res.json();
      if (!res.ok || !json.success)
        throw new Error(json.error ?? "Failed to generate");
      setFindings(json.data as RiskFinding[]);
      setState("ready");
    } catch {
      setState("error");
    } finally {
      setGenerating(false);
    }
  }

  async function handleDelete(id: string) {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }
    setConfirmDeleteId(null);
    try {
      const res = await fetch(
        `/api/engagements/${engagementId}/findings/${id}`,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error();
      await fetchFindings();
    } catch {
      setState("error");
    }
  }

  // Move a finding up/down and persist the new roadmap order.
  async function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= findings.length || busy) return;
    const next = [...findings];
    [next[index], next[target]] = [next[target], next[index]];
    setFindings(next); // optimistic
    setBusy(true);
    try {
      const res = await fetch(
        `/api/engagements/${engagementId}/findings/reorder`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: next.map((f) => f.id) }),
        }
      );
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error();
      setFindings(json.data as RiskFinding[]);
    } catch {
      await fetchFindings(); // revert to server truth
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-heading text-lg font-semibold tracking-tight">Risk findings</h2>
          <p className="text-sm text-muted-foreground">
            {findings.length === 0
              ? "Scored from the survey, the IT deep-dive and the tool inventory. Edit, reorder or add your own."
              : `${counts.red} high · ${counts.amber} moderate · ${counts.green} low`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? "Scoring" : "Score from evidence"}
          </Button>
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            Add finding
          </Button>
        </div>
      </div>

      {findings.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Roadmap order is impact-weighted. Scoring again refreshes automatic findings and keeps anything you added or edited.
        </p>
      )}

      {state === "loading" && (
        <p className="text-sm text-muted-foreground">Loading findings</p>
      )}

      {state === "error" && (
        <p className="text-sm text-destructive">
          Something went wrong.{" "}
          <button
            type="button"
            className="underline"
            onClick={() => fetchFindings()}
          >
            Try again
          </button>
        </p>
      )}

      {state === "ready" && findings.length === 0 && (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          No findings yet. Click <span className="font-medium">Score from evidence</span> once the survey or inventory has data, or add one by hand.
        </p>
      )}

      {state === "ready" && findings.length > 0 && (
        <ol className="space-y-3">
          {findings.map((f, i) => (
            <li
              key={f.id}
              className="rounded-lg border p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-xs text-muted-foreground">
                      #{f.priorityRank ?? i + 1}
                    </span>
                    <button
                      type="button"
                      aria-label="Move up"
                      disabled={i === 0 || busy}
                      onClick={() => move(i, -1)}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      aria-label="Move down"
                      disabled={i === findings.length - 1 || busy}
                      onClick={() => move(i, 1)}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                    >
                      ▼
                    </button>
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <RagBadge rag={f.ragRating} />
                      <span className="font-medium">{f.title}</span>
                      {f.origin === "manual" && (
                        <Badge variant="outline">Edited</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {f.description}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditing(f);
                      setDialogOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant={confirmDeleteId === f.id ? "destructive" : "outline"}
                    size="sm"
                    onClick={() => handleDelete(f.id)}
                  >
                    {confirmDeleteId === f.id ? "Confirm?" : "Delete"}
                  </Button>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="secondary">
                  L{f.likelihood} × I{f.impact} = {f.likelihood * f.impact}
                </Badge>
                <Badge variant="outline">{EFFORT_LABELS[f.effort]}</Badge>
                <Badge variant="outline">NIST {f.nistFunction}</Badge>
                {f.owaspRefs.map((ref) => (
                  <Badge key={ref} variant="outline">
                    {ref}
                  </Badge>
                ))}
              </div>

              <p className="mt-2 text-sm">
                <span className="font-medium">Recommendation: </span>
                {f.recommendation}
              </p>
            </li>
          ))}
        </ol>
      )}

      <FindingDialog
        engagementId={engagementId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        finding={editing}
        onSaved={fetchFindings}
      />
    </div>
  );
}
