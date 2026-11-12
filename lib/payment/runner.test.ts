import { beforeEach, describe, expect, it, vi } from 'vitest';
import demo from '../../data/demo-survey.json';
import { reasonHash } from '../canonical';
import * as chain from '../chain/escrow';
import * as db from '../db/memory';
import * as screening from '../screening';
import type { Answers, Hex, ScreenOutput, SurveyJson } from '../types';
import { getResponseResult, processResponse, recheckSent } from './runner';

vi.mock('../db/queries', () => import('../db/memory'));
vi.mock('../chain/escrow', () => ({
  sendDecision: vi.fn(),
  waitForReceipt: vi.fn(),
  getReceiptStatus: vi.fn(),
  readSurveyCreated: vi.fn(),
  readClosed: vi.fn(),
}));
vi.mock('../screening', () => ({ screen: vi.fn() }));

const survey = demo as SurveyJson;
const TX = `0x${'ab'.repeat(32)}` as Hex;
const SURVEY_ID = 1;
const WALLET = '0x' + '11'.repeat(20);

const answers: Answers = {
  q1: 4, q2: 3, q3: 5, q4: 2, q5: 4,
  q6: '1 to 2 hours',
  q7: 'Staying focused when my family is  at home.',
  q8: 'I use short timed sessions because they keep me from drifting.',
};

function output(result: ScreenOutput['result'], reasons = ['ok']): ScreenOutput {
  return { result, reasons, signals: { hardFails: [], weak: [] }, ai: null, llmModel: 'm', rubricVersion: 'v1' };
}

let events: string[];

async function addResponse(wallet = WALLET, a: Answers = answers): Promise<string> {
  return db.insertResponse({
    surveyId: SURVEY_ID,
    wallet,
    email: `${wallet}@example.com`,
    emailHash: wallet,
    answers: a,
    startedAt: new Date(Date.now() - 60_000),
  });
}

beforeEach(async () => {
  db.reset();
  events = [];
  vi.mocked(screening.screen).mockReset().mockResolvedValue(output('pay'));
  vi.mocked(chain.sendDecision).mockReset().mockImplementation(async () => {
    events.push('send');
    return TX;
  });
  vi.mocked(chain.waitForReceipt).mockReset().mockImplementation(async () => {
    events.push('wait');
    return { state: 'success' };
  });
  vi.mocked(chain.getReceiptStatus).mockReset().mockResolvedValue({ state: 'success' });
  await db.insertSurvey({
    surveyId: SURVEY_ID,
    researcher: '0x' + 'aa'.repeat(20),
    survey,
    surveyHash: TX,
    rateWei: BigInt(1000),
    quota: 3,
    deadline: Math.floor(Date.now() / 1000) + 3600,
    feePerResponseWei: BigInt(10),
    txHash: TX,
  });
});

