// FROZEN. Changes need all three devs to agree. Source: docs/TDD.md section 4.

export type Hex = `0x${string}`;
/** Decimal string of a wei amount. Money is never a float. */
export type WeiString = string;

// ---------- Survey ----------
interface BaseQuestion {
  id: string;          // unique in the survey, e.g. "q1"
  text: string;
  required: boolean;
}
export interface MultipleChoiceQuestion extends BaseQuestion {
  type: 'multiple_choice';
  options: string[];   // at least 2
}
export interface ScaleQuestion extends BaseQuestion {
  type: 'scale';
  min: number;         // integer
  max: number;         // integer, greater than min
}
export interface OpenEndedQuestion extends BaseQuestion {
  type: 'open_ended';
  allowShort: boolean; // true = short answers like "none" are fine (exempt setting)
}
export type Question = MultipleChoiceQuestion | ScaleQuestion | OpenEndedQuestion;

export interface SurveyJson {
  title: string;
  description: string; // may be ""
  questions: Question[]; // 1 to 30
}

/** Keyed by question id. multiple_choice: the option string. scale: integer. open_ended: string. */
export type Answers = Record<string, string | number>;

// ---------- Statuses ----------
export type SurveyStatus = 'open' | 'closed';
export type ResponseStatus = 'received' | 'processing' | 'paid' | 'blocked' | 'review';
export type DecisionResult = 'pay' | 'review' | 'dont_pay';
export type DecisionStatus = 'pending' | 'sent' | 'confirmed' | 'failed' | 'off_chain';

// ---------- Screening ----------
export type HardFailCheck = 'empty' | 'gibberish' | 'duplicate';
export type WeakSignal = 'too_fast' | 'straight_lining';
export interface Signals {
  hardFails: { check: HardFailCheck; questionId: string }[];
  weak: WeakSignal[];
}
export type AiLabel = 'valid' | 'unclear' | 'non_answer';
export type AiType = 'off_question' | 'evasive' | 'copied' | 'other';
export interface AiResult {
  label: AiLabel;
  type: AiType | null;   // null when label is 'valid'
  injection: boolean;
  reason: string;        // one short sentence
  agreed: boolean;       // false if the two runs disagreed or a run failed
}
export interface ScreenInput {
  survey: SurveyJson;
  answers: Answers;
  durationMs: number;    // submittedAt - startedAt
  prior: {
    /** Normalized open-ended texts already submitted in this survey, by question id. */
    openTexts: Record<string, string[]>;
    /** Durations of earlier responses in this survey. */
    durationsMs: number[];
  };
}
export interface ScreenOutput {
  result: DecisionResult;
  reasons: string[];     // plain sentences, code reasons first, AI reason last
  signals: Signals;
  ai: AiResult | null;   // null when the AI was not called
  llmModel: string | null;
  rubricVersion: string;
}

// ---------- Auth ----------
export type AuthAction = 'submit' | 'view_log' | 'list_surveys' | 'pause';
export interface AuthProof {
  wallet: string;        // 0x address
  signature: Hex;
  timestamp: number;     // ms since epoch, as signed
}

// ---------- Errors ----------
export const ERROR_CODES = [
  'INVALID_INPUT',
  'SURVEY_NOT_FOUND',
  'SURVEY_CLOSED',
  'SURVEY_PAUSED',
  'QUOTA_FULL',
  'WALLET_NOT_VERIFIED',
  'ALREADY_SUBMITTED',
  'NOT_YOUR_SURVEY',
  'TX_NOT_VERIFIED',
  'HASH_MISMATCH',
  'RESPONSE_NOT_FOUND',
  'INTERNAL',
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];
export interface ApiError { error: { code: ErrorCode; message: string } }
