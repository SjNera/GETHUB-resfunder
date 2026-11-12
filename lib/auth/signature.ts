// Lane C. Email hash and signed-message verification. Source: docs/TDD.md sections 5.2 to 5.4.
// Server only (node:crypto, HASH_SECRET).
import { createHmac } from 'node:crypto';
import { isAddress, verifyMessage } from 'viem';
import { ApiFailure } from '../api/errors';
import type { AuthAction, AuthProof, Hex } from '../types';
import { buildAuthMessage } from './message';

const MAX_AGE_MS = 10 * 60 * 1000;
const MAX_FUTURE_MS = 60 * 1000;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** HMAC-SHA256(HASH_SECRET, normalizedEmail + "|" + surveyId) as hex. */
export function emailHash(email: string, surveyId: number): string {
  const secret = process.env.HASH_SECRET;
  if (!secret) throw new Error('HASH_SECRET is not set');
  return createHmac('sha256', secret).update(`${normalizeEmail(email)}|${surveyId}`).digest('hex');
}

function notVerified(message: string): ApiFailure {
  return new ApiFailure('WALLET_NOT_VERIFIED', message);
}

/** Returns the lowercase wallet. Throws WALLET_NOT_VERIFIED on a stale timestamp or a bad signature. */
export async function verifyAuth(proof: AuthProof, action: AuthAction, surveyId: number): Promise<string> {
  if (!isAddress(proof.wallet, { strict: false })) throw notVerified('The wallet address is not valid.');
  const now = Date.now();
  if (!Number.isFinite(proof.timestamp) || now - proof.timestamp > MAX_AGE_MS || proof.timestamp - now > MAX_FUTURE_MS) {
    throw notVerified('The signature has expired. Sign again.');
  }
  let ok = false;
  try {
    ok = await verifyMessage({
      address: proof.wallet,
      message: buildAuthMessage(action, surveyId, proof.wallet, proof.timestamp),
      signature: proof.signature,
    });
  } catch {
    ok = false; // malformed signature
  }
  if (!ok) throw notVerified('The signature does not match the wallet.');
  return proof.wallet.toLowerCase();
}

/** Reads the proof of a GET route from x-auth-wallet, x-auth-signature and x-auth-timestamp. */
export function proofFromHeaders(headers: Headers): AuthProof | null {
  const wallet = headers.get('x-auth-wallet');
  const signature = headers.get('x-auth-signature');
  const timestamp = headers.get('x-auth-timestamp');
  if (!wallet || !signature || !timestamp) return null;
  if (!/^0x[0-9a-fA-F]+$/.test(signature) || !/^\d{1,16}$/.test(timestamp)) return null;
  return { wallet, signature: signature as Hex, timestamp: Number(timestamp) };
}

/**
 * Auth for researcher GET routes. Returns the lowercase wallet.
 * With REQUIRE_RESEARCHER_AUTH=false (demo fallback) the wallet comes from x-auth-wallet unverified.
 */
export async function verifyResearcher(headers: Headers, action: AuthAction, surveyId: number): Promise<string> {
  if (process.env.REQUIRE_RESEARCHER_AUTH === 'false') {
    const wallet = headers.get('x-auth-wallet');
    if (!wallet || !isAddress(wallet, { strict: false })) throw notVerified('The x-auth-wallet header is missing.');
    return wallet.toLowerCase();
  }
  const proof = proofFromHeaders(headers);
  if (!proof) throw notVerified('The auth headers are missing or malformed.');
  return verifyAuth(proof, action, surveyId);
}
