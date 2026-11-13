// Turns how a response was screened into what the researcher reads: one line saying why, three
// check pills, the flagged answers (each with both AI runs), and the rule engine step by step.
// Mirrors lib/screening/rules.ts; it explains a decision, it never makes one.
import type { ScreeningFlag, ScreeningRow, ScreeningRun } from "@/lib/api/shapes";
import type { AiLabel, AiType, HardFailCheck, Question } from "@/lib/types";

export type Tone = "pass" | "warn" | "fail" | "skip";
export type Pill = { tone: Tone; label: string };
export type RunView = { n: 1 | 2; label: string; tone: "pass" | "warn"; instructions: boolean; reason: string | null; failed: boolean };
export type FlagItem = {
  /** Question position, 0-based. */
  qi: number;
  question: string;
  answer: string | null;
  /** True for an AI flag: its tag opens the two runs. False for a failed code check. */
  ai: boolean;
  tag: string;
  tone: "warn" | "fail";
  /** Short words next to the tag, e.g. "Off question · both runs agreed". */
  detail: string;
  /** Run 1 and run 2. Null when they were not saved (older decisions). */
  runs: RunView[] | null;
  /** The AI's kept sentence, shown when the runs were not saved. */
  aiSays: string | null;
  /** One line under the runs, or the code check's rule. */
  note: string;
};
export type Rule = {
  /** 1 to 4 for the rule engine; null for the researcher's own decision. */
  n: number | null;
  ask: string;
  value: string;
  state: "pass" | "fired" | "skipped";
  /** Set on a fired rule: what it decided. */
  outcome: string | null;
  tone: Tone;
};
export type Explain = {
  title: string;
  sub: string;
  pills: Pill[];
  flags: FlagItem[];
  rules: Rule[];
  /** Question positions not in flags. */
  others: number[];
  time: string | null;
  timeNote: string | null;
  you: "paid" | "not_paid" | null;
};

type Res = "pay" | "no" | "review" | "pending";
type Answer = number | string | undefined;

