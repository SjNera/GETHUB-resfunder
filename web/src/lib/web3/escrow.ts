"use client";

/**
 * Escrow seam. In demo mode (no contract addresses) every call is simulated
 * with realistic waits; once NEXT_PUBLIC_ESCROW_ADDRESS and
 * NEXT_PUBLIC_TOKEN_ADDRESS (the mock tPHP token) are set they send real
 * transactions on BSC Testnet through the connected wallet.
 */
import { erc20Abi } from "viem";
import { useWriteContract } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { fakeTxHash } from "../demo/ids";
import { surveyEscrowAbi } from "./abi/surveyEscrow";
import { wagmiConfig } from "./config";
import { DEMO_MODE, ESCROW_ADDRESS, TOKEN_ADDRESS } from "./contracts";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type TxPhase = "idle" | "wallet" | "pending" | "done" | "error";

type Hooks = { onPhase: (p: TxPhase, tx?: `0x${string}`) => void };

export function useEscrow() {
  const write = useWriteContract();

  async function run(simulated: boolean, send: () => Promise<`0x${string}`>, { onPhase }: Hooks) {
    onPhase("wallet");
    let tx: `0x${string}`;
    if (simulated) {
      await sleep(900);
      tx = fakeTxHash();
      onPhase("pending", tx);
      await sleep(1200);
    } else {
      tx = await send();
      onPhase("pending", tx);
      await waitForTransactionReceipt(wagmiConfig, { hash: tx });
    }
    onPhase("done", tx);
    return tx;
  }

  return {
    /** Step 1: let the escrow pull rate × quota + 5% fee of the mock tPHP token. */
    approve: (args: { amount: bigint; forceSimulated?: boolean }, hooks: Hooks) =>
      run(
        DEMO_MODE || !!args.forceSimulated,
        () => write.mutateAsync({ address: TOKEN_ADDRESS!, abi: erc20Abi, functionName: "approve", args: [ESCROW_ADDRESS!, args.amount] }),
        hooks,
      ),
    /** Step 2: create the survey; the contract pulls the approved amount. */
    create: (
      args: { surveyHash: `0x${string}`; rateUnits: bigint; quota: number; deadline: Date; forceSimulated?: boolean },
      hooks: Hooks,
    ) =>
      run(
        DEMO_MODE || !!args.forceSimulated,
        () =>
          write.mutateAsync({
            address: ESCROW_ADDRESS!,
            abi: surveyEscrowAbi,
            functionName: "createSurvey",
            args: [args.surveyHash, args.rateUnits, BigInt(args.quota), BigInt(Math.floor(args.deadline.getTime() / 1000))],
          }),
        hooks,
      ),
    /** Returns the unused budget to the researcher. */
    close: (args: { surveyHash: `0x${string}`; forceSimulated?: boolean }, hooks: Hooks) =>
      run(
        DEMO_MODE || !!args.forceSimulated,
        () => write.mutateAsync({ address: ESCROW_ADDRESS!, abi: surveyEscrowAbi, functionName: "closeSurvey", args: [args.surveyHash] }),
        hooks,
      ),
  };
}
