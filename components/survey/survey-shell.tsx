"use client";

// Researcher survey page frame (header, share link, tabs). Props only; the page (task U4)
// loads the survey and signs view_log. Ownership is enforced by the log route, not here.
import { Check, ChevronRight, Clock3, Link2 } from "lucide-react";
import Link from "next/link";
import { type ReactNode, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/ui/cn";
import { TABS, type TabId } from "@/lib/ui/survey-tabs";
import type { SurveyStatus } from "@/lib/types";

/** Ticks once a minute; null on the server so nothing mismatches on hydration. */
function useMinute(): number | null {
  return useSyncExternalStore(
    (cb) => {
      const t = setInterval(cb, 60_000);
      return () => clearInterval(t);
    },
    () => Math.floor(Date.now() / 60_000) * 60_000,
    () => null,
  );
}

/** deadline is unix seconds. */
function timeLeft(deadline: number, now: number) {
  const ms = deadline * 1000 - now;
  if (ms <= 0) return "closed";
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  return d > 0 ? `${d}d ${h}h left` : `${h}h left`;
}

export type SurveyShellProps = {
  surveyId: number;
  title: string;
  status: SurveyStatus;
  paused: boolean;
  /** unix seconds */
  deadline: number;
  /** share path from POST /api/surveys, e.g. "/s/12" */
  sharePath: string;
  tab: TabId;
  children: ReactNode;
};

export function SurveyShell({ surveyId, title, status, paused, deadline, sharePath, tab, children }: SurveyShellProps) {
  const now = useMinute();
  const [copied, setCopied] = useState(false);
  const live = status === "open" && !paused;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6 sm:px-6 sm:pt-10">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-muted">
        <span>Surveys</span>
        <ChevronRight aria-hidden className="size-4" />
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-medium",
            live ? "bg-pay-soft text-pay" : "bg-surface-2 text-muted",
          )}
        >
          <span className={cn("size-1.5 rounded-full", live ? "bg-pay" : "bg-subtle")} aria-hidden />
          {status === "closed" ? "Closed" : paused ? "Paused" : "Live"}
        </span>
        <span className="font-mono text-xs text-subtle">#{surveyId}</span>
      </nav>
      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="display max-w-3xl text-[clamp(1.75rem,4.5vw,2.6rem)] [line-height:1.06]">{title}</h1>
        <Button
          variant="dark"
          className="w-full shrink-0 sm:w-auto"
          onClick={() => {
            navigator.clipboard?.writeText(`${location.origin}${sharePath}`).then(() => setCopied(true), () => {});
            setTimeout(() => setCopied(false), 1600);
          }}
        >
          <span key={copied ? "y" : "n"} className="inline-flex items-center gap-2 animate-[swap_150ms_var(--ease-out)] motion-reduce:animate-none">
            {copied ? <Check /> : <Link2 />}
            {copied ? "Link copied" : "Copy share link"}
          </span>
        </Button>
      </div>

      <div className="mt-6 flex flex-col gap-3 border-t border-border pt-5 md:flex-row md:items-center md:justify-between">
        <div className="relative -mx-4 md:mx-0">
          <div className="overflow-x-auto px-4 [scrollbar-width:none] md:px-0 [&::-webkit-scrollbar]:hidden">
            <nav aria-label="Survey sections" className="inline-flex gap-1 rounded-2xl border border-border bg-surface p-1">
              {TABS.map(([id, label]) => {
                const active = id === tab;
                return (
                  <Link
                    key={id}
                    href={`/surveys/${surveyId}/${id}`}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "pressable inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3.5 text-[15px] transition-colors duration-150",
                      active ? "bg-surface-2 font-semibold text-fg shadow-[inset_0_0_0_1px_var(--border-strong)]" : "text-muted [@media(hover:hover)_and_(pointer:fine)]:hover:text-fg",
                    )}
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-bg md:hidden" />
        </div>
        <p className="flex items-center gap-1.5 text-sm text-muted">
          <Clock3 aria-hidden className="size-4" />
          {status === "closed" ? "Closed" : now ? timeLeft(deadline, now) : null}
        </p>
      </div>

      <div className="mt-6">{children}</div>
    </div>
  );
}
