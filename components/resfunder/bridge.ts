"use client";

// What the dashboard engine (engine.js) may ask the real app to do: session, wallet, API calls.
// The engine renders; everything that talks to the server, MetaMask or the chain goes through here.
// Money is computed in wei (bigint) and handed to the engine as display strings.
import qrcode from "qrcode-generator";
import { getAddress, type Address } from "viem";
import type { SurveyDetails } from "@/lib/api/shapes";
import { ESCROW_ADDRESS } from "@/lib/chain/abi";
import { REJECT_REASONS } from "@/lib/review-reasons";
import type { AuthProof, Hex, SurveyJson } from "@/lib/types";
import { api, ApiClientError } from "@/lib/ui/api-client";
import { authClient, loginWithPassword, signInWithWallet } from "@/lib/ui/auth/client";
import { getProvider } from "@/lib/ui/auth/metamask";
import {
  bnb, chart, draftToSurvey, historyView, logView, openView, results, surveyCode, surveyView, toAnswerDraft, toEngineQuestions, total,
  type Chart, type EngineAnswers, type EngineDraft, type EngineHistory, type EngineLog, type EngineOpen, type EngineLogRow, type EngineQuestion, type EngineSurvey, type QuestionResult, type Range,
} from "@/lib/ui/dashboard";
import { explain } from "@/lib/ui/explain";
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

