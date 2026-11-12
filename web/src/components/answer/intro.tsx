"use client";

import { ArrowRight, Check, Clock3, FileQuestion, ShieldCheck, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthGate } from "@/components/app/auth-gate";
import { ActionBar, BackLink, StepPill } from "@/components/app/nav-bits";
import { Peso } from "@/components/common/chain";
import { EmptyState } from "@/components/common/empty-state";
import { InlineTip } from "@/components/guide/inline-tip";
import { Button, ButtonLink } from "@/components/ui/button";
import { myResponse, responsesFor, surveyStats, useDemo } from "@/lib/data/store";
import { formatDateTime } from "@/lib/format";

export const consentKey = (id: string) => `resfunder-consent-${id}`;

export function SurveyIntro({ id }: { id: string }) {
  return (
    <AuthGate>
      <Intro id={id} />
    </AuthGate>
  );
}

function Intro({ id }: { id: string }) {
  const router = useRouter();
  const survey = useDemo((s) => s.surveys[id]);
  const all = useDemo((s) => s.responses);
  const session = useDemo((s) => s.session);
  const [agreed, setAgreed] = useState(false);

  if (!survey) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <EmptyState icon={<FileQuestion />} title="Survey not found" action={<ButtonLink href="/answer" variant="outline">Back to Answer</ButtonLink>} />
      </div>
    );
  }

  const st = surveyStats(survey, responsesFor(all, id));
  const spots = Math.max(0, survey.quota - st.counts.pay - st.counts.review);
  const mine = myResponse(all, id, session?.email);
  const blocked = mine
    ? { title: "You've already answered", body: "Each verified student can submit once per survey.", href: `/answer/${id}/r/${mine.id}`, cta: "See my result" }
    : survey.status === "draft"
      ? { title: "Not live yet", body: "The researcher hasn't locked the budget. Fund it from the Publish tab first.", href: `/publish/${id}/fund`, cta: "Go to Publish" }
      : survey.status === "closed"
        ? { title: "This survey is closed", body: "Unused budget went back to the researcher.", href: "/answer", cta: "Back to Answer" }
        : spots === 0
          ? { title: "The quota is full", body: "Every paid spot has been taken.", href: "/answer", cta: "Back to Answer" }
          : null;

  const start = () => {
    try {
      sessionStorage.setItem(consentKey(id), "1");
    } catch {}
    router.push(`/answer/${id}/q`);
  };

  return (
    <div className="page-in mx-auto max-w-2xl px-3 pb-36 pt-5 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <BackLink href="/answer" label="Back to Answer" />
        <StepPill step={1} of={3} label="Consent" />
      </div>

      <p className="eyebrow mt-8 px-2">{survey.researcher}</p>
      <h1 className="display mt-3 px-2 text-[clamp(2.25rem,7vw,3.25rem)] [line-height:1.04]">{survey.title}</h1>
      <div className="mt-4 flex gap-3 px-2">
        <span className="mt-[0.7rem] h-px w-5 shrink-0 bg-subtle" aria-hidden />
        <p className="text-[15px] leading-relaxed text-muted">“{survey.description}”</p>
      </div>

      {blocked ? (
        <div className="mt-8 rounded-[2rem] border border-border bg-surface p-6">
          <h2 className="heading text-2xl">{blocked.title}</h2>
          <p className="mt-2 text-muted">{blocked.body}</p>
          <ButtonLink href={blocked.href} variant="dark" size="lg" className="mt-5">
            {blocked.cta}
          </ButtonLink>
        </div>
      ) : (
        <>
          {/* Anna-style gradient card, slightly tilted */}
          <section className="mt-8 rotate-[-1.2deg] rounded-[2rem] p-6 text-[#121212] shadow-[0_24px_40px_-22px_rgba(168,83,0,0.55),inset_0_1px_0_#fff] [background:linear-gradient(155deg,#ffffff_0%,#fff1e2_55%,#ffd9b0_100%)] motion-reduce:rotate-0">
            <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-[#a85300]">How you get paid</p>
            <p className="display mt-2 text-[2.25rem] [line-height:1]">
              <Peso amount={survey.rateUnits} /> per honest answer
            </p>
            <p className="mt-2 text-sm text-[#121212]/65">
              {survey.estimatedMinutes} min · {spots} spots left · closes {formatDateTime(survey.deadline)}
            </p>
            <ul className="mt-5 flex flex-col gap-2 text-[14px]">
              <li className="flex items-start gap-2 rounded-2xl bg-[#dcf1e2] px-3 py-2 text-[#1f7a3d]"><Check className="mt-0.5 size-4 shrink-0" strokeWidth={3} /> Paid in seconds by the agent wallet. Taglish and short answers are fine.</li>
              <li className="flex items-start gap-2 rounded-2xl bg-[#fbefb8] px-3 py-2 text-[#7a5c00]"><Clock3 className="mt-0.5 size-4 shrink-0" /> Unclear? A person decides within 24 h, or you&apos;re paid.</li>
              <li className="flex items-start gap-2 rounded-2xl bg-[#fbe0dd] px-3 py-2 text-[#b42318]"><X className="mt-0.5 size-4 shrink-0" strokeWidth={3} /> Empty, copied or keyboard-mash answers aren&apos;t paid. Appeal once.</li>
            </ul>
          </section>

          <InlineTip id="consent-ai" className="mt-6">
            Your open answers go to a third-party AI (Groq) that only checks for non-answers. It can send you to a person, never reject you on its own.
          </InlineTip>

          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-border-strong bg-surface p-4 has-[:checked]:border-fg/50">
            <input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-[#121212] dark:accent-[#f2f1ee]" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
            <span className="text-[15px]">
              I&apos;ve read how screening and payment work. <span className="inline-flex items-center gap-1 text-muted"><ShieldCheck className="size-3.5" /> Only a hash of {session?.email} goes on-chain.</span>
            </span>
          </label>
          <p className="mt-3 px-2 text-sm">
            <Link href="/rubric" className="font-medium text-brand-ink hover:underline">Read the full rubric</Link>
          </p>

          <ActionBar>
            <span className="on-glass truncate text-sm">One submission per student</span>
            <Button variant="primary" disabled={!agreed} onClick={start}>
              Start
              <ArrowRight />
            </Button>
          </ActionBar>
        </>
      )}
    </div>
  );
}
