"use client";

// What the dashboard engine (engine.js) may ask the real app to do: session, wallet, API calls.
// The engine renders; everything that talks to the server, MetaMask or the chain goes through here.
// Money is computed in wei (bigint) and handed to the engine as display strings.
import { getAddress, type Address } from "viem";
import type { SurveyDetails } from "@/lib/api/shapes";
import { ESCROW_ADDRESS } from "@/lib/chain/abi";
import type { Hex, SurveyJson } from "@/lib/types";
import { api, ApiClientError } from "@/lib/ui/api-client";
import { authClient, signInWithWallet } from "@/lib/ui/auth/client";
import { getProvider } from "@/lib/ui/auth/metamask";
import {
  bnb, chart, draftToSurvey, logView, results, surveyCode, surveyView, toAnswerDraft, toEngineQuestions, total,
  type Chart, type EngineAnswers, type EngineDraft, type EngineLog, type EngineLogRow, type EngineQuestion, type EngineSurvey, type QuestionResult, type Range,
} from "@/lib/ui/dashboard";
import { addressUrl, shortHash, txUrl } from "@/lib/ui/format";
import { parseSurveyRef } from "@/lib/ui/join";
import { checkForm, isFinal } from "@/lib/ui/respond";
import { validate } from "@/lib/ui/survey-builder";
import { planFunding, type FundingInput } from "@/lib/ui/survey-submit";
import { clearProofs, connectWallet, sendCloseSurvey, sendCreateSurvey, signProof, waitForTx } from "@/lib/ui/wallet";

const WALLET_KEY = "rf-wallet-v1";
const DRAFTS_KEY = "rf-drafts-v1";
const PENDING_FUND_KEY = "rf-pending-fund-v1";
const PENDING_CLOSE_KEY = "rf-pending-close-v1";
const POLL_MS = 2000;
const POLL_LIMIT_MS = 120_000;

type PendingFund = { txHash: Hex; wallet: Address; survey: SurveyJson };
type PendingClose = { surveyId: number; txHash: Hex; wallet: Address };

const read = <T,>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};
const write = (key: string, value: unknown) => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const text = (e: unknown) => (e instanceof Error && e.message ? e.message : "Something went wrong. Try again.");

/** The server reads the chain through its own RPC, which can lag the wallet's by a block or two. */
async function untilVerified<T>(call: () => Promise<T>): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      return await call();
    } catch (e) {
      if (!(e instanceof ApiClientError) || e.code !== "TX_NOT_VERIFIED" || i >= 4) throw e;
      await sleep(2500);
    }
  }
}

export type Session = { email: string; wallet: string | null };
export type Quote = {
  ok: boolean;
  errors: { rate?: string; quota?: string; deadline?: string; survey?: string };
  rate: string;
  budget: string;
  fee: string;
  feeEach: string;
  deposit: string;
};
export type FundPhase = "connecting" | "confirm" | "mining" | "registering";
export type Funded = { survey: EngineSurvey & { q: EngineQuestion[]; desc: string }; tx: string; txUrl: string; link: string; budget: string; fee: string; deposit: string };
export type Workspace = { survey: EngineSurvey & { q: EngineQuestion[]; desc: string }; log: EngineLog; results: QuestionResult[] };
export type AnswerSurvey = {
  id: string;
  real: true;
  code: string;
  title: string;
  desc: string;
  q: EngineQuestion[];
  rate: string;
  quota: number;
  slotsLeft: number;
  closesFull: string;
  open: boolean;
  why: string;
};
export type SubmitResult = { step: "pay" | "review" | "nopay"; reasons: string[]; tx: string; txUrl: string; amount: string; wallet: string };

