// Review decisions against the in-memory database, a mocked session and mocked chain calls.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ZodError } from 'zod';
import demo from '../../data/demo-survey.json';
import { ApiFailure } from '../api/errors';
import { reasonHash } from '../canonical';
import * as chain from '../chain/escrow';
import * as db from '../db/memory';
import type { Answers, Hex, SurveyJson } from '../types';
import { decideResponse } from './review';

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
const RESEARCHER = '0x' + 'aa'.repeat(20);
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

beforeEach(async () => {
  db.reset();
  session.wallet = RESEARCHER;
  vi.mocked(chain.sendDecision).mockReset().mockResolvedValue(TX);
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
      expect((await db.getResponse(id))?.status).toBe('processing');
      return TX;
    });
    const res = await decideResponse(id, H, { decision: 'pay' });
    expect(res).toMatchObject({ status: 'paid', result: 'pay', txHash: TX });
    expect(res.reasons).toEqual(['The AI check was inconclusive.', 'Paid by the researcher after review.']);
    const d = await db.getDecision(id);
    expect(d?.status).toBe('confirmed');
    expect(d?.reasonHash).toBe(reasonHash(res.reasons));
    expect(chain.sendDecision).toHaveBeenCalledWith({ surveyId: SURVEY_ID, respondent: RESPONDENT, decision: 'pay', reasonHash: reasonHash(res.reasons) });
  });

  it('a reverted payment goes back to review and can be tried again', async () => {
    const id = await reviewResponse();
    vi.mocked(chain.sendDecision).mockRejectedValueOnce(new Error('execution reverted'));
    expect((await decideResponse(id, H, { decision: 'pay' })).status).toBe('review');
    expect((await db.getDecision(id))?.status).toBe('failed');
    expect((await decideResponse(id, H, { decision: 'pay' })).status).toBe('paid');
  });

  it('refuses a full quota', async () => {
    const id = await reviewResponse();
    db.patchSurvey(SURVEY_ID, { quota: 0 });
    expect(await code(decideResponse(id, H, { decision: 'pay' }))).toBe('QUOTA_FULL');
    expect(chain.sendDecision).not.toHaveBeenCalled();
  });
});

describe('decide: reject a response in review', () => {
  it('needs a reason, records Don\'t pay on chain and marks the response blocked', async () => {
    const id = await reviewResponse();
    expect(await code(decideResponse(id, H, { decision: 'dont_pay' }))).toBe('INVALID_INPUT');
    expect(await code(decideResponse(id, H, { decision: 'dont_pay', reason: 'because' }))).toBe('INVALID_INPUT');
    expect(chain.sendDecision).not.toHaveBeenCalled();

    vi.mocked(chain.sendDecision).mockImplementation(async () => {
      expect((await db.getDecision(id))?.status).toBe('pending');
      return TX;
    });
    const res = await decideResponse(id, H, { decision: 'dont_pay', reason: 'too_vague' });
    expect(res).toMatchObject({ status: 'blocked', result: 'dont_pay', txHash: TX });
    expect(res.reasons.at(-1)).toBe('Not paid by the researcher: The answer was too vague to count.');
    expect((await db.getDecision(id))?.status).toBe('confirmed');
    expect(chain.sendDecision).toHaveBeenCalledWith({ surveyId: SURVEY_ID, respondent: RESPONDENT, decision: 'dont_pay', reasonHash: reasonHash(res.reasons) });
  });

  it('a reverted rejection goes back to review', async () => {
    const id = await reviewResponse();
    vi.mocked(chain.sendDecision).mockRejectedValueOnce(new Error('execution reverted'));
    expect((await decideResponse(id, H, { decision: 'dont_pay', reason: 'low_effort' })).status).toBe('review');
    expect((await db.getDecision(id))?.status).toBe('failed');
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
    expect(chain.sendDecision).not.toHaveBeenCalled();
  });

  it('refuses a closed survey and a passed deadline for both decisions, sending nothing', async () => {
    const id = await reviewResponse();
    db.patchSurvey(SURVEY_ID, { status: 'closed' });
    expect(await code(decideResponse(id, H, { decision: 'pay' }))).toBe('SURVEY_CLOSED');
    expect(await code(decideResponse(id, H, { decision: 'dont_pay', reason: 'too_vague' }))).toBe('SURVEY_CLOSED');
    db.patchSurvey(SURVEY_ID, { status: 'open', deadline: Math.floor(Date.now() / 1000) - 5 });
    expect(await code(decideResponse(id, H, { decision: 'dont_pay', reason: 'too_vague' }))).toBe('SURVEY_CLOSED');
    expect(chain.sendDecision).not.toHaveBeenCalled();
    expect((await db.getResponse(id))?.status).toBe('review');
  });

  it('only a response in review can be decided, and only once', async () => {
    const id = await reviewResponse();
    await decideResponse(id, H, { decision: 'pay' });
    expect(await code(decideResponse(id, H, { decision: 'pay' }))).toBe('INVALID_INPUT');
    const fresh = await db.insertResponse({ surveyId: SURVEY_ID, wallet: '0x' + '22'.repeat(20), email: 'b@example.com', emailHash: 'b', answers, startedAt: new Date(Date.now() - 1000) });
    expect(await code(decideResponse(fresh, H, { decision: 'pay' }))).toBe('INVALID_INPUT');
    expect(await code(decideResponse('00000000-0000-0000-0000-000000000000', H, { decision: 'pay' }))).toBe('RESPONSE_NOT_FOUND');
    expect(await code(decideResponse(id, H, { decision: 'maybe' }))).toBe('INVALID_INPUT');
  });

  it("a code-confirmed Don't pay can not be decided again", async () => {
    const id = await db.insertResponse({ surveyId: SURVEY_ID, wallet: RESPONDENT, email: 'c@example.com', emailHash: 'c', answers, startedAt: new Date(Date.now() - 1000) });
    const d = await db.insertDecision({ responseId: id, result: 'dont_pay', reasons: ['An open-ended answer was empty.'], reasonHash: reasonHash(['x']), signals: { hardFails: [{ check: 'empty', questionId: 'q7' }], weak: [] }, ai: null, llmModel: null, rubricVersion: 'v1', status: 'pending' });
    await db.markDecisionSent(d!.id, TX);
    await db.confirmDecision(d!.id, 'blocked');
    expect(await code(decideResponse(id, H, { decision: 'pay' }))).toBe('INVALID_INPUT');
    expect(chain.sendDecision).not.toHaveBeenCalled();
  });
});
