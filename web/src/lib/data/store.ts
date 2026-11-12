"use client";

/**
 * Demo data layer (frontend only). Everything lives in the viewer's browser
 * (localStorage), so the demo runs on any static host and each viewer gets
 * their own copy.
 *
 * Backend seams:
 * - submitResponse → lib/agent/submit.ts (later POST /api/responses, agent wallet pays)
 * - fundSurvey / closeSurvey → called after lib/web3/escrow.ts sends the tx
 */
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { pay, screenAndPay } from "../agent/submit";
import { isAllowlisted } from "../allowlist";
import { breakdown, refundUnits } from "../fees";
import type { Answers, Decision, Outcome, Question, ResponseRecord, Session, Survey } from "../types";
import { fakeAddress, newId } from "../demo/ids";
import { buildFresh, buildSample, current, respondentHash } from "../demo/seed";

const DAY = 24 * 60 * 60 * 1000;

export type DemoWallet = { address: `0x${string}`; simulated: true } | null;
export type DataMode = "fresh" | "sample";

type State = {
  ready: boolean;
  mode: DataMode;
  surveys: Record<string, Survey>;
  responses: Record<string, ResponseRecord>;
  session: Session | null;
  demoWallet: DemoWallet;
  /** Embedded onboarding */
  guideHidden: boolean;
  logVisited: boolean;
  seenTips: Record<string, true>;
};

type Actions = {
  init: () => void;
  reset: (mode?: DataMode) => void;
  // session
  signIn: (email: string) => { ok: true } | { ok: false; error: string };
  signOut: () => void;
  // publish
  updateSurvey: (id: string, patch: Partial<Pick<Survey, "title" | "description" | "rateUnits" | "quota" | "deadline" | "estimatedMinutes">>) => void;
  setQuestions: (id: string, questions: Question[]) => void;
  fundSurvey: (id: string, funding: Omit<NonNullable<Survey["funding"]>, "depositUnits">) => void;
  closeSurvey: (id: string, tx: `0x${string}`, simulated: boolean) => void;
  resolveReview: (responseId: string, outcome: Exclude<Outcome, "review">, note?: string) => void;
  resolveAppeal: (responseId: string, overturn: boolean, note?: string) => void;
  // answer
  submitResponse: (input: { surveyId: string; answers: Answers; wallet: `0x${string}`; startedAt: string }) => string;
  appeal: (responseId: string, message: string) => void;
  // wallet (demo only)
  connectDemoWallet: () => void;
  disconnectDemoWallet: () => void;
  // onboarding
  setGuideHidden: (hidden: boolean) => void;
  markLogVisited: () => void;
  dismissTip: (id: string) => void;
  // timers
  runTimeouts: () => void;
};

const onboarding = { guideHidden: false, logVisited: false, seenTips: {} as Record<string, true> };

function withDecision(r: ResponseRecord, d: Decision): ResponseRecord {
  return { ...r, decisions: [...r.decisions, d] };
}

