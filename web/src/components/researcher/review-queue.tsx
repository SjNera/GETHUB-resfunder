"use client";

import { Check, Inbox, MessageSquareWarning, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Countdown } from "@/components/common/countdown";
import { DecisionBadge } from "@/components/common/decision-badge";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { current, responsesFor, useDemo } from "@/lib/data/store";
import { formatPeso, formatWhen, plural, shortHash } from "@/lib/format";
import { SIGNAL_TEXT } from "@/lib/reasons";
import type { LlmLabel, ResponseRecord, Survey } from "@/lib/types";
import { SurveyShell } from "./survey-shell";

export function ReviewQueue({ id }: { id: string }) {
  return <SurveyShell id={id}>{(survey) => <Queue survey={survey} />}</SurveyShell>;
}

function Queue({ survey }: { survey: Survey }) {
  const all = useDemo((s) => s.responses);
  const responses = responsesFor(all, survey.id);
  const reviews = responses
    .filter((r) => current(r).outcome === "review")
    .sort((a, b) => (a.reviewDeadline ?? "").localeCompare(b.reviewDeadline ?? ""));
  const appeals = responses.filter((r) => r.appeal?.status === "pending");
  const [tab, setTab] = useState<"reviews" | "appeals">("reviews");

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div role="tablist" aria-label="Queue" className="inline-flex gap-1 self-start rounded-full bg-surface-2 p-1">
          {(
            [
              ["reviews", `Open reviews`, reviews.length],
              ["appeals", `Appeals`, appeals.length],
            ] as const
          ).map(([k, label, n]) => (
            <button
              key={k}
              role="tab"
              aria-selected={tab === k}
              onClick={() => setTab(k)}
              className={cn(
                "inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors duration-150",
                tab === k ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg",
              )}
            >
              {label}
              <span className="nums text-muted">{n}</span>
            </button>
          ))}
        </div>
        <p className="text-sm text-muted">Unresolved reviews pay the respondent after 24 h. Every decision is logged.</p>
      </div>

      <div className="mt-6 flex flex-col gap-4">
        {tab === "reviews" ? (
          reviews.length ? (
            reviews.map((r) => <ReviewItem key={r.id} survey={survey} response={r} />)
          ) : (
            <EmptyState icon={<Inbox />} title="Nothing to review">
              Responses the rule engine isn&apos;t sure about will appear here.
            </EmptyState>
          )
        ) : appeals.length ? (
          appeals.map((r) => <AppealItem key={r.id} survey={survey} response={r} />)
        ) : (
          <EmptyState icon={<MessageSquareWarning />} title="No pending appeals">
            Respondents who weren&apos;t paid can appeal once.
          </EmptyState>
        )}
      </div>
    </div>
  );
}

function LabelChip({ label, run }: { label: LlmLabel; run: number }) {
  const tone = label.label === "valid" ? "text-pay" : label.label === "unclear" ? "text-review" : "text-dontpay";
  return (
    <div className="rounded-2xl border border-border p-3">
      <p className="text-xs text-muted">AI run {run}</p>
      <p className={cn("mt-1 text-sm font-semibold", tone)}>
        {label.label.replace("_", "-")}
        {label.non_answer_type ? <span className="font-normal text-muted"> · {label.non_answer_type.replace("_", " ")}</span> : null}
        {label.injection_suspected ? <span className="ml-1 rounded-full bg-dontpay-soft px-1.5 py-px text-[11px] text-dontpay">injection</span> : null}
      </p>
      <p className="mt-1 text-sm text-muted">{label.reason}</p>
    </div>
  );
}

function AnswersBlock({ survey, response }: { survey: Survey; response: ResponseRecord }) {
  const d = current(response);
  const open = survey.questions.filter((q) => q.type === "short_answer" || q.type === "paragraph");
  const others = survey.questions.filter((q) => !open.includes(q));
  return (
    <div className="flex flex-col gap-4">
      {open.map((q) => {
        const labels = d.labels.find((l) => l.questionId === q.id);
        const text = response.answers[q.id];
        return (
          <div key={q.id}>
            <p className="text-sm text-muted">{q.title}</p>
            <p className="mt-1 whitespace-pre-wrap rounded-2xl bg-surface-2 px-4 py-3 text-[15px]">
              {typeof text === "string" && text ? text : <span className="text-subtle">(no answer)</span>}
            </p>
            {labels ? (
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <LabelChip label={labels.runs[0]} run={1} />
                <LabelChip label={labels.runs[1]} run={2} />
              </div>
            ) : null}
          </div>
        );
      })}
      <details className="group">
        <summary className="cursor-pointer text-sm font-medium text-muted hover:text-fg">Other answers ({others.length})</summary>
        <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[1fr_auto]">
          {others.map((q) => (
            <div key={q.id} className="contents">
              <dt className="text-muted">{q.title}</dt>
              <dd className="nums font-medium sm:text-right">
                {Array.isArray(response.answers[q.id]) ? (response.answers[q.id] as string[]).join(", ") : String(response.answers[q.id] ?? "—")}
              </dd>
            </div>
          ))}
        </dl>
      </details>
    </div>
  );
}

