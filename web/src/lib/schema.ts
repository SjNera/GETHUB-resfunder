import { keccak256, toBytes } from "viem";
import { z } from "zod";
import type { Survey } from "./types";

/** zod schema for the survey JSON — shared with the backend later. */
const base = {
  id: z.string().min(1),
  title: z.string().trim().min(1, "Add a question title"),
  description: z.string().optional(),
  required: z.boolean(),
};

export const questionSchema = z.discriminatedUnion("type", [
  z.object({ ...base, type: z.enum(["short_answer", "paragraph"]), allowShort: z.boolean() }),
  z.object({
    ...base,
    type: z.enum(["multiple_choice", "checkboxes"]),
    options: z
      .array(z.string().trim().min(1, "Options can't be empty"))
      .min(2, "Add at least two options"),
  }),
  z.object({ ...base, type: z.literal("linear_scale"), minLabel: z.string(), maxLabel: z.string() }),
]);

export const surveyContentSchema = z.object({
  title: z.string().trim().min(3, "Give the survey a title"),
  description: z.string(),
  questions: z.array(questionSchema).min(1, "Add at least one question"),
});

export type SurveyContent = z.infer<typeof surveyContentSchema>;

/** Deterministic JSON: object keys sorted at every level. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

/**
 * The hash recorded on-chain at funding, so questions can't change after
 * launch. Covers title, description and questions only.
 */
export function surveyHash(survey: Pick<Survey, "title" | "description" | "questions">): `0x${string}` {
  const content = { title: survey.title, description: survey.description, questions: survey.questions };
  return keccak256(toBytes(canonicalJson(content)));
}

export function validateSurvey(survey: Pick<Survey, "title" | "description" | "questions">) {
  return surveyContentSchema.safeParse({
    title: survey.title,
    description: survey.description,
    questions: survey.questions,
  });
}
