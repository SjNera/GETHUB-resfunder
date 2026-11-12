import { ArrowRight, Check, Clock3, X } from "lucide-react";
import Link from "next/link";
import { ActivityStack } from "@/components/landing/activity-stack";
import { Orbit } from "@/components/landing/orbit";
import { OrbScene } from "@/components/three/scenes";
import { StartButtons } from "@/components/landing/start-buttons";

const facts = ["BNB Smart Chain testnet", "Paid in testnet BNB (tBNB)", "Answers labelled twice by an LLM", "One flat fee per response", "One submission per wallet and email"];

const steps = [
  { n: "01", who: "Researcher", title: "Build survey", body: "Google Forms-style builder, five question types." },
  { n: "02", who: "Researcher", title: "Fund and lock", body: "Rate × quota + a flat fee per response, locked in tBNB." },
  { n: "03", who: "Respondent", title: "Sign in", body: "School email and a verified MetaMask wallet. One submission each." },
  { n: "04", who: "Respondent", title: "Answer", body: "Consent and answers. Paid to your verified wallet." },
  { n: "05", who: "Code", title: "Code checks", body: "Speed, straight-lining, duplicate text." },
  { n: "06", who: "AI", title: "AI label", body: "Labelled twice; flags injection. Can only escalate." },
  { n: "07", who: "Rule engine", title: "Decide", body: "Plain code turns signals into Pay, Review or Don't pay." },
];

