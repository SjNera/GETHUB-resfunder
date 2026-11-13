// Lane C. Submit pipeline (R5). Source: docs/TDD.md section 11.2. Server only.
// Screening does not run here; the browser calls R6 next.
import { z } from 'zod';
import { emailHash, normalizeEmail, SIGNATURE_RE, verifyAuth, WALLET_RE } from '../auth/signature';
import { isUniqueViolation } from '../db/client';
import { getSurvey, insertResponse } from '../db/queries';
import { SURVEY_LIMITS, validateAnswers } from '../survey-schema';
import type { Answers, AuthProof, Hex } from '../types';
import { ApiFailure } from './errors';
import type { SubmitResult } from './shapes';

const DAY_MS = 24 * 60 * 60 * 1000;
const EMAIL_MAX_CHARS = 254;
const EMAIL_LOCAL_MAX_CHARS = 64;
// Checked after normalizeEmail, so lowercase only. Plain ASCII addresses: the first character is a
// letter, digit or "_", so an address can never start a spreadsheet formula in an export.
const EMAIL_RE =
  /^[a-z0-9_][a-z0-9_%+-]*(?:\.[a-z0-9_%+-]+)*@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

function isValidEmail(email: string): boolean {
  return (
    email.length <= EMAIL_MAX_CHARS && email.indexOf('@') <= EMAIL_LOCAL_MAX_CHARS && EMAIL_RE.test(email)
  );
}

const submitBodySchema = z.object({
  surveyId: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  email: z.string().max(320),
  answers: z
    .record(
      z.string().max(SURVEY_LIMITS.questionIdChars),
      z.union([z.string().max(SURVEY_LIMITS.openEndedChars), z.number().int()]),
    )
    .refine((a) => Object.keys(a).length <= SURVEY_LIMITS.questions, 'Too many answers'),
  startedAt: z.number().int().positive(),
  auth: z.object({
    wallet: z.string().regex(WALLET_RE),
    signature: z.string().regex(SIGNATURE_RE),
    timestamp: z.number().int().positive(),
  }),
});

export async function submitResponse(body: unknown): Promise<SubmitResult> {
  // 1. Shape, then the survey.
  const input = submitBodySchema.parse(body);
  const survey = await getSurvey(input.surveyId);
  if (!survey) throw new ApiFailure('SURVEY_NOT_FOUND', 'Survey not found.');

  // 2. Open and not paused.
  const now = Date.now();
  if (survey.status === 'closed' || now >= survey.deadline * 1000) {
    throw new ApiFailure('SURVEY_CLOSED', 'This survey is closed.');
  }
  if (survey.paused) throw new ApiFailure('SURVEY_PAUSED', 'This survey is paused.');

  // 3. Quota.
  if (survey.activeCount >= survey.quota) throw new ApiFailure('QUOTA_FULL', 'This survey has no slots left.');

  // 4. Wallet.
  const proof: AuthProof = { ...input.auth, signature: input.auth.signature as Hex };
  const wallet = await verifyAuth(proof, 'submit', input.surveyId);

  // 5. Email and answers.
  const email = normalizeEmail(input.email);
  if (!isValidEmail(email)) throw new ApiFailure('INVALID_INPUT', 'The email address is not valid.');
  const answers = input.answers as Answers;
  const check = validateAnswers(survey.survey, answers);
  if (!check.ok) throw new ApiFailure('INVALID_INPUT', check.message);

  // 6. startedAt is in the past, within 24 hours.
  if (input.startedAt > now || now - input.startedAt > DAY_MS) {
    throw new ApiFailure('INVALID_INPUT', 'startedAt must be in the past and within 24 hours.');
  }

  // 7. Insert. The unique constraints are the one-submission rule.
  try {
    const responseId = await insertResponse({
      surveyId: input.surveyId,
      wallet,
      email,
      emailHash: emailHash(email, input.surveyId),
      answers,
      startedAt: new Date(input.startedAt),
    });
    return { responseId };
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new ApiFailure('ALREADY_SUBMITTED', 'This wallet or email has already answered this survey.');
    }
    throw err;
  }
}
