// Pure mapping between the API shapes and the plain objects the dashboard engine
// (components/resfunder/engine.js) renders. Money stays in wei here and reaches the
// engine only as display strings.
import type { HistoryItem, LogResponse, LogRow, OpenSurvey, SurveySummary } from "@/lib/api/shapes";
import type { Question, ResponseStatus, SurveyJson } from "@/lib/types";
import { refundAmount } from "./fees";
import { formatBnb, formatDuration, formatWhen, shortHash, txUrl } from "./format";
import type { Draft } from "./respond";

/** Decimals shown for tBNB in the dashboard: the fee per response needs eight. */
export const BNB_DECIMALS = 8;
export const bnb = (wei: bigint | string) => formatBnb(wei, BNB_DECIMALS);

// ---------- questions ----------

export type EngineQuestion = {
  id?: string;
  t: string;
  type: "mc" | "scale" | "open";
  req: boolean;
  opts?: string[];
  min?: number;
  max?: number;
  /** open only: short answers like "none" are fine. */
  short?: boolean;
};

export type EngineDraft = { title: string; desc: string; q: EngineQuestion[] };

export function toEngineQuestions(survey: SurveyJson): EngineQuestion[] {
  return survey.questions.map((q) => {
    const base = { id: q.id, t: q.text, req: q.required };
    if (q.type === "multiple_choice") return { ...base, type: "mc", opts: [...q.options] };
    if (q.type === "scale") return { ...base, type: "scale", min: q.min, max: q.max };
    return { ...base, type: "open", short: q.allowShort };
  });
}

/** Question ids are assigned by position (q1, q2, …) when a draft is funded. */
export function draftToSurvey(d: EngineDraft): SurveyJson {
  const questions: Question[] = d.q.map((q, i) => {
    const base = { id: `q${i + 1}`, text: q.t.trim(), required: !!q.req };
    if (q.type === "mc") return { ...base, type: "multiple_choice", options: (q.opts ?? []).map((o) => o.trim()) };
    if (q.type === "scale") return { ...base, type: "scale", min: q.min ?? 1, max: q.max ?? 5 };
    return { ...base, type: "open_ended", allowShort: !!q.short };
  });
  return { title: d.title.trim(), description: d.desc.trim(), questions };
}

/** The respondent view keeps answers by question position: an option index, a scale number or text. */
export type EngineAnswers = Record<number, number | string | undefined>;

export function toAnswerDraft(survey: SurveyJson, ans: EngineAnswers): Draft {
  const out: Draft = {};
  survey.questions.forEach((q, i) => {
    const a = ans[i];
    if (a === undefined || a === null) return;
    if (q.type === "multiple_choice") {
      if (typeof a === "number" && q.options[a] !== undefined) out[q.id] = q.options[a];
    } else if (q.type === "scale") {
      if (typeof a === "number") out[q.id] = a;
    } else if (typeof a === "string") out[q.id] = a;
  });
  return out;
}

// ---------- surveys ----------

export const surveyCode = (id: number) => `SRV-${String(id).padStart(6, "0")}`;

const utcDay = new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", timeZone: "UTC" });
const utcDayYear = new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

export type EngineSurvey = {
  id: string;
  real: true;
  code: string;
  title: string;
  status: "live" | "closed";
  paused: boolean;
  quota: number;
  paid: number;
  rate: string;
  budget: string;
  paidOut: string;
  /** Unused budget: what a close refunds (live) or refunded (closed). */
  unused: string;
  /** Decimal wei strings of the two amounts above, for totals. */
  paidOutWei: string;
  unusedWei: string;
  /** YYYY-MM-DD, the day the researcher picked (deadlines end at 23:59:59 UTC). */
  deadline: string;
  closes: string;
  closesFull: string;
  left: string;
  /** Whole days until the deadline, at least 1. */
  daysLeft: number;
  ended: boolean;
  createdAt: string;
};

export function surveyView(s: SurveySummary, now: number): EngineSurvey {
  const rate = BigInt(s.rateWei);
  const end = s.deadline * 1000;
  const closed = s.status === "closed";
  const ended = end <= now;
  const paidOut = rate * BigInt(Math.min(s.paidCount, s.quota));
  const unused = refundAmount(rate, s.quota, s.paidCount);
  return {
    id: String(s.surveyId),
    real: true,
    code: surveyCode(s.surveyId),
    title: s.title,
    status: closed ? "closed" : "live",
    paused: s.paused,
    quota: s.quota,
    paid: s.paidCount,
    rate: bnb(rate),
    budget: bnb(rate * BigInt(s.quota)),
    paidOut: bnb(paidOut),
    unused: bnb(unused),
    paidOutWei: paidOut.toString(),
    unusedWei: unused.toString(),
    deadline: new Date(end).toISOString().slice(0, 10),
    closes: utcDay.format(new Date(end)),
    closesFull: utcDayYear.format(new Date(end)),
    left: closed ? "Closed" : ended ? "Ended" : formatDuration(end - now),
    daysLeft: Math.max(1, Math.ceil((end - now) / 86_400_000)),
    ended,
    createdAt: s.createdAt,
  };
}

