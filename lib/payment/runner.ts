// Lane C. Screening and payment for one response. Source: docs/TDD.md sections 11.3 and 11.4.
// Server only. The decision row is saved before any transaction is sent, and the tx hash is saved
// before waiting for the receipt.
import { ApiFailure } from '../api/errors';
import { explorerUrl, type ResponseResult } from '../api/shapes';
import { reasonHash } from '../canonical';
import { getReceiptStatus, sendDecision, waitForReceipt, type ReceiptStatus } from '../chain/escrow';
import {
  claimResponse,
  confirmDecision,
  failDecision,
  getDecision,
  getResponse,
  getSurvey,
  insertDecision,
  listPriorResponses,
  listSentDecisions,
  markDecisionSent,
  type DecisionRow,
  type PriorResponse,
} from '../db/queries';
import { screen } from '../screening';
import type { Hex, ScreenInput, ScreenOutput, SurveyJson } from '../types';

const RECEIPT_TIMEOUT_MS = 30_000;
const MAX_ERROR_CHARS = 300;

/** TDD 10.1: trim, lowercase, collapse runs of whitespace to one space. */
function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

function buildPrior(survey: SurveyJson, prior: PriorResponse[]): ScreenInput['prior'] {
  const openTexts: Record<string, string[]> = {};
  for (const q of survey.questions) {
    if (q.type !== 'open_ended') continue;
    const texts: string[] = [];
    for (const p of prior) {
      const a = p.answers[q.id];
      if (typeof a !== 'string') continue;
      const text = normalize(a);
      if (text.length > 0) texts.push(text);
    }
    openTexts[q.id] = texts;
  }
  return { openTexts, durationsMs: prior.map((p) => p.durationMs) };
}

function errorText(err: unknown): string {
  const short = (err as { shortMessage?: unknown } | null)?.shortMessage;
  const text = typeof short === 'string' ? short : err instanceof Error ? err.message : String(err);
  return text.slice(0, MAX_ERROR_CHARS);
}

/** Step 8: success confirms, reverted fails to review, pending changes nothing. */
async function applyReceipt(decision: Pick<DecisionRow, 'id' | 'result'>, receipt: ReceiptStatus): Promise<void> {
  if (receipt.state === 'success') {
    await confirmDecision(decision.id, decision.result === 'pay' ? 'paid' : 'blocked');
  } else if (receipt.state === 'reverted') {
    await failDecision(decision.id, receipt.error.slice(0, MAX_ERROR_CHARS));
  }
}

/** Checks the receipt of a 'sent' decision once. A failed lookup leaves it at 'sent'. */
async function recheckOne(decision: DecisionRow): Promise<void> {
  if (decision.status !== 'sent' || !decision.txHash) return;
  let receipt: ReceiptStatus;
  try {
    receipt = await getReceiptStatus(decision.txHash);
  } catch {
    return;
  }
  await applyReceipt(decision, receipt);
}

async function currentResult(responseId: string): Promise<ResponseResult> {
  const response = await getResponse(responseId);
  if (!response) throw new ApiFailure('RESPONSE_NOT_FOUND', 'Response not found.');
  const decision = await getDecision(responseId);
  return {
    responseId: response.id,
    status: response.status,
    result: decision?.result ?? null,
    reasons: decision?.reasons ?? [],
    txHash: decision?.txHash ?? null,
    explorerUrl: explorerUrl(decision?.txHash ?? null),
  };
}

/** R6. Safe to call twice: only the call that claims the response does the work. */
export async function processResponse(responseId: string): Promise<ResponseResult> {
  // 1. Claim.
  const response = await claimResponse(responseId);
  if (!response) return currentResult(responseId);

  const survey = await getSurvey(response.surveyId);
  if (!survey) throw new Error(`Survey ${response.surveyId} is missing for response ${responseId}`);

  // 2. Prior data from earlier responses in the survey.
  const prior = buildPrior(survey.survey, await listPriorResponses(response.surveyId, responseId));

  // 3. Screen. screen() never throws; if it ever does, the response goes to review.
  let out: ScreenOutput;
  try {
    out = await screen({
      survey: survey.survey,
      answers: response.answers,
      durationMs: response.submittedAt.getTime() - response.startedAt.getTime(),
      prior,
    });
  } catch {
    out = {
      result: 'review',
      reasons: ['Screening error, sent to review.'],
      signals: { hardFails: [], weak: [] },
      ai: null,
      llmModel: null,
      rubricVersion: 'error',
    };
  }

  // 4. Save the decision first. 5. A review decision also moves the response to 'review'.
  const hash = reasonHash(out.reasons);
  const decision = await insertDecision({
    responseId,
    result: out.result,
    reasons: out.reasons,
    reasonHash: hash,
    signals: out.signals,
    ai: out.ai,
    llmModel: out.llmModel,
    rubricVersion: out.rubricVersion,
    status: out.result === 'review' ? 'off_chain' : 'pending',
  });
  if (!decision || out.result === 'review') return currentResult(responseId);

  // 6. Send.
  let txHash: Hex;
  try {
    txHash = await sendDecision({
      surveyId: response.surveyId,
      respondent: response.wallet,
      decision: out.result,
      reasonHash: hash,
    });
  } catch (err) {
    await failDecision(decision.id, errorText(err));
    return currentResult(responseId);
  }

  // 7. Save the hash before waiting.
  await markDecisionSent(decision.id, txHash);

  // 8. Confirm. A timeout or an RPC error leaves 'sent'; R7 and the log route finish it later.
  let receipt: ReceiptStatus;
  try {
    receipt = await waitForReceipt(txHash, RECEIPT_TIMEOUT_MS);
  } catch {
    receipt = { state: 'pending' };
  }
  await applyReceipt(decision, receipt);

  // 9.
  return currentResult(responseId);
}

/** R7. If the decision is still 'sent', checks the receipt once before answering. */
export async function getResponseResult(responseId: string): Promise<ResponseResult> {
  const decision = await getDecision(responseId);
  if (decision) await recheckOne(decision);
  return currentResult(responseId);
}

/** Checks the receipt of every 'sent' decision in the survey. */
export async function recheckSent(surveyId: number): Promise<void> {
  for (const decision of await listSentDecisions(surveyId)) {
    await recheckOne(decision);
  }
}
