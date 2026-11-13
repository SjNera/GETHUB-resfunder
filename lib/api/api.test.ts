// Pipelines R2 to R5, R8, R9 against the in-memory database and mocked chain reads.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { generatePrivateKey, privateKeyToAccount, type PrivateKeyAccount } from 'viem/accounts';
import demo from '../../data/demo-survey.json';
import { buildAuthMessage } from '../auth/message';
import { surveyHash } from '../canonical';
import * as chain from '../chain/escrow';
import * as db from '../db/memory';
import { ERROR_CODES, type Answers, type AuthAction, type Hex, type SurveyJson } from '../types';
import { parseResponseId, readJson, respond, safeErrorText, STATUS_BY_CODE } from './errors';
import { getLog } from './log';
import { submitResponse } from './submit';
import { listMyResponses } from './history';
import { setMyPassword, type PasswordAuth } from './password';
import { fastLineMs, getScreening } from './screening';
import type { ScreeningRow } from './shapes';
import { getMyProfile, saveMyProfile } from './profile';
import { getSurveyDetails, listOpen, listSurveys, markSurveyClosed, parseSurveyId, pauseSurvey, registerSurvey } from './surveys';

vi.mock('../db/queries', () => import('../db/memory'));
const sessionWallet = vi.hoisted(() => ({ current: null as string | null }));
vi.mock('../auth/session', () => ({
  requireSession: async () => {
    if (!sessionWallet.current) {
      const { ApiFailure } = await import('./errors');
      throw new ApiFailure('WALLET_NOT_VERIFIED', 'Sign in to continue.');
    }
    return { userId: 'u-' + sessionWallet.current, email: 'x@example.com', wallet: sessionWallet.current };
  },
}));
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
  vi.stubEnv('HASH_SECRET', 'test-secret-'.repeat(4));
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

  it('marks every response as not cacheable and not sniffable', async () => {
    const ok = await respond(async () => ({ fine: true }));
    const failed = await respond(async () => {
      throw new Error('boom');
    });
    for (const res of [ok, failed]) {
      expect(res.headers.get('cache-control')).toBe('no-store');
      expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    }
  });

  it('logs unexpected errors without URLs, keys or line breaks', async () => {
    const key = `0x${'7a'.repeat(32)}`;
    await respond(async () => {
      throw new Error(`fetch failed\nURL: https://rpc.example/v3/SECRETKEY and postgres://user:pw@host/db key ${key}`);
    });
    const logged = vi.mocked(console.error).mock.calls[0].join(' ');
    expect(logged).toContain('fetch failed');
    expect(logged).not.toMatch(/SECRETKEY|user:pw|7a7a7a|\n/);
    expect(safeErrorText({ shortMessage: 'nonce too low', message: 'long text https://x.example/key' })).toBe('nonce too low');
    expect(safeErrorText('x'.repeat(1000))).toHaveLength(300);
  });
});

