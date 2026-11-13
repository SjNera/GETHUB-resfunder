"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { SurveySummary } from "@/lib/api/shapes";
import { RequireSession } from "@/components/auth/require-session";
import { Button, ButtonLink } from "@/components/ui/button";
import { api } from "@/lib/ui/api-client";
import { bnbAmount } from "@/lib/ui/format";
import { connectWallet, signProof } from "@/lib/ui/wallet";

export function SurveyList() {
  return (
    <RequireSession reason="Sign in to see your surveys.">
      {() => <List />}
    </RequireSession>
  );
}

function List() {
  const [surveys, setSurveys] = useState<SurveySummary[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    setBusy(true);
    try {
      const w = await connectWallet();
      setSurveys((await api.list(await signProof("list_surveys", 0, w))).surveys);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-10 sm:py-14">
      <div className="flex items-end justify-between gap-3">
        <h1 className="display text-[clamp(1.75rem,4vw,2.5rem)]">My surveys</h1>
        <ButtonLink href="/publish" variant="primary" size="sm">New survey</ButtonLink>
      </div>
      {!surveys ? (
        <div className="mt-10 rounded-2xl border border-border bg-surface p-8 text-center">
          <p className="text-muted">Sign with your wallet to see the surveys you funded. Signing is free.</p>
          <Button variant="primary" className="mt-5" disabled={busy} onClick={load}>{busy && <Loader2 className="animate-spin" />}Connect wallet</Button>
          {error && <p role="alert" className="mt-4 text-sm text-dontpay">{error}</p>}
        </div>
      ) : surveys.length === 0 ? (
        <p className="mt-10 rounded-2xl bg-surface-2 p-6 text-sm text-muted">No surveys yet. Create one to lock a budget and share the link.</p>
      ) : (
        <ul className="mt-8 grid gap-3">
          {surveys.map((s) => (
            <li key={s.surveyId}>
              <Link href={`/surveys/${s.surveyId}/overview`} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-surface p-4 hover:border-fg/30">
                <span className="font-medium">{s.title}</span>
                <span className="text-sm text-muted">{s.status === "closed" ? "Closed" : s.paused ? "Paused" : "Live"} · {s.paidCount}/{s.quota} paid · {bnbAmount(s.rateWei, 6)} tBNB each</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