/** Total of one wei field across surveys, as a display string. */
export function total(list: readonly Pick<EngineSurvey, "paidOutWei" | "unusedWei">[], key: "paidOut" | "unused"): string {
  return bnb(list.reduce((a, s) => a + BigInt(key === "paidOut" ? s.paidOutWei : s.unusedWei), BigInt(0)));
}

// ---------- surveys open for answers ----------

export type EngineOpen = {
  id: string;
  code: string;
  title: string;
  desc: string;
  rate: string;
  rateWei: string;
  quota: number;
  slotsLeft: number;
  filled: number;
  mins: number;
  questions: number;
  closes: string;
  daysLeft: number;
  researcher: string;
};

export function openView(o: OpenSurvey, now: number): EngineOpen {
  const end = o.deadline * 1000;
  return {
    id: String(o.surveyId),
    code: surveyCode(o.surveyId),
    title: o.title,
    desc: o.description,
    rate: bnb(o.rateWei),
    rateWei: o.rateWei,
    quota: o.quota,
    slotsLeft: o.slotsLeft,
    filled: Math.round(((o.quota - o.slotsLeft) / o.quota) * 100),
    mins: Math.max(1, Math.round(o.questionCount / 2)),
    questions: o.questionCount,
    closes: utcDay.format(new Date(end)),
    daysLeft: Math.max(0, Math.ceil((end - now) / 86_400_000)),
    researcher: o.researcher,
  };
}

// ---------- my responses (as a respondent) ----------

export type EngineHistory = {
  key: string;
  sid: string;
  title: string;
  code: string;
  res: EngineRes;
  amount: string;
  why: string;
  tx: string;
  txUrl: string;
  at: number;
  when: string;
};

export function historyView(items: readonly HistoryItem[], now: number): { rows: EngineHistory[]; earned: string; paid: number } {
  let earned = BigInt(0);
  let paid = 0;
  const rows = items.map((h): EngineHistory => {
    const res = RES[h.status];
    if (res === "pay") {
      earned += BigInt(h.rateWei);
      paid += 1;
    }
    return {
      key: h.responseId,
      sid: String(h.surveyId),
      title: h.surveyTitle,
      code: surveyCode(h.surveyId),
      res,
      amount: res === "pay" ? bnb(h.rateWei) : "0 tBNB",
      why: h.reasons.length ? h.reasons.join(" ") : WHY[res],
      tx: h.txHash ? shortHash(h.txHash) : "",
      txUrl: h.txHash ? (h.explorerUrl ?? txUrl(h.txHash)) : "",
      at: Date.parse(h.submittedAt),
      when: formatWhen(h.submittedAt, now),
    };
  });
  return { rows, earned: bnb(earned), paid };
}

// ---------- decision log ----------

export type EngineRes = "pay" | "no" | "review" | "pending";
const RES: Record<ResponseStatus, EngineRes> = { paid: "pay", blocked: "no", review: "review", received: "pending", processing: "pending" };

export type EngineLogRow = {
  key: string;
  rid: string;
  wallet: string;
  w: string;
  at: number;
  when: string;
  res: EngineRes;
  why: string;
  reasons: string[];
  amount: string;
  tx: string;
  txUrl: string;
  /** Answers by question position, in the shape the engine's answer views read. */
  a: (number | string | undefined)[];
};

export type EngineLog = {
  sum: {
    responses: number;
    paid: number;
    blocked: number;
    review: number;
    pending: number;
    budget: string;
    paidOut: string;
    remaining: string;
    refunded: string | null;
    closeTx: string;
    closeUrl: string;
  };
  rows: EngineLogRow[];
};

