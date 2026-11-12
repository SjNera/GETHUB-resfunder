/**
 * Deterministic code checks from the proposal. Pure functions, no I/O, so
 * the backend rule engine can import this module unchanged.
 */
import type { Answers, Question, ScaleQuestion } from "../types";

/** Short answers that are non-answers only when the question doesn't allow them. */
const NULL_TOKENS = new Set([
  "ok",
  "okay",
  "oks",
  "none",
  "n/a",
  "na",
  "nothing",
  "wala",
  "wla",
  "idk",
  "no comment",
  "no",
  "yes",
  "k",
  "-",
  ".",
]);

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}\s/]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** No letters or digits at all ("", "...", "???"). */
export function isEmptyAnswer(text: string | null | undefined): boolean {
  return !text || !/[\p{L}\p{N}]/u.test(text);
}

export function isNullToken(text: string): boolean {
  return NULL_TOKENS.has(normalizeText(text));
}

const KEYBOARD_RUNS = ["qwert", "werty", "asdf", "sdfg", "dfgh", "fghj", "ghjk", "hjkl", "zxcv", "xcvb", "cvbn", "vbnm", "qwer", "uiop", "jkl"];

function isMashToken(token: string): boolean {
  if (token.length < 4) return false;
  if (/(.)\1{3,}/.test(token)) return true; // "aaaa", "jjjjj"
  if (KEYBOARD_RUNS.some((run) => token.includes(run))) return true;
  // 6+ letters with no vowel (Filipino and English words almost always have one)
  if (token.length >= 6 && !/[aeiouy]/.test(token)) return true;
  return false;
}

/**
 * Keyboard-mash gibberish. Conservative on purpose: Taglish, slang and short
 * answers must never trip this.
 */
export function isGibberish(text: string): boolean {
  const tokens = normalizeText(text).split(" ").filter(Boolean);
  if (tokens.length === 0) return false;
  const letters = tokens.reduce((n, t) => n + t.length, 0);
  const mashed = tokens.filter(isMashToken).reduce((n, t) => n + t.length, 0);
  return letters > 0 && mashed / letters > 0.5;
}

/** Duplicate text across responses — only for answers long enough to be meaningful. */
export const DUPLICATE_MIN_CHARS = 20;

export function isDuplicate(text: string, others: string[]): boolean {
  const mine = normalizeText(text);
  if (mine.length < DUPLICATE_MIN_CHARS) return false;
  return others.some((o) => normalizeText(o) === mine);
}

/** Same option across a block of five or more consecutive scale items. */
export const STRAIGHT_LINE_BLOCK = 5;

export function isStraightLine(questions: Question[], answers: Answers): boolean {
  let run: ScaleQuestion[] = [];
  const blocks: ScaleQuestion[][] = [];
  for (const q of questions) {
    if (q.type === "linear_scale") run.push(q);
    else {
      if (run.length) blocks.push(run);
      run = [];
    }
  }
  if (run.length) blocks.push(run);

  return blocks.some((block) => {
    if (block.length < STRAIGHT_LINE_BLOCK) return false;
    const values = block.map((q) => answers[q.id]);
    return values.every((v) => typeof v === "number") && new Set(values).size === 1;
  });
}

/** Finishing far faster than the questions can be read. */
export function minimumSeconds(questions: Question[]): number {
  const words = questions.reduce((n, q) => {
    const opts = q.type === "multiple_choice" || q.type === "checkboxes" ? q.options.join(" ") : "";
    return n + `${q.title} ${q.description ?? ""} ${opts}`.split(/\s+/).filter(Boolean).length;
  }, 0);
  // ~5 words/second skim reading, plus 2s per question to answer.
  return Math.round(words / 5 + questions.length * 2);
}

export function isTooFast(questions: Question[], startedAt: string, submittedAt: string): boolean {
  const seconds = (new Date(submittedAt).getTime() - new Date(startedAt).getTime()) / 1000;
  return seconds < minimumSeconds(questions);
}
