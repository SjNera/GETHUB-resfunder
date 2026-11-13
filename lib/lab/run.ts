// TEMPORARY validation lab. Runs the real screening code on seeded cases and reports each step. Server only.
import { screenWith, type ScreenDeps } from '../screening';
import { runChecks } from '../screening/checks';
import { labelAnswer, llmModel } from '../screening/llm';
import type { AiResult } from '../types';
import { LAB_CASES, toInput } from './cases';
import type { LabEvent } from './events';

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
    const deps: ScreenDeps = {
      runChecks: (i) => {
        const signals = (opts.deps?.runChecks ?? runChecks)(i);
        emit({ type: 'checks', id: lab.id, signals });
        return signals;
      },
      labelAnswer: async (question: string, answer: string): Promise<AiResult> => {
        aiCalled = true;
        const t0 = Date.now();
        const r = await (opts.deps?.labelAnswer ?? labelAnswer)(question, answer);
        aiMs = Date.now() - t0;
        return r;
      },
      llmModel: opts.deps?.llmModel ?? llmModel,
    };

    const out = await screenWith(input, deps);
    emit({ type: 'ai', id: lab.id, skipped: !aiCalled, ai: out.ai, model: out.llmModel, ms: aiMs });
    emit({ type: 'verdict', id: lab.id, result: out.result, reasons: out.reasons, expected: lab.expected, match: out.result === lab.expected });
    ran += 1;
    if (aiCalled && opts.pauseMs > 0) await sleep(opts.pauseMs);
  }
  emit({ type: 'done', ran });
}
