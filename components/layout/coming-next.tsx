"use client";

// Placeholder destination after sign-in. Replaced by the real page of `task` (TDD section 13).
import { Construction, Wallet } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { shortAddress } from "@/lib/ui/auth/metamask";
import { useAccount } from "@/lib/ui/auth/store";

export function ComingNext({
  path,
  eyebrow,
  title,
  task,
  lead,
}: {
  /** this page's path, used to come back after sign-in */
  path: string;
  eyebrow: string;
  title: string;
  task: string;
  lead: string;
}) {
  const { ready, account } = useAccount();
  if (!ready) return <div className="h-[60dvh]" />;

  const setUp = !!account && account.setupStep === null && !!account.wallet && !account.blocked;

  if (!setUp) {
    return (
      <article className="mx-auto max-w-2xl px-5 py-16">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="display mt-3 text-[clamp(2rem,5vw,3rem)]">Sign in first</h1>
        <p className="mt-4 text-lg text-muted">
          {account ? "Finish setting up your account, including your wallet, to continue." : "You need an account and a verified wallet to continue."}
        </p>
        <ButtonLink href={`/sign-in?next=${encodeURIComponent(path)}`} variant="primary" size="lg" className="mt-8">
          {account ? "Finish setup" : "Sign in"}
        </ButtonLink>
      </article>
    );
  }

  return (
    <article className="mx-auto max-w-2xl px-5 py-16">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="display mt-3 text-[clamp(2rem,5vw,3rem)]">{title}</h1>
      <p className="mt-4 text-lg text-muted">{lead}</p>

      <div className="mt-8 flex items-center gap-4 rounded-3xl border border-border bg-surface p-5">
        <span className="grid size-11 place-items-center rounded-2xl bg-surface-2 text-muted">
          <Wallet className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate font-medium">{account.email}</p>
          <p className="font-mono text-sm text-muted">{shortAddress(account.wallet!.address)}</p>
        </div>
      </div>

      <div className="mt-4 flex items-start gap-4 rounded-3xl border border-dashed border-border-strong p-5">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-surface-2 text-muted">
          <Construction className="size-5" />
        </span>
        <p className="text-muted">
          <span className="font-medium text-fg">Coming next ({task}).</span> This page is a placeholder until the backend
          routes and contract are wired in.
        </p>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <ButtonLink href="/" variant="outline">Back to home</ButtonLink>
        <ButtonLink href="/account" variant="ghost">Your details</ButtonLink>
      </div>
    </article>
  );
}
