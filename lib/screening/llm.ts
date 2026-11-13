// AI label via Groq (TDD 10.3). Server-only: never import from client components.
import Groq from 'groq-sdk';
import { z } from 'zod';
import type { AiResult } from '../types';
import { combineRuns, type AiRun } from './combine';
import { SYSTEM_PROMPT, buildUserMessage } from './prompt';

export { combineAnswers, combineRuns, INCONCLUSIVE_REASON, type AiRun } from './combine';

export const TIMEOUT_MS = 10_000;

/** The part of the Groq client used here. Tests pass a mock. */
export interface ChatClient {
  chat: {
    completions: {
      create(
        body: {
          model: string;
          messages: { role: 'system' | 'user'; content: string }[];
          temperature: number;
          response_format: { type: 'json_object' };
        },
        options?: { timeout?: number; maxRetries?: number; signal?: AbortSignal },
      ): PromiseLike<{ choices: { message: { content: string | null } }[] }>;
    };
  };
}

export const replySchema = z
  .object({
    label: z.enum(['valid', 'unclear', 'non_answer']),
    type: z.enum(['off_question', 'evasive', 'copied', 'other']).nullable(),
    injection: z.boolean(),
    reason: z.string().min(1).max(300),
  })
  .refine((r) => (r.label === 'valid') === (r.type === null), {
    message: 'type must be null if and only if label is valid',
  });

export function llmModel(): string | null {
  return process.env.GROQ_MODEL || null;
}

/** Parses one reply. Returns null for invalid JSON or a schema failure. */
export function parseReply(content: string | null | undefined): AiRun | null {
  if (typeof content !== 'string') return null;
  let json: unknown;
  try {
    json = JSON.parse(content);
  } catch {
    return null;
  }
  const parsed = replySchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}

function defaultClient(): ChatClient {
  return new Groq({ apiKey: process.env.GROQ_API_KEY, timeout: TIMEOUT_MS, maxRetries: 0 });
}

/** One run. Any error, timeout or bad reply returns null. */
async function runOnce(client: ChatClient, model: string, user: string): Promise<AiRun | null> {
  const ctrl = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => {
      ctrl.abort();
      resolve(null);
    }, TIMEOUT_MS);
  });
  const call = (async () => {
    try {
      const res = await client.chat.completions.create(
        {
          model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: user },
          ],
          temperature: 0,
          response_format: { type: 'json_object' },
        },
        { timeout: TIMEOUT_MS, maxRetries: 0, signal: ctrl.signal },
      );
      return parseReply(res.choices[0]?.message?.content);
    } catch {
      return null;
    }
  })();
  try {
    return await Promise.race([call, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/** Labels one answer with two runs. Never throws: any failure becomes the inconclusive result. */
export async function labelAnswer(
  question: string,
  answer: string,
  client?: ChatClient,
): Promise<AiResult> {
  try {
    const model = llmModel();
    if (!model) return combineRuns(null, null);
    const c = client ?? defaultClient();
    const user = buildUserMessage(question, answer);
    const [runA, runB] = await Promise.all([runOnce(c, model, user), runOnce(c, model, user)]);
    return combineRuns(runA, runB);
  } catch {
    return combineRuns(null, null);
  }
}
