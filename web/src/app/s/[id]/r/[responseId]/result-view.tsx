"use client";

import { Check, Clock3, FileQuestion, Loader2, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { TxLink, AddressChip } from "@/components/common/chain";
import { Countdown } from "@/components/common/countdown";
import { DecisionBadge } from "@/components/common/decision-badge";
import { EmptyState } from "@/components/common/empty-state";
import { DemoGate } from "@/components/demo-gate";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { current, useDemo } from "@/lib/data/store";
import { formatDateTime, formatPeso } from "@/lib/format";
import { DECIDED_BY_TEXT, OUTCOME_TEXT, SIGNAL_TEXT } from "@/lib/reasons";
import type { Decision } from "@/lib/types";

export function ResultView({ surveyId, responseId }: { surveyId: string; responseId: string }) {
  return (
    <DemoGate>
      <Result surveyId={surveyId} responseId={responseId} />
    </DemoGate>
  );
}

const PIPELINE = ["Code checks", "AI label, run 1 and 2", "Rule engine decision"];

function Checking({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (step >= PIPELINE.length) {
      const t = setTimeout(onDone, 250);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setStep((s) => s + 1), 520);
    return () => clearTimeout(t);
  }, [step, onDone]);
  return (
    <div className="mx-auto max-w-xl px-4 py-16 sm:py-24" aria-live="polite">
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
    if (!checking) window.history.replaceState(null, "", `/s/${surveyId}/r/${responseId}`);
  }, [checking, responseId, surveyId]);

  if (!response || !survey || response.surveyId !== surveyId) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <EmptyState icon={<FileQuestion />} title="Response not found" action={<ButtonLink href="/" variant="outline">Go home</ButtonLink>}>
          This demo keeps data in your browser, so results from another device won&apos;t appear here.
        </EmptyState>
      </div>
    );
  }

  if (checking) return <Checking onDone={() => setChecking(false)} />;

  const d = current(response);
  const reasons = reasonsFor(d);
  const history = response.decisions;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="text-sm text-muted">{survey.title}</p>

      {d.outcome === "pay" ? (
        <section className="rise-in mt-3">
          <div className="grid size-14 place-items-center rounded-full bg-pay-soft text-pay">
            <Check className="size-7" strokeWidth={3} />
          </div>
          <h1 className="display mt-6 text-[clamp(2.5rem,7vw,4rem)]">{formatPeso(survey.rateCentavos)} sent</h1>
          <p className="mt-3 text-lg text-muted">
            Thanks for an honest answer.{" "}
            {d.decidedBy === "timeout"
              ? "The researcher didn't decide within 24 hours, so you were paid automatically."
              : d.decidedBy === "researcher"
                ? "The researcher reviewed your response and approved it."
                : d.decidedBy === "appeal"
                  ? "Your appeal was accepted."
                  : "Your response passed screening."}
          </p>
          <dl className="mt-8 grid gap-4 rounded-3xl border border-border bg-surface p-5 sm:grid-cols-2 sm:p-6">
            <div>
              <dt className="text-sm text-muted">Sent to</dt>
              <dd className="mt-1"><AddressChip address={response.wallet} /></dd>
            </div>
            <div>
              <dt className="text-sm text-muted">Transaction</dt>
              <dd className="mt-1">{d.payoutTx ? <TxLink hash={d.payoutTx} simulated={d.simulated} /> : "—"}</dd>
            </div>
          </dl>
        </section>
      ) : d.outcome === "review" ? (
        <section className="rise-in mt-3">
          <div className="grid size-14 place-items-center rounded-full bg-review-soft text-review">
            <Clock3 className="size-7" strokeWidth={2.5} />
          </div>
          <h1 className="display mt-6 text-[clamp(2.5rem,7vw,4rem)]">A person will check</h1>
          <p className="mt-3 text-lg text-muted">
            Your response wasn&apos;t rejected. The researcher decides within 24 hours —{" "}
            <strong className="font-semibold text-fg">if they don&apos;t, you&apos;re paid automatically.</strong>
          </p>
          {response.reviewDeadline ? (
            <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-review-soft px-4 py-2 text-[15px] text-review">
              <Clock3 className="size-4" />
              <Countdown to={response.reviewDeadline} />
            </p>
          ) : null}
          {reasons.length ? <Reasons title="Why it needs a person" reasons={reasons} /> : null}
        </section>
      ) : (
        <section className="rise-in mt-3">
          <div className="grid size-14 place-items-center rounded-full bg-dontpay-soft text-dontpay">
            <X className="size-7" strokeWidth={3} />
          </div>
          <h1 className="display mt-6 text-[clamp(2.5rem,7vw,4rem)]">Not paid</h1>
          <p className="mt-3 text-lg text-muted">
            {d.decidedBy === "researcher" ? "The researcher reviewed your response and didn't approve it." : "Your response didn't pass a code check."}
          </p>
          {reasons.length ? <Reasons title="The reason" reasons={reasons} /> : null}
          {d.note ? <p className="mt-3 rounded-2xl bg-surface-2 p-4 text-[15px]">Researcher&apos;s note: “{d.note}”</p> : null}

          <div className="mt-8 rounded-3xl border border-border bg-surface p-5 sm:p-6">
            {response.appeal ? (
              <>
                <h2 className="heading text-lg">
                  {response.appeal.status === "pending" ? "Appeal sent" : response.appeal.status === "upheld" ? "Appeal reviewed: not paid" : "Appeal accepted"}
                </h2>
                <p className="mt-2 text-muted">
                  {response.appeal.status === "pending"
                    ? "The researcher will look at it. You can only appeal once."
                    : "Every response can be appealed once, and this one has been."}
                </p>
                <blockquote className="mt-4 border-l-2 border-border-strong pl-4 text-[15px] text-muted">“{response.appeal.message}”</blockquote>
              </>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (message.trim().length >= 10) appeal(response.id, message.trim());
                }}
              >
                <h2 className="heading text-lg">Think this is wrong? Appeal once.</h2>
                <Field
                  label="Tell the researcher what happened"
                  htmlFor="appeal"
                  hint="At least 10 characters. You can only appeal once."
                  className="mt-4"
                >
                  <Textarea id="appeal" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="My answer was honest because…" />
                </Field>
                <Button type="submit" variant="dark" className="mt-4" disabled={message.trim().length < 10}>
                  Send appeal
                </Button>
              </form>
            )}
          </div>
        </section>
      )}

      {history.length > 1 ? (
        <section className="mt-10">
          <h2 className="eyebrow">History</h2>
          <ol className="mt-3 flex flex-col gap-2">
            {history.map((h, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2 text-[15px]">
                <DecisionBadge outcome={h.outcome} size="sm" />
                <span className="text-muted">
                  {DECIDED_BY_TEXT[h.decidedBy]} · {formatDateTime(h.decidedAt)}
                </span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <div className="mt-12 flex flex-wrap gap-3">
        <ButtonLink href="/" variant="outline">Back to home</ButtonLink>
        <Link href="/rubric" className="inline-flex h-11 items-center px-2 text-[15px] text-muted hover:text-fg">
          How screening works
        </Link>
      </div>
      <p className="mt-8 text-xs text-subtle">
        Decision: {OUTCOME_TEXT[d.outcome].label} · {d.rubricVersion} · {d.modelVersion}
      </p>
    </div>
  );
}

function Reasons({ title, reasons }: { title: string; reasons: string[] }) {
  return (
    <div className="mt-8">
      <h2 className="eyebrow">{title}</h2>
      <ul className="mt-3 flex flex-col gap-2">
        {reasons.map((r) => (
          <li key={r} className="rounded-2xl border border-border bg-surface px-4 py-3 text-[15px]">
            {r}
          </li>
        ))}
      </ul>
    </div>
  );
}
