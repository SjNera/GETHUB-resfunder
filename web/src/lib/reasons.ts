import type { DecidedBy, Outcome, SignalCode } from "./types";

type ReasonText = {
  /** Plain words shown to the respondent. */
  respondent: string;
  /** Short label for researchers and advisers. */
  label: string;
};

export const SIGNAL_TEXT: Record<SignalCode, ReasonText> = {
  empty_answer: {
    label: "Empty answer (code-confirmed)",
    respondent: "A required question was left empty or answered with a placeholder like “ok” or “none”.",
  },
  gibberish: {
    label: "Keyboard-mash text (code-confirmed)",
    respondent: "One answer looked like random keys rather than words.",
  },
  duplicate_text: {
    label: "Duplicate of another response",
    respondent: "One answer matched another response word for word.",
  },
  straight_line: {
    label: "Same option across a scale block (weak)",
    respondent: "The same option was picked for every item in a block of rating questions.",
  },
  too_fast: {
    label: "Faster than the questions can be read (weak)",
    respondent: "The survey was finished faster than the questions can be read.",
  },
  llm_non_answer: {
    label: "AI label: non-answer (escalates only)",
    respondent: "The screening model thought an answer might not respond to the question.",
  },
  llm_unclear: {
    label: "AI label: unclear (escalates only)",
    respondent: "The screening model couldn't tell whether an answer responds to the question.",
  },
  llm_disagree: {
    label: "The two AI runs disagreed",
    respondent: "The two screening runs disagreed, so a person will check.",
  },
  injection_flag: {
    label: "Instruction-like text flagged",
    respondent: "An answer contained instructions to the screener, so a person will check.",
  },
  llm_unavailable: {
    label: "AI check failed or timed out",
    respondent: "The automatic check didn't finish, so a person will check instead.",
  },
};

export const OUTCOME_TEXT: Record<Outcome, { label: string; headline: string }> = {
  pay: { label: "Pay", headline: "Paid" },
  review: { label: "Review", headline: "In review" },
  dont_pay: { label: "Don't pay", headline: "Not paid" },
};

export const DECIDED_BY_TEXT: Record<DecidedBy, string> = {
  rule_engine: "Rule engine",
  researcher: "Researcher",
  timeout: "24 h timeout",
  appeal: "Appeal",
};
