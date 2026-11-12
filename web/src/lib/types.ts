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
  /** Pay per valid response in wei (tBNB, 18 decimals), as a decimal string. */
  rateUnits: string;
  quota: number;
  /** ISO string */
  deadline: string;
  estimatedMinutes: number;
  createdAt: string;
  /** Email of whoever funded it (no roles: any signed-in user can publish). */
  owner?: string;
  funding?: {
    surveyHash: `0x${string}`;
    /** rate × quota + quota × fee per response, in wei. */
    depositUnits: string;
    createTx: `0x${string}`;
    fundedAt: string;
    researcherWallet: `0x${string}`;
    simulated: boolean;
  };
  closing?: {
    refundUnits: string;
    refundTx: `0x${string}`;
    closedAt: string;
    simulated: boolean;
  };
};

/** Answer value per question id. */
export type AnswerValue = string | string[] | number | null;
export type Answers = Record<string, AnswerValue>;

/** Exactly the structure each Groq reply must match (validated with zod; a mismatch counts as a failed call). */
export type LlmLabel = {
  label: "valid" | "unclear" | "non_answer";
  /** Only when the label is unclear or non_answer; null when valid. */
  type: "off_question" | "evasive" | "copied" | "other" | null;
  /** True if the answer holds instructions aimed at the AI instead of an answer. */
  injection: boolean;
  /** One short plain sentence. */
  reason: string;
};

/** Two runs per open-ended answer; null for a run that failed, timed out or didn't match the structure. */
export type LlmRuns = [LlmLabel | null, LlmLabel | null];

/** The two runs combined across all open-ended answers (worst label wins). */
export type AiResult = {
  label: LlmLabel["label"];
  type: LlmLabel["type"];
  injection: boolean;
  reason: string;
  /** False when the runs disagreed or any call failed. */
  agreed: boolean;
};

export type HardFail = "empty_answer" | "gibberish" | "duplicate_text";
export type WeakSignal = "too_fast" | "straight_line";

export type CodeSignals = {
  hardFails: { code: HardFail; questionId: string }[];
  weak: WeakSignal[];
};

export type Outcome = "pay" | "review" | "dont_pay";

export type Decision = {
  result: Outcome;
  /** Code reasons plus the AI's one-sentence reason, in plain words. */
  reasons: string;
  signals: CodeSignals;
  ai: AiResult | null;
  llmModel: string;
  rubricVersion: string;
};

/** Payment status of a decision (Pay and Don't pay go on-chain; Review never does). */
export type DecisionStatus = "pending" | "sent" | "confirmed" | "failed";

export type ResponseStatus = "received" | "screened" | "paid" | "blocked" | "review";
