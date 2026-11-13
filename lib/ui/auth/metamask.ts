"use client";

/**
 * Connect MetaMask, move it to BSC Testnet (chain 97), and prove ownership
 * with a free personal_sign message. In the real app the nonce comes from the
 * server and the server verifies the signature; this demo verifies it in the
 * browser with viem so the flow works without a backend.
 */
import { getAddress, isAddress, toHex, verifyMessage } from "viem";

type Eip1193 = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  isMetaMask?: boolean;
};

export const BSC_TESTNET = {
  chainId: "0x61",
  chainName: "BNB Smart Chain Testnet",
  nativeCurrency: { name: "tBNB", symbol: "tBNB", decimals: 18 },
  rpcUrls: ["https://data-seed-prebsc-1-s1.bnbchain.org:8545"],
  blockExplorerUrls: ["https://testnet.bscscan.com"],
};

export function getProvider(): Eip1193 | null {
  if (typeof window === "undefined") return null;
  return ((window as unknown as { ethereum?: Eip1193 }).ethereum ?? null) as Eip1193 | null;
}

export const isPhone = () => typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

/** Opens this page inside the MetaMask app's browser. */
export function metamaskDeepLink(): string {
  const { host, pathname, search } = window.location;
  return `https://metamask.app.link/dapp/${host}${pathname}${search}`;
}

export type ConnectStage = "account" | "network" | "sign";

export class WalletError extends Error {
  constructor(
    public kind: "no_provider" | "rejected" | "network" | "signature" | "pending" | "mismatch" | "unknown",
    message: string,
  ) {
    super(message);
  }
}

const code = (e: unknown) => (e as { code?: number })?.code;

function friendly(e: unknown, stage: ConnectStage): WalletError {
  if (code(e) === -32002) return new WalletError("pending", "Open MetaMask to finish.");
  if (code(e) === 4001) {
    if (stage === "account") return new WalletError("rejected", "You cancelled the connection. Connect when you're ready.");
    if (stage === "network") return new WalletError("network", "Switch to BSC Testnet to continue.");
    return new WalletError("signature", "We need the signature to check the wallet is yours.");
  }
  return new WalletError("unknown", "Something went wrong in MetaMask. Try again.");
}

export async function ensureBscTestnet(provider: Eip1193) {
  const chainId = (await provider.request({ method: "eth_chainId" })) as string;
  if (chainId?.toLowerCase() === BSC_TESTNET.chainId) return;
  try {
    await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: BSC_TESTNET.chainId }] });
  } catch (e) {
    if (code(e) === 4902) {
      await provider.request({ method: "wallet_addEthereumChain", params: [BSC_TESTNET] });
    } else {
      throw e;
    }
  }
}

export function linkMessage(email: string, nonce: string, at: Date) {
  return `ResFunder: link this wallet to ${email}.\nCode ${nonce}.\n${at.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

function nonce() {
  const bytes = crypto.getRandomValues(new Uint8Array(5));
  return Array.from(bytes, (b) => b.toString(36).padStart(2, "0")).join("").toUpperCase().slice(0, 8);
}

/** The whole connect-and-sign sequence. Returns the checksummed, verified address. */
export async function connectAndSign(email: string, onStage?: (s: ConnectStage) => void): Promise<`0x${string}`> {
  const provider = getProvider();
  if (!provider) throw new WalletError("no_provider", "MetaMask isn't installed in this browser.");

  let stage: ConnectStage = "account";
  try {
    onStage?.(stage);
    const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
    if (!accounts?.[0]) throw new WalletError("rejected", "You cancelled the connection. Connect when you're ready.");
    const address = getAddress(accounts[0]);

    stage = "network";
    onStage?.(stage);
    await ensureBscTestnet(provider);

    stage = "sign";
    onStage?.(stage);
    const message = linkMessage(email, nonce(), new Date());
    const signature = (await provider.request({ method: "personal_sign", params: [toHex(message), address] })) as `0x${string}`;

    const ok = await verifyMessage({ address, message, signature });
    if (!ok) throw new WalletError("signature", "We couldn't verify that signature. Try again.");
    return address;
  } catch (e) {
    if (e instanceof WalletError) throw e;
    throw friendly(e, stage);
  }
}

/** Paste fallback: format and checksum check. Returns the checksummed address or an error. */
export function parsePastedAddress(input: string): { ok: true; address: `0x${string}` } | { ok: false; error: string } {
  const t = input.trim();
  const invalid = { ok: false as const, error: "That isn't a valid wallet address. It starts with 0x and has 42 characters." };
  if (!/^0x[0-9a-fA-F]{40}$/.test(t)) return invalid;
  // Mixed case must match the EIP-55 checksum; all-lower or all-upper is accepted.
  const mixed = t.slice(2) !== t.slice(2).toLowerCase() && t.slice(2) !== t.slice(2).toUpperCase();
  if (mixed && !isAddress(t, { strict: true })) return invalid;
  return { ok: true, address: getAddress(t) };
}

export const shortAddress = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
