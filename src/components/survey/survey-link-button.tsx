"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon, LinkIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SurveyLinkButton({ engagementId }: { engagementId: string }) {
  const [open, setOpen] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [url, setUrl] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function reset() {
    setAccessCode("");
    setUrl(null);
    setError(null);
    setCopied(false);
    setPending(false);
  }

  async function generate() {
    setPending(true);
    setError(null);
    setCopied(false);
    const trimmed = accessCode.trim();
    if (trimmed && (trimmed.length < 4 || trimmed.length > 64)) {
      setPending(false);
      setError("Access code must be 4 to 64 characters.");
      return;
    }
    try {
      const res = await fetch(
        `/api/engagements/${engagementId}/survey-link`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(trimmed ? { accessCode: trimmed } : {}),
        }
      );
      const body = await res.json().catch(() => null);
      if (res.ok && body?.data?.url) {
        setUrl(body.data.url);
      } else {
        setError(
          typeof body?.error === "string"
            ? body.error
            : "Could not generate a survey link. Please try again."
        );
      }
    } catch {
      setError("Could not generate a survey link. Please try again.");
    } finally {
      setPending(false);
    }
  }

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy to clipboard. Copy the link manually.");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger render={<Button variant="outline" />}>
        <LinkIcon />
        Survey link
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share survey link</DialogTitle>
          <DialogDescription>
            Generate an anonymous link respondents can use to complete the
            Shadow AI assessment.
          </DialogDescription>
        </DialogHeader>

        {url ? (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="survey-url">Survey link</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="survey-url"
                  readOnly
                  value={url}
                  className="font-mono text-xs"
                  onFocus={(e) => e.currentTarget.select()}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={copy}
                  aria-label="Copy survey link"
                >
                  {copied ? <CheckIcon /> : <CopyIcon />}
                </Button>
              </div>
            </div>
            {accessCode.trim() && (
              <p className="text-xs text-muted-foreground">
                Remember to share the access code{" "}
                <span className="font-medium text-foreground">
                  separately
                </span>{" "}
                (for example by a different channel). It is not included in the link.
              </p>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              type="button"
              variant="ghost"
              onClick={reset}
              className="w-full"
            >
              Generate another link
            </Button>
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void generate();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="access-code">Access code (optional)</Label>
              <Input
                id="access-code"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder="e.g. a shared passphrase"
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                Adds a second factor: respondents must enter this code to open
                the survey. Share it separately from the link.
              </p>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Generating" : "Generate link"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
