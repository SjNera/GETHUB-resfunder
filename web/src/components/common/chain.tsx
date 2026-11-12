"use client";

import { ArrowUpRight, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { addressUrl, formatPeso, shortHash, txUrl } from "@/lib/format";

/** Peso amount from token units (mock tPHP, 18 decimals): "₱1,575". */
export function Peso({ amount, className, max }: { amount: bigint | string; className?: string; max?: number }) {
  return <span className={cn("nums whitespace-nowrap", className)}>{formatPeso(amount, max)}</span>;
}

export function SimulatedTag({ className }: { className?: string }) {
  return (
    <span
      title="Demo mode: the contract and agent wallet aren't connected yet, so this transaction is simulated."
      className={cn("rounded-full border border-dashed border-border-strong px-1.5 py-px text-[11px] font-medium uppercase tracking-wide text-muted", className)}
    >
      simulated
    </span>
  );
}

export function TxLink({ hash, simulated, label = "BscScan", className }: { hash: string; simulated?: boolean; label?: string; className?: string }) {
  if (simulated) {
    return (
      <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap font-mono text-[13px] text-muted", className)}>
        {shortHash(hash)}
        <SimulatedTag />
      </span>
    );
  }
  return (
    <a
      href={txUrl(hash)}
      target="_blank"
      rel="noreferrer"
      className={cn("inline-flex items-center gap-1 whitespace-nowrap font-mono text-[13px] text-brand-ink underline-offset-4 hover:underline", className)}
    >
      {label} · {shortHash(hash)}
      <ArrowUpRight className="size-3.5" aria-hidden />
    </a>
  );
}

export function AddressChip({ address, link = false, className }: { address: string; link?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1 rounded-full bg-surface-2 py-0.5 pl-2.5 pr-1 font-mono text-[13px]", className)}>
      {link ? (
        <a href={addressUrl(address)} target="_blank" rel="noreferrer" className="truncate hover:underline">
          {shortHash(address)}
        </a>
      ) : (
        <span className="truncate">{shortHash(address)}</span>
      )}
      <button
        type="button"
        aria-label="Copy address"
        className="pressable grid size-6 place-items-center rounded-full text-muted hover:text-fg"
        onClick={() => {
          navigator.clipboard?.writeText(address);
          toast.success("Address copied");
        }}
      >
        <Copy className="size-3.5" />
      </button>
    </span>
  );
}
