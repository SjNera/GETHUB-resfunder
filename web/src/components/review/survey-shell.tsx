"use client";

import { Check, ChevronRight, Clock3, Link2, Lock } from "lucide-react";
import Link from "next/link";
import { type ReactNode, useEffect, useState, useSyncExternalStore } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { useAccount } from "@/lib/auth/store";
import { RESPONSES, type DemoSurvey } from "@/lib/review/seed";
import { claimSurvey, useReview } from "@/lib/review/store";
import { TABS, type TabId } from "@/lib/review/tabs";



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

function timeLeft(deadline: string, now: number) {
  const ms = Date.parse(deadline) - now;
  if (ms <= 0) return "closed";
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  return d > 0 ? `${d}d ${h}h left` : `${h}h left`;
}

export function SurveyShell({ survey, tab, children }: { survey: DemoSurvey; tab: TabId; children: ReactNode }) {
  const { ready, account } = useAccount();
  const review = useReview();
  const now = useMinute();
  const [copied, setCopied] = useState(false);

  const eligible = !!account && account.setupStep === null && !!account.wallet && !account.blocked;
  useEffect(() => {
    if (eligible && account) claimSurvey(account.email);
  }, [eligible, account]);

  if (!ready || !review) return <div className="h-[70dvh]" />;

  const isOwner = eligible && account && (review.owner === null || review.owner === account.email);
  const pending = RESPONSES.filter((r) => !review.decisions[r.id]).length;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6 sm:px-6 sm:pt-10">
      {/* header */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-muted">
        <span>Surveys</span>
        <ChevronRight aria-hidden className="size-4" />
        <span className="inline-flex items-center gap-1.5 rounded-full bg-pay-soft px-2.5 py-0.5 font-medium text-pay">
          <span className="size-1.5 rounded-full bg-pay" aria-hidden />
          Live
        </span>
        <span className="font-mono text-xs text-subtle">{survey.code}</span>
      </nav>
      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="display max-w-3xl text-[clamp(1.75rem,4.5vw,2.6rem)] [line-height:1.06]">{survey.title}</h1>
        <Button
          variant="dark"
          className="w-full shrink-0 sm:w-auto"
          onClick={() => {
            navigator.clipboard?.writeText(`${location.origin}/s/${survey.code}`).then(() => setCopied(true), () => {});
            setTimeout(() => setCopied(false), 1600);
          }}
        >
          <span key={copied ? "y" : "n"} className="inline-flex items-center gap-2 animate-[swap_150ms_var(--ease-out)] motion-reduce:animate-none">
            {copied ? <Check /> : <Link2 />}
            {copied ? "Link copied" : "Copy share link"}
          </span>
        </Button>
      </div>

      {/* tabs */}
      <div className="mt-6 flex flex-col gap-3 border-t border-border pt-5 md:flex-row md:items-center md:justify-between">
        <div className="relative -mx-4 md:mx-0">
          <div className="overflow-x-auto px-4 [scrollbar-width:none] md:px-0 [&::-webkit-scrollbar]:hidden">
            <nav aria-label="Survey sections" className="inline-flex gap-1 rounded-2xl border border-border bg-surface p-1">
              {TABS.map(([id, label]) => {
                const active = id === tab;
                return (
                  <Link
                    key={id}
                    href={`/surveys/${survey.id}/${id}`}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "pressable inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3.5 text-[15px] transition-colors duration-150",
                      active ? "bg-surface-2 font-semibold text-fg shadow-[inset_0_0_0_1px_var(--border-strong)]" : "text-muted [@media(hover:hover)_and_(pointer:fine)]:hover:text-fg",
                    )}
                  >
                    {label}
                    {id === "queue" && isOwner && pending > 0 ? (
                      <span className="grid min-w-5 place-items-center rounded-full bg-brand px-1.5 text-xs font-semibold text-brand-fg" aria-label={`${pending} pending`}>
                        {pending}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-bg md:hidden" />
        </div>
        <p className="flex items-center gap-1.5 text-sm text-muted">
          <Clock3 aria-hidden className="size-4" />
          Closes {survey.closesLabel}
          {now ? ` · ${timeLeft(survey.deadline, now)}` : ""}
        </p>
      </div>

      <div className="mt-6">
        {isOwner ? (
          children
        ) : (
          <div className="flex flex-col items-start gap-4 rounded-[2rem] border border-border bg-surface p-8">
            <span className="grid size-12 place-items-center rounded-2xl bg-surface-2 text-muted">
              <Lock className="size-5" />
            </span>
            <div>
              <h2 className="heading text-xl">Only the researcher can review responses</h2>
              <p className="mt-1 max-w-prose text-muted">
                {!account
                  ? "Sign in with the account and wallet that funded this survey."
                  : !eligible
                    ? "Finish setting up your account, including your wallet, first."
                    : "This survey belongs to another account."}
              </p>
            </div>
            <ButtonLink href={`/sign-in?next=/surveys/${survey.id}/queue`} variant="primary">
              {account && !eligible ? "Finish setup" : "Sign in"}
            </ButtonLink>
          </div>
        )}
      </div>
    </div>
  );
}

export function TabPlaceholder({ label }: { label: string }) {
  return (
    <div className="rounded-[2rem] border border-dashed border-border-strong p-10 text-center">
      <h2 className="heading text-xl">{label}</h2>
      <p className="mx-auto mt-2 max-w-sm text-muted">This tab comes with the full app. The Review queue works today.</p>
    </div>
  );
}
