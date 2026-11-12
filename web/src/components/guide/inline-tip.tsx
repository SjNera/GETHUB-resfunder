"use client";

import { Lightbulb, X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { useDemo } from "@/lib/data/store";

/** A small first-visit hint that sits next to the thing it explains. */
export function InlineTip({ id, children, className }: { id: string; children: ReactNode; className?: string }) {
  const seen = useDemo((s) => !!s.seenTips[id]);
  const dismiss = useDemo((s) => s.dismissTip);
  if (seen) return null;
  return (
    <div role="note" className={cn("rise-in flex items-start gap-3 rounded-2xl border border-brand/30 bg-brand-soft/60 py-3 pl-3.5 pr-2 text-[14px]", className)}>
      <Lightbulb className="mt-0.5 size-4 shrink-0 text-brand-ink" aria-hidden />
      <div className="min-w-0 flex-1 leading-relaxed">{children}</div>
      <button type="button" onClick={() => dismiss(id)} aria-label="Dismiss tip" className="pressable -my-1 grid size-8 shrink-0 place-items-center rounded-full text-muted hover:text-fg">
        <X className="size-4" />
      </button>
    </div>
  );
}
