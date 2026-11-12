/**
 * The rule engine: combines code checks and the two LLM runs into
 * Pay / Review / Don't pay, exactly as the proposal's decision table says.
 * Only this module decides; the LLM label is one input and can only escalate.
 */
import type { Answers, Decision, LlmLabel, Outcome, Question, Signal } from "../types";
import { isDuplicate, isEmptyAnswer, isGibberish, isNullToken, isStraightLine, isTooFast } from "./checks";

export const RUBRIC_VERSION = "rubric-v1";

export type ScreenInput = {
  questions: Question[];
  answers: Answers;
  startedAt: string;
  submittedAt: string;
  /** Open-ended answers from earlier responses, keyed by question id. */
  otherAnswers: Record<string, string[]>;
  /** Two LLM runs per screened question, or null if the LLM failed/timed out. */
  labels: Record<string, [LlmLabel, LlmLabel] | null>;
  modelVersion: string;
};

/** Open-ended questions that go through the non-answer check. */
export function screenedQuestions(questions: Question[]) {
  return questions.filter(
    (q): q is Extract<Question, { type: "short_answer" | "paragraph" }> =>
      (q.type === "short_answer" || q.type === "paragraph") && !q.allowShort,
  );
}

export function collectSignals(input: ScreenInput): Signal[] {
  const signals: Signal[] = [];
  const { questions, answers } = input;

  for (const q of questions) {
    if (q.type !== "short_answer" && q.type !== "paragraph") continue;
    const text = typeof answers[q.id] === "string" ? (answers[q.id] as string) : "";

    // Copying is checked on every open answer, exempt or not.
    if (text && isDuplicate(text, input.otherAnswers[q.id] ?? [])) {
      signals.push({ code: "duplicate_text", strength: "hard", questionId: q.id });
    }
    if (q.allowShort) continue;
    if (!q.required && isEmptyAnswer(text)) continue;

    const runs = input.labels[q.id];
    if (runs === null || runs === undefined) {
      if (!isEmptyAnswer(text)) signals.push({ code: "llm_unavailable", strength: "escalate", questionId: q.id });
    }
    const bothNonAnswer = !!runs && runs.every((r) => r.label === "non_answer");

    // Code-confirmed non-answers are hard failures.
    if (isEmptyAnswer(text) || (bothNonAnswer && isNullToken(text))) {
      signals.push({ code: "empty_answer", strength: "hard", questionId: q.id });
      continue;
    }
    if (isGibberish(text)) {
      signals.push({ code: "gibberish", strength: "hard", questionId: q.id });
      continue;
    }

    if (!runs) continue;
    if (runs.some((r) => r.injection_suspected)) {
      signals.push({ code: "injection_flag", strength: "escalate", questionId: q.id });
    }
    if (runs[0].label !== runs[1].label) {
      signals.push({ code: "llm_disagree", strength: "escalate", questionId: q.id });
    } else if (runs[0].label === "non_answer") {
      signals.push({ code: "llm_non_answer", strength: "escalate", questionId: q.id });
    } else if (runs[0].label === "unclear") {
      signals.push({ code: "llm_unclear", strength: "escalate", questionId: q.id });
    }
  }

  if (isStraightLine(questions, answers)) signals.push({ code: "straight_line", strength: "weak" });
  if (isTooFast(questions, input.startedAt, input.submittedAt)) signals.push({ code: "too_fast", strength: "weak" });

  return signals;
}

export function outcomeFor(signals: Signal[]): Outcome {
  if (signals.some((s) => s.strength === "hard")) return "dont_pay";
  if (signals.some((s) => s.strength === "escalate")) return "review";
  if (signals.filter((s) => s.strength === "weak").length >= 2) return "review";
  return "pay";
}

export function screen(input: ScreenInput, now = new Date().toISOString()): Decision {
  const signals = collectSignals(input);
  return {
    outcome: outcomeFor(signals),
    signals,
    labels: Object.entries(input.labels)
      .filter((entry): entry is [string, [LlmLabel, LlmLabel]] => entry[1] !== null)
      .map(([questionId, runs]) => ({ questionId, runs })),
    rubricVersion: RUBRIC_VERSION,
    modelVersion: input.modelVersion,
    decidedBy: "rule_engine",
    decidedAt: now,
  };
}
