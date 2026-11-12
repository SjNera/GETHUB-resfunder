"use client";

import { ArrowUpRight, Hammer } from "lucide-react";
import Link from "next/link";
import { AuthGate } from "@/components/app/auth-gate";
import { Peso } from "@/components/common/chain";
import { ProgressMeter } from "@/components/common/progress";
import { CoreLoopGuide } from "@/components/guide/core-loop-guide";
import { StatusPill } from "@/components/publish/shell";
import { responsesFor, surveyStats, useDemo } from "@/lib/data/store";
import { breakdown } from "@/lib/fees";
import { formatWhen, plural } from "@/lib/format";

export default function PublishPage() {
  return (
    <AuthGate>
      <Publish />
    </AuthGate>
  );
}

function Publish() {
  const surveys = useDemo((s) => s.surveys);
  const responses = useDemo((s) => s.responses);
  const list = Object.values(surveys);

  return (
    <div className="page-in mx-auto max-w-6xl px-3 pb-40 pt-6 sm:px-6 sm:pt-10">
      <p className="eyebrow px-2">Publish</p>
      <h1 className="display mt-2 px-2 text-[clamp(2.25rem,6vw,3.5rem)]">Fund a survey</h1>
      <p className="mt-2 max-w-xl px-2 text-muted">Lock the budget in mock pesos (tPHP); the contract only pays answers that pass screening.</p>

      <CoreLoopGuide className="mt-6" />

      <ul className="mt-6 grid gap-3 md:grid-cols-2">
        {list.map((s) => {
          const rs = responsesFor(responses, s.id);
          const st = surveyStats(s, rs);
          const b = breakdown(BigInt(s.rateUnits), s.quota);
          const toDecide = st.counts.review + st.pendingAppeals;
          return (
            <li key={s.id}>
              <Link
                href={s.funding ? `/publish/${s.id}` : `/publish/${s.id}/fund`}
                className="group pressable flex h-full flex-col rounded-[2rem] border border-border bg-surface p-6 [@media(hover:hover)_and_(pointer:fine)]:hover:border-border-strong"
              >
                <div className="flex items-center justify-between gap-3">
                  <StatusPill status={s.status} />
                  {toDecide ? (
                    <span className="rounded-full bg-review-soft px-2.5 py-1 text-[13px] font-medium text-review">{plural(toDecide, "case")} to decide</span>
                  ) : (
                    <ArrowUpRight className="size-5 text-subtle" aria-hidden />
                  )}
                </div>
                <h2 className="heading mt-4 text-xl">{s.title}</h2>
                <p className="mt-1 text-[15px] text-muted">
                  <Peso amount={s.rateUnits} /> per valid answer × {s.quota} · {plural(s.questions.length, "question")}
                </p>
                <div className="mt-auto pt-6">
                  {s.status === "draft" ? (
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <p className="text-sm text-muted">Deposit to lock</p>
                        <p className="display mt-1 text-3xl">
                          <Peso amount={b.deposit} />
                        </p>
                      </div>
                      <span className="inline-flex h-11 items-center rounded-full bg-brand px-5 text-[15px] font-medium text-brand-fg">Fund it</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-baseline justify-between text-sm">
                        <span>
                          <span className="nums font-semibold">{st.total}</span>
                          <span className="text-muted"> / {s.quota} responses</span>
                        </span>
                        <span className="text-muted">
                          <Peso amount={st.spent} className="text-fg" /> paid
                        </span>
                      </div>
                      <ProgressMeter value={st.total} max={s.quota} label="Responses against quota" className="mt-2" />
                      <p className="mt-3 text-sm text-muted">
                        {s.closing ? (
                          <>
                            Closed · <Peso amount={s.closing.refundUnits} /> refunded
                          </>
                        ) : (
                          <>Closes {formatWhen(s.deadline)}</>
                        )}
                      </p>
                    </>
                  )}
                </div>
              </Link>
            </li>
          );
        })}
        <li className="flex flex-col justify-center rounded-[2rem] border border-dashed border-border-strong p-6">
          <Hammer className="size-5 text-muted" aria-hidden />
          <h2 className="heading mt-3 text-lg">Build your own survey</h2>
          <p className="mt-1 text-[15px] text-muted">
            The survey builder comes back after the core loop is proven. For now, the sleep-study survey is hardcoded.
          </p>
        </li>
      </ul>
    </div>
  );
}
