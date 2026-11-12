/**
 * Budget math in mock-token units (tPHP, 18 decimals, 1 tPHP = ₱1). Amounts live in the store as
 * decimal strings because JSON can't hold bigint.
 *
 * deposit = rate × quota + 5% fee. The fee uses integer division on the
 * budget; the contract must round the same way.
 */
import { formatEther, parseEther } from "viem";

export const FEE_BPS = BigInt(500); // 5.00%
const BPS = BigInt(10_000);

export type Breakdown = { budget: bigint; fee: bigint; deposit: bigint };

export function breakdown(rateUnits: bigint, quota: number): Breakdown {
  if (rateUnits < BigInt(0) || !Number.isInteger(quota) || quota < 0) {
    throw new Error("rate and quota must be non-negative");
  }
  const budget = rateUnits * BigInt(quota);
  const fee = (budget * FEE_BPS) / BPS;
  return { budget, fee, deposit: budget + fee };
}

/** Unused budget returned at close: rate × (quota − paid). */
export function refundUnits(rateUnits: bigint, quota: number, paidCount: number): bigint {
  const unpaid = Math.max(0, quota - Math.min(paidCount, quota));
  return rateUnits * BigInt(unpaid);
}

/** "10" → units. Returns null when the text isn't a valid positive amount. */
export function parsePeso(text: string): bigint | null {
  const t = text.trim();
  if (!/^\d*\.?\d+$/.test(t)) return null;
  try {
    return parseEther(t);
  } catch {
    return null;
  }
}

export const wei = (s: string | bigint) => (typeof s === "bigint" ? s : BigInt(s));
export const toPesoString = (w: bigint) => formatEther(w);
