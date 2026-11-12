import { Check, Clock3, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { OUTCOME_TEXT } from "@/lib/reasons";
import type { Outcome } from "@/lib/types";

const styles: Record<Outcome, string> = {
  pay: "bg-pay-soft text-pay",
  review: "bg-review-soft text-review",
  dont_pay: "bg-dontpay-soft text-dontpay",
};

const icons = { pay: Check, review: Clock3, dont_pay: X } as const;

/** Colour + icon + text — never colour alone. */
export function DecisionBadge({ outcome, className, size = "md" }: { outcome: Outcome; className?: string; size?: "sm" | "md" }) {
  const Icon = icons[outcome];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full font-medium",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-[13px]",
        styles[outcome],
        className,
      )}
    >
      <Icon className={size === "sm" ? "size-3" : "size-3.5"} strokeWidth={2.5} aria-hidden />
      {OUTCOME_TEXT[outcome].label}
    </span>
  );
}
