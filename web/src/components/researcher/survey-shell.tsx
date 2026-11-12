"use client";

import { ChevronRight, Eye, FileQuestion, Link2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/common/empty-state";
import { DemoGate } from "@/components/demo-gate";
import { Button, ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { current, responsesFor, useDemo } from "@/lib/data/store";
import type { Survey, SurveyStatus } from "@/lib/types";

const STATUS: Record<SurveyStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-surface-2 text-muted" },
  live: { label: "Live", className: "bg-pay-soft text-pay" },
  paused: { label: "Paused", className: "bg-review-soft text-review" },
  closed: { label: "Closed", className: "bg-surface-2 text-muted" },
};

export function StatusPill({ status }: { status: SurveyStatus }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-medium", STATUS[status].className)}>
      {status === "live" ? <span className="size-1.5 rounded-full bg-current" /> : null}
      {STATUS[status].label}
    </span>
  );
}

/** Loads the survey, then renders the shared header + tabs around a page. */
export function SurveyShell({ id, children }: { id: string; children: (survey: Survey) => ReactNode }) {
  return (
    <DemoGate>
      <Shell id={id}>{children}</Shell>
    </DemoGate>
  );
}

function Shell({ id, children }: { id: string; children: (survey: Survey) => ReactNode }) {
  const pathname = usePathname();
  const survey = useDemo((s) => s.surveys[id]);
  const all = useDemo((s) => s.responses);

  if (!survey) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <EmptyState icon={<FileQuestion />} title="Survey not found" action={<ButtonLink href="/dashboard" variant="outline">Back to dashboard</ButtonLink>}>
          It may have been removed, or the demo data was reset.
        </EmptyState>
      </div>
    );
  }

  const responses = responsesFor(all, id);
  const openReviews = responses.filter((r) => current(r).outcome === "review").length;
  const appeals = responses.filter((r) => r.appeal?.status === "pending").length;
  const funded = !!survey.funding;

  const tabs = [
    { href: `/surveys/${id}`, label: "Overview", show: true },
    { href: `/surveys/${id}/review`, label: "Review queue", count: openReviews + appeals, show: funded },
    { href: `/surveys/${id}/log`, label: "Decision log", show: funded },
    { href: `/surveys/${id}/edit`, label: funded ? "Questions" : "Builder", show: true },
    { href: `/surveys/${id}/fund`, label: "Fund and launch", show: !funded },
  ].filter((t) => t.show);

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/s/${id}` : `/s/${id}`;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-10 pt-6 sm:px-6">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-muted">
        <Link href="/dashboard" className="hover:text-fg">Dashboard</Link>
        <ChevronRight className="size-3.5" />
        <span className="truncate text-fg">{survey.title}</span>
      </nav>
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={survey.status} />
            <span className="text-sm text-muted">{survey.researcher}</span>
          </div>
          <h1 className="display mt-3 text-[clamp(1.75rem,4vw,2.75rem)]">{survey.title}</h1>
        </div>
        {funded ? (
          <div className="flex shrink-0 flex-wrap gap-2">
            <ButtonLink href={`/s/${id}`} variant="outline" size="sm">
              <Eye />
              Student view
            </ButtonLink>
            {survey.status === "live" ? (
              <Button
                variant="dark"
                size="sm"
                onClick={() => {
                  navigator.clipboard?.writeText(shareUrl);
                  toast.success("Share link copied", { description: shareUrl });
                }}
              >
                <Link2 />
                Copy share link
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      <nav aria-label="Survey sections" className="mt-6 overflow-x-auto [scrollbar-width:none]">
        <ul className="inline-flex gap-1 rounded-full border border-border bg-surface p-1">
          {tabs.map((t) => {
            const active = t.href === `/surveys/${id}` ? pathname === t.href : pathname.startsWith(t.href);
            return (
              <li key={t.href}>
                <Link
                  href={t.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-medium transition-colors duration-150",
                    active ? "bg-inverse text-inverse-fg" : "text-muted hover:text-fg",
                  )}
                >
                  {t.label}
                  {t.count ? (
                    <span className={cn("nums grid min-w-5 place-items-center rounded-full px-1.5 text-xs", active ? "bg-brand text-brand-fg" : "bg-review-soft text-review")}>
                      {t.count}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-8">{children(survey)}</div>
    </div>
  );
}
