"use client";

import { Check, FileQuestion, Loader2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthGate } from "@/components/app/auth-gate";
import { ActionBar, CloseLink, StepPill } from "@/components/app/nav-bits";
import { AddressChip, Peso, TxLink } from "@/components/common/chain";
import { Countdown } from "@/components/common/countdown";
import { DecisionBadge } from "@/components/common/decision-badge";
import { EmptyState } from "@/components/common/empty-state";
import { InlineTip } from "@/components/guide/inline-tip";
import { ResultStage } from "@/components/three/result-stage";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { current, useDemo } from "@/lib/data/store";
import { formatDateTime } from "@/lib/format";
import { DECIDED_BY_TEXT, SIGNAL_TEXT } from "@/lib/reasons";
import type { Decision } from "@/lib/types";

export function ResultView({ surveyId, responseId }: { surveyId: string; responseId: string }) {
  return (
    <AuthGate>
      <Result surveyId={surveyId} responseId={responseId} />
    </AuthGate>
  );
}

const PIPELINE = ["Code checks", "AI label, run 1 and 2", "Rule engine decision", "Agent wallet"];

function Checking({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (step >= PIPELINE.length) {
      const t = setTimeout(onDone, 200);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setStep((s) => s + 1), 480);
    return () => clearTimeout(t);
  }, [step, onDone]);
  return (
    <div className="mx-auto max-w-xl px-5 py-16 sm:py-24" aria-live="polite">
      <h1 className="display text-4xl">Checking your answers…</h1>
      <ol className="mt-8 flex flex-col gap-3">
        {PIPELINE.map((label, i) => (
          <li key={label} className={cn("flex items-center gap-3 text-lg transition-opacity duration-200", i > step && "opacity-40")}>
            <span className="grid size-7 place-items-center rounded-full bg-surface-2">
              {i < step ? <Check className="size-4 text-pay" strokeWidth={3} /> : i === step ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" /> : null}
            </span>
            {label}
          </li>
        ))}
      </ol>
    </div>
  );
}

function reasonsFor(d: Decision) {
  const seen = new Set<string>();
  return d.signals
    .filter((s) => (d.outcome === "pay" ? false : d.outcome === "dont_pay" ? s.strength === "hard" : s.strength !== "hard"))
    .filter((s) => (seen.has(s.code) ? false : (seen.add(s.code), true)))
    .map((s) => SIGNAL_TEXT[s.code].respondent);
}

