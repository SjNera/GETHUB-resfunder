"use client";

import { Select as BaseSelect } from "@base-ui/react/select";
import { Check, ChevronsUpDown } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type SelectItem<V extends string> = { value: V; label: string; icon?: ReactNode };

export function Select<V extends string>({
  value,
  onValueChange,
  items,
  className,
  ariaLabel,
  disabled,
}: {
  value: V;
  onValueChange: (value: V) => void;
  items: SelectItem<V>[];
  className?: string;
  ariaLabel: string;
  disabled?: boolean;
}) {
  return (
    <BaseSelect.Root
      value={value}
      onValueChange={(v) => v !== null && onValueChange(v as V)}
      items={items.map(({ value, label }) => ({ value, label }))}
      disabled={disabled}
    >
      <BaseSelect.Trigger
        aria-label={ariaLabel}
        className={cn(
          "pressable inline-flex h-11 min-w-44 items-center justify-between gap-2 rounded-full border border-border-strong bg-surface pl-4 pr-3 text-[15px] text-fg disabled:opacity-60",
          className,
        )}
      >
        <BaseSelect.Value>
          {(v: V) => {
            const item = items.find((i) => i.value === v);
            return (
              <span className="flex items-center gap-2 [&_svg]:size-4 [&_svg]:text-muted">
                {item?.icon}
                {item?.label}
              </span>
            );
          }}
        </BaseSelect.Value>
        <BaseSelect.Icon className="text-muted">
          <ChevronsUpDown className="size-4" />
        </BaseSelect.Icon>
      </BaseSelect.Trigger>
      <BaseSelect.Portal>
        <BaseSelect.Positioner sideOffset={6} alignItemWithTrigger={false} className="z-50">
          <BaseSelect.Popup className="pop min-w-[var(--anchor-width)] rounded-2xl border border-border bg-surface p-1.5 shadow-xl">
            <BaseSelect.List>
              {items.map((item) => (
                <BaseSelect.Item
                  key={item.value}
                  value={item.value}
                  className="flex cursor-default select-none items-center gap-2 rounded-xl px-3 py-2 text-[15px] outline-none data-[highlighted]:bg-surface-2 [&_svg]:size-4"
                >
                  <span className="text-muted">{item.icon}</span>
                  <BaseSelect.ItemText className="flex-1">{item.label}</BaseSelect.ItemText>
                  <BaseSelect.ItemIndicator>
                    <Check className="text-fg" />
                  </BaseSelect.ItemIndicator>
                </BaseSelect.Item>
              ))}
            </BaseSelect.List>
          </BaseSelect.Popup>
        </BaseSelect.Positioner>
      </BaseSelect.Portal>
    </BaseSelect.Root>
  );
}
