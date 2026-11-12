"use client";

import { AlertTriangle, Check, Loader2, Lock, ShieldCheck, Wallet, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";
import { toast } from "sonner";
import { erc20Abi } from "viem";
import { useChainId, useConnect, useConnection, useReadContract, useSwitchChain, useWriteContract } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { AddressChip, Money, SimulatedTag, TxLink } from "@/components/common/chain";
import { useNow } from "@/components/common/countdown";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { useDemo } from "@/lib/data/store";
import { fakeTxHash } from "@/lib/demo/ids";
import { breakdown, centavosToUnits, unitsToCentavos } from "@/lib/fees";
import { formatPeso, shortHash } from "@/lib/format";
import { surveyHash, validateSurvey } from "@/lib/schema";
import type { Survey } from "@/lib/types";
import { surveyEscrowAbi } from "@/lib/web3/abi/surveyEscrow";
import { CHAIN, wagmiConfig } from "@/lib/web3/config";
import { DEMO_MODE, ESCROW_ADDRESS, TOKEN_ADDRESS, TOKEN_LABEL, TOKEN_SYMBOL } from "@/lib/web3/contracts";
import { SurveyShell } from "./survey-shell";

export function FundSurvey({ id }: { id: string }) {
  return (
    <SurveyShell id={id}>
      {(survey) =>
        survey.funding ? (
          <div className="rounded-3xl border border-border bg-surface p-8">
            <h2 className="heading text-2xl">This survey is already funded</h2>
            <p className="mt-2 text-muted">The budget is locked in the contract.</p>
            <Link href={`/surveys/${id}`} className="mt-4 inline-block font-medium text-brand-ink hover:underline">
              Go to overview
            </Link>
          </div>
        ) : (
          <Fund survey={survey} />
        )
      }
    </SurveyShell>
  );
}

type StepState = "todo" | "active" | "waiting" | "pending" | "done" | "error";
const DEMO_BALANCE_CENTAVOS = 500_000; // 5,000 tPHP in the demo wallet

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function Fund({ survey }: { survey: Survey }) {
  const router = useRouter();
  const updateSurvey = useDemo((s) => s.updateSurvey);
  const fundSurvey = useDemo((s) => s.fundSurvey);
  const demoWallet = useDemo((s) => s.demoWallet);
  const connectDemoWallet = useDemo((s) => s.connectDemoWallet);
  const disconnectDemoWallet = useDemo((s) => s.disconnectDemoWallet);

  const { address: realAddress, isConnected } = useConnection();
  const chainId = useChainId();
  const connect = useConnect();
  const switchChain = useSwitchChain();
  const write = useWriteContract();

  const [rate, setRate] = useState(String(survey.rateCentavos / 100));
  const [quota, setQuota] = useState(String(survey.quota));
  const [deadline, setDeadline] = useState(survey.deadline.slice(0, 10));
  const [approve, setApprove] = useState<{ state: StepState; tx?: `0x${string}` }>({ state: "todo" });
  const [create, setCreate] = useState<{ state: StepState; tx?: `0x${string}` }>({ state: "todo" });
  const [error, setError] = useState<string | null>(null);

  const now = useNow(60_000);
  const rateCentavos = Math.round(Number(rate) * 100);
  const quotaN = Number(quota);
  const deadlineMs = new Date(`${deadline}T23:59:00`).getTime();
  const errors = {
    rate: !(rateCentavos >= 100 && rateCentavos <= 100_000) ? "Between ₱1 and ₱1,000 per response." : undefined,
    quota: !(Number.isInteger(quotaN) && quotaN >= 1 && quotaN <= 5000) ? "A whole number from 1 to 5,000." : undefined,
    deadline: !(deadlineMs > now + 12 * 3600_000) ? "Pick a date at least a day from now." : undefined,
  };
  const formValid = !errors.rate && !errors.quota && !errors.deadline;
  const b = formValid ? breakdown(rateCentavos, quotaN) : breakdown(0, 0);
  const questionsValid = validateSurvey(survey).success;
  const hash = surveyHash(survey);

  const usingDemoWallet = !!demoWallet && !isConnected;
  const walletAddress = isConnected ? realAddress : demoWallet?.address;
  const onRightChain = usingDemoWallet || chainId === CHAIN.id;

  const balance = useReadContract({
    address: TOKEN_ADDRESS ?? undefined,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: realAddress ? [realAddress] : undefined,
    query: { enabled: !DEMO_MODE && !!realAddress && onRightChain },
  });
  const balanceCentavos = DEMO_MODE || usingDemoWallet ? DEMO_BALANCE_CENTAVOS : balance.data !== undefined ? unitsToCentavos(balance.data) : null;
  const enough = balanceCentavos !== null && balanceCentavos >= b.depositCentavos;
  const busy = ["waiting", "pending"].includes(approve.state) || ["waiting", "pending"].includes(create.state);
  const locked = busy || approve.state === "done";

  const persistTerms = () =>
    updateSurvey(survey.id, { rateCentavos, quota: quotaN, deadline: new Date(deadlineMs).toISOString() });

  async function run() {
    setError(null);
    persistTerms();
    const simulated = DEMO_MODE || usingDemoWallet;
    try {
      let approveTx = approve.tx;
      if (approve.state !== "done") {
        setApprove({ state: "waiting" });
        if (simulated) {
          await sleep(900);
          approveTx = fakeTxHash();
          setApprove({ state: "pending", tx: approveTx });
          await sleep(1100);
        } else {
          approveTx = await write.mutateAsync({
            address: TOKEN_ADDRESS!,
            abi: erc20Abi,
            functionName: "approve",
            args: [ESCROW_ADDRESS!, centavosToUnits(b.depositCentavos)],
          });
          setApprove({ state: "pending", tx: approveTx });
          await waitForTransactionReceipt(wagmiConfig, { hash: approveTx });
        }
        setApprove({ state: "done", tx: approveTx });
      }

      setCreate({ state: "waiting" });
      let createTx: `0x${string}`;
      if (simulated) {
        await sleep(900);
        createTx = fakeTxHash();
        setCreate({ state: "pending", tx: createTx });
        await sleep(1300);
      } else {
        createTx = await write.mutateAsync({
          address: ESCROW_ADDRESS!,
          abi: surveyEscrowAbi,
          functionName: "createSurvey",
          args: [hash, centavosToUnits(rateCentavos), BigInt(quotaN), BigInt(Math.floor(deadlineMs / 1000))],
        });
        setCreate({ state: "pending", tx: createTx });
        await waitForTransactionReceipt(wagmiConfig, { hash: createTx });
      }
      setCreate({ state: "done", tx: createTx });

      fundSurvey(survey.id, {
        surveyHash: hash,
        approveTx: approveTx!,
        createTx,
        fundedAt: new Date().toISOString(),
        researcherWallet: walletAddress!,
        simulated,
      });
      toast.success("Survey funded and live", { description: `${formatPeso(b.depositCentavos)} locked in escrow${simulated ? " (simulated)" : ""}.` });
      router.push(`/surveys/${survey.id}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message.split("\n")[0] : "Something went wrong.";
      setError(/reject|denied/i.test(msg) ? "You rejected the request in your wallet. Nothing was sent." : msg);
      setApprove((s) => (s.state === "done" ? s : { state: "error", tx: s.tx }));
      setCreate((s) => (s.state === "todo" ? s : { state: "error", tx: s.tx }));
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_26rem]">
      <div className="flex flex-col gap-6">
        {!questionsValid ? (
          <div className="flex items-start gap-3 rounded-3xl border border-review/30 bg-review-soft p-5 text-review">
            <AlertTriangle className="mt-0.5 size-5 shrink-0" />
            <p>
              Some questions need attention before funding.{" "}
              <Link href={`/surveys/${survey.id}/edit`} className="font-semibold underline">
                Back to the builder
              </Link>
            </p>
          </div>
        ) : null}

        <section className="rounded-3xl border border-border bg-surface p-5 sm:p-7">
          <h2 className="heading text-xl">Rate, quota and deadline</h2>
          <p className="mt-1 text-muted">These are written into the contract and can&apos;t change after funding.</p>
          <div className="mt-6 grid gap-5 sm:grid-cols-3">
            <Field label="Pay per valid response" htmlFor="rate" error={errors.rate}>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">₱</span>
                <Input id="rate" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} disabled={locked} className="nums pl-8" />
              </div>
            </Field>
            <Field label="Responses needed" htmlFor="quota" error={errors.quota}>
              <Input id="quota" inputMode="numeric" value={quota} onChange={(e) => setQuota(e.target.value)} disabled={locked} className="nums" />
            </Field>
            <Field label="Deadline" htmlFor="deadline" error={errors.deadline}>
              <Input id="deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} disabled={locked} />
            </Field>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl border border-border bg-surface p-5 sm:p-6">
            <h3 className="flex items-center gap-2 font-semibold"><ShieldCheck className="size-4 text-pay" /> The contract can</h3>
            <ul className="mt-3 flex flex-col gap-2 text-[15px] text-muted">
              <li>Pay only <Money centavos={rateCentavos || 0} className="text-fg" /> per response, to verified respondents of this survey, once each, within the quota.</li>
              <li>Return the unused budget to you at the deadline, or when the quota is met.</li>
            </ul>
          </div>
          <div className="rounded-3xl border border-border bg-surface p-5 sm:p-6">
            <h3 className="flex items-center gap-2 font-semibold"><X className="size-4 text-dontpay" /> The contract can&apos;t</h3>
            <ul className="mt-3 flex flex-col gap-2 text-[15px] text-muted">
              <li>Send your budget anywhere except respondents or back to you.</li>
              <li>Change the rate, quota, deadline or questions. A pause switch stops all payments.</li>
            </ul>
          </div>
        </section>
      </div>

      {/* Summary + stepper */}
      <aside className="lg:sticky lg:top-28 lg:self-start">
        <div className="rounded-3xl border border-border bg-surface p-5 sm:p-6">
          <dl className="flex flex-col gap-2.5 text-[15px]">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">
                Budget <span className="nums">({formatPeso(rateCentavos || 0)} × {quotaN || 0})</span>
              </dt>
              <dd><Money centavos={b.budgetCentavos} /></dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Platform fee (5%)</dt>
              <dd><Money centavos={b.feeCentavos} /></dd>
            </div>
            <div className="mt-2 flex items-end justify-between gap-4 border-t border-border pt-4">
              <dt className="font-semibold">You deposit</dt>
              <dd className="display nums text-4xl"><Money centavos={b.depositCentavos} /></dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-muted">
            Paid in {TOKEN_LABEL}. The fee isn&apos;t refundable; unused budget is.
          </p>
          <p className="mt-4 flex items-center justify-between gap-2 rounded-2xl bg-surface-2 px-3 py-2 text-xs">
            <span className="text-muted">Survey hash</span>
            <span className="font-mono" title={hash}>{shortHash(hash, 10, 6)}</span>
          </p>

          <ol className="mt-6 flex flex-col gap-1">
            <Step n={1} title="Connect a wallet" state={walletAddress ? "done" : "active"}>
              {walletAddress ? (
                <div className="flex flex-wrap items-center gap-2">
                  <AddressChip address={walletAddress} />
                  {usingDemoWallet ? <SimulatedTag /> : null}
                  {!locked ? (
                    <button className="text-xs text-muted hover:text-fg" onClick={() => (usingDemoWallet ? disconnectDemoWallet() : undefined)} hidden={!usingDemoWallet}>
                      Change
                    </button>
                  ) : null}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="dark" onClick={() => connect.mutate({ connector: connect.connectors[0] })} disabled={connect.isPending}>
                    <Wallet />
                    {connect.isPending ? "Opening MetaMask…" : "MetaMask"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={connectDemoWallet}>
                    Use a demo wallet
                  </Button>
                </div>
              )}
              {connect.error ? <p className="mt-2 text-xs text-dontpay">No browser wallet found. Use a demo wallet instead.</p> : null}
            </Step>
            <Step n={2} title="BSC Testnet" state={!walletAddress ? "todo" : onRightChain ? "done" : "active"}>
              {walletAddress && !onRightChain ? (
                <Button size="sm" variant="dark" onClick={() => switchChain.mutate({ chainId: CHAIN.id })} disabled={switchChain.isPending}>
                  Switch network
                </Button>
              ) : null}
            </Step>
            <Step
              n={3}
              title={balanceCentavos === null ? `${TOKEN_SYMBOL} balance` : `${formatPeso(balanceCentavos).replace("₱", "")} ${TOKEN_SYMBOL} available`}
              state={!walletAddress || !onRightChain ? "todo" : enough ? "done" : "error"}
            >
              {walletAddress && onRightChain && !enough && balanceCentavos !== null ? (
                <p className="text-xs text-dontpay">Not enough test tokens for this deposit.</p>
              ) : null}
            </Step>
            <Step n={4} title={`Approve ${formatPeso(b.depositCentavos)} ${TOKEN_SYMBOL}`} state={approve.state === "todo" ? "todo" : approve.state}>
              {approve.tx ? <TxLink hash={approve.tx} simulated={DEMO_MODE || usingDemoWallet} /> : null}
            </Step>
            <Step n={5} title="Create survey and lock budget" state={create.state === "todo" ? "todo" : create.state}>
              {create.tx ? <TxLink hash={create.tx} simulated={DEMO_MODE || usingDemoWallet} /> : null}
            </Step>
          </ol>

          {error ? <p className="mt-4 rounded-2xl bg-dontpay-soft px-4 py-3 text-sm text-dontpay">{error}</p> : null}

          <Button
            variant="primary"
            size="lg"
            className="mt-6 w-full"
            disabled={!walletAddress || !onRightChain || !enough || !formValid || !questionsValid || busy}
            onClick={run}
          >
            {busy ? (
              <>
                <Loader2 className="animate-spin motion-reduce:animate-none" />
                {approve.state === "waiting" || create.state === "waiting" ? "Confirm in your wallet…" : "Waiting for BSC…"}
              </>
            ) : approve.state === "done" ? (
              "Retry: create survey"
            ) : (
              <>
                <Lock />
                Fund {formatPeso(b.depositCentavos)} and launch
              </>
            )}
          </Button>
          <p className="mt-3 text-center text-xs text-muted">
            {DEMO_MODE ? "Demo mode: both transactions are simulated." : "You'll sign two transactions: approve, then create."}
          </p>
        </div>
      </aside>
    </div>
  );
}

function Step({ n, title, state, children }: { n: number; title: string; state: StepState; children?: ReactNode }) {
  return (
    <li className="flex gap-3 py-2">
      <span
        className={cn(
          "nums grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold transition-colors duration-200",
          state === "done" && "bg-pay-soft text-pay",
          state === "error" && "bg-dontpay-soft text-dontpay",
          (state === "waiting" || state === "pending") && "bg-brand-soft text-brand-ink",
          state === "active" && "bg-inverse text-inverse-fg",
          state === "todo" && "bg-surface-2 text-muted",
        )}
      >
        {state === "done" ? (
          <Check className="size-3.5" strokeWidth={3} />
        ) : state === "waiting" || state === "pending" ? (
          <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" />
        ) : state === "error" ? (
          <X className="size-3.5" strokeWidth={3} />
        ) : (
          n
        )}
      </span>
      <div className="min-w-0 pt-0.5">
        <p className={cn("text-[15px]", state === "todo" ? "text-muted" : "font-medium")}>
          {title}
          {state === "waiting" ? <span className="font-normal text-muted"> · confirm in wallet</span> : null}
          {state === "pending" ? <span className="font-normal text-muted"> · confirming on BSC</span> : null}
        </p>
        {children ? <div className="mt-1.5">{children}</div> : null}
      </div>
    </li>
  );
}
