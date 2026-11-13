// Pure state logic for the survey builder (no React). Output is a SurveyJson
// validated by lib/survey-schema.ts and hashed by lib/canonical.ts.
import { surveySchema } from "@/lib/survey-schema";
import type { Question, SurveyJson } from "@/lib/types";

export const MAX_QUESTIONS = 30;
export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 12;

export type QuestionType = Question["type"];

export const QUESTION_TYPES: ReadonlyArray<{ type: QuestionType; label: string; hint: string }> = [
  { type: "multiple_choice", label: "Multiple choice", hint: "Pick one option" },
  { type: "scale", label: "Linear scale", hint: "A whole number in a range" },
  { type: "open_ended", label: "Written answer", hint: "Typed text, checked by code and the AI label" },
];

export type BuilderState = {
  title: string;
  description: string;
  questions: Question[];
};

export type BuilderAction =
  | { kind: "setTitle"; value: string }
  | { kind: "setDescription"; value: string }
  | { kind: "addQuestion"; type?: QuestionType }
  | { kind: "removeQuestion"; id: string }
  | { kind: "duplicateQuestion"; id: string }
  | { kind: "moveQuestion"; id: string; dir: -1 | 1 }
  | { kind: "changeType"; id: string; type: QuestionType }
  | { kind: "setText"; id: string; value: string }
  | { kind: "setRequired"; id: string; value: boolean }
  | { kind: "addOption"; id: string }
  | { kind: "setOption"; id: string; index: number; value: string }
  | { kind: "removeOption"; id: string; index: number }
  | { kind: "setScale"; id: string; field: "min" | "max"; value: number }
  | { kind: "setAllowShort"; id: string; value: boolean }
  | { kind: "reset"; state: BuilderState };

export function blankQuestion(id: string, type: QuestionType, text = ""): Question {
  const base = { id, text, required: true };
  switch (type) {
    case "multiple_choice":
      return { ...base, type, options: ["Option 1", "Option 2"] };
    case "scale":
      return { ...base, type, min: 1, max: 5 };
    case "open_ended":
      return { ...base, type, allowShort: false };
  }
}

export function initialState(): BuilderState {
  return { title: "", description: "", questions: [blankQuestion("q1", "multiple_choice")] };
}

/** Next unused "qN" id. Ids are never reused within a session of edits. */
export function nextId(questions: readonly Question[]): string {
  const used = new Set(questions.map((q) => q.id));
  let n = questions.length + 1;
  for (const q of questions) {
    const m = /^q(\d+)$/.exec(q.id);
    if (m) n = Math.max(n, Number(m[1]) + 1);
  }
  while (used.has(`q${n}`)) n += 1;
  return `q${n}`;
}

const mapQ = (s: BuilderState, id: string, f: (q: Question) => Question): BuilderState => ({
  ...s,
  questions: s.questions.map((q) => (q.id === id ? f(q) : q)),
});

