import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { ApiFailure } from '../api/errors';
import type { AuthAction, AuthProof } from '../types';
import { buildAuthMessage } from './message';
import { emailHash, proofFromHeaders, verifyAuth, verifyResearcher } from './signature';

const signer = privateKeyToAccount(generatePrivateKey());
const other = privateKeyToAccount(generatePrivateKey());

async function sign(action: AuthAction, surveyId: number, timestamp = Date.now(), account = signer): Promise<AuthProof> {
  const signature = await account.signMessage({
    message: buildAuthMessage(action, surveyId, account.address, timestamp),
  });
  return { wallet: account.address, signature, timestamp };
}

async function expectNotVerified(p: Promise<unknown>): Promise<void> {
  const err = await p.then(
    () => null,
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(ApiFailure);
  expect((err as ApiFailure).code).toBe('WALLET_NOT_VERIFIED');
}

describe('verifyAuth', () => {
  it('accepts a valid proof and returns the lowercase wallet', async () => {
    const proof = await sign('submit', 7);
    expect(await verifyAuth(proof, 'submit', 7)).toBe(signer.address.toLowerCase());
  });

  it('accepts the wallet in any letter case', async () => {
    const proof = await sign('submit', 7);
    expect(await verifyAuth({ ...proof, wallet: proof.wallet.toLowerCase() }, 'submit', 7)).toBe(
      signer.address.toLowerCase(),
    );
  });

  it('rejects a proof older than 10 minutes', async () => {
    await expectNotVerified(verifyAuth(await sign('submit', 7, Date.now() - 11 * 60 * 1000), 'submit', 7));
  });

  it('accepts a proof 9 minutes old', async () => {
    const proof = await sign('submit', 7, Date.now() - 9 * 60 * 1000);
    expect(await verifyAuth(proof, 'submit', 7)).toBe(signer.address.toLowerCase());
  });

  it('rejects a proof more than 1 minute in the future', async () => {
    await expectNotVerified(verifyAuth(await sign('submit', 7, Date.now() + 2 * 60 * 1000), 'submit', 7));
  });

  it('rejects a proof signed for another survey', async () => {
    await expectNotVerified(verifyAuth(await sign('submit', 7), 'submit', 8));
  });

  it('rejects a proof signed for another action', async () => {
    await expectNotVerified(verifyAuth(await sign('submit', 7), 'view_log', 7));
  });

  it('rejects a proof signed by another wallet', async () => {
    const proof = await sign('submit', 7, Date.now(), other);
    await expectNotVerified(verifyAuth({ ...proof, wallet: signer.address }, 'submit', 7));
  });

  it('rejects a malformed signature and a malformed wallet', async () => {
    const proof = await sign('submit', 7);
    await expectNotVerified(verifyAuth({ ...proof, signature: '0x1234' }, 'submit', 7));
    await expectNotVerified(verifyAuth({ ...proof, wallet: '0x123' }, 'submit', 7));
  });

  it('rejects a signature that is not 65 bytes and a timestamp that is not a whole number', async () => {
    const proof = await sign('submit', 7);
    await expectNotVerified(verifyAuth({ ...proof, signature: `${proof.signature}00` }, 'submit', 7));
    await expectNotVerified(verifyAuth({ ...proof, signature: `0x${'ab'.repeat(5000)}` }, 'submit', 7));
    await expectNotVerified(verifyAuth({ ...proof, timestamp: proof.timestamp + 0.5 }, 'submit', 7));
    await expectNotVerified(verifyAuth({ ...proof, timestamp: Number.NaN }, 'submit', 7));
  });
});

describe('researcher headers', () => {
  afterEach(() => vi.unstubAllEnvs());

  async function headersFor(action: AuthAction, surveyId: number): Promise<Headers> {
    const proof = await sign(action, surveyId);
    return new Headers({
      'x-auth-wallet': proof.wallet,
      'x-auth-signature': proof.signature,
      'x-auth-timestamp': String(proof.timestamp),
    });
  }

  it('reads a proof from the three headers', async () => {
    const proof = proofFromHeaders(await headersFor('list_surveys', 0));
    expect(proof?.wallet).toBe(signer.address);
    expect(proofFromHeaders(new Headers({ 'x-auth-wallet': signer.address }))).toBeNull();
  });

  it('ignores headers with a malformed wallet, signature or timestamp', async () => {
    const good = await headersFor('list_surveys', 0);
    const withHeader = (name: string, value: string): Headers => {
      const h = new Headers(good);
      h.set(name, value);
      return h;
    };
    expect(proofFromHeaders(withHeader('x-auth-wallet', '0x123'))).toBeNull();
    expect(proofFromHeaders(withHeader('x-auth-signature', `0x${'ab'.repeat(5000)}`))).toBeNull();
    expect(proofFromHeaders(withHeader('x-auth-timestamp', '12.5'))).toBeNull();
  });

  it('verifies a signed header proof', async () => {
    expect(await verifyResearcher(await headersFor('list_surveys', 0), 'list_surveys', 0)).toBe(
      signer.address.toLowerCase(),
    );
  });

  it('rejects missing headers', async () => {
    await expectNotVerified(verifyResearcher(new Headers(), 'list_surveys', 0));
    await expectNotVerified(verifyResearcher(new Headers({ 'x-auth-wallet': signer.address }), 'list_surveys', 0));
  });

  it('skips verification only when REQUIRE_RESEARCHER_AUTH is false', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubEnv('REQUIRE_RESEARCHER_AUTH', 'false');
    expect(await verifyResearcher(new Headers({ 'x-auth-wallet': signer.address }), 'view_log', 3)).toBe(
      signer.address.toLowerCase(),
    );
    await expectNotVerified(verifyResearcher(new Headers(), 'view_log', 3));
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it('keeps verification on for any other value of REQUIRE_RESEARCHER_AUTH', async () => {
    for (const value of ['', 'true', 'False', '0', 'no']) {
      vi.stubEnv('REQUIRE_RESEARCHER_AUTH', value);
      await expectNotVerified(verifyResearcher(new Headers({ 'x-auth-wallet': signer.address }), 'view_log', 3));
    }
  });
});

describe('emailHash', () => {
  beforeEach(() => vi.stubEnv('HASH_SECRET', 'test-secret-'.repeat(4)));
  afterEach(() => vi.unstubAllEnvs());

  it('is HMAC-SHA256 hex of the normalized email and the survey id', () => {
    const h = emailHash('  Ana@Example.COM ', 5);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(h).toBe(emailHash('ana@example.com', 5));
  });

  it('differs per survey and per secret', () => {
    const a = emailHash('ana@example.com', 5);
    expect(emailHash('ana@example.com', 6)).not.toBe(a);
    vi.stubEnv('HASH_SECRET', 'another-secret-'.repeat(4));
    expect(emailHash('ana@example.com', 5)).not.toBe(a);
  });

  it('throws when HASH_SECRET is missing or shorter than 32 characters', () => {
    vi.stubEnv('HASH_SECRET', '');
    expect(() => emailHash('ana@example.com', 5)).toThrow();
    vi.stubEnv('HASH_SECRET', 'x'.repeat(31));
    expect(() => emailHash('ana@example.com', 5)).toThrow();
    vi.stubEnv('HASH_SECRET', 'x'.repeat(32));
    expect(emailHash('ana@example.com', 5)).toMatch(/^[0-9a-f]{64}$/);
  });
});
