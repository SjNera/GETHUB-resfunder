// Shape and code-only regression checks for data/labeled-set.json (TDD 10.5, task B5).
import { describe, expect, it } from 'vitest';
import items from '../../data/labeled-set.json';
import { surveySchema, validateAnswers } from '../survey-schema';
import type { ScreenInput, SurveyJson } from '../types';
import { runChecks } from './checks';

const JUNK = ['empty', 'gibberish', 'off_question', 'evasive', 'copied', 'injection'];
const GENUINE = ['genuine', 'genuine_short', 'genuine_taglish'];
const KEYS = ['allowShort', 'answer', 'category', 'human', 'id', 'question'];

// Same one-question survey that scripts/eval.ts builds.
function toInput(item: (typeof items)[number]): ScreenInput {
  const survey: SurveyJson = {
    title: `Eval ${item.id}`,
    description: '',
    questions: [{ id: 'q1', type: 'open_ended', text: item.question, required: true, allowShort: item.allowShort }],
  };
  return { survey, answers: { q1: item.answer }, durationMs: 60_000, prior: { openTexts: {}, durationsMs: [] } };
}

describe('labeled set', () => {
  it('has about 40 items with unique ids and exactly the LabeledItem fields', () => {
    expect(items.length).toBeGreaterThanOrEqual(35);
    expect(items.length).toBeLessThanOrEqual(45);
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
    for (const i of items) expect(Object.keys(i).sort()).toEqual(KEYS);
  });

  it('keeps human and category consistent', () => {
    for (const i of items) {
      expect([...GENUINE, ...JUNK]).toContain(i.category);
      expect(i.human).toBe(JUNK.includes(i.category) ? 'junk' : 'genuine');
    }
  });

  it('is about half genuine and covers every category', () => {
    const genuine = items.filter((i) => i.human === 'genuine').length;
    expect(Math.abs(genuine - items.length / 2)).toBeLessThanOrEqual(items.length * 0.1);
    for (const c of [...GENUINE, ...JUNK]) expect(items.some((i) => i.category === c)).toBe(true);
  });

  it('builds a valid one-question survey for every item', () => {
    for (const i of items) {
      const { survey, answers } = toInput(i);
      expect(surveySchema.safeParse(survey).success).toBe(true);
      expect(validateAnswers(survey, answers)).toEqual({ ok: true });
    }
  });

  it('code checks never flag a genuine item', () => {
    const flagged = items.filter((i) => i.human === 'genuine' && runChecks(toInput(i)).hardFails.length > 0);
    expect(flagged.map((i) => i.id)).toEqual([]);
  });

  it('code checks catch every empty item', () => {
    for (const i of items.filter((x) => x.category === 'empty')) {
      expect(runChecks(toInput(i)).hardFails).toEqual([{ check: 'empty', questionId: 'q1' }]);
    }
  });
});
