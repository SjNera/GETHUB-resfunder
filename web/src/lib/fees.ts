/**
 * Budget math. The UI works in centavos (integers); the contract works in
 * token base units (bigint, 18 decimals for the mock tPHP token).
 *
 * The 5% fee is computed with integer division on the budget. The contract's
 * rounding must match this — confirm with the contract team before go-live.
 */

export const FEE_BPS = 500; // 5.00%
export const TOKEN_DECIMALS = 18;
const UNITS_PER_CENTAVO = BigInt(10) ** BigInt(TOKEN_DECIMALS - 2);

export type Breakdown = {
  budgetCentavos: number;
  feeCentavos: number;
  depositCentavos: number;
};

export function breakdown(rateCentavos: number, quota: number): Breakdown {
  if (!Number.isInteger(rateCentavos) || !Number.isInteger(quota) || rateCentavos < 0 || quota < 0) {
    throw new Error("rate and quota must be non-negative integers");
  }
  const budget = BigInt(rateCentavos) * BigInt(quota);
  const fee = (budget * BigInt(FEE_BPS)) / BigInt(10_000);
  return {
    budgetCentavos: Number(budget),
    feeCentavos: Number(fee),
    depositCentavos: Number(budget + fee),
  };
}

export function centavosToUnits(centavos: number): bigint {
  return BigInt(centavos) * UNITS_PER_CENTAVO;
}

export function unitsToCentavos(units: bigint): number {
  return Number(units / UNITS_PER_CENTAVO);
}

/** Unused budget returned at close: budget minus what was paid out. */
export function refundCentavos(rateCentavos: number, quota: number, paidCount: number): number {
  const paid = Math.min(paidCount, quota);
  return rateCentavos * (quota - paid);
}
