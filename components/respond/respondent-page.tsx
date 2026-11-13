"use client";

import { Check, Clock3, Loader2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Address } from "viem";
import type { ResponseResult, SurveyDetails } from "@/lib/api/shapes";
import { inputCls } from "@/components/survey-builder/question-card";
import { Button } from "@/components/ui/button";
import { ApiClientError, api } from "@/lib/ui/api-client";
import { shortAddress } from "@/lib/ui/auth/metamask";
import { bnbAmount } from "@/lib/ui/format";
import { checkForm, isFinal, type Draft } from "@/lib/ui/respond";
import { connectWallet, signProof } from "@/lib/ui/wallet";

const POLL_MS = 2000;
const POLL_LIMIT_MS = 120_000;
const errText = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong.");

export function RespondentPage({ surveyId }: { surveyId: number }) {
  const [survey, setSurvey] = useState<SurveyDetails | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [draft, setDraft] = useState<Draft>({});
  const [wallet, setWallet] = useState<Address | null>(null);
  const [problems, setProblems] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<"idle" | "wallet" | "submit" | "screen">("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResponseResult | null>(null);
  const startedAt = useRef<number>(0);

  useEffect(() => {
    let live = true;
    api
      .survey(surveyId)
      .then((s) => {
        if (!live) return;
        startedAt.current = Date.now();
        setSurvey(s);
      })
      .catch((e) => live && setLoadError(e instanceof ApiClientError && e.code === "SURVEY_NOT_FOUND" ? "This survey doesn't exist." : errText(e)));
    return () => {
      live = false;
    };
  }, [surveyId]);

  const connect = useCallback(async () => {
    setError(null);
    setBusy("wallet");
    try {
      setWallet(await connectWallet());
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy("idle");
    }
  }, []);

  const submit = async () => {
    if (!survey) return;
    setError(null);
    const check = checkForm(survey.survey, email, draft);
    if (!check.ok) return setProblems(check.problems);
    setProblems({});
    if (!wallet) return setError("Connect your wallet first. Payments arrive there.");
    try {
      setBusy("submit");
      const auth = await signProof("submit", surveyId, wallet);
      const { responseId } = await api.submit({ surveyId, email: email.trim(), answers: check.answers, startedAt: startedAt.current, auth });
      setBusy("screen");
      let r = await api.process(responseId);
      const t0 = Date.now();
      while (!isFinal(r.status) && Date.now() - t0 < POLL_LIMIT_MS) {
        await new Promise((res) => setTimeout(res, POLL_MS));
        r = await api.response(responseId);
      }
      setResult(r);
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy("idle");
    }
  };

  if (loadError) return <Shell><p role="alert" className="text-dontpay">{loadError}</p></Shell>;
  if (!survey) return <Shell><p className="text-muted">Loading survey…</p></Shell>;

  const closed = survey.status === "closed" || survey.paused || survey.slotsLeft <= 0;
  const s = survey.survey;

  if (result) return <Shell><ResultCard r={result} /></Shell>;

  return (
    <Shell>
      <h1 className="display text-3xl">{s.title}</h1>
      {s.description && <p className="mt-2 text-muted">{s.description}</p>}
      <p className="mt-3 text-sm text-muted">
        {bnbAmount(survey.rateWei, 6)} tBNB for each answer that passes screening · {survey.slotsLeft} spots left
      </p>
      {closed ? (
        <p role="status" className="mt-8 rounded-2xl bg-surface-2 p-4 text-sm">
          {survey.status === "closed" ? "This survey is closed." : survey.paused ? "This survey is paused." : "This survey has all the responses it needs."}
        </p>
      ) : (
        <form className="mt-8 grid gap-6" onSubmit={(e) => { e.preventDefault(); void submit(); }} noValidate>
          <div>
            <label htmlFor="r-email" className="mb-2 block text-[15px] font-semibold">Your email</label>
            <input id="r-email" type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} disabled={busy !== "idle"} placeholder="you@school.edu" />
            {problems.email && <p role="alert" className="mt-2 text-sm text-dontpay">{problems.email}</p>}
          </div>

          {s.questions.map((q, i) => (
            <fieldset key={q.id} className="grid gap-2" disabled={busy !== "idle"}>
              <legend className="text-[15px] font-semibold">{i + 1}. {q.text}{q.required && <span className="text-dontpay"> *</span>}</legend>
              {q.type === "multiple_choice" && q.options.map((o) => (
                <label key={o} className="flex items-center gap-2 text-[15px]">
                  <input type="radio" name={q.id} checked={draft[q.id] === o} onChange={() => setDraft({ ...draft, [q.id]: o })} />{o}
                </label>
              ))}
              {q.type === "scale" && (
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: q.max - q.min + 1 }, (_, k) => q.min + k).map((n) => (
                    <label key={n} className={`grid size-10 cursor-pointer place-items-center rounded-full border text-sm ${draft[q.id] === n ? "border-fg bg-fg text-bg" : "border-border-strong"}`}>
                      <input type="radio" name={q.id} className="sr-only" checked={draft[q.id] === n} onChange={() => setDraft({ ...draft, [q.id]: n })} />{n}
                    </label>
                  ))}
                </div>
              )}
              {q.type === "open_ended" && (
                <textarea className={inputCls} rows={4} maxLength={5000} value={(draft[q.id] as string | undefined) ?? ""} aria-label={`Answer to question ${i + 1}`}
                  onChange={(e) => setDraft({ ...draft, [q.id]: e.target.value })} />
              )}
              {problems[q.id] && <p role="alert" className="text-sm text-dontpay">{problems[q.id]}</p>}
            </fieldset>
          ))}

          <div className="rounded-2xl border border-border bg-surface p-4">
            <p className="text-sm font-semibold">Payout wallet</p>
            {wallet ? (
              <p className="mt-1 flex items-center gap-2 text-sm"><Check className="size-4 text-pay" />{shortAddress(wallet)} · BSC Testnet</p>
            ) : (
              <>
                <p className="mt-1 text-sm text-muted">Payments arrive in your wallet as test tBNB. You sign a free message when you submit.</p>
                <Button variant="outline" size="sm" className="mt-3" disabled={busy !== "idle"} onClick={connect}>
                  {busy === "wallet" && <Loader2 className="animate-spin" />}Connect MetaMask
                </Button>
              </>
            )}
          </div>

          {problems.form && <p role="alert" className="text-sm text-dontpay">{problems.form}</p>}
          {error && <p role="alert" className="text-sm text-dontpay">{error}</p>}
          <Button variant="primary" size="lg" type="submit" disabled={busy !== "idle"}>
            {busy !== "idle" && busy !== "wallet" && <Loader2 className="animate-spin" />}
            {busy === "submit" ? "Submitting…" : busy === "screen" ? "Checking your answers…" : "Submit answers"}
          </Button>
        </form>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-2xl px-5 py-10 sm:py-14">{children}</div>;
}

