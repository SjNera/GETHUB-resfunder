import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AiResult, ScreenInput, SurveyJson } from '../types';
import { runChecks } from './checks';
import { INCONCLUSIVE_REASON } from './combine';
import { SCREENING_ERROR_REASON, screen, screenWith, type ScreenDeps } from './index';
import { INJECTION_REASON, PASS_REASON } from './rules';

const SURVEY: SurveyJson = {
  title: 'Study habits',
  description: '',
  questions: [
    { id: 'q1', type: 'multiple_choice', text: 'Year level?', required: true, options: ['1', '2'] },
    { id: 'q2', type: 'open_ended', text: 'How do you study?', required: true, allowShort: false },
    { id: 'q3', type: 'open_ended', text: 'Anything else?', required: false, allowShort: true },
  ],
};

function input(answers: ScreenInput['answers'], survey: SurveyJson = SURVEY): ScreenInput {
  return { survey, answers, durationMs: 60_000, prior: { openTexts: {}, durationsMs: [] } };
}

const VALID: AiResult = { label: 'valid', type: null, injection: false, reason: 'A real answer.', agreed: true };
const NON_ANSWER: AiResult = { label: 'non_answer', type: 'evasive', injection: false, reason: 'Filler only.', agreed: true };
const INJECTION: AiResult = { label: 'valid', type: null, injection: true, reason: 'Tried to steer.', agreed: true };
const DISAGREED: AiResult = { label: 'unclear', type: 'other', injection: false, reason: INCONCLUSIVE_REASON, agreed: false };

function deps(label: ScreenDeps['labelAnswer'], over: Partial<ScreenDeps> = {}) {
  const labelAnswer = vi.fn(label);
  return { labelAnswer, deps: { runChecks, labelAnswer, llmModel: () => 'test-model', ...over } };
}

const CLEAN = { q1: '1', q2: 'I make flashcards and review them every night.' };

describe('screen', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('pays a clean response', async () => {
    const d = deps(async () => VALID);
    const out = await screenWith(input(CLEAN), d.deps);
    expect(out).toEqual({
      result: 'pay',
      reasons: [PASS_REASON],
      signals: { hardFails: [], weak: [] },
      ai: VALID,
      llmModel: 'test-model',
      rubricVersion: 'v1',
    });
    expect(d.labelAnswer).toHaveBeenCalledExactlyOnceWith('How do you study?', CLEAN.q2);
  });

  it('labels every open-ended answer, allowShort included, and combines them', async () => {
    const d = deps(async (_q, a) => (a === 'none' ? NON_ANSWER : VALID));
    const out = await screenWith(input({ ...CLEAN, q3: 'none' }), d.deps);
    expect(d.labelAnswer).toHaveBeenCalledTimes(2);
    expect(out.result).toBe('review');
    expect(out.ai?.label).toBe('non_answer');
    expect(out.reasons).toEqual(['Filler only.']);
  });

  it('gives dont_pay on a hard fail and does not call the AI', async () => {
    const d = deps(async () => VALID);
    const out = await screenWith(input({ q1: '1', q2: 'zxcvbnm' }), d.deps);
    expect(out.result).toBe('dont_pay');
    expect(out.signals.hardFails).toEqual([{ check: 'gibberish', questionId: 'q2' }]);
    expect(out.ai).toBeNull();
    expect(out.llmModel).toBeNull();
    expect(d.labelAnswer).not.toHaveBeenCalled();
  });

  it.each([
    ['non_answer', NON_ANSWER, ['Filler only.']],
    ['injection', INJECTION, [INJECTION_REASON, 'Tried to steer.']],
    ['disagreement', DISAGREED, [INCONCLUSIVE_REASON]],
  ])('sends AI %s to review', async (_name, ai, reasons) => {
    const out = await screenWith(input(CLEAN), deps(async () => ai).deps);
    expect(out.result).toBe('review');
    expect(out.reasons).toEqual(reasons);
    expect(out.ai).toEqual(ai);
  });

  it('sets ai to null when there are no open-ended answers', async () => {
    const survey: SurveyJson = { ...SURVEY, questions: [SURVEY.questions[0], SURVEY.questions[2]] };
    const d = deps(async () => VALID);
    const out = await screenWith(input({ q1: '1', q3: '   ' }, survey), d.deps);
    expect(out.result).toBe('pay');
    expect(out.ai).toBeNull();
    expect(out.llmModel).toBeNull();
    expect(d.labelAnswer).not.toHaveBeenCalled();
  });

  it('sends a throwing labeler to review with the screening-error reason', async () => {
    const out = await screenWith(input(CLEAN), deps(async () => { throw new Error('boom'); }).deps);
    expect(out.result).toBe('review');
    expect(out.reasons).toEqual([SCREENING_ERROR_REASON]);
    expect(out.ai).toBeNull();
    expect(out.rubricVersion).toBe('v1');
  });

  it('sends a throwing check to review with the screening-error reason', async () => {
    const d = deps(async () => VALID, { runChecks: () => { throw new Error('boom'); } });
    const out = await screenWith(input(CLEAN), d.deps);
    expect(out).toEqual({
      result: 'review',
      reasons: [SCREENING_ERROR_REASON],
      signals: { hardFails: [], weak: [] },
      ai: null,
      llmModel: null,
      rubricVersion: 'v1',
    });
    expect(d.labelAnswer).not.toHaveBeenCalled();
  });

  it('screen() with no GROQ_MODEL sends to review without a network call', async () => {
    vi.stubEnv('GROQ_MODEL', '');
    const out = await screen(input(CLEAN));
    expect(out.result).toBe('review');
    expect(out.ai?.agreed).toBe(false);
    expect(out.reasons).toEqual([INCONCLUSIVE_REASON]);
    expect(out.rubricVersion).toBe('v1');
  });

  it('screen() never throws on malformed input', async () => {
    const out = await screen({ survey: null } as unknown as ScreenInput);
    expect(out.result).toBe('review');
    expect(out.reasons).toEqual([SCREENING_ERROR_REASON]);
  });
});
