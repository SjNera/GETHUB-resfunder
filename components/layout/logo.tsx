import Link from "next/link";
import { cn } from "@/lib/ui/cn";

/** Segmented chain block; the rising arrow forms its top-right corner. Same paths as public/brand/*.svg. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={cn("size-7", className)}>
      <g fill="none" strokeWidth={5.5} strokeLinecap="round" strokeLinejoin="round">
        <path
          className="stroke-fg"
          d="M23.8 9.7 L32 5 L40.2 9.7 M55.4 36.1 L55.4 45.5 L47.2 50.3 M40.2 54.3 L32 59 L23.8 54.3 M16.8 50.3 L8.6 45.5 L8.6 36.1 M8.6 27.9 L8.6 18.5 L16.8 13.8"
        />
        <path className="stroke-brand" d="M15 41 L24 32 L31 38 L55.4 18.5 M47.2 13.8 L55.4 18.5 L55.4 27.9" />
      </g>
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("pressable inline-flex items-center gap-2 rounded-full", className)} aria-label="ResFunder home">
      <LogoMark />
      <span className="text-[19px] font-bold tracking-[-0.03em]">ResFunder</span>
    </Link>
  );
}