function ResultCard({ r }: { r: ResponseResult }) {
  const paid = r.status === "paid";
  const blocked = r.status === "blocked";
  const Icon = paid ? Check : blocked ? X : Clock3;
  const tone = paid ? "bg-pay-soft text-pay" : blocked ? "bg-dontpay-soft text-dontpay" : "bg-review-soft text-review";
  return (
    <div className="rounded-2xl border border-border bg-surface p-6" data-testid="result" data-status={r.status}>
      <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${tone}`}><Icon className="size-4" />
        {paid ? "Paid" : blocked ? "Not paid" : r.status === "review" ? "In review" : "Still checking"}
      </span>
      <p className="mt-4 text-[15px]">
        {paid && "Your answers passed screening and the payment was sent to your wallet."}
        {blocked && "Your answers didn't pass the code checks, so no payment was made."}
        {r.status === "review" && "A person needs to look at this one. It wasn't paid automatically."}
        {!isFinal(r.status) && "This is taking longer than usual. Reload this page in a minute to see the result."}
      </p>
      {r.reasons.length > 0 && <ul className="mt-3 list-disc pl-5 text-sm text-muted">{r.reasons.map((x) => <li key={x}>{x}</li>)}</ul>}
      {r.explorerUrl && <a className="mt-4 inline-block text-sm underline" href={r.explorerUrl} target="_blank" rel="noreferrer">View transaction on BscScan</a>}
    </div>
  );
}
