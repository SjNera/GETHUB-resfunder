"use client";

import { ChevronDown } from "lucide-react";
import {
  type ComponentProps,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/ui/cn";
import { OTHER, type Option } from "@/lib/ui/auth/options";
import type { Choice } from "@/lib/ui/auth/store";

export function FieldLabel({
  htmlFor,
  id,
  children,
  optional,
}: {
  htmlFor?: string;
  id?: string;
  children: ReactNode;
  optional?: boolean;
}) {
  return (
    <label
      htmlFor={htmlFor}
      id={id}
      className="mb-2 block text-[15px] font-semibold"
    >
      {children}
      {optional ? (
        <span className="font-normal text-muted"> (optional)</span>
      ) : null}
    </label>
  );
}

export function FieldError({
  id,
  children,
}: {
  id?: string;
  children?: ReactNode;
}) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="mt-2 text-sm text-dontpay">
      {children}
    </p>
  );
}

export function Helper({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("mt-2 text-sm leading-snug text-muted", className)}>
      {children}
    </p>
  );
}

/** 16px text so iOS never zooms; 52px tall. */
export const inputClass =
  "h-13 w-full rounded-2xl border border-border-strong bg-surface px-4 text-base text-fg outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-subtle focus:border-brand focus:shadow-[0_0_0_3px_rgb(255_138_28/0.25)] aria-[invalid=true]:border-dontpay disabled:bg-surface-2 disabled:text-muted";

export function TextInput({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(inputClass, className)} {...props} />;
}

export function Select({
  className,
  options,
  placeholder,
  ...props
}: ComponentProps<"select"> & { options: Option[]; placeholder: string }) {
  return (
    <div className="relative">
      <select
        className={cn(inputClass, "appearance-none pr-11", className)}
        {...props}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-4 top-1/2 size-5 -translate-y-1/2 text-muted"
      />
    </div>
  );
}

/**
 * Single-select pills (native radios, so arrow keys work). If the options
 * include Others, picking it reveals a required "Please specify" input that
 * takes focus. Its text is kept when switching away and back.
 */
export function Pills({
  label,
  options,
  value,
  onChange,
  error,
  helper,
}: {
  label: string;
  options: Option[];
  value: Choice | undefined;
  onChange: (v: Choice) => void;
  error?: string;
  helper?: ReactNode;
}) {
  const id = useId();
  const otherRef = useRef<HTMLInputElement>(null);
  const showOther = value?.value === OTHER;
  const [otherText, setOtherText] = useState(value?.other ?? "");

  useEffect(() => {
    if (showOther) otherRef.current?.focus({ preventScroll: true });
  }, [showOther]);

  return (
    <fieldset aria-describedby={error ? `${id}-err` : undefined}>
      <legend className="mb-2 text-[15px] font-semibold">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const checked = value?.value === o.value;
          return (
            <label
              key={o.value}
              className={cn(
                "pressable relative inline-flex h-11 cursor-pointer select-none items-center rounded-full border px-4 text-[15px] transition-[background-color,border-color,color] duration-150",
                "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-bg",
                checked
                  ? "border-fg bg-fg text-bg"
                  : "border-border-strong bg-surface [@media(hover:hover)_and_(pointer:fine)]:hover:border-fg/40",
              )}
            >
              <input
                type="radio"
                name={id}
                value={o.value}
                checked={checked}
                onChange={() =>
                  onChange(
                    o.value === OTHER
                      ? { value: OTHER, other: otherText }
                      : { value: o.value },
                  )
                }
                className="sr-only"
              />
              {o.label}
            </label>
          );
        })}
      </div>
      {options.some((o) => o.value === OTHER) ? (
        <div
          inert={!showOther}
          className={cn(
            "grid transition-[grid-template-rows,opacity] duration-200 ease-[var(--ease-out)] motion-reduce:transition-opacity",
            showOther
              ? "grid-rows-[1fr] opacity-100"
              : "grid-rows-[0fr] opacity-0",
          )}
        >
          <div className="overflow-hidden">
            <div className="pt-3">
              <label
                htmlFor={`${id}-other`}
                className="mb-1.5 block text-sm font-medium text-muted"
              >
                Please specify
              </label>
              <TextInput
                ref={otherRef}
                id={`${id}-other`}
                maxLength={60}
                placeholder="Type here"
                tabIndex={showOther ? 0 : -1}
                value={value?.value === OTHER ? (value.other ?? "") : otherText}
                onChange={(e) => {
                  setOtherText(e.target.value);
                  onChange({ value: OTHER, other: e.target.value });
                }}
                aria-invalid={!!error && showOther}
              />
            </div>
          </div>
        </div>
      ) : null}
      {helper ? <Helper>{helper}</Helper> : null}
      <FieldError id={`${id}-err`}>{error}</FieldError>
    </fieldset>
  );
}

/** Plain value pills (no Others), e.g. age range and working student. */
export function ValuePills(
  props: Omit<Parameters<typeof Pills>[0], "value" | "onChange"> & {
    value?: string;
    onChange: (v: string) => void;
  },
) {
  return (
    <Pills
      {...props}
      value={props.value ? { value: props.value } : undefined}
      onChange={(c) => props.onChange(c.value)}
    />
  );
}

export function Checkbox({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-[15px] leading-snug">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-6 shrink-0 cursor-pointer appearance-none rounded-lg border-2 border-border-strong bg-surface bg-center bg-no-repeat transition-colors checked:border-fg checked:bg-fg checked:bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23f2f1ee%22 stroke-width=%223%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><path d=%22M5 12l5 5L20 7%22/></svg>')] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      />
      <span>{children}</span>
    </label>
  );
}

/** True when a required Choice is missing or is Others with no text. */
export function choiceError(
  c: Choice | undefined,
  pick: string,
): string | undefined {
  if (!c?.value) return pick;
  if (c.value === OTHER && !c.other?.trim())
    return "Tell us which one, or pick an option above.";
  return undefined;
}
