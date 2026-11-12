/**
 * Domain types. These mirror the ResFunder proposal so the backend
 * (Drizzle tables, rule engine, Groq client) can adopt them unchanged.
 */

export type QuestionType =
  | "short_answer"
  | "paragraph"
  | "multiple_choice"
  | "checkboxes"
  | "linear_scale";

type QuestionBase = {
  id: string;
  title: string;
  description?: string;
  required: boolean;
};

export type OpenQuestion = QuestionBase & {
  type: "short_answer" | "paragraph";
  /** "Allow short or 'none' answers" — skips the AI non-answer check. */
  allowShort: boolean;
};

export type ChoiceQuestion = QuestionBase & {
  type: "multiple_choice" | "checkboxes";
  options: string[];
};

export type ScaleQuestion = QuestionBase & {
  type: "linear_scale";
  minLabel: string;
  maxLabel: string;
};

export type Question = OpenQuestion | ChoiceQuestion | ScaleQuestion;

export type SurveyStatus = "draft" | "live" | "paused" | "closed";

export type Survey = {
  id: string;
  title: string;
  description: string;
  researcher: string;
  institution: string;
  questions: Question[];
  status: SurveyStatus;
  /** Pay per valid response, in centavos (₱10 = 1000). */
  rateCentavos: number;
  quota: number;
  /** ISO string */
  deadline: string;
  estimatedMinutes: number;
  createdAt: string;
  funding?: {
    surveyHash: `0x${string}`;
    approveTx: `0x${string}`;
    createTx: `0x${string}`;
    fundedAt: string;
    researcherWallet: `0x${string}`;
    simulated: boolean;
  };
  closing?: {
    refundCentavos: number;
    refundTx: `0x${string}`;
    closedAt: string;
    simulated: boolean;
  };
};

/** Answer value per question id. */
export type AnswerValue = string | string[] | number | null;
export type Answers = Record<string, AnswerValue>;

/** Exactly the structure the LLM must return (validated with zod server-side). */
export type LlmLabel = {
  label: "valid" | "unclear" | "non_answer";
  non_answer_type: "empty" | "gibberish" | "copied" | "off_question" | null;
  injection_suspected: boolean;
  reason: string;
};

export type SignalCode =
  | "empty_answer"
  | "gibberish"
  | "duplicate_text"
  | "straight_line"
  | "too_fast"
  | "llm_non_answer"
  | "llm_unclear"
  | "llm_disagree"
  | "injection_flag"
  | "llm_unavailable";

export type SignalStrength = "hard" | "weak" | "escalate";

export type Signal = {
  code: SignalCode;
  strength: SignalStrength;
  questionId?: string;
};

export type Outcome = "pay" | "review" | "dont_pay";

export type DecidedBy = "rule_engine" | "researcher" | "timeout" | "appeal";

export type Decision = {
  outcome: Outcome;
  signals: Signal[];
  /** One label pair per screened open-ended question. */
  labels: { questionId: string; runs: [LlmLabel, LlmLabel] }[];
  rubricVersion: string;
  modelVersion: string;
  decidedBy: DecidedBy;
  decidedAt: string;
  /** Researcher's note when they decide a Review case or reject. */
  note?: string;
  payoutTx?: `0x${string}`;
  simulated?: boolean;
};

export type Appeal = {
  message: string;
  submittedAt: string;
  status: "pending" | "upheld" | "overturned";
  resolvedAt?: string;
};

export type ResponseRecord = {
  id: string;
  surveyId: string;
  /** keccak256 of the verified school email — only this goes on-chain. */
  respondentHash: `0x${string}`;
  wallet: `0x${string}`;
  answers: Answers;
  startedAt: string;
  submittedAt: string;
  /** Decision history; the last entry is current. */
  decisions: Decision[];
  appeal?: Appeal;
  /** Review cases pay automatically after this time if unresolved. */
  reviewDeadline?: string;
};

export type Session = {
  email: string;
  role: "researcher" | "respondent";
};
