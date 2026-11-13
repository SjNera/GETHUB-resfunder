// TEMPORARY validation lab. Delete with lib/lab and app/lab.
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AiResult } from '../types';
import { LAB_CASES } from './cases';
import type { LabEvent } from './events';
import { labEnabled, runLab } from './run';

const valid: AiResult = { label: 'valid', type: null, injection: false, reason: 'Fine.', agreed: true };
const fakeAi = vi.fn(async () => valid);

async function collect(ids: string[] | null): Promise<LabEvent[]> {
  const events: LabEvent[] = [];
  await runLab(ids, (e) => events.push(e), { pauseMs: 0, deps: { labelAnswer: fakeAi, llmModel: () => 'fake' } });
  return events;
}

describe('lab seed data', () => {
  it('has 25 cases with unique ids', () => {
    expect(LAB_CASES).toHaveLength(25);
    expect(new Set(LAB_CASES.map((c) => c.id)).size).toBe(25);
  });
});

describe('runLab', () => {
  afterEach(() => fakeAi.mockClear());

  it('emits case, checks, ai, verdict, then done, in order', async () => {
    const ev = await collect(['g01']);
    expect(ev.map((e) => e.type)).toEqual(['case', 'checks', 'ai', 'verdict', 'done']);
  });

  it('code-only cases match without calling the AI', async () => {
    const ids = LAB_CASES.filter((c) => c.group === 'Hard fail').map((c) => c.id);
    const ev = await collect(ids);
    expect(fakeAi).not.toHaveBeenCalled();
    const verdicts = ev.filter((e) => e.type === 'verdict');
    expect(verdicts).toHaveLength(4);
    for (const v of verdicts) expect(v.type === 'verdict' && v.match).toBe(true);
  });

  it('weak-signal cases follow the rules with a valid AI label', async () => {
    const ev = await collect(['w01', 'w02', 'g09']);
    for (const v of ev.filter((e) => e.type === 'verdict')) expect(v.type === 'verdict' && v.match).toBe(true);
  });

  it('records both Groq runs for a case that reaches the AI', async () => {
    vi.stubEnv('GROQ_MODEL', 'fake-model');
    const reply = (label: string) => ({ choices: [{ message: { content: JSON.stringify({ label, type: null, injection: false, reason: 'ok' }) } }] });
    const create = vi.fn().mockResolvedValueOnce(reply('valid')).mockResolvedValueOnce(reply('unclear'));
    const events: LabEvent[] = [];
    await runLab(['g01'], (e) => events.push(e), { pauseMs: 0, client: { chat: { completions: { create } } } });
    const ai = events.find((e) => e.type === 'ai');
    expect(create).toHaveBeenCalledTimes(2);
    expect(ai?.type === 'ai' && ai.runs.map((r) => r.parsed?.label)).toEqual(['valid', 'unclear']);
    expect(ai?.type === 'ai' && ai.ai?.agreed).toBe(false);
    vi.unstubAllEnvs();
  });

  it('a stop signal ends the run early', async () => {
    const ctl = new AbortController();
    const events: LabEvent[] = [];
    await runLab(null, (e) => {
      events.push(e);
      if (e.type === 'verdict') ctl.abort();
    }, { pauseMs: 0, signal: ctl.signal, deps: { labelAnswer: fakeAi, llmModel: () => 'fake' } });
    expect(events.filter((e) => e.type === 'verdict')).toHaveLength(1);
  });
});

describe('labEnabled', () => {
  afterEach(() => vi.unstubAllEnvs());
  it('needs LAB_ENABLED=true and a non-production build', () => {
    vi.stubEnv('LAB_ENABLED', 'true');
    vi.stubEnv('NODE_ENV', 'development');
    expect(labEnabled()).toBe(true);
    vi.stubEnv('NODE_ENV', 'production');
    expect(labEnabled()).toBe(false);
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('LAB_ENABLED', '');
    expect(labEnabled()).toBe(false);
  });
});
