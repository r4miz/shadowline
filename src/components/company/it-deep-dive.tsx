"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InlineError, Panel, SectionTitle } from "@/components/app/primitives";
import { QuestionField } from "@/components/survey/question-field";
import type { AnswerValue, SurveyQuestion } from "@/components/survey/survey-client";

interface Data {
  questions: Array<SurveyQuestion & { domain: string }>;
  answers: Record<string, AnswerValue>;
}

// The legacy 50-question IT questionnaire, now optional. The operator fills it
// in with the client's IT lead; answers score through the same engine.
export function ItDeepDive({ engagementId }: { engagementId: string }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Data | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [state, setState] = useState<"idle" | "loading" | "ready" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    if (!open || data) return;
    let cancelled = false;
    // setState after an awaited fetch does not cascade renders; the lint rule
    // cannot see past the async boundary.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState("loading");
    fetch(`/api/engagements/${engagementId}/it-responses`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (!json.success) throw new Error();
        const normalized: Data = {
          questions: json.data.questions.map((q: SurveyQuestion & { domain: string; options: unknown }) => ({ ...q, options: Array.isArray(q.options) ? (q.options as string[]) : null })),
          answers: json.data.answers,
        };
        setData(normalized);
        setAnswers(normalized.answers);
        setState("ready");
      })
      .catch(() => !cancelled && setState("error"));
    return () => {
      cancelled = true;
    };
  }, [open, data, engagementId]);

  async function save() {
    setState("saving");
    const res = await fetch(`/api/engagements/${engagementId}/it-responses`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: Object.entries(answers).map(([questionId, value]) => ({ questionId, value })) }),
    });
    setState(res.ok ? "saved" : "error");
    if (res.ok) setTimeout(() => setState("ready"), 1500);
  }

  const answered = Object.keys(answers).length;
  const domains = data ? [...new Set(data.questions.map((q) => q.domain))] : [];

  return (
    <Panel className="space-y-4">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-start justify-between gap-3 text-left">
        <SectionTitle title="Optional: IT deep-dive" description="Fifty technical control questions to answer with the client's IT lead or MSP (logs, SSO, OAuth grants, vendor terms). Adds depth to the report for companies that have IT." />
        <ChevronDown className={`mt-1 size-5 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="space-y-6 border-t border-border pt-4">
          {state === "loading" && <p className="text-sm text-muted-foreground">Loading questions</p>}
          {state === "error" && <InlineError>Could not load or save the questionnaire.</InlineError>}
          {data && (
            <>
              <p className="text-sm text-muted-foreground">{answered} of {data.questions.length} answered. Unanswered questions are simply left out of scoring.</p>
              {domains.map((domain) => (
                <section key={domain} className="space-y-5">
                  <h3 className="rule-top pt-3 font-heading text-base font-semibold">{domain}</h3>
                  {data.questions.filter((q) => q.domain === domain).map((q) => (
                    <QuestionField key={q.id} question={q} value={answers[q.id]} onChange={(id, v) => setAnswers((prev) => ({ ...prev, [id]: v }))} />
                  ))}
                </section>
              ))}
              <div className="flex items-center justify-end gap-3">
                {state === "saved" && <span className="text-sm text-success">Saved</span>}
                <Button onClick={save} disabled={state === "saving"}>{state === "saving" ? "Saving" : "Save answers"}</Button>
              </div>
            </>
          )}
        </div>
      )}
    </Panel>
  );
}
