"use client";

import NumberFlow, { type Format } from "@number-flow/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Finyon-style big number with a small label. */
export function Stat({
  value,
  label,
  prefix,
  suffix,
  format,
  className,
  children,
}: {
  value: number;
  label: ReactNode;
  prefix?: string;
  suffix?: string;
  format?: Format;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col", className)}>
      <span className="display nums text-4xl sm:text-5xl">
        <NumberFlow value={value} prefix={prefix} suffix={suffix} format={format} locales="en-PH" />
      </span>
      <span className="mt-2 text-sm text-muted">{label}</span>
      {children}
    </div>
  );
}

/** A row of stats split by thin vertical rules (stacks on mobile). */
export function StatRow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-y-6 sm:flex sm:items-stretch sm:gap-0 [&>*]:sm:flex-1 [&>*:not(:first-child)]:sm:border-l [&>*:not(:first-child)]:sm:border-border-strong [&>*:not(:first-child)]:sm:pl-8 [&>*]:sm:pr-6",
        className,
      )}
    >
      {children}
    </div>
  );
}