export default function Home() {
  return (
    <>
      {/* HERO — Deflexai layout */}
      <section className="relative isolate overflow-hidden px-4 pb-16 pt-14 sm:pb-24 sm:pt-20">
        <Orbit />
        <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
          <div className="rise-in flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-brand" />
              BCC 2026 · AI Agents track
            </span>
            <span className="hidden text-border-strong sm:inline">|</span>
            <span>Built on BNB Smart Chain</span>
          </div>
          <h1 className="display rise-in mt-6 text-[clamp(2.75rem,8vw,5.25rem)] [animation-delay:60ms]">
            Fund research.
            <br />
            Pay honest answers.
          </h1>
          <p className="rise-in mt-6 max-w-[34rem] text-lg text-muted [animation-delay:120ms]">
            Student researchers lock a small survey budget in a smart contract. Students are paid in seconds by an agent wallet, but only
            for answers that pass a transparent screening check.
          </p>
          <StartButtons id="start" className="rise-in mt-8 [animation-delay:180ms]" />
          <p className="rise-in mt-4 text-sm text-muted [animation-delay:200ms]">One account and wallet covers both. First time? A short intro shows you how it works.</p>
        </div>
        <div className="rise-in mx-auto mt-14 max-w-md [animation-delay:260ms]">
          <ActivityStack />
        </div>
      </section>

      {/* FACTS STRIP — instead of fake social proof */}
      <section aria-label="Key facts" className="border-y border-border">
        <ul className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-5 py-6 text-[15px] font-medium text-muted">
          {facts.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      </section>

      {/* HOW IT WORKS — Liquid Brokers dark stage */}
      <section id="how" className="scroll-mt-28 px-3 pt-16 sm:px-4 sm:pt-24">
        <div className="relative isolate mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] bg-stage px-5 py-16 text-stage-fg sm:px-10 sm:py-20">
          <OrbScene className="pointer-events-none absolute left-1/2 top-[58%] -z-10 aspect-square w-[min(44rem,140%)] -translate-x-1/2 -translate-y-1/2" />
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-medium uppercase tracking-[0.08em] text-[#ffb36b]">How it works</p>
            <h2 className="display mt-3 text-[clamp(2rem,5vw,3.5rem)]">The AI labels. Only the rule engine decides who gets paid.</h2>
            <p className="mx-auto mt-4 max-w-xl text-[17px] text-white/70">
              The LLM answers one narrow question: is this a real attempt to answer? It can only send a response to a person. Plain,
              published code makes every payment decision.
            </p>
          </div>
          <ol className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s) => (
              <li
                key={s.n}
                className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-xl [@media(prefers-reduced-transparency:reduce)]:bg-[#1c1c1c] [@media(prefers-reduced-transparency:reduce)]:backdrop-blur-none"
              >
                <div className="flex items-center justify-between text-xs text-white/55">
                  <span className="nums font-mono">{s.n}</span>
                  <span>{s.who}</span>
                </div>
                <h3 className="heading mt-6 text-lg">{s.title}</h3>
                <p className="mt-1 text-sm text-white/65">{s.body}</p>
              </li>
            ))}
            <li className="flex flex-col justify-between rounded-3xl bg-brand p-5 text-brand-fg">
              <span className="text-xs font-medium opacity-70">Outcome</span>
              <div className="mt-6 flex flex-col gap-1.5 text-[15px] font-semibold">
                <span className="flex items-center gap-2"><Check className="size-4" strokeWidth={3} /> Pay, in seconds</span>
                <span className="flex items-center gap-2"><Clock3 className="size-4" strokeWidth={3} /> Review, by the researcher</span>
                <span className="flex items-center gap-2"><X className="size-4" strokeWidth={3} /> Don&apos;t pay, reason shown</span>
              </div>
            </li>
          </ol>
        </div>
      </section>

      {/* AUDIENCES — Finyon big numbers */}
      <section className="mx-auto max-w-6xl px-5 pt-20 sm:pt-28">
        <div className="max-w-2xl">
          <h2 className="display text-[clamp(2rem,5vw,3.5rem)]">Built for thesis budgets, not research labs.</h2>
          <p className="mt-4 text-lg text-muted">
            One flat fee per response, shown in tBNB before you sign. Incumbent panels charge 20–40% and price out a thesis-sized budget.
          </p>
        </div>
        <div className="mt-14 grid gap-10 sm:grid-cols-3 sm:gap-0">
          {[
            { big: "1 deposit", label: "Researchers", body: "Rate × quota plus a flat fee per response, locked once. Unused budget comes back to your wallet at close." },
            { big: "Seconds", label: "Students", body: "Paid the fixed rate in tBNB for an honest answer, with a BscScan receipt. Taglish and short answers are fine." },
            { big: "100%", label: "Advisers", body: "Every decision is logged with its reason, the rubric version and the model version." },
          ].map((a, i) => (
            <div key={a.label} className={i > 0 ? "sm:border-l sm:border-border-strong sm:pl-8" : "sm:pr-8"}>
              <p className="display nums text-6xl sm:text-7xl">{a.big}</p>
              <p className="mt-4 font-semibold">{a.label}</p>
              <p className="mt-1 max-w-xs text-muted">{a.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* BENEFIT OF THE DOUBT */}
      <section className="mx-auto max-w-6xl px-5 pt-20 sm:pt-28">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              tone: "bg-pay-soft text-pay",
              icon: <Check className="size-4" strokeWidth={3} />,
              title: "Pay",
              body: "No hard failure, at most one weak signal, and the AI label is valid — or the question allows short answers.",
            },
            {
              tone: "bg-review-soft text-review",
              icon: <Clock3 className="size-4" strokeWidth={3} />,
              title: "Review",
              body: "Two weak signals, an unclear or non-answer label, disagreeing runs, a failed AI call or an injection flag. The researcher sees the AI reason.",
            },
            {
              tone: "bg-dontpay-soft text-dontpay",
              icon: <X className="size-4" strokeWidth={3} />,
              title: "Don't pay",
              body: "Only a code-confirmed failure: an empty answer, a copy of another response, or keyboard mash. The reason is logged on-chain.",
            },
          ].map((c) => (
            <div key={c.title} className="rounded-3xl border border-border bg-surface p-6">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-medium ${c.tone}`}>
                {c.icon}
                {c.title}
              </span>
              <p className="mt-4 text-[15px] text-muted">{c.body}</p>
            </div>
          ))}
        </div>
        <Link href="/rubric" className="mt-6 inline-flex items-center gap-1.5 font-medium text-brand-ink hover:underline">
          Read the full public rubric <ArrowRight className="size-4" />
        </Link>
      </section>

      {/* FINAL CTA */}
      <section className="mx-auto max-w-6xl px-5 pt-20 sm:pt-28">
        <div className="flex flex-col items-start justify-between gap-6 rounded-[2.5rem] border border-border bg-surface p-8 sm:flex-row sm:items-center sm:p-12">
          <div>
            <h2 className="display text-[clamp(1.75rem,4vw,2.75rem)]">Which one are you today?</h2>
            <p className="mt-2 text-muted">Researchers publish and fund surveys. Students answer them and get paid. One account and wallet does both.</p>
          </div>
          <StartButtons className="sm:justify-end" />
        </div>
      </section>
    </>
  );
}
