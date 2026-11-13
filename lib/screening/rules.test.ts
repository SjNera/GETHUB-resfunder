import { describe, expect, it } from 'vitest';
import type { AiResult, DecisionResult, Signals, WeakSignal } from '../types';
import { decide, INJECTION_REASON, PASS_REASON, RUBRIC_VERSION } from './rules';

const AI: Record<string, AiResult | null> = {
  null: null,
  valid: { label: 'valid', type: null, injection: false, reason: 'A real answer.', agreed: true },
  unclear: { label: 'unclear', type: 'other', injection: false, reason: 'Hard to tell.', agreed: true },
  non_answer: { label: 'non_answer', type: 'evasive', injection: false, reason: 'Filler only.', agreed: true },
  injection: { label: 'valid', type: null, injection: true, reason: 'Tried to steer the screener.', agreed: true },
  disagreed: {
    label: 'unclear', type: 'other', injection: false,
    reason: 'The AI check was inconclusive.', agreed: false,
  },
};

const WEAK: Record<number, WeakSignal[]> = {
  0: [],
  1: ['too_fast'],
  2: ['too_fast', 'straight_lining'],
};

const S = {
  empty: 'An open-ended answer was left empty.',
  gibberish: 'An open-ended answer was not readable text.',
  duplicate: 'An open-ended answer matched another response in this survey.',
  too_fast: 'The survey was completed unusually fast.',
  straight_lining: 'The same option was chosen many times in a row.',
};

function signals(hardFail: boolean, weak: number): Signals {
  return {
    hardFails: hardFail ? [{ check: 'gibberish', questionId: 'q7' }] : [],
    weak: WEAK[weak],
  };
}

function expected(hardFail: boolean, aiKey: string, weak: number): { result: DecisionResult; reasons: string[] } {
  const code = [...(hardFail ? [S.gibberish] : []), ...WEAK[weak].map((w) => S[w])];
  if (hardFail) return { result: 'dont_pay', reasons: code };
  const ai = AI[aiKey];
  if (ai && (ai.injection || ai.label !== 'valid' || !ai.agreed)) {
    return {
      result: 'review',
      reasons: [...code, ...(ai.injection ? [INJECTION_REASON] : []), ai.reason],
    };
  }
  if (weak >= 2) return { result: 'review', reasons: code };
  return { result: 'pay', reasons: code.length ? code : [PASS_REASON] };
}

const cases: [boolean, string, number][] = [];
for (const hardFail of [false, true])
  for (const aiKey of Object.keys(AI))
    for (const weak of [0, 1, 2]) cases.push([hardFail, aiKey, weak]);

describe('decide: full table', () => {
  it('covers 2 x 6 x 3 = 36 combinations', () => {
    expect(cases).toHaveLength(36);
  });

  it.each(cases)('hardFail=%s ai=%s weak=%i', (hardFail, aiKey, weak) => {
    expect(decide(signals(hardFail, weak), AI[aiKey])).toEqual(expected(hardFail, aiKey, weak));
  });
});

describe('decide: spot checks', () => {
  it('any hard fail is dont_pay', () => {
    for (const aiKey of Object.keys(AI))
      for (const weak of [0, 1, 2])
        expect(decide(signals(true, weak), AI[aiKey]).result).toBe('dont_pay');
  });

  it('clean response pays with "Passed all checks."', () => {
    expect(decide(signals(false, 0), AI.valid)).toEqual({ result: 'pay', reasons: [PASS_REASON] });
    expect(decide(signals(false, 0), null)).toEqual({ result: 'pay', reasons: [PASS_REASON] });
  });

  it('one weak signal alone still pays and keeps its sentence', () => {
    expect(decide({ hardFails: [], weak: ['straight_lining'] }, AI.valid)).toEqual({
      result: 'pay',
      reasons: [S.straight_lining],
    });
  });

  it('two weak signals go to review', () => {
    expect(decide(signals(false, 2), null)).toEqual({
      result: 'review',
      reasons: [S.too_fast, S.straight_lining],
    });
  });

  it('injection adds the injection sentence, then the AI reason last', () => {
    expect(decide(signals(false, 1), AI.injection)).toEqual({
      result: 'review',
      reasons: [S.too_fast, INJECTION_REASON, AI.injection!.reason],
    });
  });

  it('valid AI reason is not added when the AI did not cause review', () => {
    expect(decide(signals(false, 2), AI.valid).reasons).not.toContain(AI.valid!.reason);
  });

  it('hard fail reasons are one per distinct check, in a fixed order', () => {
    const s: Signals = {
      hardFails: [
        { check: 'duplicate', questionId: 'q8' },
        { check: 'empty', questionId: 'q7' },
        { check: 'duplicate', questionId: 'q9' },
      ],
      weak: [],
    };
    expect(decide(s, null)).toEqual({ result: 'dont_pay', reasons: [S.empty, S.duplicate] });
  });

  it('agreed=false with a valid label still goes to review', () => {
    const ai: AiResult = { ...AI.valid!, agreed: false, reason: 'The AI check was inconclusive.' };
    expect(decide(signals(false, 0), ai).result).toBe('review');
  });

  it('does not mutate its inputs', () => {
    const s = signals(false, 1);
    const copy = structuredClone(s);
    decide(s, AI.unclear);
    expect(s).toEqual(copy);
  });
});

describe('decide: AI never decides payment', () => {
  it('the AI can never produce dont_pay', () => {
    for (const aiKey of Object.keys(AI))
      for (const weak of [0, 1, 2])
        expect(decide(signals(false, weak), AI[aiKey]).result).not.toBe('dont_pay');
  });

  it('the AI can never cause pay: same signals with ai=null pay at least as often', () => {
    for (const hardFail of [false, true])
      for (const aiKey of Object.keys(AI))
        for (const weak of [0, 1, 2]) {
          const withAi = decide(signals(hardFail, weak), AI[aiKey]).result;
          const without = decide(signals(hardFail, weak), null).result;
          if (withAi === 'pay') expect(without).toBe('pay');
        }
  });
});

describe('RUBRIC_VERSION', () => {
  it('is v1', () => {
    expect(RUBRIC_VERSION).toBe('v1');
  });
});
