// Pure combiners for AI label runs (TDD 10.3).
import type { AiLabel, AiResult } from '../types';

/** A parsed, schema-valid reply from one run. */
export interface AiRun {
  label: AiLabel;
  type: AiResult['type'];
  injection: boolean;
  reason: string;
}

export const INCONCLUSIVE_REASON = 'The AI check was inconclusive.';

/** Combines the two runs for one answer. A null run is a failed run. */
export function combineRuns(runA: AiRun | null, runB: AiRun | null): AiResult {
  if (runA && runB && runA.label === runB.label && runA.injection === runB.injection) {
    return { label: runA.label, type: runA.type, injection: runA.injection, reason: runA.reason, agreed: true };
  }
  return {
    label: 'unclear',
    type: 'other',
    injection: (runA?.injection ?? false) || (runB?.injection ?? false),
    reason: INCONCLUSIVE_REASON,
    agreed: false,
  };
}

/** What one run answered, kept for the researcher's review. Null: the call failed, timed out or was not usable. */
export type AiRunRecord = AiRun | null;

/** An answer's combined result plus both runs as they came back. */
export type AiResultWithRuns = AiResult & { runs?: [AiRunRecord, AiRunRecord] };

/** Adds both runs to a combined result. The decision fields are unchanged. */
export function withRuns(result: AiResult, runA: AiRun | null, runB: AiRun | null): AiResultWithRuns {
  const copy = (r: AiRun | null): AiRunRecord => (r ? { label: r.label, type: r.type, injection: r.injection, reason: r.reason } : null);
  return { ...result, runs: [copy(runA), copy(runB)] };
}

/** One open-ended answer the AI did not clear: not valid, flagged for injection, or the two runs split. */
export interface AiFlag {
  questionId: string;
  label: AiLabel;
  type: AiResult['type'];
  injection: boolean;
  agreed: boolean;
  reason: string;
  /** Both runs for this answer, when they were saved. */
  runs?: [AiRunRecord, AiRunRecord];
}

/** The AI result plus the answers it flagged. Stored as-is in decisions.ai_result. */
export type AiResultWithFlags = AiResult & { flagged?: AiFlag[] };

/** The answers that did not get a clean, agreed "valid", by question id, in survey order. */
export function flaggedAnswers(questionIds: string[], results: AiResultWithRuns[]): AiFlag[] {
  return results.flatMap((r, i) => {
    if (r.label === 'valid' && !r.injection && r.agreed) return [];
    const flag: AiFlag = { questionId: questionIds[i], label: r.label, type: r.type, injection: r.injection, agreed: r.agreed, reason: r.reason };
    if (r.runs) flag.runs = r.runs;
    return [flag];
  });
}

const SEVERITY: Record<AiLabel, number> = { valid: 0, unclear: 1, non_answer: 2 };

/**
 * Combines per-answer results. Worst label wins with that answer's type and reason.
 * On a tie, an answer flagged for injection wins, so the reason explains the Review;
 * otherwise the first one in order. Returns null for an empty list.
 */
export function combineAnswers(results: AiResult[]): AiResult | null {
  if (results.length === 0) return null;
  let worst = results[0];
  for (const r of results) {
    const s = SEVERITY[r.label];
    const w = SEVERITY[worst.label];
    if (s > w || (s === w && r.injection && !worst.injection)) worst = r;
  }
  return {
    label: worst.label,
    type: worst.type,
    injection: results.some((r) => r.injection),
    reason: worst.reason,
    agreed: results.every((r) => r.agreed),
  };
}
