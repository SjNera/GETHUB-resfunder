// Task C6. End-to-end run against a dev server. Source: docs/TDD.md section 11.8.
//
//   npm run e2e                 full run: deployed contract, real screening (the backend "done" check)
//   npm run e2e -- --stubs      before the joins: chain and screening are stubs
//
// Env: BASE_URL (default http://localhost:3000).
// Full run: E2E_RESEARCHER_PRIVATE_KEY, E2E_RESPONDENT_PRIVATE_KEYS (three, comma-separated),
//   CHAIN_RPC_URL, NEXT_PUBLIC_CONTRACT_ADDRESS. The researcher wallet needs a little tBNB.
// --stubs: DATABASE_URL (the same database the server uses). The stub readSurveyCreated returns null,
//   so R2 cannot register a survey; the script inserts the survey row itself and checks that R2 and R9
//   answer TX_NOT_VERIFIED. Missing E2E keys are replaced by throwaway keys. Steps 2, 8 and the
//   on-chain checks are skipped, and all three responses are expected to be paid.
//   The rows stay in the database under a random survey id of 900000000 or more.
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createPublicClient, createWalletClient, http, parseAbi } from 'viem';
import { generatePrivateKey, privateKeyToAccount, type PrivateKeyAccount } from 'viem/accounts';
import { bscTestnet } from 'viem/chains';
import type { LogResponse, ResponseResult, SurveyDetails, SurveySummary } from '../lib/api/shapes';
import { buildAuthMessage } from '../lib/auth/message';
import { surveyHash } from '../lib/canonical';
import { insertSurvey } from '../lib/db/queries';
import { surveySchema } from '../lib/survey-schema';
import type { Answers, AuthAction, AuthProof, ErrorCode, Hex, ResponseStatus, SurveyJson } from '../lib/types';

const STUBS = process.argv.includes('--stubs');
const BASE_URL = (process.env.BASE_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
const RATE_WEI = BigInt('1000000000000'); // 0.000001 tBNB
const QUOTA = 3;
const FINAL: ResponseStatus[] = ['paid', 'blocked', 'review'];
const POLL_MS = 2000;
const POLL_LIMIT_MS = 120_000;

// createSurvey and closeSurvey as in TDD section 6.2.
const ESCROW_FUNCTIONS = parseAbi([
  'function createSurvey(bytes32 surveyHash, uint256 rate, uint256 quota, uint256 deadline, uint256 feePerResponse) payable returns (uint256 surveyId)',
  'function closeSurvey(uint256 surveyId)',
]);

// ---------- helpers ----------

let step = 0;
function ok(what: string): void {
  step += 1;
  console.log(`  ok ${String(step).padStart(2)}  ${what}`);
}
function fail(what: string, detail?: unknown): never {
  throw new Error(detail === undefined ? what : `${what}\n     got: ${JSON.stringify(detail)}`);
}
function expect(condition: boolean, what: string, detail?: unknown): void {
  if (!condition) fail(what, detail);
  ok(what);
}

interface ApiReply {
  status: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  json: any;
}

async function api(method: 'GET' | 'POST', path: string, opts: { body?: unknown; headers?: Record<string, string> } = {}): Promise<ApiReply> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { ...(opts.body === undefined ? {} : { 'content-type': 'application/json' }), ...opts.headers },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { nonJson: text.slice(0, 200) };
  }
  return { status: res.status, json };
}

function expectError(reply: ApiReply, code: ErrorCode, status: number, what: string): void {
  const e = reply.json?.error;
  const shaped = e && e.code === code && typeof e.message === 'string' && Object.keys(reply.json).length === 1;
  expect(Boolean(shaped) && reply.status === status, `${what} -> ${status} ${code}`, reply);
}

async function proof(account: PrivateKeyAccount, action: AuthAction, surveyId: number): Promise<AuthProof> {
  const timestamp = Date.now();
  const signature = await account.signMessage({
    message: buildAuthMessage(action, surveyId, account.address, timestamp),
  });
  return { wallet: account.address, signature, timestamp };
}

async function authHeaders(account: PrivateKeyAccount, action: AuthAction, surveyId: number): Promise<Record<string, string>> {
  const p = await proof(account, action, surveyId);
  return { 'x-auth-wallet': p.wallet, 'x-auth-signature': p.signature, 'x-auth-timestamp': String(p.timestamp) };
}

