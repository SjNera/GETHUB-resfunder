"use client";

import { Checkbox } from "@base-ui/react/checkbox";
import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

const row =
  "flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-2.5 text-[15px] transition-colors duration-150 ease-out has-[[data-checked]]:border-fg/60 has-[[data-checked]]:bg-surface-2 [@media(hover:hover)_and_(pointer:fine)]:hover:border-border-strong";

export function RadioList({
  options,
  value,
  onValueChange,
  name,
  disabled,
  ariaLabelledBy,
}: {
  options: string[];
  value: string | null;
  onValueChange: (v: string) => void;
  name: string;
  disabled?: boolean;
  ariaLabelledBy?: string;
}) {
  return (
    <RadioGroup
      name={name}
      value={value ?? ""}
      onValueChange={(v) => onValueChange(v as string)}
      disabled={disabled}
      aria-labelledby={ariaLabelledBy}
      className="flex flex-col gap-2"
    >
      {options.map((opt, i) => (
        <label key={`${opt}-${i}`} className={row}>
          <Radio.Root
            value={opt}
            className="flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-border-strong data-[checked]:border-fg"
          >
            <Radio.Indicator className="size-2.5 rounded-full bg-fg" />
          </Radio.Root>
          <span>{opt || <em className="text-subtle">Option {i + 1}</em>}</span>
        </label>
      ))}
    </RadioGroup>
  );
}

export function CheckboxList({
  options,
  value,
  onValueChange,
  disabled,
}: {
  options: string[];
  value: string[];
  onValueChange: (v: string[]) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      {options.map((opt, i) => {
        const checked = value.includes(opt);
        return (
          <label key={`${opt}-${i}`} className={row}>
            <Checkbox.Root
              checked={checked}
              disabled={disabled}
              onCheckedChange={(c) => onValueChange(c ? [...value, opt] : value.filter((v) => v !== opt))}
              className="flex size-5 shrink-0 items-center justify-center rounded-md border-2 border-border-strong data-[checked]:border-fg data-[checked]:bg-fg"
            >
              <Checkbox.Indicator className="text-bg">
                <Check className="size-3.5" strokeWidth={3} />
              </Checkbox.Indicator>
            </Checkbox.Root>
            <span>{opt || <em className="text-subtle">Option {i + 1}</em>}</span>
          </label>
        );
      })}
    </div>
  );
}

export function ScalePicker({
  value,
  onValueChange,
  minLabel,
  maxLabel,
  disabled,
  ariaLabelledBy,
}: {
  value: number | null;
  onValueChange: (v: number) => void;
  minLabel: string;
  maxLabel: string;
  disabled?: boolean;
  ariaLabelledBy?: string;
}) {
  return (
    <div>
      <RadioGroup
        value={value === null ? "" : String(value)}
        onValueChange={(v) => onValueChange(Number(v))}
        disabled={disabled}
        aria-labelledby={ariaLabelledBy}
        className="grid grid-cols-5 gap-2"
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <Radio.Root
            key={n}
            value={String(n)}
            aria-label={`${n}${n === 1 && minLabel ? ` (${minLabel})` : ""}${n === 5 && maxLabel ? ` (${maxLabel})` : ""}`}
            className={cn(
              "pressable nums flex h-12 items-center justify-center rounded-2xl border border-border bg-surface text-base font-medium transition-colors duration-150 ease-out",
              "data-[checked]:border-fg data-[checked]:bg-inverse data-[checked]:text-inverse-fg",
            )}
          >
            {n}
          </Radio.Root>
        ))}
      </RadioGroup>
      <div className="mt-2 flex justify-between gap-4 text-xs text-muted">
        <span>{minLabel}</span>
        <span className="text-right">{maxLabel}</span>
      </div>
    </div>
  );
}
