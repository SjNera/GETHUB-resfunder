// Pipelines R2 to R5, R8, R9 against the in-memory database and mocked chain reads.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { generatePrivateKey, privateKeyToAccount, type PrivateKeyAccount } from 'viem/accounts';
import demo from '../../data/demo-survey.json';
import { buildAuthMessage } from '../auth/message';
import { surveyHash } from '../canonical';
import * as chain from '../chain/escrow';
import * as db from '../db/memory';
import { ERROR_CODES, type Answers, type AuthAction, type Hex, type SurveyJson } from '../types';
import { parseResponseId, respond, STATUS_BY_CODE } from './errors';
import { getLog } from './log';
import { submitResponse } from './submit';
import { getSurveyDetails, listSurveys, markSurveyClosed, parseSurveyId, registerSurvey } from './surveys';

vi.mock('../db/queries', () => import('../db/memory'));
vi.mock('../chain/escrow', () => ({
  sendDecision: vi.fn(),
  waitForReceipt: vi.fn(),
  getReceiptStatus: vi.fn(),
  readSurveyCreated: vi.fn(),
  readClosed: vi.fn(),
}));

const survey = demo as SurveyJson;
const researcher = privateKeyToAccount(generatePrivateKey());
const respondent = privateKeyToAccount(generatePrivateKey());
const TX = `0x${'AB'.repeat(32)}` as Hex;
const TX_LOWER = TX.toLowerCase() as Hex;
const CLOSE_TX = `0x${'cd'.repeat(32)}` as Hex;
const SURVEY_ID = 12;
const RATE = BigInt('1000000000000');

const answers: Answers = {
  q1: 4, q2: 3, q3: 5, q4: 2, q5: 4,
  q6: '1 to 2 hours',
  q7: 'Staying focused when my family is at home.',
  q8: 'I use short timed sessions because they keep me from drifting.',
};

function createdEvent(overrides: Partial<chain.SurveyCreatedEvent> = {}): chain.SurveyCreatedEvent {
  return {
    surveyId: SURVEY_ID,
    researcher: researcher.address.toLowerCase(),
    surveyHash: surveyHash(survey),
    rate: RATE,
    quota: 2,
    deadline: Math.floor(Date.now() / 1000) + 3600,
    feePerResponse: BigInt(500),
    ...overrides,
  };
}

async function proof(account: PrivateKeyAccount, action: AuthAction, surveyId: number, timestamp = Date.now()) {
  const signature = await account.signMessage({
    message: buildAuthMessage(action, surveyId, account.address, timestamp),
  });
  return { wallet: account.address as string, signature, timestamp };
}

async function authHeaders(account: PrivateKeyAccount, action: AuthAction, surveyId: number): Promise<Headers> {
  const p = await proof(account, action, surveyId);
  return new Headers({
    'x-auth-wallet': p.wallet,
    'x-auth-signature': p.signature,
    'x-auth-timestamp': String(p.timestamp),
  });
}

async function submitBody(account = respondent, overrides: Record<string, unknown> = {}) {
  return {
    surveyId: SURVEY_ID,
    email: ` ${account.address.slice(2, 10)}@Example.com `,
    answers,
    startedAt: Date.now() - 60_000,
    auth: await proof(account, 'submit', SURVEY_ID),
    ...overrides,
  };
}

async function register(): Promise<void> {
  vi.mocked(chain.readSurveyCreated).mockResolvedValue(createdEvent());
  await registerSurvey({ txHash: TX, survey });
}

