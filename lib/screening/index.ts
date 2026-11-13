// screen() (TDD 10): code checks, then the AI label, then the rule engine. Never throws.
// Server-only: imports llm.ts.
import type { AiResult, ScreenInput, ScreenOutput, Signals } from '../types';
import { runChecks } from './checks';
import { combineAnswers, flaggedAnswers, type AiResultWithFlags } from './combine';
import { labelAnswer, llmModel } from './llm';
import { RUBRIC_VERSION, decide } from './rules';

export const SCREENING_ERROR_REASON = 'Screening error, sent to review.';

/** Injectable parts of screen(). Tests pass mocks. */
export interface ScreenDeps {
  runChecks: (input: ScreenInput) => Signals;
  labelAnswer: (question: string, answer: string) => Promise<AiResult>;
  llmModel: () => string | null;
}

const defaultDeps: ScreenDeps = { runChecks, labelAnswer, llmModel };

export async function screenWith(input: ScreenInput, deps: ScreenDeps): Promise<ScreenOutput> {
  let signals: Signals = { hardFails: [], weak: [] };
  let ai: AiResult | null = null;
  let model: string | null = null;
  try {
    signals = deps.runChecks(input);

    // AI runs only with no hard fails, for each open-ended question with a non-empty answer.
    if (signals.hardFails.length === 0) {
      const items: { id: string; question: string; answer: string }[] = [];
      for (const q of input.survey.questions) {
        if (q.type !== 'open_ended') continue;
        const raw = input.answers[q.id];
        if (raw === undefined) continue;
        const answer = String(raw);
        if (answer.trim().length === 0) continue;
        items.push({ id: q.id, question: q.text, answer });
      }
      if (items.length > 0) {
        model = deps.llmModel();
        const results = await Promise.all(items.map((i) => deps.labelAnswer(i.question, i.answer)));
        const combined = combineAnswers(results);
        const flagged = flaggedAnswers(items.map((i) => i.id), results);
        // The researcher's review shows which answers the AI flagged; it does not change the decision.
        const withFlags: AiResultWithFlags | null = combined && flagged.length > 0 ? { ...combined, flagged } : combined;
        ai = withFlags;
      }
    }

    const { result, reasons } = decide(signals, ai);
    return { result, reasons, signals, ai, llmModel: model, rubricVersion: RUBRIC_VERSION };
  } catch {
    return {
      result: 'review',
      reasons: [SCREENING_ERROR_REASON],
      signals,
      ai,
      llmModel: model,
      rubricVersion: RUBRIC_VERSION,
    };
  }
}

export async function screen(input: ScreenInput): Promise<ScreenOutput> {
  return screenWith(input, defaultDeps);
}
