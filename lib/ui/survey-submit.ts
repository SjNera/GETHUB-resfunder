// Turns the fund form (total budget, quota, deadline) into what createSurvey needs.
// The researcher enters one total that includes the fee; the rate per response is
// derived from it, because the contract takes rate and quota.
import { surveyHash } from "@/lib/canonical";
import type { Hex, SurveyJson } from "@/lib/types";
import { breakdown, parseBnb, type Breakdown } from "./fees";
import { bnbAmount } from "./format";

export type FundingInput = { total: string; quota: string; deadline: string };

/** Fee share of the deposit above which the form warns, in percent. */
export const FEE_WARN_PERCENT = 50;

export type BudgetSplit = Breakdown & {
  rate: bigint;
  /** What the researcher typed, in wei. */
  total: bigint;
  /** total − deposit: under `quota` wei, left by rounding the rate down. Stays in the wallet. */
  leftover: bigint;
  /** Set when the fee is more than FEE_WARN_PERCENT of the deposit. */
  warning?: string;
};

export type FundingPlan = {
  survey: SurveyJson;
  hash: Hex;
  quota: number;
  /** Unix seconds, end of the chosen day UTC. */
  deadline: number;
  feePerResponse: bigint;
} & BudgetSplit;

export type FundingErrors = Partial<Record<keyof FundingInput, string>>;
export type FundingResult = { ok: true; plan: FundingPlan } | { ok: false; errors: FundingErrors; split?: BudgetSplit };

const MAX_QUOTA = 100_000;

export function parseQuota(text: string): number | null {
  const quota = Number(text);
  return text.trim() !== "" && Number.isInteger(quota) && quota >= 1 && quota <= MAX_QUOTA ? quota : null;
}

/**
 * Splits a total budget (fee included) across the quota, in wei:
 *   fee = quota × feePerResponse,  rate = ⌊(total − fee) / quota⌋,  deposit = rate × quota + fee ≤ total
 */
export function splitBudget(total: bigint, quota: number, feePerResponse: bigint): { ok: true; split: BudgetSplit } | { ok: false; error: string } {
  const fee = feePerResponse * BigInt(quota);
  const rate = total > fee ? (total - fee) / BigInt(quota) : BigInt(0);
  if (rate <= BigInt(0)) {
    return { ok: false, error: `Your budget must be more than the fee: ${bnbAmount(fee, 8)} tBNB for ${quota} response${quota === 1 ? "" : "s"}.` };
  }
  const b = breakdown(rate, quota, feePerResponse);
  const warning = b.fee * BigInt(100) > b.deposit * BigInt(FEE_WARN_PERCENT)
    ? "Most of your budget goes to fees. Lower the quota or raise the budget."
    : undefined;
  return { ok: true, split: { ...b, rate, total, leftover: total - b.deposit, warning } };
}

export function planFunding(
  survey: SurveyJson,
  input: FundingInput,
  feePerResponse: bigint,
  nowMs: number,
): FundingResult {
  const errors: FundingErrors = {};
  const total = parseBnb(input.total);
  if (total === null || total <= BigInt(0)) errors.total = "Enter a budget above 0 tBNB.";
  const quota = parseQuota(input.quota);
  if (quota === null) errors.quota = `Enter a whole number from 1 to ${MAX_QUOTA.toLocaleString("en-PH")}.`;
  let split: BudgetSplit | undefined;
  if (total !== null && total > BigInt(0) && quota !== null) {
    const s = splitBudget(total, quota, feePerResponse);
    if (s.ok) split = s.split;
    else errors.total = s.error;
  }
  const end = /^\d{4}-\d{2}-\d{2}$/.test(input.deadline) ? Date.parse(`${input.deadline}T23:59:59Z`) : NaN;
  if (!Number.isFinite(end) || end <= nowMs) errors.deadline = "Pick a deadline in the future.";
  if (Object.keys(errors).length || !split || quota === null) return { ok: false, errors, split };
  return {
    ok: true,
    plan: { survey, hash: surveyHash(survey), quota, deadline: Math.floor(end / 1000), feePerResponse, ...split },
  };
}
