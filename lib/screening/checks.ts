// Code checks (TDD 10.1, 10.2). Pure, no network.
import type { HardFailCheck, ScreenInput, Signals, WeakSignal } from '../types';

/** Trim, lowercase, collapse runs of whitespace to one space. */
export function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

const LETTER = /\p{L}/u;
const VOWELS = new Set(['a', 'e', 'i', 'o', 'u']);

/** Gibberish rules from TDD 10.2. Expects normalized, non-empty text. */
export function isGibberish(text: string): boolean {
  const chars = Array.from(text);
  const letters = chars.filter((c) => LETTER.test(c));
  if (letters.length === 0) return true;
  if (chars.length >= 5 && chars.every((c) => c === chars[0])) return true;
  // Strip accents so "á" counts as a vowel.
  const base = letters.map((c) => c.normalize('NFD').replace(/\p{M}/gu, ''));
  if (letters.length >= 6 && !base.some((c) => VOWELS.has(c))) return true;
  if (letters.length >= 10 && new Set(letters).size <= 3) return true;
  return false;
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
}

export function runChecks(input: ScreenInput): Signals {
  const { survey, answers, durationMs, prior } = input;
  const hardFails: { check: HardFailCheck; questionId: string }[] = [];

  for (const q of survey.questions) {
    if (q.type !== 'open_ended' || q.allowShort) continue;
    const raw = answers[q.id];
    const text = raw === undefined ? '' : normalize(String(raw));

    if (text.length === 0) {
      // An optional question left blank is not a fail.
      if (q.required) hardFails.push({ check: 'empty', questionId: q.id });
      continue;
    }
    if (isGibberish(text)) hardFails.push({ check: 'gibberish', questionId: q.id });
    if (text.length >= 30) {
      const seen = prior.openTexts[q.id] ?? [];
      if (seen.some((t) => normalize(t) === text)) {
        hardFails.push({ check: 'duplicate', questionId: q.id });
      }
    }
  }

  const weak: WeakSignal[] = [];

  const tooFast =
    prior.durationsMs.length >= 10
      ? durationMs < 0.5 * median(prior.durationsMs)
      : durationMs < 2000 * survey.questions.length;
  if (tooFast) weak.push('too_fast');

  // Run of equal answers across scale questions in survey order. A missing answer breaks the run.
  let run = 0;
  let last: string | number | undefined;
  let straight = false;
  for (const q of survey.questions) {
    if (q.type !== 'scale') continue;
    const a = answers[q.id];
    if (a === undefined) {
      run = 0;
      last = undefined;
      continue;
    }
    run = a === last ? run + 1 : 1;
    last = a;
    if (run >= 5) straight = true;
  }
  if (straight) weak.push('straight_lining');

  return { hardFails, weak };
}
