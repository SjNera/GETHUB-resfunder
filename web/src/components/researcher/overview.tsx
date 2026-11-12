"use client";

import { ArrowRight, Download, Lock, PenLine } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { AddressChip, Money, TxLink } from "@/components/common/chain";
import { Countdown, useNow } from "@/components/common/countdown";
import { DecisionBadge } from "@/components/common/decision-badge";
import { ProgressMeter } from "@/components/common/progress";
import { Stat, StatRow } from "@/components/common/stat";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { downloadCsv, paidResponsesCsv } from "@/lib/csv";
import { current, responsesFor, surveyStats, useDemo } from "@/lib/data/store";
import { fakeTxHash } from "@/lib/demo/ids";
import { breakdown, refundCentavos } from "@/lib/fees";
import { formatDateTime, formatDuration, formatWhen, plural, shortHash } from "@/lib/format";
import { DECIDED_BY_TEXT, SIGNAL_TEXT } from "@/lib/reasons";
import type { Outcome, ResponseRecord, SignalCode, Survey } from "@/lib/types";
import { DEMO_MODE } from "@/lib/web3/contracts";
import { SurveyShell } from "./survey-shell";

export function SurveyOverview({ id }: { id: string }) {
  return <SurveyShell id={id}>{(survey) => <Overview survey={survey} />}</SurveyShell>;
}

