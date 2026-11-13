import { describe, expect, it } from "vitest";
import type { HistoryItem, LogResponse, LogRow, OpenSurvey, SurveySummary } from "@/lib/api/shapes";
import { surveySchema } from "@/lib/survey-schema";
import type { SurveyJson } from "@/lib/types";
import { chart, draftToSurvey, historyView, logView, openView, responseCode, results, surveyCode, surveyView, toAnswerDraft, toEngineQuestions, total } from "./dashboard";

const survey: SurveyJson = {
  title: "Study habits",
  description: "",
  questions: [
    { id: "q1", type: "multiple_choice", text: "Where?", required: true, options: ["Library", "Home"] },
    { id: "q2", type: "scale", text: "How focused?", required: true, min: 1, max: 5 },
    { id: "q3", type: "open_ended", text: "Why?", required: false, allowShort: true },
  ],
};

const NOW = Date.parse("2026-11-13T04:00:00Z");
const summary: SurveySummary = {
  surveyId: 12, title: "Study habits", status: "open", paused: false,
  rateWei: "1000000000000000", quota: 3, deadline: Date.parse("2026-11-18T23:59:59Z") / 1000, paidCount: 1, createdAt: "2026-11-13T00:00:00Z",
};

const row = (id: string, status: LogRow["status"], answers: LogRow["answers"], submittedAt: string, extra: Partial<LogRow> = {}): LogRow => ({
  responseId: id, submittedAt, wallet: "0x91ab000000000000000000000000000000007c20", email: "a@b.co", answers, status,
  result: null, reasons: [], decisionStatus: null, txHash: null, explorerUrl: null, llmModel: null, rubricVersion: null, ...extra,
});

describe("questions", () => {
  it("round-trips a survey through the engine shape", () => {
    const back = draftToSurvey({ title: " Study habits ", desc: "", q: toEngineQuestions(survey) });
    expect(back).toEqual(survey);
    expect(surveySchema.safeParse(back).success).toBe(true);
  });

  it("assigns ids by position and defaults a scale to 1–5", () => {
    const s = draftToSurvey({ title: "T", desc: " d ", q: [{ t: " Rate it ", type: "scale", req: true }, { t: "Say more", type: "open", req: false }] });
    expect(s.description).toBe("d");
    expect(s.questions).toEqual([
      { id: "q1", type: "scale", text: "Rate it", required: true, min: 1, max: 5 },
      { id: "q2", type: "open_ended", text: "Say more", required: false, allowShort: false },
    ]);
  });

  it("turns positional answers into the keyed draft", () => {
    expect(toAnswerDraft(survey, { 0: 1, 1: 4, 2: "quiet" })).toEqual({ q1: "Home", q2: 4, q3: "quiet" });
    expect(toAnswerDraft(survey, { 0: 9 })).toEqual({});
  });
});

describe("surveyView", () => {
  it("formats money from wei and keeps the picked day", () => {
    const v = surveyView(summary, NOW);
    expect(v).toMatchObject({
      id: "12", code: "SRV-000012", status: "live", rate: "0.001 tBNB", budget: "0.003 tBNB", paidOut: "0.001 tBNB", unused: "0.002 tBNB",
      deadline: "2026-11-18", closes: "Nov 18", ended: false,
    });
    expect(v.left).toBe("5d 19h");
    expect(v.daysLeft).toBe(6);
    expect(total([v, v], "unused")).toBe("0.004 tBNB");
    expect(total([], "paidOut")).toBe("0 tBNB");
    expect(surveyCode(7)).toBe("SRV-000007");
  });

  it("marks closed and ended surveys", () => {
    expect(surveyView({ ...summary, status: "closed" }, NOW).left).toBe("Closed");
    expect(surveyView(summary, summary.deadline * 1000 + 1)).toMatchObject({ left: "Ended", ended: true });
  });
});

