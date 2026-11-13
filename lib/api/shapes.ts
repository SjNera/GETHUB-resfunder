// Lane C. Response shapes of the API routes. Source: docs/TDD.md section 7.
// Types only, so the UI can import them.
import type { Answers, DecisionResult, DecisionStatus, Hex, ResponseStatus, SurveyJson, SurveyStatus, WeiString } from '../types';

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
  /** The respondent's appeal, if any. */
  appeal: 'open' | 'paid' | 'kept' | null;
  /** True after a rejection by the researcher that has not been appealed yet. */
  canAppeal: boolean;
}

/** An appeal on one of a researcher's surveys (GET /api/surveys/[id]/appeals). */
export interface AppealItem {
  responseId: string;
  text: string;
  status: 'open' | 'paid' | 'kept';
  createdAt: string;
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
