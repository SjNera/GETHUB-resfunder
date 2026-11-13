// Lane C. Response shapes of the API routes. Source: docs/TDD.md section 7.
// Types only, so the UI can import them.
import type { AiLabel, AiType, Answers, DecisionResult, DecisionStatus, HardFailCheck, Hex, ResponseStatus, SurveyJson, SurveyStatus, WeakSignal, WeiString } from '../types';

export interface RegisterResult {
  surveyId: number;
  sharePath: string;
}

export interface SurveySummary {
  surveyId: number;
  title: string;
  status: SurveyStatus;
  paused: boolean;
  rateWei: WeiString;
  quota: number;
  deadline: number;
  paidCount: number;
  createdAt: string;
}

/** One row of the public list of surveys that accept answers (GET /api/surveys/open). */
export interface OpenSurvey {
  surveyId: number;
  title: string;
  description: string;
  questionCount: number;
  rateWei: WeiString;
  quota: number;
  deadline: number;
  slotsLeft: number;
  /** Lowercase wallet of the researcher. It is public on chain too. */
  researcher: string;
  createdAt: string;
}

/** One of the signed-in wallet's own responses (GET /api/me/responses). */
export interface HistoryItem {
  responseId: string;
  surveyId: number;
  surveyTitle: string;
  rateWei: WeiString;
  submittedAt: string;
  status: ResponseStatus;
  result: DecisionResult | null;
  reasons: string[];
  txHash: Hex | null;
  explorerUrl: string | null;
}

export interface SurveyDetails {
  surveyId: number;
  survey: SurveyJson;
  rateWei: WeiString;
  quota: number;
  deadline: number;
  status: SurveyStatus;
  paused: boolean;
  slotsLeft: number;
}

export interface SubmitResult {
  responseId: string;
}

export interface ResponseResult {
  responseId: string;
  status: ResponseStatus;
  result: DecisionResult | null;
  reasons: string[];
  txHash: Hex | null;
  explorerUrl: string | null;
}

export interface LogRow {
  responseId: string;
  submittedAt: string;
  wallet: string;
  email: string;
  answers: Answers;
  status: ResponseStatus;
  result: DecisionResult | null;
  reasons: string[];
  decisionStatus: DecisionStatus | null;
  txHash: Hex | null;
  explorerUrl: string | null;
  llmModel: string | null;
  rubricVersion: string | null;
}

export interface LogResponse {
  survey: SurveySummary & { refundedWei: WeiString | null; closeTxHash: Hex | null };
  summary: {
    responses: number;
    paid: number;
    blocked: number;
    review: number;
    pending: number;
    budgetWei: WeiString;
    paidWei: WeiString;
    remainingWei: WeiString;
  };
  rows: LogRow[];
}

export interface ClosedResult {
  surveyId: number;
  status: 'closed';
  refundedWei: WeiString;
  closeTxHash: Hex;
}

export function explorerUrl(txHash: Hex | null): string | null {
  return txHash ? `https://testnet.bscscan.com/tx/${txHash}` : null;
}

// ---------- Screening details (added; not one of the TDD 7 routes) ----------

/** What one AI run answered. Null: the call failed, timed out or the reply was not usable. */
export type ScreeningRun = { label: AiLabel; type: AiType | null; injection: boolean; reason: string } | null;

/** An open-ended answer the AI did not clear. */
export interface ScreeningFlag {
  questionId: string;
  label: AiLabel;
  type: AiType | null;
  injection: boolean;
  agreed: boolean;
  reason: string;
  /** Run 1 and run 2. Null for decisions screened before runs were saved. */
  runs: ScreeningRun[] | null;
}

/** How one response was screened. Shown in the researcher's review drawer. */
export interface ScreeningRow {
  responseId: string;
  /** Time from opening the survey to submitting it. */
  durationMs: number;
  /** Faster than this counted as "too fast" when it was screened. */
  fastLineMs: number;
  /** False while the response is still waiting for screening. */
  screened: boolean;
  hardFails: { check: HardFailCheck; questionId: string }[];
  weak: WeakSignal[];
  /** Null when the AI was not run (a hard fail, or no written answers). */
  ai: { label: AiLabel; type: AiType | null; injection: boolean; agreed: boolean; reason: string; flagged: ScreeningFlag[] | null } | null;
}

export interface ScreeningResponse {
  rows: ScreeningRow[];
}
