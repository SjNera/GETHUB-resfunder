// Lane C. Every SQL statement, as a named function. Source: docs/TDD.md sections 8 and 11.
// Server only. Wei is bigint here; wallets and hashes are stored lowercase.
import type {
  AiResult,
  Answers,
  DecisionResult,
  DecisionStatus,
  Hex,
  ResponseStatus,
  Signals,
  SurveyJson,
  SurveyStatus,
} from '../types';
import { query } from './client';

type Raw = Record<string, unknown>;

const toBig = (v: unknown): bigint => BigInt(String(v));
const toNum = (v: unknown): number => Number(v);
const toDate = (v: unknown): Date => (v instanceof Date ? v : new Date(String(v)));
const toHexOrNull = (v: unknown): Hex | null => (v == null ? null : (String(v) as Hex));

// ---------- Surveys ----------

export interface SurveyRow {
  surveyId: number;
  researcher: string;
  survey: SurveyJson;
  surveyHash: Hex;
  rateWei: bigint;
  quota: number;
  deadline: number; // unix seconds
  feePerResponseWei: bigint;
  txHash: Hex;
  status: SurveyStatus;
  paused: boolean;
  refundedWei: bigint | null;
  closeTxHash: Hex | null;
  createdAt: Date;
  /** Responses at 'paid'. */
  paidCount: number;
  /** Responses at 'received', 'processing' or 'paid'. These hold a quota slot. */
  activeCount: number;
}

const SURVEY_SELECT = `
  SELECT s.*,
    (SELECT count(*) FROM responses r
      WHERE r.survey_id = s.survey_id AND r.status = 'paid')::int AS paid_count,
    (SELECT count(*) FROM responses r
      WHERE r.survey_id = s.survey_id AND r.status IN ('received','processing','paid'))::int AS active_count
  FROM surveys s`;

function mapSurvey(r: Raw): SurveyRow {
  return {
    surveyId: toNum(r.survey_id),
    researcher: String(r.researcher),
    survey: r.questions_json as SurveyJson,
    surveyHash: String(r.survey_hash) as Hex,
    rateWei: toBig(r.rate_wei),
    quota: toNum(r.quota),
    deadline: toNum(r.deadline_unix),
    feePerResponseWei: toBig(r.fee_per_response_wei),
    txHash: String(r.tx_hash) as Hex,
    status: r.status as SurveyStatus,
    paused: r.paused === true,
    refundedWei: r.refunded_wei == null ? null : toBig(r.refunded_wei),
    closeTxHash: toHexOrNull(r.close_tx_hash),
    createdAt: toDate(r.created_at),
    paidCount: toNum(r.paid_count),
    activeCount: toNum(r.active_count),
  };
}

export interface NewSurvey {
  surveyId: number;
  researcher: string;
  survey: SurveyJson;
  surveyHash: Hex;
  rateWei: bigint;
  quota: number;
  deadline: number;
  feePerResponseWei: bigint;
  txHash: Hex;
}

/** Does nothing when the survey id is already registered. */
export async function insertSurvey(s: NewSurvey): Promise<void> {
  await query(
    `INSERT INTO surveys
       (survey_id, researcher, questions_json, survey_hash, rate_wei, quota, deadline_unix,
        fee_per_response_wei, tx_hash)
     VALUES ($1::bigint, $2, $3::jsonb, $4, $5::numeric, $6::int, $7::bigint, $8::numeric, $9)
     ON CONFLICT (survey_id) DO NOTHING`,
    [
      String(s.surveyId),
      s.researcher.toLowerCase(),
      JSON.stringify(s.survey),
      s.surveyHash.toLowerCase(),
      s.rateWei.toString(),
      s.quota,
      String(s.deadline),
      s.feePerResponseWei.toString(),
      s.txHash.toLowerCase(),
    ],
  );
}

export async function getSurvey(surveyId: number): Promise<SurveyRow | null> {
  const rows = await query<Raw>(`${SURVEY_SELECT} WHERE s.survey_id = $1::bigint`, [String(surveyId)]);
  return rows[0] ? mapSurvey(rows[0]) : null;
}

export async function listSurveysByResearcher(wallet: string): Promise<SurveyRow[]> {
  const rows = await query<Raw>(`${SURVEY_SELECT} WHERE s.researcher = $1 ORDER BY s.created_at DESC`, [
    wallet.toLowerCase(),
  ]);
  return rows.map(mapSurvey);
}

export async function setSurveyClosed(surveyId: number, refundedWei: bigint, closeTxHash: Hex): Promise<void> {
  await query(
    `UPDATE surveys SET status = 'closed', refunded_wei = $2::numeric, close_tx_hash = $3
     WHERE survey_id = $1::bigint`,
    [String(surveyId), refundedWei.toString(), closeTxHash.toLowerCase()],
  );
}

