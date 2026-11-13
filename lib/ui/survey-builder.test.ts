import { describe, expect, it } from "vitest";
import { surveyHash } from "@/lib/canonical";
import { surveySchema } from "@/lib/survey-schema";
import {
  blankQuestion,
  initialState,
  MAX_QUESTIONS,
  reduce,
  validate,
  type BuilderAction,
  type BuilderState,
} from "./survey-builder";

const run = (s: BuilderState, ...as: BuilderAction[]) => as.reduce(reduce, s);
const filled = (): BuilderState =>
  run(initialState(), { kind: "setTitle", value: "Study habits" }, { kind: "setText", id: "q1", value: "Where do you study?" });

describe("builder reducer", () => {
  it("adds one question of each type with sensible defaults", () => {
    const s = run(
      initialState(),
      { kind: "addQuestion", type: "scale" },
      { kind: "addQuestion", type: "open_ended" },
    );
    expect(s.questions.map((q) => q.type)).toEqual(["multiple_choice", "scale", "open_ended"]);
    expect(s.questions.map((q) => q.id)).toEqual(["q1", "q2", "q3"]);
    expect(s.questions[1]).toMatchObject({ min: 1, max: 5 });
    expect(s.questions[2]).toMatchObject({ allowShort: false });
  });

  it("never reuses an id after a delete", () => {
    const s = run(
      initialState(),
      { kind: "addQuestion" },
      { kind: "addQuestion" },
      { kind: "removeQuestion", id: "q2" },
      { kind: "addQuestion" },
    );
    expect(s.questions.map((q) => q.id)).toEqual(["q1", "q3", "q4"]);
  });

  it("keeps at least one question and at most 30", () => {
    expect(run(initialState(), { kind: "removeQuestion", id: "q1" }).questions).toHaveLength(1);
    let s = initialState();
    for (let i = 0; i < 40; i++) s = reduce(s, { kind: "addQuestion" });
    expect(s.questions).toHaveLength(MAX_QUESTIONS);
  });

  it("changing type keeps the text and required flag, resets type fields", () => {
    const s = run(
      filled(),
      { kind: "setRequired", id: "q1", value: false },
      { kind: "changeType", id: "q1", type: "scale" },
    );
    expect(s.questions[0]).toEqual({ id: "q1", type: "scale", text: "Where do you study?", required: false, min: 1, max: 5 });
  });

  it("moves and duplicates questions", () => {
    let s = run(filled(), { kind: "addQuestion", type: "scale" }, { kind: "moveQuestion", id: "q2", dir: -1 });
    expect(s.questions.map((q) => q.id)).toEqual(["q2", "q1"]);
    s = reduce(s, { kind: "moveQuestion", id: "q2", dir: -1 });
    expect(s.questions.map((q) => q.id)).toEqual(["q2", "q1"]);
    s = reduce(s, { kind: "duplicateQuestion", id: "q1" });
    expect(s.questions.map((q) => q.id)).toEqual(["q2", "q1", "q3"]);
    s = reduce(s, { kind: "addOption", id: "q3" });
    expect(s.questions[1]).toMatchObject({ options: ["Option 1", "Option 2"] });
  });

  it("edits options but keeps 2 to 12", () => {
    let s = run(filled(), { kind: "addOption", id: "q1" }, { kind: "setOption", id: "q1", index: 2, value: "Cafe" });
    expect(s.questions[0]).toMatchObject({ options: ["Option 1", "Option 2", "Cafe"] });
    s = run(s, { kind: "removeOption", id: "q1", index: 0 }, { kind: "removeOption", id: "q1", index: 0 }, { kind: "removeOption", id: "q1", index: 0 });
    expect((s.questions[0] as { options: string[] }).options).toHaveLength(2);
    for (let i = 0; i < 20; i++) s = reduce(s, { kind: "addOption", id: "q1" });
    expect((s.questions[0] as { options: string[] }).options).toHaveLength(12);
  });
});

describe("validate", () => {
  it("accepts a filled survey, and its output passes the shared schema and hashes", () => {
    const s = run(filled(), { kind: "addQuestion", type: "scale" }, { kind: "setText", id: "q2", value: "Rate it" }, { kind: "addQuestion", type: "open_ended" }, { kind: "setText", id: "q3", value: "Why?" });
    const v = validate(s);
    expect(v.ok).toBe(true);
    expect(surveySchema.safeParse(v.survey).success).toBe(true);
    expect(surveyHash(v.survey)).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it("flags missing title and question text", () => {
    const v = validate(initialState());
    expect(v.ok).toBe(false);
    expect(v.errors.title).toBeTruthy();
    expect(v.errors.questions.q1).toContain("Write the question.");
  });

  it("flags empty and duplicate options", () => {
    const s = run(filled(), { kind: "setOption", id: "q1", index: 0, value: " " });
    expect(validate(s).errors.questions.q1).toContain("Options can't be empty.");
    const d = run(filled(), { kind: "setOption", id: "q1", index: 0, value: "A" }, { kind: "setOption", id: "q1", index: 1, value: "a" });
    expect(validate(d).errors.questions.q1).toContain("Options must be different from each other.");
  });

  it("flags a scale whose min is not below max", () => {
    const s = run(filled(), { kind: "changeType", id: "q1", type: "scale" }, { kind: "setScale", id: "q1", field: "min", value: 5 });
    expect(validate(s).ok).toBe(false);
    expect(validate(s).errors.questions.q1?.[0]).toMatch(/lower/);
  });

  it("blankQuestion matches the schema for every type", () => {
    for (const t of ["multiple_choice", "scale", "open_ended"] as const) {
      const q = blankQuestion("q1", t, "x");
      expect(surveySchema.safeParse({ title: "t", description: "", questions: [q] }).success).toBe(true);
    }
  });
});
