// STUB (task S5). Lane B replaces the body in task B4. The signature must not change.
// Contract: never throws.
import type { ScreenInput, ScreenOutput } from '../types';

export async function screen(_input: ScreenInput): Promise<ScreenOutput> {
  return {
    result: 'pay',
    reasons: ['stub'],
    signals: { hardFails: [], weak: [] },
    ai: null,
    llmModel: null,
    rubricVersion: 'stub',
  };
}
