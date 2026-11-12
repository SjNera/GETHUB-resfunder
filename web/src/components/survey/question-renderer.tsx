"use client";

import { CheckboxList, RadioList, ScalePicker } from "@/components/ui/choice";
import { Input, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import type { AnswerValue, Question, ScaleQuestion } from "@/lib/types";

/**
 * Renders one question. The builder's live preview and the respondent's form
 * use this same component, so the preview is exactly what students see.
 */
export function QuestionRenderer({
  question,
  index,
  value,
  onChange,
  error,
  disabled,
}: {
  question: Question;
  index: number;
  value: AnswerValue;
  onChange: (v: AnswerValue) => void;
  error?: string;
  disabled?: boolean;
}) {
  const titleId = `${question.id}-title`;
  return (
    <fieldset
      className={cn(
        "rounded-3xl border bg-surface p-5 transition-colors duration-150 sm:p-6",
        error ? "border-dontpay" : "border-border",
      )}
      aria-invalid={error ? true : undefined}
    >
      <legend className="sr-only">{question.title}</legend>
      <div id={titleId} className="flex gap-3">
        <span className="nums mt-0.5 text-sm font-medium text-subtle">{index + 1}</span>
        <div className="min-w-0">
          <p className="text-[17px] font-semibold leading-snug tracking-[-0.01em]">
            {question.title || <span className="text-subtle">Untitled question</span>}
            {question.required ? (
              <span className="ml-1 text-dontpay" aria-label="required">
                *
              </span>
            ) : null}
          </p>
          {question.description ? <p className="mt-1 text-sm text-muted">{question.description}</p> : null}
        </div>
      </div>
      <div className="mt-4 sm:pl-6">
        {question.type === "short_answer" ? (
          <Input
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Your answer"
            aria-labelledby={titleId}
            aria-invalid={error ? true : undefined}
            disabled={disabled}
          />
        ) : question.type === "paragraph" ? (
          <Textarea
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Your answer"
            aria-labelledby={titleId}
            aria-invalid={error ? true : undefined}
            disabled={disabled}
          />
        ) : question.type === "multiple_choice" ? (
          <RadioList
            name={question.id}
            options={question.options}
            value={typeof value === "string" ? value : null}
            onValueChange={onChange}
            ariaLabelledBy={titleId}
            disabled={disabled}
          />
        ) : question.type === "checkboxes" ? (
          <CheckboxList
            options={question.options}
            value={Array.isArray(value) ? value : []}
            onValueChange={onChange}
            disabled={disabled}
          />
        ) : (
          <ScalePicker
            value={typeof value === "number" ? value : null}
            onValueChange={onChange}
            minLabel={(question as ScaleQuestion).minLabel}
            maxLabel={(question as ScaleQuestion).maxLabel}
            ariaLabelledBy={titleId}
            disabled={disabled}
          />
        )}
        {error ? (
          <p className="mt-2 text-sm text-dontpay" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </fieldset>
  );
}

export function isAnswered(q: Question, v: AnswerValue): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  return true;
}
