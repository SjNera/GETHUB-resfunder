// Turns how a response was screened into what the researcher reads: one line saying why, three
// check pills, the rule steps in order with the one that decided, and the answer to look at.
// Mirrors lib/screening/rules.ts; it explains a decision, it never makes one.
import type { ScreeningRow } from "@/lib/api/shapes";
import type { AiType, HardFailCheck, Question } from "@/lib/types";

export type Tone = "pass" | "warn" | "fail" | "skip";
export type Pill = { tone: Tone; label: string };
export type Step = { tone: Tone; label: string; value: string; decided: boolean };
export type Focus = {
  /** Question position, 0-based. */
  qi: number;
  question: string;
  answer: string | null;
  tag: string;
  tone: "warn" | "fail";
  /** Short labels under the tag, e.g. "Off question", "Both runs agreed". */
  chips: string[];
  /** The AI's own sentence, shown quoted. */
  aiSays: string | null;
  note: string;
};
export type Explain = {
  title: string;
  sub: string;
  pills: Pill[];
  steps: Step[];
  focus: Focus | null;
  /** Other written answers, with a tag when the AI flagged them too. */
  others: { qi: number; question: string; answer: string | null; tag: string | null }[];
  time: string | null;
  timeNote: string | null;
  /** Set when the researcher decided after review. */
  you: "paid" | "not_paid" | null;
};

type Res = "pay" | "no" | "review" | "pending";
type Answer = number | string | undefined;

const TYPE: Record<AiType, string> = { off_question: "Off question", evasive: "Evasive", copied: "Copied", other: "Other" };
const CHECK: Record<HardFailCheck, { tag: string; title: (q: string) => string }> = {
  empty: { tag: "Empty", title: (q) => `${q} was left empty` },
  gibberish: { tag: "Unreadable", title: (q) => `${q} isn't readable text` },
  duplicate: { tag: "Copied", title: (q) => `${q} matches another response` },
};
const SCREEN_ERRORS = ["Screening error, sent to review.", "The screening result did not pass the payment safety check."];

export function formatTime(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return s % 60 ? `${m}m ${s % 60}s` : `${m}m`;
}

/** Which gibberish rule an answer breaks (lib/screening/checks.ts isGibberish), in plain words. */
export function gibberishWhy(text: string): string {
  const chars = Array.from(text.trim().toLowerCase().replace(/\s+/g, " "));
  const letters = chars.filter((c) => /\p{L}/u.test(c));
  if (letters.length === 0) return "It has no letters.";
  if (chars.length >= 5 && chars.every((c) => c === chars[0])) return "It is one character repeated.";
  const base = letters.map((c) => c.normalize("NFD").replace(/\p{M}/gu, ""));
  if (letters.length >= 6 && !base.some((c) => "aeiou".includes(c))) return "6 or more letters with no vowel.";
  if (letters.length >= 10 && new Set(letters).size <= 3) return "Long text made of only a few letters.";
  return "It doesn't read as words.";
}

const qName = (qi: number) => `Q${qi + 1}`;

