import { describe, expect, it } from 'vitest';
import demo from '../data/demo-survey.json';
import { surveySchema, validateAnswers } from './survey-schema';
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
});
