"use client";

import { Check, Loader2, Lock, ShieldCheck, Wallet, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";
import { toast } from "sonner";
import { erc20Abi, parseEther } from "viem";
import { useChainId, useConnect, useConnection, useReadContract, useSwitchChain } from "wagmi";
import { AddressChip, Peso, SimulatedTag, TxLink } from "@/components/common/chain";
import { InlineTip } from "@/components/guide/inline-tip";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { useDemo } from "@/lib/data/store";
import { breakdown } from "@/lib/fees";
import { formatPeso, formatDateTime, shortHash } from "@/lib/format";
import { surveyHash } from "@/lib/schema";
import type { Survey } from "@/lib/types";
import { CHAIN } from "@/lib/web3/config";
import { DEMO_MODE, TOKEN_ADDRESS, TOKEN_LABEL } from "@/lib/web3/contracts";
import { type TxPhase, useEscrow } from "@/lib/web3/escrow";
import { ActionBar } from "@/components/app/nav-bits";
import { PublishShell } from "./shell";

export function FundSurvey({ id }: { id: string }) {
  return (
    <PublishShell id={id}>
      {(survey) =>
        survey.funding ? (
          <div className="rounded-3xl border border-border bg-surface p-8">
            <h2 className="heading text-2xl">Already funded</h2>
            <p className="mt-2 text-muted">The budget is locked in escrow.</p>
            <Link href={`/publish/${id}`} className="mt-4 inline-block font-medium text-brand-ink hover:underline">
              Go to overview
            </Link>
          </div>
        ) : (
          <Fund survey={survey} />
        )
      }
    </PublishShell>
  );
}

const DEMO_BALANCE = parseEther("5000"); // ₱5,000 of mock tPHP

function Fund({ survey }: { survey: Survey }) {
  const router = useRouter();
  const fundSurvey = useDemo((s) => s.fundSurvey);
  const demoWallet = useDemo((s) => s.demoWallet);
  const connectDemoWallet = useDemo((s) => s.connectDemoWallet);
  const disconnectDemoWallet = useDemo((s) => s.disconnectDemoWallet);
  const escrow = useEscrow();

  const { address: realAddress, isConnected } = useConnection();
  const chainId = useChainId();
  const connect = useConnect();
  const switchChain = useSwitchChain();
  const usingDemo = !!demoWallet && !isConnected;
  const address = isConnected ? realAddress : demoWallet?.address;
  const onChain = usingDemo || chainId === CHAIN.id;
  const realBalance = useReadContract({
    address: TOKEN_ADDRESS ?? undefined,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: realAddress ? [realAddress] : undefined,
    chainId: CHAIN.id,
    query: { enabled: isConnected && onChain && !!TOKEN_ADDRESS },
  });
  const balance = usingDemo || DEMO_MODE ? DEMO_BALANCE : (realBalance.data ?? null);

  const rate = BigInt(survey.rateUnits);
  const b = breakdown(rate, survey.quota);
  const hash = surveyHash(survey);
  const enough = balance !== null && balance >= b.deposit;
  const simulated = DEMO_MODE || usingDemo;

  const [approvePhase, setApprovePhase] = useState<TxPhase>("idle");
  const [approveTx, setApproveTx] = useState<`0x${string}`>();
  const [phase, setPhase] = useState<TxPhase>("idle");
  const [tx, setTx] = useState<`0x${string}`>();
  const [error, setError] = useState<string | null>(null);
  const busy = phase === "wallet" || phase === "pending" || approvePhase === "wallet" || approvePhase === "pending";

  async function lock() {
    setError(null);
    try {
      if (approvePhase !== "done") {
        await escrow.approve(
          { amount: b.deposit, forceSimulated: usingDemo },
          {
            onPhase: (p, t) => {
              setApprovePhase(p);
              if (t) setApproveTx(t);
            },
          },
        );
      }
      const createTx = await escrow.create(
        { surveyHash: hash, rateUnits: rate, quota: survey.quota, deadline: new Date(survey.deadline), forceSimulated: usingDemo },
        {
          onPhase: (p, t) => {
            setPhase(p);
            if (t) setTx(t);
          },
        },
      );
      fundSurvey(survey.id, { surveyHash: hash, createTx, fundedAt: new Date().toISOString(), researcherWallet: address!, simulated });
      toast.success("Survey funded and live", { description: `${formatPeso(b.deposit)} locked in escrow${simulated ? " (simulated)" : ""}.` });
      router.push(`/publish/${survey.id}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message.split("\n")[0] : "Something went wrong.";
      setError(/reject|denied/i.test(msg) ? "You rejected the request in your wallet. Nothing was sent." : msg);
      setPhase((p) => (p === "done" ? p : "error"));
      setApprovePhase((p) => (p === "done" || p === "idle" ? p : "error"));
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_26rem]">
      <div className="flex flex-col gap-4">
        {/* Deposit card: Anna-style gradient card */}
        <section className="relative overflow-hidden rounded-[2rem] p-6 text-[#121212] shadow-[0_24px_40px_-24px_rgba(168,83,0,0.55)] sm:p-8 [background:linear-gradient(155deg,#ffffff_0%,#fff1e2_55%,#ffd9b0_100%)]">
          <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-[#a85300]">You lock</p>
          <p className="display mt-2 text-[clamp(2.75rem,9vw,4.25rem)]">
            <Peso amount={b.deposit} />
          </p>
          <dl className="mt-6 grid gap-2 text-[15px]">
            <div className="flex justify-between gap-4 border-b border-black/10 pb-2">
              <dt className="text-[#121212]/65">
                Budget <span className="nums">(<Peso amount={rate} /> × {survey.quota})</span>
              </dt>
              <dd><Peso amount={b.budget} /></dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-black/10 pb-2">
              <dt className="text-[#121212]/65">Platform fee (5%)</dt>
              <dd><Peso amount={b.fee} /></dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[#121212]/65">Deadline</dt>
              <dd>{formatDateTime(survey.deadline)}</dd>
            </div>
          </dl>
          <p className="mt-5 flex items-center justify-between gap-3 rounded-2xl bg-white/60 px-3 py-2 text-xs">
            <span className="text-[#121212]/65">Survey hash (locks the questions)</span>
            <span className="font-mono" title={hash}>{shortHash(hash, 10, 6)}</span>
          </p>
        </section>

        <InlineTip id="fund-fee">
          The 5% fee goes to the platform and isn&apos;t refunded. Everything unspent comes back to you when you close the survey.
        </InlineTip>

        <section className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-3xl border border-border bg-surface p-5">
            <h3 className="flex items-center gap-2 font-semibold"><ShieldCheck className="size-4 text-pay" /> The contract can</h3>
            <ul className="mt-3 flex flex-col gap-2 text-[15px] text-muted">
              <li>Pay <Peso amount={rate} className="text-fg" /> per valid answer, once per verified student, within the quota.</li>
              <li>Return the unused budget to you at close.</li>
            </ul>
          </div>
          <div className="rounded-3xl border border-border bg-surface p-5">
            <h3 className="flex items-center gap-2 font-semibold"><X className="size-4 text-dontpay" /> The contract can&apos;t</h3>
            <ul className="mt-3 flex flex-col gap-2 text-[15px] text-muted">
              <li>Send your budget anywhere except students or back to you.</li>
              <li>Change the rate, quota, deadline or questions.</li>
            </ul>
          </div>
        </section>
      </div>

      <aside className="lg:sticky lg:top-28 lg:self-start">
        <div className="rounded-[2rem] border border-border bg-surface p-5 sm:p-6">
          <h2 className="heading text-lg">Two transactions</h2>
          <p className="mt-1 text-sm text-muted">Approve the escrow to take {TOKEN_LABEL}, then create the survey.</p>
          <ol className="mt-4 flex flex-col">
            <Step n={1} title="Connect a wallet" state={address ? "done" : "active"}>
              {address ? (
                <div className="flex flex-wrap items-center gap-2">
                  <AddressChip address={address} />
                  {usingDemo ? <SimulatedTag /> : null}
                  {usingDemo && !busy ? (
                    <button className="text-xs text-muted hover:text-fg" onClick={disconnectDemoWallet}>Change</button>
                  ) : null}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="dark" onClick={() => connect.mutate({ connector: connect.connectors[0] })} disabled={connect.isPending}>
                    <Wallet />
                    {connect.isPending ? "Opening MetaMask…" : "MetaMask"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={connectDemoWallet}>Use a demo wallet</Button>
                </div>
              )}
              {connect.error ? <p className="mt-2 text-xs text-dontpay">No browser wallet found. Use a demo wallet instead.</p> : null}
            </Step>
            <Step n={2} title="BSC Testnet" state={!address ? "todo" : onChain ? "done" : "active"}>
              {address && !onChain ? (
                <Button size="sm" variant="dark" onClick={() => switchChain.mutate({ chainId: CHAIN.id })} disabled={switchChain.isPending}>
                  Switch network
                </Button>
              ) : null}
            </Step>
            <Step n={3} title={balance === null ? "tPHP balance" : <><Peso amount={balance} /> tPHP available</>} state={!address || !onChain ? "todo" : enough ? "done" : "error"}>
              {address && onChain && balance !== null && !enough ? (
                <p className="text-xs text-dontpay">Not enough mock tPHP. Ask the team to mint some to your wallet.</p>
              ) : null}
            </Step>
            <Step
              n={4}
              title={<>Approve <Peso amount={b.deposit} /></>}
              state={approvePhase === "idle" ? (address && onChain && enough ? "active" : "todo") : approvePhase === "done" ? "done" : approvePhase === "error" ? "error" : approvePhase}
            >
              {approveTx ? <TxLink hash={approveTx} simulated={simulated} /> : null}
            </Step>
            <Step
              n={5}
              title={<>Create survey and lock <Peso amount={b.deposit} /></>}
              state={phase === "idle" ? "todo" : phase === "done" ? "done" : phase === "error" ? "error" : phase}
            >
              {tx ? <TxLink hash={tx} simulated={simulated} /> : null}
            </Step>
          </ol>
          {error ? <p className="mt-3 rounded-2xl bg-dontpay-soft px-4 py-3 text-sm text-dontpay">{error}</p> : null}
          <p className="mt-4 text-center text-xs text-muted">{simulated ? "Demo mode: the transaction is simulated." : "You'll confirm two transactions in your wallet: approve, then create."}</p>
        </div>
      </aside>

      <ActionBar>
        <span className="on-glass hidden text-sm sm:inline">
          Lock <Peso amount={b.deposit} /> for {survey.quota} answers
        </span>
        <Button variant="primary" className="w-full sm:w-auto" disabled={!address || !onChain || !enough || busy} onClick={lock}>
          {busy ? (
            <>
              <Loader2 className="animate-spin motion-reduce:animate-none" />
              {phase === "wallet" || approvePhase === "wallet" ? "Confirm in your wallet…" : "Locking on BSC…"}
            </>
          ) : (
            <>
              <Lock />
              Fund and launch
            </>
          )}
        </Button>
      </ActionBar>
    </div>
  );
}

type StepState = "todo" | "active" | "wallet" | "pending" | "done" | "error";

function Step({ n, title, state, children }: { n: number; title: ReactNode; state: StepState; children?: ReactNode }) {
  return (
    <li className="flex gap-3 py-2.5">
      <span
        className={cn(
          "nums grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold transition-colors duration-200",
          state === "done" && "bg-pay-soft text-pay",
          state === "error" && "bg-dontpay-soft text-dontpay",
          (state === "wallet" || state === "pending") && "bg-brand-soft text-brand-ink",
          state === "active" && "bg-inverse text-inverse-fg",
          state === "todo" && "bg-surface-2 text-muted",
        )}
      >
        {state === "done" ? <Check className="size-3.5" strokeWidth={3} /> : state === "wallet" || state === "pending" ? <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" /> : state === "error" ? <X className="size-3.5" strokeWidth={3} /> : n}
      </span>
      <div className="min-w-0 pt-0.5">
        <p className={cn("text-[15px]", state === "todo" ? "text-muted" : "font-medium")}>
          {title}
          {state === "wallet" ? <span className="font-normal text-muted"> · confirm in wallet</span> : null}
          {state === "pending" ? <span className="font-normal text-muted"> · confirming on BSC</span> : null}
        </p>
        {children ? <div className="mt-1.5">{children}</div> : null}
      </div>
    </li>
  );
}