export function explain(res: Res, reasons: string[], s: ScreeningRow | undefined, questions: readonly Question[], a: readonly Answer[]): Explain {
  const index = new Map(questions.map((q, i) => [q.id, i]));
  const text = (qi: number) => {
    const v = a[qi];
    return typeof v === "string" && v.trim() ? v : null;
  };
  const you = reasons.some((r) => r.startsWith("Paid by the researcher")) ? "paid" : reasons.some((r) => r.startsWith("Not paid by the researcher")) ? "not_paid" : null;
  const youReason = reasons.find((r) => r.startsWith("Not paid by the researcher:"))?.replace("Not paid by the researcher: ", "") ?? "";
  const time = s && s.durationMs > 0 ? formatTime(s.durationMs) : null;

  if (!s || !s.screened) {
    return { title: "Being checked", sub: "Screening takes a few seconds.", pills: [], steps: [], focus: null, others: [], time, timeNote: null, you };
  }

  const hard = s.hardFails[0];
  const hardQi = hard ? (index.get(hard.questionId) ?? -1) : -1;
  const ai = s.ai;
  const aiClean = !ai || (ai.label === "valid" && ai.agreed && !ai.injection);
  const flags = (ai?.flagged ?? []).map((f) => ({ ...f, qi: index.get(f.questionId) ?? -1 })).filter((f) => f.qi >= 0);
  // The flag that explains Review best: a split, then injection, then the worst label.
  const top =
    flags.find((f) => !f.agreed) ?? flags.find((f) => f.injection) ?? flags.find((f) => f.label === "non_answer") ?? flags[0] ?? null;
  const fast = s.weak.includes("too_fast");
  const same = s.weak.includes("straight_lining");
  const screenError = reasons.some((r) => SCREEN_ERRORS.includes(r));

  // Pills: code checks, pace, AI.
  const pills: Pill[] = [
    hard ? { tone: "fail", label: `${CHECK[hard.check].tag}${hardQi >= 0 ? ` · ${qName(hardQi)}` : ""}` } : { tone: "pass", label: "Code checks" },
    s.weak.length === 0
      ? { tone: "pass", label: "Pace" }
      : { tone: "warn", label: fast && same ? "Fast · same option" : fast ? "Fast" : "Same option" },
  ];
  const where = top ? ` · ${qName(top.qi)}` : "";
  if (!ai) pills.push({ tone: "skip", label: "AI not run" });
  else if (aiClean) pills.push({ tone: "pass", label: "AI valid" });
  else if (!ai.agreed) pills.push({ tone: "warn", label: `AI split${where}` });
  else if (ai.injection) pills.push({ tone: "warn", label: `AI · instructions${where}` });
  else pills.push({ tone: "warn", label: `AI · ${ai.type ? TYPE[ai.type].toLowerCase() : ai.label === "unclear" ? "unclear" : "not an answer"}${where}` });

  // Steps, in the order the rules run. The first one that decides stops the rest.
  let decided = false;
  const step = (tone: Tone, label: string, value: string, decides: boolean): Step => {
    const d = decides && !decided;
    if (d) decided = true;
    return { tone, label, value, decided: d };
  };
  const steps: Step[] = [];
  steps.push(hard ? step("fail", "Code checks", "Not paid", true) : step("pass", "Code checks", "Passed", false));
  if (!ai) steps.push(step("skip", "AI label", hard ? "Not run" : "No written answers", false));
  else steps.push(aiClean ? step("pass", "AI label", "Valid", false) : step("warn", "AI label", "Sent to review", true));
  steps.push(
    s.weak.length >= 2
      ? step("warn", "Pace", "Sent to review", true)
      : s.weak.length === 1
        ? step("warn", "Pace", fast ? "Fast, still pays" : "Same option, still pays", false)
        : step("pass", "Pace", "Normal", false),
  );
  if (screenError && !decided) steps.push(step("warn", "Safety check", "Sent to review", true));
  if (!decided && res === "pay") steps.push(step("pass", "Otherwise pay", "Paid", true));
  if (you) {
    steps.forEach((x) => (x.decided = false));
    steps.push({ tone: you === "paid" ? "pass" : "fail", label: "You", value: you === "paid" ? "Paid" : "Not paid", decided: true });
  }

  // One-line reason.
  let title: string;
  if (hard) title = CHECK[hard.check].title(hardQi >= 0 ? qName(hardQi) : "An answer");
  else if (ai && !aiClean) {
    const q = top ? qName(top.qi) : "";
    if (!ai.agreed) title = q ? `The AI runs disagreed on ${q}` : "The AI runs disagreed";
    else if (ai.injection) title = q ? `${q} has instructions aimed at the AI` : "An answer has instructions aimed at the AI";
    else if (ai.label === "non_answer") title = q ? `The AI says ${q} doesn't answer the question` : "The AI says an answer doesn't answer the question";
    else title = q ? `The AI found ${q} unclear` : "The AI found an answer unclear";
  } else if (s.weak.length >= 2) title = "Finished too fast and picked the same option in a row";
  else if (screenError) title = "Screening hit an error";
  else if (s.weak.length === 1) title = fast ? "Passed. Finished fast, which alone doesn't block payment" : "Passed. Same option in a row, which alone doesn't block payment";
  else title = "Passed every check";

  const othersPassed = !hard && s.weak.length < 2;
  const sub =
    you === "paid" ? "You paid this after review."
    : you === "not_paid" ? `You chose not to pay: ${youReason}`
    : res === "no" ? (ai ? "A code check decided this." : "A code check decided this. The AI wasn't asked.")
    : res === "pay" ? "Paid by the contract."
    : othersPassed && (aiClean || s.weak.length === 0) ? "Everything else passed, so this one is up to you."
    : "This one is up to you.";

  // The answer to look at.
  let focus: Focus | null = null;
  if (hard && hardQi >= 0) {
    const ans = text(hardQi);
    focus = {
      qi: hardQi, question: questions[hardQi].text, answer: ans, tag: CHECK[hard.check].tag, tone: "fail", chips: [], aiSays: null,
      note: hard.check === "gibberish" && ans ? gibberishWhy(ans) : hard.check === "empty" ? "A required written answer was blank." : "It matches an earlier answer to this question, word for word.",
    };
  } else if (top) {
    const chips: string[] = [];
    if (top.type && top.agreed) chips.push(TYPE[top.type]);
    chips.push(top.agreed ? "Both runs agreed" : "Runs disagreed");
    if (top.injection) chips.push("Instructions in the answer");
    focus = {
      qi: top.qi, question: questions[top.qi].text, answer: text(top.qi),
      tag: !top.agreed ? "AI split" : top.label === "non_answer" ? "AI · not an answer" : top.label === "unclear" ? "AI · unclear" : "AI · instructions",
      tone: "warn", chips,
      aiSays: top.agreed ? top.reason : null,
      note: top.agreed ? "" : "The two runs gave different results. A split is never trusted, so a person decides.",
    };
  }

  const others = questions
    .map((q, qi) => ({ q, qi }))
    .filter(({ q, qi }) => q.type === "open_ended" && qi !== focus?.qi)
    .map(({ q, qi }) => {
      const f = flags.find((x) => x.qi === qi);
      return { qi, question: q.text, answer: text(qi), tag: f ? (f.agreed ? `AI · ${f.label === "non_answer" ? "not an answer" : f.label}` : "AI split") : null };
    });

  const timeNote = time
    ? `${fast ? "Counted as too fast" : "Not too fast"} (line ${formatTime(s.fastLineMs)}). ${same ? "Same option picked in a row." : "No run of the same option."}`
    : null;

  return { title, sub, pills, steps, focus, others, time, timeNote, you };
}
