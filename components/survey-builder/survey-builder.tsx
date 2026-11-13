"use client";

import { Check, Plus } from "lucide-react";
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { useAccount } from "@/lib/ui/auth/store";
import {
  initialState,
  MAX_QUESTIONS,
  QUESTION_TYPES,
  reduce,
  validate,
  type BuilderState,
} from "@/lib/ui/survey-builder";
import { FundStep } from "./fund-step";
import { inputCls, QuestionCard } from "./question-card";
import { SurveyPreview } from "./preview";

const DRAFT_KEY = "rf-survey-draft-v1";

function loadDraft(): BuilderState | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as BuilderState;
    return Array.isArray(d.questions) && d.questions.length ? d : null;
  } catch {
    return null;
  }
}

export function SurveyBuilder() {
  const { ready, account } = useAccount();
  const [state, dispatch] = useReducer(reduce, undefined, initialState);
  const hydrated = useRef(false);
  const [step, setStep] = useState<"build" | "fund">("build");
  const [tried, setTried] = useState(false);

  useEffect(() => {
    const d = loadDraft();
    if (d) dispatch({ kind: "reset", state: d });
    hydrated.current = true;
  }, []);
  useEffect(() => {
    if (!hydrated.current) return;
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(state)); } catch { /* storage unavailable */ }
  }, [state]);

  const v = useMemo(() => validate(state), [state]);
  const errs = v.errors;

  if (ready && !account) {
    return (
      <div className="mx-auto max-w-xl px-5 py-20 text-center">
        <h1 className="display text-3xl">Sign in to publish a survey</h1>
        <p className="mt-3 text-muted">You need an account and a verified wallet to fund a survey.</p>
        <ButtonLink href="/sign-in" variant="primary" className="mt-6">Sign in</ButtonLink>
      </div>
    );
  }

  const next = () => {
    setTried(true);
    if (v.ok) { setStep("fund"); window.scrollTo({ top: 0 }); }
  };

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
      <p className="eyebrow">Publish · step {step === "build" ? "1 of 2" : "2 of 2"}</p>
      <h1 className="display mt-2 text-[clamp(1.75rem,4vw,2.75rem)]">{step === "build" ? "Build your survey" : "Fund your survey"}</h1>

      {step === "build" ? (
        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="grid gap-4">
            <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
              <label htmlFor="sb-title" className="mb-2 block text-[15px] font-semibold">Survey title</label>
              <input id="sb-title" className={inputCls} value={state.title} maxLength={200} placeholder="e.g. Study habits of UMak students"
                aria-invalid={tried && !!errs.title}
                onChange={(e) => dispatch({ kind: "setTitle", value: e.target.value })} />
              {tried && errs.title && <p role="alert" className="mt-2 text-sm text-dontpay">{errs.title}</p>}
              <label htmlFor="sb-desc" className="mb-2 mt-4 block text-[15px] font-semibold">Description <span className="font-normal text-muted">(optional)</span></label>
              <textarea id="sb-desc" className={inputCls} rows={3} value={state.description} placeholder="What is the study about?"
                onChange={(e) => dispatch({ kind: "setDescription", value: e.target.value })} />
            </section>

            {state.questions.map((q, i) => (
              <QuestionCard key={q.id} q={q} index={i} count={state.questions.length}
                errors={tried || q.text ? (errs.questions[q.id] ?? []).filter((m) => tried || m !== "Write the question.") : []}
                dispatch={dispatch} />
            ))}

            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Add a question">
              {QUESTION_TYPES.map((t) => (
                <Button key={t.type} variant="outline" size="sm" disabled={state.questions.length >= MAX_QUESTIONS}
                  onClick={() => dispatch({ kind: "addQuestion", type: t.type })}><Plus />{t.label}</Button>
              ))}
              <span className="text-sm text-muted">{state.questions.length} / {MAX_QUESTIONS} questions</span>
            </div>
            {errs.general.length > 0 && tried && (
              <ul role="alert" className="text-sm text-dontpay">{errs.general.map((g) => <li key={g}>{g}</li>)}</ul>
            )}
            <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
              <span className="flex items-center gap-1.5 text-sm text-muted"><Check className="size-4" />Draft saved in this browser</span>
              <Button variant="primary" onClick={next}>Continue to funding</Button>
            </div>
          </div>
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <p className="mb-2 text-sm font-medium text-muted">Live preview · what respondents see</p>
            <SurveyPreview survey={v.survey} />
          </aside>
        </div>
      ) : (
        <FundStep survey={v.survey} onBack={() => setStep("build")} onFunded={() => { try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ } }} />
      )}
    </div>
  );
}
