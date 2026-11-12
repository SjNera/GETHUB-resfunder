import type { Metadata } from "next";
import { Check, Clock3, X } from "lucide-react";
import { RUBRIC_VERSION } from "@/lib/rules/decide";

export const metadata: Metadata = { title: "Screening rubric" };

const signals = [
  ["Empty answer or keyboard-mash gibberish", "Code (skipped where short answers are allowed)", "Hard failure"],
  ["Not a real attempt: off-question, evasive or copied", "AI label", "Review"],
  ["Instruction-like text (prompt injection)", "AI flag", "Review"],
  ["Duplicate text across responses", "Code", "Hard failure"],
  ["Same option across a block of five or more scale items", "Code", "Weak signal"],
  ["Under half the survey's median time (after 10 responses; before that, under 2 s per question)", "Code", "Weak signal"],
];

const decisions = [
  { tone: "bg-pay-soft text-pay", icon: Check, label: "Pay", when: "No hard failure, at most one weak signal, and the AI label is valid (or the question allows short answers).", then: "Paid instantly at the fixed rate." },
  { tone: "bg-review-soft text-review", icon: Clock3, label: "Review", when: "Two or more weak signals; an AI label of unclear or non-answer; the two runs disagree or a call fails; or an injection flag.", then: "Nothing goes on-chain. The researcher sees it in the Review queue with the AI reason." },
  { tone: "bg-dontpay-soft text-dontpay", icon: X, label: "Don't pay", when: "A code-confirmed hard failure: an empty answer, a duplicate of another response, or keyboard-mash gibberish.", then: "Not paid. The block and a hash of the reason are recorded on-chain." },
];

export default function RubricPage() {
  return (
    <article className="mx-auto max-w-4xl px-5 py-12 sm:py-16">
      <p className="eyebrow">Public rubric · {RUBRIC_VERSION}</p>
      <h1 className="display mt-3 text-[clamp(2.25rem,6vw,4rem)]">How responses are screened</h1>
      <p className="mt-5 max-w-[65ch] text-lg text-muted">
        For each open-ended answer, the AI answers one question: is this a real attempt to answer this question? It does not rate quality, style or
        grammar. Brevity, informal writing and code-switching such as Taglish are not problems. Questions a researcher marks
        as allowing short or “none” answers skip this check.
      </p>

      <section className="mt-14">
        <h2 className="heading text-2xl">Who decides</h2>
        <p className="mt-3 max-w-[65ch] text-muted">
          The AI labels; only the rule engine decides. Each answer is labelled twice. If the runs disagree, the response goes
          to a person. Your answer is treated as data and is never followed as an instruction. If the AI fails or times out,
          the response defaults to Review.
        </p>
        <pre className="mt-5 overflow-x-auto rounded-3xl bg-stage p-5 font-mono text-[13px] leading-relaxed text-stage-fg">
{`{
  "label": "valid | unclear | non_answer",
  "type": "off_question | evasive | copied | other | null",
  "injection": false,
  "reason": "one short sentence"
}`}
        </pre>
      </section>

      <section className="mt-14">
        <h2 className="heading text-2xl">Signals</h2>
        <div className="mt-5 overflow-hidden rounded-3xl border border-border bg-surface">
          <table className="w-full text-left text-[15px]">
            <thead className="border-b border-border text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Signal</th>
                <th className="hidden px-5 py-3 font-medium sm:table-cell">Checked by</th>
                <th className="px-5 py-3 font-medium">Effect on its own</th>
              </tr>
            </thead>
            <tbody>
              {signals.map(([s, by, effect]) => (
                <tr key={s} className="border-b border-border last:border-0">
                  <td className="px-5 py-4">{s}</td>
                  <td className="hidden px-5 py-4 text-muted sm:table-cell">{by}</td>
                  <td className="px-5 py-4">{effect}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 max-w-[65ch] text-muted">
          Weak signals only escalate, and the benefit of the doubt goes to the respondent: speed and straight-line checks
          miss most bad responses, and some attention checks cause false positives.
        </p>
      </section>

      <section className="mt-14">
        <h2 className="heading text-2xl">Decisions</h2>
        <div className="mt-5 grid gap-4">
          {decisions.map((d) => (
            <div key={d.label} className="grid gap-3 rounded-3xl border border-border bg-surface p-5 sm:grid-cols-[9rem_1fr_1fr] sm:items-start sm:p-6">
              <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-medium ${d.tone}`}>
                <d.icon className="size-3.5" strokeWidth={3} />
                {d.label}
              </span>
              <p className="text-[15px]"><span className="text-muted">When: </span>{d.when}</p>
              <p className="text-[15px]"><span className="text-muted">Then: </span>{d.then}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-14">
        <h2 className="heading text-2xl">Limits on the agent&apos;s power</h2>
        <ul className="mt-4 flex max-w-[65ch] list-disc flex-col gap-2 pl-5 text-muted marker:text-subtle">
          <li>It can pay only the fixed rate, only to verified respondents of that survey, once each, within quota and budget.</li>
          <li>It can never send budget anywhere except to respondents or, at closing, back to the researcher.</li>
          <li>It cannot change the rate, quota, deadline or survey; the survey&apos;s hash is recorded on-chain at funding.</li>
          <li>Every decision is recorded with its reason and the rubric and model versions, so an adviser can audit it. A pause switch stops all payments.</li>
          <li>Known limit: the check detects non-answers, not dishonesty. A fluent AI-written answer can pass.</li>
        </ul>
      </section>
    </article>
  );
}
