// Task C1 check: inserts and reads one row per table through lib/db/queries.ts.
//   npm run db:smoke        (needs DATABASE_URL and an applied schema: npm run db:apply)
// The rows stay in the database under a random survey id of 900000000 or more.
import { randomBytes } from 'node:crypto';
import { reasonHash, surveyHash } from '../lib/canonical';
import {
  getDecision,
  getResponse,
  getSurvey,
  insertDecision,
  insertResponse,
  insertSurvey,
  listLogRecords,
} from '../lib/db/queries';
import type { Hex, SurveyJson } from '../lib/types';

const hex = (bytes: number): Hex => `0x${randomBytes(bytes).toString('hex')}`;

const survey: SurveyJson = {
  title: 'db smoke',
  description: '',
  questions: [{ id: 'q1', type: 'open_ended', text: 'Anything?', required: true, allowShort: true }],
};

async function main(): Promise<void> {
  const surveyId = 900_000_000 + Math.floor(Math.random() * 90_000_000);
  const rateWei = BigInt('123456789012345678901234567890'); // larger than 2^64: NUMERIC must round-trip

  await insertSurvey({
    surveyId,
    researcher: hex(20),
    survey,
    surveyHash: surveyHash(survey),
    rateWei,
    quota: 3,
    deadline: Math.floor(Date.now() / 1000) + 3600,
    feePerResponseWei: BigInt(38390000000000),
    txHash: hex(32),
  });
  const s = await getSurvey(surveyId);
  if (!s || s.rateWei !== rateWei || s.survey.title !== survey.title) throw new Error('surveys: read back failed');
  console.log(`surveys   ok  survey_id=${s.surveyId} rate_wei=${s.rateWei} status=${s.status}`);

  const responseId = await insertResponse({
    surveyId,
    wallet: hex(20),
    email: 'smoke@example.com',
    emailHash: hex(32),
    answers: { q1: 'none' },
    startedAt: new Date(Date.now() - 60_000),
  });
  const r = await getResponse(responseId);
  if (!r || r.answers.q1 !== 'none' || r.status !== 'received') throw new Error('responses: read back failed');
  console.log(`responses ok  id=${r.id} status=${r.status}`);

  const reasons = ['db smoke'];
  await insertDecision({
    responseId,
    result: 'review',
    reasons,
    reasonHash: reasonHash(reasons),
    signals: { hardFails: [], weak: [] },
    ai: null,
    llmModel: null,
    rubricVersion: 'smoke',
    status: 'off_chain',
  });
  const d = await getDecision(responseId);
  if (!d || d.reasons[0] !== 'db smoke' || d.status !== 'off_chain') throw new Error('decisions: read back failed');
  console.log(`decisions ok  id=${d.id} result=${d.result} status=${d.status}`);

  const log = await listLogRecords(surveyId);
  if (log.length !== 1 || log[0].response.status !== 'review') throw new Error('log join: read back failed');
  console.log('log join  ok  1 row, response moved to review with its off_chain decision');
}

main().catch((err) => {
  console.error('db-smoke failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
