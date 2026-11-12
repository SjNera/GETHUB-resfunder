"use client";

import { Download, Link2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { TxLink } from "@/components/common/chain";
import { DecisionBadge } from "@/components/common/decision-badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { decisionLogCsv, downloadCsv } from "@/lib/csv";
import { current, responsesFor, useDemo } from "@/lib/data/store";
import { formatDateTime, shortHash } from "@/lib/format";
import { DECIDED_BY_TEXT, SIGNAL_TEXT } from "@/lib/reasons";
import type { Outcome, ResponseRecord, Survey } from "@/lib/types";
import { PublishShell } from "./shell";

export function DecisionLog({ id }: { id: string }) {
  return <PublishShell id={id}>{(survey) => <Log survey={survey} />}</PublishShell>;
}

type Filter = "all" | Outcome;

function Log({ survey }: { survey: Survey }) {
  const all = useDemo((s) => s.responses);
  const markLogVisited = useDemo((s) => s.markLogVisited);
  useEffect(() => markLogVisited(), [markLogVisited]);
  const responses = responsesFor(all, survey.id);
  const [filter, setFilter] = useState<Filter>("all");
  const counts = { all: responses.length, pay: 0, review: 0, dont_pay: 0 } as Record<Filter, number>;
  for (const r of responses) counts[current(r).outcome]++;
  const rows = filter === "all" ? responses : responses.filter((r) => current(r).outcome === filter);

  return (
    <div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by outcome">
          {(["all", "pay", "review", "dont_pay"] as Filter[]).map((f) => (
            <button
              key={f}
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className={cn(
                "pressable inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-sm font-medium",
                filter === f ? "border-fg bg-inverse text-inverse-fg" : "border-border bg-surface text-muted hover:text-fg",
              )}
            >
              {f === "all" ? "All" : f === "pay" ? "Pay" : f === "review" ? "Review" : "Don't pay"}
              <span className="nums opacity-70">{counts[f]}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              navigator.clipboard?.writeText(window.location.href);
              toast.success("Adviser link copied", { description: "Read-only access for advisers arrives with the backend." });
            }}
          >
            <Link2 />
            Copy adviser link
          </Button>
          <Button variant="outline" size="sm" onClick={() => downloadCsv(`${survey.id}-decision-log.csv`, decisionLogCsv(responses))}>
            <Download />
            Export log (CSV)
          </Button>
        </div>
      </div>
      <p className="mt-4 max-w-3xl text-sm text-muted">
        Every decision is recorded with its signals, both AI runs, the rubric version and the model version. Respondents are
        identified only by the hash of their school email.
      </p>

      <div className="mt-6 overflow-hidden rounded-3xl border border-border bg-surface">
        <div className="hidden grid-cols-[8.5rem_7.5rem_6.5rem_1fr_7.5rem_12rem] gap-4 border-b border-border px-5 py-3 text-xs font-medium uppercase tracking-wide text-muted lg:grid">
          <span>Time</span>
          <span>Respondent</span>
          <span>Outcome</span>
          <span>Signals · AI runs</span>
          <span>Decided by</span>
          <span>Payment</span>
        </div>
        <ul>
          {rows.map((r) => (
            <Row key={r.id} r={r} />
          ))}
        </ul>
      </div>
    </div>
  );
}

function Row({ r }: { r: ResponseRecord }) {
  const d = current(r);
  const codes = [...new Set(d.signals.map((s) => s.code))];
  const runs = d.labels[0]?.runs;
  return (
    <li className="border-b border-border last:border-0">
      <details className="group">
        <summary className="grid cursor-pointer list-none grid-cols-2 gap-x-4 gap-y-2 px-5 py-4 text-sm hover:bg-surface-2/60 lg:grid-cols-[8.5rem_7.5rem_6.5rem_1fr_7.5rem_12rem] lg:items-center [&::-webkit-details-marker]:hidden">
          <span className="nums text-muted">{formatDateTime(d.decidedAt)}</span>
          <span className="font-mono text-[13px] lg:order-none">{shortHash(r.respondentHash)}</span>
          <span><DecisionBadge outcome={d.outcome} size="sm" /></span>
          <span className="col-span-2 min-w-0 lg:col-span-1">
            <span className="block truncate">{codes.length ? codes.map((c) => SIGNAL_TEXT[c].label).join(" · ") : <span className="text-muted">No signals</span>}</span>
            {runs ? (
              <span className="mt-0.5 block text-xs text-muted">
                AI: {runs[0].label} / {runs[1].label}
              </span>
            ) : null}
          </span>
          <span className="text-muted">{DECIDED_BY_TEXT[d.decidedBy]}</span>
          <span>{d.payoutTx ? <TxLink hash={d.payoutTx} simulated={d.simulated} /> : <span className="text-muted">—</span>}</span>
        </summary>
        <div className="grid gap-4 bg-surface-2/50 px-5 py-4 text-sm lg:grid-cols-2">
          <div>
            <p className="text-muted">Decision history</p>
            <ol className="mt-2 flex flex-col gap-1.5">
              {r.decisions.map((h, i) => (
                <li key={i} className="flex flex-wrap items-center gap-2">
                  <DecisionBadge outcome={h.outcome} size="sm" />
                  <span>{DECIDED_BY_TEXT[h.decidedBy]}</span>
                  <span className="text-muted">{formatDateTime(h.decidedAt)}</span>
                  {h.note ? <span className="text-muted">“{h.note}”</span> : null}
                </li>
              ))}
            </ol>
            {r.appeal ? (
              <p className="mt-3">
                <span className="text-muted">Appeal ({r.appeal.status}):</span> “{r.appeal.message}”
              </p>
            ) : null}
          </div>
          <div>
            <p className="text-muted">AI reasons</p>
            {d.labels.length ? (
              d.labels.map((l) => (
                <ul key={l.questionId} className="mt-2 flex flex-col gap-1">
                  <li>Run 1: {l.runs[0].reason}</li>
                  <li>Run 2: {l.runs[1].reason}</li>
                </ul>
              ))
            ) : (
              <p className="mt-2">No open-ended question was screened.</p>
            )}
            <p className="mt-3 font-mono text-xs text-muted">
              {d.rubricVersion} · {d.modelVersion}
            </p>
          </div>
        </div>
      </details>
    </li>
  );
}