const TYPE: Record<AiType, string> = { off_question: "Off question", evasive: "Evasive", copied: "Copied", other: "Other" };
const LABEL: Record<AiLabel, string> = { valid: "Valid", unclear: "Unclear", non_answer: "Not an answer" };
const CHECK: Record<HardFailCheck, { tag: string; title: (q: string) => string; note: string }> = {
  empty: { tag: "Empty", title: (q) => `${q} was left empty`, note: "A required written answer was blank." },
  gibberish: { tag: "Unreadable", title: (q) => `${q} isn't readable text`, note: "It doesn't read as words." },
  duplicate: { tag: "Copied", title: (q) => `${q} matches another response`, note: "It matches an earlier answer to this question, word for word." },
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
/** A split explains Review best, then instructions, then the worst label. */
const RANK = (f: ScreeningFlag) => (!f.agreed ? 0 : f.injection ? 1 : f.label === "non_answer" ? 2 : 3);

function runView(r: ScreeningRun, n: 1 | 2): RunView {
  if (!r) return { n, label: "No usable reply", tone: "warn", instructions: false, reason: null, failed: true };
  return {
    n,
    label: LABEL[r.label] + (r.type && r.label !== "valid" ? ` · ${TYPE[r.type]}` : ""),
    tone: r.label === "valid" && !r.injection ? "pass" : "warn",
    instructions: r.injection,
    reason: r.reason || null,
    failed: false,
  };
}

function aiItem(f: ScreeningFlag & { qi: number }, question: string, answer: string | null): FlagItem {
  const tag = !f.agreed ? "AI split" : f.injection ? "AI · instructions" : f.label === "non_answer" ? "AI · not an answer" : "AI · unclear";
  const detail = [f.agreed && f.type ? TYPE[f.type] : "", f.agreed ? "both runs agreed" : "runs disagreed"].filter(Boolean).join(" · ");
  const runs = f.runs && f.runs.length === 2 ? [runView(f.runs[0], 1), runView(f.runs[1], 2)] : null;
  const note = f.injection
    ? "Instructions aimed at the AI were found in this answer, so a person decides."
    : !f.agreed
      ? "The runs disagreed. A split is never trusted, so a person decides."
      : "Both runs agreed.";
  return { qi: f.qi, question, answer, ai: true, tag, tone: "warn", detail, runs, aiSays: runs ? null : f.agreed ? f.reason : null, note };
}

export function explain(res: Res, reasons: string[], s: ScreeningRow | undefined, questions: readonly Question[], a: readonly Answer[]): Explain {
  const index = new Map(questions.map((q, i) => [q.id, i]));
  const text = (qi: number) => {
    const v = a[qi];
    return typeof v === "string" && v.trim() ? v : null;
  };
  const you = reasons.some((r) => r.startsWith("Paid by the researcher")) ? "paid" : reasons.some((r) => r.startsWith("Not paid by the researcher")) ? "not_paid" : null;
  const youReason = reasons.find((r) => r.startsWith("Not paid by the researcher:"))?.replace("Not paid by the researcher: ", "") ?? "";
  const time = s && s.durationMs > 0 ? formatTime(s.durationMs) : null;
  const allQs = questions.map((_, i) => i);

  if (!s || !s.screened) {
    return { title: "Being checked", sub: "Screening takes a few seconds.", pills: [], flags: [], rules: [], others: allQs, time, timeNote: null, you };
  }

  const hardQs = [...new Set(s.hardFails.map((h) => index.get(h.questionId) ?? -1).filter((qi) => qi >= 0))];
  const hard = s.hardFails[0];
  const hardQi = hard ? (index.get(hard.questionId) ?? -1) : -1;
  const ai = s.ai;
  const aiClean = !ai || (ai.label === "valid" && ai.agreed && !ai.injection);
  const aiFlags = (ai?.flagged ?? [])
    .map((f) => ({ ...f, qi: index.get(f.questionId) ?? -1 }))
    .filter((f) => f.qi >= 0)
    .sort((x, y) => RANK(x) - RANK(y) || x.qi - y.qi);
  const top = aiFlags[0] ?? null;
  const fast = s.weak.includes("too_fast");
  const same = s.weak.includes("straight_lining");
  const screenError = reasons.some((r) => SCREEN_ERRORS.includes(r));

  // Pills: code checks, pace, AI.
  const where = top ? ` · ${qName(top.qi)}${aiFlags.length > 1 ? ` +${aiFlags.length - 1}` : ""}` : "";
  const pills: Pill[] = [
    hard ? { tone: "fail", label: `${CHECK[hard.check].tag}${hardQi >= 0 ? ` · ${qName(hardQi)}` : ""}` } : { tone: "pass", label: "Code checks" },
    s.weak.length === 0 ? { tone: "pass", label: "Pace" } : { tone: "warn", label: fast && same ? "Fast · same option" : fast ? "Fast" : "Same option" },
  ];
  if (!ai) pills.push({ tone: "skip", label: "AI not run" });
  else if (aiClean) pills.push({ tone: "pass", label: "AI valid" });
  else if (!ai.agreed) pills.push({ tone: "warn", label: `AI split${where}` });
  else if (ai.injection) pills.push({ tone: "warn", label: `AI · instructions${where}` });
  else pills.push({ tone: "warn", label: `AI · ${ai.type ? TYPE[ai.type].toLowerCase() : ai.label === "unclear" ? "unclear" : "not an answer"}${where}` });

  // The rule engine, in the order lib/screening/rules.ts runs it. The first rule that fires stops the rest.
  let stopped = false;
  const rule = (n: number, ask: string, fires: boolean, value: string, outcome: string, tone: Tone): Rule => {
    if (stopped) return { n, ask, value: "Not reached", state: "skipped", outcome: null, tone: "skip" };
    if (fires) {
      stopped = true;
      return { n, ask, value, state: "fired", outcome, tone };
    }
    return { n, ask, value, state: "pass", outcome: null, tone: "pass" };
  };
  const flagQs = aiFlags.map((f) => qName(f.qi)).join(", ");
  const rules: Rule[] = [
    rule(1, "Did a code check fail?", !!hard, hard ? `Yes · ${hardQs.map(qName).join(", ")}` : "No", "Don't pay", "fail"),
    rule(2, "Is the AI unsure, split, or did it find instructions?", !!ai && !aiClean, ai && !aiClean ? (flagQs ? `Yes · ${flagQs}` : "Yes") : "No", "Review", "warn"),
    rule(3, "Two or more pace signals?", s.weak.length >= 2, `${s.weak.length} of 2`, "Review", "warn"),
  ];
  if (!ai && !stopped) rules[1].value = "AI not run";
  if (screenError && !stopped) rules.push(rule(4, "Did the result pass the safety check?", true, "No", "Review", "warn"));
  else rules.push(rule(4, "Otherwise pay", res === "pay" && !you, "", "Pay", "pass"));
  if (rules[3].state === "pass") Object.assign(rules[3], { state: "skipped", value: "Not reached", tone: "skip" });
  if (you) {
    rules.push({ n: null, ask: "Your decision", value: "", state: "fired", outcome: you === "paid" ? "Pay" : "Don't pay", tone: you === "paid" ? "pass" : "fail" });
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

  const othersPassed = !hard && s.weak.length === 0;
  const many = aiFlags.length > 1 ? `The AI flagged ${aiFlags.length} answers. ` : "";
  const sub =
    you === "paid" ? "You paid this after review."
    : you === "not_paid" ? `You chose not to pay: ${youReason}`
    : res === "no" ? (ai ? "A code check decided this." : "A code check decided this. The AI wasn't asked.")
    : res === "pay" ? "Paid by the contract."
    : many + (othersPassed && (ai === null || !aiClean) ? (many ? "Code checks and pace passed, so this one is up to you." : "Everything else passed, so this one is up to you.") : "This one is up to you.");

  // The answers to look at: failed code checks first, then the AI's flags.
  const flags: FlagItem[] = [
    ...s.hardFails
      .map((h) => ({ h, qi: index.get(h.questionId) ?? -1 }))
      .filter(({ qi }, i, arr) => qi >= 0 && arr.findIndex((x) => x.qi === qi) === i)
      .map(({ h, qi }): FlagItem => {
        const ans = text(qi);
        return {
          qi, question: questions[qi].text, answer: ans, ai: false, tag: CHECK[h.check].tag, tone: "fail", detail: "", runs: null, aiSays: null,
          note: h.check === "gibberish" && ans ? gibberishWhy(ans) : CHECK[h.check].note,
        };
      }),
    ...aiFlags.map((f) => aiItem(f, questions[f.qi].text, text(f.qi))),
  ];
  const inFlags = new Set(flags.map((f) => f.qi));
  const others = allQs.filter((qi) => !inFlags.has(qi));

  const timeNote = time
    ? `${fast ? "Counted as too fast" : "Not too fast"} (line ${formatTime(s.fastLineMs)}). ${same ? "Same option picked in a row." : "No run of the same option."}`
    : null;

  return { title, sub, pills, flags, rules, others, time, timeNote, you };
}
