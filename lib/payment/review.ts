// A person decides a response the rules left open, and a respondent appeals a rejection. Server only.
//
// AGENTS.md rule 1 is about the AI and the rule engine: only code decides Pay or Don't pay on its own.
// Here the researcher decides. Rules 6 and 7 still hold: the decision row is saved before any
// transaction is sent, and the transaction hash is saved before waiting for the receipt.
//
// Pay sends a transaction. A rejection is saved off chain: the contract allows one decision per
// respondent, so recording "Don't pay" on chain would make an appeal impossible to pay.
import { z } from 'zod';
import { ApiFailure } from '../api/errors';
import { verifyResearcher } from '../auth/signature';
import { requireSession } from '../auth/session';
import { reasonHash } from '../canonical';
import {
  getAppeal,
  getDecision,
  getResponse,
  getSurvey,
  insertAppeal,
  listAppealsBySurvey,
  reopenDecision,
  settleAppeal,
  type DecisionRow,
  type ResponseRow,
} from '../db/queries';
import { APPEAL_MAX_CHARS, APPEAL_MIN_CHARS, REJECT_REASON_CODES, REJECT_REASONS } from '../review-reasons';
import type { AppealItem, ResponseResult } from '../api/shapes';
import { getResponseResult, sendAndSettle } from './runner';

const decideBodySchema = z.object({
  decision: z.enum(['pay', 'dont_pay']),
  reason: z.enum(REJECT_REASON_CODES).optional(),
});
const appealBodySchema = z.object({ text: z.string().max(2000) });

const MAX_REASONS = 20;

/** A rejection by a person that the respondent may still appeal. */
const isAppealable = (r: ResponseRow, d: DecisionRow | null): d is DecisionRow =>
  d !== null && r.status === 'blocked' && d.result === 'dont_pay' && d.status === 'off_chain';

/** Researcher decides a response in review, or an open appeal. Pay sends the payout. */
export async function decideResponse(responseId: string, headers: Headers, body: unknown): Promise<ResponseResult> {
  const me = await requireSession(headers);
  const input = decideBodySchema.parse(body);

  const response = await getResponse(responseId);
  if (!response) throw new ApiFailure('RESPONSE_NOT_FOUND', 'Response not found.');
  const survey = await getSurvey(response.surveyId);
  if (!survey) throw new ApiFailure('SURVEY_NOT_FOUND', 'Survey not found.');
  if (survey.researcher !== me.wallet) throw new ApiFailure('NOT_YOUR_SURVEY', 'This survey belongs to another wallet.');

  const decision = await getDecision(responseId);
  const appeal = await getAppeal(responseId);
  const inReview = response.status === 'review' && decision !== null;
  const inAppeal = isAppealable(response, decision) && appeal?.status === 'open';
  if (!decision || (!inReview && !inAppeal)) {
    throw new ApiFailure('INVALID_INPUT', 'This response is not waiting for a decision.');
  }

  const pays = input.decision === 'pay';
  if (pays) {
    if (survey.status === 'closed' || Date.now() >= survey.deadline * 1000) {
      throw new ApiFailure('SURVEY_CLOSED', 'This survey is closed, so it can no longer pay.');
    }
    if (survey.paidCount >= survey.quota) throw new ApiFailure('QUOTA_FULL', 'This survey has no paid slots left.');
  }
  if (inReview && !pays && !input.reason) {
    throw new ApiFailure('INVALID_INPUT', 'Choose a reason. The respondent will see it.');
  }

  const note = inAppeal
    ? pays
      ? 'Appeal accepted by the researcher.'
      : 'Appeal rejected by the researcher. The decision is final.'
    : pays
      ? 'Paid by the researcher after review.'
      : `Not paid by the researcher: ${REJECT_REASONS[input.reason!]}`;
  const reasons = [...decision.reasons, note].slice(-MAX_REASONS);
  const hash = reasonHash(reasons);

  // An appeal is settled first: one call wins, so a payment and a rejection cannot both go through.
  if (inAppeal && !(await settleAppeal(responseId, pays ? 'paid' : 'kept'))) {
    throw new ApiFailure('INVALID_INPUT', 'This appeal was already decided.');
  }

  // Save the decision first.
  const saved = await reopenDecision(decision.id, {
    result: pays ? 'pay' : 'dont_pay',
    reasons,
    reasonHash: hash,
    status: pays ? 'pending' : 'off_chain',
  });
  if (!saved) throw new ApiFailure('INVALID_INPUT', 'This response was already decided.');

  // Then send. A rejection needs no transaction.
  if (pays) await sendAndSettle(saved, response, 'pay', hash);
  return getResponseResult(responseId);
}

/** Respondent appeals a rejection once. */
export async function fileAppeal(responseId: string, headers: Headers, body: unknown): Promise<{ responseId: string }> {
  const me = await requireSession(headers);
  const text = appealBodySchema.parse(body).text.trim();
  if (text.length < APPEAL_MIN_CHARS || text.length > APPEAL_MAX_CHARS) {
    throw new ApiFailure('INVALID_INPUT', `Write between ${APPEAL_MIN_CHARS} and ${APPEAL_MAX_CHARS} characters.`);
  }
  const response = await getResponse(responseId);
  if (!response || response.wallet !== me.wallet) throw new ApiFailure('RESPONSE_NOT_FOUND', 'Response not found.');
  if (!isAppealable(response, await getDecision(responseId))) {
    throw new ApiFailure('INVALID_INPUT', 'This answer can not be appealed.');
  }
  if (!(await insertAppeal(responseId, text))) {
    throw new ApiFailure('ALREADY_SUBMITTED', 'You already appealed this decision.');
  }
  return { responseId };
}

/** Appeals on a survey, for its researcher. Auth: view_log, like the decision log. */
export async function listAppeals(surveyId: number, headers: Headers): Promise<{ appeals: AppealItem[] }> {
  const survey = await getSurvey(surveyId);
  if (!survey) throw new ApiFailure('SURVEY_NOT_FOUND', 'Survey not found.');
  const wallet = await verifyResearcher(headers, 'view_log', surveyId);
  if (wallet !== survey.researcher) throw new ApiFailure('NOT_YOUR_SURVEY', 'This survey belongs to another wallet.');
  const rows = await listAppealsBySurvey(surveyId);
  return { appeals: rows.map((a) => ({ responseId: a.responseId, text: a.text, status: a.status, createdAt: a.createdAt.toISOString() })) };
}