/** Runs a pipeline through the route wrapper and returns status and JSON. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

async function call(run: () => Promise<unknown>): Promise<{ status: number; json: Json }> {
  const res = await respond(run);
  return { status: res.status, json: await res.json() };
}

function expectError(res: { status: number; json: Json }, code: (typeof ERROR_CODES)[number]): void {
  expect(res.json).toEqual({ error: { code, message: expect.any(String) } });
  expect(res.status).toBe(STATUS_BY_CODE[code]);
}

beforeEach(() => {
  db.reset();
  vi.stubEnv('HASH_SECRET', 'test-secret');
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.mocked(chain.readSurveyCreated).mockReset().mockResolvedValue(null);
  vi.mocked(chain.readClosed).mockReset().mockResolvedValue(null);
  vi.mocked(chain.getReceiptStatus).mockReset().mockResolvedValue({ state: 'pending' });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('error mapping', () => {
  it('uses the HTTP status of TDD section 4 for every code', () => {
    expect(STATUS_BY_CODE).toEqual({
      INVALID_INPUT: 400, WALLET_NOT_VERIFIED: 401, NOT_YOUR_SURVEY: 403, SURVEY_NOT_FOUND: 404,
      RESPONSE_NOT_FOUND: 404, ALREADY_SUBMITTED: 409, SURVEY_CLOSED: 409, SURVEY_PAUSED: 409,
      QUOTA_FULL: 409, TX_NOT_VERIFIED: 422, HASH_MISMATCH: 422, INTERNAL: 500,
    });
    expect(Object.keys(STATUS_BY_CODE).sort()).toEqual([...ERROR_CODES].sort());
  });

  it('hides unexpected errors behind INTERNAL', async () => {
    const res = await call(async () => {
      throw new Error('connection string postgres://secret');
    });
    expectError(res, 'INTERNAL');
    expect(res.json.error.message).not.toContain('secret');
  });

  it('rejects malformed path ids', () => {
    expect(() => parseSurveyId('abc')).toThrow();
    expect(() => parseSurveyId('-1')).toThrow();
    expect(parseSurveyId('12')).toBe(12);
    expect(() => parseResponseId('not-a-uuid')).toThrow();
  });
});

describe('R2 register', () => {
  it('registers from the chain event and is safe to repeat', async () => {
    vi.mocked(chain.readSurveyCreated).mockResolvedValue(createdEvent());
    const first = await call(() => registerSurvey({ txHash: TX, survey }));
    const second = await call(() => registerSurvey({ txHash: TX, survey }));
    expect(first).toEqual({ status: 200, json: { surveyId: SURVEY_ID, sharePath: `/s/${SURVEY_ID}` } });
    expect(second).toEqual(first);

    const row = await db.getSurvey(SURVEY_ID);
    expect(row).toMatchObject({
      researcher: researcher.address.toLowerCase(),
      rateWei: RATE,
      quota: 2,
      feePerResponseWei: BigInt(500),
      txHash: TX_LOWER,
      status: 'open',
    });
  });

  it('takes rate, quota and researcher from the event, never from the body', async () => {
    vi.mocked(chain.readSurveyCreated).mockResolvedValue(createdEvent());
    await registerSurvey({ txHash: TX, survey, researcher: '0x' + '99'.repeat(20), rate: '1', quota: 999 });
    expect(await db.getSurvey(SURVEY_ID)).toMatchObject({ quota: 2, researcher: researcher.address.toLowerCase() });
  });

  it('TX_NOT_VERIFIED when the event is not found', async () => {
    expectError(await call(() => registerSurvey({ txHash: TX, survey })), 'TX_NOT_VERIFIED');
    expect(await db.getSurvey(SURVEY_ID)).toBeNull();
  });

  it('HASH_MISMATCH when the JSON differs from the funded hash', async () => {
    vi.mocked(chain.readSurveyCreated).mockResolvedValue(createdEvent());
    const changed = { ...survey, title: 'Another title' };
    expectError(await call(() => registerSurvey({ txHash: TX, survey: changed })), 'HASH_MISMATCH');
    expect(await db.getSurvey(SURVEY_ID)).toBeNull();
  });

  it('INVALID_INPUT for a bad hash or a bad survey', async () => {
    expectError(await call(() => registerSurvey({ txHash: '0x12', survey })), 'INVALID_INPUT');
    expectError(await call(() => registerSurvey({ txHash: TX, survey: { ...survey, questions: [] } })), 'INVALID_INPUT');
    expectError(await call(() => registerSurvey(null)), 'INVALID_INPUT');
    expect(chain.readSurveyCreated).not.toHaveBeenCalled();
  });
});

describe('R3 list and R4 details', () => {
  beforeEach(register);

  it('lists the surveys of the signed-in wallet', async () => {
    const res = await call(async () => listSurveys(await authHeaders(researcher, 'list_surveys', 0)));
    expect(res.status).toBe(200);
    expect(res.json.surveys).toEqual([
      {
        surveyId: SURVEY_ID,
        title: survey.title,
        status: 'open',
        paused: false,
        rateWei: RATE.toString(),
        quota: 2,
        deadline: expect.any(Number),
        paidCount: 0,
        createdAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      },
    ]);
    const other = await call(async () => listSurveys(await authHeaders(respondent, 'list_surveys', 0)));
    expect(other.json).toEqual({ surveys: [] });
  });

  it('WALLET_NOT_VERIFIED without a valid proof', async () => {
    expectError(await call(() => listSurveys(new Headers())), 'WALLET_NOT_VERIFIED');
    const wrongAction = await authHeaders(researcher, 'view_log', 0);
    expectError(await call(() => listSurveys(wrongAction)), 'WALLET_NOT_VERIFIED');
  });

  it('returns public details with slotsLeft', async () => {
    const res = await call(() => getSurveyDetails(SURVEY_ID));
    expect(res.json).toEqual({
      surveyId: SURVEY_ID,
      survey,
      rateWei: RATE.toString(),
      quota: 2,
      deadline: expect.any(Number),
      status: 'open',
      paused: false,
      slotsLeft: 2,
    });
    await submitResponse(await submitBody());
    expect((await getSurveyDetails(SURVEY_ID)).slotsLeft).toBe(1);
    expectError(await call(() => getSurveyDetails(999)), 'SURVEY_NOT_FOUND');
  });
});

describe('R5 submit', () => {
  beforeEach(register);

  it('stores a received response with a lowercase wallet and normalized email', async () => {
    const body = await submitBody();
    const res = await call(() => submitResponse(body));
    expect(res.status).toBe(200);
    expect(res.json).toEqual({ responseId: expect.stringMatching(/^[0-9a-f-]{36}$/) });
    expect(await db.getResponse(res.json.responseId)).toMatchObject({
      wallet: respondent.address.toLowerCase(),
      email: `${respondent.address.slice(2, 10).toLowerCase()}@example.com`,
      status: 'received',
      answers,
    });
  });

  it('ALREADY_SUBMITTED for the same wallet, and for the same email from another wallet', async () => {
    const body = await submitBody();
    await submitResponse(body);
    expectError(await call(() => submitResponse(body)), 'ALREADY_SUBMITTED');
    const other = privateKeyToAccount(generatePrivateKey());
    const sameEmail = await submitBody(other, { email: body.email.toUpperCase() });
    expectError(await call(() => submitResponse(sameEmail)), 'ALREADY_SUBMITTED');
  });

  it('SURVEY_NOT_FOUND, SURVEY_CLOSED, SURVEY_PAUSED', async () => {
    expectError(await call(async () => submitResponse(await submitBody(respondent, { surveyId: 999 }))), 'SURVEY_NOT_FOUND');
    db.patchSurvey(SURVEY_ID, { paused: true });
    expectError(await call(async () => submitResponse(await submitBody())), 'SURVEY_PAUSED');
    db.patchSurvey(SURVEY_ID, { paused: false, deadline: Math.floor(Date.now() / 1000) - 1 });
    expectError(await call(async () => submitResponse(await submitBody())), 'SURVEY_CLOSED');
    db.patchSurvey(SURVEY_ID, { deadline: Math.floor(Date.now() / 1000) + 3600, status: 'closed' });
    expectError(await call(async () => submitResponse(await submitBody())), 'SURVEY_CLOSED');
  });

  it('QUOTA_FULL once received, processing and paid responses fill the quota', async () => {
    const a = privateKeyToAccount(generatePrivateKey());
    const b = privateKeyToAccount(generatePrivateKey());
    const first = await submitResponse(await submitBody(a));
    await submitResponse(await submitBody(b));
    expectError(await call(async () => submitResponse(await submitBody())), 'QUOTA_FULL');
    // A blocked or review response frees its slot.
    db.patchResponse(first.responseId, { status: 'review' });
    expect((await call(async () => submitResponse(await submitBody()))).status).toBe(200);
  });

  it('WALLET_NOT_VERIFIED for a proof signed for another survey or by another key', async () => {
    const wrongSurvey = await submitBody(respondent, { auth: await proof(respondent, 'submit', SURVEY_ID + 1) });
    expectError(await call(() => submitResponse(wrongSurvey)), 'WALLET_NOT_VERIFIED');
    const forged = await proof(researcher, 'submit', SURVEY_ID);
    const wrongSigner = await submitBody(respondent, { auth: { ...forged, wallet: respondent.address } });
    expectError(await call(() => submitResponse(wrongSigner)), 'WALLET_NOT_VERIFIED');
  });

  it('INVALID_INPUT for bad email, answers, startedAt or shape', async () => {
    const bad = async (overrides: Record<string, unknown>) =>
      call(async () => submitResponse(await submitBody(respondent, overrides)));
    expectError(await bad({ email: 'not-an-email' }), 'INVALID_INPUT');
    expectError(await bad({ answers: { ...answers, q1: 9 } }), 'INVALID_INPUT');
    expectError(await bad({ answers: { ...answers, extra: 'x' } }), 'INVALID_INPUT');
    expectError(await bad({ startedAt: Date.now() + 60_000 }), 'INVALID_INPUT');
    expectError(await bad({ startedAt: Date.now() - 25 * 60 * 60 * 1000 }), 'INVALID_INPUT');
    expectError(await bad({ surveyId: 'twelve' }), 'INVALID_INPUT');
    expectError(await bad({ auth: undefined }), 'INVALID_INPUT');
  });
});

describe('R8 log', () => {
  beforeEach(register);

  it('returns survey, summary and rows, newest first', async () => {
    const a = privateKeyToAccount(generatePrivateKey());
    const paid = await submitResponse(await submitBody(a));
    db.patchResponse(paid.responseId, { status: 'processing', submittedAt: new Date(Date.now() - 10_000) });
    const d = await db.insertDecision({
      responseId: paid.responseId, result: 'pay', reasons: ['ok'], reasonHash: TX_LOWER,
      signals: { hardFails: [], weak: [] }, ai: null, llmModel: 'm', rubricVersion: 'v1', status: 'pending',
    });
    await db.markDecisionSent(d!.id, CLOSE_TX);
    const waiting = await submitResponse(await submitBody());

    // The log route settles the sent decision first.
    vi.mocked(chain.getReceiptStatus).mockResolvedValue({ state: 'success' });
    const res = await call(async () => getLog(SURVEY_ID, await authHeaders(researcher, 'view_log', SURVEY_ID)));
    expect(res.status).toBe(200);
    expect(res.json.survey).toMatchObject({
      surveyId: SURVEY_ID, status: 'open', paidCount: 1, rateWei: RATE.toString(), refundedWei: null, closeTxHash: null,
    });
    expect(res.json.summary).toEqual({
      responses: 2, paid: 1, blocked: 0, review: 0, pending: 1,
      budgetWei: (RATE * BigInt(2)).toString(),
      paidWei: RATE.toString(),
      remainingWei: RATE.toString(),
    });
    expect(res.json.rows.map((r: { responseId: string }) => r.responseId)).toEqual([waiting.responseId, paid.responseId]);
    expect(res.json.rows[1]).toEqual({
      responseId: paid.responseId,
      submittedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      wallet: a.address.toLowerCase(),
      email: expect.stringContaining('@example.com'),
      answers,
      status: 'paid',
      result: 'pay',
      reasons: ['ok'],
      decisionStatus: 'confirmed',
      txHash: CLOSE_TX,
      explorerUrl: `https://testnet.bscscan.com/tx/${CLOSE_TX}`,
      llmModel: 'm',
      rubricVersion: 'v1',
    });
    expect(res.json.rows[0]).toMatchObject({
      status: 'received', result: null, reasons: [], decisionStatus: null, txHash: null, explorerUrl: null,
      llmModel: null, rubricVersion: null,
    });
  });

  it('SURVEY_NOT_FOUND, WALLET_NOT_VERIFIED, NOT_YOUR_SURVEY', async () => {
    expectError(await call(async () => getLog(999, await authHeaders(researcher, 'view_log', 999))), 'SURVEY_NOT_FOUND');
    expectError(await call(() => getLog(SURVEY_ID, new Headers())), 'WALLET_NOT_VERIFIED');
    expectError(
      await call(async () => getLog(SURVEY_ID, await authHeaders(respondent, 'view_log', SURVEY_ID))),
      'NOT_YOUR_SURVEY',
    );
  });
});

describe('R9 closed', () => {
  beforeEach(register);

  it('closes from the Closed event, is safe to repeat, and zeroes the remaining budget', async () => {
    vi.mocked(chain.readClosed).mockResolvedValue({
      surveyId: SURVEY_ID, researcher: researcher.address.toLowerCase(), refunded: RATE * BigInt(2),
    });
    const first = await call(() => markSurveyClosed(SURVEY_ID, { txHash: CLOSE_TX }));
    expect(first).toEqual({
      status: 200,
      json: { surveyId: SURVEY_ID, status: 'closed', refundedWei: (RATE * BigInt(2)).toString(), closeTxHash: CLOSE_TX },
    });
    expect(await call(() => markSurveyClosed(SURVEY_ID, { txHash: CLOSE_TX }))).toEqual(first);

    const log = await getLog(SURVEY_ID, await authHeaders(researcher, 'view_log', SURVEY_ID));
    expect(log.survey).toMatchObject({ status: 'closed', refundedWei: (RATE * BigInt(2)).toString(), closeTxHash: CLOSE_TX });
    expect(log.summary.remainingWei).toBe('0');
    expectError(await call(async () => submitResponse(await submitBody())), 'SURVEY_CLOSED');
  });

  it('TX_NOT_VERIFIED when there is no event or it is for another survey', async () => {
    expectError(await call(() => markSurveyClosed(SURVEY_ID, { txHash: CLOSE_TX })), 'TX_NOT_VERIFIED');
    vi.mocked(chain.readClosed).mockResolvedValue({ surveyId: SURVEY_ID + 1, researcher: 'x', refunded: RATE });
    expectError(await call(() => markSurveyClosed(SURVEY_ID, { txHash: CLOSE_TX })), 'TX_NOT_VERIFIED');
    expect((await db.getSurvey(SURVEY_ID))?.status).toBe('open');
  });

  it('SURVEY_NOT_FOUND and INVALID_INPUT', async () => {
    expectError(await call(() => markSurveyClosed(999, { txHash: CLOSE_TX })), 'SURVEY_NOT_FOUND');
    expectError(await call(() => markSurveyClosed(SURVEY_ID, { txHash: 'nope' })), 'INVALID_INPUT');
  });
});
