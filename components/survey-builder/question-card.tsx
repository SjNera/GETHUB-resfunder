"use client";

import { ArrowDown, ArrowUp, Copy, Plus, Trash2, X } from "lucide-react";
import type { Dispatch } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/ui/cn";
import {
  MAX_OPTIONS,
  MIN_OPTIONS,
  QUESTION_TYPES,
  type BuilderAction,
  type QuestionType,
} from "@/lib/ui/survey-builder";
import type { Question } from "@/lib/types";

export const inputCls =
  "w-full rounded-xl border border-border-strong bg-surface px-3.5 py-2.5 text-[15px] outline-none transition-colors placeholder:text-subtle focus:border-fg/50 focus-visible:ring-2 focus-visible:ring-ring";

type Props = {
  q: Question;
  index: number;
  count: number;
  errors: string[];
  dispatch: Dispatch<BuilderAction>;
};

export function QuestionCard({ q, index, count, errors, dispatch }: Props) {
  const id = q.id;
  return (
    <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5" aria-label={`Question ${index + 1}`} data-testid={`question-${id}`}>
      <div className="flex flex-wrap items-start gap-2">
        <span className="mt-2.5 w-6 shrink-0 text-sm font-semibold text-muted">{index + 1}.</span>
        <input
          className={cn(inputCls, "min-w-0 flex-1 basis-56")}
          value={q.text}
          placeholder="Write your question"
          aria-label={`Question ${index + 1} text`}
          aria-invalid={errors.length > 0}
          onChange={(e) => dispatch({ kind: "setText", id, value: e.target.value })}
        />
        <select
          className={cn(inputCls, "w-auto")}
          value={q.type}
          aria-label={`Question ${index + 1} type`}
          onChange={(e) => dispatch({ kind: "changeType", id, type: e.target.value as QuestionType })}
        >
          {QUESTION_TYPES.map((t) => (
            <option key={t.type} value={t.type}>{t.label}</option>
          ))}
        </select>
      </div>

      <div className="mt-3 pl-8">
        {q.type === "multiple_choice" && (
          <div className="grid gap-2">
            {q.options.map((o, i) => (
              <div key={i} className="flex items-center gap-2">
                <span aria-hidden className="size-4 shrink-0 rounded-full border border-border-strong" />
                <input
                  className={inputCls}
                  value={o}
                  aria-label={`Option ${i + 1}`}
                  onChange={(e) => dispatch({ kind: "setOption", id, index: i, value: e.target.value })}
                />
                <Button
                  variant="ghost" size="icon" className="size-9"
                  aria-label={`Remove option ${i + 1}`}
                  disabled={q.options.length <= MIN_OPTIONS}
                  onClick={() => dispatch({ kind: "removeOption", id, index: i })}
                ><X /></Button>
              </div>
            ))}
            <Button
              variant="ghost" size="sm" className="justify-self-start"
              disabled={q.options.length >= MAX_OPTIONS}
              onClick={() => dispatch({ kind: "addOption", id })}
            ><Plus />Add option</Button>
          </div>
        )}

        {q.type === "scale" && (
          <div className="flex flex-wrap items-center gap-3 text-[15px]">
            <label className="flex items-center gap-2">From
              <input type="number" className={cn(inputCls, "w-20")} value={q.min} aria-label="Scale start"
                onChange={(e) => dispatch({ kind: "setScale", id, field: "min", value: Number(e.target.value) })} />
            </label>
            <label className="flex items-center gap-2">to
              <input type="number" className={cn(inputCls, "w-20")} value={q.max} aria-label="Scale end"
                onChange={(e) => dispatch({ kind: "setScale", id, field: "max", value: Number(e.target.value) })} />
            </label>
            <span className="text-sm text-muted">Respondents pick a whole number.</span>
          </div>
        )}

        {q.type === "open_ended" && (
          <div className="grid gap-2 text-sm text-muted">
            <p>Respondents type their answer. Code checks and the AI label screen it.</p>
            <label className="flex items-center gap-2 text-fg">
              <input type="checkbox" checked={q.allowShort}
                onChange={(e) => dispatch({ kind: "setAllowShort", id, value: e.target.checked })} />
              Short answers like “none” are fine
            </label>
          </div>
        )}

        {errors.length > 0 && (
          <ul role="alert" className="mt-3 grid gap-1 text-sm text-dontpay">
            {errors.map((e) => <li key={e}>{e}</li>)}
          </ul>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={q.required}
            onChange={(e) => dispatch({ kind: "setRequired", id, value: e.target.checked })} />
          Required
        </label>
        <div className="flex items-center">
          <Button variant="ghost" size="icon" className="size-9" aria-label={`Move question ${index + 1} up`} disabled={index === 0}
            onClick={() => dispatch({ kind: "moveQuestion", id, dir: -1 })}><ArrowUp /></Button>
          <Button variant="ghost" size="icon" className="size-9" aria-label={`Move question ${index + 1} down`} disabled={index === count - 1}
            onClick={() => dispatch({ kind: "moveQuestion", id, dir: 1 })}><ArrowDown /></Button>
          <Button variant="ghost" size="icon" className="size-9" aria-label={`Duplicate question ${index + 1}`}
            onClick={() => dispatch({ kind: "duplicateQuestion", id })}><Copy /></Button>
          <Button variant="ghost" size="icon" className="size-9" aria-label={`Delete question ${index + 1}`} disabled={count <= 1}
            onClick={() => dispatch({ kind: "removeQuestion", id })}><Trash2 /></Button>
        </div>
      </div>
    </section>
  );
}
