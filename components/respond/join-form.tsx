"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RequireSession } from "@/components/auth/require-session";
import { inputCls } from "@/components/survey-builder/question-card";
import { Button } from "@/components/ui/button";
import { parseSurveyRef } from "@/lib/ui/join";

export function JoinForm() {
  return (
    <RequireSession reason="Sign in to answer surveys and get paid.">{() => <Form />}</RequireSession>
  );
}

function Form() {
  const router = useRouter();
  const [v, setV] = useState("");
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="mx-auto w-full max-w-md px-5 py-16">
      <h1 className="display text-3xl">Answer a survey</h1>
      <p className="mt-3 text-muted">Paste the survey link you were sent.</p>
      <form className="mt-6 grid gap-3" onSubmit={(e) => { e.preventDefault(); const p = parseSurveyRef(v); if (p) router.push(p); else setErr("That isn't a ResFunder survey link. Links end in /s/ and a number."); }}>
        <input className={inputCls} value={v} onChange={(e) => { setV(e.target.value); setErr(null); }} placeholder="https://…/s/7" aria-label="Survey link" />
        {err && <p role="alert" className="text-sm text-dontpay">{err}</p>}
        <Button variant="primary" type="submit">Open survey</Button>
      </form>
    </div>
  );
}
