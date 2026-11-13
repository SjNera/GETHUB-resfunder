// Review decisions and appeals against the in-memory database, a mocked session and mocked chain calls.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { ZodError } from 'zod';
import demo from '../../data/demo-survey.json';
import { ApiFailure } from '../api/errors';
import { buildAuthMessage } from '../auth/message';
import { reasonHash } from '../canonical';
import * as chain from '../chain/escrow';
import * as db from '../db/memory';
import type { Answers, Hex, SurveyJson } from '../types';
import { decideResponse, fileAppeal, listAppeals } from './review';

const session = vi.hoisted(() => ({ wallet: null as string | null }));
vi.mock('../db/queries', () => import('../db/memory'));
vi.mock('../auth/session', () => ({
  requireSession: async () => {
    if (!session.wallet) throw new (await import('../api/errors')).ApiFailure('WALLET_NOT_VERIFIED', 'Sign in to continue.');
    return { userId: 'u', email: 'x@example.com', wallet: session.wallet };
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
const RESEARCHER = researcher.address.toLowerCase();
const RESPONDENT = '0x' + '11'.repeat(20);
const TX = `0x${'ab'.repeat(32)}` as Hex;
const SURVEY_ID = 1;
const answers: Answers = { q1: 4, q2: 3, q3: 5, q4: 2, q5: 4, q6: '1 to 2 hours', q7: 'idk', q8: 'it depends' };
const H = new Headers();

async function reviewResponse(wallet = RESPONDENT): Promise<string> {
  const id = await db.insertResponse({ surveyId: SURVEY_ID, wallet, email: `${wallet}@example.com`, emailHash: wallet, answers, startedAt: new Date(Date.now() - 60_000) });
  await db.insertDecision({
    responseId: id, result: 'review', reasons: ['The AI check was inconclusive.'], reasonHash: reasonHash(['x']),
    signals: { hardFails: [], weak: [] }, ai: null, llmModel: 'm', rubricVersion: 'v1', status: 'off_chain',
  });
  return id;
}

let events: string[];
beforeEach(async () => {
  db.reset();
  events = [];
  session.wallet = RESEARCHER;
  vi.mocked(chain.sendDecision).mockReset().mockImplementation(async () => {
    events.push('send');
    return TX;
  });
  vi.mocked(chain.waitForReceipt).mockReset().mockResolvedValue({ state: 'success' });
  vi.mocked(chain.getReceiptStatus).mockReset().mockResolvedValue({ state: 'success' });
  await db.insertSurvey({
    surveyId: SURVEY_ID, researcher: RESEARCHER, survey, surveyHash: TX, rateWei: BigInt(1000), quota: 3,
    deadline: Math.floor(Date.now() / 1000) + 3600, feePerResponseWei: BigInt(10), txHash: TX,
  });
});

// The route wrapper turns a ZodError into INVALID_INPUT, so the helper does the same.
const code = async (p: Promise<unknown>) =>
  p.then(() => 'ok', (e) => (e instanceof ApiFailure ? e.code : e instanceof ZodError ? 'INVALID_INPUT' : `other:${e}`));

describe('decide: pay a response in review', () => {
  it('saves the decision first, then sends, then marks the response paid', async () => {
    const id = await reviewResponse();
    vi.mocked(chain.sendDecision).mockImplementation(async () => {
      const d = await db.getDecision(id);
      expect(d?.status).toBe('pending');
      expect(d?.result).toBe('pay');
      events.push('send');
      return TX;
    });
    const res = await decideResponse(id, H, { decision: 'pay' });
    expect(res).toMatchObject({ status: 'paid', result: 'pay', txHash: TX });
    expect(res.reasons).toEqual(['The AI check was inconclusive.', 'Paid by the researcher after review.']);
    const d = await db.getDecision(id);
    expect(d?.status).toBe('confirmed');
    expect(d?.reasonHash).toBe(reasonHash(res.reasons));
    expect(events).toEqual(['send']);
  });

  it('a reverted payment goes back to review and can be tried again', async () => {
    const id = await reviewResponse();
    vi.mocked(chain.sendDecision).mockRejectedValueOnce(new Error('execution reverted'));
    expect((await decideResponse(id, H, { decision: 'pay' })).status).toBe('review');
    expect((await db.getDecision(id))?.status).toBe('failed');
    expect((await decideResponse(id, H, { decision: 'pay' })).status).toBe('paid');
  });

  it('refuses a closed survey, a passed deadline and a full quota', async () => {
    const id = await reviewResponse();
    db.patchSurvey(SURVEY_ID, { status: 'closed' });
    expect(await code(decideResponse(id, H, { decision: 'pay' }))).toBe('SURVEY_CLOSED');
    db.patchSurvey(SURVEY_ID, { status: 'open', deadline: Math.floor(Date.now() / 1000) - 5 });
    expect(await code(decideResponse(id, H, { decision: 'pay' }))).toBe('SURVEY_CLOSED');
    db.patchSurvey(SURVEY_ID, { deadline: Math.floor(Date.now() / 1000) + 3600, quota: 0 });
    expect(await code(decideResponse(id, H, { decision: 'pay' }))).toBe('QUOTA_FULL');
    expect(chain.sendDecision).not.toHaveBeenCalled();
  });
});

describe('decide: reject a response in review', () => {
  it('needs a reason, saves it off chain and sends nothing', async () => {
    const id = await reviewResponse();
    expect(await code(decideResponse(id, H, { decision: 'dont_pay' }))).toBe('INVALID_INPUT');
    expect(await code(decideResponse(id, H, { decision: 'dont_pay', reason: 'because' }))).toBe('INVALID_INPUT');
    const res = await decideResponse(id, H, { decision: 'dont_pay', reason: 'too_vague' });
    expect(res).toMatchObject({ status: 'blocked', result: 'dont_pay', txHash: null });
    expect(res.reasons.at(-1)).toBe('Not paid by the researcher: The answer was too vague to count.');
    expect((await db.getDecision(id))?.status).toBe('off_chain');
    expect(chain.sendDecision).not.toHaveBeenCalled();
  });
});

describe('decide: who and when', () => {
  it('WALLET_NOT_VERIFIED without a session, NOT_YOUR_SURVEY for another wallet', async () => {
    const id = await reviewResponse();
    session.wallet = null;
    expect(await code(decideResponse(id, H, { decision: 'pay' }))).toBe('WALLET_NOT_VERIFIED');
    session.wallet = RESPONDENT;
    expect(await code(decideResponse(id, H, { decision: 'pay' }))).toBe('NOT_YOUR_SURVEY');
    expect((await db.getResponse(id))?.status).toBe('review');
  });

  it('only a response in review can be decided, and only once', async () => {
    const id = await reviewResponse();
    await decideResponse(id, H, { decision: 'pay' });
    expect(await code(decideResponse(id, H, { decision: 'pay' }))).toBe('INVALID_INPUT');
    const paid = await db.insertResponse({ surveyId: SURVEY_ID, wallet: '0x' + '22'.repeat(20), email: 'b@example.com', emailHash: 'b', answers, startedAt: new Date(Date.now() - 1000) });
    expect(await code(decideResponse(paid, H, { decision: 'pay' }))).toBe('INVALID_INPUT');
    expect(await code(decideResponse('00000000-0000-0000-0000-000000000000', H, { decision: 'pay' }))).toBe('RESPONSE_NOT_FOUND');
    expect(await code(decideResponse(id, H, { decision: 'maybe' }))).toBe('INVALID_INPUT');
  });

  it('a code-confirmed Don\'t pay (confirmed on chain) can not be decided or appealed', async () => {
    const id = await db.insertResponse({ surveyId: SURVEY_ID, wallet: RESPONDENT, email: 'c@example.com', emailHash: 'c', answers, startedAt: new Date(Date.now() - 1000) });
    const d = await db.insertDecision({ responseId: id, result: 'dont_pay', reasons: ['An open-ended answer was empty.'], reasonHash: reasonHash(['x']), signals: { hardFails: [{ check: 'empty', questionId: 'q7' }], weak: [] }, ai: null, llmModel: null, rubricVersion: 'v1', status: 'pending' });
    await db.markDecisionSent(d!.id, TX);
    await db.confirmDecision(d!.id, 'blocked');
    expect(await code(decideResponse(id, H, { decision: 'pay' }))).toBe('INVALID_INPUT');
    session.wallet = RESPONDENT;
    expect(await code(fileAppeal(id, H, { text: 'Please look again at my answer.' }))).toBe('INVALID_INPUT');
  });
});

describe('appeals', () => {
  async function rejected(): Promise<string> {
    const id = await reviewResponse();
    await decideResponse(id, H, { decision: 'dont_pay', reason: 'low_effort' });
    return id;
  }

  it('the respondent appeals once, with a text of the right length', async () => {
    const id = await rejected();
    session.wallet = RESPONDENT;
    expect(await code(fileAppeal(id, H, { text: 'too short' }))).toBe('INVALID_INPUT');
    expect(await code(fileAppeal(id, H, { text: 'x'.repeat(301) }))).toBe('INVALID_INPUT');
    expect(await fileAppeal(id, H, { text: '  I answered honestly, please look again.  ' })).toEqual({ responseId: id });
    expect(await code(fileAppeal(id, H, { text: 'I answered honestly, please look again.' }))).toBe('ALREADY_SUBMITTED');
    expect((await db.getAppeal(id))?.text).toBe('I answered honestly, please look again.');
  });

  it('only the respondent who answered can appeal, and not a response in review', async () => {
    const id = await rejected();
    session.wallet = '0x' + '33'.repeat(20);
    expect(await code(fileAppeal(id, H, { text: 'I answered honestly, please look again.' }))).toBe('RESPONSE_NOT_FOUND');
    const inReview = await reviewResponse('0x' + '44'.repeat(20));
    session.wallet = '0x' + '44'.repeat(20);
    expect(await code(fileAppeal(inReview, H, { text: 'I answered honestly, please look again.' }))).toBe('INVALID_INPUT');
  });

  it('accepting an appeal pays on chain and settles it', async () => {
    const id = await rejected();
    session.wallet = RESPONDENT;
    await fileAppeal(id, H, { text: 'I answered honestly, please look again.' });
    session.wallet = RESPONDENT;
    expect(await code(decideResponse(id, H, { decision: 'pay' }))).toBe('NOT_YOUR_SURVEY');
    session.wallet = RESEARCHER;
    const res = await decideResponse(id, H, { decision: 'pay' });
    expect(res).toMatchObject({ status: 'paid', result: 'pay', txHash: TX });
    expect(res.reasons.at(-1)).toBe('Appeal accepted by the researcher.');
    expect((await db.getAppeal(id))?.status).toBe('paid');
    expect(await code(decideResponse(id, H, { decision: 'pay' }))).toBe('INVALID_INPUT');
  });

  it('rejecting an appeal is final, off chain, and can not be paid afterwards', async () => {
    const id = await rejected();
    session.wallet = RESPONDENT;
    await fileAppeal(id, H, { text: 'I answered honestly, please look again.' });
    session.wallet = RESEARCHER;
    const res = await decideResponse(id, H, { decision: 'dont_pay' });
    expect(res).toMatchObject({ status: 'blocked', result: 'dont_pay' });
    expect(res.reasons.at(-1)).toBe('Appeal rejected by the researcher. The decision is final.');
    expect((await db.getAppeal(id))?.status).toBe('kept');
    expect(chain.sendDecision).not.toHaveBeenCalled();
    expect(await code(decideResponse(id, H, { decision: 'pay' }))).toBe('INVALID_INPUT');
    session.wallet = RESPONDENT;
    expect(await code(fileAppeal(id, H, { text: 'I answered honestly, please look again.' }))).toBe('ALREADY_SUBMITTED');
  });

  it('lists a survey\'s appeals for its researcher only', async () => {
    const id = await rejected();
    session.wallet = RESPONDENT;
    await fileAppeal(id, H, { text: 'I answered honestly, please look again.' });
    const msg = async (acct: ReturnType<typeof privateKeyToAccount>, surveyId = SURVEY_ID) => {
      const timestamp = Date.now();
      const signature = await acct.signMessage({ message: buildAuthMessage('view_log', surveyId, acct.address, timestamp) });
      return new Headers({ 'x-auth-wallet': acct.address, 'x-auth-signature': signature, 'x-auth-timestamp': String(timestamp) });
    };
    const out = await listAppeals(SURVEY_ID, await msg(researcher));
    expect(out.appeals).toEqual([{ responseId: id, text: 'I answered honestly, please look again.', status: 'open', createdAt: expect.any(String) }]);
    expect(await code(listAppeals(SURVEY_ID, await msg(privateKeyToAccount(generatePrivateKey()))))).toBe('NOT_YOUR_SURVEY');
    expect(await code(listAppeals(99, await msg(researcher, 99)))).toBe('SURVEY_NOT_FOUND');
    expect(await code(listAppeals(SURVEY_ID, new Headers()))).toBe('WALLET_NOT_VERIFIED');
  });
});
