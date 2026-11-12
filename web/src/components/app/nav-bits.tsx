"use client";

import { ChevronLeft, X } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** "Step 2 of 3 · Questions" — every screen says where you are. */
export function StepPill({ step, of, label, className }: { step: number; of: number; label: string; className?: string }) {
  return (
    <p className={cn("material inline-flex h-11 items-center gap-2 rounded-full px-4 text-[13px]", className)}>
      <span className="on-glass nums font-semibold">
        Step {step} of {of}
      </span>
      <span className="text-muted">· {label}</span>
    </p>
  );
}

export function BackLink({ href, label, className }: { href: string; label: string; className?: string }) {
  return (
    <Link href={href} aria-label={label} className={cn("material pressable grid size-11 shrink-0 place-items-center rounded-full", className)}>
      <ChevronLeft className="size-5" aria-hidden />
    </Link>
  );
}

export function CloseLink({ href, label, className }: { href: string; label: string; className?: string }) {
  return (
    <Link href={href} aria-label={label} className={cn("material pressable grid size-11 shrink-0 place-items-center rounded-full", className)}>
      <X className="size-5" aria-hidden />
    </Link>
  );
}

/** Floating glass bar for a screen's primary action, with a soft scroll edge. */
export function ActionBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30">
      <div className="scroll-edge-bottom h-8" />
      <div className="bg-bg px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className={cn("material mx-auto flex max-w-2xl items-center justify-between gap-3 rounded-full py-2 pl-5 pr-2", className)}>{children}</div>
      </div>
    </div>
  );
}
