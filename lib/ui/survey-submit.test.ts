import { describe, expect, it } from "vitest";
import { parseEther } from "viem";
import { planFunding, splitBudget } from "./survey-submit";
import { toSurveyJson, initialState } from "./survey-builder";

const survey = toSurveyJson({ ...initialState(), title: "T" });
const now = Date.parse("2026-11-12T00:00:00Z");
const fee = parseEther("0.0002");

describe("planFunding", () => {
  it("derives the rate from a total that includes the fee", () => {
    const r = planFunding(survey, { total: "0.12", quota: "100", deadline: "2026-12-01" }, fee, now);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.plan.rate).toBe(parseEther("0.001"));
      expect(r.plan.budget).toBe(parseEther("0.1"));
      expect(r.plan.fee).toBe(parseEther("0.02"));
      expect(r.plan.deposit).toBe(parseEther("0.12"));
      expect(r.plan.leftover).toBe(BigInt(0));
      expect(r.plan.warning).toBeUndefined();
      expect(r.plan.hash).toMatch(/^0x[0-9a-f]{64}$/);
    }
  });

  it("rounds the rate down and never deposits more than the total", () => {
    const total = parseEther("0.1") + BigInt(7);
    const r = planFunding(survey, { total: "0.100000000000000007", quota: "3", deadline: "2026-12-01" }, fee, now);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.plan.deposit).toBe(r.plan.rate * BigInt(3) + fee * BigInt(3));
      expect(r.plan.deposit <= total).toBe(true);
      expect(r.plan.leftover).toBe(total - r.plan.deposit);
      expect(r.plan.leftover < BigInt(3)).toBe(true);
    }
  });

  it("rejects a total that doesn't cover the fee, and names the minimum", () => {
    const r = planFunding(survey, { total: "0.02", quota: "100", deadline: "2026-12-01" }, fee, now);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(Object.keys(r.errors)).toEqual(["total"]);
      expect(r.errors.total).toContain("0.02 tBNB for 100 responses");
    }
  });

  it("still gives the split when only the deadline is wrong", () => {
    const r = planFunding(survey, { total: "0.12", quota: "100", deadline: "2026-01-01" }, fee, now);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(Object.keys(r.errors)).toEqual(["deadline"]);
      expect(r.split?.rate).toBe(parseEther("0.001"));
    }
  });

  it("rejects bad total, quota and past deadline", () => {
    const r = planFunding(survey, { total: "abc", quota: "0", deadline: "2026-01-01" }, BigInt(1), now);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["deadline", "quota", "total"]);
  });

  it("rejects an empty quota", () => {
    const r = planFunding(survey, { total: "1", quota: " ", deadline: "2026-12-01" }, fee, now);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.quota).toBeDefined();
  });
});

describe("splitBudget", () => {
  it("pays 1 wei per response when the total is quota wei above the fee", () => {
    const s = splitBudget(fee * BigInt(10) + BigInt(10), 10, fee);
    expect(s.ok && s.split.rate).toBe(BigInt(1));
    expect(splitBudget(fee * BigInt(10) + BigInt(9), 10, fee).ok).toBe(false);
  });

  it("errors when the total equals the fee", () => {
    expect(splitBudget(fee * BigInt(10), 10, fee).ok).toBe(false);
  });

  it("warns when the fee is more than half the deposit", () => {
    const over = splitBudget(parseEther("0.0003") * BigInt(10), 10, fee); // rate 0.0001, fee 0.0002
    expect(over.ok && over.split.warning).toBeTruthy();
    const even = splitBudget(parseEther("0.0004") * BigInt(10), 10, fee); // rate = fee: exactly 50%
    expect(even.ok && even.split.warning).toBeUndefined();
  });
});