export function reduce(s: BuilderState, a: BuilderAction): BuilderState {
  switch (a.kind) {
    case "setTitle":
      return { ...s, title: a.value };
    case "setDescription":
      return { ...s, description: a.value };
    case "reset":
      return a.state;
    case "addQuestion": {
      if (s.questions.length >= MAX_QUESTIONS) return s;
      return { ...s, questions: [...s.questions, blankQuestion(nextId(s.questions), a.type ?? "multiple_choice")] };
    }
    case "removeQuestion": {
      if (s.questions.length <= 1) return s;
      return { ...s, questions: s.questions.filter((q) => q.id !== a.id) };
    }
    case "duplicateQuestion": {
      if (s.questions.length >= MAX_QUESTIONS) return s;
      const i = s.questions.findIndex((q) => q.id === a.id);
      if (i < 0) return s;
      const src = s.questions[i];
      const copy = { ...src, id: nextId(s.questions), ...("options" in src ? { options: [...src.options] } : {}) } as Question;
      const questions = [...s.questions];
      questions.splice(i + 1, 0, copy);
      return { ...s, questions };
    }
    case "moveQuestion": {
      const i = s.questions.findIndex((q) => q.id === a.id);
      const j = i + a.dir;
      if (i < 0 || j < 0 || j >= s.questions.length) return s;
      const questions = [...s.questions];
      [questions[i], questions[j]] = [questions[j], questions[i]];
      return { ...s, questions };
    }
    case "changeType":
      return mapQ(s, a.id, (q) =>
        q.type === a.type ? q : { ...blankQuestion(q.id, a.type, q.text), required: q.required },
      );
    case "setText":
      return mapQ(s, a.id, (q) => ({ ...q, text: a.value }));
    case "setRequired":
      return mapQ(s, a.id, (q) => ({ ...q, required: a.value }));
    case "addOption":
      return mapQ(s, a.id, (q) =>
        q.type === "multiple_choice" && q.options.length < MAX_OPTIONS
          ? { ...q, options: [...q.options, `Option ${q.options.length + 1}`] }
          : q,
      );
    case "setOption":
      return mapQ(s, a.id, (q) =>
        q.type === "multiple_choice" ? { ...q, options: q.options.map((o, i) => (i === a.index ? a.value : o)) } : q,
      );
    case "removeOption":
      return mapQ(s, a.id, (q) =>
        q.type === "multiple_choice" && q.options.length > MIN_OPTIONS
          ? { ...q, options: q.options.filter((_, i) => i !== a.index) }
          : q,
      );
    case "setScale":
      return mapQ(s, a.id, (q) => (q.type === "scale" ? { ...q, [a.field]: Math.trunc(a.value) } : q));
    case "setAllowShort":
      return mapQ(s, a.id, (q) => (q.type === "open_ended" ? { ...q, allowShort: a.value } : q));
  }
}

export function toSurveyJson(s: BuilderState): SurveyJson {
  return {
    title: s.title.trim(),
    description: s.description.trim(),
    questions: s.questions.map((q) =>
      q.type === "multiple_choice"
        ? { ...q, text: q.text.trim(), options: q.options.map((o) => o.trim()) }
        : { ...q, text: q.text.trim() },
    ),
  };
}

export type BuilderErrors = {
  title?: string;
  /** Messages keyed by question id. */
  questions: Record<string, string[]>;
  /** Survey-level problems (count, duplicates). */
  general: string[];
};

/** Friendly validation. The shared surveySchema is the final gate. */
export function validate(s: BuilderState): { ok: boolean; errors: BuilderErrors; survey: SurveyJson } {
  const survey = toSurveyJson(s);
  const errors: BuilderErrors = { questions: {}, general: [] };
  const add = (id: string, msg: string) => (errors.questions[id] ??= []).push(msg);

  if (!survey.title) errors.title = "Give the survey a title.";
  else if (survey.title.length > 200) errors.title = "Keep the title under 200 characters.";
  if (survey.questions.length > MAX_QUESTIONS) errors.general.push(`A survey can have at most ${MAX_QUESTIONS} questions.`);

  for (const q of survey.questions) {
    if (!q.text) add(q.id, "Write the question.");
    if (q.type === "multiple_choice") {
      if (q.options.length < MIN_OPTIONS) add(q.id, `Add at least ${MIN_OPTIONS} options.`);
      if (q.options.some((o) => !o)) add(q.id, "Options can't be empty.");
      const lower = q.options.map((o) => o.toLowerCase());
      if (new Set(lower).size !== lower.length) add(q.id, "Options must be different from each other.");
    }
    if (q.type === "scale") {
      if (!Number.isInteger(q.min) || !Number.isInteger(q.max)) add(q.id, "Scale ends must be whole numbers.");
      else if (q.min >= q.max) add(q.id, "The scale's first value must be lower than its last.");
    }
  }

  const friendlyOk = !errors.title && !errors.general.length && Object.keys(errors.questions).length === 0;
  if (friendlyOk && !surveySchema.safeParse(survey).success) {
    errors.general.push("The survey doesn't pass the shared validation. Check every question.");
    return { ok: false, errors, survey };
  }
  return { ok: friendlyOk, errors, survey };
}
