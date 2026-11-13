"use client";

// Browser wallet actions for the real flow: connect, sign auth proofs, send createSurvey / closeSurvey.
// Uses the MetaMask provider through viem. Nothing here touches a private key.
import { createPublicClient, createWalletClient, custom, getAddress, toHex, type Address } from "viem";
import { bscTestnet } from "viem/chains";
import { buildAuthMessage } from "@/lib/auth/message";
import { ESCROW_ABI, ESCROW_ADDRESS } from "@/lib/chain/abi";
import type { AuthAction, AuthProof, Hex } from "@/lib/types";
import { ensureBscTestnet, getProvider, WalletError } from "@/lib/ui/auth/metamask";

export { WalletError };

/** Spec 5.4: the UI may cache a proof for up to 9 minutes (the server accepts 10). */
export const PROOF_TTL_MS = 9 * 60_000;
const PROOFS_KEY = "rf-proofs-v1";
/** Read proofs survive a reload (same tab only), so a refresh doesn't ask MetaMask again. */
const proofs = new Map<string, AuthProof>(loadProofs());

function loadProofs(): [string, AuthProof][] {
  try {
    return typeof sessionStorage === "undefined" ? [] : (JSON.parse(sessionStorage.getItem(PROOFS_KEY) ?? "[]") as [string, AuthProof][]);
  } catch {
    return [];
  }
}
function saveProofs() {
  try {
    sessionStorage.setItem(PROOFS_KEY, JSON.stringify([...proofs]));
  } catch {
    /* storage unavailable */
  }
}

/** The wallet's error code. viem wraps the wallet error, so the code can sit a few causes down. */
function code(e: unknown): number | undefined {
  let cur = e as { code?: number; cause?: unknown } | undefined;
  for (let i = 0; cur && i < 6; i++) {
    if (typeof cur.code === "number") return cur.code;
    cur = cur.cause as typeof cur;
  }
  return undefined;
}

function provider() {
  const p = getProvider();
  if (!p) throw new WalletError("no_provider", "MetaMask isn't installed in this browser.");
  return p;
}

function wrap(e: unknown, fallback: string): never {
  if (e instanceof WalletError) throw e;
  if (code(e) === 4001) throw new WalletError("rejected", "You declined the request in MetaMask.");
  if (code(e) === -32002) throw new WalletError("pending", "Open MetaMask to finish.");
  const msg = (e as { shortMessage?: string })?.shortMessage;
  throw new WalletError("unknown", msg ? `${fallback} ${msg}` : fallback);
}

/** Asks MetaMask for an account on BSC Testnet. Returns the checksummed address. */
export async function connectWallet(): Promise<Address> {
  const p = provider();
  try {
    const accounts = (await p.request({ method: "eth_requestAccounts" })) as string[];
    if (!accounts?.[0]) throw new WalletError("rejected", "You cancelled the connection.");
    await ensureBscTestnet(p);
    return getAddress(accounts[0]);
  } catch (e) {
    return wrap(e, "Couldn't connect the wallet.");
  }
}

/** Free personal_sign over the spec's auth message. Cached per action, survey and wallet. */
export async function signProof(action: AuthAction, surveyId: number, wallet: string, now = Date.now()): Promise<AuthProof> {
  const key = `${action}|${surveyId}|${wallet.toLowerCase()}`;
  const hit = proofs.get(key);
  if (hit && now - hit.timestamp < PROOF_TTL_MS) return hit;
  const p = provider();
  try {
    const message = buildAuthMessage(action, surveyId, wallet, now);
    const signature = (await p.request({ method: "personal_sign", params: [toHex(message), wallet] })) as Hex;
    const proof: AuthProof = { wallet: wallet.toLowerCase(), signature, timestamp: now };
    // Only reads are cached: a submit proof is single use.
    if (action === "view_log" || action === "list_surveys") {
      proofs.set(key, proof);
      saveProofs();
    }
    return proof;
  } catch (e) {
    return wrap(e, "Couldn't sign the request.");
  }
}

export function clearProofs() {
  proofs.clear();
  saveProofs();
}

function escrow(): Address {
  if (!ESCROW_ADDRESS) throw new WalletError("unknown", "The contract isn't deployed yet. Set NEXT_PUBLIC_CONTRACT_ADDRESS.");
  return getAddress(ESCROW_ADDRESS);
}

function clients(account: Address) {
  const transport = custom(provider());
  return {
    wallet: createWalletClient({ account, chain: bscTestnet, transport }),
    pub: createPublicClient({ chain: bscTestnet, transport }),
  };
}

export type CreateArgs = { surveyHash: Hex; rate: bigint; quota: number; deadline: number; feePerResponse: bigint; deposit: bigint };

/** createSurvey with the exact deposit. Returns the tx hash as soon as it exists. */
export async function sendCreateSurvey(account: Address, a: CreateArgs): Promise<Hex> {
  try {
    await ensureBscTestnet(provider());
    return await clients(account).wallet.writeContract({
      address: escrow(),
      abi: ESCROW_ABI,
      functionName: "createSurvey",
      args: [a.surveyHash, a.rate, BigInt(a.quota), BigInt(a.deadline), a.feePerResponse],
      value: a.deposit,
    });
  } catch (e) {
    return wrap(e, "The funding transaction failed.");
  }
}

export async function sendCloseSurvey(account: Address, surveyId: number): Promise<Hex> {
  try {
    await ensureBscTestnet(provider());
    return await clients(account).wallet.writeContract({
      address: escrow(),
      abi: ESCROW_ABI,
      functionName: "closeSurvey",
      args: [BigInt(surveyId)],
    });
  } catch (e) {
    return wrap(e, "The close transaction failed.");
  }
}

/** Waits for the receipt. Throws if the transaction reverted. */
export async function waitForTx(account: Address, hash: Hex): Promise<void> {
  try {
    const r = await clients(account).pub.waitForTransactionReceipt({ hash, timeout: 120_000 });
    if (r.status !== "success") throw new WalletError("unknown", "The transaction was reverted on-chain.");
  } catch (e) {
    wrap(e, "Couldn't confirm the transaction.");
  }
}