describe('processResponse', () => {
  it('pays: decision saved, sent, confirmed, response paid', async () => {
    const id = await addResponse();
    const res = await processResponse(id);
    expect(res).toEqual({
      responseId: id,
      status: 'paid',
      result: 'pay',
      reasons: ['ok'],
      txHash: TX,
      explorerUrl: `https://testnet.bscscan.com/tx/${TX}`,
    });
    const d = await db.getDecision(id);
    expect(d?.status).toBe('confirmed');
    expect(d?.reasonHash).toBe(reasonHash(['ok']));
    expect(vi.mocked(chain.sendDecision)).toHaveBeenCalledWith({
      surveyId: SURVEY_ID,
      respondent: WALLET,
      decision: 'pay',
      reasonHash: reasonHash(['ok']),
    });
  });

  it('saves the decision before sending and the hash before waiting', async () => {
    const id = await addResponse();
    vi.mocked(chain.sendDecision).mockImplementation(async () => {
      expect((await db.getDecision(id))?.status).toBe('pending');
      return TX;
    });
    vi.mocked(chain.waitForReceipt).mockImplementation(async () => {
      const d = await db.getDecision(id);
      expect(d?.status).toBe('sent');
      expect(d?.txHash).toBe(TX);
      return { state: 'success' };
    });
    await processResponse(id);
    expect(vi.mocked(chain.waitForReceipt)).toHaveBeenCalledWith(TX, 30_000);
  });

  it('blocks on dont_pay', async () => {
    vi.mocked(screening.screen).mockResolvedValue(output('dont_pay', ['Gibberish in q7.']));
    const id = await addResponse();
    const res = await processResponse(id);
    expect(res.status).toBe('blocked');
    expect(res.result).toBe('dont_pay');
    expect(res.reasons).toEqual(['Gibberish in q7.']);
    expect(vi.mocked(chain.sendDecision).mock.calls[0][0].decision).toBe('dont_pay');
  });

  it('review stays off chain', async () => {
    vi.mocked(screening.screen).mockResolvedValue(output('review', ['Unclear.']));
    const id = await addResponse();
    const res = await processResponse(id);
    expect(res).toMatchObject({ status: 'review', result: 'review', txHash: null, explorerUrl: null });
    expect((await db.getDecision(id))?.status).toBe('off_chain');
    expect(chain.sendDecision).not.toHaveBeenCalled();
  });

  it('a second call is a no-op', async () => {
    const id = await addResponse();
    const first = await processResponse(id);
    const second = await processResponse(id);
    expect(second).toEqual(first);
    expect(screening.screen).toHaveBeenCalledTimes(1);
    expect(chain.sendDecision).toHaveBeenCalledTimes(1);
  });

  it('a failed send becomes a failed decision and a review', async () => {
    vi.mocked(chain.sendDecision).mockRejectedValue(new Error('nonce too low'));
    const id = await addResponse();
    const res = await processResponse(id);
    expect(res.status).toBe('review');
    expect(res.txHash).toBeNull();
    const d = await db.getDecision(id);
    expect(d?.status).toBe('failed');
    expect(d?.error).toBe('nonce too low');
    expect(chain.waitForReceipt).not.toHaveBeenCalled();
  });

  it('a reverted transaction becomes a failed decision and a review', async () => {
    vi.mocked(chain.waitForReceipt).mockResolvedValue({ state: 'reverted', error: 'SurveyNotOpen' });
    const id = await addResponse();
    const res = await processResponse(id);
    expect(res).toMatchObject({ status: 'review', txHash: TX });
    expect(await db.getDecision(id)).toMatchObject({ status: 'failed', error: 'SurveyNotOpen' });
  });

  it('a pending receipt leaves sent and processing, and R7 finishes it', async () => {
    vi.mocked(chain.waitForReceipt).mockResolvedValue({ state: 'pending' });
    const id = await addResponse();
    const res = await processResponse(id);
    expect(res).toMatchObject({ status: 'processing', result: 'pay', txHash: TX });
    expect((await db.getDecision(id))?.status).toBe('sent');

    vi.mocked(chain.getReceiptStatus).mockResolvedValue({ state: 'pending' });
    expect((await getResponseResult(id)).status).toBe('processing');
    vi.mocked(chain.getReceiptStatus).mockResolvedValue({ state: 'success' });
    expect((await getResponseResult(id)).status).toBe('paid');
    expect((await db.getDecision(id))?.status).toBe('confirmed');
  });

  it('an RPC error while waiting leaves the decision at sent', async () => {
    vi.mocked(chain.waitForReceipt).mockRejectedValue(new Error('rpc down'));
    const id = await addResponse();
    expect((await processResponse(id)).status).toBe('processing');
    expect((await db.getDecision(id))?.status).toBe('sent');
  });

  it('a throwing screen goes to review, never pay', async () => {
    vi.mocked(screening.screen).mockRejectedValue(new Error('boom'));
    const id = await addResponse();
    const res = await processResponse(id);
    expect(res).toMatchObject({ status: 'review', result: 'review' });
    expect(chain.sendDecision).not.toHaveBeenCalled();
  });

  it('passes normalized earlier open-ended texts and durations as prior data', async () => {
    const first = await addResponse('0x' + '22'.repeat(20));
    db.patchResponse(first, { submittedAt: new Date(Date.now() - 5000), startedAt: new Date(Date.now() - 65_000) });
    const id = await addResponse();
    await processResponse(id);
    const input = vi.mocked(screening.screen).mock.calls[0][0];
    expect(input.prior.openTexts.q7).toEqual(['staying focused when my family is at home.']);
    expect(input.prior.openTexts.q9).toEqual([]);
    expect(input.prior.durationsMs).toEqual([60_000]);
    expect(input.durationMs).toBeGreaterThanOrEqual(60_000);
    expect(input.answers).toEqual(answers);
  });

  it('claims a crashed run again only after 2 minutes with no decision', async () => {
    const id = await addResponse();
    await db.claimResponse(id); // a run that crashed after claiming
    expect((await processResponse(id)).status).toBe('processing');
    expect(screening.screen).not.toHaveBeenCalled();

    db.patchResponse(id, { submittedAt: new Date(Date.now() - 3 * 60 * 1000) });
    expect((await processResponse(id)).status).toBe('paid');
  });

  it('throws RESPONSE_NOT_FOUND for an unknown id', async () => {
    await expect(processResponse('00000000-0000-4000-8000-000000000000')).rejects.toMatchObject({
      code: 'RESPONSE_NOT_FOUND',
    });
    await expect(getResponseResult('00000000-0000-4000-8000-000000000000')).rejects.toMatchObject({
      code: 'RESPONSE_NOT_FOUND',
    });
  });
});

describe('recheckSent', () => {
  it('settles every sent decision in the survey', async () => {
    vi.mocked(chain.waitForReceipt).mockResolvedValue({ state: 'pending' });
    const a = await addResponse('0x' + '22'.repeat(20));
    const b = await addResponse('0x' + '33'.repeat(20));
    await processResponse(a);
    vi.mocked(screening.screen).mockResolvedValue(output('dont_pay'));
    await processResponse(b);

    vi.mocked(chain.getReceiptStatus)
      .mockResolvedValueOnce({ state: 'success' })
      .mockResolvedValueOnce({ state: 'reverted', error: 'AlreadyDecided' });
    await recheckSent(SURVEY_ID);
    expect((await db.getResponse(a))?.status).toBe('paid');
    expect((await db.getResponse(b))?.status).toBe('review');
    expect((await db.getDecision(b))?.status).toBe('failed');
  });

  it('keeps sent when the receipt lookup fails', async () => {
    vi.mocked(chain.waitForReceipt).mockResolvedValue({ state: 'pending' });
    const id = await addResponse();
    await processResponse(id);
    vi.mocked(chain.getReceiptStatus).mockRejectedValue(new Error('rpc down'));
    await recheckSent(SURVEY_ID);
    expect((await db.getDecision(id))?.status).toBe('sent');
  });
});
