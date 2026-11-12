// Survey and answer validation. Source: docs/TDD.md section 4.1.
// Browser and server safe. Used by the register route and by the UI before funding.
// The schema only checks; it never changes a value, so the survey hash is not affected.
import { z } from 'zod';
import type { Answers, SurveyJson } from './types';

const OPEN_ENDED_MAX_CHARS = 5000;

/** Size limits. The UI can import them to limit its inputs before funding. */
export const SURVEY_LIMITS = {
  titleChars: 200,
  descriptionChars: 5000,
  questions: 30,
  questionIdChars: 64,
  questionTextChars: 1000,
  options: 50,
  optionChars: 300,
  scaleSpan: 100,
  openEndedChars: OPEN_ENDED_MAX_CHARS,
} as const;

/** A NUL character or half of a surrogate pair. Postgres cannot store either. */
const UNSTORABLE_RE = /[\u0000\p{Cs}]/u;

/** False for text the database would reject. */
export function isStorableText(text: string): boolean {
  return !UNSTORABLE_RE.test(text);
}

const QUESTION_ID_RE = /^[A-Za-z0-9_-]+$/;

/** Ids are used as object keys, so names that exist on every object (constructor, __proto__) are refused. */
function isSafeQuestionId(id: string): boolean {
  return QUESTION_ID_RE.test(id) && !(id in Object.prototype);
}

const text = (maxChars: number) =>
  z.string().max(maxChars).refine(isStorableText, 'Text contains characters that cannot be stored');
const nonBlank = (maxChars: number) =>
  text(maxChars).refine((s) => s.trim().length > 0, 'Must not be empty');

const base = {
  id: z
    .string()
    .min(1)
    .max(SURVEY_LIMITS.questionIdChars)
    .refine(isSafeQuestionId, 'Question id may use letters, digits, "_" and "-" only'),
  text: nonBlank(SURVEY_LIMITS.questionTextChars),
  required: z.boolean(),
};

const multipleChoiceSchema = z
  .object({
    ...base,
    type: z.literal('multiple_choice'),
    options: z
      .array(nonBlank(SURVEY_LIMITS.optionChars))
      .min(2)
      .max(SURVEY_LIMITS.options)
      .refine((options) => new Set(options.map((o) => o.trim())).size === options.length, 'Options must be unique'),
  })
  .strict();

const scaleSchema = z
  .object({
    ...base,
    type: z.literal('scale'),
    min: z.number().int(),
    max: z.number().int(),
  })
  .strict()
  .refine((q) => q.min < q.max, { message: 'Scale min must be less than max' })
  .refine((q) => q.max - q.min <= SURVEY_LIMITS.scaleSpan, {
    message: `Scale may span at most ${SURVEY_LIMITS.scaleSpan} steps`,
  });

const openEndedSchema = z
  .object({
    ...base,
    type: z.literal('open_ended'),
    allowShort: z.boolean(),
  })
  .strict();

const questionSchema = z.union([multipleChoiceSchema, scaleSchema, openEndedSchema]);

export const surveySchema = z
  .object({
    title: nonBlank(SURVEY_LIMITS.titleChars),
    description: text(SURVEY_LIMITS.descriptionChars),
    questions: z.array(questionSchema).min(1).max(SURVEY_LIMITS.questions),
  })
  .strict()
  .refine((s) => new Set(s.questions.map((q) => q.id)).size === s.questions.length, {
    message: 'Question ids must be unique',
  });

export type AnswerValidation = { ok: true } | { ok: false; message: string };

export function validateAnswers(survey: SurveyJson, answers: Answers): AnswerValidation {
  const byId = new Map(survey.questions.map((q) => [q.id, q]));

  for (const id of Object.keys(answers)) {
    // The id comes from the request, so only a short piece of it is echoed.
    if (!byId.has(id)) return { ok: false, message: `Unknown question id: ${id.slice(0, SURVEY_LIMITS.questionIdChars)}` };
  }

  for (const q of survey.questions) {
    const has = Object.prototype.hasOwnProperty.call(answers, q.id);
    if (!has) {
      if (q.required) return { ok: false, message: `Missing answer for ${q.id}` };
      continue;
    }
    const a = answers[q.id];
    switch (q.type) {
      case 'multiple_choice':
        if (typeof a !== 'string' || !q.options.includes(a)) {
          return { ok: false, message: `Answer for ${q.id} is not one of the options` };
        }
        break;
      case 'scale':
        if (typeof a !== 'number' || !Number.isInteger(a) || a < q.min || a > q.max) {
          return { ok: false, message: `Answer for ${q.id} must be an integer from ${q.min} to ${q.max}` };
        }
        break;
      case 'open_ended':
        // Empty text is allowed here; screening judges it.
        if (typeof a !== 'string' || a.length > OPEN_ENDED_MAX_CHARS) {
          return { ok: false, message: `Answer for ${q.id} must be text of at most ${OPEN_ENDED_MAX_CHARS} characters` };
        }
        if (!isStorableText(a)) {
          return { ok: false, message: `Answer for ${q.id} contains characters that cannot be stored` };
        }
        break;
    }
  }
  return { ok: true };
}