export function createBridge() {
  let session: Session | null = null;
  let feeWei: bigint | null = null;
  let surveys: EngineSurvey[] | null = null;
  const details = new Map<number, SurveyDetails>();

  const sessionWallet = () => session?.wallet ?? null;

  /** The account MetaMask will sign with. It must be the wallet that signed in. */
  async function wallet(): Promise<Address> {
    const w = await connectWallet();
    const want = sessionWallet();
    if (want && want.toLowerCase() !== w.toLowerCase()) {
      throw new Error(`Switch MetaMask to ${shortHash(want)}, the wallet you signed in with.`);
    }
    if (session && !session.wallet) {
      session.wallet = w;
      write(WALLET_KEY, { email: session.email, wallet: w });
    }
    return w;
  }

  async function fee(): Promise<bigint> {
    if (feeWei === null) feeWei = BigInt((await api.fee()).feePerResponseWei);
    return feeWei;
  }

  async function detailsOf(id: number): Promise<SurveyDetails> {
    const d = await api.survey(id);
    details.set(id, d);
    return d;
  }

  function withQuestions(s: EngineSurvey, d: SurveyDetails) {
    return { ...s, desc: d.survey.description, q: toEngineQuestions(d.survey) };
  }

  async function register(p: PendingFund): Promise<Funded> {
    const r = await untilVerified(() => api.register(p.txHash, p.survey));
    write(PENDING_FUND_KEY, null);
    surveys = null;
    const d = await detailsOf(r.surveyId);
    const rate = BigInt(d.rateWei);
    const each = await fee();
    const now = Date.now();
    const view = surveyView(
      { surveyId: r.surveyId, title: d.survey.title, status: d.status, paused: d.paused, rateWei: d.rateWei, quota: d.quota, deadline: d.deadline, paidCount: d.quota - d.slotsLeft, createdAt: new Date(now).toISOString() },
      now,
    );
    const budget = rate * BigInt(d.quota);
    const feeTotal = each * BigInt(d.quota);
    return {
      survey: withQuestions(view, d),
      tx: shortHash(p.txHash),
      txUrl: txUrl(p.txHash),
      link: `${window.location.origin}${r.sharePath}`,
      budget: bnb(budget),
      fee: bnb(feeTotal),
      deposit: bnb(budget + feeTotal),
    };
  }

  async function registerClose(p: PendingClose) {
    const r = await untilVerified(() => api.closed(p.surveyId, p.txHash));
    write(PENDING_CLOSE_KEY, null);
    surveys = null;
    return { refunded: bnb(r.refundedWei), tx: shortHash(r.closeTxHash), txUrl: txUrl(r.closeTxHash) };
  }

  return {
    text,
    contract: ESCROW_ADDRESS ? shortHash(ESCROW_ADDRESS) : "",
    contractUrl: ESCROW_ADDRESS ? addressUrl(ESCROW_ADDRESS) : "",
    walletUrl: (w: string) => addressUrl(w),

    // ---------- session ----------

    /** The signed-in user, or null. Never opens MetaMask. */
    async session(): Promise<Session | null> {
      const res = await authClient.getSession();
      const email = res.data?.user.email;
      if (!email) {
        session = null;
        return null;
      }
      const saved = read<{ email: string; wallet: string }>(WALLET_KEY);
      let w: string | null = saved && saved.email === email ? saved.wallet : null;
      if (!w) {
        try {
          const accounts = (await getProvider()?.request({ method: "eth_accounts" })) as string[] | undefined;
          if (accounts?.[0]) w = getAddress(accounts[0]);
        } catch {
          /* no wallet yet: it is asked for at the first action */
        }
      }
      session = { email, wallet: w };
      return session;
    },

    /** Connect MetaMask and sign the free sign-in message. One prompt for the account, one for the signature. */
    async signIn(email: string): Promise<Session> {
      const { wallet: w } = await signInWithWallet(email);
      session = { email: email.trim().toLowerCase(), wallet: w };
      write(WALLET_KEY, session);
      surveys = null;
      return session;
    },

    async signOut(): Promise<void> {
      clearProofs();
      session = null;
      surveys = null;
      write(WALLET_KEY, null);
      await authClient.signOut();
    },

    async balance(): Promise<string> {
      const w = sessionWallet();
      const p = getProvider();
      if (!w || !p) return "—";
      const hex = (await p.request({ method: "eth_getBalance", params: [w, "latest"] })) as string;
      return bnb(BigInt(hex));
    },

    // ---------- drafts (kept in this browser until funded) ----------

    drafts(): unknown[] {
      const all = read<Record<string, unknown[]>>(DRAFTS_KEY) ?? {};
      return all[(session?.email ?? "").toLowerCase()] ?? [];
    },
    saveDrafts(list: unknown[]) {
      const all = read<Record<string, unknown[]>>(DRAFTS_KEY) ?? {};
      all[(session?.email ?? "").toLowerCase()] = list;
      write(DRAFTS_KEY, all);
    },

    // ---------- researcher ----------

    async feeEach(): Promise<string> {
      return bnb(await fee());
    },

    /** Deposit preview for the fund step. Needs feeEach() to have resolved once. */
    quote(draft: EngineDraft, input: FundingInput): Quote {
      const empty = { rate: "—", budget: "—", fee: "—", deposit: "—" };
      const feeEach = feeWei === null ? "…" : bnb(feeWei);
      const v = validate({ title: draft.title, description: draft.desc, questions: draftToSurvey(draft).questions });
      const problems = [v.errors.title, ...v.errors.general, ...Object.values(v.errors.questions).flat()].filter(Boolean);
      if (feeWei === null) return { ok: false, errors: {}, feeEach, ...empty };
      const plan = planFunding(v.survey, input, feeWei, Date.now());
      if (!plan.ok) return { ok: false, errors: { ...plan.errors, survey: problems[0] }, feeEach, ...empty };
      const p = plan.plan;
      return { ok: v.ok, errors: { survey: problems[0] }, feeEach, rate: bnb(p.rate), budget: bnb(p.budget), fee: bnb(p.fee), deposit: bnb(p.deposit) };
    },

    /** createSurvey from the user's wallet, wait for the receipt, register with the server. */
    async fund(draft: EngineDraft, input: FundingInput, onPhase: (p: FundPhase) => void): Promise<Funded> {
      const v = validate({ title: draft.title, description: draft.desc, questions: draftToSurvey(draft).questions });
      if (!v.ok) throw new Error("Fix the survey questions first.");
      const plan = planFunding(v.survey, input, await fee(), Date.now());
      if (!plan.ok) throw new Error(Object.values(plan.errors)[0] ?? "Check the rate, quota and deadline.");
      const p = plan.plan;
      onPhase("connecting");
      const account = await wallet();
      onPhase("confirm");
      const txHash = await sendCreateSurvey(account, { surveyHash: p.hash, rate: p.rate, quota: p.quota, deadline: p.deadline, feePerResponse: p.feePerResponse, deposit: p.deposit });
      // Saved before waiting, so a closed tab can still register this survey.
      const pending: PendingFund = { txHash, wallet: account, survey: p.survey };
      write(PENDING_FUND_KEY, pending);
      onPhase("mining");
      await waitForTx(account, txHash);
      onPhase("registering");
      return register(pending);
    },

    /** A funding transaction that was sent but not registered (the tab closed, or the server was unreachable). */
    pendingFund(): { title: string } | null {
      const p = read<PendingFund>(PENDING_FUND_KEY);
      return p ? { title: p.survey.title } : null;
    },
    async retryFund(onPhase: (p: FundPhase) => void): Promise<Funded> {
      const p = read<PendingFund>(PENDING_FUND_KEY);
      if (!p) throw new Error("Nothing to finish.");
      onPhase("mining");
      await waitForTx(p.wallet, p.txHash);
      onPhase("registering");
      return register(p);
    },
    dropPendingFund() {
      write(PENDING_FUND_KEY, null);
    },

    /** The researcher's surveys. One free signature, reused for nine minutes. */
    async surveys(force = false): Promise<EngineSurvey[]> {
      if (surveys && !force) return surveys;
      const w = await wallet();
      const list = (await api.list(await signProof("list_surveys", 0, w))).surveys;
      const now = Date.now();
      surveys = list.map((s) => surveyView(s, now));
      return surveys;
    },

    /** Questions, decision log and results of one of the researcher's surveys. */
    async open(id: string): Promise<Workspace> {
      const surveyId = Number(id);
      const w = await wallet();
      const pending = read<PendingClose>(PENDING_CLOSE_KEY);
      if (pending && pending.surveyId === surveyId) await registerClose(pending).catch(() => undefined);
      const proof = await signProof("view_log", surveyId, w);
      const [d, log] = await Promise.all([detailsOf(surveyId), api.log(surveyId, proof)]);
      const now = Date.now();
      const view = logView(log, d.survey, now);
      return { survey: withQuestions(surveyView(log.survey, now), d), log: view, results: results(d.survey, view.rows) };
    },

    sum(list: EngineSurvey[], key: "paidOut" | "unused"): string {
      return total(list, key);
    },

    chart(rows: EngineLogRow[], range: Range): Chart {
      return chart(rows, range, Date.now());
    },

    /** closeSurvey from the researcher's wallet, then register the close and the refund. */
    async close(id: string, onPhase: (p: "confirm" | "mining" | "registering") => void) {
      const surveyId = Number(id);
      const account = await wallet();
      onPhase("confirm");
      const txHash = await sendCloseSurvey(account, surveyId);
      const pending: PendingClose = { surveyId, txHash, wallet: account };
      write(PENDING_CLOSE_KEY, pending);
      onPhase("mining");
      await waitForTx(account, txHash);
      onPhase("registering");
      return registerClose(pending);
    },

    // ---------- respondent ----------

    /** A share link, "/s/7" or "7" → the survey to answer. */
    async lookup(ref: string): Promise<AnswerSurvey> {
      const path = parseSurveyRef(ref);
      if (!path) throw new Error("That isn't a ResFunder survey link. Links look like " + window.location.host + "/s/12.");
      const surveyId = Number(path.slice(3));
      let d: SurveyDetails;
      try {
        d = await detailsOf(surveyId);
      } catch (e) {
        if (e instanceof ApiClientError && e.code === "SURVEY_NOT_FOUND") throw new Error("That survey doesn't exist. Check the link.");
        throw e;
      }
      const v = surveyView({ surveyId, title: d.survey.title, status: d.status, paused: d.paused, rateWei: d.rateWei, quota: d.quota, deadline: d.deadline, paidCount: d.quota - d.slotsLeft, createdAt: "" }, Date.now());
      const why = d.status === "closed" ? "This survey is closed." : d.paused ? "This survey is paused right now." : d.slotsLeft <= 0 ? "This survey has all the answers it needs." : v.ended ? "This survey has passed its deadline." : "";
      return {
        id: v.id, real: true, code: surveyCode(surveyId), title: d.survey.title, desc: d.survey.description, q: toEngineQuestions(d.survey),
        rate: v.rate, quota: d.quota, slotsLeft: d.slotsLeft, closesFull: v.closesFull, open: !why, why,
      };
    },

    /** Sign the submit proof, send the answers, run screening and wait for the result. */
    async submit(id: string, ans: EngineAnswers, startedAt: number, onPhase: (p: "sign" | "send" | "screen") => void): Promise<SubmitResult> {
      const surveyId = Number(id);
      const d = details.get(surveyId) ?? (await detailsOf(surveyId));
      if (!session) throw new Error("Sign in to answer.");
      const check = checkForm(d.survey, session.email, toAnswerDraft(d.survey, ans));
      if (!check.ok) throw new Error(Object.values(check.problems)[0] ?? "Check your answers.");
      onPhase("sign");
      const w = await wallet();
      const auth = await signProof("submit", surveyId, w);
      onPhase("send");
      const { responseId } = await api.submit({ surveyId, email: session.email, answers: check.answers, startedAt, auth });
      onPhase("screen");
      let r = await api.process(responseId);
      const t0 = Date.now();
      while (!isFinal(r.status) && Date.now() - t0 < POLL_LIMIT_MS) {
        await sleep(POLL_MS);
        r = await api.response(responseId);
      }
      if (!isFinal(r.status)) throw new Error("Your answers were received. The result is taking longer than usual; check back in a minute.");
      return {
        step: r.status === "paid" ? "pay" : r.status === "review" ? "review" : "nopay",
        reasons: r.reasons,
        tx: r.txHash ? shortHash(r.txHash) : "",
        txUrl: r.txHash ? (r.explorerUrl ?? txUrl(r.txHash)) : "",
        amount: bnb(d.rateWei),
        wallet: shortHash(w),
      };
    },
  };
}

export type Bridge = ReturnType<typeof createBridge>;
