"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import type { AnswerValue, SurveyQuestion } from "@/components/survey/survey-client";
import { cn } from "@/lib/utils";

interface QuestionFieldProps {
  question: SurveyQuestion;
  value: AnswerValue | undefined;
  onChange: (questionId: string, value: AnswerValue) => void;
  /** Larger, card-like choices for the public employee survey. */
  size?: "default" | "large";
}

const BOOLEAN_OPTIONS = ["Yes", "No"];

export function QuestionField({ question, value, onChange, size = "default" }: QuestionFieldProps) {
  const { id, text, helpText, answerType } = question;
  const options = question.options ?? [];
  const groupLabelId = `q-${id}-label`;
  const large = size === "large";

  const optionClass = cn(
    "flex cursor-pointer items-center gap-3 rounded-md border border-border bg-card text-sm transition-colors has-data-checked:border-foreground has-data-checked:bg-secondary/60 hover:border-foreground/40",
    large ? "px-4 py-3" : "px-3 py-2"
  );

  return (
    <fieldset className={cn("space-y-3", large && "space-y-5")}>
      <legend id={groupLabelId} className="space-y-1.5">
        <span className={cn("block font-medium text-foreground", large ? "font-heading text-xl leading-snug sm:text-2xl" : "text-sm")}>{text}</span>
        {helpText && <span className={cn("block text-muted-foreground", large ? "text-sm" : "text-xs")}>{helpText}</span>}
      </legend>

      {answerType === "single" && (
        <RadioGroup aria-labelledby={groupLabelId} value={typeof value === "string" ? value : null} onValueChange={(next) => onChange(id, String(next))} className="grid gap-2">
          {options.map((option) => {
            const optId = `q-${id}-${slug(option)}`;
            return (
              <label key={option} htmlFor={optId} className={optionClass}>
                <RadioGroupItem id={optId} value={option} />
                <span>{option}</span>
              </label>
            );
          })}
        </RadioGroup>
      )}

      {answerType === "boolean" && (
        <RadioGroup aria-labelledby={groupLabelId} value={typeof value === "boolean" ? (value ? "Yes" : "No") : null} onValueChange={(next) => onChange(id, next === "Yes")} className={cn("grid gap-2", large && "sm:grid-cols-2")}>
          {BOOLEAN_OPTIONS.map((option) => {
            const optId = `q-${id}-${slug(option)}`;
            return (
              <label key={option} htmlFor={optId} className={optionClass}>
                <RadioGroupItem id={optId} value={option} />
                <span>{option}</span>
              </label>
            );
          })}
        </RadioGroup>
      )}

      {answerType === "multi" && (
        <div className="grid gap-2" role="group" aria-labelledby={groupLabelId}>
          {options.map((option) => {
            const optId = `q-${id}-${slug(option)}`;
            const selected = Array.isArray(value) ? value : [];
            const checked = selected.includes(option);
            return (
              <label key={option} htmlFor={optId} className={optionClass}>
                <Checkbox
                  id={optId}
                  checked={checked}
                  onCheckedChange={(isChecked) => {
                    const set = new Set(selected);
                    if (isChecked === true) set.add(option);
                    else set.delete(option);
                    onChange(id, [...set]);
                  }}
                />
                <span>{option}</span>
              </label>
            );
          })}
        </div>
      )}

      {(answerType === "text" || answerType === "scale") && (
        <div className="space-y-1.5">
          <Label htmlFor={`q-${id}-text`} className="sr-only">{text}</Label>
          <Textarea id={`q-${id}-text`} aria-labelledby={groupLabelId} value={typeof value === "string" ? value : ""} onChange={(e) => onChange(id, e.target.value)} rows={large ? 5 : 3} maxLength={4000} className={large ? "text-base" : undefined} />
        </div>
      )}
    </fieldset>
  );
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
