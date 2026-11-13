"use client";

import { Check, Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Address } from "viem";
import { Button, ButtonLink } from "@/components/ui/button";
import type { Hex, SurveyJson } from "@/lib/types";
import { ApiClientError, api } from "@/lib/ui/api-client";
import { bnbAmount, shortHash } from "@/lib/ui/format";
import { planFunding } from "@/lib/ui/survey-submit";
import { connectWallet, sendCreateSurvey, waitForTx } from "@/lib/ui/wallet";
import { inputCls } from "./question-card";

type Phase = "idle" | "connecting" | "confirm" | "mining" | "registering" | "done";
const PENDING_KEY = "rf-pending-fund-v1";

type Pending = { txHash: Hex; wallet: Address; survey: SurveyJson };

function readPending(): Pending | null {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    return raw ? (JSON.parse(raw) as Pending) : null;
  } catch {
    return null;
  }
}
const savePending = (p: Pending | null) => {
  try {
    if (p) localStorage.setItem(PENDING_KEY, JSON.stringify(p));
    else localStorage.removeItem(PENDING_KEY);
  } catch {
    /* storage unavailable */
  }
};

const msg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong.");

export function FundStep({ survey, onBack, onFunded }: { survey: SurveyJson; onBack: () => void; onFunded: () => void }) {
  const [fund, setFund] = useState({ total: "0.2", quota: "100", deadline: "" });
  const [tried, setTried] = useState(false);
  const [nowMs] = useState(() => Date.now());
  const [fee, setFee] = useState<{ wei: bigint | null; error: string | null; loading: boolean }>({ wei: null, error: null, loading: true });
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(() => readPending());
  const [sharePath, setSharePath] = useState<{ path: string; surveyId: number } | null>(null);

  useEffect(() => {
    let live = true;
    api
      .fee()
      .then((r) => live && setFee({ wei: BigInt(r.feePerResponseWei), error: null, loading: false }))
      .catch((e) => live && setFee({ wei: null, error: msg(e), loading: false }));
    return () => {
      live = false;
    };
  }, []);

  const plan = useMemo(
    () => (fee.wei === null ? null : planFunding(survey, fund, fee.wei, nowMs)),
    [survey, fund, fee.wei, nowMs],
  );
  const busy = phase !== "idle" && phase !== "done";

  const register = async (txHash: Hex, s: SurveyJson) => {
    setPhase("registering");
    const r = await api.register(txHash, s);
    savePending(null);
    setPending(null);
    setSharePath({ path: r.sharePath, surveyId: r.surveyId });
    setPhase("done");
    onFunded();
  };

  const run = async () => {
    setTried(true);
    setError(null);
    if (!plan?.ok) return;
    try {
      setPhase("connecting");
      const account = await connectWallet();
      setPhase("confirm");
      const p = plan.plan;
      const txHash = await sendCreateSurvey(account, {
        surveyHash: p.hash, rate: p.rate, quota: p.quota, deadline: p.deadline, feePerResponse: p.feePerResponse, deposit: p.deposit,
      });
      // Save the hash before waiting, so a closed tab can still register this survey.
      const saved = { txHash, wallet: account, survey: p.survey };
      savePending(saved);
      setPending(saved);
      setPhase("mining");
      await waitForTx(account, txHash);
      await register(txHash, p.survey);
    } catch (e) {
      setPhase("idle");
      setError(msg(e));
    }
  };

  const retry = async () => {
    if (!pending) return;
    setError(null);
    try {
      setPhase("mining");
      await waitForTx(pending.wallet, pending.txHash);
      await register(pending.txHash, pending.survey);
    } catch (e) {
      setPhase("idle");
      setError(msg(e instanceof ApiClientError && e.code === "TX_NOT_VERIFIED" ? "The server couldn't verify the transaction yet. Try again in a moment." : e));
    }
  };

  const label: Record<Phase, string> = {
    idle: "Fund survey",
    connecting: "Connecting wallet…",
    confirm: "Confirm in MetaMask…",
    mining: "Waiting for the network…",
    registering: "Registering survey…",
    done: "Funded",
  };

  if (phase === "done" && sharePath) {
    return (
      <div className="mt-8 max-w-xl rounded-2xl border border-border bg-surface p-6" data-testid="funded">
        <p className="flex items-center gap-2 font-semibold text-pay"><Check className="size-5" />Survey is live</p>
        <p className="mt-2 text-sm text-muted">Your budget is locked in the contract. Share this link with respondents.</p>
        <input readOnly className={`${inputCls} mt-4`} value={typeof window === "undefined" ? sharePath.path : `${window.location.origin}${sharePath.path}`} aria-label="Share link" />
        <div className="mt-4 flex gap-2">
          <ButtonLink href={`/surveys/${sharePath.surveyId}`} variant="primary">Open results</ButtonLink>
          <ButtonLink href={sharePath.path} variant="outline">Preview as respondent</ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-lg font-semibold">Budget, quota and deadline</h2>
        <p className="mt-1 text-sm text-muted">These are written into the contract and can’t change after funding.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {([["total", "Total budget, fee included (tBNB)", "text"], ["quota", "Responses wanted", "number"], ["deadline", "Deadline", "date"]] as const).map(([k, l, type]) => (
            <div key={k}>
              <label htmlFor={`sb-${k}`} className="mb-2 block text-[15px] font-semibold">{l}</label>
              <input id={`sb-${k}`} type={type} className={inputCls} value={fund[k]} disabled={busy}
                inputMode={k === "total" ? "decimal" : undefined}
                onChange={(e) => setFund({ ...fund, [k]: e.target.value })} />
              {tried && plan && !plan.ok && plan.errors[k] && <p role="alert" className="mt-2 text-sm text-dontpay">{plan.errors[k]}</p>}
            </div>
          ))}
        </div>
        <div className="mt-6"><Button variant="outline" disabled={busy} onClick={onBack}>Back to questions</Button></div>
      </section>

      <aside className="grid gap-4 self-start rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-lg font-semibold">Summary</h2>
        {fee.loading && <p className="text-sm text-muted">Loading the fee…</p>}
        {fee.error && <p role="alert" className="text-sm text-dontpay">Can’t load the fee: {fee.error}</p>}
        {plan?.ok ? (
          <dl className="grid gap-2 text-sm" data-testid="summary">
            <div className="flex justify-between"><dt className="text-muted">Pay per answer</dt><dd>{bnbAmount(plan.plan.rate, 8)} tBNB</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Respondents</dt><dd>{bnbAmount(plan.plan.budget, 6)} tBNB</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Fee</dt><dd>{bnbAmount(plan.plan.fee, 6)} tBNB</dd></div>
            <div className="flex justify-between border-t border-border pt-2 font-semibold"><dt>You deposit</dt><dd>{bnbAmount(plan.plan.deposit, 6)} tBNB</dd></div>
            <div className="flex justify-between text-muted"><dt>Survey hash</dt><dd className="font-mono">{shortHash(plan.plan.hash, 8, 6)}</dd></div>
          </dl>
        ) : !fee.loading && !fee.error ? <p className="text-sm text-muted">Fill in the fields to see your deposit.</p> : null}
        <Button variant="primary" disabled={busy || fee.wei === null} onClick={run}>
          {busy && <Loader2 className="animate-spin" />}{label[phase]}
        </Button>
        <p className="text-xs text-muted">MetaMask opens to approve the deposit. The fee isn’t refunded; unused budget is.</p>
        {error && <p role="alert" className="text-sm text-dontpay">{error}</p>}
        {pending && phase === "idle" && (
          <div className="rounded-xl bg-surface-2 p-3 text-sm" data-testid="pending">
            <p className="font-medium">A funding transaction is waiting to be registered</p>
            <p className="mt-1 font-mono text-xs text-muted">{shortHash(pending.txHash, 10, 6)}</p>
            <Button size="sm" variant="outline" className="mt-2" onClick={retry}>Finish registering</Button>
          </div>
        )}
        <Link href="/rubric" className="text-sm text-muted underline">How responses are screened</Link>
      </aside>
    </div>
  );
}
