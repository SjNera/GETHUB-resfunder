import { current } from "./demo/seed";
import type { ResponseRecord, Survey } from "./types";

function cell(v: unknown): string {
  const s = v === null || v === undefined ? "" : Array.isArray(v) ? v.join("; ") : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Paid responses as CSV — opens in Excel or statistics software. */
export function paidResponsesCsv(survey: Survey, responses: ResponseRecord[]): string {
  const paid = responses.filter((r) => current(r).outcome === "pay");
  const header = ["response_id", "submitted_at", ...survey.questions.map((q) => q.title)];
  const rows = paid.map((r) => [r.id, r.submittedAt, ...survey.questions.map((q) => r.answers[q.id])]);
  return [header, ...rows].map((row) => row.map(cell).join(",")).join("\n");
}

export function decisionLogCsv(responses: ResponseRecord[]): string {
  const header = ["response_id", "respondent_hash", "outcome", "decided_by", "decided_at", "signals", "llm_run_1", "llm_run_2", "rubric_version", "model_version", "payout_tx"];
  const rows = responses.flatMap((r) =>
    r.decisions.map((d) => [
      r.id,
      r.respondentHash,
      d.outcome,
      d.decidedBy,
      d.decidedAt,
      d.signals.map((s) => s.code).join(" "),
      d.labels.map((l) => l.runs[0].label).join(" "),
      d.labels.map((l) => l.runs[1].label).join(" "),
      d.rubricVersion,
      d.modelVersion,
      d.payoutTx ?? "",
    ]),
  );
  return [header, ...rows].map((row) => row.map(cell).join(",")).join("\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