function median(xs: number[]) {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function Overview({ survey }: { survey: Survey }) {
  const all = useDemo((s) => s.responses);
  const closeSurvey = useDemo((s) => s.closeSurvey);
  const now = useNow();
  const responses = responsesFor(all, survey.id);
  const stats = surveyStats(survey, responses);

  if (!survey.funding) return <DraftOverview survey={survey} />;

  const openReviews = stats.counts.review;
  const refund = refundCentavos(survey.rateCentavos, survey.quota, stats.counts.pay + stats.counts.review);
  const costPerValid = stats.paid ? Math.round(stats.spentCentavos / stats.paid) : 0;
  const medianMinutes = median(responses.map((r) => (new Date(r.submittedAt).getTime() - new Date(r.startedAt).getTime()) / 60000));

  return (
    <div className="flex flex-col gap-6">
      {/* Finyon big numbers */}
      <Card>
        <CardBody className="sm:p-8">
          <StatRow>
            <Stat value={stats.total} label={<>of {survey.quota} responses</>} />
            <Stat value={stats.spentCentavos / 100} prefix="₱" label={<>paid out of <Money centavos={stats.budgetCentavos} /></>} />
            <Stat value={stats.remainingCentavos / 100} prefix="₱" label="budget remaining" />
            {survey.status === "live" ? (
              <div className="flex min-w-0 flex-col">
                <span className="display nums text-4xl sm:text-5xl">{formatDuration(new Date(survey.deadline).getTime() - now)}</span>
                <span className="mt-2 text-sm text-muted">left · closes {formatDateTime(survey.deadline)}</span>
              </div>
            ) : (
              <div className="flex min-w-0 flex-col">
                <span className="display text-4xl sm:text-5xl">Closed</span>
                <span className="mt-2 text-sm text-muted">{survey.closing ? formatWhen(survey.closing.closedAt) : ""}</span>
              </div>
            )}
          </StatRow>
          <ProgressMeter value={stats.total} max={survey.quota} label="Responses against quota" className="mt-8" />
        </CardBody>
      </Card>

      {openReviews + stats.pendingAppeals > 0 ? (
        <Link
          href={`/surveys/${survey.id}/review`}
          className="pressable flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-review/30 bg-review-soft px-6 py-4 text-review"
        >
          <span className="font-medium">
            {plural(openReviews, "response")} waiting for your decision
            {stats.pendingAppeals ? ` · ${plural(stats.pendingAppeals, "appeal")}` : ""}. Unresolved reviews pay the respondent after 24 h.
          </span>
          <span className="inline-flex items-center gap-1 font-semibold">
            Open review queue <ArrowRight className="size-4" />
          </span>
        </Link>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Outcomes survey={survey} responses={responses} counts={stats.counts} />
        <Card>
          <CardHeader>
            <CardTitle>Results so far</CardTitle>
          </CardHeader>
          <CardBody>
            <dl className="grid grid-cols-2 gap-6">
              <div>
                <dt className="text-sm text-muted">Cost per valid response</dt>
                <dd className="display nums mt-1 text-3xl"><Money centavos={costPerValid} /></dd>
              </div>
              <div>
                <dt className="text-sm text-muted">Median completion time</dt>
                <dd className="display nums mt-1 text-3xl">{medianMinutes.toFixed(1)} min</dd>
              </div>
            </dl>
            <Button
              variant="outline"
              className="mt-6"
              onClick={() => {
                downloadCsv(`${survey.id}-paid-responses.csv`, paidResponsesCsv(survey, responses));
                toast.success(`Exported ${plural(stats.paid, "paid response")}`);
              }}
            >
              <Download />
              Export paid responses (CSV)
            </Button>
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <RecentDecisions surveyId={survey.id} responses={responses} />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="size-4" /> Locked in the contract
            </CardTitle>
          </CardHeader>
          <CardBody>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-[15px]">
              <dt className="text-muted">Rate</dt>
              <dd className="text-right"><Money centavos={survey.rateCentavos} /> per valid response</dd>
              <dt className="text-muted">Quota</dt>
              <dd className="nums text-right">{survey.quota}</dd>
              <dt className="text-muted">Deposit</dt>
              <dd className="text-right">
                <Money centavos={breakdown(survey.rateCentavos, survey.quota).depositCentavos} /> <span className="text-muted">incl. 5% fee</span>
              </dd>
              <dt className="text-muted">Survey hash</dt>
              <dd className="truncate text-right font-mono text-[13px]" title={survey.funding.surveyHash}>{shortHash(survey.funding.surveyHash, 10, 8)}</dd>
              <dt className="text-muted">Funded by</dt>
              <dd className="text-right"><AddressChip address={survey.funding.researcherWallet} /></dd>
              <dt className="text-muted">Funding tx</dt>
              <dd className="text-right"><TxLink hash={survey.funding.createTx} simulated={survey.funding.simulated} /></dd>
              {survey.closing ? (
                <>
                  <dt className="text-muted">Refunded</dt>
                  <dd className="text-right"><Money centavos={survey.closing.refundCentavos} /></dd>
                  <dt className="text-muted">Refund tx</dt>
                  <dd className="text-right"><TxLink hash={survey.closing.refundTx} simulated={survey.closing.simulated} /></dd>
                </>
              ) : null}
            </dl>
            {survey.status === "live" ? (
              <Dialog>
                <DialogTrigger render={<Button variant="outline" className="mt-6 w-full" />}>Close survey and refund</DialogTrigger>
                <DialogContent
                  title="Close the survey now?"
                  description="No new responses will be accepted. This can't be undone."
                >
                  <div className="rounded-2xl bg-surface-2 p-4">
                    <p className="text-sm text-muted">Returned to your wallet</p>
                    <p className="display nums mt-1 text-4xl"><Money centavos={refund} /></p>
                    <p className="mt-2 text-sm text-muted">
                      {plural(openReviews, "open review")} will pay out first, as the respondent gets the benefit of the doubt.
                    </p>
                  </div>
                  <div className="mt-6 flex justify-end gap-2">
                    <DialogClose render={<Button variant="ghost" />}>Keep it open</DialogClose>
                    <DialogClose
                      render={
                        <Button
                          variant="danger"
                          onClick={() => {
                            closeSurvey(survey.id, fakeTxHash(), DEMO_MODE);
                            toast.success("Survey closed", { description: `Unused budget refunded${DEMO_MODE ? " (simulated)" : ""}.` });
                          }}
                        />
                      }
                    >
                      Close and refund
                    </DialogClose>
                  </div>
                </DialogContent>
              </Dialog>
            ) : null}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function Outcomes({ survey, responses, counts }: { survey: Survey; responses: ResponseRecord[]; counts: Record<Outcome, number> }) {
  const total = responses.length || 1;
  const reasons = new Map<SignalCode, number>();
  for (const r of responses) {
    const d = current(r);
    if (d.outcome === "pay") continue;
    for (const code of new Set(d.signals.map((s) => s.code))) reasons.set(code, (reasons.get(code) ?? 0) + 1);
  }
  const top = [...reasons.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const segs: { k: Outcome; cls: string }[] = [
    { k: "pay", cls: "bg-pay" },
    { k: "review", cls: "bg-review" },
    { k: "dont_pay", cls: "bg-dontpay" },
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle>Screening outcomes</CardTitle>
      </CardHeader>
      <CardBody>
        <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full" role="img" aria-label={`${counts.pay} paid, ${counts.review} in review, ${counts.dont_pay} not paid`}>
          {segs.map((s) => (
            <div key={s.k} className={s.cls} style={{ width: `${(counts[s.k] / total) * 100}%` }} />
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-6">
          {segs.map((s) => (
            <div key={s.k}>
              <DecisionBadge outcome={s.k} size="sm" />
              <p className="display nums mt-2 text-3xl">{counts[s.k]}</p>
            </div>
          ))}
        </div>
        {top.length ? (
          <div className="mt-6">
            <h3 className="eyebrow">Why responses weren&apos;t paid straight away</h3>
            <ul className="mt-3 flex flex-col gap-2 text-[15px]">
              {top.map(([code, n]) => (
                <li key={code} className="flex items-center justify-between gap-4 border-b border-border pb-2 last:border-0">
                  <span>{SIGNAL_TEXT[code].label}</span>
                  <span className="nums text-muted">{n}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <p className="mt-4 text-xs text-subtle">Survey launched {formatWhen(survey.funding!.fundedAt)}.</p>
      </CardBody>
    </Card>
  );
}

function RecentDecisions({ surveyId, responses }: { surveyId: string; responses: ResponseRecord[] }) {
  const recent = [...responses]
    .sort((a, b) => current(b).decidedAt.localeCompare(current(a).decidedAt))
    .slice(0, 6);
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Latest decisions</CardTitle>
        <Link href={`/surveys/${surveyId}/log`} className="text-sm font-medium text-brand-ink hover:underline">
          Full decision log
        </Link>
      </CardHeader>
      <CardBody>
        <ul className="flex flex-col">
          {recent.map((r) => {
            const d = current(r);
            return (
              <li key={r.id} className="flex items-center justify-between gap-3 border-b border-border py-3 last:border-0">
                <div className="flex min-w-0 items-center gap-3">
                  <DecisionBadge outcome={d.outcome} size="sm" />
                  <span className="truncate font-mono text-[13px] text-muted">{shortHash(r.respondentHash)}</span>
                </div>
                <span className="shrink-0 text-sm text-muted">
                  {DECIDED_BY_TEXT[d.decidedBy]} · {formatWhen(d.decidedAt)}
                </span>
              </li>
            );
          })}
        </ul>
      </CardBody>
    </Card>
  );
}

function DraftOverview({ survey }: { survey: Survey }) {
  const b = breakdown(survey.rateCentavos, survey.quota);
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardBody className="sm:p-8">
          <p className="eyebrow">Not funded yet</p>
          <h2 className="display mt-3 text-3xl">Finish the questions, then lock the budget.</h2>
          <p className="mt-3 text-muted">
            Students can&apos;t open this survey until it&apos;s funded. Once funded, the survey&apos;s hash is recorded
            on-chain and the questions can&apos;t change.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink href={`/surveys/${survey.id}/fund`} variant="primary" size="lg">
              Fund and launch
            </ButtonLink>
            <ButtonLink href={`/surveys/${survey.id}/edit`} variant="outline" size="lg">
              <PenLine />
              Edit questions
            </ButtonLink>
          </div>
        </CardBody>
      </Card>
      <Card>
        <CardBody className="sm:p-8">
          <StatRow className="sm:[&>*]:pr-4">
            <Stat value={survey.questions.length} label="questions" />
            <Stat value={b.depositCentavos / 100} prefix="₱" label={<>deposit at <Money centavos={survey.rateCentavos} /> × {survey.quota}</>} />
          </StatRow>
          <p className="mt-6 text-sm text-muted">
            Deadline <Countdown to={survey.deadline} suffix="from now" />
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
