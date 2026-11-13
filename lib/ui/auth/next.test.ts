import { describe, expect, it } from "vitest";
import { safeNext, signInUrl } from "./next";

describe("safeNext", () => {
  it("keeps same-site paths", () => {
    expect(safeNext("/publish")).toBe("/publish");
    expect(safeNext("/s/7?x=1")).toBe("/s/7?x=1");
  });
  it("rejects external and protocol-relative targets", () => {
    for (const bad of ["https://evil.com", "//evil.com", "/\\evil.com", "javascript:alert(1)", "", null, undefined]) {
      expect(safeNext(bad as string | null)).toBe("/surveys");
    }
  });
  it("builds an encoded sign-in url", () => {
    expect(signInUrl("/s/7?a=b")).toBe("/sign-in?next=%2Fs%2F7%3Fa%3Db");
  });
});
