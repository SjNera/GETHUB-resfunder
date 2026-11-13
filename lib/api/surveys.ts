// Lane C. Survey pipelines: register (R2), list (R3), details (R4), closed (R9).
// Source: docs/TDD.md sections 11.1, 11.6, 11.7. Server only.
import { z } from 'zod';
import { SIGNATURE_RE, verifyAuth, verifyResearcher, WALLET_RE } from '../auth/signature';
import { surveyHash } from '../canonical';
import { readClosed, readSurveyCreated, type SurveyCreatedEvent } from '../chain/escrow';
import {
  getSurvey,
  insertSurvey,
  listSurveysByResearcher,
  setSurveyClosed,
  setSurveyPaused,
  type SurveyRow,
} from '../db/queries';
import { surveySchema } from '../survey-schema';
import type { AuthProof, Hex, SurveyJson } from '../types';
import { ApiFailure } from './errors';
import type { ClosedResult, RegisterResult, SurveyDetails, SurveySummary } from './shapes';

const txHashSchema = z.string().regex(/^0x[0-9a-fA-F]{64}$/, 'txHash must be a 32-byte hex string');
const registerBodySchema = z.object({ txHash: txHashSchema, survey: surveySchema });
const closedBodySchema = z.object({ txHash: txHashSchema });
const pauseBodySchema = z.object({
  paused: z.boolean(),
  auth: z.object({
    wallet: z.string().regex(WALLET_RE),
    signature: z.string().regex(SIGNATURE_RE),
    timestamp: z.number().int().positive(),
  }),
});

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

const PG_INT_MAX = 2_147_483_647;

/**
 * Event values are chosen by whoever funded the survey, so they are range-checked before they
 * reach the database. Id 0 is refused because the list_surveys auth message uses it.
 */
function eventInRange(ev: SurveyCreatedEvent): boolean {
  return (
    Number.isSafeInteger(ev.surveyId) &&
    ev.surveyId > 0 &&
    /^0x[0-9a-fA-F]{40}$/.test(ev.researcher) &&
    Number.isSafeInteger(ev.quota) &&
    ev.quota > 0 &&
    ev.quota <= PG_INT_MAX &&
    Number.isSafeInteger(ev.deadline) &&
    ev.deadline > 0 &&
    ev.rate > BigInt(0) &&
    ev.feePerResponse >= BigInt(0)
  );
}

/** R2. The chain event is the source of truth; the browser only supplies the tx hash and the JSON. */
export async function registerSurvey(body: unknown): Promise<RegisterResult> {
  const input = registerBodySchema.parse(body);
  const txHash = input.txHash.toLowerCase() as Hex;
  const survey = input.survey as SurveyJson;

  const ev = await readSurveyCreated(txHash);
  if (!ev) throw new ApiFailure('TX_NOT_VERIFIED', 'No SurveyCreated event was found for this transaction.');
  if (!eventInRange(ev)) {
    throw new ApiFailure('TX_NOT_VERIFIED', 'The funded survey has values this app cannot store.');
  }
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

  // The insert does nothing when the id is taken. Make sure the stored row is this transaction's
  // survey (it would not be after a redeploy that reuses ids against an old database).
  const stored = await getSurvey(ev.surveyId);
  if (!stored || stored.txHash.toLowerCase() !== txHash) {
    throw new ApiFailure('TX_NOT_VERIFIED', 'This survey id is already registered from another transaction.');
  }
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

/** R10. Server-only switch: stops new submissions (R5 answers SURVEY_PAUSED). Responses already received are still processed. */
export async function pauseSurvey(surveyId: number, body: unknown): Promise<{ surveyId: number; paused: boolean }> {
  const input = pauseBodySchema.parse(body);
  const row = await getSurvey(surveyId);
  if (!row) throw new ApiFailure('SURVEY_NOT_FOUND', 'Survey not found.');
  const proof: AuthProof = { ...input.auth, signature: input.auth.signature as Hex };
  const wallet = await verifyAuth(proof, 'pause', surveyId);
  if (wallet !== row.researcher) throw new ApiFailure('NOT_YOUR_SURVEY', 'This survey belongs to another wallet.');
  if (row.status === 'closed') throw new ApiFailure('SURVEY_CLOSED', 'This survey is closed.');
  await setSurveyPaused(surveyId, input.paused);
  return { surveyId, paused: input.paused };
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
