"use client";

/**
 * FRONTEND DEMO account store. The real app keeps accounts in Postgres
 * (`users` table in the spec) behind Better Auth; here they live in this
 * browser's localStorage so the flow can be tried with no backend.
 */
import { useSyncExternalStore } from "react";

export type Choice = { value: string; other?: string };

export type StudentProfile = {
  ageRange?: string;
  sex?: Choice;
  college?: Choice;
  program?: string;
  yearLevel?: Choice;
  region?: string;
  city?: string;
  working?: string;
};

export type FacultyProfile = {
  department?: Choice;
  facultyRole?: Choice;
};

export type Wallet = { address: `0x${string}`; verified: boolean; linkedAt: string };

export type Role = "student" | "faculty";

export type Account = {
  email: string;
  schoolDomain: string;
  school: string;
  role?: Role;
  student: StudentProfile;
  faculty: FacultyProfile;
  /** Setup step to resume at; null once setup is finished. */
  setupStep: number | null;
  consentVersion?: string;
  consentedAt?: string;
  wallet?: Wallet;
  /** Stopped at "Under 18". */
  blocked?: boolean;
  createdAt: string;
};

type State = { accounts: Record<string, Account>; session: string | null };

export const CONSENT_VERSION = "privacy-v1";
const KEY = "resfunder-accounts-v1";
const EMPTY: State = { accounts: {}, session: null };

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
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      l();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

/** null during server render and before hydration. */
export function useAuthState(): State | null {
  return useSyncExternalStore(subscribe, read, () => null);
}

export function useAccount(): { ready: boolean; account: Account | null } {
  const s = useAuthState();
  if (!s) return { ready: false, account: null };
  return { ready: true, account: s.session ? (s.accounts[s.session] ?? null) : null };
}

/* ------------------------------------------------------------------ */
/* Actions                                                             */
/* ------------------------------------------------------------------ */

/** After the email code is verified: create the account if new, start a session. */
export function signIn(email: string, schoolDomain: string, school: string): Account {
  const s = read();
  const existing = s.accounts[email];
  const account: Account = existing ?? {
    email,
    schoolDomain,
    school,
    student: {},
    faculty: {},
    setupStep: 0,
    createdAt: new Date().toISOString(),
  };
  write({ accounts: { ...s.accounts, [email]: account }, session: email });
  return account;
}

export function updateAccount(email: string, patch: Partial<Account>) {
  const s = read();
  const current = s.accounts[email];
  if (!current) return;
  write({ ...s, accounts: { ...s.accounts, [email]: { ...current, ...patch } } });
}

export function signOut() {
  write({ ...read(), session: null });
}

export function deleteAccount(email: string) {
  const s = read();
  const accounts = { ...s.accounts };
  delete accounts[email];
  write({ accounts, session: s.session === email ? null : s.session });
}

/** Spec: a wallet can be linked to one account only. */
export function walletOwner(address: string): string | null {
  const a = address.toLowerCase();
  const hit = Object.values(read().accounts).find((acc) => acc.wallet?.address.toLowerCase() === a);
  return hit?.email ?? null;
}

/** Steps per role: student = 4 (about, school, where + consent, wallet); faculty = 2 (role + consent, wallet). */
export const stepCount = (role: Role) => (role === "student" ? 4 : 2);
