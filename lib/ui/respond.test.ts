import { describe, expect, it } from "vitest";
import type { SurveyJson } from "@/lib/types";
import { checkForm, isEmail, isFinal, toAnswers } from "./respond";

const survey: SurveyJson = {
  title: "T",
  description: "",
  questions: [
    { id: "q1", type: "multiple_choice", text: "Where?", required: true, options: ["Library", "Home"] },
    { id: "q2", type: "scale", text: "Rate", required: false, min: 1, max: 5 },
    { id: "q3", type: "open_ended", text: "Why?", required: true, allowShort: false },
  ],
};

describe("respondent form", () => {
  it("accepts a complete form and builds typed answers", () => {
    const r = checkForm(survey, "a@b.co", { q1: "Home", q2: 4, q3: "Because it is quiet" });
    expect(r).toEqual({ ok: true, answers: { q1: "Home", q2: 4, q3: "Because it is quiet" } });
  });
  it("skips an unanswered optional question", () => {
    expect(toAnswers(survey, { q1: "Home", q3: "x" })).toEqual({ q1: "Home", q3: "x" });
  });
  it("flags missing email and required answers", () => {
    const r = checkForm(survey, "nope", {});
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.problems).sort()).toEqual(["email", "q1", "q3"]);
  });
  it("rejects whitespace-only required text", () => {
    const r = checkForm(survey, "a@b.co", { q1: "Home", q3: "   " });
    expect(r.ok).toBe(false);
  });
  it("email and final-status helpers", () => {
    expect(isEmail(" a@b.co ")).toBe(true);
    expect(isEmail("a@b")).toBe(false);
    expect(isFinal("paid") && isFinal("review") && !isFinal("processing")).toBe(true);
  });
});
