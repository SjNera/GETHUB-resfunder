"use client";

/**
 * FRONTEND DEMO store for researcher decisions on Review cases. The real app
 * saves the decision server-side, then sends recordDecision() from the agent
 * wallet (payment pipeline: pending → sent → confirmed). Here the chain step is
 * simulated, after a 5 s undo window — nothing on-chain can be undone.
 */
import { useSyncExternalStore } from "react";

export const UNDO_MS = 5_000;
export const CONFIRM_MS = 1_500;

export type ReviewDecision = {
  result: "pay" | "dont_pay";
  reason?: string;
  decidedAt: number;
  status: "undo_window" | "sent" | "confirmed";
  sentAt?: number;
  txHash?: `0x${string}`;
};

type State = { owner: string | null; decisions: Record<string, ReviewDecision> };

const KEY = "resfunder-review-v1";
const EMPTY: State = { owner: null, decisions: {} };
let cache: State | null = null;
const listeners = new Set<() => void>();

function read(): State {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as State) : EMPTY;
  } catch {
    cache = EMPTY;
  }
  return cache;
}

function write(next: State) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useReview(): State | null {
  return useSyncExternalStore(subscribe, read, () => null);
}

/** Demo: the first finished account to open the survey becomes its researcher. */
export function claimSurvey(email: string) {
  if (!read().owner) write({ ...read(), owner: email });
}

export function decide(id: string, result: ReviewDecision["result"], reason?: string) {
  const s = read();
  write({ ...s, decisions: { ...s.decisions, [id]: { result, reason, decidedAt: Date.now(), status: "undo_window" } } });
}

/** Only while nothing has been sent on-chain. */
export function undo(id: string) {
  const s = read();
  if (s.decisions[id]?.status !== "undo_window") return;
  const decisions = { ...s.decisions };
  delete decisions[id];
  write({ ...s, decisions });
}

function fakeTx(): `0x${string}` {
  const b = crypto.getRandomValues(new Uint8Array(32));
  return `0x${Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("")}`;
}

/** Advance the simulated payment pipeline. Safe to call often. */
export function tick(now = Date.now()) {
  const s = read();
  let changed = false;
  const decisions = { ...s.decisions };
  for (const [id, d] of Object.entries(decisions)) {
    if (d.status === "undo_window" && now - d.decidedAt >= UNDO_MS) {
      decisions[id] = { ...d, status: "sent", sentAt: now, txHash: fakeTx() };
      changed = true;
    } else if (d.status === "sent" && now - (d.sentAt ?? now) >= CONFIRM_MS) {
      decisions[id] = { ...d, status: "confirmed" };
      changed = true;
    }
  }
  if (changed) write({ ...s, decisions });
}

export function resetDemo() {
  write({ ...read(), decisions: {} });
}
