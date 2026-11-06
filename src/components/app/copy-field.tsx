"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CopyField({ label, value, id }: { label: string; value: string; id: string }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setError(null);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Clipboard blocked. Select the text and copy it manually.");
    }
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <Input id={id} readOnly value={value} className="font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
        <Button type="button" variant="outline" size="icon" onClick={copy} aria-label={`Copy ${label}`}>
          {copied ? <CheckIcon className="text-success" /> : <CopyIcon />}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
