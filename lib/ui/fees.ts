/**
 * Deposit math in wei (tBNB, 18 decimals), matching SurveyEscrow.createSurvey:
 *
 *   deposit = rate × quota + quota × feePerResponse
 *
 * feePerResponse = estimated gas for one payout (with a safety margin) + profit.
 * At funding the contract sends quota × gasPerResponse to the agent wallet and
 * the rest of the fee to the platform wallet; the budget stays locked.
 */
import { parseEther } from "viem";

export type Breakdown = { budget: bigint; fee: bigint; deposit: bigint };

export function breakdown(rate: bigint, quota: number, feePerResponse: bigint): Breakdown {
  if (rate < BigInt(0) || feePerResponse < BigInt(0) || !Number.isInteger(quota) || quota < 0) {
    throw new Error("rate, fee and quota must be non-negative");
  }
  const q = BigInt(quota);
  const budget = rate * q;
  const fee = feePerResponse * q;
  return { budget, fee, deposit: budget + fee };
}

/** How the fee splits at funding. */
export function feeSplit(quota: number, feePerResponse: bigint, gasPerResponse: bigint) {
  const gas = gasPerResponse * BigInt(quota);
  return { agent: gas, platform: feePerResponse * BigInt(quota) - gas };
}

/** feePerResponse from a live estimate: gas units × gas price × (1 + margin) + profit. */
export function feePerResponse(gasUnits: bigint, gasPrice: bigint, profit: bigint, marginBps = BigInt(2_000)): bigint {
  const gas = gasUnits * gasPrice;
  return gas + (gas * marginBps) / BigInt(10_000) + profit;
}

/** Remaining balance returned at close: rate × (quota − paid). */
export function refundAmount(rate: bigint, quota: number, paidCount: number): bigint {
  const unpaid = Math.max(0, quota - Math.min(paidCount, quota));
  return rate * BigInt(unpaid);
}

/** "0.001" → wei. Null when the text isn't a valid non-negative amount. */
export function parseBnb(text: string): bigint | null {
  const t = text.trim();
  if (!/^\d*\.?\d+$/.test(t)) return null;
  try {
    return parseEther(t);
  } catch {
    return null;
  }
}
