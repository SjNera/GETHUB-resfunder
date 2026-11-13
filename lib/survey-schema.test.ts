import { describe, expect, it } from 'vitest';
import demo from '../data/demo-survey.json';
import { isStorableText, SURVEY_LIMITS, surveySchema, validateAnswers } from './survey-schema';
import type { SurveyJson } from './types';

const survey = demo as SurveyJson;

const good = {
  q1: 4, q2: 3, q3: 5, q4: 2, q5: 4,
  q6: '1 to 2 hours',
  q7: 'Mabagal ang internet namin kaya laging nadi-disconnect sa class.',
  q8: 'Pomodoro, kasi nakakapag-focus ako for 25 minutes.',
};

describe('surveySchema', () => {
  it('accepts the demo survey', () => {
    expect(surveySchema.safeParse(demo).success).toBe(true);
  });
  it('demo survey has the shape TDD 4.2 requires', () => {
    const qs = survey.questions;
    expect(qs.filter((q) => q.type === 'scale' && q.min === 1 && q.max === 5)).toHaveLength(5);
    expect(qs.filter((q) => q.type === 'multiple_choice')).toHaveLength(1);
    expect(qs.filter((q) => q.type === 'open_ended' && !q.allowShort)).toHaveLength(2);
    expect(qs.filter((q) => q.type === 'open_ended' && q.allowShort)).toHaveLength(1);
  });
  it('rejects duplicate ids', () => {
    const bad = { ...survey, questions: [survey.questions[0], survey.questions[0]] };
    expect(surveySchema.safeParse(bad).success).toBe(false);
  });
  it('rejects a scale with min >= max', () => {
    const bad = { title: 'T', description: '', questions: [{ id: 'a', type: 'scale', text: 'x', required: true, min: 5, max: 5 }] };
    expect(surveySchema.safeParse(bad).success).toBe(false);
  });
  it('rejects multiple choice with fewer than 2 non-empty options', () => {
    const bad = { title: 'T', description: '', questions: [{ id: 'a', type: 'multiple_choice', text: 'x', required: true, options: ['A', ' '] }] };
    expect(surveySchema.safeParse(bad).success).toBe(false);
  });
  it('rejects 0 and 31 questions and a long title', () => {
    const q = survey.questions[0];
    expect(surveySchema.safeParse({ title: 'T', description: '', questions: [] }).success).toBe(false);
    const many = Array.from({ length: 31 }, (_, i) => ({ ...q, id: `q${i}` }));
    expect(surveySchema.safeParse({ title: 'T', description: '', questions: many }).success).toBe(false);
    expect(surveySchema.safeParse({ ...survey, title: 'x'.repeat(201) }).success).toBe(false);
  });

  const withQuestion = (q: Record<string, unknown>) =>
    surveySchema.safeParse({ title: 'T', description: '', questions: [{ id: 'a', text: 'x', required: true, ...q }] });
  const open = { type: 'open_ended', allowShort: false };

  it('rejects a blank title or question text and oversized text', () => {
    expect(surveySchema.safeParse({ ...survey, title: '   ' }).success).toBe(false);
    expect(surveySchema.safeParse({ ...survey, description: 'x'.repeat(SURVEY_LIMITS.descriptionChars + 1) }).success).toBe(false);
    expect(withQuestion({ ...open }).success).toBe(true);
    expect(withQuestion({ ...open, text: ' \n ' }).success).toBe(false);
    expect(withQuestion({ ...open, text: 'x'.repeat(SURVEY_LIMITS.questionTextChars + 1) }).success).toBe(false);
  });
  it('rejects question ids that are unsafe as object keys', () => {
    for (const id of ['__proto__', 'constructor', 'toString', 'has space', 'q.1', '<b>', 'x'.repeat(65)]) {
      expect(withQuestion({ ...open, id }).success).toBe(false);
    }
    for (const id of ['q1', 'Q_1', 'a-b', '7']) {
      expect(withQuestion({ ...open, id }).success).toBe(true);
    }
  });
  it('rejects text the database cannot store', () => {
    expect(isStorableText('Kumusta, ñ, 你好, 😀')).toBe(true);
    expect(isStorableText('a\u0000b')).toBe(false);
    expect(isStorableText('a\ud83db')).toBe(false);
    expect(surveySchema.safeParse({ ...survey, title: 'T\u0000' }).success).toBe(false);
    expect(surveySchema.safeParse({ ...survey, description: '\udc00' }).success).toBe(false);
    expect(withQuestion({ ...open, text: 'x\u0000' }).success).toBe(false);
  });
  it('rejects duplicate, oversized or too many options', () => {
    const mc = (options: string[]) => withQuestion({ type: 'multiple_choice', options });
    expect(mc(['A', 'B']).success).toBe(true);
    expect(mc(['A', 'A']).success).toBe(false);
    expect(mc(['A', ' A ']).success).toBe(false);
    expect(mc(['A', 'x'.repeat(SURVEY_LIMITS.optionChars + 1)]).success).toBe(false);
    expect(mc(Array.from({ length: SURVEY_LIMITS.options + 1 }, (_, i) => `o${i}`)).success).toBe(false);
  });
  it('rejects a scale wider than the limit', () => {
    expect(withQuestion({ type: 'scale', min: 0, max: SURVEY_LIMITS.scaleSpan }).success).toBe(true);
    expect(withQuestion({ type: 'scale', min: 0, max: SURVEY_LIMITS.scaleSpan + 1 }).success).toBe(false);
    expect(withQuestion({ type: 'scale', min: 1, max: 1e12 }).success).toBe(false);
  });
  it('never changes the survey, so the hash stays the same', () => {
    expect(surveySchema.parse(demo)).toEqual(demo);
  });
});

describe('validateAnswers', () => {
  it('accepts valid answers without the optional question', () => {
    expect(validateAnswers(survey, good)).toEqual({ ok: true });
  });
  it('allows an empty required open-ended answer (screening judges it)', () => {
    expect(validateAnswers(survey, { ...good, q7: '' }).ok).toBe(true);
  });
  it('rejects a missing required answer', () => {
    const { q1: _q1, ...rest } = good;
    expect(validateAnswers(survey, rest).ok).toBe(false);
  });
  it('rejects unknown ids, bad options, out-of-range scale, non-integer scale, long text', () => {
    expect(validateAnswers(survey, { ...good, zz: 'x' }).ok).toBe(false);
    expect(validateAnswers(survey, { ...good, q6: 'Never' }).ok).toBe(false);
    expect(validateAnswers(survey, { ...good, q1: 6 }).ok).toBe(false);
    expect(validateAnswers(survey, { ...good, q1: 2.5 }).ok).toBe(false);
    expect(validateAnswers(survey, { ...good, q8: 'a'.repeat(5001) }).ok).toBe(false);
  });
  it('rejects open-ended text the database cannot store', () => {
    expect(validateAnswers(survey, { ...good, q8: 'fine\u0000' }).ok).toBe(false);
    expect(validateAnswers(survey, { ...good, q8: 'half \ud83d' }).ok).toBe(false);
    expect(validateAnswers(survey, { ...good, q8: 'Okay naman 😀' }).ok).toBe(true);
  });
  it('echoes only a short piece of an unknown id', () => {
    const res = validateAnswers(survey, { ...good, ['z'.repeat(5000)]: 'x' });
    expect(res.ok === false && res.message.length < 120).toBe(true);
  });
});
