"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { type Account, deleteAccount, signOut, updateAccount, useAccount } from "@/lib/ui/auth/store";
import { FieldError } from "./fields";
import {
  AboutFields,
  aboutErrors,
  FacultyFields,
  facultyErrors,
  hasErrors,
  SchoolFields,
  schoolErrors,
  WhereFields,
  whereErrors,
} from "./profile-forms";
import { WalletCard, WalletConnect } from "./wallet-step";

export function AccountView() {
  const { ready, account } = useAccount();
  if (!ready) return <div className="h-[60dvh]" />;
  if (!account) {
    return (
      <Page>
        <h1 className="display text-[clamp(2rem,6vw,3rem)]">You&apos;re signed out</h1>
        <p className="mt-3 text-muted">Sign in with your school email to see your details.</p>
        <ButtonLink href="/sign-in" variant="primary" size="lg" className="mt-8">
          Sign in
        </ButtonLink>
      </Page>
    );
  }
  if (account.setupStep !== null || !account.role) {
    return (
      <Page>
        <h1 className="display text-[clamp(2rem,6vw,3rem)]">Welcome back</h1>
        <p className="mt-3 text-muted">Let&apos;s finish setting up your account.</p>
        <ButtonLink href="/sign-in?next=/account" variant="primary" size="lg" className="mt-8">
          Finish setup
        </ButtonLink>
      </Page>
    );
  }
  return <Details key={account.email} account={account} />;
}

function Details({ account }: { account: Account }) {
  const router = useRouter();
  const [student, setStudent] = useState(account.student);
  const [faculty, setFaculty] = useState(account.faculty);
  const [showErrors, setShowErrors] = useState(false);
  const [saved, setSaved] = useState(false);
  const [changingWallet, setChangingWallet] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const errors =
    account.role === "student"
      ? { ...aboutErrors(student), ...schoolErrors(student), ...whereErrors(student) }
      : facultyErrors(faculty);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (hasErrors(errors)) {
      setShowErrors(true);
      setSaved(false);
      return;
    }
    if (account.role === "student" && student.ageRange === "under_18") {
      updateAccount(account.email, { student, blocked: true });
      router.push("/sign-in");
      return;
    }
    updateAccount(account.email, account.role === "student" ? { student } : { faculty });
    setShowErrors(false);
    setSaved(true);
  };

  return (
    <Page>
      <p className="eyebrow">Account</p>
      <h1 className="display mt-2 text-[clamp(2rem,6vw,3rem)]">Your details</h1>
      <p className="mt-3 text-muted">
        {account.email} · {account.role === "student" ? "Student" : "Faculty or adviser"} · {account.school}
      </p>

      <Section title="Wallet" lead="Payments arrive here and surveys are funded from here. A new wallet only affects future payouts.">
        {account.wallet && !changingWallet ? (
          <div className="flex flex-col gap-3">
            <WalletCard wallet={account.wallet} />
            <Button variant="outline" className="self-start" onClick={() => setChangingWallet(true)}>
              Change wallet
            </Button>
          </div>
        ) : (
          <WalletConnect
            email={account.email}
            current={account.wallet}
            onLinked={(wallet) => {
              updateAccount(account.email, { wallet });
              setChangingWallet(false);
            }}
          />
        )}
      </Section>

      <form onSubmit={save} noValidate>
        {account.role === "student" ? (
          <>
            <Section title="About you">
              <AboutFields value={student} onChange={(s) => (setStudent(s), setSaved(false))} showErrors={showErrors} />
            </Section>
            <Section title="Your school">
              <SchoolFields value={student} onChange={(s) => (setStudent(s), setSaved(false))} showErrors={showErrors} school={account.school} />
            </Section>
            <Section title="Where you are">
              <WhereFields value={student} onChange={(s) => (setStudent(s), setSaved(false))} showErrors={showErrors} />
            </Section>
          </>
        ) : (
          <Section title="Your role">
            <FacultyFields value={faculty} onChange={(f) => (setFaculty(f), setSaved(false))} showErrors={showErrors} />
          </Section>
        )}
        <div className="sticky bottom-0 -mx-4 mt-8 flex items-center gap-4 bg-bg/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:static sm:mx-0 sm:bg-transparent sm:p-0">
          <Button type="submit" variant="primary" size="lg">
            Save
          </Button>
          <p aria-live="polite" className="text-sm text-muted">
            {saved ? "Saved. Past answers keep the details they were sent with." : ""}
          </p>
        </div>
        <FieldError>{showErrors && hasErrors(errors) ? "Fix the fields marked above, then save." : undefined}</FieldError>
      </form>

      <Section title="Session">
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() => {
              signOut();
              router.push("/");
            }}
          >
            Sign out
          </Button>
        </div>
      </Section>

      <Section title="Delete account">
        {!confirmDelete ? (
          <Button variant="ghost" className="text-dontpay" onClick={() => setConfirmDelete(true)}>
            Delete account
          </Button>
        ) : (
          <div className="rounded-3xl border border-dontpay/40 bg-dontpay-soft p-5">
            <p className="text-[15px]">
              Your email and details are deleted. Decision-log rows stay, because they only hold your wallet address, and anything already on the blockchain can&apos;t be removed.
            </p>
            <div className="mt-4 flex gap-2">
              <Button
                variant="danger"
                onClick={() => {
                  deleteAccount(account.email);
                  router.push("/");
                }}
              >
                Delete for good
              </Button>
              <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Section>
    </Page>
  );
}

function Page({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-16">{children}</div>;
}

function Section({ title, lead, children }: { title: string; lead?: string; children: ReactNode }) {
  return (
    <section className="mt-12 border-t border-border pt-8">
      <h2 className="heading text-xl">{title}</h2>
      {lead ? <p className="mt-1 text-[15px] text-muted">{lead}</p> : null}
      <div className="mt-6">{children}</div>
    </section>
  );
}
