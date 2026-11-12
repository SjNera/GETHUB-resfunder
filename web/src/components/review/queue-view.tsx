"use client";

import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { shortAddress } from "@/lib/auth/metamask";
import { type DemoSurvey, RESPONSES, rsp } from "@/lib/review/seed";
import { type ReviewDecision, resetDemo, tick, useReview } from "@/lib/review/store";
import { inputClass } from "../auth/fields";
import { ReviewDrawer } from "./review-drawer";
import { UndoToast } from "./undo-toast";

type StatusFilter = "pending" | "decided" | "all";

export function StatusPill({ d }: { d?: ReviewDecision }) {
  if (!d) return <span className="inline-flex rounded-full bg-surface-2 px-2.5 py-0.5 text-[13px] font-medium text-muted">Pending</span>;
  const pay = d.result === "pay";
  const word = pay ? "Paid" : "Not paid";
  const stage = d.status === "undo_window" ? " · undo" : d.status === "sent" ? " · sending" : "";
  return (
    <span className={cn("inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-[13px] font-medium", pay ? "bg-pay-soft text-pay" : "bg-dontpay-soft text-dontpay")}>
      {word}
      {stage}
    </span>
  );
}

export function QueueView({ survey }: { survey: DemoSurvey }) {
  const review = useReview();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusFilter>("pending");
  const [openId, setOpenId] = useState<string | null>(null);

  // Drive the simulated payment pipeline (undo window → sent → confirmed).
  useEffect(() => {
    tick();
    const t = setInterval(() => tick(), 500);
    return () => clearInterval(t);
  }, []);

  const decisions = useMemo(() => review?.decisions ?? {}, [review]);
  const rows = RESPONSES.filter((r) => {
    const d = decisions[r.id];
    if (status === "pending" && d) return false;
    if (status === "decided" && !d) return false;
    const t = q.trim().toLowerCase();
    return !t || `${rsp(r.num)} ${r.wallet} ${r.headline}`.toLowerCase().includes(t);
  });
  const pendingCount = RESPONSES.filter((r) => !decisions[r.id]).length;
  const allCaughtUp = pendingCount === 0 && status === "pending" && !q;

  return (
    <>
      {/* tools */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative flex-1 sm:max-w-sm">
          <span className="sr-only">Search the review queue</span>
          <Search aria-hidden className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input type="search" placeholder="Search by ID or wallet" value={q} onChange={(e) => setQ(e.target.value)} className={cn(inputClass, "h-11 pl-11")} />
        </label>
        <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.06em] text-muted">
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} className={cn(inputClass, "h-11 w-auto pr-8 text-[15px] font-normal normal-case tracking-normal text-fg")}>
            <option value="pending">Pending</option>
            <option value="decided">Decided</option>
            <option value="all">All</option>
          </select>
        </label>
      </div>

      <div className="mt-4">
        {rows.length === 0 ? (
          <div className="rounded-[2rem] border border-border bg-surface p-10 text-center">
            {allCaughtUp ? (
              <>
                <h2 className="heading text-xl">All caught up</h2>
                <p className="mx-auto mt-2 max-w-sm text-muted">Every flagged response has a decision.</p>
                <Button className="mt-5" onClick={() => setStatus("decided")}>
                  See decisions
                </Button>
              </>
            ) : (
              <>
                <p className="text-muted">No responses match your search or filter.</p>
                <Button
                  className="mt-4"
                  onClick={() => {
                    setQ("");
                    setStatus("pending");
                  }}
                >
                  Clear search and filter
                </Button>
              </>
            )}
          </div>
        ) : (
          <>
            {/* desktop table */}
            <div className="hidden overflow-hidden rounded-3xl border border-border bg-surface md:block">
              <table className="w-full text-left text-[15px]">
                <thead className="border-b border-border bg-surface-2/60 text-sm text-muted">
                  <tr>
                    <th className="px-5 py-3 font-medium">Response</th>
                    <th className="px-5 py-3 font-medium">Reason</th>
                    <th className="px-5 py-3 font-medium">Submitted</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const d = decisions[r.id];
                    return (
                      <tr key={r.id} className="border-b border-border last:border-0">
                        <td className="px-5 py-4">
                          <p className="font-semibold">{rsp(r.num)}</p>
                          <p className="font-mono text-xs text-muted">{shortAddress(r.wallet)}</p>
                        </td>
                        <td className="px-5 py-4">{r.headline}</td>
                        <td className="px-5 py-4 text-muted">{r.ago}</td>
                        <td className="px-5 py-4">
                          <StatusPill d={d} />
                        </td>
                        <td className="px-5 py-4 text-right">
                          <Button size="sm" variant={d ? "outline" : "dark"} className="h-10 px-4" onClick={() => setOpenId(r.id)}>
                            {d ? "View" : "Review"}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* phone cards */}
            <ul className="flex flex-col gap-3 md:hidden">
              {rows.map((r) => {
                const d = decisions[r.id];
                return (
                  <li key={r.id} className="rounded-3xl border border-border bg-surface p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{rsp(r.num)}</p>
                        <p className="font-mono text-xs text-muted">{shortAddress(r.wallet)}</p>
                      </div>
                      <StatusPill d={d} />
                    </div>
                    <p className="mt-3 text-[16px]">{r.headline}</p>
                    <p className="mt-1 text-sm text-muted">Submitted {r.ago}</p>
                    <Button variant={d ? "outline" : "dark"} className="mt-4 w-full" onClick={() => setOpenId(r.id)}>
                      {d ? "View" : "Review"}
                    </Button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      <p className="mt-4 text-sm text-muted">
        Showing {rows.length} · reviews wait for you; nothing pays until you decide.{" "}
        <button type="button" onClick={resetDemo} className="font-medium text-brand-ink [@media(hover:hover)_and_(pointer:fine)]:hover:underline">
          Reset demo
        </button>
      </p>

      <ReviewDrawer survey={survey} openId={openId} onOpenChange={setOpenId} decisions={decisions} />
      {openId ? null : <UndoToast decisions={decisions} />}
    </>
  );
}
