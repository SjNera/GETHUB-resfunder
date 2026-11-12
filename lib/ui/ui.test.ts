import { describe, expect, it } from "vitest";
import { parseEther } from "viem";
import { breakdown, feeSplit, parseBnb, refundAmount } from "./fees";
import { formatBnb, plural } from "./format";

const bnb = (x: string) => parseEther(x);

describe("fees (tBNB, flat fee per response)", () => {
  it("deposit = rate × quota + quota × feePerResponse", () => {
    const b = breakdown(bnb("0.001"), 150, bnb("0.0002"));
    expect(b.budget).toBe(bnb("0.15"));
    expect(b.fee).toBe(bnb("0.03"));
    expect(b.deposit).toBe(bnb("0.18"));
  });
  it("splits the fee into the agent's gas part and the platform's profit", () => {
    const s = feeSplit(150, bnb("0.0002"), bnb("0.00015"));
    expect(s.agent).toBe(bnb("0.0225"));
    expect(s.platform).toBe(bnb("0.0075"));
  });
  it("refunds only the unpaid budget", () => {
    expect(refundAmount(bnb("0.001"), 150, 60)).toBe(bnb("0.09"));
    expect(refundAmount(bnb("0.001"), 150, 200)).toBe(BigInt(0));
  });
  it("parses and formats tBNB", () => {
    expect(parseBnb("0.001")).toBe(bnb("0.001"));
    expect(parseBnb("abc")).toBeNull();
    expect(formatBnb(bnb("0.18"))).toBe("0.18 tBNB");
  });
});

describe("text", () => {
  it("pluralizes counts", () => {
    expect(plural(1, "response")).toBe("1 response");
    expect(plural(2, "response")).toBe("2 responses");
  });
});
