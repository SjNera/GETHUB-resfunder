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

const SEVERITY: Record<AiLabel, number> = { valid: 0, unclear: 1, non_answer: 2 };

/**
 * Combines per-answer results. Worst label wins with that answer's type and reason
 * (first one in order on a tie). Returns null for an empty list.
 */
export function combineAnswers(results: AiResult[]): AiResult | null {
  if (results.length === 0) return null;
  let worst = results[0];
  for (const r of results) {
    if (SEVERITY[r.label] > SEVERITY[worst.label]) worst = r;
  }
  return {
    label: worst.label,
    type: worst.type,
    injection: results.some((r) => r.injection),
    reason: worst.reason,
    agreed: results.every((r) => r.agreed),
  };
}
