"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ButtonLink } from "@/components/ui/button";
import { useSession } from "@/lib/ui/auth/client";
import { signInUrl } from "@/lib/ui/auth/next";

/** Shows children only for a signed-in user; otherwise a sign-in prompt that returns here. */
export function RequireSession({ children, reason }: { children: (user: { email: string }) => ReactNode; reason?: string }) {
  const { data, isPending } = useSession();
  const path = usePathname();
  if (isPending) return <p className="px-5 py-20 text-center text-muted">Checking your session…</p>;
  if (!data) {
    return (
      <div className="mx-auto max-w-xl px-5 py-20 text-center">
        <h1 className="display text-3xl">Sign in to continue</h1>
        <p className="mt-3 text-muted">{reason ?? "Sign in with your email and wallet."}</p>
        <ButtonLink href={signInUrl(path || "/")} variant="primary" className="mt-6">Sign in</ButtonLink>
      </div>
    );
  }
  return <>{children({ email: data.user.email })}</>;
}
