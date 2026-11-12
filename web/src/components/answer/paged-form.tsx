"use client";

import { ArrowLeft, ArrowRight, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { isAddress } from "viem";
import { useConnection } from "wagmi";
import { AuthGate } from "@/components/app/auth-gate";
import { ActionBar, BackLink } from "@/components/app/nav-bits";
import { Peso } from "@/components/common/chain";
import { InlineTip } from "@/components/guide/inline-tip";
import { isAnswered, QuestionRenderer } from "@/components/survey/question-renderer";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { myResponse, useDemo } from "@/lib/data/store";
import { fakeAddress } from "@/lib/demo/ids";
import type { AnswerValue, Answers } from "@/lib/types";
import { consentKey } from "./intro";

const startKey = (id: string) => `resfunder-start-${id}`;

export function PagedForm({ id }: { id: string }) {
  return (
    <AuthGate>
      <Form id={id} />
    </AuthGate>
  );
}

/** One question per screen (mobile canvas), wallet last. Next moves left, Back moves right. */
function Form({ id }: { id: string }) {
  const router = useRouter();
  const survey = useDemo((s) => s.surveys[id]);
  const session = useDemo((s) => s.session);
  const responses = useDemo((s) => s.responses);
  const submitResponse = useDemo((s) => s.submitResponse);
  const { address: connected } = useConnection();

  const [page, setPage] = useState(0);
  const [dir, setDir] = useState<"in" | "back">("in");
  const [answers, setAnswers] = useState<Answers>({});
  const [wallet, setWallet] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const startedAt = useRef("");
  const mine = myResponse(responses, id, session?.email);

  useEffect(() => {
    if (!survey) return;
    if (mine) {
      router.replace(`/answer/${id}/r/${mine.id}`);
      return;
    }
    if (survey.status !== "live") {
      router.replace(`/answer/${id}`);
      return;
    }
    let consented = false;
    try {
      consented = sessionStorage.getItem(consentKey(id)) === "1";
      startedAt.current = sessionStorage.getItem(startKey(id)) ?? new Date().toISOString();
      sessionStorage.setItem(startKey(id), startedAt.current);
    } catch {
      startedAt.current = new Date().toISOString();
    }
    if (!consented) router.replace(`/answer/${id}`);
  }, [id, mine, router, survey]);

  if (!survey || mine || survey.status !== "live") return null;

  const qs = survey.questions;
  const total = qs.length + 1; // + wallet page
  const onWallet = page === qs.length;
  const q = qs[page];

  const go = (next: number) => {
    setError(null);
    setDir(next > page ? "in" : "back");
    setPage(next);
    window.scrollTo({ top: 0 });
  };

  const nextPage = () => {
    if (!onWallet) {
      if (q.required && !isAnswered(q, answers[q.id] ?? null)) {
        setError("This question is required.");
        return;
      }
      go(page + 1);
      return;
    }
    if (!isAddress(wallet)) {
      setError("Add a valid BSC wallet address: 0x followed by 40 characters.");
      return;
    }
    setSubmitting(true);
    const responseId = submitResponse({
      surveyId: id,
      answers: Object.fromEntries(qs.map((x) => [x.id, answers[x.id] ?? null])),
      wallet: wallet as `0x${string}`,
      startedAt: startedAt.current || new Date().toISOString(),
    });
    try {
      sessionStorage.removeItem(startKey(id));
    } catch {}
    router.push(`/answer/${id}/r/${responseId}?fresh=1`);
  };

  return (
    <div className="mx-auto max-w-2xl px-3 pb-36 pt-5 sm:px-6">
      <div className="flex items-center gap-3">
        {page === 0 ? <BackLink href={`/answer/${id}`} label="Back to consent" /> : (
          <button type="button" onClick={() => go(page - 1)} aria-label="Previous question" className="material pressable grid size-11 shrink-0 place-items-center rounded-full">
            <ArrowLeft className="size-5" />
          </button>
        )}
        <div className="material flex h-11 min-w-0 flex-1 items-center gap-3 rounded-full px-4">
          <span className="on-glass nums shrink-0 text-[13px] font-semibold">Step 2 of 3</span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-label="Survey progress" aria-valuemin={0} aria-valuemax={total} aria-valuenow={page + 1}>
            <div className="h-full w-full origin-left rounded-full bg-brand transition-transform duration-300 ease-[var(--ease-out)]" style={{ transform: `scaleX(${(page + 1) / total})` }} />
          </div>
          <span className="nums shrink-0 text-[13px] text-muted">
            {page + 1}/{total}
          </span>
        </div>
      </div>

      <div key={page} className={dir === "in" ? "page-in" : "page-back"}>
        {onWallet ? (
          <div className="mt-8">
            <p className="eyebrow px-2">Last step</p>
            <h1 className="display mt-3 px-2 text-[clamp(2rem,6vw,2.6rem)] [line-height:1.06]">Where should the agent wallet pay you?</h1>
            <p className="mt-3 px-2 text-muted">
              If your answers pass screening, <Peso amount={survey.rateUnits} /> is sent here on BSC Testnet right away.
            </p>
            <div className="mt-6 rounded-[2rem] border border-border bg-surface p-5">
              <Field label="Wallet address" htmlFor="wallet" error={error ?? undefined}>
                <Input
                  id="wallet"
                  value={wallet}
                  onChange={(e) => {
                    setWallet(e.target.value.trim());
                    setError(null);
                  }}
                  placeholder="0x…"
                  spellCheck={false}
                  autoCapitalize="none"
                  autoComplete="off"
                  className="font-mono"
                  aria-invalid={error ? true : undefined}
                />
              </Field>
              <div className="mt-3 flex flex-wrap gap-2">
                {connected ? (
                  <Button size="sm" variant="outline" onClick={() => setWallet(connected)}>
                    <Wallet />
                    Use my connected wallet
                  </Button>
                ) : null}
                <Button size="sm" variant="ghost" onClick={() => setWallet(fakeAddress())}>
                  Use a demo address
                </Button>
              </div>
            </div>
            <InlineTip id="wallet-agent" className="mt-4">
              You never sign anything here. The server&apos;s agent wallet sends the payment, so there&apos;s no gas for you to pay.
            </InlineTip>
          </div>
        ) : (
          <div className="mt-8">
            <p className="eyebrow px-2">{(q.type === "paragraph" || q.type === "short_answer") && !q.allowShort ? "Screened for non-answers" : q.required ? "Required" : "Optional"}</p>
            <div className="mt-3">
              <QuestionRenderer question={q} index={page} value={answers[q.id] ?? null} onChange={(v: AnswerValue) => { setAnswers((a) => ({ ...a, [q.id]: v })); setError(null); }} error={error ?? undefined} />
            </div>
          </div>
        )}
      </div>

      <ActionBar>
        <span className="on-glass min-w-0 truncate text-sm">{session?.email}</span>
        <Button variant={onWallet ? "primary" : "dark"} onClick={nextPage} disabled={submitting}>
          {onWallet ? (submitting ? "Submitting…" : "Submit answers") : "Next"}
          {onWallet ? null : <ArrowRight />}
        </Button>
      </ActionBar>
    </div>
  );
}
