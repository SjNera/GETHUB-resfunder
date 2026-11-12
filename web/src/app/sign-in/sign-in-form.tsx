"use client";

import { ArrowLeft, MailCheck } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { useDemo } from "@/lib/data/store";

/** Demo allowlist, stated openly: any .edu.ph or .edu address. */
export function isSchoolEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.(edu\.ph|edu)$/i.test(email.trim());
}

export function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";
  const signIn = useDemo((s) => s.signIn);
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [sent, setSent] = useState(false);

  const valid = isSchoolEmail(email);
  const error = touched && email && !valid ? "Use your school email — it should end in .edu.ph or .edu." : undefined;

  if (sent) {
    return (
      <div className="flex flex-col justify-center rounded-[2.5rem] border border-border bg-surface p-8 sm:p-12">
        <div className="grid size-12 place-items-center rounded-2xl bg-brand-soft text-brand-ink">
          <MailCheck className="size-6" />
        </div>
        <h1 className="display mt-6 text-4xl">Check your inbox</h1>
        <p className="mt-3 text-muted">
          We sent a sign-in link to <span className="font-medium text-fg">{email}</span>. It expires in 15 minutes.
        </p>
        <div className="mt-6 rounded-2xl border border-dashed border-border-strong p-4 text-sm text-muted">
          <span className="font-medium text-fg">Demo:</span> no email is actually sent. Use the button below to open the
          link.
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            variant="primary"
            size="lg"
            onClick={() => {
              signIn(email);
              router.push(next);
            }}
          >
            Open the magic link
          </Button>
          <Button variant="ghost" size="lg" onClick={() => setSent(false)}>
            <ArrowLeft />
            Use a different email
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col justify-center rounded-[2.5rem] border border-border bg-surface p-8 sm:p-12"
      onSubmit={(e) => {
        e.preventDefault();
        setTouched(true);
        if (valid) setSent(true);
      }}
      noValidate
    >
      <p className="eyebrow">Sign in</p>
      <h1 className="display mt-3 text-4xl sm:text-5xl">Verify your school email</h1>
      <p className="mt-3 max-w-md text-muted">
        We&apos;ll email you a one-time sign-in link. No password, and your email never goes on-chain.
      </p>
      <Field label="School email" htmlFor="email" error={error} hint="Demo: any address ending in .edu.ph or .edu works." className="mt-8">
        <Input
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="juan.delacruz@umak.edu.ph"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setTouched(true)}
          aria-invalid={error ? true : undefined}
          autoFocus
        />
      </Field>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button type="submit" variant="primary" size="lg">
          Email me a sign-in link
        </Button>
        <Link href={next} className="text-sm text-muted hover:text-fg">
          Cancel
        </Link>
      </div>
      <button
        type="button"
        className="mt-8 self-start text-sm text-muted underline-offset-4 hover:text-fg hover:underline"
        onClick={() => setEmail(`student${Math.floor(Math.random() * 9000) + 1000}@umak.edu.ph`)}
      >
        Fill a sample student email
      </button>
    </form>
  );
}