describe('readJson', () => {
  function post(body: BodyInit, headers: Record<string, string> = { 'content-type': 'application/json' }): Request {
    return new Request('http://localhost/api/submit', { method: 'POST', body, headers });
  }
  const invalid = async (request: Request, maxBytes?: number) =>
    expectError(await call(() => readJson(request, maxBytes)), 'INVALID_INPUT');

  it('reads a JSON object', async () => {
    expect(await readJson(post('{"a":1}'))).toEqual({ a: 1 });
    expect(await readJson(post('{"a":"ñ 😀"}', { 'content-type': 'application/json; charset=utf-8' }))).toEqual({ a: 'ñ 😀' });
  });

  it('rejects another content type', async () => {
    await invalid(post('{"a":1}', { 'content-type': 'text/plain' }));
    await invalid(post('a=1', { 'content-type': 'application/x-www-form-urlencoded' }));
    await invalid(post('{"a":1}', {}));
  });

  it('rejects a body over the limit, with or without a content-length header', async () => {
    const big = JSON.stringify({ a: 'x'.repeat(200) });
    await invalid(post(big), 100);
    await invalid(post(big, { 'content-type': 'application/json', 'content-length': '5' }), 100);
    await invalid(post('{}', { 'content-type': 'application/json', 'content-length': '999999999' }), 100);
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        for (let i = 0; i < 10; i++) controller.enqueue(new TextEncoder().encode('x'.repeat(50)));
        controller.close();
      },
    });
    const streamed = new Request('http://localhost/api/submit', {
      method: 'POST', body: stream, headers: { 'content-type': 'application/json' }, duplex: 'half',
    } as RequestInit);
    await invalid(streamed, 100);
    expect(await readJson(post(big), 1000)).toEqual(JSON.parse(big));
  });

  it('rejects bad JSON, bad UTF-8, an empty body and non-objects', async () => {
    await invalid(post('{"a":'));
    await invalid(post(new Uint8Array([0x7b, 0x22, 0xff, 0x22, 0x3a, 0x31, 0x7d])));
    await invalid(post(''));
    await invalid(post('[1,2]'));
    await invalid(post('null'));
    await invalid(post('"text"'));
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

  it('TX_NOT_VERIFIED when the event holds values the database cannot store', async () => {
    const outOfRange: Partial<chain.SurveyCreatedEvent>[] = [
      { quota: 2_147_483_648 },
      { quota: 0 },
      { quota: 1.5 },
      { surveyId: 0 },
      { surveyId: Number.MAX_SAFE_INTEGER + 2 },
      { deadline: Number.POSITIVE_INFINITY },
      { rate: BigInt(0) },
      { researcher: 'not-a-wallet' },
    ];
    for (const overrides of outOfRange) {
      vi.mocked(chain.readSurveyCreated).mockResolvedValue(createdEvent(overrides));
      expectError(await call(() => registerSurvey({ txHash: TX, survey })), 'TX_NOT_VERIFIED');
    }
    expect(await db.getSurvey(SURVEY_ID)).toBeNull();
  });

  it('TX_NOT_VERIFIED when the survey id is already registered from another transaction', async () => {
    vi.mocked(chain.readSurveyCreated).mockResolvedValue(createdEvent());
    await registerSurvey({ txHash: TX, survey });
    expectError(await call(() => registerSurvey({ txHash: CLOSE_TX, survey })), 'TX_NOT_VERIFIED');
    expect((await db.getSurvey(SURVEY_ID))?.txHash).toBe(TX_LOWER);
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

  it('INVALID_INPUT for emails that are malformed, oversized or could start a spreadsheet formula', async () => {
    const bad = async (email: string) => call(async () => submitResponse(await submitBody(respondent, { email })));
    for (const email of [
      'a@b', 'a@@b.com', 'a b@c.com', 'a@b..com', '.a@b.com', 'a.@b.com', 'a@-b.com', 'a@b.c',
      '=cmd@b.com', '+1@b.com', '-1@b.com', '@b.com', 'a\u0000@b.com', '<a>@b.com', 'ñ@b.com',
      `${'a'.repeat(65)}@b.com`, `a@${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(63)}.${'e'.repeat(63)}.com`,
    ]) {
      expectError(await bad(email), 'INVALID_INPUT');
    }
    for (const email of ['example@email.com', 'j_d+survey%1@mail-server.example.org']) {
      db.reset();
      await register();
      expect((await bad(email)).status).toBe(200);
    }
  });

  it('INVALID_INPUT for oversized or unstorable answers and a signature that is not 65 bytes', async () => {
    const bad = async (overrides: Record<string, unknown>) =>
      call(async () => submitResponse(await submitBody(respondent, overrides)));
    expectError(await bad({ answers: { ...answers, q8: 'x'.repeat(5001) } }), 'INVALID_INPUT');
    expectError(await bad({ answers: { ...answers, q8: 'text\u0000' } }), 'INVALID_INPUT');
    expectError(await bad({ answers: { ...answers, q1: 2.5 } }), 'INVALID_INPUT');
    expectError(await bad({ answers: { ...answers, q1: [4] } }), 'INVALID_INPUT');
    const many = Object.fromEntries(Array.from({ length: 31 }, (_, i) => [`k${i}`, 1]));
    expectError(await bad({ answers: many }), 'INVALID_INPUT');
    const p = await proof(respondent, 'submit', SURVEY_ID);
    expectError(await bad({ auth: { ...p, signature: `0x${'ab'.repeat(5000)}` } }), 'INVALID_INPUT');
    expectError(await bad({ auth: { ...p, timestamp: 1.5 } }), 'INVALID_INPUT');
    expect(await db.listLogRecords(SURVEY_ID)).toEqual([]);
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

describe('screening details', () => {
  beforeEach(register);

  it('returns checks, the AI result with its flagged answers, and timing, newest first', async () => {
    const runs = [{ label: 'valid' as const, type: null, injection: false, reason: 'Names a challenge.' }, null];
    const flagged = [{ questionId: 'q7', label: 'unclear' as const, type: 'other' as const, injection: false, agreed: false, reason: 'The AI check was inconclusive.', runs }];
    const review = await submitResponse(await submitBody(privateKeyToAccount(generatePrivateKey())));
    db.patchResponse(review.responseId, { startedAt: new Date(Date.now() - 200_000), submittedAt: new Date(Date.now() - 10_000) });
    await db.insertDecision({
      responseId: review.responseId, result: 'review', reasons: ['x'], reasonHash: TX_LOWER,
      signals: { hardFails: [], weak: ['too_fast'] },
      ai: Object.assign({ label: 'unclear' as const, type: 'other' as const, injection: false, reason: 'The AI check was inconclusive.', agreed: false }, { flagged }),
      llmModel: 'm', rubricVersion: 'v1', status: 'off_chain',
    });
    const waiting = await submitResponse(await submitBody());

    const res = await call(async () => getScreening(SURVEY_ID, await authHeaders(researcher, 'view_log', SURVEY_ID)));
    expect(res.status).toBe(200);
    const rows = res.json.rows as ScreeningRow[];
    expect(rows.map((r) => r.responseId)).toEqual([waiting.responseId, review.responseId]);
    expect(rows[1]).toEqual({
      responseId: review.responseId,
      durationMs: 190_000,
      fastLineMs: 2000 * survey.questions.length,
      screened: true,
      hardFails: [],
      weak: ['too_fast'],
      ai: { label: 'unclear', type: 'other', injection: false, agreed: false, reason: 'The AI check was inconclusive.', flagged },
    });
    expect(rows[1].ai?.flagged?.[0].runs).toEqual(runs);
    expect(rows[0]).toMatchObject({ screened: false, hardFails: [], weak: [], ai: null });
  });

  it('uses half the median of earlier responses once there are 10', () => {
    expect(fastLineMs([10, 20, 30, 40, 50, 60, 70, 80, 90, 100], 9)).toBe(27.5);
    expect(fastLineMs([10, 20], 9)).toBe(18_000);
  });

  it('SURVEY_NOT_FOUND, WALLET_NOT_VERIFIED, NOT_YOUR_SURVEY', async () => {
    expectError(await call(async () => getScreening(999, await authHeaders(researcher, 'view_log', 999))), 'SURVEY_NOT_FOUND');
    expectError(await call(() => getScreening(SURVEY_ID, new Headers())), 'WALLET_NOT_VERIFIED');
    expectError(
      await call(async () => getScreening(SURVEY_ID, await authHeaders(respondent, 'view_log', SURVEY_ID))),
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

describe('R10 pause', () => {
  beforeEach(register);
  const pauseBody = async (account: PrivateKeyAccount, paused: boolean, surveyId = SURVEY_ID, action: AuthAction = 'pause') => ({
    paused,
    auth: await proof(account, action, surveyId),
  });

  it('pauses and resumes for the researcher, and a paused survey refuses new submissions', async () => {
    expect(await call(async () => pauseSurvey(SURVEY_ID, await pauseBody(researcher, true)))).toEqual({
      status: 200,
      json: { surveyId: SURVEY_ID, paused: true },
    });
    expect((await getSurveyDetails(SURVEY_ID)).paused).toBe(true);
    expectError(await call(async () => submitResponse(await submitBody())), 'SURVEY_PAUSED');
    await pauseSurvey(SURVEY_ID, await pauseBody(researcher, false));
    expect((await getSurveyDetails(SURVEY_ID)).paused).toBe(false);
    expect(await submitResponse(await submitBody())).toHaveProperty('responseId');
  });

  it('NOT_YOUR_SURVEY for another wallet, WALLET_NOT_VERIFIED for a proof of another action or survey', async () => {
    expectError(await call(async () => pauseSurvey(SURVEY_ID, await pauseBody(respondent, true))), 'NOT_YOUR_SURVEY');
    expectError(await call(async () => pauseSurvey(SURVEY_ID, await pauseBody(researcher, true, SURVEY_ID, 'view_log'))), 'WALLET_NOT_VERIFIED');
    expectError(await call(async () => pauseSurvey(SURVEY_ID, { paused: true, auth: await proof(researcher, 'pause', SURVEY_ID + 1) })), 'WALLET_NOT_VERIFIED');
    expect((await getSurveyDetails(SURVEY_ID)).paused).toBe(false);
  });

  it('SURVEY_NOT_FOUND, SURVEY_CLOSED and INVALID_INPUT', async () => {
    expectError(await call(async () => pauseSurvey(999, await pauseBody(researcher, true, 999))), 'SURVEY_NOT_FOUND');
    expectError(await call(() => pauseSurvey(SURVEY_ID, { paused: 'yes' })), 'INVALID_INPUT');
    db.patchSurvey(SURVEY_ID, { status: 'closed' });
    expectError(await call(async () => pauseSurvey(SURVEY_ID, await pauseBody(researcher, true))), 'SURVEY_CLOSED');
  });
});

describe('open surveys list', () => {
  it('lists surveys that accept answers, with no questions in the rows', async () => {
    expect((await call(() => listOpen())).json).toEqual({ surveys: [] });
    await register();
    const { json } = await call(() => listOpen());
    expect(json.surveys).toHaveLength(1);
    expect(json.surveys[0]).toMatchObject({
      surveyId: SURVEY_ID, title: survey.title, questionCount: survey.questions.length, rateWei: RATE.toString(),
      quota: 2, slotsLeft: 2, researcher: researcher.address.toLowerCase(),
    });
    expect(json.surveys[0]).not.toHaveProperty('questions');
  });

  it('drops paused, closed, past-deadline and full surveys', async () => {
    await register();
    db.patchSurvey(SURVEY_ID, { paused: true });
    expect((await listOpen()).surveys).toHaveLength(0);
    db.patchSurvey(SURVEY_ID, { paused: false, status: 'closed' });
    expect((await listOpen()).surveys).toHaveLength(0);
    db.patchSurvey(SURVEY_ID, { status: 'open', deadline: Math.floor(Date.now() / 1000) - 1 });
    expect((await listOpen()).surveys).toHaveLength(0);
    db.patchSurvey(SURVEY_ID, { deadline: Math.floor(Date.now() / 1000) + 3600 });
    const a = privateKeyToAccount(generatePrivateKey());
    const b = privateKeyToAccount(generatePrivateKey());
    await submitResponse(await submitBody(a));
    expect((await listOpen()).surveys[0].slotsLeft).toBe(1);
    await submitResponse(await submitBody(b));
    expect((await listOpen()).surveys).toHaveLength(0);
  });
});

describe('my responses', () => {
  beforeEach(register);
  afterEach(() => {
    sessionWallet.current = null;
  });

  it('WALLET_NOT_VERIFIED without a session', async () => {
    expectError(await call(() => listMyResponses(new Headers())), 'WALLET_NOT_VERIFIED');
  });

  it("returns only the wallet's own responses, with their decision", async () => {
    const other = privateKeyToAccount(generatePrivateKey());
    const mine = await submitResponse(await submitBody(respondent));
    await submitResponse(await submitBody(other));
    const decision = await db.insertDecision({
      responseId: mine.responseId, result: 'pay', reasons: ['Passed all checks.'], reasonHash: `0x${'11'.repeat(32)}`,
      signals: { hardFails: [], weak: [] }, ai: null, llmModel: null, rubricVersion: 'v1', status: 'pending',
    });
    await db.markDecisionSent(decision!.id, TX_LOWER);
    await db.confirmDecision(decision!.id, 'paid');

    sessionWallet.current = respondent.address.toLowerCase();
    const { status, json } = await call(() => listMyResponses(new Headers()));
    expect(status).toBe(200);
    expect(json.responses).toHaveLength(1);
    expect(json.responses[0]).toMatchObject({
      responseId: mine.responseId, surveyId: SURVEY_ID, surveyTitle: survey.title, rateWei: RATE.toString(),
      status: 'paid', result: 'pay', reasons: ['Passed all checks.'], txHash: TX_LOWER,
      explorerUrl: `https://testnet.bscscan.com/tx/${TX_LOWER}`,
    });
    expect(json.responses[0]).not.toHaveProperty('answers');
    expect(json.responses[0]).not.toHaveProperty('email');

    sessionWallet.current = other.address.toLowerCase();
    expect((await listMyResponses(new Headers())).responses).toHaveLength(1);
    sessionWallet.current = researcher.address.toLowerCase();
    expect((await listMyResponses(new Headers())).responses).toHaveLength(0);
  });
});

describe('profile', () => {
  afterEach(() => {
    sessionWallet.current = null;
  });
  const profile = { who: 'student', age: '18-24', sex: 'female', region: 'NCR · Metro Manila', city: 'Makati', c1: true, c2: true, g1: 'college', g2: 'computing' };

  it('saves, replaces and returns only the signed-in own profile', async () => {
    sessionWallet.current = respondent.address.toLowerCase();
    expect((await getMyProfile(new Headers())).profile).toBeNull();
    expect(await call(() => saveMyProfile(new Headers(), { profile }))).toEqual({ status: 200, json: { saved: true } });
    await saveMyProfile(new Headers(), { profile: { ...profile, city: 'Taguig' } });
    expect((await getMyProfile(new Headers())).profile).toMatchObject({ city: 'Taguig', age: '18-24' });
    expect((await getMyProfile(new Headers())).wallet).toBe(respondent.address.toLowerCase());
    sessionWallet.current = researcher.address.toLowerCase();
    expect((await getMyProfile(new Headers())).profile).toBeNull();
  });

  it('WALLET_NOT_VERIFIED without a session, INVALID_INPUT for unknown fields, long text and under 18', async () => {
    expectError(await call(() => saveMyProfile(new Headers(), { profile })), 'WALLET_NOT_VERIFIED');
    sessionWallet.current = respondent.address.toLowerCase();
    expectError(await call(() => saveMyProfile(new Headers(), { profile: { ...profile, admin: true } })), 'INVALID_INPUT');
    expectError(await call(() => saveMyProfile(new Headers(), { profile: { city: 'x'.repeat(81) } })), 'INVALID_INPUT');
    expectError(await call(() => saveMyProfile(new Headers(), { profile: { age: 'under_18' } })), 'INVALID_INPUT');
    expectError(await call(() => saveMyProfile(new Headers(), { nope: 1 })), 'INVALID_INPUT');
    expect((await getMyProfile(new Headers())).profile).toBeNull();
  });
});

describe('password', () => {
  afterEach(() => {
    sessionWallet.current = null;
  });
  const fakeAuth = (setPassword: PasswordAuth['api']['setPassword']) => ({ api: { setPassword: vi.fn(setPassword) } });

  it('sets the password on the signed-in account', async () => {
    sessionWallet.current = respondent.address.toLowerCase();
    const auth = fakeAuth(async () => ({ status: true }));
    expect(await call(() => setMyPassword(new Headers(), { password: 'sampaguita24' }, auth))).toEqual({ status: 200, json: { saved: true } });
    expect(auth.api.setPassword).toHaveBeenCalledWith({ body: { newPassword: 'sampaguita24' }, headers: expect.any(Headers) });
  });

  it('INVALID_INPUT for a short, long or missing password, and when one is already set', async () => {
    sessionWallet.current = respondent.address.toLowerCase();
    const ok = fakeAuth(async () => ({ status: true }));
    expectError(await call(() => setMyPassword(new Headers(), { password: 'short' }, ok)), 'INVALID_INPUT');
    expectError(await call(() => setMyPassword(new Headers(), { password: 'x'.repeat(129) }, ok)), 'INVALID_INPUT');
    expectError(await call(() => setMyPassword(new Headers(), {}, ok)), 'INVALID_INPUT');
    expect(ok.api.setPassword).not.toHaveBeenCalled();
    const taken = fakeAuth(async () => {
      throw Object.assign(new Error('User already has a password set'), { body: { code: 'PASSWORD_ALREADY_SET' } });
    });
    expectError(await call(() => setMyPassword(new Headers(), { password: 'sampaguita24' }, taken)), 'INVALID_INPUT');
  });

  it('WALLET_NOT_VERIFIED without a session', async () => {
    const auth = fakeAuth(async () => ({ status: true }));
    expectError(await call(() => setMyPassword(new Headers(), { password: 'sampaguita24' }, auth)), 'WALLET_NOT_VERIFIED');
    expect(auth.api.setPassword).not.toHaveBeenCalled();
  });
});
