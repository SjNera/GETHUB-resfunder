// Turns builder input into what createSurvey needs. The wallet call itself is
// not wired yet (needs lane A's ABI and lane C's register route).
import { surveyHash } from "@/lib/canonical";
import type { Hex, SurveyJson } from "@/lib/types";
import { breakdown, parseBnb, type Breakdown } from "./fees";

export type FundingInput = { rate: string; quota: string; deadline: string };

export type FundingPlan = {
  survey: SurveyJson;
  hash: Hex;
  rate: bigint;
  quota: number;
  /** Unix seconds, end of the chosen day UTC. */
  deadline: number;
  feePerResponse: bigint;
} & Breakdown;

export type FundingResult = { ok: true; plan: FundingPlan } | { ok: false; errors: Partial<Record<keyof FundingInput, string>> };

export function planFunding(
  survey: SurveyJson,
  input: FundingInput,
  feePerResponse: bigint,
  nowMs: number,
): FundingResult {
  const errors: Partial<Record<keyof FundingInput, string>> = {};
  const rate = parseBnb(input.rate);
  if (rate === null || rate <= BigInt(0)) errors.rate = "Enter a rate above 0 tBNB.";
  const quota = Number(input.quota);
  if (!Number.isInteger(quota) || quota < 1 || quota > 100_000) errors.quota = "Enter a whole number from 1 to 100,000.";
  const end = /^\d{4}-\d{2}-\d{2}$/.test(input.deadline) ? Date.parse(`${input.deadline}T23:59:59Z`) : NaN;
  if (!Number.isFinite(end) || end <= nowMs) errors.deadline = "Pick a deadline in the future.";
  if (Object.keys(errors).length || rate === null) return { ok: false, errors };
  return {
    ok: true,
    plan: {
      survey,
      hash: surveyHash(survey),
      rate,
      quota,
      deadline: Math.floor(end / 1000),
      feePerResponse,
      ...breakdown(rate, quota, feePerResponse),
    },
  };
}
