import { describe, expect, it } from "vitest";
import { parseSurveyRef } from "./join";

describe("parseSurveyRef", () => {
  it("accepts links, paths and bare ids", () => {
    for (const ok of ["https://resfunder.app/s/7", "/s/7", "s/7", "7", " 7 ", "http://localhost:3000/s/7?x=1"]) expect(parseSurveyRef(ok)).toBe("/s/7");
  });
  it("rejects anything else", () => {
    for (const bad of ["", "abc", "/s/", "https://x.com/other/7", "7a", "-1"]) expect(parseSurveyRef(bad)).toBeNull();
  });
});
