"use client";

/**
 * Demo data layer. Everything lives in the viewer's browser (localStorage),
 * so the demo works on any static host with no server and each viewer gets
 * their own copy.
 *
 * The action names match the planned repo interface (getSurvey,
 * submitResponse, resolveReview, appeal, closeSurvey…). When the backend
 * lands, these actions become fetch / Server Action calls and the pages
 * don't change.
 */
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { refundCentavos } from "../fees";
import { screen } from "../rules/decide";
import type { Answers, Decision, Outcome, Question, ResponseRecord, Session, Survey } from "../types";
import { fakeAddress, fakeTxHash, newId } from "../demo/ids";
import { MOCK_MODEL_VERSION, mockLabelTwice } from "../demo/mock-llm";
import { buildSeed, current, DEMO_RESEARCHER, respondentHash } from "../demo/seed";

const DAY = 24 * 60 * 60 * 1000;

export type DemoWallet = { address: `0x${string}`; simulated: true } | null;

type State = {
  ready: boolean;
  surveys: Record<string, Survey>;
  responses: Record<string, ResponseRecord>;
  session: Session | null;
  demoWallet: DemoWallet;
};

type Actions = {
  init: () => void;
  reset: () => void;
  // researcher
  createSurvey: () => string;
  updateSurvey: (id: string, patch: Partial<Pick<Survey, "title" | "description" | "rateCentavos" | "quota" | "deadline" | "estimatedMinutes">>) => void;
  setQuestions: (id: string, questions: Question[]) => void;
  fundSurvey: (id: string, funding: NonNullable<Survey["funding"]>) => void;
  closeSurvey: (id: string, tx: `0x${string}`, simulated: boolean) => void;
  resolveReview: (responseId: string, outcome: Exclude<Outcome, "review">, note?: string) => void;
  resolveAppeal: (responseId: string, overturn: boolean, note?: string) => void;
  // respondent
  signIn: (email: string) => void;
  signOut: () => void;
  submitResponse: (input: { surveyId: string; answers: Answers; wallet: `0x${string}`; startedAt: string }) => string;
  appeal: (responseId: string, message: string) => void;
  // wallet (demo mode only)
  connectDemoWallet: () => void;
  disconnectDemoWallet: () => void;
  // timers
  runTimeouts: () => void;
};

const empty: State = { ready: false, surveys: {}, responses: {}, session: null, demoWallet: null };

function withDecision(r: ResponseRecord, d: Decision): ResponseRecord {
  return { ...r, decisions: [...r.decisions, d] };
}

function payout(d: Decision): Decision {
  return d.outcome === "pay" ? { ...d, payoutTx: fakeTxHash(), simulated: true } : d;
}

