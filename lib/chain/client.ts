// Lane A. viem clients for BSC testnet (chain 97). Server only: never import from a client component.
// Created lazily so builds and tests can import this module without chain env vars.
import {
  createPublicClient,
  createWalletClient,
  fallback,
  http,
  type Account,
  type Chain,
  type Hex,
  type PublicClient,
  type Transport,
  type WalletClient,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { bscTestnet } from 'viem/chains';

export const CHAIN = bscTestnet;

const RPC_TIMEOUT_MS = 10_000;
const POLLING_INTERVAL_MS = 1_000;

function transport(): Transport {
  const urls = [process.env.CHAIN_RPC_URL, process.env.CHAIN_RPC_FALLBACK]
    .map((u) => u?.trim())
    .filter((u): u is string => !!u);
  if (urls.length === 0) throw new Error('CHAIN_RPC_URL is not set');
  // The first URL is used unless it fails; then the fallback is tried.
  return fallback(urls.map((url) => http(url, { timeout: RPC_TIMEOUT_MS })));
}

let publicClient: PublicClient<Transport, Chain> | undefined;
let agentClient: WalletClient<Transport, Chain, Account> | undefined;

export function getPublicClient(): PublicClient<Transport, Chain> {
  publicClient ??= createPublicClient({ chain: CHAIN, transport: transport(), pollingInterval: POLLING_INTERVAL_MS });
  return publicClient;
}

/** Wallet client signed by AGENT_PRIVATE_KEY. The key is never logged. */
export function getAgentWalletClient(): WalletClient<Transport, Chain, Account> {
  if (!agentClient) {
    const raw = process.env.AGENT_PRIVATE_KEY?.trim();
    if (!raw) throw new Error('AGENT_PRIVATE_KEY is not set');
    const key = (raw.startsWith('0x') ? raw : `0x${raw}`) as Hex;
    agentClient = createWalletClient({ account: privateKeyToAccount(key), chain: CHAIN, transport: transport() });
  }
  return agentClient;
}
