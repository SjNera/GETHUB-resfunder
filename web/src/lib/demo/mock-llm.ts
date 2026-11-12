/**
 * DEMO STAND-IN for the Groq call. The real backend sends each open-ended
 * answer (delimited as data) to a Groq-hosted model twice at temperature 0
 * and validates the JSON with zod. This mock returns the same structure from
 * simple heuristics so the demo can run with no server.
 */
import { isEmptyAnswer, isGibberish, isNullToken, normalizeText } from "../rules/checks";
import type { LlmLabel } from "../types";

export const MOCK_MODEL_VERSION = "mock-llm-0 (demo stand-in for Groq)";

const INJECTION =
  /(ignore|disregard|forget)\s+(all\s+|any\s+|the\s+)?(previous|prior|above|earlier)\s+(instructions|rules|prompts?)|mark\s+(this|me|it|my answer)\s+(as\s+)?valid|system\s+prompt|you\s+are\s+now|label\s+(this|it)\s+(as\s+)?valid|pay\s+(me|this response)/i;

export function mockLabel(text: string): LlmLabel {
  const injection = INJECTION.test(text);
  if (injection) {
    return {
      label: "non_answer",
      non_answer_type: "off_question",
      injection_suspected: true,
      reason: "The answer contains instructions to the screener instead of an answer.",
    };
  }
  if (isEmptyAnswer(text)) {
    return { label: "non_answer", non_answer_type: "empty", injection_suspected: false, reason: "No answer was given." };
  }
  if (isNullToken(text)) {
    return {
      label: "non_answer",
      non_answer_type: "empty",
      injection_suspected: false,
      reason: "A placeholder like “ok” or “none” doesn't answer the question.",
    };
  }
  if (isGibberish(text)) {
    return {
      label: "non_answer",
      non_answer_type: "gibberish",
      injection_suspected: false,
      reason: "The text looks like random keys rather than words.",
    };
  }
  const words = normalizeText(text).split(" ").filter(Boolean).length;
  if (words <= 2) {
    return {
      label: "unclear",
      non_answer_type: null,
      injection_suspected: false,
      reason: "Very short; it may or may not answer the question.",
    };
  }
  return {
    label: "valid",
    non_answer_type: null,
    injection_suspected: false,
    reason: "Answers the question. Brevity and Taglish are fine.",
  };
}

/** Two runs, as the real pipeline does. The mock is deterministic so both agree. */
export function mockLabelTwice(text: string): [LlmLabel, LlmLabel] {
  return [mockLabel(text), mockLabel(text)];
}