export const useDemo = create<State & Actions>()(
  persist(
    (set, get) => ({
      ...empty,

      init: () => {
        if (Object.keys(get().surveys).length === 0) {
          set({ ...buildSeed() });
        }
        get().runTimeouts();
        set({ ready: true });
      },

      reset: () => {
        set({ ...buildSeed(), session: null, demoWallet: null, ready: true });
      },

      createSurvey: () => {
        const id = newId("s");
        const now = Date.now();
        const survey: Survey = {
          id,
          title: "Untitled survey",
          description: "",
          researcher: DEMO_RESEARCHER,
          institution: "University of Makati",
          questions: [
            { id: newId("q"), type: "paragraph", title: "", required: true, allowShort: false },
          ],
          status: "draft",
          rateCentavos: 1000,
          quota: 100,
          deadline: new Date(now + 14 * DAY).toISOString(),
          estimatedMinutes: 3,
          createdAt: new Date(now).toISOString(),
        };
        set((s) => ({ surveys: { ...s.surveys, [id]: survey } }));
        return id;
      },

      updateSurvey: (id, patch) =>
        set((s) => {
          const survey = s.surveys[id];
          if (!survey || (survey.funding && ("title" in patch || "description" in patch))) return s;
          return { surveys: { ...s.surveys, [id]: { ...survey, ...patch } } };
        }),

      setQuestions: (id, questions) =>
        set((s) => {
          const survey = s.surveys[id];
          if (!survey || survey.funding) return s; // locked once the hash is on-chain
          return { surveys: { ...s.surveys, [id]: { ...survey, questions } } };
        }),

      fundSurvey: (id, funding) =>
        set((s) => ({ surveys: { ...s.surveys, [id]: { ...s.surveys[id], funding, status: "live" } } })),

      closeSurvey: (id, tx, simulated) =>
        set((s) => {
          const survey = s.surveys[id];
          const paid = Object.values(s.responses).filter((r) => r.surveyId === id && current(r).outcome === "pay").length;
          // Open reviews are settled before the contract refunds (they pay by default).
          const openReviews = Object.values(s.responses).filter((r) => r.surveyId === id && current(r).outcome === "review").length;
          const refund = refundCentavos(survey.rateCentavos, survey.quota, paid + openReviews);
          return {
            surveys: {
              ...s.surveys,
              [id]: {
                ...survey,
                status: "closed",
                closing: { refundCentavos: refund, refundTx: tx, closedAt: new Date().toISOString(), simulated },
              },
            },
          };
        }),

      resolveReview: (responseId, outcome, note) =>
        set((s) => {
          const r = s.responses[responseId];
          if (!r || current(r).outcome !== "review") return s;
          const d = payout({ ...current(r), outcome, decidedBy: "researcher", decidedAt: new Date().toISOString(), note, payoutTx: undefined });
          return { responses: { ...s.responses, [responseId]: withDecision(r, d) } };
        }),

      resolveAppeal: (responseId, overturn, note) =>
        set((s) => {
          const r = s.responses[responseId];
          if (!r?.appeal || r.appeal.status !== "pending") return s;
          const now = new Date().toISOString();
          let next: ResponseRecord = {
            ...r,
            appeal: { ...r.appeal, status: overturn ? "overturned" : "upheld", resolvedAt: now },
          };
          if (overturn) {
            next = withDecision(next, payout({ ...current(r), outcome: "pay", decidedBy: "appeal", decidedAt: now, note, payoutTx: undefined }));
          }
          return { responses: { ...s.responses, [responseId]: next } };
        }),

      signIn: (email) => set({ session: { email: email.trim().toLowerCase(), role: "respondent" } }),
      signOut: () => set({ session: null }),

      submitResponse: ({ surveyId, answers, wallet, startedAt }) => {
        const { surveys, responses, session } = get();
        const survey = surveys[surveyId];
        if (!survey || !session) throw new Error("Not signed in");
        const hash = respondentHash(surveyId, session.email);
        const existing = Object.values(responses).find((r) => r.surveyId === surveyId && r.respondentHash === hash);
        if (existing) return existing.id; // one payout per verified student

        const others = Object.values(responses).filter((r) => r.surveyId === surveyId);
        const otherAnswers: Record<string, string[]> = {};
        const labels: Record<string, ReturnType<typeof mockLabelTwice>> = {};
        for (const q of survey.questions) {
          if (q.type !== "short_answer" && q.type !== "paragraph") continue;
          otherAnswers[q.id] = others.map((r) => (typeof r.answers[q.id] === "string" ? (r.answers[q.id] as string) : ""));
          if (!q.allowShort) labels[q.id] = mockLabelTwice(typeof answers[q.id] === "string" ? (answers[q.id] as string) : "");
        }
        const submittedAt = new Date().toISOString();
        const decision = payout(
          screen({ questions: survey.questions, answers, startedAt, submittedAt, otherAnswers, labels, modelVersion: MOCK_MODEL_VERSION }),
        );
        const id = newId("r");
        const record: ResponseRecord = {
          id,
          surveyId,
          respondentHash: hash,
          wallet,
          answers,
          startedAt,
          submittedAt,
          decisions: [decision],
          reviewDeadline: decision.outcome === "review" ? new Date(Date.now() + DAY).toISOString() : undefined,
        };
        set((s) => ({ responses: { ...s.responses, [id]: record } }));
        return id;
      },

      appeal: (responseId, message) =>
        set((s) => {
          const r = s.responses[responseId];
          if (!r || r.appeal || current(r).outcome !== "dont_pay") return s; // one appeal only
          return {
            responses: {
              ...s.responses,
              [responseId]: { ...r, appeal: { message, submittedAt: new Date().toISOString(), status: "pending" } },
            },
          };
        }),

      connectDemoWallet: () => set({ demoWallet: { address: fakeAddress(), simulated: true } }),
      disconnectDemoWallet: () => set({ demoWallet: null }),

      runTimeouts: () =>
        set((s) => {
          const now = Date.now();
          let changed = false;
          const responses = { ...s.responses };
          for (const r of Object.values(responses)) {
            if (current(r).outcome === "review" && r.reviewDeadline && new Date(r.reviewDeadline).getTime() <= now) {
              responses[r.id] = withDecision(
                r,
                payout({ ...current(r), outcome: "pay", decidedBy: "timeout", decidedAt: r.reviewDeadline, payoutTx: undefined }),
              );
              changed = true;
            }
          }
          return changed ? { responses } : s;
        }),
    }),
    {
      name: "resfunder-demo-v1",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: ({ surveys, responses, session, demoWallet }) => ({ surveys, responses, session, demoWallet }),
    },
  ),
);

/* ---------- selectors ---------- */

export function responsesFor(all: Record<string, ResponseRecord>, surveyId: string) {
  return Object.values(all)
    .filter((r) => r.surveyId === surveyId)
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}

export function surveyStats(survey: Survey, responses: ResponseRecord[]) {
  const counts = { pay: 0, review: 0, dont_pay: 0 } as Record<Outcome, number>;
  for (const r of responses) counts[current(r).outcome]++;
  const spentCentavos = counts.pay * survey.rateCentavos;
  const budgetCentavos = survey.rateCentavos * survey.quota;
  const pendingAppeals = responses.filter((r) => r.appeal?.status === "pending").length;
  return {
    total: responses.length,
    counts,
    paid: counts.pay,
    spentCentavos,
    budgetCentavos,
    remainingCentavos: Math.max(0, budgetCentavos - spentCentavos),
    pendingAppeals,
  };
}

export { current };
