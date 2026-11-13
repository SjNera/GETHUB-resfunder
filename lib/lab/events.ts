// TEMPORARY validation lab. Types shared by the server runner and the page. Delete with lib/lab and app/lab.
import type { AiResult, DecisionResult, Signals } from '../types';

export type LabEvent =
  | { type: 'case'; id: string; group: string; note: string; question: string; answer: string; durationMs: number; expected: DecisionResult }
  | { type: 'checks'; id: string; signals: Signals }
  | { type: 'ai'; id: string; skipped: boolean; ai: AiResult | null; model: string | null; ms: number }
  | { type: 'verdict'; id: string; result: DecisionResult; reasons: string[]; expected: DecisionResult; match: boolean }
  | { type: 'done'; ran: number }
  | { type: 'error'; message: string };
