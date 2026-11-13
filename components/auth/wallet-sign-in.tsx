"use client";

import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { inputCls } from "@/components/survey-builder/question-card";
import { Button } from "@/components/ui/button";
import { signInWithWallet, useSession } from "@/lib/ui/auth/client";
import { safeNext } from "@/lib/ui/auth/next";
import { isEmail } from "@/lib/ui/respond";

export function WalletSignIn() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const { data, isPending } = useSession();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (data) router.replace(next);
  }, [data, next, router]);

  const submit = async () => {
    setTouched(true);
    setError(null);
    if (!isEmail(email)) return;
    setBusy(true);
    try {
      await signInWithWallet(email);
      // Full navigation: the cached session atom doesn't know about the new cookie yet.
      window.location.assign(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md px-5 py-16 sm:py-24">
      <h1 className="display text-[clamp(1.75rem,5vw,2.5rem)]">Sign in to ResFunder</h1>
      <p className="mt-3 text-muted">Use your email and connect MetaMask on BSC Testnet. Your wallet signs a free message. No transaction, no gas.</p>
      <form className="mt-8 grid gap-4" onSubmit={(e) => { e.preventDefault(); void submit(); }} noValidate>
        <div>
          <label htmlFor="si-email" className="mb-2 block text-[15px] font-semibold">Email</label>
          <input id="si-email" type="email" autoComplete="email" className={inputCls} value={email} disabled={busy || isPending}
            onChange={(e) => setEmail(e.target.value)} placeholder="you@school.edu" aria-invalid={touched && !isEmail(email)} />
          {touched && !isEmail(email) && <p role="alert" className="mt-2 text-sm text-dontpay">Enter a valid email address.</p>}
        </div>
        <Button variant="primary" size="lg" type="submit" disabled={busy || isPending}>
          {busy && <Loader2 className="animate-spin" />}{busy ? "Waiting for MetaMask…" : "Connect MetaMask and sign in"}
        </Button>
        {error && <p role="alert" className="text-sm text-dontpay">{error}</p>}
        <p className="text-xs text-muted">Your email is a label on your account. It isn’t verified yet. Money actions always need a wallet signature.</p>
      </form>
    </div>
  );
}
