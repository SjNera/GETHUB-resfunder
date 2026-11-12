import type { Metadata } from "next";
import { Suspense } from "react";
import { SignInForm } from "@/components/app/sign-in-form";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <div className="page-in mx-auto grid max-w-6xl gap-4 px-3 py-6 sm:px-6 lg:grid-cols-2 lg:gap-6 lg:py-12">
      <div className="relative isolate hidden min-h-[34rem] overflow-hidden rounded-[2.5rem] p-10 lg:flex lg:flex-col lg:justify-end [background:radial-gradient(120%_90%_at_20%_10%,#ffd29c_0%,#ff8a1c_38%,#c85d00_100%)]">
        <div aria-hidden className="absolute -right-24 -top-24 -z-10 size-80 rounded-full bg-white/25 blur-3xl" />
        <div aria-hidden className="absolute bottom-28 right-12 -z-10 size-36 rounded-full border-[18px] border-[#121212]/80 [transform:rotateX(55deg)_rotate(20deg)]" />
        <p className="display text-5xl text-[#121212]">
          One sign-in.
          <br />
          Answer or publish.
        </p>
        <p className="mt-4 max-w-sm text-[#121212]/75">
          No roles: after signing in you can answer surveys for pesos or fund your own. Only a hash of your school email ever
          goes on-chain.
        </p>
      </div>
      <Suspense>
        <SignInForm />
      </Suspense>
    </div>
  );
}