/** Pause or resume payments for a survey. Returns false when the survey does not exist. */
export async function setSurveyPaused(surveyId: number, paused: boolean): Promise<boolean> {
  const rows = await query<Raw>(`UPDATE surveys SET paused = $2 WHERE survey_id = $1::bigint RETURNING survey_id`, [
    String(surveyId),
    paused,
  ]);
  return rows.length > 0;
}

// ---------- Responses ----------

export interface ResponseRow {
  id: string;
  surveyId: number;
  wallet: string;
  email: string;
  answers: Answers;
  startedAt: Date;
  submittedAt: Date;
  status: ResponseStatus;
}

function mapResponse(r: Raw): ResponseRow {
  return {
    id: String(r.id),
    surveyId: toNum(r.survey_id),
    wallet: String(r.wallet),
    email: String(r.email),
    answers: r.answers_json as Answers,
    startedAt: toDate(r.started_at),
    submittedAt: toDate(r.submitted_at),
    status: r.status as ResponseStatus,
  };
}

export interface NewResponse {
  surveyId: number;
  wallet: string;
  email: string;
  emailHash: string;
  answers: Answers;
  startedAt: Date;
}

/** Throws the driver error on a unique violation (23505). Check it with isUniqueViolation. */
export async function insertResponse(r: NewResponse): Promise<string> {
  const rows = await query<Raw>(
    `INSERT INTO responses (survey_id, wallet, email, email_hash, answers_json, started_at)
     VALUES ($1::bigint, $2, $3, $4, $5::jsonb, $6::timestamptz)
     RETURNING id`,
    [
      String(r.surveyId),
      r.wallet.toLowerCase(),
      r.email,
      r.emailHash,
      JSON.stringify(r.answers),
      r.startedAt.toISOString(),
    ],
  );
  return String(rows[0].id);
}

export async function getResponse(responseId: string): Promise<ResponseRow | null> {
  const rows = await query<Raw>('SELECT * FROM responses WHERE id = $1::uuid', [responseId]);
  return rows[0] ? mapResponse(rows[0]) : null;
}

/**
 * Moves a response to 'processing' and returns it, or returns null when it is not claimable.
 * Claimable: 'received', or 'processing' with no decision for more than 2 minutes (a crashed run).
 */
export async function claimResponse(responseId: string): Promise<ResponseRow | null> {
  const rows = await query<Raw>(
    `UPDATE responses SET status = 'processing'
     WHERE id = $1::uuid
       AND (status = 'received'
            OR (status = 'processing'
                AND NOT EXISTS (SELECT 1 FROM decisions d WHERE d.response_id = responses.id)
                AND submitted_at < now() - interval '2 minutes'))
     RETURNING *`,
    [responseId],
  );
  return rows[0] ? mapResponse(rows[0]) : null;
}

export interface PriorResponse {
  answers: Answers;
  durationMs: number;
}

/** Other responses in the survey that were submitted no later than this one. */
export async function listPriorResponses(surveyId: number, responseId: string): Promise<PriorResponse[]> {
  const rows = await query<Raw>(
    `SELECT answers_json,
            (extract(epoch FROM (submitted_at - started_at)) * 1000)::float8 AS duration_ms
     FROM responses
     WHERE survey_id = $1::bigint
       AND id <> $2::uuid
       AND submitted_at <= (SELECT submitted_at FROM responses WHERE id = $2::uuid)`,
    [String(surveyId), responseId],
  );
  return rows.map((r) => ({ answers: r.answers_json as Answers, durationMs: Math.round(toNum(r.duration_ms)) }));
}

// ---------- Decisions ----------

export interface DecisionRow {
  id: string;
  responseId: string;
  result: DecisionResult;
  reasons: string[];
  reasonHash: Hex;
  signals: Signals;
  ai: AiResult | null;
  llmModel: string | null;
  rubricVersion: string;
  status: DecisionStatus;
  txHash: Hex | null;
  error: string | null;
}

function mapDecision(r: Raw): DecisionRow {
  return {
    id: String(r.id),
    responseId: String(r.response_id),
    result: r.result as DecisionResult,
    reasons: r.reasons as string[],
    reasonHash: String(r.reason_hash) as Hex,
    signals: r.signals as Signals,
    ai: (r.ai_result ?? null) as AiResult | null,
    llmModel: r.llm_model == null ? null : String(r.llm_model),
    rubricVersion: String(r.rubric_version),
    status: r.status as DecisionStatus,
    txHash: toHexOrNull(r.tx_hash),
    error: r.error == null ? null : String(r.error),
  };
}