function Result({ surveyId, responseId }: { surveyId: string; responseId: string }) {
  const params = useSearchParams();
  const [checking, setChecking] = useState(params.get("fresh") === "1");
  const response = useDemo((s) => s.responses[responseId]);
  const survey = useDemo((s) => s.surveys[surveyId]);
  const appeal = useDemo((s) => s.appeal);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!checking) window.history.replaceState(null, "", `/answer/${surveyId}/r/${responseId}`);
  }, [checking, responseId, surveyId]);

  if (!response || !survey || response.surveyId !== surveyId) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <EmptyState icon={<FileQuestion />} title="Response not found" action={<ButtonLink href="/answer" variant="outline">Back to Answer</ButtonLink>}>
          Demo data lives in your browser, so results from another device won&apos;t appear here.
        </EmptyState>
      </div>
    );
  }
  if (checking) return <Checking onDone={() => setChecking(false)} />;

  const d = current(response);
  const reasons = reasonsFor(d);

  const copy =
    d.outcome === "pay"
      ? {
          eyebrow: d.decidedBy === "rule_engine" ? "Rule engine · Pay" : `${DECIDED_BY_TEXT[d.decidedBy]} · Pay`,
          headline: (
            <>
              <Peso amount={survey.rateUnits} /> sent.
            </>
          ),
          body:
            d.decidedBy === "timeout"
              ? "The researcher didn't decide within 24 hours, so you were paid automatically."
              : d.decidedBy === "researcher"
                ? "The researcher reviewed your response and approved it."
                : d.decidedBy === "appeal"
                  ? "Your appeal was accepted."
                  : "Your answers passed screening, and the agent wallet paid you instantly.",
        }
      : d.outcome === "review"
        ? { eyebrow: "Rule engine · Review", headline: "A person will check.", body: "Not rejected. The researcher decides within 24 hours; if they don't, you're paid automatically." }
        : { eyebrow: "Code check · Don't pay", headline: "Not paid.", body: d.decidedBy === "researcher" ? "The researcher reviewed your response and didn't approve it." : "Your response didn't pass a code check. You can appeal once." };

  return (
    <div className="page-in mx-auto max-w-2xl px-3 pb-36 pt-5 sm:px-6">
      <ResultStage outcome={d.outcome}>
        <StepPill step={3} of={3} label="Result" className="absolute left-3 top-3" />
        <CloseLink href="/answer" label="Close and go to Answer" className="absolute right-3 top-3" />
      </ResultStage>

      <div className="mt-6 px-2">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h1 className="display mt-2 text-[clamp(2.5rem,9vw,3.5rem)] [line-height:1.02]">{copy.headline}</h1>
        <p className="mt-3 text-lg text-muted">{copy.body}</p>
      </div>

      {d.outcome === "pay" ? (
        <>
          <dl className="mt-6 grid gap-4 rounded-[2rem] border border-border bg-surface p-5 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-muted">Sent to</dt>
              <dd className="mt-1"><AddressChip address={response.wallet} /></dd>
            </div>
            <div>
              <dt className="text-sm text-muted">BscScan receipt</dt>
              <dd className="mt-1">{d.payoutTx ? <TxLink hash={d.payoutTx} simulated={d.simulated} /> : "—"}</dd>
            </div>
          </dl>
          <InlineTip id="result-receipt" className="mt-4">
            Every payout has a public receipt on BscScan. In demo mode it&apos;s simulated until the contract and agent wallet are connected.
          </InlineTip>
        </>
      ) : null}

      {d.outcome === "review" && response.reviewDeadline ? (
        <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-review-soft px-4 py-2 text-[15px] text-review">
          Auto-pays in <Countdown to={response.reviewDeadline} suffix="" />
        </p>
      ) : null}

      {reasons.length ? (
        <div className="mt-6">
          <h2 className="eyebrow px-2">{d.outcome === "review" ? "Why a person will check" : "The reason"}</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {reasons.map((r) => (
              <li key={r} className="rounded-2xl border border-border bg-surface px-4 py-3 text-[15px]">{r}</li>
            ))}
          </ul>
          {d.note ? <p className="mt-2 rounded-2xl bg-surface-2 p-4 text-[15px]">Researcher&apos;s note: “{d.note}”</p> : null}
        </div>
      ) : null}

      {d.outcome === "dont_pay" ? (
        <div className="mt-6 rounded-[2rem] border border-border bg-surface p-5">
          {response.appeal ? (
            <>
              <h2 className="heading text-lg">{response.appeal.status === "pending" ? "Appeal sent" : response.appeal.status === "upheld" ? "Appeal reviewed: not paid" : "Appeal accepted"}</h2>
              <p className="mt-1 text-muted">{response.appeal.status === "pending" ? "The researcher will look at it. You can only appeal once." : "Each response can be appealed once."}</p>
              <blockquote className="mt-3 border-l-2 border-border-strong pl-4 text-[15px] text-muted">“{response.appeal.message}”</blockquote>
            </>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (message.trim().length >= 10) appeal(response.id, message.trim());
              }}
            >
              <h2 className="heading text-lg">Think this is wrong? Appeal once.</h2>
              <Field label="Tell the researcher what happened" htmlFor="appeal" hint="At least 10 characters." className="mt-3">
                <Textarea id="appeal" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="My answer was honest because…" />
              </Field>
              <Button type="submit" variant="dark" className="mt-3" disabled={message.trim().length < 10}>
                Send appeal
              </Button>
            </form>
          )}
        </div>
      ) : null}

      {response.decisions.length > 1 ? (
        <section className="mt-8 px-2">
          <h2 className="eyebrow">History</h2>
          <ol className="mt-2 flex flex-col gap-2">
            {response.decisions.map((h, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2 text-[15px]">
                <DecisionBadge outcome={h.outcome} size="sm" />
                <span className="text-muted">{DECIDED_BY_TEXT[h.decidedBy]} · {formatDateTime(h.decidedAt)}</span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <p className="mt-8 px-2 text-xs text-subtle">
        {d.rubricVersion} · {d.modelVersion} · <Link href="/rubric" className="underline-offset-4 hover:underline">How screening works</Link>
      </p>

      <ActionBar>
        <span className="on-glass min-w-0 truncate text-sm">Want to see the other side?</span>
        <ButtonLink href={`/publish/${surveyId}/log`} variant="dark">
          Open decision log
        </ButtonLink>
      </ActionBar>
    </div>
  );
}
