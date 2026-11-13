// Forgot password, proved by the wallet. Server only.
// Emails are not verified in ResFunder, so the wallet linked at sign-up is the proof of ownership:
//   1. start:   the server issues a one-time nonce (Better Auth's verification table, 10 minutes).
//   2. confirm: the wallet signs buildResetMessage(email, wallet, nonce); the server uses up the nonce,
//               checks the signature and that the wallet is linked to that email's account, sets the
//               new password and ends the account's other sessions.
// Nothing is created for an unknown email or an unlinked wallet.
import { randomBytes } from 'node:crypto';
import { verifyMessage } from 'viem';
import { z } from 'zod';
import { getAuth } from '../auth/better-auth';
import { buildResetMessage, RESET_NONCE_RE, RESET_TTL_MS } from '../auth/reset-message';
import { SIGNATURE_RE, WALLET_RE, normalizeEmail } from '../auth/signature';
import { ApiFailure } from './errors';
import { MAX_PASSWORD, MIN_PASSWORD } from './password';

const NONCE_PREFIX = 'pw-reset:';

/** The storage and crypto the reset needs, so tests can pass fakes. */
export interface ResetDeps {
  saveNonce(identifier: string, email: string, expiresAt: Date): Promise<void>;
  /** Returns and deletes the nonce in one step, or null. */
  useNonce(identifier: string): Promise<{ email: string; expiresAt: Date } | null>;
  findUserId(email: string): Promise<string | null>;
  /** Lowercase addresses of the wallets linked to the user. */
  walletsOf(userId: string): Promise<string[]>;
  setPassword(userId: string, password: string): Promise<void>;
  endSessions(userId: string): Promise<void>;
  verifySignature(wallet: string, message: string, signature: string): Promise<boolean>;
}

const startSchema = z.object({ email: z.string().max(254) }).strict();
const confirmSchema = z
  .object({
    email: z.string().max(254),
    wallet: z.string().regex(WALLET_RE),
    nonce: z.string().regex(RESET_NONCE_RE),
    signature: z.string().regex(SIGNATURE_RE),
    password: z.string(),
  })
  .strict();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NOT_LINKED = "That wallet isn't linked to an account with this email. Use the wallet you signed up with.";

/** Step 1. Always issues a nonce, so the answer doesn't reveal whether the email has an account. */
export async function startPasswordReset(body: unknown, deps: ResetDeps = betterAuthDeps(), now = Date.now()): Promise<{ nonce: string }> {
  const { email: raw } = startSchema.parse(body);
  const email = normalizeEmail(raw);
  if (!EMAIL_RE.test(email)) throw new ApiFailure('INVALID_INPUT', 'Enter a valid email.');
  const nonce = randomBytes(16).toString('hex');
  await deps.saveNonce(NONCE_PREFIX + nonce, email, new Date(now + RESET_TTL_MS));
  return { nonce };
}

/** Step 2. The nonce is used up first, so a signature can't be replayed even when a later check fails. */
export async function confirmPasswordReset(body: unknown, deps: ResetDeps = betterAuthDeps(), now = Date.now()): Promise<{ reset: true }> {
  const input = confirmSchema.parse(body);
  const email = normalizeEmail(input.email);
  const wallet = input.wallet.toLowerCase();
  if (input.password.length < MIN_PASSWORD) throw new ApiFailure('INVALID_INPUT', `Use at least ${MIN_PASSWORD} characters.`);
  if (input.password.length > MAX_PASSWORD) throw new ApiFailure('INVALID_INPUT', `Use at most ${MAX_PASSWORD} characters.`);

  const saved = await deps.useNonce(NONCE_PREFIX + input.nonce);
  if (!saved || saved.expiresAt.getTime() <= now || saved.email !== email) {
    throw new ApiFailure('INVALID_INPUT', 'This reset request expired. Start again.');
  }
  const signed = await deps.verifySignature(wallet, buildResetMessage(email, wallet, input.nonce), input.signature);
  if (!signed) throw new ApiFailure('WALLET_NOT_VERIFIED', "The wallet signature didn't match. Start again.");

  const userId = await deps.findUserId(email);
  if (!userId || !(await deps.walletsOf(userId)).includes(wallet)) throw new ApiFailure('WALLET_NOT_VERIFIED', NOT_LINKED);

  await deps.setPassword(userId, input.password);
  await deps.endSessions(userId);
  return { reset: true };
}

/** The real dependencies: Better Auth's internal adapter and viem. */
export function betterAuthDeps(): ResetDeps {
  const ctx = () => getAuth().$context;
  return {
    async saveNonce(identifier, email, expiresAt) {
      await (await ctx()).internalAdapter.createVerificationValue({ identifier, value: email, expiresAt });
    },
    async useNonce(identifier) {
      const v = await (await ctx()).internalAdapter.consumeVerificationValue(identifier);
      return v ? { email: v.value, expiresAt: new Date(v.expiresAt) } : null;
    },
    async findUserId(email) {
      return (await (await ctx()).internalAdapter.findUserByEmail(email))?.user.id ?? null;
    },
    async walletsOf(userId) {
      const rows = await (await ctx()).adapter.findMany<{ address: string }>({
        model: 'walletAddress',
        where: [{ field: 'userId', value: userId }],
      });
      return rows.map((r) => r.address.toLowerCase());
    },
    async setPassword(userId, password) {
      const c = await ctx();
      const hash = await c.password.hash(password);
      const accounts = await c.internalAdapter.findAccounts(userId);
      if (accounts.some((a) => a.providerId === 'credential')) await c.internalAdapter.updatePassword(userId, hash);
      else await c.internalAdapter.linkAccount({ userId, providerId: 'credential', accountId: userId, password: hash });
    },
    async endSessions(userId) {
      await (await ctx()).internalAdapter.deleteUserSessions(userId);
    },
    async verifySignature(wallet, message, signature) {
      try {
        return await verifyMessage({ address: wallet as `0x${string}`, message, signature: signature as `0x${string}` });
      } catch {
        return false;
      }
    },
  };
}
