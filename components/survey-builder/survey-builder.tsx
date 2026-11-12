"use client";

import { Check, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { parseEther } from "viem";
import { Button, ButtonLink } from "@/components/ui/button";
import { useAccount } from "@/lib/ui/auth/store";
import { bnbAmount, shortHash } from "@/lib/ui/format";
import {
  initialState,
  MAX_QUESTIONS,
  QUESTION_TYPES,
  reduce,
  validate,
  type BuilderState,
} from "@/lib/ui/survey-builder";
import { planFunding, type FundingPlan } from "@/lib/ui/survey-submit";
import { inputCls, QuestionCard } from "./question-card";
import { SurveyPreview } from "./preview";

const DRAFT_KEY = "rf-survey-draft-v1";
/** Display estimate only. The real per-response fee is fixed server-side (FEE_PER_RESPONSE_WEI). */
const FEE_ESTIMATE_WEI = parseEther("0.0002");

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
  const [fund, setFund] = useState({ rate: "0.001", quota: "100", deadline: "" });
  const [fundTried, setFundTried] = useState(false);
  const [nowMs, setNowMs] = useState(0);
  const [plan, setPlan] = useState<FundingPlan | null>(null);

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
  const funding = useMemo(
    () => (step === "fund" ? planFunding(v.survey, fund, FEE_ESTIMATE_WEI, nowMs) : null),
    [step, v.survey, fund, nowMs],
  );
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
    if (v.ok) { setNowMs(Date.now()); setStep("fund"); window.scrollTo({ top: 0 }); }
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
        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
          <section className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="text-lg font-semibold">Rate, quota and deadline</h2>
            <p className="mt-1 text-sm text-muted">These are written into the contract and can’t change after funding.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {([["rate", "Pay per response (tBNB)", "text"], ["quota", "Responses wanted", "number"], ["deadline", "Deadline", "date"]] as const).map(([k, label, type]) => (
                <div key={k}>
                  <label htmlFor={`sb-${k}`} className="mb-2 block text-[15px] font-semibold">{label}</label>
                  <input id={`sb-${k}`} type={type} className={inputCls} value={fund[k]}
                    inputMode={k === "rate" ? "decimal" : undefined}
                    onChange={(e) => { setFund({ ...fund, [k]: e.target.value }); setPlan(null); }} />
                  {fundTried && funding && !funding.ok && funding.errors[k] && <p role="alert" className="mt-2 text-sm text-dontpay">{funding.errors[k]}</p>}
                </div>
              ))}
            </div>
            <div className="mt-6 flex gap-2">
              <Button variant="outline" onClick={() => setStep("build")}>Back to questions</Button>
            </div>
          </section>
          <aside className="grid gap-4 self-start rounded-2xl border border-border bg-surface p-5">
            <h2 className="text-lg font-semibold">Summary</h2>
            {funding?.ok ? (
              <dl className="grid gap-2 text-sm" data-testid="summary">
                <div className="flex justify-between"><dt className="text-muted">Budget</dt><dd>{bnbAmount(funding.plan.budget, 6)} tBNB</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Fee (estimate)</dt><dd>{bnbAmount(funding.plan.fee, 6)} tBNB</dd></div>
                <div className="flex justify-between border-t border-border pt-2 font-semibold"><dt>You deposit</dt><dd>{bnbAmount(funding.plan.deposit, 6)} tBNB</dd></div>
              </dl>
            ) : <p className="text-sm text-muted">Fill in the fields to see your deposit.</p>}
            <Button variant="primary" onClick={() => { setFundTried(true); if (funding?.ok) setPlan(funding.plan); }}>Prepare funding</Button>
            {plan && (
              <div className="rounded-xl bg-surface-2 p-3 text-sm" data-testid="plan">
                <p className="font-medium">Ready to lock</p>
                <p className="mt-1 text-muted">Survey hash <span className="font-mono">{shortHash(plan.hash, 10, 6)}</span></p>
                <p className="mt-1 text-muted">Sending the wallet transaction isn’t connected yet. It needs the deployed contract and the register route.</p>
              </div>
            )}
            <Link href="/rubric" className="text-sm text-muted underline">How responses are screened</Link>
          </aside>
        </div>
      )}
    </div>
  );
}
