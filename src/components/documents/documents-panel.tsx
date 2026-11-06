"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type GeneratedDocType = "report" | "aup" | "exec_readout" | "ai_plan";

interface PolicyDocument {
  id: string;
  type: GeneratedDocType;
  version: number;
  generatedAt: string;
}

const LABELS: Record<GeneratedDocType, string> = {
  report: "AI Risk Report",
  aup: "AI Acceptable Use Policy",
  exec_readout: "Executive Readout",
  ai_plan: "AI Platform Recommendation",
};

const DESCRIPTIONS: Record<GeneratedDocType, string> = {
  report: "The full picture: what staff use, what is connected, what it costs, what to fix first.",
  aup: "The rules, written for this company. Publish it on the Sign-off stage.",
  exec_readout: "One page for the owner: posture, the numbers that matter, next steps.",
  ai_plan: "Which team AI plan fits, why, and what it costs, with dated prices.",
};

const ORDER: GeneratedDocType[] = ["report", "exec_readout", "aup", "ai_plan"];

type FetchState = "loading" | "ready" | "error";

export function DocumentsPanel({ engagementId }: { engagementId: string }) {
  const [docs, setDocs] = useState<PolicyDocument[]>([]);
  const [state, setState] = useState<FetchState>("loading");
  const [generating, setGenerating] = useState(false);

  const fetchDocs = useCallback(async () => {
    setState("loading");
    try {
      const res = await fetch(`/api/engagements/${engagementId}/documents`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error();
      setDocs(json.data as PolicyDocument[]);
      setState("ready");
    } catch {
      setState("error");
    }
  }, [engagementId]);

  useEffect(() => {
    queueMicrotask(() => {
      fetchDocs();
    });
  }, [fetchDocs]);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await fetch(
        `/api/engagements/${engagementId}/documents/generate`,
        { method: "POST" }
      );
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error();
      setDocs(json.data as PolicyDocument[]);
      setState("ready");
    } catch {
      setState("error");
    } finally {
      setGenerating(false);
    }
  }

  const byType = new Map(docs.map((d) => [d.type, d]));
  const hasAny = docs.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-heading text-lg font-semibold tracking-tight">Documents</h2>
          <p className="text-sm text-muted-foreground">
            Four documents generated from this audit. Open in a new tab to print or save as PDF, or download Markdown to edit.
          </p>
        </div>
        <Button onClick={handleGenerate} disabled={generating}>
          {generating
            ? "Generating"
            : hasAny
              ? "Regenerate documents"
              : "Generate documents"}
        </Button>
      </div>

      {state === "loading" && (
        <p className="text-sm text-muted-foreground">Loading documents</p>
      )}

      {state === "error" && (
        <p className="text-sm text-destructive">
          Something went wrong.{" "}
          <button type="button" className="underline" onClick={fetchDocs}>
            Try again
          </button>
        </p>
      )}

      {state === "ready" && !hasAny && (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          No documents yet. Click <span className="font-medium">Generate documents</span> to produce them from the findings, inventory and recommendation.
        </p>
      )}

      {state === "ready" && hasAny && (
        <ul className="divide-y rounded-lg border">
          {ORDER.map((type) => {
            const doc = byType.get(type);
            const base = `/api/engagements/${engagementId}/documents/${type}/download`;
            return (
              <li
                key={type}
                className="flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div>
                  <p className="font-medium">{LABELS[type]}</p>
                  <p className="text-xs text-muted-foreground">{DESCRIPTIONS[type]}</p>
                  {doc ? (
                    <p className="text-xs text-muted-foreground">
                      v{doc.version} ·{" "}
                      {new Date(doc.generatedAt).toLocaleString()}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Not generated
                    </p>
                  )}
                </div>
                {doc && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      nativeButton={false}
                      render={
                        <a href={`${base}?format=view`} target="_blank" rel="noreferrer" />
                      }
                    >
                      View / Print
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      nativeButton={false}
                      render={<a href={`${base}?format=md`} />}
                    >
                      .md
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      nativeButton={false}
                      render={<a href={`${base}?format=html`} />}
                    >
                      .html
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
