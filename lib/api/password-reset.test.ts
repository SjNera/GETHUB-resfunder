import { describe, expect, it } from 'vitest';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { buildResetMessage, RESET_TTL_MS } from '../auth/reset-message';
import { ApiFailure } from './errors';
import { betterAuthDeps, confirmPasswordReset, startPasswordReset, type ResetDeps } from './password-reset';

const owner = privateKeyToAccount(generatePrivateKey());
const stranger = privateKeyToAccount(generatePrivateKey());
const EMAIL = 'ana@example.com';
const NOW = Date.parse('2026-11-13T00:00:00Z');

/** In-memory store with one account (EMAIL, linked to owner's wallet), and Better Auth's real-shaped verify. */
function fakeDeps() {
  const nonces = new Map<string, { email: string; expiresAt: Date }>();
  const state = { password: 'old-password', sessionsEnded: 0 };
  const real = betterAuthDeps();
  const deps: ResetDeps = {
    saveNonce: async (id, email, expiresAt) => void nonces.set(id, { email, expiresAt }),
    useNonce: async (id) => {
      const v = nonces.get(id) ?? null;
      nonces.delete(id);
      return v;
    },
    findUserId: async (email) => (email === EMAIL ? 'user-1' : null),
    walletsOf: async (id) => (id === 'user-1' ? [owner.address.toLowerCase()] : []),
    setPassword: async (_id, pw) => void (state.password = pw),
    endSessions: async () => void state.sessionsEnded++,
    verifySignature: real.verifySignature,
  };
  return { deps, state, nonces };
}

async function signedBody(deps: ResetDeps, signer = owner, email = EMAIL, now = NOW) {
  const { nonce } = await startPasswordReset({ email }, deps, now);
  const signature = await signer.signMessage({ message: buildResetMessage(email, signer.address, nonce) });
  return { email, wallet: signer.address, nonce, signature, password: 'new-password' };
}

const failure = async (p: Promise<unknown>) => {
  const e = await p.then(() => null, (err: unknown) => err);
  expect(e).toBeInstanceOf(ApiFailure);
  return e as ApiFailure;
};

describe('password reset with the linked wallet', () => {
  it('sets the new password and ends the sessions', async () => {
    const { deps, state } = fakeDeps();
    expect(await confirmPasswordReset(await signedBody(deps), deps, NOW)).toEqual({ reset: true });
    expect(state.password).toBe('new-password');
    expect(state.sessionsEnded).toBe(1);
  });

  it('treats the email case-insensitively', async () => {
    const { deps, state } = fakeDeps();
    const body = await signedBody(deps, owner, ' Ana@Example.com ');
    await confirmPasswordReset(body, deps, NOW);
    expect(state.password).toBe('new-password');
  });

  it('issues a nonce for an unknown email too, without saying so', async () => {
    const { deps, nonces } = fakeDeps();
    const r = await startPasswordReset({ email: 'nobody@example.com' }, deps, NOW);
    expect(r.nonce).toMatch(/^[0-9a-f]{32}$/);
    expect(nonces.size).toBe(1);
  });

  it('refuses a wallet that is not linked to the account', async () => {
    const { deps, state } = fakeDeps();
    const e = await failure(confirmPasswordReset(await signedBody(deps, stranger), deps, NOW));
    expect(e.code).toBe('WALLET_NOT_VERIFIED');
    expect(state.password).toBe('old-password');
  });

  it('refuses an unknown email', async () => {
    const { deps } = fakeDeps();
    const e = await failure(confirmPasswordReset(await signedBody(deps, owner, 'nobody@example.com'), deps, NOW));
    expect(e.code).toBe('WALLET_NOT_VERIFIED');
  });

  it('refuses a signature from a different wallet than the one named', async () => {
    const { deps, state } = fakeDeps();
    const body = await signedBody(deps, stranger);
    const e = await failure(confirmPasswordReset({ ...body, wallet: owner.address }, deps, NOW));
    expect(e.code).toBe('WALLET_NOT_VERIFIED');
    expect(state.password).toBe('old-password');
  });

  it('uses the nonce once: a replay fails', async () => {
    const { deps } = fakeDeps();
    const body = await signedBody(deps);
    await confirmPasswordReset(body, deps, NOW);
    const e = await failure(confirmPasswordReset(body, deps, NOW));
    expect(e.message).toMatch(/expired/);
  });

  it('refuses an expired nonce', async () => {
    const { deps } = fakeDeps();
    const body = await signedBody(deps);
    const e = await failure(confirmPasswordReset(body, deps, NOW + RESET_TTL_MS + 1));
    expect(e.code).toBe('INVALID_INPUT');
  });

  it('refuses a nonce issued for another email', async () => {
    const { deps } = fakeDeps();
    const { nonce } = await startPasswordReset({ email: 'other@example.com' }, deps, NOW);
    const signature = await owner.signMessage({ message: buildResetMessage(EMAIL, owner.address, nonce) });
    const e = await failure(confirmPasswordReset({ email: EMAIL, wallet: owner.address, nonce, signature, password: 'new-password' }, deps, NOW));
    expect(e.code).toBe('INVALID_INPUT');
  });

  it('checks the password length before using the nonce', async () => {
    const { deps, nonces } = fakeDeps();
    const body = await signedBody(deps);
    const e = await failure(confirmPasswordReset({ ...body, password: 'short' }, deps, NOW));
    expect(e.code).toBe('INVALID_INPUT');
    expect(nonces.size).toBe(1);
  });

  it('rejects malformed input', async () => {
    const { deps } = fakeDeps();
    await expect(startPasswordReset({ email: 'not-an-email' }, deps, NOW)).rejects.toBeInstanceOf(ApiFailure);
    await expect(confirmPasswordReset({ email: EMAIL }, deps, NOW)).rejects.toThrow();
  });
});
