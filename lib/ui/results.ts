// Pure helpers for the results pages.
import type { LogRow } from "@/lib/api/shapes";
import type { ResponseStatus } from "@/lib/types";

export const STATUS_LABEL: Record<ResponseStatus, string> = {
  received: "Received",
  processing: "Checking",
  paid: "Paid",
  blocked: "Not paid",
  review: "In review",
};

export type ResultFilter = "all" | "paid" | "blocked" | "review" | "pending";

export function filterRows(rows: readonly LogRow[], f: ResultFilter): LogRow[] {
  if (f === "all") return [...rows];
  if (f === "pending") return rows.filter((r) => r.status === "received" || r.status === "processing");
  return rows.filter((r) => r.status === f);
}

export const isTabId = (t: string): t is "overview" | "log" | "questions" => t === "overview" || t === "log" || t === "questions";
