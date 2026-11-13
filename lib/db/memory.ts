// Lane C. In-memory stand-in for lib/db/queries.ts with the same exports. Unit tests only:
//   vi.mock('../db/queries', () => import('../db/memory'));
// It mirrors the constraints the code relies on (unique keys, claim rule, status guards).
import { randomUUID } from 'node:crypto';
import type { Hex } from '../types';
import type {
  DecisionRow,
  LogRecord,
  NewDecision,
  NewResponse,
  NewSurvey,
  PriorResponse,
  ResponseRow,
  SurveyRow,
} from './queries';

type StoredSurvey = Omit<SurveyRow, 'paidCount' | 'activeCount'>;
type StoredResponse = ResponseRow & { emailHash: string };

let surveys: StoredSurvey[] = [];
let responses: StoredResponse[] = [];
let decisions: DecisionRow[] = [];

export function reset(): void {
  surveys = [];
  responses = [];
  decisions = [];
}

/** Test hook: edit a stored response (for example to age it). */
export function patchResponse(id: string, patch: Partial<ResponseRow>): void {
  const r = responses.find((x) => x.id === id);
  if (r) Object.assign(r, patch);
}

/** Test hook: edit a stored survey (for example to pause it). */
export function patchSurvey(surveyId: number, patch: Partial<StoredSurvey>): void {
  const s = surveys.find((x) => x.surveyId === surveyId);
  if (s) Object.assign(s, patch);
}

function withCounts(s: StoredSurvey): SurveyRow {
  const mine = responses.filter((r) => r.surveyId === s.surveyId);
  return {
    ...s,
    paidCount: mine.filter((r) => r.status === 'paid').length,
    activeCount: mine.filter((r) => ['received', 'processing', 'paid'].includes(r.status)).length,
  };
}

const publicResponse = (r: StoredResponse): ResponseRow => ({
  id: r.id,
  surveyId: r.surveyId,
  wallet: r.wallet,
  email: r.email,
  answers: r.answers,
  startedAt: r.startedAt,
  submittedAt: r.submittedAt,
  status: r.status,
});

export async function insertSurvey(s: NewSurvey): Promise<void> {
  if (surveys.some((x) => x.surveyId === s.surveyId)) return;
  surveys.push({
    surveyId: s.surveyId,
    researcher: s.researcher.toLowerCase(),
    survey: s.survey,
    surveyHash: s.surveyHash,
    rateWei: s.rateWei,
    quota: s.quota,
    deadline: s.deadline,
    feePerResponseWei: s.feePerResponseWei,
    txHash: s.txHash,
    status: 'open',
    paused: false,
    refundedWei: null,
    closeTxHash: null,
    createdAt: new Date(),
  });
}

export async function getSurvey(surveyId: number): Promise<SurveyRow | null> {
  const s = surveys.find((x) => x.surveyId === surveyId);
  return s ? withCounts(s) : null;
}

export async function listSurveysByResearcher(wallet: string): Promise<SurveyRow[]> {
  return surveys.filter((s) => s.researcher === wallet.toLowerCase()).map(withCounts);
}

export async function setSurveyClosed(surveyId: number, refundedWei: bigint, closeTxHash: Hex): Promise<void> {
  patchSurvey(surveyId, { status: 'closed', refundedWei, closeTxHash });
}

export async function setSurveyPaused(surveyId: number, paused: boolean): Promise<boolean> {
  const s = surveys.find((x) => x.surveyId === surveyId);
  if (!s) return false;
  s.paused = paused;
  return true;
}

export async function insertResponse(r: NewResponse): Promise<string> {
  const clash = responses.some(
    (x) => x.surveyId === r.surveyId && (x.wallet === r.wallet.toLowerCase() || x.emailHash === r.emailHash),
  );
  if (clash) throw Object.assign(new Error('duplicate key value violates unique constraint'), { code: '23505' });
  const id = randomUUID();
  responses.push({
    id,
    surveyId: r.surveyId,
    wallet: r.wallet.toLowerCase(),
    email: r.email,
    emailHash: r.emailHash,
    answers: r.answers,
    startedAt: r.startedAt,
    submittedAt: new Date(),
    status: 'received',
  });
  return id;
}

export async function getResponse(responseId: string): Promise<ResponseRow | null> {
  const r = responses.find((x) => x.id === responseId);
  return r ? publicResponse(r) : null;
}

export async function claimResponse(responseId: string): Promise<ResponseRow | null> {
  const r = responses.find((x) => x.id === responseId);
  if (!r) return null;
  const stale =
    r.status === 'processing' &&
    !decisions.some((d) => d.responseId === r.id) &&
    r.submittedAt.getTime() < Date.now() - 2 * 60 * 1000;
  if (r.status !== 'received' && !stale) return null;
  r.status = 'processing';
  return publicResponse(r);
}

export async function listPriorResponses(surveyId: number, responseId: string): Promise<PriorResponse[]> {
  const self = responses.find((x) => x.id === responseId);
  if (!self) return [];
  return responses
    .filter((r) => r.surveyId === surveyId && r.id !== responseId && r.submittedAt <= self.submittedAt)
    .map((r) => ({ answers: r.answers, durationMs: r.submittedAt.getTime() - r.startedAt.getTime() }));
}

export async function insertDecision(d: NewDecision): Promise<DecisionRow | null> {
  if (decisions.some((x) => x.responseId === d.responseId)) return null;
  const row: DecisionRow = { ...d, id: randomUUID(), txHash: null, error: null };
  decisions.push(row);
  if (d.status === 'off_chain') patchResponse(d.responseId, { status: 'review' });
  return { ...row };
}

export async function getDecision(responseId: string): Promise<DecisionRow | null> {
  const d = decisions.find((x) => x.responseId === responseId);
  return d ? { ...d } : null;
}

export async function markDecisionSent(decisionId: string, txHash: Hex): Promise<void> {
  const d = decisions.find((x) => x.id === decisionId);
  if (d && d.status === 'pending') Object.assign(d, { status: 'sent', txHash });
}

export async function confirmDecision(decisionId: string, responseStatus: 'paid' | 'blocked'): Promise<void> {
  const d = decisions.find((x) => x.id === decisionId);
  if (!d || d.status !== 'sent') return;
  d.status = 'confirmed';
  patchResponse(d.responseId, { status: responseStatus });
}

export async function failDecision(decisionId: string, error: string): Promise<void> {
  const d = decisions.find((x) => x.id === decisionId);
  if (!d || (d.status !== 'pending' && d.status !== 'sent')) return;
  Object.assign(d, { status: 'failed', error });
  patchResponse(d.responseId, { status: 'review' });
}

export async function listSentDecisions(surveyId: number): Promise<DecisionRow[]> {
  const ids = new Set(responses.filter((r) => r.surveyId === surveyId).map((r) => r.id));
  return decisions.filter((d) => d.status === 'sent' && ids.has(d.responseId)).map((d) => ({ ...d }));
}

export async function listLogRecords(surveyId: number): Promise<LogRecord[]> {
  return responses
    .filter((r) => r.surveyId === surveyId)
    .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime())
    .map((r) => ({ response: publicResponse(r), decision: decisions.find((d) => d.responseId === r.id) ?? null }));
}
