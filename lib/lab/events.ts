// TEMPORARY validation lab. Types shared by the server runner and the page. Delete with lib/lab and app/lab.
import type { AiResult, DecisionResult, Signals } from '../types';

/** One Groq call, as the model answered it. parsed is null when the reply was not usable JSON. */
export interface LabRun {
  n: number;
  ms: number;
  raw: string | null;
  parsed: { label?: string; type?: string | null; injection?: boolean; reason?: string } | null;
  error: string | null;
}

export type LabEvent =
  | { type: 'case'; id: string; group: string; note: string; question: string; answer: string; durationMs: number; expected: DecisionResult }
  | { type: 'checks'; id: string; signals: Signals }
  | { type: 'ai'; id: string; skipped: boolean; ai: AiResult | null; model: string | null; ms: number; runs: LabRun[] }
  | { type: 'verdict'; id: string; result: DecisionResult; reasons: string[]; expected: DecisionResult; match: boolean }
  | { type: 'done'; ran: number }
  | { type: 'error'; message: string };
