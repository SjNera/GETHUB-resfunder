// Lane C. Survey pipelines: register (R2), list (R3), details (R4), closed (R9).
// Source: docs/TDD.md sections 11.1, 11.6, 11.7. Server only.
import { z } from 'zod';
import { verifyResearcher } from '../auth/signature';
import { surveyHash } from '../canonical';
import { readClosed, readSurveyCreated } from '../chain/escrow';
import { getSurvey, insertSurvey, listSurveysByResearcher, setSurveyClosed, type SurveyRow } from '../db/queries';
import { surveySchema } from '../survey-schema';
import type { Hex, SurveyJson } from '../types';
import { ApiFailure } from './errors';
import type { ClosedResult, RegisterResult, SurveyDetails, SurveySummary } from './shapes';

const txHashSchema = z.string().regex(/^0x[0-9a-fA-F]{64}$/, 'txHash must be a 32-byte hex string');
const registerBodySchema = z.object({ txHash: txHashSchema, survey: surveySchema });
const closedBodySchema = z.object({ txHash: txHashSchema });

/** Parses the [id] path segment of a survey route. */
export function parseSurveyId(raw: string): number {
  if (!/^\d{1,15}$/.test(raw)) throw new ApiFailure('INVALID_INPUT', 'The survey id must be a whole number.');
  return Number(raw);
}

export function toSummary(row: SurveyRow): SurveySummary {
  return {
    surveyId: row.surveyId,
    title: row.survey.title,
    status: row.status,
    paused: row.paused,
    rateWei: row.rateWei.toString(),
    quota: row.quota,
    deadline: row.deadline,
    paidCount: row.paidCount,
    createdAt: row.createdAt.toISOString(),
  };
}

/** R2. The chain event is the source of truth; the browser only supplies the tx hash and the JSON. */
export async function registerSurvey(body: unknown): Promise<RegisterResult> {
  const input = registerBodySchema.parse(body);
  const txHash = input.txHash.toLowerCase() as Hex;
  const survey = input.survey as SurveyJson;

  const ev = await readSurveyCreated(txHash);
  if (!ev) throw new ApiFailure('TX_NOT_VERIFIED', 'No SurveyCreated event was found for this transaction.');
  if (surveyHash(survey).toLowerCase() !== ev.surveyHash.toLowerCase()) {
    throw new ApiFailure('HASH_MISMATCH', 'The survey does not match the hash that was funded.');
  }

  await insertSurvey({
    surveyId: ev.surveyId,
    researcher: ev.researcher,
    survey,
    surveyHash: ev.surveyHash,
    rateWei: ev.rate,
    quota: ev.quota,
    deadline: ev.deadline,
    feePerResponseWei: ev.feePerResponse,
    txHash,
  });
  return { surveyId: ev.surveyId, sharePath: `/s/${ev.surveyId}` };
}

/** R3. */
export async function listSurveys(headers: Headers): Promise<{ surveys: SurveySummary[] }> {
  const wallet = await verifyResearcher(headers, 'list_surveys', 0);
  const rows = await listSurveysByResearcher(wallet);
  return { surveys: rows.map(toSummary) };
}

/** R4. */
export async function getSurveyDetails(surveyId: number): Promise<SurveyDetails> {
  const row = await getSurvey(surveyId);
  if (!row) throw new ApiFailure('SURVEY_NOT_FOUND', 'Survey not found.');
  return {
    surveyId: row.surveyId,
    survey: row.survey,
    rateWei: row.rateWei.toString(),
    quota: row.quota,
    deadline: row.deadline,
    status: row.status,
    paused: row.paused,
    slotsLeft: Math.max(0, row.quota - row.activeCount),
  };
}

/** R9. Verified from the Closed event. Safe to repeat. */
export async function markSurveyClosed(surveyId: number, body: unknown): Promise<ClosedResult> {
  const input = closedBodySchema.parse(body);
  const txHash = input.txHash.toLowerCase() as Hex;

  const row = await getSurvey(surveyId);
  if (!row) throw new ApiFailure('SURVEY_NOT_FOUND', 'Survey not found.');

  const ev = await readClosed(txHash);
  if (!ev || ev.surveyId !== surveyId) {
    throw new ApiFailure('TX_NOT_VERIFIED', 'No Closed event for this survey was found in the transaction.');
  }

  await setSurveyClosed(surveyId, ev.refunded, txHash);
  return { surveyId, status: 'closed', refundedWei: ev.refunded.toString(), closeTxHash: txHash };
}
