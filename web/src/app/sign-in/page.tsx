import type { Metadata } from "next";
import { Suspense } from "react";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:py-16">
      {/* Finyon-style rounded gradient panel */}
      <div className="relative isolate hidden overflow-hidden rounded-[2.5rem] p-10 lg:flex lg:flex-col lg:justify-end [background:radial-gradient(120%_90%_at_20%_10%,#ffd29c_0%,#ff8a1c_38%,#c85d00_100%)]">
        <div aria-hidden className="absolute -right-24 -top-24 -z-10 size-80 rounded-full bg-white/25 blur-3xl" />
        <div aria-hidden className="absolute bottom-24 right-10 -z-10 size-40 rounded-full border-[18px] border-white/30" />
        <p className="display text-5xl text-[#121212]">One student.<br />One payout.</p>
        <p className="mt-4 max-w-sm text-[#121212]/75">
          Your school email proves you&apos;re a student. Only a hash of it is stored on-chain, so one person can be paid
          once per survey.
        </p>
      </div>
      <Suspense>
        <SignInForm />
      </Suspense>
    </div>
  );
}