export interface NewDecision {
  responseId: string;
  result: DecisionResult;
  reasons: string[];
  reasonHash: Hex;
  signals: Signals;
  ai: AiResult | null;
  llmModel: string | null;
  rubricVersion: string;
  /** 'pending' for pay and dont_pay, 'off_chain' for review. */
  status: 'pending' | 'off_chain';
}

/**
 * Saves the decision. An 'off_chain' decision also moves the response to 'review' in the same statement.
 * Returns null when the response already has a decision.
 */
export async function insertDecision(d: NewDecision): Promise<DecisionRow | null> {
  const rows = await query<Raw>(
    `WITH d AS (
       INSERT INTO decisions
         (response_id, result, reasons, reason_hash, signals, ai_result, llm_model, rubric_version, status)
       VALUES ($1::uuid, $2, $3::jsonb, $4, $5::jsonb, $6::jsonb, $7, $8, $9)
       ON CONFLICT (response_id) DO NOTHING
       RETURNING *
     ), r AS (
       UPDATE responses SET status = 'review'
       WHERE id IN (SELECT response_id FROM d WHERE status = 'off_chain')
       RETURNING id
     )
     SELECT * FROM d`,
    [
      d.responseId,
      d.result,
      JSON.stringify(d.reasons),
      d.reasonHash,
      JSON.stringify(d.signals),
      d.ai === null ? null : JSON.stringify(d.ai),
      d.llmModel,
      d.rubricVersion,
      d.status,
    ],
  );
  return rows[0] ? mapDecision(rows[0]) : null;
}

export async function getDecision(responseId: string): Promise<DecisionRow | null> {
  const rows = await query<Raw>('SELECT * FROM decisions WHERE response_id = $1::uuid', [responseId]);
  return rows[0] ? mapDecision(rows[0]) : null;
}

/** pending -> sent, with the transaction hash. */
export async function markDecisionSent(decisionId: string, txHash: Hex): Promise<void> {
  await query(`UPDATE decisions SET status = 'sent', tx_hash = $2 WHERE id = $1::uuid AND status = 'pending'`, [
    decisionId,
    txHash.toLowerCase(),
  ]);
}

/** sent -> confirmed, and the response to 'paid' or 'blocked', in one statement. */
export async function confirmDecision(decisionId: string, responseStatus: 'paid' | 'blocked'): Promise<void> {
  await query(
    `WITH d AS (
       UPDATE decisions SET status = 'confirmed' WHERE id = $1::uuid AND status = 'sent' RETURNING response_id
     )
     UPDATE responses SET status = $2 WHERE id IN (SELECT response_id FROM d)`,
    [decisionId, responseStatus],
  );
}

/** pending or sent -> failed with the error text, and the response to 'review', in one statement. */
export async function failDecision(decisionId: string, error: string): Promise<void> {
  await query(
    `WITH d AS (
       UPDATE decisions SET status = 'failed', error = $2
       WHERE id = $1::uuid AND status IN ('pending','sent')
       RETURNING response_id
     )
     UPDATE responses SET status = 'review' WHERE id IN (SELECT response_id FROM d)`,
    [decisionId, error],
  );
}

export async function listSentDecisions(surveyId: number): Promise<DecisionRow[]> {
  const rows = await query<Raw>(
    `SELECT d.* FROM decisions d
     JOIN responses r ON r.id = d.response_id
     WHERE r.survey_id = $1::bigint AND d.status = 'sent'
     ORDER BY d.created_at`,
    [String(surveyId)],
  );
  return rows.map(mapDecision);
}

// ---------- Decision log ----------

export interface LogRecord {
  response: ResponseRow;
  decision: Pick<DecisionRow, 'result' | 'reasons' | 'status' | 'txHash' | 'llmModel' | 'rubricVersion'> | null;
}

/** Responses with their decisions, newest first. */
export async function listLogRecords(surveyId: number): Promise<LogRecord[]> {
  const rows = await query<Raw>(
    `SELECT r.*, d.id AS decision_id, d.result, d.reasons, d.status AS decision_status,
            d.tx_hash, d.llm_model, d.rubric_version
     FROM responses r
     LEFT JOIN decisions d ON d.response_id = r.id
     WHERE r.survey_id = $1::bigint
     ORDER BY r.submitted_at DESC, r.id`,
    [String(surveyId)],
  );
  return rows.map((r) => ({
    response: mapResponse(r),
    decision:
      r.decision_id == null
        ? null
        : {
            result: r.result as DecisionResult,
            reasons: r.reasons as string[],
            status: r.decision_status as DecisionStatus,
            txHash: toHexOrNull(r.tx_hash),
            llmModel: r.llm_model == null ? null : String(r.llm_model),
            rubricVersion: String(r.rubric_version),
          },
  }));
}
