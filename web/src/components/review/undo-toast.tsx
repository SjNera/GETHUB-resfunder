"use client";

import { useEffect, useRef, useState } from "react";
import { RESPONSES, rsp } from "@/lib/review/seed";
import { type ReviewDecision, undo } from "@/lib/review/store";
import { cn } from "@/lib/cn";

/**
 * Shows the latest decision still in its 5 s undo window. Enters and leaves
 * from the bottom edge (same direction both ways), exit faster than entry.
 */
export function UndoToast({ decisions, inDrawer = false }: { decisions: Record<string, ReviewDecision>; inDrawer?: boolean }) {
  const latest = Object.entries(decisions)
    .filter(([, d]) => d.status === "undo_window")
    .sort((a, b) => b[1].decidedAt - a[1].decidedAt)[0];

  const [shown, setShown] = useState<{ id: string; d: ReviewDecision } | null>(null);
  const [leaving, setLeaving] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestId = latest?.[0] ?? null;

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (latestId) {
      const d = decisions[latestId];
      // Sync from the external store; keep the last toast mounted while it leaves.
      timer.current = setTimeout(() => {
        setShown({ id: latestId, d });
        setLeaving(false);
      }, 0);
    } else {
      timer.current = setTimeout(() => setLeaving(true), 0);
      const t = setTimeout(() => setShown(null), 200);
      return () => clearTimeout(t);
    }
  }, [latestId, decisions]);

  if (!shown) return null;
  const r = RESPONSES.find((x) => x.id === shown.id);
  const pay = shown.d.result === "pay";

  return (
    <div
      className={cn(
        "pointer-events-none inset-x-0 z-[60] flex justify-center px-4",
        inDrawer ? "absolute bottom-[calc(100%+0.75rem)]" : "fixed bottom-0 pb-[max(1rem,env(safe-area-inset-bottom))]",
      )}
      aria-live="polite"
    >
      <div
        className={cn(
          "pointer-events-auto flex items-center gap-4 rounded-full bg-inverse py-2 pl-5 pr-2 text-[15px] text-inverse-fg shadow-xl",
          leaving
            ? "translate-y-[150%] opacity-0 transition-[transform,opacity] duration-200 ease-out"
            : "animate-[toast-in_260ms_var(--ease-out)] motion-reduce:animate-[fade-in_200ms_ease]",
        )}
      >
        <span>
          {pay ? "Paid" : "Not paid"} {r ? rsp(r.num) : ""}
        </span>
        <button
          type="button"
          onClick={() => undo(shown.id)}
          className="pressable h-10 rounded-full bg-white/15 px-4 font-semibold [@media(hover:hover)_and_(pointer:fine)]:hover:bg-white/25 dark:bg-black/10"
        >
          Undo
        </button>
      </div>
    </div>
  );
}
