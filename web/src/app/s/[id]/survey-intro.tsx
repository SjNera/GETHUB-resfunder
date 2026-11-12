"use client";

import { Check, Clock3, FileQuestion, Lock, ShieldCheck, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Countdown } from "@/components/common/countdown";
import { EmptyState } from "@/components/common/empty-state";
import { DemoGate } from "@/components/demo-gate";
import { Button, ButtonLink } from "@/components/ui/button";
import { current, responsesFor, surveyStats, useDemo } from "@/lib/data/store";
import { respondentHash } from "@/lib/demo/seed";
import { formatDateTime, formatPeso, plural } from "@/lib/format";

export const consentKey = (id: string) => `resfunder-consent-${id}`;

export function SurveyIntro({ id }: { id: string }) {
  return (
    <DemoGate>
      <Intro id={id} />
    </DemoGate>
  );
}

function Intro({ id }: { id: string }) {
  const router = useRouter();
  const survey = useDemo((s) => s.surveys[id]);
  const all = useDemo((s) => s.responses);
  const session = useDemo((s) => s.session);
  const [agreed, setAgreed] = useState(false);

  if (!survey) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <EmptyState icon={<FileQuestion />} title="Survey not found" action={<ButtonLink href="/" variant="outline">Go home</ButtonLink>}>
          The link may be wrong, or the survey was removed.
        </EmptyState>
      </div>
    );
  }

  const responses = responsesFor(all, id);
  const stats = surveyStats(survey, responses);
  const spotsLeft = Math.max(0, survey.quota - stats.counts.pay - stats.counts.review);
  const mine = session ? responses.find((r) => r.respondentHash === respondentHash(id, session.email)) : undefined;

  const blocked =
    survey.status === "draft"
      ? { title: "This survey isn't live yet", body: "The researcher hasn't funded it. Check back once it's launched." }
      : survey.status === "closed"
        ? { title: "This survey is closed", body: "It reached its deadline or quota. Unused budget went back to the researcher." }
        : survey.status === "paused"
          ? { title: "Payments are paused", body: "The pause switch is on, so no one can be paid right now." }
          : spotsLeft === 0
            ? { title: "The quota is full", body: "Every paid spot has been taken." }
            : null;

  const start = () => {
    try {
      sessionStorage.setItem(consentKey(id), "1");
    } catch {}
    const target = `/s/${id}/answer`;
    router.push(session ? target : `/sign-in?next=${encodeURIComponent(target)}`);
  };

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:py-12">
      {/* Finyon split: gradient panel with the facts */}
      <section className="relative isolate flex flex-col overflow-hidden rounded-[2.5rem] p-7 text-[#121212] sm:p-10 [background:radial-gradient(120%_90%_at_15%_0%,#ffe2bf_0%,#ffb066_40%,#ff8a1c_100%)]">
        <div aria-hidden className="absolute -right-20 -top-16 -z-10 size-72 rounded-full bg-white/30 blur-3xl" />
        <p className="text-sm font-medium opacity-70">
          {survey.researcher} · {survey.institution}
        </p>
        <h1 className="display mt-4 text-[clamp(2rem,4.6vw,3.25rem)]">{survey.title}</h1>
        <p className="mt-4 max-w-lg text-[17px] opacity-80">{survey.description}</p>
        <div className="mt-auto grid grid-cols-3 gap-4 pt-10">
          <div>
            <p className="display nums text-4xl sm:text-5xl">{formatPeso(survey.rateCentavos)}</p>
            <p className="mt-1 text-sm opacity-70">per valid answer</p>
          </div>
          <div className="border-l border-black/20 pl-4">
            <p className="display nums text-4xl sm:text-5xl">{survey.estimatedMinutes}m</p>
            <p className="mt-1 text-sm opacity-70">to complete</p>
          </div>
          <div className="border-l border-black/20 pl-4">
            <p className="display nums text-4xl sm:text-5xl">{spotsLeft}</p>
            <p className="mt-1 text-sm opacity-70">paid spots left</p>
          </div>
        </div>
        {survey.status === "live" ? (
          <p className="mt-6 text-sm opacity-75">
            Closes in <Countdown to={survey.deadline} suffix="" showAbsolute={false} /> · {formatDateTime(survey.deadline)}
          </p>
        ) : null}
      </section>

      <section className="flex flex-col rounded-[2.5rem] border border-border bg-surface p-7 sm:p-10">
        {mine ? (
          <div>
            <p className="eyebrow">Already answered</p>
            <h2 className="display mt-3 text-3xl">You&apos;ve already answered this survey</h2>
            <p className="mt-3 text-muted">
              Each verified student can be paid once per survey, so a second response isn&apos;t allowed. You can still see
              how your answer was screened.
            </p>
            <ButtonLink href={`/s/${id}/r/${mine.id}`} variant="dark" size="lg" className="mt-6">
              See my result
            </ButtonLink>
            <p className="mt-4 text-sm text-muted">Current status: {current(mine).outcome.replace("_", " ")}</p>
          </div>
        ) : blocked ? (
          <div>
            <p className="eyebrow">Not available</p>
            <h2 className="display mt-3 text-3xl">{blocked.title}</h2>
            <p className="mt-3 text-muted">{blocked.body}</p>
            <ButtonLink href="/" variant="outline" size="lg" className="mt-6">
              Back to home
            </ButtonLink>
          </div>
        ) : (
          <>
            <p className="eyebrow">Before you start</p>
            <h2 className="display mt-3 text-3xl">How you get paid</h2>
            <ul className="mt-6 flex flex-col gap-4 text-[15px]">
              <li className="flex gap-3">
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-pay-soft text-pay"><Check className="size-3.5" strokeWidth={3} /></span>
                <span>
                  <strong className="font-semibold">Honest answers are paid in seconds</strong> — {formatPeso(survey.rateCentavos)} in test tokens to
                  your wallet, with a BscScan receipt. Short answers and Taglish are fine.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-review-soft text-review"><Clock3 className="size-3.5" strokeWidth={3} /></span>
                <span>
                  <strong className="font-semibold">Unclear cases go to a person.</strong> The researcher decides within 24 hours; if they
                  don&apos;t, you&apos;re paid automatically.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-dontpay-soft text-dontpay"><X className="size-3.5" strokeWidth={3} /></span>
                <span>
                  <strong className="font-semibold">Empty, copied or keyboard-mash answers aren&apos;t paid.</strong> You&apos;ll see the reason and can
                  appeal once.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-surface-2 text-muted"><ShieldCheck className="size-3.5" /></span>
                <span>
                  Your open-ended answers are sent to a <strong className="font-semibold">third-party AI model (Groq)</strong> to check for
                  non-answers. Answers stay off-chain; only a hash of your school email goes on-chain. Handled under the Data
                  Privacy Act of 2012.
                </span>
              </li>
            </ul>
            <Link href="/rubric" className="mt-4 text-sm font-medium text-brand-ink hover:underline">
              Read the full screening rubric
            </Link>

            <label className="mt-8 flex cursor-pointer items-start gap-3 rounded-2xl border border-border p-4 has-[:checked]:border-fg/50 has-[:checked]:bg-surface-2">
              <input
                type="checkbox"
                className="mt-1 size-5 shrink-0 accent-[#121212] dark:accent-[#f2f1ee]"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
              />
              <span className="text-[15px]">
                I&apos;ve read how screening and payment work, and I agree that my answers are checked by an AI model.
              </span>
            </label>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button variant="primary" size="lg" disabled={!agreed} onClick={start}>
                {session ? "Start the survey" : "Verify school email to start"}
              </Button>
              {!session ? (
                <span className="inline-flex items-center gap-1.5 text-sm text-muted">
                  <Lock className="size-3.5" /> One payout per student
                </span>
              ) : (
                <span className="text-sm text-muted">Signed in as {session.email}</span>
              )}
            </div>
            <p className="mt-6 text-sm text-subtle">{plural(stats.total, "student")} answered so far.</p>
          </>
        )}
      </section>
    </div>
  );
}
