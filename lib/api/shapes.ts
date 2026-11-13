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
