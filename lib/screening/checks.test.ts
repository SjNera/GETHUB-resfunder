import { describe, expect, it } from 'vitest';
import demo from '../../data/demo-survey.json';
import type { Answers, ScreenInput, SurveyJson } from '../types';
import { isGibberish, normalize, runChecks } from './checks';

const survey = demo as SurveyJson;

const good: Answers = {
  q1: 4, q2: 3, q3: 5, q4: 2, q5: 4,
  q6: '1 to 2 hours',
  q7: 'Mabagal ang internet namin kaya laging nadi-disconnect sa class.',
  q8: 'Pomodoro, kasi nakakapag-focus ako for 25 minutes.',
  q9: 'none',
};

function input(over: Partial<ScreenInput> = {}, answers: Answers = {}): ScreenInput {
  return {
    survey,
    answers: { ...good, ...answers },
    durationMs: 300_000,
    prior: { openTexts: {}, durationsMs: [] },
    ...over,
  };
}

const fails = (i: ScreenInput) => runChecks(i).hardFails;

describe('normalize', () => {
  it('trims, lowercases and collapses whitespace', () => {
    expect(normalize('  Hello \n\t  WORLD  ')).toBe('hello world');
  });
});

describe('runChecks: clean response', () => {
  it('has no signals', () => {
    expect(runChecks(input())).toEqual({ hardFails: [], weak: [] });
  });
});

describe('empty', () => {
  it('fails a required blank answer', () => {
    expect(fails(input({}, { q7: '   ' }))).toEqual([{ check: 'empty', questionId: 'q7' }]);
  });
  it('fails a required missing answer', () => {
    const answers = { ...good };
    delete answers.q8;
    expect(fails({ ...input(), answers })).toEqual([{ check: 'empty', questionId: 'q8' }]);
  });
  it('passes a non-empty answer', () => {
    expect(fails(input({}, { q7: 'Mahina ang wifi.' }))).toEqual([]);
  });
  it('skips an optional unanswered question', () => {
    const s: SurveyJson = {
      ...survey,
      questions: survey.questions.map((q) => (q.id === 'q8' ? { ...q, required: false } : q)),
    };
    const answers = { ...good };
    delete answers.q8;
    expect(fails({ ...input(), survey: s, answers })).toEqual([]);
    expect(fails({ ...input(), survey: s, answers: { ...good, q8: '' } })).toEqual([]);
  });
  it('skips allowShort questions', () => {
    expect(fails(input({}, { q9: '' }))).toEqual([]);
  });
});

describe('gibberish', () => {
  it.each([
    ['no letters', '12345 !!!'],
    ['one character repeated', 'aaaaa'],
    ['no vowel in 6+ letters', 'sdfghjkl'],
    ['3 or fewer distinct letters in 10+', 'asdasdasdasd'],
  ])('fails: %s', (_name, text) => {
    expect(fails(input({}, { q7: text }))).toEqual([{ check: 'gibberish', questionId: 'q7' }]);
  });
  it('passes a normal English answer', () => {
    expect(isGibberish(normalize('My internet keeps dropping during class.'))).toBe(false);
  });
  it('passes a Taglish answer', () => {
    const text = 'Nahihirapan ako mag-focus kasi ang ingay sa bahay, tapos laggy pa yung wifi.';
    expect(fails(input({}, { q7: text }))).toEqual([]);
  });
  it('passes short words under the thresholds', () => {
    expect(isGibberish('hmm')).toBe(false); // under 6 letters
    expect(isGibberish('aaaa')).toBe(false); // repeated fewer than 5 times
  });
  it('passes "none" on an allowShort question', () => {
    expect(fails(input({}, { q9: 'none' }))).toEqual([]);
    expect(fails(input({}, { q9: 'xxxxxx' }))).toEqual([]);
  });
});

describe('duplicate', () => {
  const long = 'Mabagal ang internet namin kaya laging nadi-disconnect sa class.';
  it('fails a 30+ char text seen before', () => {
    const i = input({ prior: { openTexts: { q7: [normalize(long)] }, durationsMs: [] } }, { q7: `  ${long.toUpperCase()} ` });
    expect(fails(i)).toEqual([{ check: 'duplicate', questionId: 'q7' }]);
  });
  it('passes a new text', () => {
    const i = input({ prior: { openTexts: { q7: ['some other earlier answer about the wifi'] }, durationsMs: [] } });
    expect(fails(i)).toEqual([]);
  });
  it('passes a short repeated text under 30 chars', () => {
    const i = input({ prior: { openTexts: { q7: ['mahina ang wifi.'] }, durationsMs: [] } }, { q7: 'Mahina ang wifi.' });
    expect(fails(i)).toEqual([]);
  });
  it('only compares within the same question', () => {
    const i = input({ prior: { openTexts: { q8: [normalize(long)] }, durationsMs: [] } });
    expect(fails(i)).toEqual([]);
  });
  it('skips allowShort questions', () => {
    const i = input({ prior: { openTexts: { q9: [normalize(long)] }, durationsMs: [] } }, { q9: long });
    expect(fails(i)).toEqual([]);
  });
});

