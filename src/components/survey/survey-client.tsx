"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, LockIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QuestionField } from "@/components/survey/question-field";
import { BrandMark } from "@/components/brand-mark";
import { brand } from "@/lib/brand";

// NEVER log answer values anywhere in this file. Answers live only in the
// in-memory `answers` map until the single submit POST.

export type AnswerValue = string | string[] | boolean;

export interface SurveyQuestion {
  id: string;
  text: string;
  helpText: string | null;
  answerType: "single" | "multi" | "scale" | "text" | "boolean";
  options: string[] | null;
}

interface SurveyDomain {
  domain: string;
  questions: SurveyQuestion[];
}

interface SurveyData {
  organizationName: string;
  questions: SurveyQuestion[];
}

type Phase = "loading" | "code-gate" | "invalid" | "intro" | "survey" | "done";

const ANONYMITY_LINE =
  "Your answers are anonymous. Nobody at your company will see individual responses, only totals.";

function normalizeOptions(raw: unknown): string[] | null {
  if (Array.isArray(raw)) return raw.filter((o): o is string => typeof o === "string");
  return null;
}

export function SurveyClient({ token }: { token: string }) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [data, setData] = useState<SurveyData | null>(null);
  const [code, setCode] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [codeError, setCodeError] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  const load = useCallback(
    async (accessCode: string) => {
      const qs = new URLSearchParams({ token });
      if (accessCode) qs.set("code", accessCode);
      let res: Response;
      try {
        res = await fetch(`/api/survey?${qs.toString()}`);
      } catch {
        setPhase("invalid");
        return;
      }
      const body = await res.json().catch(() => null);

      if (res.ok && body?.data) {
        const questions: SurveyQuestion[] = (body.data.domains as SurveyDomain[]).flatMap((d) =>
          (d.questions ?? []).map((q) => ({
            id: q.id,
            text: q.text,
            helpText: q.helpText ?? null,
            answerType: q.answerType,
            options: normalizeOptions(q.options),
          }))
        );
        setData({ organizationName: body.data.organizationName, questions });
        setCode(accessCode);
        setPhase("intro");
        return;
      }

      if (body?.error === "access_code_required") {
        if (accessCode) setCodeError(true);
        setPhase("code-gate");
        return;
      }
      setPhase("invalid");
    },
    [token]
  );

  useEffect(() => {
    // load() only calls setState after an awaited fetch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load("");
  }, [load]);

  const setAnswer = useCallback((questionId: string, value: AnswerValue) => {
    setAnswers((prev) => {
      const next = { ...prev };
      const empty = value === "" || (Array.isArray(value) && value.length === 0);
      if (empty) delete next[questionId];
      else next[questionId] = value;
      return next;
    });
  }, []);

  function go(next: number) {
    setStep(next);
    topRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  async function submitSurvey() {
    if (!data) return;
    setSubmitting(true);
    setSubmitError(null);
    const payload = {
      token,
      code: code || undefined,
      answers: Object.entries(answers).map(([questionId, value]) => ({ questionId, value })),
    };
    let res: Response;
    try {
      res = await fetch("/api/survey", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    } catch {
      setSubmitting(false);
      setSubmitError("Something went wrong. Check your connection and try again.");
      return;
    }
    if (res.ok) {
      setPhase("done");
    } else {
      const body = await res.json().catch(() => null);
      if (body?.error === "invalid_or_expired") setPhase("invalid");
      else setSubmitError("We could not submit your answers. Please try again.");
    }
    setSubmitting(false);
  }

  if (phase === "loading") {
    return (
      <Shell>
        <p className="text-center text-sm text-muted-foreground">Loading the survey</p>
      </Shell>
    );
  }

  if (phase === "invalid") {
    return (
      <Shell>
        <div className="rounded-lg border border-border bg-card p-6 text-center">
          <h1 className="font-heading text-xl font-semibold">This link is no longer valid</h1>
          <p className="mt-2 text-sm text-muted-foreground">It may have expired or the survey may have closed. Ask whoever sent it for a new link.</p>
        </div>
      </Shell>
    );
  }

  if (phase === "done") {
    return (
      <Shell>
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <BrandMark className="mx-auto size-10 text-foreground" />
          <h1 className="mt-4 font-heading text-2xl font-semibold">Thank you</h1>
          <p className="mt-2 text-sm text-muted-foreground">Your answers were submitted. {ANONYMITY_LINE}</p>
          <p className="mt-4 text-xs text-muted-foreground">You can close this tab.</p>
        </div>
      </Shell>
    );
  }

  if (phase === "code-gate") {
    return (
      <Shell>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setCodeError(false);
            void load(codeInput.trim());
          }}
          className="space-y-4 rounded-lg border border-border bg-card p-6"
        >
          <div className="flex items-center gap-2 text-muted-foreground"><LockIcon className="size-4" /><span className="font-mono text-[11px] uppercase tracking-[0.14em]">Access code</span></div>
          <h1 className="font-heading text-xl font-semibold">Enter the access code you were given</h1>
          <div className="space-y-1.5">
            <Label htmlFor="access-code">Access code</Label>
            <Input id="access-code" value={codeInput} onChange={(e) => { setCodeInput(e.target.value); setCodeError(false); }} aria-invalid={codeError} autoComplete="off" autoFocus className="text-base" />
            {codeError && <p className="text-sm text-destructive" role="alert">That code did not match. Try again.</p>}
          </div>
          <Button type="submit" className="w-full" size="lg" disabled={!codeInput.trim()}>Continue</Button>
        </form>
      </Shell>
    );
  }

  if (!data) return null;

  if (phase === "intro") {
    return (
      <Shell>
        <div className="space-y-6">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{data.organizationName}</p>
          <h1 className="font-heading text-3xl font-semibold leading-tight sm:text-4xl">How do you use AI at work?</h1>
          <p className="text-base leading-relaxed text-muted-foreground">
            {data.organizationName} is working out which AI tools to provide and what the rules should be. Honest answers from you make that decision better. {data.questions.length} questions, about five minutes.
          </p>
          <div className="rounded-md border border-border bg-card p-4 text-sm">
            <p className="font-medium">Anonymous, by design</p>
            <p className="mt-1 text-muted-foreground">{ANONYMITY_LINE} There is no login and we do not record who opened this link.</p>
          </div>
          <Button size="lg" className="w-full sm:w-auto" onClick={() => setPhase("survey")}>Start <ArrowRight /></Button>
        </div>
      </Shell>
    );
  }

  const total = data.questions.length;
  const q = data.questions[step];
  const isLast = step === total - 1;
  const answered = Object.keys(answers).length;
  const progress = Math.round(((step + 1) / total) * 100);

  return (
    <Shell>
      <div ref={topRef} className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            <span>{data.organizationName}</span>
            <span className="tabular">{step + 1} / {total}</span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-secondary" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Survey progress">
            <div className="h-full rounded-full bg-foreground transition-[width] duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div key={q.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <QuestionField question={q} value={answers[q.id]} onChange={setAnswer} size="large" />
        </div>

        {submitError && <p className="text-sm text-destructive" role="alert">{submitError}</p>}

        <div className="flex items-center justify-between gap-3 border-t border-border pt-5">
          <Button type="button" variant="ghost" onClick={() => go(Math.max(0, step - 1))} disabled={step === 0 || submitting}><ArrowLeft /> Back</Button>
          {isLast ? (
            <Button type="button" size="lg" onClick={() => void submitSurvey()} disabled={submitting || answered === 0}>{submitting ? "Submitting" : "Submit answers"}</Button>
          ) : (
            <Button type="button" size="lg" onClick={() => go(Math.min(total - 1, step + 1))} disabled={submitting}>{answers[q.id] === undefined ? "Skip" : "Next"} <ArrowRight /></Button>
          )}
        </div>
        <p className="text-center text-xs text-muted-foreground">Every question is optional. {ANONYMITY_LINE}</p>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="mx-auto w-full max-w-xl flex-1 px-5 py-10 sm:py-16">{children}</div>
      <footer className="px-5 py-4 text-center text-xs text-muted-foreground">Survey run by {brand.name}. Answers are encrypted in transit and at rest.</footer>
    </div>
  );
}
