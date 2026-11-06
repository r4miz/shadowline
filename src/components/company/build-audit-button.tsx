"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Hammer } from "lucide-react";
import { Button } from "@/components/ui/button";

// Inventory -> findings -> documents in one click. Manual edits are preserved.
export function BuildAuditButton({ engagementId, disabled }: { engagementId: string; disabled?: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "running" | "done" | "error">("idle");
  const [summary, setSummary] = useState<string | null>(null);

  async function run() {
    setState("running");
    setSummary(null);
    try {
      const res = await fetch(`/api/engagements/${engagementId}/pipeline`, { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error();
      setSummary(`${json.data.tools} tools, ${json.data.findings} findings, ${json.data.documents} documents`);
      setState("done");
      router.refresh();
    } catch {
      setState("error");
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button onClick={run} disabled={disabled || state === "running"} title={disabled ? "Collect some evidence first" : undefined}>
        <Hammer /> {state === "running" ? "Building" : "Build the audit"}
      </Button>
      {state === "done" && summary && <span className="text-xs text-success">Built: {summary}</span>}
      {state === "error" && <span className="text-xs text-destructive">Build failed. Try again.</span>}
    </div>
  );
}
