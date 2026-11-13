import { describe, expect, it } from "vitest";
import type { ScreeningFlag, ScreeningRow } from "@/lib/api/shapes";
import type { Question } from "@/lib/types";
import { explain, formatTime, gibberishWhy } from "./explain";

const Q: Question[] = [
  { id: "q1", type: "scale", text: "Focus online?", required: true, min: 1, max: 5 },
  { id: "q2", type: "open_ended", text: "Biggest challenge?", required: true, allowShort: false },
  { id: "q3", type: "open_ended", text: "A study method?", required: true, allowShort: false },
  { id: "q4", type: "open_ended", text: "Anything else?", required: false, allowShort: true },
] as Question[];
const A = [4, "idk lol wifi", "My favorite is Interstellar", ""];

const row = (over: Partial<ScreeningRow> = {}): ScreeningRow => ({
  responseId: "r", durationMs: 190_000, fastLineMs: 6_000, screened: true, hardFails: [], weak: [], ai: null, ...over,
});
const VALID = { label: "valid" as const, type: null, injection: false, agreed: true, reason: "Fine.", flagged: null };
const split: ScreeningFlag = {
  questionId: "q2", label: "unclear", type: "other", injection: false, agreed: false, reason: "The AI check was inconclusive.",
  runs: [{ label: "valid", type: null, injection: false, reason: "Names wifi." }, { label: "unclear", type: "evasive", injection: false, reason: "Too vague." }],
};
const offTopic: ScreeningFlag = {
  questionId: "q3", label: "non_answer", type: "off_question", injection: false, agreed: true, reason: "Names a movie.",
  runs: [{ label: "non_answer", type: "off_question", injection: false, reason: "Names a movie." }, null],
};
const aiOf = (...flagged: ScreeningFlag[]) => ({ label: "unclear" as const, type: "other" as const, injection: false, agreed: false, reason: "x", flagged });

describe("explain", () => {
  it("pages two flagged answers, split first, and shows both runs for each", () => {
    const x = explain("review", ["x"], row({ ai: aiOf(offTopic, split) }), Q, A);
    expect(x.title).toBe("The AI runs disagreed on Q2");
    expect(x.sub).toBe("The AI flagged 2 answers. Code checks and pace passed, so this one is up to you.");
    expect(x.flags.map((f) => f.qi)).toEqual([1, 2]);
    expect(x.flags[0]).toMatchObject({ ai: true, tag: "AI split", detail: "runs disagreed", aiSays: null });
    expect(x.flags[0].runs).toEqual([
      { n: 1, label: "Valid", tone: "pass", instructions: false, reason: "Names wifi.", failed: false },
      { n: 2, label: "Unclear · Evasive", tone: "warn", instructions: false, reason: "Too vague.", failed: false },
    ]);
    expect(x.flags[1]).toMatchObject({ tag: "AI · not an answer", detail: "Off question · both runs agreed", note: "Both runs agreed." });
    expect(x.flags[1].runs?.[1]).toMatchObject({ label: "No usable reply", failed: true, reason: null });
    expect(x.others).toEqual([0, 3]);
    expect(x.pills[2].label).toBe("AI split · Q2 +1");
  });

  it("runs the rule engine in order and stops at the rule that fired", () => {
    const x = explain("review", ["x"], row({ ai: aiOf(split) }), Q, A);
    expect(x.rules.map((r) => [r.n, r.state, r.value, r.outcome])).toEqual([
      [1, "pass", "No", null],
      [2, "fired", "Yes · Q2", "Review"],
      [3, "skipped", "Not reached", null],
      [4, "skipped", "Not reached", null],
    ]);
  });

  it("shows the AI's kept sentence when the runs were not saved", () => {
    const old = { ...offTopic, runs: null };
    const x = explain("review", ["x"], row({ ai: { ...aiOf(old), label: "non_answer", type: "off_question", agreed: true } }), Q, A);
    expect(x.flags[0]).toMatchObject({ runs: null, aiSays: "Names a movie." });
  });

  it("explains a hard fail with the rule it broke; the AI was not reached", () => {
    const x = explain("no", ["x"], row({ hardFails: [{ check: "gibberish", questionId: "q3" }] }), Q, [4, "fine", "sdfghjkl", ""]);
    expect(x.title).toBe("Q3 isn't readable text");
    expect(x.sub).toBe("A code check decided this. The AI wasn't asked.");
    expect(x.flags).toEqual([expect.objectContaining({ qi: 2, ai: false, tag: "Unreadable", note: "6 or more letters with no vowel." })]);
    expect(x.rules.map((r) => r.state)).toEqual(["fired", "skipped", "skipped", "skipped"]);
    expect(x.rules[0]).toMatchObject({ value: "Yes · Q3", outcome: "Don't pay" });
  });

  it("pays through rule 4 with one pace note", () => {
    const x = explain("pay", ["Passed all checks."], row({ weak: ["too_fast"], ai: VALID }), Q, A);
    expect(x.title).toMatch(/^Passed\. Finished fast/);
    expect(x.rules.map((r) => [r.state, r.value])).toEqual([["pass", "No"], ["pass", "No"], ["pass", "1 of 2"], ["fired", ""]]);
    expect(x.flags).toEqual([]);
  });

  it("adds the researcher's decision after the rule engine", () => {
    const x = explain("no", ["x", "Not paid by the researcher: The answer was too vague to count."], row({ ai: aiOf(split) }), Q, A);
    expect(x.you).toBe("not_paid");
    expect(x.sub).toBe("You chose not to pay: The answer was too vague to count.");
    expect(x.rules.at(-1)).toMatchObject({ n: null, ask: "Your decision", outcome: "Don't pay", state: "fired" });
    expect(x.rules[1].state).toBe("fired");
  });

  it("falls back for unscreened rows and old decisions without flagged questions", () => {
    expect(explain("pending", [], undefined, Q, A)).toMatchObject({ title: "Being checked", flags: [], others: [0, 1, 2, 3] });
    const x = explain("review", ["x"], row({ ai: { ...aiOf(), flagged: null } }), Q, A);
    expect(x.title).toBe("The AI runs disagreed");
    expect(x.flags).toEqual([]);
    expect(x.rules[1]).toMatchObject({ state: "fired", value: "Yes" });
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
