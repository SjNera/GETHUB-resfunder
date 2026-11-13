// Adds a password to the signed-in account (Register: right after the wallet sign-in). Server only.
import { z } from 'zod';
import { getAuth } from '../auth/better-auth';
import { requireSession } from '../auth/session';
import { ApiFailure } from './errors';

export const MIN_PASSWORD = 8;
export const MAX_PASSWORD = 128;

const bodySchema = z.object({ password: z.string() }).strict();

/** Only the parts of the Better Auth API this file calls, so tests can pass a fake. */
export interface PasswordAuth {
  api: { setPassword: (a: { body: { newPassword: string }; headers: Headers }) => Promise<unknown> };
}

function alreadySet(e: unknown): boolean {
  const body = (e as { body?: { code?: unknown } } | null)?.body;
  if (body?.code === 'PASSWORD_ALREADY_SET') return true;
  return e instanceof Error && /already has a password/i.test(e.message);
}

export async function setMyPassword(
  headers: Headers,
  body: unknown,
  auth: PasswordAuth = getAuth() as unknown as PasswordAuth,
): Promise<{ saved: true }> {
  const { password } = bodySchema.parse(body);
  if (password.length < MIN_PASSWORD) throw new ApiFailure('INVALID_INPUT', `Use at least ${MIN_PASSWORD} characters.`);
  if (password.length > MAX_PASSWORD) throw new ApiFailure('INVALID_INPUT', `Use at most ${MAX_PASSWORD} characters.`);
  await requireSession(headers);
  try {
    await auth.api.setPassword({ body: { newPassword: password }, headers });
  } catch (e) {
    if (alreadySet(e)) throw new ApiFailure('INVALID_INPUT', 'This account already has a password. Log in instead.');
    throw e;
  }
  return { saved: true };
}
