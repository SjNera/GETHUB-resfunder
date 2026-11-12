// Lane C. Submit pipeline (R5). Source: docs/TDD.md section 11.2. Server only.
// Screening does not run here; the browser calls R6 next.
import { z } from 'zod';
import { emailHash, normalizeEmail, verifyAuth } from '../auth/signature';
import { isUniqueViolation } from '../db/client';
import { getSurvey, insertResponse } from '../db/queries';
import { validateAnswers } from '../survey-schema';
import type { Answers, AuthProof, Hex } from '../types';
import { ApiFailure } from './errors';
import type { SubmitResult } from './shapes';

const DAY_MS = 24 * 60 * 60 * 1000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const submitBodySchema = z.object({
  surveyId: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  email: z.string().max(320),
  answers: z.record(z.string(), z.union([z.string(), z.number()])),
  startedAt: z.number().int().positive(),
  auth: z.object({
    wallet: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
    signature: z.string().regex(/^0x[0-9a-fA-F]+$/),
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
  if (!EMAIL_RE.test(email)) throw new ApiFailure('INVALID_INPUT', 'The email address is not valid.');
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
