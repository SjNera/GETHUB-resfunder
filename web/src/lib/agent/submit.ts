/**
 * THE seam for "the server screens the answer and the agent wallet pays".
 *
 * Today (frontend only) it runs in the browser: the real rule engine
 * (lib/rules) plus the mock LLM, and a simulated payout hash.
 *
 * Later this becomes `POST /api/responses`:
 *   request  { surveyId, answers, wallet, startedAt }   (session cookie = verified email)
 *   response { responseId, decision }                  (decision.payoutTx set when paid)
 * The server checks the allowlist and one-submission-per-email, calls Groq
 * twice, runs lib/rules, and for Pay sends the fixed rate from the agent key.
 */
import { fakeTxHash } from "../demo/ids";
import { MOCK_MODEL_VERSION, mockLabelTwice } from "../demo/mock-llm";
import { screen } from "../rules/decide";
import type { Answers, Decision, ResponseRecord, Survey } from "../types";

export type SubmitInput = {
  survey: Survey;
  answers: Answers;
  startedAt: string;
  /** Earlier responses to the same survey (for the duplicate-text check). */
  earlier: ResponseRecord[];
};

export function screenAndPay({ survey, answers, startedAt, earlier }: SubmitInput, now = new Date()): Decision {
  const otherAnswers: Record<string, string[]> = {};
  const labels: Record<string, ReturnType<typeof mockLabelTwice>> = {};
  for (const q of survey.questions) {
    if (q.type !== "short_answer" && q.type !== "paragraph") continue;
    otherAnswers[q.id] = earlier.map((r) => (typeof r.answers[q.id] === "string" ? (r.answers[q.id] as string) : ""));
    if (!q.allowShort) labels[q.id] = mockLabelTwice(typeof answers[q.id] === "string" ? (answers[q.id] as string) : "");
  }
  const decision = screen(
    { questions: survey.questions, answers, startedAt, submittedAt: now.toISOString(), otherAnswers, labels, modelVersion: MOCK_MODEL_VERSION },
    now.toISOString(),
  );
  return pay(decision);
}

/** Agent-wallet payout for a Pay decision (simulated hash until the backend exists). */
export function pay(d: Decision): Decision {
  return d.outcome === "pay" ? { ...d, payoutTx: fakeTxHash(), simulated: true } : d;
}
