import type { AiResult, HardFail, Outcome, WeakSignal } from "./types";

/** Plain-words reasons for the decision log. */
export const CODE_TEXT: Record<HardFail | WeakSignal, string> = {
  empty_answer: "A required answer was empty.",
  gibberish: "An answer was keyboard mash, not words.",
  duplicate_text: "An answer copied another response word for word.",
  too_fast: "Finished in under half the usual time (weak signal).",
  straight_line: "Same option on 5 or more scale questions in a row (weak signal).",
};

const AI_TYPE_TEXT = {
  off_question: "fluent but not about the question",
  evasive: "filler rather than an answer",
  copied: "text lifted from elsewhere",
  other: "not a real attempt",
} as const;

export function aiReasonText(ai: AiResult): string {
  const flags = ai.injection ? ["Instructions aimed at the AI were flagged."] : [];
  const type = ai.type && ai.label !== "valid" ? ` (${AI_TYPE_TEXT[ai.type]})` : "";
  return [`AI: ${ai.label.replace("_", "-")}${type}. ${ai.reason}`, ...flags].join(" ");
}

export const OUTCOME_TEXT: Record<Outcome, { label: string; headline: string }> = {
  pay: { label: "Pay", headline: "Paid" },
  review: { label: "Review", headline: "In review" },
  dont_pay: { label: "Don't pay", headline: "Blocked" },
};