describe("logView", () => {
  const log: LogResponse = {
    survey: { ...summary, refundedWei: null, closeTxHash: null },
    summary: { responses: 3, paid: 1, blocked: 1, review: 1, pending: 0, budgetWei: "3000000000000000", paidWei: "1000000000000000", remainingWei: "2000000000000000" },
    rows: [
      row("aaaaaaaa-1111-2222-3333-444444444444", "paid", { q1: "Home", q2: 5, q3: "quiet" }, "2026-11-13T03:00:00Z", { txHash: `0x${"ab".repeat(32)}`, reasons: ["Passed all checks."] }),
      row("bbbbbbbb-1111-2222-3333-444444444444", "blocked", { q1: "Library", q2: 1 }, "2026-11-12T03:00:00Z", { reasons: ["An open-ended answer was not readable text."] }),
      row("cccccccc-1111-2222-3333-444444444444", "review", { q1: "Library", q2: 3, q3: "idk" }, "2026-11-13T03:30:00Z"),
    ],
  };
  const v = logView(log, survey, NOW);

  it("maps statuses, amounts and links", () => {
    expect(v.rows.map((r) => [r.rid, r.res, r.amount])).toEqual([
      ["RSP-AAAAAA", "pay", "0.001 tBNB"], ["RSP-BBBBBB", "no", "0 tBNB"], ["RSP-CCCCCC", "review", "0 tBNB"],
    ]);
    expect(v.rows[0].txUrl).toBe(`https://testnet.bscscan.com/tx/0x${"ab".repeat(32)}`);
    expect(v.rows[2].why).toBe("Sent to review.");
    expect(v.rows[0].a).toEqual([1, 5, "quiet"]);
    expect(v.sum).toMatchObject({ responses: 3, paidOut: "0.001 tBNB", remaining: "0.002 tBNB", refunded: null });
    expect(responseCode("aaaaaaaa-1111")).toBe("RSP-AAAAAA");
  });

  it("summarises only paid answers", () => {
    const r = results(survey, v.rows);
    expect(r[0]).toEqual({ kind: "bars", t: "Where?", n: 1, labels: ["Library", "Home"], counts: [0, 1] });
    expect(r[1]).toMatchObject({ kind: "bars", labels: ["1", "2", "3", "4", "5"], counts: [0, 0, 0, 0, 1] });
    expect(r[2]).toEqual({ kind: "texts", t: "Why?", n: 1, texts: ["quiet"], req: false });
  });

  it("buckets responses by day", () => {
    const c = chart(v.rows, "week", NOW);
    expect(c.cols).toHaveLength(7);
    expect(c.total).toBe(3);
    expect(c.today).toBe(6);
    expect(c.cols.reduce((a, x) => a + x.p, 0)).toBe(1);
    expect(c.cols.reduce((a, x) => a + x.n, 0)).toBe(1);
    expect(c.cols.reduce((a, x) => a + x.r, 0)).toBe(1);
    expect(chart(v.rows, "month", NOW).cols).toHaveLength(30);
    const t = chart(v.rows, "today", NOW);
    expect(t.cols).toHaveLength(24);
    expect(t.cols.filter((x) => x.k === "later")).toHaveLength(23 - new Date(NOW).getHours());
  });
});

describe("open surveys and my responses", () => {
  const open: OpenSurvey = {
    surveyId: 12, title: "Study habits", description: "A short study.", questionCount: 5, rateWei: "1000000000000000", quota: 10,
    deadline: Date.parse("2026-11-18T23:59:59Z") / 1000, slotsLeft: 4, researcher: "0xabc", createdAt: "2026-11-13T00:00:00Z",
  };

  it("shows an open survey with a share of filled slots", () => {
    expect(openView(open, NOW)).toMatchObject({ id: "12", code: "SRV-000012", rate: "0.001 tBNB", slotsLeft: 4, filled: 60, mins: 3, closes: "Nov 18", daysLeft: 6, researcher: "0xabc" });
    expect(openView({ ...open, questionCount: 1 }, NOW).mins).toBe(1);
  });

  it("sums only paid answers into the earned total", () => {
    const item = (id: string, status: HistoryItem["status"], tx: string | null): HistoryItem => ({
      responseId: id, surveyId: 12, surveyTitle: "Study habits", rateWei: "1000000000000000", submittedAt: "2026-11-13T03:00:00Z",
      status, result: null, reasons: status === "blocked" ? ["An open-ended answer was not readable text."] : [],
      txHash: tx ? (`0x${"ab".repeat(32)}` as `0x${string}`) : null, explorerUrl: tx ? `https://testnet.bscscan.com/tx/0x${"ab".repeat(32)}` : null,
      appeal: null, canAppeal: status === "blocked",
    });
    const v = historyView([item("a", "paid", "x"), item("b", "paid", "x"), item("c", "blocked", null), item("d", "review", null)], NOW);
    expect(v.earned).toBe("0.002 tBNB");
    expect(v.paid).toBe(2);
    expect(v.rows.map((r) => [r.res, r.amount])).toEqual([["pay", "0.001 tBNB"], ["pay", "0.001 tBNB"], ["no", "0 tBNB"], ["review", "0 tBNB"]]);
    expect(v.rows[2].why).toBe("An open-ended answer was not readable text.");
    expect(v.rows.map((r) => r.canAppeal)).toEqual([false, false, true, false]);
    expect(v.rows[0].txUrl).toContain("bscscan.com/tx/");
    expect(historyView([], NOW)).toEqual({ rows: [], earned: "0 tBNB", paid: 0 });
  });
});
