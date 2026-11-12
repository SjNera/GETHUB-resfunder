"use client";

import { Switch as BaseSwitch } from "@base-ui/react/switch";
import { cn } from "@/lib/cn";

export function Switch({
  checked,
  onCheckedChange,
  label,
  className,
  disabled,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <label className={cn("inline-flex cursor-pointer select-none items-center gap-2.5 text-sm", disabled && "cursor-not-allowed opacity-60", className)}>
      <BaseSwitch.Root
        checked={checked}
        onCheckedChange={(v) => onCheckedChange(v)}
        disabled={disabled}
        className="relative inline-flex h-6 w-10 shrink-0 items-center rounded-full bg-border-strong p-0.5 transition-colors duration-150 ease-out data-[checked]:bg-inverse"
      >
        <BaseSwitch.Thumb className="size-5 rounded-full bg-surface shadow-sm transition-transform duration-200 ease-[var(--ease-out)] data-[checked]:translate-x-4" />
      </BaseSwitch.Root>
      <span>{label}</span>
    </label>
  );
}
