import { describe, expect, it } from 'vitest';
import type { AiResult } from '../types';
import { INCONCLUSIVE_REASON, combineAnswers, combineRuns, type AiRun } from './combine';

const valid: AiRun = { label: 'valid', type: null, injection: false, reason: 'Answers the question.' };
const evasive: AiRun = { label: 'non_answer', type: 'evasive', injection: false, reason: 'Says nothing.' };
const inconclusive = (injection: boolean): AiResult => ({
  label: 'unclear', type: 'other', injection, reason: INCONCLUSIVE_REASON, agreed: false,
});

describe('combineRuns', () => {
  it('uses run 1 when both agree', () => {
    expect(combineRuns(valid, { ...valid, reason: 'other words' })).toEqual({ ...valid, agreed: true });
  });
  it('is inconclusive when labels differ', () => {
    expect(combineRuns(valid, evasive)).toEqual(inconclusive(false));
  });
  it('is inconclusive when injection differs, keeping injection true', () => {
    expect(combineRuns(valid, { ...valid, injection: true })).toEqual(inconclusive(true));
  });
  it('is inconclusive with one failed run, keeping the other run injection', () => {
    expect(combineRuns(null, { ...evasive, injection: true })).toEqual(inconclusive(true));
    expect(combineRuns(valid, null)).toEqual(inconclusive(false));
  });
  it('is inconclusive with injection false when both failed', () => {
    expect(combineRuns(null, null)).toEqual(inconclusive(false));
  });
});

describe('combineAnswers', () => {
  const v: AiResult = { ...valid, agreed: true };
  const u: AiResult = { label: 'unclear', type: 'off_question', injection: false, reason: 'Off topic.', agreed: true };
  const n: AiResult = { ...evasive, agreed: true };

  it('returns null for no answers', () => {
    expect(combineAnswers([])).toBeNull();
  });
  it('returns the single result', () => {
    expect(combineAnswers([v])).toEqual(v);
  });
  it('worst label wins with its type and reason', () => {
    expect(combineAnswers([v, n, u])).toEqual(n);
    expect(combineAnswers([v, u])).toEqual(u);
  });
  it('injection is true if any answer has it', () => {
    expect(combineAnswers([n, { ...v, injection: true }])).toEqual({ ...n, injection: true });
  });
  it('agreed is false if any answer has it false', () => {
    expect(combineAnswers([{ ...v, agreed: false }, u])).toEqual({ ...u, agreed: false });
  });
  it('keeps the first answer on a label tie', () => {
    expect(combineAnswers([u, { ...u, reason: 'Second.' }])?.reason).toBe('Off topic.');
  });
  it('on a label tie, takes the reason of the answer flagged for injection', () => {
    const inj: AiResult = { ...v, injection: true, reason: 'Contains instructions for the screener.' };
    expect(combineAnswers([v, inj])).toEqual(inj);
    expect(combineAnswers([inj, v])).toEqual(inj);
  });
  it('a worse label still beats an injection on a better label', () => {
    const inj: AiResult = { ...v, injection: true, reason: 'Contains instructions.' };
    expect(combineAnswers([inj, n])).toEqual({ ...n, injection: true });
  });
});
