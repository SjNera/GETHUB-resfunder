// Lane C. Decision log (R8). Source: docs/TDD.md section 11.5. Server only.
import { verifyResearcher } from '../auth/signature';
import { getSurvey, listLogRecords } from '../db/queries';
import { recheckSent } from '../payment/runner';
import { ApiFailure } from './errors';
import { explorerUrl, type LogResponse, type LogRow } from './shapes';
import { toSummary } from './surveys';

export async function getLog(surveyId: number, headers: Headers): Promise<LogResponse> {
  // 1. Survey, then the owner check.
  const found = await getSurvey(surveyId);
  if (!found) throw new ApiFailure('SURVEY_NOT_FOUND', 'Survey not found.');
  const wallet = await verifyResearcher(headers, 'view_log', surveyId);
  if (wallet !== found.researcher) throw new ApiFailure('NOT_YOUR_SURVEY', 'This survey belongs to another wallet.');

  // 2. Settle decisions that were still waiting for a receipt.
  await recheckSent(surveyId);

  // 3. Rows, newest first. Re-read the survey so paidCount is current.
  const survey = (await getSurvey(surveyId)) ?? found;
  const records = await listLogRecords(surveyId);
  const rows: LogRow[] = records.map(({ response, decision }) => ({
    responseId: response.id,
    submittedAt: response.submittedAt.toISOString(),
    wallet: response.wallet,
    email: response.email,
    answers: response.answers,
    status: response.status,
    result: decision?.result ?? null,
    reasons: decision?.reasons ?? [],
    decisionStatus: decision?.status ?? null,
    txHash: decision?.txHash ?? null,
    explorerUrl: explorerUrl(decision?.txHash ?? null),
    llmModel: decision?.llmModel ?? null,
    rubricVersion: decision?.rubricVersion ?? null,
  }));

  // 4. Summary. All money in bigint.
  const count = (...statuses: string[]) => rows.filter((r) => statuses.includes(r.status)).length;
  const paid = count('paid');
  const budgetWei = survey.rateWei * BigInt(survey.quota);
  const paidWei = survey.rateWei * BigInt(paid);
  const remainingWei = survey.status === 'closed' ? BigInt(0) : budgetWei - paidWei;

  return {
    survey: {
      ...toSummary(survey),
      refundedWei: survey.refundedWei === null ? null : survey.refundedWei.toString(),
      closeTxHash: survey.closeTxHash,
    },
    summary: {
      responses: rows.length,
      paid,
      blocked: count('blocked'),
      review: count('review'),
      pending: count('received', 'processing'),
      budgetWei: budgetWei.toString(),
      paidWei: paidWei.toString(),
      remainingWei: remainingWei.toString(),
    },
    rows,
  };
}
