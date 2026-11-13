"use client";

import { Loader2 } from "lucide-react";
import { useSelectedLayoutSegment } from "next/navigation";
import { useCallback, useState } from "react";
import type { Address } from "viem";
import type { LogResponse, SurveyDetails } from "@/lib/api/shapes";
import { SurveyShell } from "@/components/survey/survey-shell";
import { Button } from "@/components/ui/button";
import { ApiClientError, api } from "@/lib/ui/api-client";
import { shortAddress } from "@/lib/ui/auth/metamask";
import { bnbAmount } from "@/lib/ui/format";
import { filterRows, isTabId, STATUS_LABEL, type ResultFilter } from "@/lib/ui/results";
import { connectWallet, sendCloseSurvey, signProof, waitForTx } from "@/lib/ui/wallet";

const errText = (e: unknown) =>
  e instanceof ApiClientError && e.code === "NOT_YOUR_SURVEY" ? "This survey belongs to a different wallet." : e instanceof Error ? e.message : "Something went wrong.";

type Data = { log: LogResponse; details: SurveyDetails };

/** Lives in the [id] layout, so signing in once carries across the tabs. */
export function SurveyWorkspace({ surveyId }: { surveyId: number }) {
  const segment = useSelectedLayoutSegment();
  const tab = segment && isTabId(segment) ? segment : "overview";
  const [wallet, setWallet] = useState<Address | null>(null);
  const [data, setData] = useState<Data | null>(null);
  const [busy, setBusy] = useState<"idle" | "load" | "close">("idle");
  const [error, setError] = useState<string | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);

  const load = useCallback(async (w: Address) => {
    const proof = await signProof("view_log", surveyId, w);
    const [log, details] = await Promise.all([api.log(surveyId, proof), api.survey(surveyId)]);
    setData({ log, details });
  }, [surveyId]);

  const signIn = async () => {
    setError(null);
    setBusy("load");
    try {
      const w = wallet ?? (await connectWallet());
      setWallet(w);
      await load(w);
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy("idle");
    }
  };

  const close = async () => {
    if (!wallet) return;
    setError(null);
    setBusy("close");
    try {
      const hash = await sendCloseSurvey(wallet, surveyId);
      await waitForTx(wallet, hash);
      await api.closed(surveyId, hash);
      setConfirmClose(false);
      await load(wallet);
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy("idle");
    }
  };

  if (!data) {
    return (
      <div className="mx-auto max-w-xl px-5 py-20 text-center">
        <h1 className="display text-3xl">Survey #{surveyId}</h1>
        <p className="mt-3 text-muted">Sign with the wallet that funded this survey to see its results. Signing is free.</p>
        <Button variant="primary" className="mt-6" disabled={busy !== "idle"} onClick={signIn}>
          {busy === "load" && <Loader2 className="animate-spin" />}Connect wallet and view
        </Button>
        {error && <p role="alert" className="mt-4 text-sm text-dontpay">{error}</p>}
      </div>
    );
  }

  const { log, details } = data;
  const s = log.survey;
  return (
    <SurveyShell surveyId={surveyId} title={s.title} status={s.status} paused={s.paused} deadline={s.deadline} sharePath={`/s/${surveyId}`} tab={tab}>
      {error && <p role="alert" className="mb-4 text-sm text-dontpay">{error}</p>}
      {tab === "overview" && <Overview log={log} onClose={() => setConfirmClose(true)} />}
      {tab === "log" && <LogTable log={log} />}
      {tab === "questions" && <Questions details={details} />}

      {confirmClose && (
        <div role="dialog" aria-modal="true" aria-label="Close survey" className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-surface p-6">
            <h2 className="text-lg font-semibold">Close this survey?</h2>
            <p className="mt-2 text-sm text-muted">New responses stop. The unused budget ({bnbAmount(log.summary.remainingWei, 6)} tBNB) returns to your wallet. The fee isn’t refunded.</p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" disabled={busy === "close"} onClick={() => setConfirmClose(false)}>Keep open</Button>
              <Button variant="dark" disabled={busy === "close"} onClick={close}>
                {busy === "close" && <Loader2 className="animate-spin" />}Close and refund
              </Button>
            </div>
          </div>
        </div>
      )}
    </SurveyShell>
  );
}

