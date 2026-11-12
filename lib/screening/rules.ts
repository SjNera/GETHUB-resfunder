// Rule engine (TDD 10.4). Pure. The AI can only move a response to Review.
import type {
  AiResult,
  DecisionResult,
  HardFailCheck,
  Signals,
  WeakSignal,
} from '../types';

export const RUBRIC_VERSION = 'v1';

const HARD_FAIL_REASONS: Record<HardFailCheck, string> = {
  empty: 'An open-ended answer was left empty.',
  gibberish: 'An open-ended answer was not readable text.',
  duplicate: 'An open-ended answer matched another response in this survey.',
};

const WEAK_REASONS: Record<WeakSignal, string> = {
  too_fast: 'The survey was completed unusually fast.',
  straight_lining: 'The same option was chosen many times in a row.',
};

const HARD_FAIL_ORDER: HardFailCheck[] = ['empty', 'gibberish', 'duplicate'];
const WEAK_ORDER: WeakSignal[] = ['too_fast', 'straight_lining'];

export const INJECTION_REASON =
  'The answer contained instructions aimed at the AI screener.';
export const PASS_REASON = 'Passed all checks.';

/** One sentence per distinct code signal, hard fails first, in a fixed order. */
function codeReasons(signals: Signals): string[] {
  const fails = new Set(signals.hardFails.map((f) => f.check));
  const weak = new Set(signals.weak);
  return [
    ...HARD_FAIL_ORDER.filter((c) => fails.has(c)).map((c) => HARD_FAIL_REASONS[c]),
    ...WEAK_ORDER.filter((w) => weak.has(w)).map((w) => WEAK_REASONS[w]),
  ];
}

export function decide(
  signals: Signals,
  ai: AiResult | null,
): { result: DecisionResult; reasons: string[] } {
  const reasons = codeReasons(signals);

  // 1. Only a code-confirmed hard fail blocks payment.
  if (signals.hardFails.length > 0) {
    return { result: 'dont_pay', reasons };
  }

  // 2. Any AI doubt (or AI failure, agreed=false) sends to Review.
  if (ai && (ai.injection || ai.label !== 'valid' || !ai.agreed)) {
    if (ai.injection) reasons.push(INJECTION_REASON);
    reasons.push(ai.reason); // AI reason last
    return { result: 'review', reasons };
  }

  // 3. Two or more weak signals send to Review.
  if (signals.weak.length >= 2) {
    return { result: 'review', reasons };
  }

  // 4. Pay. One weak signal alone still pays; its sentence is kept.
  return { result: 'pay', reasons: reasons.length > 0 ? reasons : [PASS_REASON] };
}
