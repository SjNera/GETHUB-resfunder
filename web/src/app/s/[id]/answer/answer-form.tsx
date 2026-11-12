"use client";

import { Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { isAddress } from "viem";
import { useConnection } from "wagmi";
import { DemoGate } from "@/components/demo-gate";
import { isAnswered, QuestionRenderer } from "@/components/survey/question-renderer";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { useDemo } from "@/lib/data/store";
import { fakeAddress } from "@/lib/demo/ids";
import { respondentHash } from "@/lib/demo/seed";
import { formatPeso } from "@/lib/format";
import type { AnswerValue, Answers } from "@/lib/types";
import { consentKey } from "../survey-intro";

export function AnswerForm({ id }: { id: string }) {
  return (
    <DemoGate>
      <Form id={id} />
    </DemoGate>
  );
}

const startKey = (id: string) => `resfunder-start-${id}`;

function omit(errors: Record<string, string>, key: string) {
  const next = { ...errors };
  delete next[key];
  return next;
}

function Form({ id }: { id: string }) {
  const router = useRouter();
  const survey = useDemo((s) => s.surveys[id]);
  const session = useDemo((s) => s.session);
  const responses = useDemo((s) => s.responses);
  const submitResponse = useDemo((s) => s.submitResponse);
  const { address: connected } = useConnection();

  const [answers, setAnswers] = useState<Answers>({});
  const [wallet, setWallet] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const startedAt = useRef<string>("");
  const refs = useRef<Record<string, HTMLDivElement | null>>({});

  const existing = useMemo(() => {
    if (!session) return undefined;
    const hash = respondentHash(id, session.email);
    return Object.values(responses).find((r) => r.surveyId === id && r.respondentHash === hash);
  }, [id, responses, session]);

  // Guards: must be signed in, must have consented, one response per student.
  useEffect(() => {
    if (!survey) return;
    if (!session) {
      router.replace(`/sign-in?next=${encodeURIComponent(`/s/${id}/answer`)}`);
      return;
    }
    if (existing) {
      router.replace(`/s/${id}/r/${existing.id}`);
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
    if (!consented) router.replace(`/s/${id}`);
  }, [existing, id, router, session, survey]);

  if (!survey || !session || existing) return null;

  const required = survey.questions.filter((q) => q.required);
  const answeredRequired = required.filter((q) => isAnswered(q, answers[q.id] ?? null)).length;
  const walletError = wallet && !isAddress(wallet) ? "That doesn't look like a wallet address (0x followed by 40 characters)." : undefined;

  const setAnswer = (qid: string, v: AnswerValue) => {
    setAnswers((a) => ({ ...a, [qid]: v }));
    if (errors[qid]) setErrors((e) => omit(e, qid));
  };

  const submit = () => {
    const next: Record<string, string> = {};
    for (const q of survey.questions) {
      if (q.required && !isAnswered(q, answers[q.id] ?? null)) next[q.id] = "This question is required.";
    }
    if (!isAddress(wallet)) next.wallet = "Add the wallet address where you want to be paid.";
    setErrors(next);
    const first = survey.questions.find((q) => next[q.id])?.id ?? (next.wallet ? "wallet" : null);
    if (first) {
      refs.current[first]?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setSubmitting(true);
    const responseId = submitResponse({
      surveyId: id,
      answers: Object.fromEntries(survey.questions.map((q) => [q.id, answers[q.id] ?? null])),
      wallet: wallet as `0x${string}`,
      startedAt: startedAt.current || new Date().toISOString(),
    });
    try {
      sessionStorage.removeItem(startKey(id));
    } catch {}
    router.push(`/s/${id}/r/${responseId}?fresh=1`);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 pb-32 pt-6 sm:px-6">
      <div className="material sticky top-[5.5rem] z-30 flex items-center gap-4 rounded-full px-5 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{survey.title}</p>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full w-full origin-left rounded-full bg-brand transition-transform duration-300 ease-[var(--ease-out)]"
              style={{ transform: `scaleX(${required.length ? answeredRequired / required.length : 1})` }}
            />
          </div>
        </div>
        <span className="nums shrink-0 text-sm text-muted">
          {answeredRequired}/{required.length} required
        </span>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {survey.questions.map((q, i) => (
          <div key={q.id} ref={(el) => { refs.current[q.id] = el; }} className="scroll-mt-40">
            <QuestionRenderer question={q} index={i} value={answers[q.id] ?? null} onChange={(v) => setAnswer(q.id, v)} error={errors[q.id]} />
          </div>
        ))}

        <div ref={(el) => { refs.current.wallet = el; }} className="scroll-mt-40 rounded-3xl border border-border bg-surface p-5 sm:p-6">
          <Field
            label="Where should we send your payment?"
            htmlFor="wallet"
            error={errors.wallet ?? walletError}
            hint={`If your answers pass screening, ${formatPeso(survey.rateCentavos)} in test tokens goes to this BSC testnet address.`}
          >
            <Input
              id="wallet"
              value={wallet}
              onChange={(e) => {
                setWallet(e.target.value.trim());
                if (errors.wallet) setErrors((e) => omit(e, "wallet"));
              }}
              placeholder="0x…"
              spellCheck={false}
              autoCapitalize="off"
              autoComplete="off"
              className="font-mono"
              aria-invalid={errors.wallet || walletError ? true : undefined}
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
      </div>

      {/* Sticky submit bar with safe-area padding */}
      <div className="fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="material mx-auto flex max-w-2xl items-center justify-between gap-3 rounded-full py-2.5 pl-5 pr-2.5">
          <p className="min-w-0 truncate text-sm text-muted">
            <span className="hidden sm:inline">Signed in as </span>
            <span className="text-fg">{session.email}</span>
          </p>
          <Button variant="primary" onClick={submit} disabled={submitting}>
            {submitting ? "Submitting…" : "Submit answers"}
          </Button>
        </div>
      </div>
    </div>
  );
}