export const responseCode = (id: string) => `RSP-${id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;

function answersByPosition(questions: readonly Question[], row: LogRow): (number | string | undefined)[] {
  return questions.map((q) => {
    const a = row.answers[q.id];
    if (a === undefined) return undefined;
    if (q.type === "multiple_choice") {
      const i = q.options.indexOf(String(a));
      return i >= 0 ? i : undefined;
    }
    return q.type === "scale" ? Number(a) : String(a);
  });
}

const WHY: Record<EngineRes, string> = { pay: "Passed all checks.", no: "Blocked by a code check.", review: "Sent to review.", pending: "Being checked." };

export function logView(log: LogResponse, survey: SurveyJson, now: number): EngineLog {
  const rate = BigInt(log.survey.rateWei);
  const rows = log.rows.map((r): EngineLogRow => {
    const res = RES[r.status];
    return {
      key: r.responseId,
      rid: responseCode(r.responseId),
      wallet: r.wallet,
      w: shortHash(r.wallet),
      at: Date.parse(r.submittedAt),
      when: formatWhen(r.submittedAt, now),
      res,
      why: r.reasons.length ? r.reasons.join(" ") : WHY[res],
      reasons: r.reasons,
      amount: res === "pay" ? bnb(rate) : "0 tBNB",
      tx: r.txHash ? shortHash(r.txHash) : "",
      txUrl: r.txHash ? (r.explorerUrl ?? txUrl(r.txHash)) : "",
      a: answersByPosition(survey.questions, r),
    };
  });
  const s = log.summary;
  return {
    sum: {
      responses: s.responses,
      paid: s.paid,
      blocked: s.blocked,
      review: s.review,
      pending: s.pending,
      budget: bnb(s.budgetWei),
      paidOut: bnb(s.paidWei),
      remaining: bnb(s.remainingWei),
      refunded: log.survey.refundedWei === null ? null : bnb(log.survey.refundedWei),
      closeTx: log.survey.closeTxHash ? shortHash(log.survey.closeTxHash) : "",
      closeUrl: log.survey.closeTxHash ? txUrl(log.survey.closeTxHash) : "",
    },
    rows,
  };
}

// ---------- responses over time ----------

export type Range = "today" | "week" | "month";
export type ChartCol = { lab: string; full: string; k: "real" | "later"; p: number; r: number; n: number; cnt: number };
export type Chart = { cols: ChartCol[]; today: number; total: number; rows: number; ticks: number[] };

const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const hourLabel = (h: number) => `${h % 12 || 12} ${h < 12 ? "AM" : "PM"}`;

/** One column per hour (today) or per local day (week: 7, month: 30), ending now. */
export function chart(rows: readonly Pick<EngineLogRow, "at" | "res">[], range: Range, now: number): Chart {
  const cols: ChartCol[] = [];
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const add = (lab: string, full: string, from: number, to: number, later: boolean) => {
    const c: ChartCol = { lab, full, k: later ? "later" : "real", p: 0, r: 0, n: 0, cnt: 0 };
    if (!later) {
      for (const x of rows) {
        if (x.at < from || x.at >= to) continue;
        if (x.res === "pay") c.p += 1;
        else if (x.res === "no") c.n += 1;
        else c.r += 1;
        c.cnt += 1;
      }
    }
    cols.push(c);
  };
  let today: number;
  if (range === "today") {
    const hourNow = new Date(now).getHours();
    for (let h = 0; h < 24; h++) {
      const from = start.getTime() + h * 3_600_000;
      add(h % 3 === 0 ? String(h % 12 || 12) : "", hourLabel(h), from, from + 3_600_000, h > hourNow);
    }
    today = hourNow;
  } else {
    const days = range === "week" ? 7 : 30;
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(start);
      d.setDate(d.getDate() - i);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      const lab = range === "week" ? `${WD[d.getDay()]} ${d.getDate()}` : i % 5 === 0 ? String(d.getDate()) : "";
      add(lab, `${WD[d.getDay()]}, ${MON[d.getMonth()]} ${d.getDate()}`, d.getTime(), next.getTime(), false);
    }
    today = days - 1;
  }
  const max = cols.reduce((m, c) => Math.max(m, c.cnt), 0);
  const height = Math.max(10, Math.ceil((max + 1) / 5) * 5);
  const ticks: number[] = [];
  for (let k = 0; k <= height; k += 5) ticks.push(k);
  return { cols, today, total: cols.reduce((a, c) => a + c.cnt, 0), rows: height + 1, ticks };
}

// ---------- results ----------

export type QuestionResult =
  | { kind: "bars"; t: string; n: number; labels: string[]; counts: number[] }
  | { kind: "texts"; t: string; n: number; texts: string[]; req: boolean };

/** Summary of the answers that were paid: counts per option or value, and the written answers. */
export function results(survey: SurveyJson, rows: readonly Pick<EngineLogRow, "res" | "a">[]): QuestionResult[] {
  const paid = rows.filter((r) => r.res === "pay");
  return survey.questions.map((q, i): QuestionResult => {
    const vals = paid.map((r) => r.a[i]).filter((v) => v !== undefined && v !== "");
    if (q.type === "open_ended") return { kind: "texts", t: q.text, n: vals.length, texts: vals.map(String), req: q.required };
    if (q.type === "multiple_choice") {
      return { kind: "bars", t: q.text, n: vals.length, labels: [...q.options], counts: q.options.map((_, j) => vals.filter((v) => v === j).length) };
    }
    const labels: string[] = [];
    const counts: number[] = [];
    for (let v = q.min; v <= q.max; v++) {
      labels.push(String(v));
      counts.push(vals.filter((x) => x === v).length);
    }
    return { kind: "bars", t: q.text, n: vals.length, labels, counts };
  });
}