function ReviewItem({ survey, response }: { survey: Survey; response: ResponseRecord }) {
  const resolveReview = useDemo((s) => s.resolveReview);
  const [note, setNote] = useState("");
  const d = current(response);
  const codes = [...new Set(d.signals.map((s) => s.code))];
  const elapsed = (new Date(response.submittedAt).getTime() - new Date(response.startedAt).getTime()) / 1000;

  return (
    <article className="rise-in rounded-3xl border border-border bg-surface p-5 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <DecisionBadge outcome="review" size="sm" />
            <span className="font-mono text-[13px] text-muted">{shortHash(response.respondentHash)}</span>
          </div>
          <p className="mt-2 text-sm text-muted">
            Submitted {formatWhen(response.submittedAt)} · took {Math.round(elapsed)}s
          </p>
        </div>
        {response.reviewDeadline ? (
          <p className="rounded-full bg-review-soft px-3 py-1.5 text-sm text-review">
            Auto-pays in <Countdown to={response.reviewDeadline} suffix="" showAbsolute={false} />
          </p>
        ) : null}
      </header>

      <div className="mt-4 flex flex-wrap gap-2">
        {codes.map((c) => (
          <span key={c} className="rounded-full border border-border px-2.5 py-1 text-[13px]">
            {SIGNAL_TEXT[c].label}
          </span>
        ))}
      </div>

      <div className="mt-5">
        <AnswersBlock survey={survey} response={response} />
      </div>

      <footer className="mt-6 flex flex-wrap gap-2 border-t border-border pt-5">
        <Button
          variant="success"
          onClick={() => {
            resolveReview(response.id, "pay", "Approved by researcher");
            toast.success(`Paid ${formatPeso(survey.rateCentavos)}`, { description: "Sent on-chain (simulated in demo mode)." });
          }}
        >
          <Check />
          Pay {formatPeso(survey.rateCentavos)}
        </Button>
        <Dialog>
          <DialogTrigger render={<Button variant="outline" />}>
            <X />
            Don&apos;t pay
          </DialogTrigger>
          <DialogContent title="Don't pay this response?" description="The respondent will see your reason and can appeal once.">
            <Field label="Reason shown to the respondent" htmlFor={`note-${response.id}`} hint="Be specific and kind. Required.">
              <Textarea
                id={`note-${response.id}`}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Your answer to question 9 doesn't describe what keeps you up late."
              />
            </Field>
            <div className="mt-6 flex justify-end gap-2">
              <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
              <DialogClose
                disabled={note.trim().length < 5}
                render={
                  <Button
                    variant="danger"
                    onClick={() => {
                      resolveReview(response.id, "dont_pay", note.trim());
                      toast("Marked as Don't pay", { description: "The respondent can appeal once." });
                    }}
                  />
                }
              >
                Don&apos;t pay
              </DialogClose>
            </div>
          </DialogContent>
        </Dialog>
      </footer>
    </article>
  );
}

function AppealItem({ survey, response }: { survey: Survey; response: ResponseRecord }) {
  const resolveAppeal = useDemo((s) => s.resolveAppeal);
  const d = current(response);
  const codes = [...new Set(d.signals.filter((s) => s.strength === "hard").map((s) => s.code))];
  return (
    <article className="rise-in rounded-3xl border border-border bg-surface p-5 sm:p-6">
      <header className="flex flex-wrap items-center gap-2">
        <DecisionBadge outcome={d.outcome} size="sm" />
        <span className="font-mono text-[13px] text-muted">{shortHash(response.respondentHash)}</span>
        <span className="text-sm text-muted">· appealed {formatWhen(response.appeal!.submittedAt)}</span>
      </header>
      <p className="mt-4 text-sm text-muted">Original reason</p>
      <p className="mt-1 text-[15px]">{codes.map((c) => SIGNAL_TEXT[c].label).join(", ") || d.note}</p>
      <p className="mt-4 text-sm text-muted">Their appeal</p>
      <blockquote className="mt-1 rounded-2xl bg-surface-2 px-4 py-3 text-[15px]">“{response.appeal!.message}”</blockquote>
      <div className="mt-5">
        <AnswersBlock survey={survey} response={response} />
      </div>
      <footer className="mt-6 flex flex-wrap gap-2 border-t border-border pt-5">
        <Button
          variant="success"
          onClick={() => {
            resolveAppeal(response.id, true, "Appeal accepted");
            toast.success(`Appeal accepted · paid ${formatPeso(survey.rateCentavos)}`);
          }}
        >
          <Check />
          Accept and pay
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            resolveAppeal(response.id, false);
            toast("Decision kept", { description: "The respondent has used their one appeal." });
          }}
        >
          Keep decision
        </Button>
      </footer>
      <p className="mt-3 text-xs text-subtle">{plural(1, "appeal")} allowed per response.</p>
    </article>
  );
}
