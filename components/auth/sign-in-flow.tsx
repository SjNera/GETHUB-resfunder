"use client";

import { ArrowLeft, ClipboardList, GraduationCap } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { type ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/ui/cn";
import { checkSchoolEmail } from "@/lib/ui/auth/options";
import {
  type Account,
  CONSENT_VERSION,
  type FacultyProfile,
  type Role,
  signIn,
  signOut,
  stepCount,
  type StudentProfile,
  updateAccount,
  useAccount,
} from "@/lib/ui/auth/store";
import { FieldError, FieldLabel, Helper, TextInput } from "./fields";
import {
  AboutFields,
  aboutErrors,
  type Consent,
  ConsentFields,
  FacultyFields,
  facultyErrors,
  hasErrors,
  SchoolFields,
  schoolErrors,
  WhereFields,
  whereErrors,
} from "./profile-forms";
import { WalletConnect } from "./wallet-step";

type Stage = "email" | "code" | "role" | "setup" | "done";

function safeNext(raw: string | null) {
  return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/account";
}

/** Where an existing account should land when it opens /sign-in. */
function resumeStage(a: Account): Stage {
  if (!a.role) return "role";
  return a.setupStep === null ? "done" : "setup";
}

export function SignInFlow() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const { ready, account } = useAccount();

  const [stage, setStage] = useState<Stage | null>(null);
  const [dir, setDir] = useState<"in" | "back">("in");
  const go = (s: Stage, d: "in" | "back" = "in") => {
    setDir(d);
    setStage(s);
  };

  // Email
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);

  // Setup drafts
  const [role, setRole] = useState<Role | null>(null);
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [faculty, setFaculty] = useState<FacultyProfile | null>(null);
  const [consent, setConsent] = useState<Consent>({ privacy: false, researchers: false });
  const [showErrors, setShowErrors] = useState(false);

  if (!ready) return <Shell><div className="h-80" /></Shell>;

  // A signed-in visitor resumes where they are; everyone else starts at email.
  const current: Stage = stage ?? (account ? resumeStage(account) : "email");

  /* ---------------- email ---------------- */
  /** No 6-digit code: a valid school email signs in (the server checks the domain). */
  const continueWithEmail = (e?: React.FormEvent) => {
    e?.preventDefault();
    const r = checkSchoolEmail(email);
    if (!r.ok) return setEmailError(r.error);
    const acc = signIn(r.email, r.domain, r.school);
    go(resumeStage(acc));
  };

  if (current === "email") {
    return (
      <Shell dir={dir} k="email">
        <Body
          title="Continue with your school email"
          lead="One account for answering and publishing. New here or coming back, start the same way."
        >
          <form id="email-form" onSubmit={continueWithEmail} noValidate>
            <FieldLabel htmlFor="email">School email</FieldLabel>
            <TextInput
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              autoFocus
              placeholder="name@umak.edu.ph"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailError(null);
              }}
              aria-invalid={!!emailError}
            />
            <FieldError>{emailError}</FieldError>
          </form>
        </Body>
        <Footer>
          <Button type="submit" form="email-form" variant="primary" size="lg" className="w-full">
            Continue
          </Button>
          <p className="mt-3 text-center text-sm text-muted">Your email never goes on the blockchain.</p>
        </Footer>
      </Shell>
    );
  }

  if (!account) {
    // Signed out mid-flow (another tab): start over.
    return (
      <Shell>
        <Body title="You're signed out" lead="Start again with your school email." />
        <Footer>
          <Button variant="primary" size="lg" className="w-full" onClick={() => go("email", "back")}>
            Continue
          </Button>
        </Footer>
      </Shell>
    );
  }

  /* ---------------- blocked (under 18) ---------------- */
  if (account.blocked) {
    return (
      <Shell>
        <Body title="ResFunder is for students 18 and older for now" lead="Your account is kept, but it can't answer or publish surveys yet." />
        <Footer>
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => {
              signOut();
              router.push("/");
            }}
          >
            Sign out
          </Button>
        </Footer>
      </Shell>
    );
  }

  /* ---------------- role ---------------- */
  if (current === "role") {
    const picked = role ?? account.role ?? null;
    return (
      <Shell dir={dir} k="role">
        <TopBar onBack={account.setupStep === 0 && !account.role ? undefined : () => go("setup", "back")} />
        <Body title="Who are you?" lead="This decides what we ask next. You can't switch later without support.">
          <div role="radiogroup" aria-label="Who are you?" className="flex flex-col gap-3">
            <RoleCard checked={picked === "student"} onSelect={() => setRole("student")} icon={<GraduationCap />} title="Student">
              Answer surveys and get paid. Publish your own thesis survey.
            </RoleCard>
            <RoleCard checked={picked === "faculty"} onSelect={() => setRole("faculty")} icon={<ClipboardList />} title="Faculty or adviser">
              Publish surveys and read the decision log of surveys you&apos;re invited to.
            </RoleCard>
          </div>
        </Body>
        <Footer>
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            disabled={!picked}
            onClick={() => {
              if (!picked) return;
              const changed = picked !== account.role;
              updateAccount(account.email, { role: picked, setupStep: changed ? 0 : (account.setupStep ?? 0) });
              setShowErrors(false);
              go("setup");
            }}
          >
            Continue
          </Button>
        </Footer>
      </Shell>
    );
  }

  /* ---------------- setup ---------------- */
  if (current === "setup" && account.role) {
    const total = stepCount(account.role);
    const step = Math.min(account.setupStep ?? 0, total - 1);
    const s = student ?? account.student;
    const f = faculty ?? account.faculty;
    const isWallet = step === total - 1;
    const isConsentStep = (account.role === "student" && step === 2) || (account.role === "faculty" && step === 0);
    const consentOk = consent.privacy && (account.role === "faculty" || consent.researchers);

    const back = () => {
      setShowErrors(false);
      if (step === 0) return go("role", "back");
      setDir("back");
      updateAccount(account.email, { setupStep: step - 1 });
    };

    const advance = () => {
      const errors =
        account.role === "student"
          ? [aboutErrors, schoolErrors, whereErrors][step]?.(s)
          : step === 0
            ? facultyErrors(f)
            : undefined;
      if ((errors && hasErrors(errors)) || (isConsentStep && !consentOk)) {
        setShowErrors(true);
        return;
      }
      setShowErrors(false);
      setDir("in");
      if (account.role === "student" && step === 0 && s.ageRange === "under_18") {
        updateAccount(account.email, { student: s, blocked: true });
        return;
      }
      updateAccount(account.email, {
        ...(account.role === "student" ? { student: s } : { faculty: f }),
        ...(isConsentStep ? { consentVersion: CONSENT_VERSION, consentedAt: new Date().toISOString() } : {}),
        setupStep: step + 1,
      });
    };

    const finish = () => {
      if (!account.wallet) return;
      updateAccount(account.email, { setupStep: null });
      go("done");
    };

    const titles =
      account.role === "student"
        ? [
            ["About you", "Researchers use this to find the right students. Only ranges, never your birthday."],
            ["Your school", "We filled in your school from your email."],
            ["Where you are", "Almost done. Your wallet is next."],
            ["Your wallet", "This is where your tBNB payments arrive. Connect MetaMask on BSC Testnet."],
          ]
        : [
            ["Your role", "Advisers can read the decision log of surveys they're invited to."],
            ["Your wallet", "This wallet funds your surveys. Connect MetaMask on BSC Testnet."],
          ];
    const [title, lead] = titles[step];

    return (
      <Shell dir={dir} k={`setup-${account.role}-${step}`}>
        <TopBar onBack={back} step={step + 1} total={total} />
        <Body title={title} lead={lead}>
          {account.role === "student" && step === 0 ? <AboutFields value={s} onChange={setStudent} showErrors={showErrors} /> : null}
          {account.role === "student" && step === 1 ? (
            <SchoolFields
              value={s}
              onChange={setStudent}
              showErrors={showErrors}
              school={account.school}
              onChangeEmail={() => {
                signOut();
                go("email", "back");
              }}
            />
          ) : null}
          {account.role === "student" && step === 2 ? <WhereFields value={s} onChange={setStudent} showErrors={showErrors} /> : null}
          {account.role === "faculty" && step === 0 ? <FacultyFields value={f} onChange={setFaculty} showErrors={showErrors} /> : null}
          {isConsentStep ? (
            <div className="mt-8">
              <ConsentFields value={consent} onChange={setConsent} student={account.role === "student"} showErrors={showErrors} />
            </div>
          ) : null}
          {isWallet ? (
            <>
              <Helper className="-mt-2 mb-5">You&apos;ll sign a free message to prove the wallet is yours. It costs no gas.</Helper>
              <WalletConnect email={account.email} current={account.wallet} onLinked={(wallet) => updateAccount(account.email, { wallet })} />
            </>
          ) : null}
        </Body>
        <Footer>
          {isWallet ? (
            <Button variant="primary" size="lg" className="w-full" disabled={!account.wallet} onClick={finish}>
              Finish setup
            </Button>
          ) : (
            <Button variant="primary" size="lg" className="w-full" onClick={advance}>
              Continue
            </Button>
          )}
        </Footer>
      </Shell>
    );
  }

  /* ---------------- done ---------------- */
  return (
    <Shell dir={dir} k="done">
      <Body
        icon={<GraduationCap />}
        title="You're all set"
        lead={account.role === "faculty" ? "You can publish or review now." : "Surveys you can answer will show up here soon."}
      >
        <p className="text-sm text-muted">
          Signed in as <b className="text-fg">{account.email}</b>.
        </p>
      </Body>
      <Footer>
        <Button variant="primary" size="lg" className="w-full" onClick={() => router.push(next)}>
          Continue
        </Button>
      </Footer>
    </Shell>
  );
}

