/**
 * The screening pipeline (code checks → AI label → rule engine), exactly as
 * the build notes define it. Pure functions: the Groq calls happen elsewhere
 * and arrive here as `LlmRuns` per open-ended question.
 *
 * Rules that never change:
 * - The AI alone can only push a response to Review.
 * - Don't pay needs a code-confirmed failure.
 * - If the AI fails, the response goes to Review, not to payment.
 */
import type { AiResult, Answers, CodeSignals, Decision, LlmLabel, LlmRuns, Outcome, Question } from "../types";
import { isDuplicate, isEmptyAnswer, isGibberish, isStraightLine, isTooFast } from "./checks";
import { aiReasonText, CODE_TEXT } from "../reasons";

export const RUBRIC_VERSION = "rubric-v2";

type OpenQ = Extract<Question, { type: "short_answer" | "paragraph" }>;

export const openQuestions = (questions: Question[]) =>
  questions.filter((q): q is OpenQ => q.type === "short_answer" || q.type === "paragraph");

const textOf = (answers: Answers, id: string) => (typeof answers[id] === "string" ? (answers[id] as string) : "");

/** Part A: code checks. No network. */
export function codeChecks(input: {
  questions: Question[];
  answers: Answers;
  /** Open-ended answers from other responses in this survey, keyed by question id. */
  otherAnswers: Record<string, string[]>;
  startedAt: string;
  submittedAt: string;
  /** Total seconds of earlier responses in this survey. */
  priorDurations: number[];
}): CodeSignals {
  const signals: CodeSignals = { hardFails: [], weak: [] };
  for (const q of openQuestions(input.questions)) {
    const text = textOf(input.answers, q.id);
    if (!q.required && isEmptyAnswer(text)) continue;
    // 1–2 are skipped where the researcher allows short answers ("none", "wala po").
    if (!q.allowShort && isEmptyAnswer(text)) {
      signals.hardFails.push({ code: "empty_answer", questionId: q.id });
      continue;
    }
    if (!q.allowShort && isGibberish(text)) {
      signals.hardFails.push({ code: "gibberish", questionId: q.id });
      continue;
    }
    if (isDuplicate(text, input.otherAnswers[q.id] ?? [])) {
      signals.hardFails.push({ code: "duplicate_text", questionId: q.id });
    }
  }
  if (isTooFast(input.questions.length, input.startedAt, input.submittedAt, input.priorDurations)) signals.weak.push("too_fast");
  if (isStraightLine(input.questions, input.answers)) signals.weak.push("straight_line");
  return signals;
}

/** Which open-ended answers go to Groq: every answered one that isn't already a hard fail. */
export function questionsToLabel(questions: Question[], answers: Answers, signals: CodeSignals): string[] {
  const failed = new Set(signals.hardFails.map((f) => f.questionId));
  return openQuestions(questions)
    .filter((q) => !failed.has(q.id) && !isEmptyAnswer(textOf(answers, q.id)))
    .map((q) => q.id);
}

const SEVERITY: Record<LlmLabel["label"], number> = { valid: 0, unclear: 1, non_answer: 2 };

/** Part B, steps 9–10: combine the two runs per answer, then the worst label wins. */
export function combineRuns(runsByQuestion: Record<string, LlmRuns>): AiResult | null {
  const perAnswer: AiResult[] = Object.values(runsByQuestion).map(([a, b]) => {
    if (!a || !b) {
      const ok = a ?? b;
      return { label: "unclear", type: ok?.type ?? null, injection: !!ok?.injection, reason: "The AI check failed or timed out.", agreed: false };
    }
    if (a.label !== b.label) {
      return { label: "unclear", type: a.type ?? b.type, injection: a.injection || b.injection, reason: "The two AI runs disagreed.", agreed: false };
    }
    return { label: a.label, type: a.type, injection: a.injection || b.injection, reason: a.reason, agreed: true };
  });
  if (perAnswer.length === 0) return null;
  const worst = perAnswer.reduce((w, r) => (SEVERITY[r.label] > SEVERITY[w.label] ? r : w));
  return {
    ...worst,
    injection: perAnswer.some((r) => r.injection),
    agreed: perAnswer.every((r) => r.agreed),
  };
}

/** Part C: the rule engine. */
export function decideOutcome(signals: CodeSignals, ai: AiResult | null): Outcome {
  if (signals.hardFails.length > 0) return "dont_pay";
  if (signals.weak.length >= 2) return "review";
  if (ai && (ai.injection || ai.label !== "valid" || !ai.agreed)) return "review";
  return "pay";
}

export function screen(input: Parameters<typeof codeChecks>[0] & { runs: Record<string, LlmRuns>; llmModel: string }): Decision {
  const signals = codeChecks(input);
  const toLabel = new Set(questionsToLabel(input.questions, input.answers, signals));
  const runs = Object.fromEntries(
    [...toLabel].map((id) => [id, input.runs[id] ?? ([null, null] as LlmRuns)]),
  );
  const ai = combineRuns(runs);
  const result = decideOutcome(signals, ai);
  const reasons = [
    ...signals.hardFails.map((f) => CODE_TEXT[f.code]),
    ...signals.weak.map((w) => CODE_TEXT[w]),
    ...(ai ? [aiReasonText(ai)] : []),
  ].join(" ");
  return { result, reasons, signals, ai, llmModel: input.llmModel, rubricVersion: RUBRIC_VERSION };
}