function Overview({ log, onClose }: { log: LogResponse; onClose: () => void }) {
  const m = log.summary;
  const tiles: [string, string][] = [
    ["Responses", `${m.responses} / ${log.survey.quota}`],
    ["Paid", String(m.paid)], ["Not paid", String(m.blocked)], ["In review", String(m.review)],
    ["Budget", `${bnbAmount(m.budgetWei, 6)} tBNB`], ["Paid out", `${bnbAmount(m.paidWei, 6)} tBNB`], ["Remaining", `${bnbAmount(m.remainingWei, 6)} tBNB`],
  ];
  const closed = log.survey.status === "closed";
  return (
    <div className="grid gap-6">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map(([k, v]) => (
          <div key={k} className="rounded-2xl border border-border bg-surface p-4"><dt className="text-sm text-muted">{k}</dt><dd className="mt-1 text-xl font-semibold">{v}</dd></div>
        ))}
      </dl>
      {closed ? (
        <p className="rounded-2xl bg-surface-2 p-4 text-sm" data-testid="closed-note">
          Closed. {log.survey.refundedWei ? `${bnbAmount(log.survey.refundedWei, 6)} tBNB was refunded to your wallet.` : ""}{" "}
          {log.survey.closeTxHash && <a className="underline" href={`https://testnet.bscscan.com/tx/${log.survey.closeTxHash}`} target="_blank" rel="noreferrer">View transaction</a>}
        </p>
      ) : (
        <div><Button variant="outline" onClick={onClose}>Close survey and refund</Button></div>
      )}
    </div>
  );
}

function LogTable({ log }: { log: LogResponse }) {
  const [f, setF] = useState<ResultFilter>("all");
  const rows = filterRows(log.rows, f);
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Filter responses">
        {(["all", "paid", "blocked", "review", "pending"] as const).map((k) => (
          <Button key={k} size="sm" variant={f === k ? "dark" : "outline"} onClick={() => setF(k)}>{k === "blocked" ? "Not paid" : k[0].toUpperCase() + k.slice(1)}</Button>
        ))}
      </div>
      {rows.length === 0 ? <p className="rounded-2xl bg-surface-2 p-4 text-sm text-muted">No responses here yet.</p> : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-border text-muted"><tr>{["Submitted", "Wallet", "Email", "Status", "Why", "Tx"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.responseId} className="border-b border-border last:border-0 align-top">
                  <td className="px-3 py-2 whitespace-nowrap">{new Date(r.submittedAt).toLocaleString("en-PH")}</td>
                  <td className="px-3 py-2 font-mono text-xs">{shortAddress(r.wallet)}</td>
                  <td className="px-3 py-2 break-all">{r.email}</td>
                  <td className="px-3 py-2">{STATUS_LABEL[r.status]}</td>
                  <td className="px-3 py-2 text-muted">{r.reasons.join(" · ") || "—"}</td>
                  <td className="px-3 py-2">{r.explorerUrl ? <a className="underline" href={r.explorerUrl} target="_blank" rel="noreferrer">View</a> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Questions({ details }: { details: SurveyDetails }) {
  return (
    <ol className="grid gap-3">
      {details.survey.questions.map((q, i) => (
        <li key={q.id} className="rounded-2xl border border-border bg-surface p-4">
          <p className="font-medium">{i + 1}. {q.text}{q.required && <span className="text-dontpay"> *</span>}</p>
          <p className="mt-1 text-sm text-muted">
            {q.type === "multiple_choice" ? `Multiple choice: ${q.options.join(", ")}` : q.type === "scale" ? `Scale ${q.min} to ${q.max}` : "Written answer"}
          </p>
        </li>
      ))}
    </ol>
  );
}