/* ---------------- layout pieces ---------------- */

/** Phone: full-width page with a sticky bottom action. Desktop: a centred ~30rem card. */
function Shell({ children, dir = "in", k }: { children: ReactNode; dir?: "in" | "back"; k?: string }) {
  return (
    <div className="auth-flow mx-auto flex min-h-[calc(100dvh-8rem)] w-full max-w-[32rem] flex-col px-4 pt-4 sm:min-h-0 sm:py-12">
      <div key={k} className={cn("flex flex-1 flex-col sm:rounded-[2rem] sm:border sm:border-border sm:bg-surface sm:p-8 sm:shadow-[var(--shadow-float)]", k && (dir === "in" ? "page-in" : "page-back"))}>
        {children}
      </div>
    </div>
  );
}

function TopBar({ onBack, step, total }: { onBack?: () => void; step?: number; total?: number }) {
  return (
    <div className="mb-2">
      <div className="flex h-11 items-center justify-between">
        {onBack ? (
          <Button variant="ghost" size="icon" aria-label="Back" onClick={onBack} className="-ml-2">
            <ArrowLeft className="!size-5" />
          </Button>
        ) : (
          <span className="size-10" />
        )}
        {step && total ? <span className="text-sm font-medium text-muted">Step {step} of {total}</span> : null}
        <span className="size-10" />
      </div>
      {step && total ? (
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={step} aria-label="Setup progress">
          <div className="h-full origin-left rounded-full bg-fg transition-transform duration-250 ease-[var(--ease-out)] motion-reduce:transition-none" style={{ transform: `scaleX(${step / total})` }} />
        </div>
      ) : null}
    </div>
  );
}

