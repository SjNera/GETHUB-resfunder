"use client";

import { ArrowUpRight, ClipboardList, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Money } from "@/components/common/chain";
import { EmptyState } from "@/components/common/empty-state";
import { ProgressMeter } from "@/components/common/progress";
import { DemoGate } from "@/components/demo-gate";
import { StatusPill } from "@/components/researcher/survey-shell";
import { Button } from "@/components/ui/button";
import { responsesFor, surveyStats, useDemo } from "@/lib/data/store";
import { DEMO_RESEARCHER } from "@/lib/demo/seed";
import { formatWhen, plural } from "@/lib/format";

export default function DashboardPage() {
  return (
    <DemoGate>
      <Dashboard />
    </DemoGate>
  );
}

function Dashboard() {
  const router = useRouter();
  const surveys = useDemo((s) => s.surveys);
  const responses = useDemo((s) => s.responses);
  const createSurvey = useDemo((s) => s.createSurvey);
  const list = Object.values(surveys).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const order = { live: 0, draft: 1, paused: 2, closed: 3 } as const;
  list.sort((a, b) => order[a.status] - order[b.status]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted">{DEMO_RESEARCHER}</p>
          <h1 className="display mt-2 text-[clamp(2.25rem,5vw,3.5rem)]">Your surveys</h1>
        </div>
        <Button variant="primary" size="lg" onClick={() => router.push(`/surveys/${createSurvey()}/edit`)}>
          <Plus />
          New survey
        </Button>
      </div>

      {list.length === 0 ? (
        <div className="mt-10">
          <EmptyState icon={<ClipboardList />} title="No surveys yet">
            Build a survey, lock its budget, and start collecting screened responses.
          </EmptyState>
        </div>
      ) : (
        <ul className="mt-10 grid gap-4 md:grid-cols-2">
          {list.map((s, i) => {
            const rs = responsesFor(responses, s.id);
            const st = surveyStats(s, rs);
            const needs = st.counts.review + st.pendingAppeals;
            return (
              <li key={s.id} className="rise-in" style={{ animationDelay: `${i * 50}ms` }}>
                <Link
                  href={s.status === "draft" ? `/surveys/${s.id}/edit` : `/surveys/${s.id}`}
                  className="group pressable flex h-full flex-col rounded-3xl border border-border bg-surface p-6 transition-[border-color,transform] duration-150 [@media(hover:hover)_and_(pointer:fine)]:hover:border-border-strong"
                >
                  <div className="flex items-center justify-between gap-3">
                    <StatusPill status={s.status} />
                    {needs > 0 ? (
                      <span className="rounded-full bg-review-soft px-2.5 py-1 text-[13px] font-medium text-review">
                        {plural(needs, "case")} to review
                      </span>
                    ) : (
                      <ArrowUpRight className="size-5 text-subtle transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    )}
                  </div>
                  <h2 className="heading mt-4 text-xl">{s.title}</h2>
                  <p className="mt-1 line-clamp-2 text-[15px] text-muted">{s.description || "No description yet."}</p>
                  <div className="mt-auto pt-6">
                    {s.status === "draft" ? (
                      <p className="text-sm text-muted">
                        {plural(s.questions.length, "question")} · not funded yet · <Money centavos={s.rateCentavos} /> × {s.quota}
                      </p>
                    ) : (
                      <>
                        <div className="flex items-baseline justify-between text-sm">
                          <span>
                            <span className="nums font-semibold">{st.total}</span>
                            <span className="text-muted"> / {s.quota} responses</span>
                          </span>
                          <span className="text-muted">
                            <Money centavos={st.spentCentavos} className="text-fg" /> paid
                          </span>
                        </div>
                        <ProgressMeter value={st.total} max={s.quota} label="Responses against quota" className="mt-2" />
                        <p className="mt-3 text-sm text-muted">
                          {s.status === "closed" && s.closing
                            ? <>Closed {formatWhen(s.closing.closedAt)} · <Money centavos={s.closing.refundCentavos} /> refunded</>
                            : <>Closes {formatWhen(s.deadline)}</>}
                        </p>
                      </>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
