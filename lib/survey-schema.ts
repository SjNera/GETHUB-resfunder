// Survey and answer validation. Source: docs/TDD.md section 4.1.
// Browser and server safe. Used by the register route and by the UI before funding.
import { z } from 'zod';
import type { Answers, SurveyJson } from './types';

const OPEN_ENDED_MAX_CHARS = 5000;

const base = {
  id: z.string().min(1),
  text: z.string().min(1),
  required: z.boolean(),
};

const multipleChoiceSchema = z
  .object({
    ...base,
    type: z.literal('multiple_choice'),
    options: z.array(z.string().refine((s) => s.trim().length > 0, 'Option must not be empty')).min(2),
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
  .refine((q) => q.min < q.max, { message: 'Scale min must be less than max' });

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
    title: z.string().min(1).max(200),
    description: z.string(),
    questions: z.array(questionSchema).min(1).max(30),
  })
  .strict()
  .refine((s) => new Set(s.questions.map((q) => q.id)).size === s.questions.length, {
    message: 'Question ids must be unique',
  });

export type AnswerValidation = { ok: true } | { ok: false; message: string };

export function validateAnswers(survey: SurveyJson, answers: Answers): AnswerValidation {
  const byId = new Map(survey.questions.map((q) => [q.id, q]));

  for (const id of Object.keys(answers)) {
    if (!byId.has(id)) return { ok: false, message: `Unknown question id: ${id}` };
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
        break;
    }
  }
  return { ok: true };
}
