"use client";

import { Check, ChevronDown, RotateCcw, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { current, myResponse, useDemo } from "@/lib/data/store";
import { DEMO_SURVEY_ID } from "@/lib/survey/hardcoded";

type Step = { title: string; body: string; href: string; cta: string; done: boolean };

export function useCoreLoopSteps(): Step[] {
  const survey = useDemo((s) => s.surveys[DEMO_SURVEY_ID]);
  const responses = useDemo((s) => s.responses);
  const session = useDemo((s) => s.session);
  const logVisited = useDemo((s) => s.logVisited);
  const rs = Object.values(responses).filter((r) => r.surveyId === DEMO_SURVEY_ID);
  const mine = myResponse(responses, DEMO_SURVEY_ID, session?.email);
  const paid = rs.find((r) => current(r).outcome === "pay");
  return [
    {
      title: "Fund the survey",
      body: "Lock rate × quota + 5% in mock pesos.",
      href: `/publish/${DEMO_SURVEY_ID}/fund`,
      cta: "Fund it",
      done: !!survey?.funding,
    },
    {
      title: "Answer it as a student",
      body: "Allowlisted email, one submission each.",
      href: `/answer/${DEMO_SURVEY_ID}`,
      cta: "Answer",
      done: rs.length > 0,
    },
    {
      title: "Get paid instantly",
      body: "Pay sends the fixed rate with a BscScan receipt.",
      href: mine ? `/answer/${DEMO_SURVEY_ID}/r/${mine.id}` : `/answer/${DEMO_SURVEY_ID}`,
      cta: "See receipt",
      done: !!paid,
    },
    {
      title: "Close and refund",
      body: "Unused budget returns to the researcher.",
      href: `/publish/${DEMO_SURVEY_ID}`,
      cta: "Close",
      done: survey?.status === "closed",
    },
    {
      title: "Read the decision log",
      body: "Every response, decision, reason and tx.",
      href: `/publish/${DEMO_SURVEY_ID}/log`,
      cta: "Open log",
      done: logVisited,
    },
  ];
}

/** Onboarding lives inside the app: the real core loop, ticking off as you do it. */
export function CoreLoopGuide({ className }: { className?: string }) {
  const steps = useCoreLoopSteps();
  const hidden = useDemo((s) => s.guideHidden);
  const setHidden = useDemo((s) => s.setGuideHidden);
  const reset = useDemo((s) => s.reset);
  const [open, setOpen] = useState(true);
  if (hidden) return null;

  const done = steps.filter((s) => s.done).length;
  const next = steps.findIndex((s) => !s.done);
  const complete = next === -1;

  return (
    <section aria-labelledby="guide-title" className={cn("overflow-hidden rounded-[2rem] border border-border bg-surface", className)}>
      <div className="flex items-center gap-3 p-4 pl-5 sm:p-5 sm:pl-6">
        <div className="relative grid size-11 shrink-0 place-items-center">
          <svg viewBox="0 0 44 44" className="absolute inset-0 -rotate-90" aria-hidden>
            <circle cx="22" cy="22" r="19" fill="none" strokeWidth="4" className="stroke-surface-2" />
            <circle
              cx="22"
              cy="22"
              r="19"
              fill="none"
              strokeWidth="4"
              strokeLinecap="round"
              className="stroke-brand transition-[stroke-dashoffset] duration-500 ease-[var(--ease-out)]"
              strokeDasharray={2 * Math.PI * 19}
              strokeDashoffset={2 * Math.PI * 19 * (1 - done / steps.length)}
            />
          </svg>
          <span className="nums text-xs font-semibold">
            {done}/{steps.length}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <h2 id="guide-title" className="heading text-[17px]">
            {complete ? "Core loop complete" : "Try the core loop"}
          </h2>
          <p className="truncate text-sm text-muted">
            {complete ? "Fund, answer, pay, refund and log all worked." : `Next: ${steps[next].title.toLowerCase()}`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="guide-steps"
          aria-label={open ? "Collapse guide" : "Expand guide"}
          className="pressable grid size-10 place-items-center rounded-full hover:bg-surface-2"
        >
          <ChevronDown className={cn("size-5 transition-transform duration-200", open && "rotate-180")} />
        </button>
        <button type="button" onClick={() => setHidden(true)} aria-label="Hide guide" className="pressable grid size-10 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-fg">
          <X className="size-5" />
        </button>
      </div>
      {open ? (
        <div id="guide-steps" className="border-t border-border px-3 pb-3 pt-2 sm:px-4">
          <ol className="grid gap-1 lg:grid-cols-5 lg:gap-2">
            {steps.map((s, i) => {
              const isNext = i === next;
              return (
                <li key={s.title}>
                  <Link
                    href={s.href}
                    className={cn(
                      "pressable flex h-full items-start gap-3 rounded-2xl p-3 transition-colors duration-150 lg:flex-col lg:gap-2",
                      isNext ? "bg-brand-soft/70" : "hover:bg-surface-2",
                    )}
                  >
                    <span
                      className={cn(
                        "nums grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold",
                        s.done ? "bg-pay-soft text-pay" : isNext ? "bg-brand text-brand-fg" : "bg-surface-2 text-muted",
                      )}
                    >
                      {s.done ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
                    </span>
                    <span className="min-w-0">
                      <span className={cn("block text-[15px] font-medium", s.done && "text-muted line-through decoration-border-strong")}>{s.title}</span>
                      <span className="mt-0.5 block text-[13px] text-muted">{s.body}</span>
                      {isNext ? <span className="mt-1.5 inline-block text-[13px] font-semibold text-brand-ink">{s.cta} →</span> : null}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
          <p className="px-3 pt-2 text-[13px] text-muted">
            To answer as a second student, sign out and sign in with another allowlisted email.
            {complete ? (
              <button type="button" onClick={() => reset("fresh")} className="ml-2 inline-flex items-center gap-1 font-medium text-brand-ink hover:underline">
                <RotateCcw className="size-3.5" /> Run it again
              </button>
            ) : null}
          </p>
        </div>
      ) : null}
    </section>
  );
}
