import { beforeEach, describe, expect, it, vi } from 'vitest';
import demo from '../../data/demo-survey.json';
import { reasonHash } from '../canonical';
import * as chain from '../chain/escrow';
import * as db from '../db/memory';
import * as screening from '../screening';
import type { Answers, Hex, ScreenOutput, SurveyJson } from '../types';
import { getResponseResult, guardScreenOutput, processResponse, recheckSent } from './runner';

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

/** A dont_pay output carries the code-confirmed hard fail that rule 1 requires. */
function output(result: ScreenOutput['result'], reasons = ['ok'], extra: Partial<ScreenOutput> = {}): ScreenOutput {
  const hardFails = result === 'dont_pay' ? [{ check: 'gibberish' as const, questionId: 'q7' }] : [];
  return { result, reasons, signals: { hardFails, weak: [] }, ai: null, llmModel: 'm', rubricVersion: 'v1', ...extra };
}

const ai = (over: Partial<NonNullable<ScreenOutput['ai']>> = {}): NonNullable<ScreenOutput['ai']> => ({
  label: 'valid', type: null, injection: false, reason: 'Looks like a real answer.', agreed: true, ...over,
});

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

  it('pays when the AI label is a clean, agreed valid', async () => {
    vi.mocked(screening.screen).mockResolvedValue(output('pay', ['Passed all checks.'], { ai: ai() }));
    const id = await addResponse();
    expect((await processResponse(id)).status).toBe('paid');
  });

  it('dont_pay without a code-confirmed hard fail goes to review, off chain', async () => {
    vi.mocked(screening.screen).mockResolvedValue(
      output('dont_pay', ['The AI said no.'], { signals: { hardFails: [], weak: [] }, ai: ai({ label: 'non_answer', type: 'evasive' }) }),
    );
    const id = await addResponse();
    const res = await processResponse(id);
    expect(res).toMatchObject({ status: 'review', result: 'review', txHash: null });
    expect(res.reasons).toEqual(['The AI said no.', 'The screening result did not pass the payment safety check.']);
    expect((await db.getDecision(id))?.status).toBe('off_chain');
    expect(chain.sendDecision).not.toHaveBeenCalled();
  });

  it('pay is refused when the AI label is not a clean, agreed valid, or a hard fail exists', async () => {
    const unsafe: Partial<ScreenOutput>[] = [
      { ai: ai({ label: 'unclear', type: 'other' }) },
      { ai: ai({ label: 'non_answer', type: 'off_question' }) },
      { ai: ai({ injection: true }) },
      { ai: ai({ agreed: false }) },
      { signals: { hardFails: [{ check: 'empty', questionId: 'q7' }], weak: [] } },
    ];
    for (const [i, extra] of unsafe.entries()) {
      vi.mocked(screening.screen).mockResolvedValue(output('pay', ['ok'], extra));
      const id = await addResponse('0x' + String(i + 2).repeat(40));
      expect(await processResponse(id)).toMatchObject({ status: 'review', result: 'review', txHash: null });
    }
    expect(chain.sendDecision).not.toHaveBeenCalled();
  });

  it('a malformed screening result goes to review, never pay', async () => {
    const malformed = [
      { ...output('pay'), result: 'approve' },
      { ...output('pay'), reasons: 'ok' },
      { ...output('pay'), signals: undefined },
      null,
    ];
    for (const [i, bad] of malformed.entries()) {
      vi.mocked(screening.screen).mockResolvedValue(bad as unknown as ScreenOutput);
      const id = await addResponse('0x' + String(i + 2).repeat(40));
      expect(await processResponse(id)).toMatchObject({ status: 'review', result: 'review', txHash: null });
    }
    expect(chain.sendDecision).not.toHaveBeenCalled();
  });

  it('caps the number and length of reasons', () => {
    const long = guardScreenOutput(output('pay', Array.from({ length: 50 }, () => 'x'.repeat(2000))));
    expect(long.result).toBe('pay');
    expect(long.reasons).toHaveLength(20);
    expect(long.reasons[0]).toHaveLength(500);
  });

  it('stores a failed send without URLs or 32-byte hex values', async () => {
    vi.mocked(chain.sendDecision).mockRejectedValue(
      new Error(`HTTP request failed. URL: https://rpc.example/v1/SECRETKEY key 0x${'9f'.repeat(32)}`),
    );
    const id = await addResponse();
    await processResponse(id);
    const error = (await db.getDecision(id))?.error ?? '';
    expect(error).toContain('HTTP request failed.');
    expect(error).not.toContain('SECRETKEY');
    expect(error).not.toContain('9f9f9f');
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
