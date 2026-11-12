import { describe, expect, it } from "vitest";
import { parseEther } from "viem";
import { planFunding } from "./survey-submit";
import { toSurveyJson, initialState } from "./survey-builder";

const survey = toSurveyJson({ ...initialState(), title: "T" });
const now = Date.parse("2026-11-12T00:00:00Z");

describe("planFunding", () => {
  it("computes the deposit in wei and a stable hash", () => {
    const r = planFunding(survey, { rate: "0.001", quota: "100", deadline: "2026-12-01" }, parseEther("0.0002"), now);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.plan.budget).toBe(parseEther("0.1"));
      expect(r.plan.deposit).toBe(parseEther("0.12"));
      expect(r.plan.hash).toMatch(/^0x[0-9a-f]{64}$/);
    }
  });
  it("rejects bad rate, quota and past deadline", () => {
    const r = planFunding(survey, { rate: "abc", quota: "0", deadline: "2026-01-01" }, BigInt(1), now);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["deadline", "quota", "rate"]);
  });
});
