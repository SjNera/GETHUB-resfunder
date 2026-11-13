import { Coins, FileText, Link2, Mail, Receipt, Scale, ShieldCheck, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/ui/cn";

const chips: { icon: ReactNode; label: string; className: string }[] = [
  { icon: <FileText />, label: "Survey builder", className: "left-[14%] top-[14%]" },
  { icon: <Mail />, label: "Email", className: "left-[5%] top-[44%]" },
  { icon: <Sparkles />, label: "AI label", className: "left-[22%] top-[52%] hidden lg:grid" },
  { icon: <Scale />, label: "Rule engine", className: "left-[10%] top-[76%]" },
  { icon: <Coins />, label: "Escrow", className: "right-[14%] top-[14%]" },
  { icon: <ShieldCheck />, label: "Screening", className: "right-[5%] top-[44%]" },
  { icon: <Link2 />, label: "BNB Smart Chain", className: "right-[22%] top-[52%] hidden lg:grid" },
  { icon: <Receipt />, label: "BscScan receipt", className: "right-[10%] top-[76%]" },
];

/** Faint concentric rings with floating icon chips, behind the hero. */
export function Orbit() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 hidden overflow-hidden sm:block">
      <svg className="absolute left-1/2 top-[46%] h-[150%] w-[150%] -translate-x-1/2 -translate-y-1/2" viewBox="0 0 1000 1000" fill="none">
        {[180, 260, 340, 420].map((r) => (
          <circle key={r} cx="500" cy="500" r={r} className="stroke-border-strong" strokeWidth="1" opacity="0.7" />
        ))}
        {/* tangerine arcs */}
        <path d="M 500 80 A 420 420 0 0 1 860 284" className="stroke-brand" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
        <path d="M 240 760 A 340 340 0 0 1 178 380" className="stroke-brand" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      </svg>
      {chips.map((c) => (
        <div
          key={c.label}
          title={c.label}
          className={cn(
            "material absolute grid size-14 place-items-center rounded-full text-fg [&_svg]:size-5",
            c.className,
          )}
        >
          {c.icon}
        </div>
      ))}
    </div>
  );
}
