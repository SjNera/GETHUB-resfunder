// Sign-in session for routes that read or write the signed-in user's own data. Server only.
// The wallet is the one that signed the SIWE message at sign-in (Better Auth's walletAddress table).
import { ApiFailure } from '../api/errors';
import { query } from '../db/client';
import { getAuth } from './better-auth';

export interface SessionUser {
  userId: string;
  email: string;
  /** Lowercase. */
  wallet: string;
}

/** The signed-in user, or null. Never throws for a missing or bad session. */
export async function getSessionUser(headers: Headers): Promise<SessionUser | null> {
  let session: Awaited<ReturnType<ReturnType<typeof getAuth>['api']['getSession']>>;
  try {
    session = await getAuth().api.getSession({ headers });
  } catch {
    return null;
  }
  if (!session?.user) return null;
  const rows = await query<{ address: string }>(
    `SELECT "address" FROM "walletAddress" WHERE "userId" = $1 ORDER BY "isPrimary" DESC, "createdAt" ASC LIMIT 1`,
    [session.user.id],
  );
  if (!rows[0]) return null;
  return { userId: session.user.id, email: session.user.email, wallet: rows[0].address.toLowerCase() };
}

/** Like getSessionUser, but a missing session is WALLET_NOT_VERIFIED (401). */
export async function requireSession(headers: Headers): Promise<SessionUser> {
  const user = await getSessionUser(headers);
  if (!user) throw new ApiFailure('WALLET_NOT_VERIFIED', 'Sign in to continue.');
  return user;
}