function isWei(value: unknown): boolean {
  return typeof value === 'string' && /^\d+$/.test(value);
}

function isResponseResult(v: ResponseResult): boolean {
  return (
    typeof v?.responseId === 'string' &&
    typeof v.status === 'string' &&
    (v.result === null || typeof v.result === 'string') &&
    Array.isArray(v.reasons) &&
    (v.txHash === null || /^0x[0-9a-f]{64}$/.test(v.txHash)) &&
    (v.explorerUrl === null || v.explorerUrl === `https://testnet.bscscan.com/tx/${v.txHash}`) &&
    Object.keys(v).length === 6
  );
}

function loadKeys(): { researcher: PrivateKeyAccount; respondents: PrivateKeyAccount[] } {
  const researcherKey = process.env.E2E_RESEARCHER_PRIVATE_KEY;
  const respondentKeys = (process.env.E2E_RESPONDENT_PRIVATE_KEYS ?? '').split(',').map((k) => k.trim()).filter(Boolean);
  if (researcherKey && respondentKeys.length >= 3) {
    return {
      researcher: privateKeyToAccount(researcherKey as Hex),
      respondents: respondentKeys.slice(0, 3).map((k) => privateKeyToAccount(k as Hex)),
    };
  }
  if (!STUBS) fail('Set E2E_RESEARCHER_PRIVATE_KEY and three E2E_RESPONDENT_PRIVATE_KEYS for a full run.');
  console.log('  (E2E keys not set: using throwaway keys, which is fine with --stubs)');
  return {
    researcher: privateKeyToAccount(generatePrivateKey()),
    respondents: [0, 1, 2].map(() => privateKeyToAccount(generatePrivateKey())),
  };
}

// ---------- answers ----------

const scales = { q1: 4, q2: 2, q3: 5, q4: 3, q5: 4 };
const ANSWERS: Record<'A' | 'B' | 'C', Answers> = {
  // A: genuine.
  A: {
    ...scales,
    q6: '1 to 2 hours',
    q7: 'The hardest part is staying focused at home, because my siblings share the room and the wifi drops during video calls.',
    q8: 'I study in 25 minute blocks with short breaks, since a timer keeps me from checking my phone and the breaks keep me fresh.',
    q9: 'none',
  },
  // B: gibberish in a required open-ended answer.
  B: {
    ...scales,
    q1: 3,
    q6: '3 to 4 hours',
    q7: 'asdfghjkl',
    q8: 'Reviewing my notes right after class works for me because the lesson is still fresh in my mind.',
  },
  // C: fluent but off-question.
  C: {
    ...scales,
    q2: 5,
    q6: 'Less than 1 hour',
    q7: 'My favorite basketball team won the championship last year and the whole town celebrated for a week.',
    q8: 'Adobo tastes best when the pork is simmered slowly in vinegar and soy sauce with plenty of garlic.',
  },
};

// ---------- run ----------

