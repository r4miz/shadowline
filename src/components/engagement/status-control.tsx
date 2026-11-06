"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUSES = ["draft", "in_progress", "review", "complete"] as const;
type Status = (typeof STATUSES)[number];

const LABELS: Record<Status, string> = {
  draft: "Draft",
  in_progress: "In progress",
  review: "In review",
  complete: "Complete",
};

// Lets the operator move an audit through its lifecycle. Status also
// auto-advances (survey → in_progress, documents generated → review).
export function EngagementStatusControl({
  engagementId,
  status,
}: {
  engagementId: string;
  status: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState<string>(status);
  const [saving, setSaving] = useState(false);

  async function change(next: string | null) {
    if (!next || next === value) return;
    const prev = value;
    setValue(next);
    setSaving(true);
    try {
      const res = await fetch(`/api/engagements/${engagementId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setValue(prev);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Select value={value} onValueChange={change} disabled={saving}>
      <SelectTrigger className="h-8 w-[150px]" aria-label="Audit status">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUSES.map((s) => (
          <SelectItem key={s} value={s}>
            {LABELS[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
