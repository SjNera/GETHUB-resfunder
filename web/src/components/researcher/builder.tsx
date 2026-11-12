"use client";

import { closestCenter, DndContext, type DragEndEvent, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Check, Eye, Lock, PenLine, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { QuestionEditor } from "@/components/builder/question-editor";
import { QuestionRenderer } from "@/components/survey/question-renderer";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { useDemo } from "@/lib/data/store";
import { newId } from "@/lib/demo/ids";
import { plural } from "@/lib/format";
import { validateSurvey } from "@/lib/schema";
import type { Answers, Question, Survey } from "@/lib/types";
import { SurveyShell } from "./survey-shell";

export function SurveyBuilder({ id }: { id: string }) {
  return <SurveyShell id={id}>{(survey) => (survey.funding ? <Locked survey={survey} /> : <Builder survey={survey} />)}</SurveyShell>;
}

function Preview({ survey }: { survey: Survey }) {
  const [answers, setAnswers] = useState<Answers>({});
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-3xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="heading text-2xl">{survey.title || "Untitled survey"}</h2>
        {survey.description ? <p className="mt-2 text-muted">{survey.description}</p> : null}
      </div>
      {survey.questions.map((q, i) => (
        <QuestionRenderer key={q.id} question={q} index={i} value={answers[q.id] ?? null} onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))} />
      ))}
    </div>
  );
}

function Locked({ survey }: { survey: Survey }) {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-start gap-3 rounded-3xl border border-border bg-surface-2 p-5">
        <Lock className="mt-0.5 size-5 shrink-0" />
        <p className="text-[15px]">
          <strong className="font-semibold">Questions are locked.</strong> The survey&apos;s hash was recorded on-chain at
          funding, so respondents can trust the questions didn&apos;t change after launch.
        </p>
      </div>
      <Preview survey={survey} />
    </div>
  );
}

function Builder({ survey }: { survey: Survey }) {
  const router = useRouter();
  const setQuestions = useDemo((s) => s.setQuestions);
  const updateSurvey = useDemo((s) => s.updateSurvey);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [showErrors, setShowErrors] = useState(false);
  const qs = survey.questions;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const validation = validateSurvey(survey);
  const issues = validation.success ? [] : validation.error.issues;
  const errorFor = (i: number) => issues.find((iss) => iss.path[0] === "questions" && iss.path[1] === i)?.message;
  const titleError = issues.find((iss) => iss.path[0] === "title")?.message;

  const save = (next: Question[]) => setQuestions(survey.id, next);
  const update = (i: number, q: Question) => save(qs.map((x, j) => (j === i ? q : x)));
  const move = (i: number, dir: -1 | 1) => save(arrayMove(qs, i, i + dir));
  const duplicate = (i: number) => save([...qs.slice(0, i + 1), { ...qs[i], id: newId("q") }, ...qs.slice(i + 1)]);
  const remove = (i: number) => {
    const removed = qs[i];
    save(qs.filter((_, j) => j !== i));
    toast("Question deleted", {
      action: { label: "Undo", onClick: () => setQuestions(survey.id, [...useDemo.getState().surveys[survey.id].questions.slice(0, i), removed, ...useDemo.getState().surveys[survey.id].questions.slice(i)]) },
    });
  };
  const add = () => save([...qs, { id: newId("q"), type: "paragraph", title: "", required: true, allowShort: false }]);
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    save(arrayMove(qs, qs.findIndex((q) => q.id === active.id), qs.findIndex((q) => q.id === over.id)));
  };

  const editor = (
    <div className="flex flex-col gap-3">
      <div className="rounded-3xl border border-border bg-surface p-5 sm:p-6">
        <Input
          value={survey.title}
          onChange={(e) => updateSurvey(survey.id, { title: e.target.value })}
          aria-label="Survey title"
          aria-invalid={showErrors && titleError ? true : undefined}
          placeholder="Survey title"
          className="h-14 border-transparent bg-transparent px-0 text-2xl font-semibold tracking-[-0.02em] focus:ring-0"
        />
        <Textarea
          value={survey.description}
          onChange={(e) => updateSurvey(survey.id, { description: e.target.value })}
          aria-label="Survey description"
          placeholder="Tell respondents what the study is about and how long it takes."
          className="mt-1 min-h-20 border-transparent bg-transparent px-0 text-muted focus:ring-0"
        />
        {showErrors && titleError ? <p className="text-sm text-dontpay">{titleError}</p> : null}
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={qs.map((q) => q.id)} strategy={verticalListSortingStrategy}>
          {qs.map((q, i) => (
            <QuestionEditor
              key={q.id}
              question={q}
              index={i}
              total={qs.length}
              error={showErrors ? errorFor(i) : undefined}
              onChange={(nq) => update(i, nq)}
              onMove={(d) => move(i, d)}
              onDuplicate={() => duplicate(i)}
              onDelete={() => remove(i)}
            />
          ))}
        </SortableContext>
      </DndContext>
      <Button variant="dark" size="lg" className="self-start" onClick={add}>
        <Plus />
        Add question
      </Button>
    </div>
  );

  return (
    <div className="pb-28">
      <div role="tablist" aria-label="Builder view" className="mb-4 inline-flex gap-1 rounded-full bg-surface-2 p-1 lg:hidden">
        {(["edit", "preview"] as const).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={cn("inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-medium", mode === m ? "bg-surface shadow-sm" : "text-muted")}
          >
            {m === "edit" ? <PenLine className="size-4" /> : <Eye className="size-4" />}
            {m === "edit" ? "Edit" : "Preview"}
          </button>
        ))}
      </div>
      <div className="grid gap-8 lg:grid-cols-[1fr_0.85fr]">
        <div className={cn(mode === "preview" && "hidden lg:block")}>{editor}</div>
        <aside className={cn("lg:sticky lg:top-28 lg:max-h-[calc(100dvh-8rem)] lg:overflow-y-auto lg:rounded-[2rem] lg:bg-surface-2/60 lg:p-4", mode === "edit" && "hidden lg:block")}>
          <p className="eyebrow mb-3 hidden items-center gap-2 lg:flex">
            <Eye className="size-3.5" /> Live preview — exactly what students see
          </p>
          <Preview survey={survey} />
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="material mx-auto flex max-w-6xl items-center justify-between gap-3 rounded-full py-2.5 pl-5 pr-2.5">
          <p className="flex items-center gap-2 text-sm text-muted">
            <Check className="size-4 text-pay" /> Saved · {plural(qs.length, "question")}
            {issues.length && showErrors ? <span className="text-dontpay">· {plural(issues.length, "thing")} to fix</span> : null}
          </p>
          <Button
            variant="primary"
            onClick={() => {
              if (!validation.success) {
                setShowErrors(true);
                setMode("edit");
                toast.error("Fix the highlighted questions first");
                return;
              }
              router.push(`/surveys/${survey.id}/fund`);
            }}
          >
            Continue to funding
          </Button>
        </div>
      </div>
    </div>
  );
}
