"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { ALLOWLIST } from "@/lib/allowlist";
import { useDemo } from "@/lib/data/store";

export function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/answer";
  const signIn = useDemo((s) => s.signIn);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const go = (value: string) => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
      setError("Enter your school email, like name@umak.edu.ph.");
      return;
    }
    const res = signIn(value);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.push(next);
  };

  return (
    <form
      className="flex flex-col justify-center rounded-[2.5rem] border border-border bg-surface p-7 sm:p-12"
      onSubmit={(e) => {
        e.preventDefault();
        go(email);
      }}
      noValidate
    >
      <p className="eyebrow">Sign in</p>
      <h1 className="display mt-3 text-[clamp(2.25rem,6vw,3.25rem)]">Use your school email</h1>
      <p className="mt-3 max-w-md text-muted">
        One sign-in for both sides: answer surveys or publish your own. Only allowlisted emails can take part.
      </p>
      <Field label="School email" htmlFor="email" error={error ?? undefined} className="mt-8">
        <Input
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="name@umak.edu.ph"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError(null);
          }}
          aria-invalid={error ? true : undefined}
        />
      </Field>
      <Button type="submit" variant="primary" size="lg" className="mt-6 w-full sm:w-auto sm:self-start">
        Continue
      </Button>

      <div className="mt-10">
        <p className="text-sm font-medium">Demo allowlist</p>
        <p className="mt-1 text-sm text-muted">No email is sent in the demo. Tap one to sign in. Real sign-in links come later.</p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {ALLOWLIST.map((e) => (
            <li key={e}>
              <button
                type="button"
                onClick={() => {
                  setEmail(e);
                  go(e);
                }}
                className="pressable inline-flex h-11 items-center rounded-full border border-border-strong bg-surface px-4 text-[14px] hover:border-fg/40"
              >
                {e}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </form>
  );
}
