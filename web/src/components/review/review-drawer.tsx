"use client";

import { Dialog } from "@base-ui/react/dialog";
import { AlertTriangle, Check, ChevronDown, ChevronLeft, ChevronRight, CircleAlert, Copy, ExternalLink, Flag, HelpCircle, ListChecks, Loader2, MessageSquareQuote, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { formatBnb, txUrl } from "@/lib/format";
import { shortAddress } from "@/lib/auth/metamask";
import { type DemoResponse, type DemoSurvey, DONT_PAY_REASONS, MEDIAN_SECONDS, minutes, RESPONSES, rsp } from "@/lib/review/seed";
import { decide, type ReviewDecision, undo } from "@/lib/review/store";

export function ReviewDrawer({
  survey,
  openId,
  onOpenChange,
  decisions,
}: {
  survey: DemoSurvey;
  openId: string | null;
  onOpenChange: (id: string | null) => void;
  decisions: Record<string, ReviewDecision>;
}) {
  const r = RESPONSES.find((x) => x.id === openId) ?? null;
  return (
    <Dialog.Root open={!!r} onOpenChange={(o) => !o && onOpenChange(null)}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/35 transition-opacity duration-200 ease-out data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 dark:bg-black/60" />
        <Dialog.Popup
          className={cn(
            "fixed z-50 flex flex-col bg-surface text-fg shadow-2xl outline-none",
            // phone: full-height bottom sheet · desktop: right side sheet
            "inset-x-0 bottom-0 top-[max(0.75rem,env(safe-area-inset-top))] rounded-t-[1.75rem]",
            "sm:inset-y-0 sm:left-auto sm:right-0 sm:top-0 sm:w-[min(560px,100vw)] sm:rounded-none sm:rounded-l-[1.75rem]",
            "transition-transform duration-[260ms] ease-[var(--ease-drawer)] data-[ending-style]:duration-200",
            "data-[starting-style]:translate-y-full data-[ending-style]:translate-y-full sm:data-[starting-style]:translate-x-full sm:data-[starting-style]:translate-y-0 sm:data-[ending-style]:translate-x-full sm:data-[ending-style]:translate-y-0",
            "motion-reduce:transition-opacity motion-reduce:data-[starting-style]:translate-x-0 motion-reduce:data-[starting-style]:translate-y-0 motion-reduce:data-[starting-style]:opacity-0 motion-reduce:data-[ending-style]:translate-x-0 motion-reduce:data-[ending-style]:translate-y-0 motion-reduce:data-[ending-style]:opacity-0",
          )}
        >
          {r ? <DrawerBody key={r.id} r={r} survey={survey} decisions={decisions} onOpen={onOpenChange} /> : null}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

type Flag = { tone: "warn" | "danger"; title: string; runs: DemoResponse["runs"][string] };

/** Turn the rule engine's AI result into one or two plain callouts. */
function flagsFor(r: DemoResponse): Flag[] {
  const runs = r.runs[`q${r.flagQ + 1}`];
  const ai = r.decision.ai;
  const out: Flag[] = [];
  if (!ai || !runs) return out;
  if (ai.injection) out.push({ tone: "danger", title: "Instructions aimed at the AI", runs });
  if (!ai.agreed) {
    const l = runs.map((x) => (x ? x.label.replace("_", "-") : "failed"));
    out.push({ tone: "warn", title: `AI checks disagree: 1 ${l[0]}, 1 ${l[1]}`, runs });
  } else if (ai.label !== "valid" && !ai.injection) {
    const type = ai.type === "off_question" ? "off-topic" : ai.type === "evasive" ? "filler" : ai.label.replace("_", "-");
    out.push({ tone: "warn", title: `Both AI checks: ${type}`, runs });
  }
  return out;
}

function DrawerBody({ r, survey, decisions, onOpen }: { r: DemoResponse; survey: DemoSurvey; decisions: Record<string, ReviewDecision>; onOpen: (id: string | null) => void }) {
  const d = decisions[r.id];
  const pending = RESPONSES.filter((x) => !decisions[x.id]);
  const i = pending.findIndex((x) => x.id === r.id);
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState(0);
  const [allAnswers, setAllAnswers] = useState(false);
  const [copied, setCopied] = useState(false);

  const signals = r.decision.signals;
  const codeOk = signals.hardFails.length + signals.weak.length === 0;
  const flags = flagsFor(r);
  const undoable = Object.entries(decisions)
    .filter(([id, x]) => id !== r.id && x.status === "undo_window")
    .sort((a, b) => b[1].decidedAt - a[1].decidedAt)[0];

  const advance = () => {
    const rest = RESPONSES.filter((x) => x.id !== r.id && !decisions[x.id]);
    const after = rest.find((x) => RESPONSES.indexOf(x) > RESPONSES.indexOf(r)) ?? rest[0];
    onOpen(after ? after.id : null);
  };

  const status = !d
    ? { label: "Needs review", cls: "bg-review-soft text-review" }
    : d.result === "pay"
      ? { label: "Paid", cls: "bg-pay-soft text-pay" }
      : { label: "Not paid", cls: "bg-dontpay-soft text-dontpay" };

  return (
    <>
      {/* top bar */}
      <div className="flex h-14 shrink-0 items-center gap-1 px-3 sm:px-4">
        {d ? null : (
          <>
            <Button size="icon" variant="ghost" aria-label="Previous response" disabled={i <= 0} onClick={() => onOpen(pending[i - 1]?.id ?? null)}>
              <ChevronLeft className="!size-5" />
            </Button>
            <span className="min-w-12 text-center text-sm tabular-nums text-muted">
              {i + 1} of {pending.length}
            </span>
            <Button size="icon" variant="ghost" aria-label="Next response" disabled={i >= pending.length - 1} onClick={() => onOpen(pending[i + 1]?.id ?? null)}>
              <ChevronRight className="!size-5" />
            </Button>
          </>
        )}
        <Dialog.Close aria-label="Close" className="pressable ml-auto grid size-10 place-items-center rounded-full text-muted [@media(hover:hover)_and_(pointer:fine)]:hover:bg-surface-2 [@media(hover:hover)_and_(pointer:fine)]:hover:text-fg">
          <X className="size-5" />
        </Dialog.Close>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-6 animate-[fade-in_160ms_var(--ease-out)] motion-reduce:animate-none sm:px-7">
        {/* header: icon tile · title · status */}
        <div className="flex items-start gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl border border-border bg-bg text-brand-ink">
            <Flag className="size-6" />
          </span>
          <div className="min-w-0">
            <Dialog.Title className="text-[22px] font-semibold leading-tight tracking-[-0.02em]">{r.headline}</Dialog.Title>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-muted">
              <span className="font-mono text-fg">{rsp(r.num)}</span>
              <span className={cn("rounded-full px-2.5 py-0.5 text-[13px] font-medium", status.cls)}>{status.label}</span>
            </div>
          </div>
        </div>
        <Dialog.Description className="mt-4 text-[15px] leading-relaxed text-muted">
          Submitted {r.ago}, took {minutes(r.tookSeconds)}. Screening sent it to you because {r.decision.ai && !r.decision.ai.agreed ? "the two AI checks disagree" : r.decision.ai?.injection ? "it contains instructions aimed at the AI" : "the AI says it may not answer the question"}.
        </Dialog.Description>

        {/* flagged answer */}
        <Section icon={<MessageSquareQuote />} title={`Question ${r.flagQ + 1} of ${survey.questions.length}`}>
          <p className="text-[15px] text-muted">{survey.questions[r.flagQ].title}</p>
          <blockquote className="mt-2 rounded-xl border-l-[3px] border-brand bg-brand-soft/60 px-4 py-3 text-[16px] leading-relaxed">
            {r.answers[r.flagQ] || <span className="text-muted">No answer</span>}
          </blockquote>
        </Section>

        {/* screening checklist */}
        <Section icon={<ListChecks />} title="Screening">
          <ul className="flex flex-col gap-2.5">
            <CheckRow ok={codeOk}>
              {codeOk ? "Code checks passed" : "A code check failed"}
              <span className="text-muted"> · {5 - signals.hardFails.length - signals.weak.length} of 5 · took {minutes(r.tookSeconds)}, median {minutes(MEDIAN_SECONDS)}</span>
            </CheckRow>
          </ul>
          <div className="mt-3 flex flex-col gap-2">
            {flags.map((f) => (
              <Callout key={f.title} flag={f} />
            ))}
          </div>
        </Section>

        {/* details: key-value card */}
        <div className="mt-6 overflow-hidden rounded-2xl border border-border">
          <dl className="divide-y divide-border text-[15px]">
            <KV k="Survey">{survey.title}</KV>
            <KV k="Wallet">
              <span className="flex items-center justify-between gap-2">
                <span className="font-mono">{shortAddress(r.wallet)}</span>
                <button
                  type="button"
                  aria-label="Copy wallet address"
                  className="pressable -my-2 grid size-9 place-items-center rounded-full text-muted [@media(hover:hover)_and_(pointer:fine)]:hover:bg-surface-2"
                  onClick={() => {
                    navigator.clipboard?.writeText(r.wallet).then(() => setCopied(true), () => {});
                    setTimeout(() => setCopied(false), 1500);
                  }}
                >
                  <span key={copied ? "y" : "n"} className="animate-[swap_150ms_var(--ease-out)] motion-reduce:animate-none">
                    {copied ? <Check className="size-4 text-pay" /> : <Copy className="size-4" />}
                  </span>
                </button>
              </span>
            </KV>
            <KV k="Screened by">
              <span className="font-mono text-[13px]">{r.decision.llmModel}</span>
              <span className="block text-[13px] text-muted">{r.decision.rubricVersion}</span>
            </KV>
          </dl>
          <button
            type="button"
            aria-expanded={allAnswers}
            onClick={() => setAllAnswers((v) => !v)}
            className="flex h-12 w-full items-center justify-center gap-1.5 border-t border-border text-[15px] font-medium [@media(hover:hover)_and_(pointer:fine)]:hover:bg-surface-2"
          >
            {allAnswers ? "Hide other answers" : "Show other answers"}
            <ChevronDown aria-hidden className={cn("size-4 transition-transform duration-200 ease-[var(--ease-out)]", allAnswers && "rotate-180")} />
          </button>
          <div className={cn("grid transition-[grid-template-rows,opacity] duration-200 ease-[var(--ease-out)] motion-reduce:transition-opacity", allAnswers ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")} inert={!allAnswers}>
            <div className="overflow-hidden">
              <dl className="divide-y divide-border border-t border-border text-[15px]">
                {survey.questions.map((q, k) =>
                  k === r.flagQ ? null : (
                    <div key={k} className="px-4 py-3">
                      <dt className="text-sm text-muted">
                        {k + 1}. {q.title}
                      </dt>
                      <dd className={cn("mt-0.5", !r.answers[k] && "text-subtle")}>{r.answers[k] || "No answer"}</dd>
                    </div>
                  ),
                )}
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* footer */}
      <div className="shrink-0 border-t border-border px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-7">
        {undoable ? (
          <div className="mb-3 flex items-center justify-between gap-3 rounded-xl bg-surface-2 px-3.5 py-2 text-sm animate-[fade-in_160ms_var(--ease-out)]" aria-live="polite">
            <span>
              {undoable[1].result === "pay" ? "Paid" : "Not paid"} {rsp(RESPONSES.find((x) => x.id === undoable[0])!.num)}
            </span>
            <button type="button" onClick={() => undo(undoable[0])} className="pressable h-8 rounded-full px-3 font-semibold text-brand-ink [@media(hover:hover)_and_(pointer:fine)]:hover:bg-surface">
              Undo
            </button>
          </div>
        ) : null}

        {d ? (
          <DecidedRow d={d} rate={survey.rate} />
        ) : asking ? (
          <div className="flex flex-col gap-3">
            <p className="text-[15px] font-semibold">Why aren&apos;t you paying?</p>
            <div role="radiogroup" aria-label="Reason" className="flex flex-wrap gap-2">
              {DONT_PAY_REASONS.map((t, k) => (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={k === reason}
                  onClick={() => setReason(k)}
                  className={cn(
                    "pressable h-10 rounded-full border px-3.5 text-[14px] transition-colors duration-150",
                    k === reason ? "border-fg bg-fg text-bg" : "border-border-strong bg-surface [@media(hover:hover)_and_(pointer:fine)]:hover:border-fg/40",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button size="lg" onClick={() => setAsking(false)}>
                Cancel
              </Button>
              <Button
                size="lg"
                variant="danger"
                onClick={() => {
                  decide(r.id, "dont_pay", DONT_PAY_REASONS[reason]);
                  advance();
                }}
              >
                Confirm
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Button size="lg" className="text-dontpay" onClick={() => setAsking(true)}>
              <X />
              Don&apos;t pay
            </Button>
            <Button
              size="lg"
              variant="dark"
              onClick={() => {
                decide(r.id, "pay");
                advance();
              }}
            >
              <Check />
              Pay {formatBnb(survey.rate)}
            </Button>
          </div>
        )}
      </div>
    </>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 border-t border-border pt-5">
      <h3 className="mb-3 flex items-center gap-2 text-[15px] font-semibold [&_svg]:size-[18px] [&_svg]:text-muted">
        {icon}
        {title}
      </h3>
      {children}
    </section>
  );
}

function CheckRow({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-[15px] leading-snug">
      <span className={cn("mt-px grid size-5 shrink-0 place-items-center rounded-full text-white", ok ? "bg-pay" : "bg-dontpay")}>
        {ok ? <Check className="size-3" strokeWidth={3.5} /> : <X className="size-3" strokeWidth={3.5} />}
      </span>
      <span>{children}</span>
    </li>
  );
}

function Callout({ flag }: { flag: Flag }) {
  const [open, setOpen] = useState(false);
  const tone = flag.tone === "danger" ? "border-dontpay/25 bg-dontpay-soft text-dontpay" : "border-review/25 bg-review-soft text-review";
  return (
    <div className={cn("rounded-xl border", tone)}>
      <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="flex min-h-11 w-full items-center gap-2.5 px-3.5 py-2 text-left text-[15px] font-medium">
        {flag.tone === "danger" ? <CircleAlert className="size-[18px] shrink-0" /> : <AlertTriangle className="size-[18px] shrink-0" />}
        <span className="flex-1">{flag.title}</span>
        <HelpCircle aria-hidden className={cn("size-[18px] shrink-0 opacity-60 transition-opacity", open && "opacity-100")} />
        <span className="sr-only">{open ? "Hide" : "Show"} the AI&apos;s reasons</span>
      </button>
      <div className={cn("grid transition-[grid-template-rows,opacity] duration-200 ease-[var(--ease-out)] motion-reduce:transition-opacity", open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")} inert={!open}>
        <div className="overflow-hidden">
          <ul className="flex flex-col gap-1.5 px-3.5 pb-3 text-[14px] text-fg">
            {flag.runs.map((run, k) => (
              <li key={k}>
                <span className="font-medium">Check {k + 1} · {run ? run.label.replace("_", "-") : "failed"}:</span> <span className="text-muted">{run?.reason ?? "The call failed or timed out."}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function KV({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-3 px-4 py-3">
      <dt className="text-muted">{k}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

function DecidedRow({ d, rate }: { d: ReviewDecision; rate: bigint }) {
  const pay = d.result === "pay";
  return (
    <div className={cn("rounded-xl px-4 py-3", pay ? "bg-pay-soft" : "bg-dontpay-soft")}>
      <p className={cn("font-semibold", pay ? "text-pay" : "text-dontpay")}>
        {pay ? `Paid ${formatBnb(rate)}` : "Not paid"}
        <span className="font-normal text-muted">{d.reason ? ` · “${d.reason}”` : " · decided by you"}</span>
      </p>
      <p className="mt-1 flex items-center gap-2 text-sm text-muted">
        {d.status === "undo_window" ? (
          "Saved. Sending to the contract in a few seconds…"
        ) : d.status === "sent" ? (
          <>
            <Loader2 aria-hidden className="size-4 animate-spin motion-reduce:animate-none" />
            Sent, waiting for confirmation
          </>
        ) : (
          <>
            <Check aria-hidden className="size-4 text-pay" />
            Confirmed ·{" "}
            <a href={txUrl(d.txHash!)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-brand-ink [@media(hover:hover)_and_(pointer:fine)]:hover:underline">
              View on BscScan <ExternalLink className="size-3.5" />
            </a>
          </>
        )}
      </p>
    </div>
  );
}
