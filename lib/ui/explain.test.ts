import { describe, expect, it } from "vitest";
import type { ScreeningRow } from "@/lib/api/shapes";
import type { Question } from "@/lib/types";
import { explain, formatTime, gibberishWhy } from "./explain";

const Q: Question[] = [
  { id: "q1", type: "scale", text: "Focus online?", required: true, min: 1, max: 5 },
  { id: "q2", type: "open_ended", text: "Biggest challenge?", required: true, allowShort: false },
  { id: "q3", type: "open_ended", text: "A study method?", required: true, allowShort: false },
] as Question[];
const A = [4, "idk lol wifi", "My favorite is Interstellar"];

const row = (over: Partial<ScreeningRow> = {}): ScreeningRow => ({
  responseId: "r", durationMs: 190_000, fastLineMs: 6_000, screened: true, hardFails: [], weak: [], ai: null, ...over,
});
const VALID = { label: "valid" as const, type: null, injection: false, agreed: true, reason: "Fine.", flagged: null };

describe("explain", () => {
  it("names the question when the two AI runs disagreed, and says the AI decided Review", () => {
    const s = row({
      ai: { label: "unclear", type: "other", injection: false, agreed: false, reason: "The AI check was inconclusive.",
        flagged: [{ questionId: "q2", label: "unclear", type: "other", injection: false, agreed: false, reason: "The AI check was inconclusive." }] },
    });
    const x = explain("review", ["The AI check was inconclusive."], s, Q, A);
    expect(x.title).toBe("The AI runs disagreed on Q2");
    expect(x.sub).toBe("Everything else passed, so this one is up to you.");
    expect(x.pills.map((p) => p.label)).toEqual(["Code checks", "Pace", "AI split · Q2"]);
    expect(x.steps.filter((s) => s.decided).map((s) => s.label)).toEqual(["AI label"]);
    expect(x.focus).toMatchObject({ qi: 1, answer: "idk lol wifi", tag: "AI split", aiSays: null });
    expect(x.others.map((o) => o.qi)).toEqual([2]);
    expect(x.time).toBe("3m 10s");
  });

  it("quotes the AI's own reason when both runs agreed", () => {
    const flag = { questionId: "q3", label: "non_answer" as const, type: "off_question" as const, injection: false, agreed: true, reason: "Names a movie." };
    const x = explain("review", ["Names a movie."], row({ ai: { ...flag, flagged: [flag] } }), Q, A);
    expect(x.title).toBe("The AI says Q3 doesn't answer the question");
    expect(x.focus).toMatchObject({ qi: 2, aiSays: "Names a movie.", chips: ["Off question", "Both runs agreed"] });
    expect(x.pills[2]).toEqual({ tone: "warn", label: "AI · off question · Q3" });
  });

  it("explains a hard fail with the rule it broke; the AI was not run", () => {
    const x = explain("no", ["An open-ended answer was not readable text."], row({ hardFails: [{ check: "gibberish", questionId: "q3" }] }), Q, [4, "fine", "sdfghjkl"]);
    expect(x.title).toBe("Q3 isn't readable text");
    expect(x.sub).toBe("A code check decided this. The AI wasn't asked.");
    expect(x.pills.map((p) => p.tone)).toEqual(["fail", "pass", "skip"]);
    expect(x.steps[0]).toMatchObject({ label: "Code checks", decided: true });
    expect(x.focus?.note).toBe("6 or more letters with no vowel.");
  });

  it("pays with one pace note and marks Otherwise pay as the decider", () => {
    const x = explain("pay", ["Passed all checks."], row({ weak: ["too_fast"], ai: VALID }), Q, A);
    expect(x.title).toMatch(/^Passed\. Finished fast/);
    expect(x.steps.find((s) => s.decided)?.label).toBe("Otherwise pay");
  });

  it("shows the researcher's own decision last", () => {
    const flag = { questionId: "q2", label: "unclear" as const, type: "other" as const, injection: false, agreed: false, reason: "x" };
    const x = explain("no", ["x", "Not paid by the researcher: The answer was too vague to count."], row({ ai: { ...flag, flagged: [flag] } }), Q, A);
    expect(x.you).toBe("not_paid");
    expect(x.sub).toBe("You chose not to pay: The answer was too vague to count.");
    expect(x.steps.filter((s) => s.decided).map((s) => s.label)).toEqual(["You"]);
  });

  it("falls back for unscreened rows and old decisions without flagged questions", () => {
    expect(explain("pending", [], undefined, Q, A).title).toBe("Being checked");
    const x = explain("review", ["x"], row({ ai: { label: "unclear", type: "other", injection: false, agreed: false, reason: "x", flagged: null } }), Q, A);
    expect(x.title).toBe("The AI runs disagreed");
    expect(x.focus).toBeNull();
  });
});

describe("helpers", () => {
  it("formats times and names gibberish rules", () => {
    expect(formatTime(42_000)).toBe("42s");
    expect(formatTime(120_000)).toBe("2m");
    expect(gibberishWhy("!!!")).toBe("It has no letters.");
    expect(gibberishWhy("aaaaaa")).toBe("It is one character repeated.");
  });
});