export const useDemo = create<State & Actions>()(
  persist(
    (set, get) => ({
      ready: false,
      mode: "fresh",
      surveys: {},
      responses: {},
      session: null,
      demoWallet: null,
      ...onboarding,

      init: () => {
        if (Object.keys(get().surveys).length === 0) set({ ...buildFresh(), mode: "fresh" });
        get().runTimeouts();
        set({ ready: true });
      },

      reset: (mode = get().mode) => {
        const data = mode === "sample" ? buildSample() : buildFresh();
        set({ ...data, mode, demoWallet: null, ...onboarding, logVisited: mode === "sample", ready: true });
      },

      signIn: (email) => {
        const e = email.trim().toLowerCase();
        if (!isAllowlisted(e)) return { ok: false, error: "This email isn't on the allowlist for the demo." };
        set({ session: { email: e, role: "respondent" } });
        return { ok: true };
      },
      signOut: () => set({ session: null }),

      updateSurvey: (id, patch) =>
        set((s) => {
          const survey = s.surveys[id];
          if (!survey || survey.funding) return s; // terms and questions lock at funding
          return { surveys: { ...s.surveys, [id]: { ...survey, ...patch } } };
        }),

      setQuestions: (id, questions) =>
        set((s) => {
          const survey = s.surveys[id];
          if (!survey || survey.funding) return s;
          return { surveys: { ...s.surveys, [id]: { ...survey, questions } } };
        }),

      fundSurvey: (id, funding) =>
        set((s) => {
          const survey = s.surveys[id];
          const depositUnits = breakdown(BigInt(survey.rateUnits), survey.quota).deposit.toString();
          return {
            surveys: {
              ...s.surveys,
              [id]: { ...survey, funding: { ...funding, depositUnits }, status: "live", owner: s.session?.email ?? survey.owner },
            },
          };
        }),

      closeSurvey: (id, tx, simulated) =>
        set((s) => {
          const survey = s.surveys[id];
          const rs = Object.values(s.responses).filter((r) => r.surveyId === id);
          // Open reviews settle first and pay by default (benefit of the doubt).
          const settled: Record<string, ResponseRecord> = {};
          for (const r of rs) {
            if (current(r).outcome === "review") {
              settled[r.id] = withDecision(r, pay({ ...current(r), outcome: "pay", decidedBy: "timeout", decidedAt: new Date().toISOString(), payoutTx: undefined }));
            }
          }
          const paid = rs.filter((r) => current(settled[r.id] ?? r).outcome === "pay").length;
          const refund = refundUnits(BigInt(survey.rateUnits), survey.quota, paid);
          return {
            responses: { ...s.responses, ...settled },
            surveys: {
              ...s.surveys,
              [id]: { ...survey, status: "closed", closing: { refundUnits: refund.toString(), refundTx: tx, closedAt: new Date().toISOString(), simulated } },
            },
          };
        }),

      resolveReview: (responseId, outcome, note) =>
        set((s) => {
          const r = s.responses[responseId];
          if (!r || current(r).outcome !== "review") return s;
          const d = pay({ ...current(r), outcome, decidedBy: "researcher", decidedAt: new Date().toISOString(), note, payoutTx: undefined });
          return { responses: { ...s.responses, [responseId]: withDecision(r, d) } };
        }),

      resolveAppeal: (responseId, overturn, note) =>
        set((s) => {
          const r = s.responses[responseId];
          if (!r?.appeal || r.appeal.status !== "pending") return s;
          const now = new Date().toISOString();
          let next: ResponseRecord = { ...r, appeal: { ...r.appeal, status: overturn ? "overturned" : "upheld", resolvedAt: now } };
          if (overturn) next = withDecision(next, pay({ ...current(r), outcome: "pay", decidedBy: "appeal", decidedAt: now, note, payoutTx: undefined }));
          return { responses: { ...s.responses, [responseId]: next } };
        }),

      submitResponse: ({ surveyId, answers, wallet, startedAt }) => {
        const { surveys, responses, session } = get();
        const survey = surveys[surveyId];
        if (!survey || !session) throw new Error("Not signed in");
        const hash = respondentHash(surveyId, session.email);
        const existing = Object.values(responses).find((r) => r.surveyId === surveyId && r.respondentHash === hash);
        if (existing) return existing.id; // one submission per verified student
        const earlier = Object.values(responses).filter((r) => r.surveyId === surveyId);
        const decision = screenAndPay({ survey, answers, startedAt, earlier });
        const id = newId("r");
        const record: ResponseRecord = {
          id,
          surveyId,
          respondentHash: hash,
          wallet,
          answers,
          startedAt,
          submittedAt: new Date().toISOString(),
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
          return { responses: { ...s.responses, [responseId]: { ...r, appeal: { message, submittedAt: new Date().toISOString(), status: "pending" } } } };
        }),

      connectDemoWallet: () => set({ demoWallet: { address: fakeAddress(), simulated: true } }),
      disconnectDemoWallet: () => set({ demoWallet: null }),

      setGuideHidden: (guideHidden) => set({ guideHidden }),
      markLogVisited: () => (get().logVisited ? undefined : set({ logVisited: true })),
      dismissTip: (id) => set((s) => ({ seenTips: { ...s.seenTips, [id]: true } })),

      runTimeouts: () =>
        set((s) => {
          const now = Date.now();
          let changed = false;
          const responses = { ...s.responses };
          for (const r of Object.values(responses)) {
            if (current(r).outcome === "review" && r.reviewDeadline && new Date(r.reviewDeadline).getTime() <= now) {
              responses[r.id] = withDecision(r, pay({ ...current(r), outcome: "pay", decidedBy: "timeout", decidedAt: r.reviewDeadline, payoutTx: undefined }));
              changed = true;
            }
          }
          return changed ? { responses } : s;
        }),
    }),
    {
      name: "resfunder-demo-v3",
      version: 3,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: ({ ready: _ready, ...rest }) => {
        void _ready;
        const { mode, surveys, responses, session, demoWallet, guideHidden, logVisited, seenTips } = rest;
        return { mode, surveys, responses, session, demoWallet, guideHidden, logVisited, seenTips };
      },
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
  const rate = BigInt(survey.rateUnits);
  const budget = rate * BigInt(survey.quota);
  const spent = rate * BigInt(counts.pay);
  return {
    total: responses.length,
    counts,
    paid: counts.pay,
    spent,
    budget,
    remaining: budget > spent ? budget - spent : BigInt(0),
    pendingAppeals: responses.filter((r) => r.appeal?.status === "pending").length,
  };
}

/** The signed-in student's response to a survey, if any. */
export function myResponse(all: Record<string, ResponseRecord>, surveyId: string, email: string | undefined) {
  if (!email) return undefined;
  const hash = respondentHash(surveyId, email);
  return Object.values(all).find((r) => r.surveyId === surveyId && r.respondentHash === hash);
}

export { current };
