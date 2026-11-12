/**
 * DEMO STAND-IN for the Groq call. The real server sends each open-ended
 * answer (wrapped in markers as data) to Groq twice at temperature 0 and
 * validates each reply with zod. This mock returns the same structure from
 * simple heuristics so tests run with no network.
 */
import { normalizeText } from "../rules/checks";
import type { LlmLabel, LlmRuns } from "../types";

export const MOCK_MODEL_VERSION = "mock-llm-0 (stand-in for Groq)";

const INJECTION =
  /(ignore|disregard|forget)\s+(all\s+|any\s+|the\s+|your\s+)?(previous|prior|above|earlier)?\s*(instructions|rules|prompts?)|mark\s+(this|me|it|my answer)\s+(as\s+)?valid|system\s+prompt|you\s+are\s+now|admin\s+mode/i;
const EVASIVE = new Set(["ok", "okay", "idk", "whatever", "none", "n a", "na", "nothing", "wala", "k", "no comment"]);

export function mockLabel(text: string): LlmLabel {
  if (INJECTION.test(text)) {
    return { label: "non_answer", type: "other", injection: true, reason: "The answer gives instructions to the AI instead of answering." };
  }
  const norm = normalizeText(text);
  if (EVASIVE.has(norm) || /^idk\b/.test(norm)) {
    return { label: "non_answer", type: "evasive", injection: false, reason: "Filler rather than an answer to the question." };
  }
  if (norm.split(" ").filter(Boolean).length <= 1) {
    return { label: "unclear", type: "other", injection: false, reason: "A single word; it may or may not answer the question." };
  }
  return { label: "valid", type: null, injection: false, reason: "A real attempt to answer. Brevity and Taglish are fine." };
}

/** Two runs, as the real pipeline does. Deterministic, so both agree. */
export function mockRuns(text: string): LlmRuns {
  return [mockLabel(text), mockLabel(text)];
}
