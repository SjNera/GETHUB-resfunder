"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AlignLeft, ArrowDown, ArrowUp, CheckSquare, CircleDot, Copy, GripVertical, Minus, Plus, SlidersHorizontal, Trash2, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, type SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/cn";
import type { Question, QuestionType } from "@/lib/types";

export const TYPE_ITEMS: SelectItem<QuestionType>[] = [
  { value: "short_answer", label: "Short answer", icon: <Type /> },
  { value: "paragraph", label: "Paragraph", icon: <AlignLeft /> },
  { value: "multiple_choice", label: "Multiple choice", icon: <CircleDot /> },
  { value: "checkboxes", label: "Checkboxes", icon: <CheckSquare /> },
  { value: "linear_scale", label: "Linear scale (1–5)", icon: <SlidersHorizontal /> },
];

/** Change a question's type, keeping what carries over. */
export function convertQuestion(q: Question, type: QuestionType): Question {
  const base = { id: q.id, title: q.title, description: q.description, required: q.required };
  if (type === "short_answer" || type === "paragraph") return { ...base, type, allowShort: "allowShort" in q ? q.allowShort : false };
  if (type === "multiple_choice" || type === "checkboxes")
    return { ...base, type, options: "options" in q ? q.options : ["Option 1", "Option 2"] };
  return { ...base, type, minLabel: "minLabel" in q ? q.minLabel : "Strongly disagree", maxLabel: "maxLabel" in q ? q.maxLabel : "Strongly agree" };
}

export function QuestionEditor({
  question,
  index,
  total,
  error,
  onChange,
  onMove,
  onDuplicate,
  onDelete,
}: {
  question: Question;
  index: number;
  total: number;
  error?: string;
  onChange: (q: Question) => void;
  onMove: (dir: -1 | 1) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: question.id });
  const open = question.type === "short_answer" || question.type === "paragraph";

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        "relative rounded-3xl border bg-surface p-5 sm:p-6",
        isDragging ? "z-10 border-fg/40 shadow-2xl" : error ? "border-dontpay" : "border-border",
      )}
    >
      <div className="flex items-start gap-2">
        <button
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`Drag to reorder question ${index + 1}`}
          className="mt-2.5 -ml-2 grid size-8 shrink-0 cursor-grab touch-none place-items-center rounded-full text-subtle hover:bg-surface-2 hover:text-fg active:cursor-grabbing"
        >
          <GripVertical className="size-4" />
        </button>
        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row">
          <Input
            value={question.title}
            onChange={(e) => onChange({ ...question, title: e.target.value })}
            placeholder={`Question ${index + 1}`}
            aria-label={`Question ${index + 1} title`}
            aria-invalid={error ? true : undefined}
            className="flex-1 bg-surface-2/60 font-medium"
          />
          <Select
            ariaLabel="Question type"
            value={question.type}
            items={TYPE_ITEMS}
            onValueChange={(t) => onChange(convertQuestion(question, t))}
          />
        </div>
      </div>

      <div className="mt-4 pl-8">
        {question.type === "multiple_choice" || question.type === "checkboxes" ? (
          <ul className="flex flex-col gap-2">
            {question.options.map((opt, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className={cn("size-4 shrink-0 border-2 border-border-strong", question.type === "checkboxes" ? "rounded" : "rounded-full")} />
                <Input
                  value={opt}
                  onChange={(e) => onChange({ ...question, options: question.options.map((o, j) => (j === i ? e.target.value : o)) })}
                  aria-label={`Option ${i + 1}`}
                  className="h-10 flex-1 rounded-xl"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-9"
                  aria-label={`Remove option ${i + 1}`}
                  disabled={question.options.length <= 2}
                  onClick={() => onChange({ ...question, options: question.options.filter((_, j) => j !== i) })}
                >
                  <Minus />
                </Button>
              </li>
            ))}
            <li>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onChange({ ...question, options: [...question.options, `Option ${question.options.length + 1}`] })}
              >
                <Plus />
                Add option
              </Button>
            </li>
          </ul>
        ) : question.type === "linear_scale" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm text-muted">
              1 means
              <Input value={question.minLabel} onChange={(e) => onChange({ ...question, minLabel: e.target.value })} className="mt-1 h-10 rounded-xl" />
            </label>
            <label className="text-sm text-muted">
              5 means
              <Input value={question.maxLabel} onChange={(e) => onChange({ ...question, maxLabel: e.target.value })} className="mt-1 h-10 rounded-xl" />
            </label>
          </div>
        ) : (
          <div className={cn("rounded-2xl border border-dashed border-border-strong px-4 text-sm text-subtle", question.type === "paragraph" ? "py-6" : "py-3")}>
            {question.type === "paragraph" ? "Long answer text" : "Short answer text"}
          </div>
        )}
        {error ? <p className="mt-2 text-sm text-dontpay">{error}</p> : null}
      </div>

      <div className="mt-5 flex flex-col gap-3 border-t border-border pt-4 pl-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <Switch label="Required" checked={question.required} onCheckedChange={(required) => onChange({ ...question, required })} />
          {open ? (
            <span className="flex flex-col">
              <Switch
                label="Allow short or “none” answers"
                checked={question.allowShort}
                onCheckedChange={(allowShort) => onChange({ ...question, allowShort })}
              />
              <span className="ml-[3.1rem] text-xs text-muted">{question.allowShort ? "Skips the AI non-answer check" : "Screened for non-answers"}</span>
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-1 self-end sm:self-auto">
          <Button variant="ghost" size="icon" className="size-9" aria-label="Move up" disabled={index === 0} onClick={() => onMove(-1)}>
            <ArrowUp />
          </Button>
          <Button variant="ghost" size="icon" className="size-9" aria-label="Move down" disabled={index === total - 1} onClick={() => onMove(1)}>
            <ArrowDown />
          </Button>
          <Button variant="ghost" size="icon" className="size-9" aria-label="Duplicate question" onClick={onDuplicate}>
            <Copy />
          </Button>
          <Button variant="ghost" size="icon" className="size-9" aria-label="Delete question" disabled={total <= 1} onClick={onDelete}>
            <Trash2 />
          </Button>
        </div>
      </div>
    </div>
  );
}