async function main(): Promise<void> {
  console.log(`ResFunder e2e ${STUBS ? '(--stubs)' : '(full)'} against ${BASE_URL}`);
  const survey = surveySchema.parse(JSON.parse(await readFile(new URL('../data/demo-survey.json', import.meta.url), 'utf8'))) as SurveyJson;
  const { researcher, respondents } = loadKeys();
  const [respA, respB, respC] = respondents;
  const hash = surveyHash(survey);
  const deadline = Math.floor(Date.now() / 1000) + 3600;

  // 1. Fee.
  const fee = await api('GET', '/api/fee');
  let feeWei = BigInt(0);
  if (STUBS && fee.status === 404) {
    console.log('  skip    GET /api/fee is not on this branch yet (Lane A, task A5)');
  } else {
    expect(fee.status === 200 && isWei(fee.json.feePerResponseWei), 'R1 GET /api/fee -> { feePerResponseWei }', fee);
    feeWei = BigInt(fee.json.feePerResponseWei);
  }

  // 2 and 3. Fund and register.
  let surveyId: number;
  let closeChain: (() => Promise<Hex>) | null = null;
  if (STUBS) {
    surveyId = 900_000_000 + Math.floor(Math.random() * 90_000_000);
    const fakeTx: Hex = `0x${randomBytes(32).toString('hex')}`;
    const first = await api('POST', '/api/surveys', { body: { txHash: fakeTx, survey } });
    const second = await api('POST', '/api/surveys', { body: { txHash: fakeTx, survey } });
    expectError(first, 'TX_NOT_VERIFIED', 422, 'R2 POST /api/surveys with an unknown tx (chain stub)');
    expect(JSON.stringify(second) === JSON.stringify(first), 'R2 repeated -> same result', second);
    expectError(await api('POST', '/api/surveys', { body: { txHash: '0x12', survey } }), 'INVALID_INPUT', 400, 'R2 with a malformed txHash');
    await insertSurvey({
      surveyId, researcher: researcher.address, survey, surveyHash: hash, rateWei: RATE_WEI, quota: QUOTA,
      deadline, feePerResponseWei: feeWei, txHash: fakeTx,
    });
    console.log(`  seed    survey ${surveyId} inserted directly (fund and register need the real chain)`);
  } else {
    const rpc = process.env.CHAIN_RPC_URL;
    const escrow = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as Hex | undefined;
    if (!rpc || !escrow) fail('Set CHAIN_RPC_URL and NEXT_PUBLIC_CONTRACT_ADDRESS for a full run.');
    const publicClient = createPublicClient({ chain: bscTestnet, transport: http(rpc) });
    const wallet = createWalletClient({ account: researcher, chain: bscTestnet, transport: http(rpc) });
    const quota = BigInt(QUOTA);
    const fundTx = await wallet.writeContract({
      address: escrow, abi: ESCROW_FUNCTIONS, functionName: 'createSurvey',
      args: [hash, RATE_WEI, quota, BigInt(deadline), feeWei],
      value: RATE_WEI * quota + quota * feeWei,
    });
    const fundReceipt = await publicClient.waitForTransactionReceipt({ hash: fundTx });
    expect(fundReceipt.status === 'success', `createSurvey mined: https://testnet.bscscan.com/tx/${fundTx}`);

    const first = await api('POST', '/api/surveys', { body: { txHash: fundTx, survey } });
    const second = await api('POST', '/api/surveys', { body: { txHash: fundTx, survey } });
    expect(first.status === 200 && Number.isInteger(first.json.surveyId) && first.json.sharePath === `/s/${first.json.surveyId}`,
      'R2 POST /api/surveys -> { surveyId, sharePath }', first);
    expect(JSON.stringify(second) === JSON.stringify(first), 'R2 repeated -> same result', second);
    surveyId = first.json.surveyId;
    const changed = { ...survey, title: `${survey.title} (edited)` };
    expectError(await api('POST', '/api/surveys', { body: { txHash: fundTx, survey: changed } }), 'HASH_MISMATCH', 422, 'R2 with edited survey JSON');

    closeChain = async () => {
      const tx = await wallet.writeContract({ address: escrow, abi: ESCROW_FUNCTIONS, functionName: 'closeSurvey', args: [BigInt(surveyId)] });
      const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
      if (receipt.status !== 'success') fail('closeSurvey reverted', tx);
      return tx;
    };
  }

  // R4 and R3.
  const details = await api('GET', `/api/surveys/${surveyId}`);
  const d = details.json as SurveyDetails;
  expect(
    details.status === 200 && d.surveyId === surveyId && d.survey.title === survey.title && d.rateWei === RATE_WEI.toString() &&
      d.quota === QUOTA && d.deadline === deadline && d.status === 'open' && d.paused === false && d.slotsLeft === QUOTA,
    'R4 GET /api/surveys/[id] -> details with slotsLeft 3', details);
  expectError(await api('GET', '/api/surveys/899999999'), 'SURVEY_NOT_FOUND', 404, 'R4 for an unknown survey');

  const list = await api('GET', '/api/surveys', { headers: await authHeaders(researcher, 'list_surveys', 0) });
  const mine = (list.json.surveys as SurveySummary[] | undefined)?.find((s) => s.surveyId === surveyId);
  expect(
    list.status === 200 && !!mine && mine.title === survey.title && mine.status === 'open' && mine.rateWei === RATE_WEI.toString() &&
      mine.quota === QUOTA && mine.paidCount === 0 && !Number.isNaN(Date.parse(mine.createdAt)),
    'R3 GET /api/surveys (signed list_surveys) -> the survey summary', list);
  expectError(await api('GET', '/api/surveys'), 'WALLET_NOT_VERIFIED', 401, 'R3 without auth headers');

  // 4. Three submissions, each signed by its own key. startedAt is 5 minutes back to avoid too_fast.
  const startedAt = Date.now() - 5 * 60 * 1000;
  const submit = async (who: 'A' | 'B' | 'C', account: PrivateKeyAccount, auth?: AuthProof): Promise<ApiReply> =>
    api('POST', '/api/submit', {
      body: {
        surveyId, email: `e2e-${who.toLowerCase()}-${surveyId}@example.com`, answers: ANSWERS[who], startedAt,
        auth: auth ?? (await proof(account, 'submit', surveyId)),
      },
    });

  expectError(await submit('A', respA, await proof(respA, 'submit', surveyId + 1)), 'WALLET_NOT_VERIFIED', 401, 'R5 with a proof signed for another survey');
  const ids: Record<'A' | 'B' | 'C', string> = { A: '', B: '', C: '' };
  for (const [who, account] of [['A', respA], ['B', respB], ['C', respC]] as const) {
    const res = await submit(who, account);
    expect(res.status === 200 && typeof res.json.responseId === 'string', `R5 POST /api/submit ${who} -> { responseId }`, res);
    ids[who] = res.json.responseId;
    // 5. A again. Done before B and C: once three responses hold the three slots, R5 answers
    // QUOTA_FULL first (TDD 11.2 checks the quota before the insert).
    if (who === 'A') expectError(await submit('A', respA), 'ALREADY_SUBMITTED', 409, 'R5 A again');
  }
  expectError(await submit('A', respA), 'QUOTA_FULL', 409, 'R5 when the quota is held by three responses');

  const before = await api('GET', `/api/responses/${ids.A}`);
  expect(before.status === 200 && isResponseResult(before.json) && before.json.status === 'received' && before.json.result === null,
    'R7 GET /api/responses/[id] before processing -> received, result null', before);
  expectError(await api('GET', '/api/responses/00000000-0000-4000-8000-000000000000'), 'RESPONSE_NOT_FOUND', 404, 'R7 for an unknown response');

  // 6. Process, then poll until final.
  const expected: Record<'A' | 'B' | 'C', ResponseStatus> = STUBS ? { A: 'paid', B: 'paid', C: 'paid' } : { A: 'paid', B: 'blocked', C: 'review' };
  for (const who of ['A', 'B', 'C'] as const) {
    const processed = await api('POST', `/api/process/${ids[who]}`);
    expect(processed.status === 200 && isResponseResult(processed.json) && processed.json.responseId === ids[who],
      `R6 POST /api/process/[responseId] ${who} -> ResponseResult`, processed);

    let last = processed;
    const until = Date.now() + POLL_LIMIT_MS;
    while (!FINAL.includes(last.json.status) && Date.now() < until) {
      await new Promise((r) => setTimeout(r, POLL_MS));
      last = await api('GET', `/api/responses/${ids[who]}`);
    }
    const r = last.json as ResponseResult;
    expect(last.status === 200 && isResponseResult(r) && r.status === expected[who], `response ${who} ends as ${expected[who]}`, last);
    if (r.status === 'paid' || r.status === 'blocked') {
      expect(r.txHash !== null && r.explorerUrl !== null, `response ${who} carries the tx hash and BscScan link`, r);
    }

    const again = await api('POST', `/api/process/${ids[who]}`);
    expect(again.status === 200 && JSON.stringify(again.json) === JSON.stringify(last.json), `R6 ${who} a second time is a no-op`, again);
  }
  expectError(await api('POST', '/api/process/00000000-0000-4000-8000-000000000000'), 'RESPONSE_NOT_FOUND', 404, 'R6 for an unknown response');

  // 7. Decision log.
  const logReply = await api('GET', `/api/surveys/${surveyId}/log`, { headers: await authHeaders(researcher, 'view_log', surveyId) });
  const log = logReply.json as LogResponse;
  const want = STUBS ? { paid: 3, blocked: 0, review: 0 } : { paid: 1, blocked: 1, review: 1 };
  expect(logReply.status === 200 && log.summary.responses === 3 && log.summary.paid === want.paid && log.summary.blocked === want.blocked &&
      log.summary.review === want.review && log.summary.pending === 0,
    `R8 GET /api/surveys/[id]/log summary -> ${want.paid} paid, ${want.blocked} blocked, ${want.review} review`, log?.summary ?? logReply);
  const paidWei = RATE_WEI * BigInt(want.paid);
  expect(log.summary.budgetWei === (RATE_WEI * BigInt(QUOTA)).toString() && log.summary.paidWei === paidWei.toString() &&
      log.summary.remainingWei === (RATE_WEI * BigInt(QUOTA) - paidWei).toString(),
    'R8 summary money: budget, paid and remaining in wei strings', log.summary);
  expect(log.survey.surveyId === surveyId && log.survey.paidCount === want.paid && log.survey.refundedWei === null && log.survey.closeTxHash === null,
    'R8 survey block', log.survey);
  const rowA = log.rows.find((r) => r.responseId === ids.A);
  expect(log.rows.length === 3 && !!rowA && rowA.wallet === respA.address.toLowerCase() && rowA.email === `e2e-a-${surveyId}@example.com` &&
      rowA.status === 'paid' && rowA.result === 'pay' && rowA.decisionStatus === 'confirmed' && rowA.txHash !== null &&
      rowA.explorerUrl !== null && typeof rowA.rubricVersion === 'string' && rowA.answers.q6 === ANSWERS.A.q6 &&
      Date.parse(log.rows[0].submittedAt) >= Date.parse(log.rows[2].submittedAt),
    'R8 rows: 3 rows newest first, A is paid/pay/confirmed with lowercase wallet', log.rows);
  expectError(await api('GET', `/api/surveys/${surveyId}/log`, { headers: await authHeaders(respA, 'view_log', surveyId) }), 'NOT_YOUR_SURVEY', 403, 'R8 signed by a respondent');
  expectError(await api('GET', `/api/surveys/${surveyId}/log`), 'WALLET_NOT_VERIFIED', 401, 'R8 without auth headers');

  // 8 and 9. Close and refund.
  if (closeChain) {
    const closeTx = await closeChain();
    const closed = await api('POST', `/api/surveys/${surveyId}/closed`, { body: { txHash: closeTx } });
    expect(closed.status === 200 && closed.json.surveyId === surveyId && closed.json.status === 'closed' && closed.json.closeTxHash === closeTx.toLowerCase(),
      `R9 POST /api/surveys/[id]/closed: https://testnet.bscscan.com/tx/${closeTx}`, closed);
    expect(closed.json.refundedWei === (RATE_WEI * BigInt(2)).toString(), 'refund equals 2 x rate', closed.json);
    const repeat = await api('POST', `/api/surveys/${surveyId}/closed`, { body: { txHash: closeTx } });
    expect(JSON.stringify(repeat) === JSON.stringify(closed), 'R9 repeated -> same result', repeat);
    expectError(await submit('A', respA), 'SURVEY_CLOSED', 409, 'R5 after close');
  } else {
    const fakeTx: Hex = `0x${randomBytes(32).toString('hex')}`;
    expectError(await api('POST', `/api/surveys/${surveyId}/closed`, { body: { txHash: fakeTx } }), 'TX_NOT_VERIFIED', 422, 'R9 with an unknown tx (chain stub)');
    expectError(await api('POST', '/api/surveys/899999999/closed', { body: { txHash: fakeTx } }), 'SURVEY_NOT_FOUND', 404, 'R9 for an unknown survey');
    const full = await api('GET', `/api/surveys/${surveyId}`);
    expect(full.json.slotsLeft === 0, 'R4 slotsLeft is 0 after three paid responses', full);
    console.log('  skip    fund, close, refund and the SURVEY_CLOSED check need the real chain');
  }

  console.log(`\ne2e passed: ${step} checks${STUBS ? ' (--stubs)' : ''}`);
}

main().catch((err) => {
  console.error(`\ne2e FAILED: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