/** onboard: signed in, but the sign-up questions are not answered yet. */
export type Session = { email: string; wallet: string | null; onboard: boolean };
export type Quote = {
  ok: boolean;
  errors: { total?: string; quota?: string; deadline?: string; survey?: string };
  /** Pay per valid response, derived from the total budget. */
  rate: string;
  /** rate × quota, what respondents can receive in all. */
  budget: string;
  fee: string;
  feeEach: string;
  deposit: string;
  /** Wei left in the wallet by rounding the rate down; "" when none. */
  leftover: string;
  /** The fee is most of the deposit. */
  warning?: string;
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

  /** Researcher reads: the sign-in session first (no prompt); one signature only if the server asks for it. */
  async function readAuthed<T>(action: "list_surveys" | "view_log", surveyId: number, run: (proof?: AuthProof) => Promise<T>): Promise<T> {
    try {
      return await run();
    } catch (e) {
      if (!(e instanceof ApiClientError) || e.code !== "WALLET_NOT_VERIFIED") throw e;
      return run(await signProof(action, surveyId, await wallet()));
    }
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
    /** A QR code (SVG markup) for a link. The markup comes from the library, never from user text. */
    qrSvg(link: string): string {
      const qr = qrcode(0, "M");
      qr.addData(link);
      qr.make();
      return qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
    },
    rejectReasons: Object.entries(REJECT_REASONS) as [string, string][],
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
      let w: string | null = null;
      let onboard = false;
      try {
        const p = await api.profile();
        w = getAddress(p.wallet);
        onboard = p.profile === null;
      } catch (e) {
        // A session without a wallet can't use the app: treat it as signed out.
        if (e instanceof ApiClientError && e.code === "WALLET_NOT_VERIFIED") {
          session = null;
          return null;
        }
      }
      if (!w) {
        const saved = read<{ email: string; wallet: string }>(WALLET_KEY);
        w = saved && saved.email === email ? saved.wallet : null;
      }
      if (!w) {
        try {
          const accounts = (await getProvider()?.request({ method: "eth_accounts" })) as string[] | undefined;
          if (accounts?.[0]) w = getAddress(accounts[0]);
        } catch {
          /* no wallet yet: it is asked for at the first action */
        }
      }
      session = { email, wallet: w, onboard };
      return session;
    },

    /** Register: connect MetaMask only (no signature yet). Returns the address to show. */
    async connect(): Promise<string> {
      return getAddress(await connectWallet());
    },

    /** Register: sign the free wallet message with the email, then add the password to that account. */
    async register(email: string, password: string): Promise<Session> {
      const { wallet: w } = await signInWithWallet(email);
      try {
        await api.setPassword(password);
      } catch (e) {
        // Leave no half-made session; registering again signs into the same account and retries.
        await authClient.signOut().catch(() => undefined);
        throw e;
      }
      const p = await api.profile().catch(() => null);
      session = { email: email.trim().toLowerCase(), wallet: w, onboard: !p?.profile };
      write(WALLET_KEY, { email: session.email, wallet: w });
      surveys = null;
      return session;
    },

    /** Log in with email and password. MetaMask is not opened. */
    async login(email: string, password: string): Promise<Session> {
      const { email: e } = await loginWithPassword(email, password);
      let p: { profile: Record<string, unknown> | null; wallet: string };
      try {
        p = await api.profile();
      } catch (err) {
        await authClient.signOut().catch(() => undefined);
        throw err;
      }
      const w = getAddress(p.wallet);
      session = { email: e, wallet: w, onboard: p.profile === null };
      write(WALLET_KEY, { email: e, wallet: w });
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
      const empty = { rate: "—", budget: "—", fee: "—", deposit: "—", leftover: "" };
      const feeEach = feeWei === null ? "…" : bnb(feeWei);
      const v = validate({ title: draft.title, description: draft.desc, questions: draftToSurvey(draft).questions });
      const problems = [v.errors.title, ...v.errors.general, ...Object.values(v.errors.questions).flat()].filter(Boolean);
      if (feeWei === null) return { ok: false, errors: {}, feeEach, ...empty };
      const plan = planFunding(v.survey, input, feeWei, Date.now());
      // The split shows as soon as budget and quota are valid, even if the deadline isn't yet.
      const s = plan.ok ? plan.plan : plan.split;
      const shown = s
        ? { rate: bnb(s.rate), budget: bnb(s.budget), fee: bnb(s.fee), deposit: bnb(s.deposit), leftover: s.leftover > BigInt(0) ? `${s.leftover} wei` : "", warning: s.warning }
        : empty;
      if (!plan.ok) return { ok: false, errors: { ...plan.errors, survey: problems[0] }, feeEach, ...shown };
      return { ok: v.ok, errors: { survey: problems[0] }, feeEach, ...shown };
    },

    /** createSurvey from the user's wallet, wait for the receipt, register with the server. */
    async fund(draft: EngineDraft, input: FundingInput, onPhase: (p: FundPhase) => void): Promise<Funded> {
      const v = validate({ title: draft.title, description: draft.desc, questions: draftToSurvey(draft).questions });
      if (!v.ok) throw new Error("Fix the survey questions first.");
      const plan = planFunding(v.survey, input, await fee(), Date.now());
      if (!plan.ok) throw new Error(Object.values(plan.errors)[0] ?? "Check the budget, quota and deadline.");
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
      const list = (await readAuthed("list_surveys", 0, (proof) => api.list(proof))).surveys;
      const now = Date.now();
      surveys = list.map((s) => surveyView(s, now));
      return surveys;
    },

    /** Questions, decision log and results of one of the researcher's surveys. */
    async open(id: string): Promise<Workspace> {
      const surveyId = Number(id);
      const pending = read<PendingClose>(PENDING_CLOSE_KEY);
      if (pending && pending.surveyId === surveyId) await registerClose(pending).catch(() => undefined);
      // The screening details ride on the same proof as the log. If they fail, the log still opens.
      const [d, [log, scr]] = await Promise.all([
        detailsOf(surveyId),
        readAuthed("view_log", surveyId, (proof) => Promise.all([api.log(surveyId, proof), api.screening(surveyId, proof).catch(() => null)])),
      ]);
      const now = Date.now();
      const view = logView(log, d.survey, now);
      const byId = new Map((scr?.rows ?? []).map((r) => [r.responseId, r]));
      for (const row of view.rows) row.x = explain(row.res, row.reasons, byId.get(row.key), d.survey.questions, row.a);
      return { survey: withQuestions(surveyView(log.survey, now), d), log: view, results: results(d.survey, view.rows) };
    },

    sum(list: EngineSurvey[], key: "paidOut" | "unused"): string {
      return total(list, key);
    },

    chart(rows: EngineLogRow[], range: Range): Chart {
      return chart(rows, range, Date.now());
    },

    /** The researcher pays or rejects a response in review. The agent wallet records it on chain. */
    async decide(responseId: string, decision: "pay" | "dont_pay", reason?: string): Promise<{ status: string; reasons: string[] }> {
      const r = await api.decide(responseId, decision, reason);
      return { status: r.status, reasons: r.reasons };
    },

    /** Save the sign-up answers on the server (one profile per user). */
    async saveProfile(profile: Record<string, unknown>): Promise<void> {
      await api.saveProfile(profile);
    },

    /** Pause or resume payments. One free signature. */
    async pause(id: string, paused: boolean): Promise<void> {
      const surveyId = Number(id);
      const w = await wallet();
      await api.pause(surveyId, paused, await signProof("pause", surveyId, w));
      surveys = null;
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

    /** Surveys that accept answers now, minus the ones you funded yourself. */
    async openSurveys(): Promise<EngineOpen[]> {
      const mine = sessionWallet();
      const now = Date.now();
      return (await api.open()).surveys.filter((o) => !mine || o.researcher !== mine.toLowerCase()).map((o) => openView(o, now));
    },

    /** Your own answers and what happened to each. Needs the sign-in session only: no signature. */
    async history(): Promise<{ rows: EngineHistory[]; earned: string; paid: number }> {
      return historyView((await api.myResponses()).responses, Date.now());
    },

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
