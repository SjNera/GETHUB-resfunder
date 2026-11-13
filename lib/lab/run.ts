// TEMPORARY validation lab. Runs the real screening code on seeded cases and reports each step. Server only.
import Groq from 'groq-sdk';
import { screenWith, type ScreenDeps } from '../screening';
import { runChecks } from '../screening/checks';
import { labelAnswer, llmModel, TIMEOUT_MS, type ChatClient } from '../screening/llm';
import type { AiResult } from '../types';
import { LAB_CASES, toInput } from './cases';
import type { LabEvent, LabRun } from './events';

function parseRaw(raw: string | null): LabRun['parsed'] {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Record<string, unknown>;
    if (typeof v !== 'object' || v === null) return null;
    return {
      label: typeof v.label === 'string' ? v.label : undefined,
      type: typeof v.type === 'string' ? v.type : v.type === null ? null : undefined,
      injection: typeof v.injection === 'boolean' ? v.injection : undefined,
      reason: typeof v.reason === 'string' ? v.reason : undefined,
    };
  } catch {
    return null;
  }
}

/** A Groq client that records every call (reply text, time, error). Created lazily so no key is needed to build it. */
export function recordingClient(runs: LabRun[], real?: ChatClient): ChatClient {
  let client: ChatClient | null = real ?? null;
  return {
    chat: {
      completions: {
        create: async (body, options) => {
          client ??= new Groq({ apiKey: process.env.GROQ_API_KEY, timeout: TIMEOUT_MS, maxRetries: 0 }) as unknown as ChatClient;
          const run: LabRun = { n: runs.length + 1, ms: 0, raw: null, parsed: null, error: null };
          runs.push(run);
          const t0 = Date.now();
          try {
            const res = await client.chat.completions.create(body, options);
            run.raw = res.choices[0]?.message?.content ?? null;
            run.parsed = parseRaw(run.raw);
            return res;
          } catch (e) {
            run.error = (e instanceof Error ? e.message : 'Request failed').slice(0, 200);
            throw e;
          } finally {
            run.ms = Date.now() - t0;
          }
        },
      },
    },
  };
}

/** On only when LAB_ENABLED=true is set and this is not a production build. */
export function labEnabled(): boolean {
  return process.env.LAB_ENABLED === 'true' && process.env.NODE_ENV !== 'production';
}

export function pickCases(ids: string[] | null) {
  const want = ids && ids.length > 0 ? new Set(ids) : null;
  return LAB_CASES.filter((c) => !want || want.has(c.id));
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface Options {
  /** Pause after each case that called the AI, to stay inside the Groq quota. */
  pauseMs: number;
  signal?: AbortSignal;
  /** Tests pass fakes here. */
  deps?: Partial<ScreenDeps>;
  /** Tests pass a fake Groq client here to check the recorded runs. */
  client?: ChatClient;
}

/** Runs the cases one at a time and calls emit after each step. */
export async function runLab(ids: string[] | null, emit: (e: LabEvent) => void, opts: Options = { pauseMs: 1500 }): Promise<void> {
  let ran = 0;
  for (const lab of pickCases(ids)) {
    if (opts.signal?.aborted) break;
    const input = toInput(lab);
    const q = input.survey.questions.find((x) => x.id === 'q7');
    emit({
      type: 'case',
      id: lab.id,
      group: lab.group,
      note: lab.note,
      expected: lab.expected,
      question: q?.text ?? '',
      answer: String(lab.answers.q7 ?? ''),
      durationMs: lab.durationMs,
    });

    let aiMs = 0;
    let aiCalled = false;
    const runs: LabRun[] = [];
    const deps: ScreenDeps = {
      runChecks: (i) => {
        const signals = (opts.deps?.runChecks ?? runChecks)(i);
        emit({ type: 'checks', id: lab.id, signals });
        return signals;
      },
      labelAnswer: async (question: string, answer: string): Promise<AiResult> => {
        aiCalled = true;
        const t0 = Date.now();
        const r = await (opts.deps?.labelAnswer ?? ((qq, aa) => labelAnswer(qq, aa, recordingClient(runs, opts.client))))(question, answer);
        aiMs = Date.now() - t0;
        return r;
      },
      llmModel: opts.deps?.llmModel ?? llmModel,
    };

    const out = await screenWith(input, deps);
    emit({ type: 'ai', id: lab.id, skipped: !aiCalled, ai: out.ai, model: out.llmModel, ms: aiMs, runs: runs.slice().sort((a, b) => a.n - b.n) });
    emit({ type: 'verdict', id: lab.id, result: out.result, reasons: out.reasons, expected: lab.expected, match: out.result === lab.expected });
    ran += 1;
    if (aiCalled && opts.pauseMs > 0) await sleep(opts.pauseMs);
  }
  emit({ type: 'done', ran });
}
