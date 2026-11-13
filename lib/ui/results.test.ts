import { describe, expect, it } from "vitest";
import type { LogRow } from "@/lib/api/shapes";
import { filterRows, isTabId } from "./results";

const row = (status: LogRow["status"]): LogRow => ({
  responseId: status, submittedAt: "", wallet: "0x", email: "", answers: {}, status, result: null, reasons: [],
  decisionStatus: null, txHash: null, explorerUrl: null, llmModel: null, rubricVersion: null,
});
const rows = [row("paid"), row("blocked"), row("review"), row("processing"), row("received")];

describe("results helpers", () => {
  it("filters by status, treating received and processing as pending", () => {
    expect(filterRows(rows, "all")).toHaveLength(5);
    expect(filterRows(rows, "paid").map((r) => r.status)).toEqual(["paid"]);
    expect(filterRows(rows, "pending")).toHaveLength(2);
  });
  it("recognises tab ids", () => {
    expect(isTabId("log") && !isTabId("nope")).toBe(true);
  });
});