describe('too_fast', () => {
  const n = survey.questions.length; // 9
  it('fails under 2000 ms per question with fewer than 10 priors', () => {
    expect(runChecks(input({ durationMs: 2000 * n - 1 })).weak).toEqual(['too_fast']);
  });
  it('passes at 2000 ms per question', () => {
    expect(runChecks(input({ durationMs: 2000 * n })).weak).toEqual([]);
  });
  it('switches to the median rule at 10 prior durations', () => {
    const nine = Array(9).fill(600_000);
    const ten = Array(10).fill(600_000);
    // 100 s: fine by the per-question rule, under half the median of 600 s.
    expect(runChecks(input({ durationMs: 100_000, prior: { openTexts: {}, durationsMs: nine } })).weak).toEqual([]);
    expect(runChecks(input({ durationMs: 100_000, prior: { openTexts: {}, durationsMs: ten } })).weak).toEqual(['too_fast']);
  });
  it('passes at half the median with 10+ priors', () => {
    const ten = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000].map((s) => s * 1000);
    // median = 550 s, half = 275 s
    expect(runChecks(input({ durationMs: 275_000, prior: { openTexts: {}, durationsMs: ten } })).weak).toEqual([]);
    expect(runChecks(input({ durationMs: 274_999, prior: { openTexts: {}, durationsMs: ten } })).weak).toEqual(['too_fast']);
  });
});

describe('straight_lining', () => {
  it('fails when 5 consecutive scale answers are equal', () => {
    expect(runChecks(input({}, { q1: 3, q2: 3, q3: 3, q4: 3, q5: 3 })).weak).toEqual(['straight_lining']);
  });
  it('passes when only 4 in a row are equal', () => {
    expect(runChecks(input({}, { q1: 3, q2: 3, q3: 3, q4: 3, q5: 4 })).weak).toEqual([]);
  });
  it('can report both weak signals', () => {
    expect(runChecks(input({ durationMs: 1000 }, { q1: 5, q2: 5, q3: 5, q4: 5, q5: 5 })).weak).toEqual([
      'too_fast',
      'straight_lining',
    ]);
  });
});

describe('edge cases', () => {
  it('gibberish thresholds sit exactly at the TDD numbers', () => {
    expect(isGibberish('hmmmm')).toBe(false); // 5 letters, no vowel: under 6
    expect(isGibberish('brrrrr')).toBe(true); // 6 letters, no vowel
    expect(isGibberish('hahahahah')).toBe(false); // 9 letters, 2 distinct: under 10
    expect(isGibberish('hahahahaha')).toBe(true); // 10 letters, 2 distinct
    expect(isGibberish('!!!!')).toBe(true); // no letters at all
  });
  it('counts accented vowels as vowels', () => {
    expect(isGibberish('brrrrá')).toBe(false);
  });
  it('a blank required answer is only empty, not also gibberish', () => {
    expect(fails(input({}, { q7: '\n\t ' }))).toEqual([{ check: 'empty', questionId: 'q7' }]);
  });
  it('reports each failing question in survey order', () => {
    expect(fails(input({}, { q7: '', q8: 'sdfghjkl' }))).toEqual([
      { check: 'empty', questionId: 'q7' },
      { check: 'gibberish', questionId: 'q8' },
    ]);
  });
  it('duplicate starts at exactly 30 normalized characters', () => {
    const t30 = 'abcde fghij klmno pqrst uvwxyz'; // 30 chars
    const t29 = t30.slice(0, 29);
    expect(t30).toHaveLength(30);
    const prior = (t: string) => ({ prior: { openTexts: { q7: [t] }, durationsMs: [] } });
    expect(fails(input(prior(t30), { q7: t30 }))).toEqual([{ check: 'duplicate', questionId: 'q7' }]);
    expect(fails(input(prior(t29), { q7: t29 }))).toEqual([]);
  });
  it('normalizes earlier texts before comparing', () => {
    const long = 'Mabagal ang internet namin kaya laging nadi-disconnect sa class.';
    const i = input({ prior: { openTexts: { q7: [`  ${long.toUpperCase()}  `] }, durationsMs: [] } }, { q7: long });
    expect(fails(i)).toEqual([{ check: 'duplicate', questionId: 'q7' }]);
  });
});

describe('straight_lining runs', () => {
  const scale = (id: string) => ({ id, type: 'scale' as const, text: id, required: false, min: 1, max: 5 });
  const mc = { id: 'm', type: 'multiple_choice' as const, text: 'm', required: false, options: ['a', 'b'] };
  const s: SurveyJson = {
    title: 't',
    description: '',
    questions: [scale('a'), scale('b'), mc, scale('c'), scale('d'), scale('e'), scale('f')],
  };
  const run = (answers: Answers) =>
    runChecks({ survey: s, answers, durationMs: 600_000, prior: { openTexts: {}, durationsMs: [] } }).weak;

  it('a non-scale question between scale questions does not break the run', () => {
    expect(run({ a: 2, b: 2, m: 'a', c: 2, d: 2, e: 2 })).toEqual(['straight_lining']);
  });
  it('an unanswered scale question breaks the run', () => {
    expect(run({ a: 2, b: 2, c: 2, e: 2, f: 2 })).toEqual([]);
  });
  it('is reported once however long the run is', () => {
    expect(run({ a: 1, b: 1, c: 1, d: 1, e: 1, f: 1 })).toEqual(['straight_lining']);
  });
});
