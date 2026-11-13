"use client";

// Browser side of Better Auth: wallet (SIWE) + email sign-in, session hook, sign-out.
import { siweClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { getAddress, toHex } from "viem";
import { buildSiweMessage } from "@/lib/ui/siwe";
import { connectWallet } from "@/lib/ui/wallet";
import { getProvider, WalletError } from "@/lib/ui/auth/metamask";

export const authClient = createAuthClient({ plugins: [siweClient()] });
export const useSession = authClient.useSession;

const CHAIN_ID = 97;

export class SignInError extends Error {}

/** Connect MetaMask (BSC Testnet), sign the SIWE challenge for free, and start a session. */
export async function signInWithWallet(email: string): Promise<{ wallet: `0x${string}` }> {
  const wallet = await connectWallet();
  const provider = getProvider();
  if (!provider) throw new WalletError("no_provider", "MetaMask isn't installed in this browser.");

  const nonce = await authClient.siwe.nonce({});
  if (nonce.error || !nonce.data?.nonce) throw new SignInError(nonce.error?.message ?? "Couldn't start sign-in. Try again.");

  const message = buildSiweMessage({
    address: getAddress(wallet),
    nonce: nonce.data.nonce,
    domain: window.location.host,
    uri: window.location.origin,
    chainId: CHAIN_ID,
  });
  let signature: `0x${string}`;
  try {
    signature = (await provider.request({ method: "personal_sign", params: [toHex(message), wallet] })) as `0x${string}`;
  } catch (e) {
    if ((e as { code?: number })?.code === 4001) throw new WalletError("signature", "You declined the signature. Sign to continue.");
    throw new WalletError("unknown", "Couldn't sign in MetaMask. Try again.");
  }

  const wanted = email.trim().toLowerCase();
  const res = await authClient.siwe.verify({ message, signature, email: wanted });
  if (res.error) throw new SignInError(res.error.message ?? "Sign-in failed. Try again.");

  // If the email already belongs to another wallet, the server signs this wallet in under a
  // placeholder email instead of taking the address over. Refuse that, and end the session.
  const session = await authClient.getSession({ query: { disableCookieCache: true } });
  if (session.data?.user.email !== wanted) {
    await authClient.signOut();
    throw new SignInError("That email is already linked to a different wallet. Use that wallet, or a different email.");
  }
  return { wallet };
}
