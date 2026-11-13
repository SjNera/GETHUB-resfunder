// Sign-In With Ethereum (EIP-4361) message for Better Auth's siwe plugin. Browser and server safe.
import { createSiweMessage } from "viem/siwe";

export const SIWE_STATEMENT = "Sign in to ResFunder. This is free and sends no transaction.";

export function buildSiweMessage(a: {
  address: `0x${string}`;
  nonce: string;
  domain: string;
  uri: string;
  chainId: number;
  now?: Date;
}): string {
  const issuedAt = a.now ?? new Date();
  return createSiweMessage({
    address: a.address,
    chainId: a.chainId,
    domain: a.domain,
    nonce: a.nonce,
    uri: a.uri,
    version: "1",
    statement: SIWE_STATEMENT,
    issuedAt,
    expirationTime: new Date(issuedAt.getTime() + 10 * 60_000),
  });
}
