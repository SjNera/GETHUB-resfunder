"use client";

import { Check, Clock3, X } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

type Event = {
  id: string;
  outcome: "pay" | "review" | "dont_pay";
  title: string;
  detail: string;
  meta: string;
};

const EVENTS: Event[] = [
  { id: "e1", outcome: "pay", title: "Response #42 · Paid 0.001 tBNB", detail: "“Madalas may online class pa ng gabi…”", meta: "Taglish · labelled valid twice · BscScan ↗" },
  { id: "e2", outcome: "review", title: "Response #43 · Sent to Review", detail: "Instruction-like text flagged", meta: "Waits for the researcher, with the AI reason" },
  { id: "e3", outcome: "dont_pay", title: "Response #44 · Not paid", detail: "Required answer was “ok”", meta: "Empty answer (code-confirmed) · logged on-chain" },
  { id: "e4", outcome: "pay", title: "Response #45 · Paid 0.001 tBNB", detail: "“Group projects that only start after 9pm.”", meta: "Code checks passed · BscScan ↗" },
  { id: "e5", outcome: "dont_pay", title: "Response #46 · Not paid", detail: "Copied another response word for word", meta: "Duplicate text (code-confirmed)" },
];

const ICON = { pay: Check, review: Clock3, dont_pay: X };
const TONE = {
  pay: "bg-pay-soft text-pay",
  review: "bg-review-soft text-review",
  dont_pay: "bg-dontpay-soft text-dontpay",
};

/** Deflexai-style stacked notification cards, playing the pipeline. */
export function ActivityStack() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % EVENTS.length), 3200);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative mx-auto h-[16.5rem] w-full max-w-md" aria-live="off">
      {/* soft glow beneath the stack */}
      <div aria-hidden className="absolute inset-x-6 top-10 -z-10 h-40 rounded-full bg-brand/25 blur-3xl dark:bg-brand/15" />
      {EVENTS.map((e, i) => {
        const pos = (i - index + EVENTS.length) % EVENTS.length;
        const visible = pos < 3;
        const Icon = ICON[e.outcome];
        return (
          <div
            key={e.id}
            aria-hidden={pos !== 0}
            className={cn(
              "absolute inset-x-0 top-0 mx-auto flex items-start gap-3 rounded-2xl border border-border bg-surface p-4 text-left shadow-[0_12px_32px_-14px_rgb(18_18_18/0.25)]",
              "transition-[transform,opacity] duration-500 ease-[var(--ease-out)] motion-reduce:transition-none",
            )}
            style={{
              transform: `translateY(${pos * 82}px) scale(${1 - pos * 0.05})`,
              opacity: visible ? 1 - pos * 0.12 : 0,
              zIndex: 10 - pos,
            }}
          >
            <span className={cn("grid size-9 shrink-0 place-items-center rounded-full", TONE[e.outcome])}>
              <Icon className="size-4" strokeWidth={2.5} />
            </span>
            <span className="min-w-0">
              <span className="block font-semibold tracking-[-0.01em]">{e.title}</span>
              <span className="mt-0.5 block truncate text-sm text-muted">{e.detail}</span>
              <span className="mt-1 block text-xs text-subtle">{e.meta}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
