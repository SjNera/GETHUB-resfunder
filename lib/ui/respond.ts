// Pure helpers for the respondent page.
import { validateAnswers } from "@/lib/survey-schema";
import type { Answers, ResponseStatus, SurveyJson } from "@/lib/types";

export type Draft = Record<string, string | number | undefined>;

export const FINAL_STATUSES: readonly ResponseStatus[] = ["paid", "blocked", "review"];
export const isFinal = (s: ResponseStatus) => FINAL_STATUSES.includes(s);

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const isEmail = (v: string) => EMAIL.test(v.trim()) && v.trim().length <= 254;

/** Drops unanswered optional questions and empty strings, keeping the typed values the API expects. */
export function toAnswers(survey: SurveyJson, draft: Draft): Answers {
  const out: Answers = {};
  for (const q of survey.questions) {
    const v = draft[q.id];
    if (v === undefined) continue;
    if (q.type === "open_ended") {
      if (typeof v === "string" && (v.length > 0 || q.required)) out[q.id] = v;
    } else if (q.type === "scale") {
      if (typeof v === "number") out[q.id] = v;
    } else if (typeof v === "string" && v) out[q.id] = v;
  }
  return out;
}

export type FormCheck = { ok: true; answers: Answers } | { ok: false; problems: Record<string, string> };

export function checkForm(survey: SurveyJson, email: string, draft: Draft): FormCheck {
  const problems: Record<string, string> = {};
  if (!isEmail(email)) problems.email = "Enter a valid email address.";
  const answers = toAnswers(survey, draft);
  for (const q of survey.questions) {
    if (q.required && answers[q.id] === undefined) problems[q.id] = "This question is required.";
    else if (q.type === "open_ended" && q.required && typeof answers[q.id] === "string" && !(answers[q.id] as string).trim()) {
      problems[q.id] = "This question is required.";
    }
  }
  if (Object.keys(problems).length === 0) {
    const v = validateAnswers(survey, answers);
    if (!v.ok) problems.form = v.message;
  }
  return Object.keys(problems).length ? { ok: false, problems } : { ok: true, answers };
}