function Body({ icon, title, lead, children }: { icon?: ReactNode; title: string; lead?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex-1 pb-6 pt-4">
      {icon ? <div className="mb-5 grid size-14 [@media(max-height:760px)]:hidden place-items-center rounded-2xl bg-brand-soft text-brand-ink [&_svg]:size-6">{icon}</div> : null}
      <h1 className="display text-[clamp(1.9rem,7vw,2.4rem)] [line-height:1.05]">{title}</h1>
      {lead ? <p className="mt-3 text-[16px] leading-relaxed text-muted">{lead}</p> : null}
      {children ? <div className="mt-8">{children}</div> : null}
    </div>
  );
}

function Footer({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 -mx-4 bg-bg/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:static sm:mx-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
      {children}
    </div>
  );
}

function RoleCard({ checked, onSelect, icon, title, children }: { checked: boolean; onSelect: () => void; icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onSelect}
      className={cn(
        "pressable flex items-start gap-4 rounded-3xl border bg-surface p-5 text-left transition-[border-color,box-shadow] duration-150",
        checked ? "border-fg shadow-[0_0_0_1px_var(--fg)]" : "border-border-strong [@media(hover:hover)_and_(pointer:fine)]:hover:border-fg/40",
      )}
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand-ink [&_svg]:size-5">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[17px] font-semibold">{title}</span>
        <span className="mt-1 block text-[15px] leading-snug text-muted">{children}</span>
      </span>
      <span aria-hidden className={cn("mt-1 size-5 shrink-0 rounded-full border-2", checked ? "border-[6px] border-fg" : "border-border-strong")} />
    </button>
  );
}
