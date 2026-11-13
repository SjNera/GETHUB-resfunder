// A person decides a response the rules left open. Server only.
//
// AGENTS.md rule 1 is about the AI and the rule engine: only code decides Pay or Don't pay on its own.
// Here the researcher decides. Rules 6 and 7 still hold: the decision row is saved before any
// transaction is sent, and the transaction hash is saved before waiting for the receipt.
// Both Pay and Don't pay are recorded on chain, so a decision is final.
import { z } from 'zod';
import { ApiFailure } from '../api/errors';
import type { ResponseResult } from '../api/shapes';
import { requireSession } from '../auth/session';
import { reasonHash } from '../canonical';
import { getDecision, getResponse, getSurvey, reopenDecision } from '../db/queries';
import { REJECT_REASON_CODES, REJECT_REASONS } from '../review-reasons';
import { getResponseResult, sendAndSettle } from './runner';

const decideBodySchema = z.object({
  decision: z.enum(['pay', 'dont_pay']),
  reason: z.enum(REJECT_REASON_CODES).optional(),
});

const MAX_REASONS = 20;

/**
 * The researcher pays or rejects a response in review. Auth: the sign-in session, and the session
 * wallet must be the survey's researcher.
 */
export async function decideResponse(responseId: string, headers: Headers, body: unknown): Promise<ResponseResult> {
  const me = await requireSession(headers);
  const input = decideBodySchema.parse(body);

  const response = await getResponse(responseId);
  if (!response) throw new ApiFailure('RESPONSE_NOT_FOUND', 'Response not found.');
  const survey = await getSurvey(response.surveyId);
  if (!survey) throw new ApiFailure('SURVEY_NOT_FOUND', 'Survey not found.');
  if (survey.researcher !== me.wallet) throw new ApiFailure('NOT_YOUR_SURVEY', 'This survey belongs to another wallet.');

  const decision = await getDecision(responseId);
  if (!decision || response.status !== 'review') {
    throw new ApiFailure('INVALID_INPUT', 'This response is not waiting for a decision.');
  }

  // The contract refuses any decision once the survey is closed or past its deadline.
  if (survey.status === 'closed' || Date.now() >= survey.deadline * 1000) {
    throw new ApiFailure('SURVEY_CLOSED', "This survey is closed, so a decision can't be recorded.");
  }
  const pays = input.decision === 'pay';
  if (pays && survey.paidCount >= survey.quota) throw new ApiFailure('QUOTA_FULL', 'This survey has no paid slots left.');
  if (!pays && !input.reason) throw new ApiFailure('INVALID_INPUT', 'Choose a reason. The respondent will see it.');

  const note = pays ? 'Paid by the researcher after review.' : `Not paid by the researcher: ${REJECT_REASONS[input.reason!]}`;
  const reasons = [...decision.reasons, note].slice(-MAX_REASONS);
  const hash = reasonHash(reasons);

  // Save the decision first. Only one call can move it out of 'off_chain' or 'failed'.
  const saved = await reopenDecision(decision.id, { result: pays ? 'pay' : 'dont_pay', reasons, reasonHash: hash });
  if (!saved) throw new ApiFailure('INVALID_INPUT', 'This response was already decided.');

  // Then send. A reverted transaction puts the response back in review.
  await sendAndSettle(saved, response, saved.result as 'pay' | 'dont_pay', hash);
  return getResponseResult(responseId);
}
