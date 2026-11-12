import Link from "next/link";
import { cn } from "@/lib/ui/cn";

/** Two overlapping circles: responder + funder. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-7", className)}>
      <circle cx="12" cy="16" r="9" className="fill-fg" />
      <circle cx="20" cy="16" r="9" className="fill-brand" style={{ mixBlendMode: "normal" }} />
      <path d="M16 7.94a9 9 0 0 1 0 16.12a9 9 0 0 1 0-16.12Z" className="fill-brand-ink dark:fill-[#b35a00]" />
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
