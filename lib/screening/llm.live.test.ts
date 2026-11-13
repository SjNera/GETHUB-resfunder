// Live Groq call for the B3 check. Opt-in: skipped unless GROQ_LIVE=1.
// Run: GROQ_LIVE=1 node --env-file=.env node_modules/vitest/vitest.mjs run lib/screening/llm.live.test.ts
import { describe, expect, it } from 'vitest';
import { labelAnswer } from './llm';

describe.skipIf(process.env.GROQ_LIVE !== '1')('labelAnswer (live Groq)', () => {
  it('returns a valid, agreed result for a real answer', async () => {
    const r = await labelAnswer(
      'What study method helps you most, and why?',
      'Pomodoro, kasi nakakapag-focus ako for 25 minutes tapos may break.',
    );
    console.log(r);
    expect(r.agreed).toBe(true);
    expect(r.label).toBe('valid');
    expect(r.type).toBeNull();
  }, 30_000);
});
