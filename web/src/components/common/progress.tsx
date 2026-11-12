import { cn } from "@/lib/cn";

export function ProgressMeter({ value, max, className, label }: { value: number; max: number; className?: string; label: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-surface-2", className)}
    >
      <div
        className="h-full w-full origin-left rounded-full bg-brand transition-transform duration-500 ease-[var(--ease-out)]"
        style={{ transform: `scaleX(${pct / 100})` }}
      />
    </div>
  );
}
