"use client";

import { ArrowRight, Clock, Inbox } from "lucide-react";
import Link from "next/link";
import { AuthGate } from "@/components/app/auth-gate";
import { Peso } from "@/components/common/chain";
import { DecisionBadge } from "@/components/common/decision-badge";
import { EmptyState } from "@/components/common/empty-state";
import { CoreLoopGuide } from "@/components/guide/core-loop-guide";
import { ButtonLink } from "@/components/ui/button";
import { current, myResponse, responsesFor, surveyStats, useDemo } from "@/lib/data/store";
import { formatWhen } from "@/lib/format";

export default function AnswerPage() {
  return (
    <AuthGate>
      <Answer />
    </AuthGate>
  );
}

function Answer() {
  const surveys = useDemo((s) => s.surveys);
  const responses = useDemo((s) => s.responses);
  const session = useDemo((s) => s.session);
  const list = Object.values(surveys).filter((s) => s.status !== "draft");

  return (
    <div className="page-in mx-auto max-w-6xl px-3 pb-40 pt-6 sm:px-6 sm:pt-10">
      <p className="eyebrow px-2">Answer</p>
      <h1 className="display mt-2 px-2 text-[clamp(2.25rem,6vw,3.5rem)]">Earn pesos for honest answers</h1>
      <p className="mt-2 max-w-xl px-2 text-muted">Paid in seconds by the agent wallet. Short answers and Taglish are fine.</p>

      <CoreLoopGuide className="mt-6" />

      {list.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={<Inbox />}
            title="No surveys are live yet"
            action={
              <ButtonLink href="/publish" variant="dark">
                Fund one in Publish
              </ButtonLink>
            }
          >
            A survey appears here once a researcher locks its budget.
          </EmptyState>
        </div>
      ) : (
        <ul className="mt-6 grid gap-3 md:grid-cols-2">
          {list.map((s) => {
            const st = surveyStats(s, responsesFor(responses, s.id));
            const spots = Math.max(0, s.quota - st.counts.pay - st.counts.review);
            const mine = myResponse(responses, s.id, session?.email);
            const href = mine ? `/answer/${s.id}/r/${mine.id}` : `/answer/${s.id}`;
            return (
              <li key={s.id}>
                <Link
                  href={href}
                  className="pressable group relative flex h-full flex-col overflow-hidden rounded-[2rem] p-6 text-[#121212] shadow-[0_24px_40px_-26px_rgba(168,83,0,0.55)] [background:linear-gradient(155deg,#ffffff_0%,#fff1e2_55%,#ffd9b0_100%)]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[12px] font-bold uppercase tracking-[0.1em] text-[#a85300]">{s.researcher}</span>
                    {mine ? <DecisionBadge outcome={current(mine).outcome} size="sm" /> : null}
                  </div>
                  <h2 className="display mt-3 text-[1.75rem] [line-height:1.05]">{s.title}</h2>
                  <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <p className="display text-4xl">
                        <Peso amount={s.rateUnits} />
                      </p>
                      <p className="mt-1 flex items-center gap-3 text-sm text-[#121212]/65">
                        <span className="inline-flex items-center gap-1"><Clock className="size-3.5" /> {s.estimatedMinutes} min</span>
                        <span>{s.status === "closed" ? "Closed" : `${spots} spots · closes ${formatWhen(s.deadline)}`}</span>
                      </p>
                    </div>
                    <span className="inline-flex h-11 items-center gap-1.5 rounded-full bg-[#121212] px-5 text-[15px] font-medium text-[#f2f1ee]">
                      {mine ? "My result" : s.status === "closed" ? "View" : "Start"}
                      <ArrowRight className="size-4" />
                    </span>
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
