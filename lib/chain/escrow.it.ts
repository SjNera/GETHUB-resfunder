// Integration test for lib/chain against a local hardhat node reporting chain 97 (task A5).
//   npm run test:chain
// Starts `hardhat node`, deploys the compiled SurveyEscrow, and calls the real lib/chain functions
// over HTTP. Keys below are Hardhat's public test accounts, used only inside this process.
import { spawn, execSync, type ChildProcess } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  parseEther,
  toHex,
  type Address,
  type Hex,
  type PublicClient,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { bscTestnet } from 'viem/chains';
import { surveyHash } from '../canonical';
import type { SurveyJson } from '../types';
import demo from '../../data/demo-survey.json';

const PORT = 8547;
const RPC = `http://127.0.0.1:${PORT}`;
const CONTRACTS_DIR = new URL('../../contracts/', import.meta.url);

// Hardhat's well-known test accounts #0-#3 (public, never use on a real chain).
const KEYS = {
  deployer: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
  agent: '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
  platform: '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a',
  researcher: '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6',
} as const satisfies Record<string, Hex>;

const GAS = 18_390_000_000_000n;
const PROFIT = 20_000_000_000_000n;
const FEE = GAS + PROFIT;
const RATE = parseEther('0.001');
const QUOTA = 3n;
const REASON = keccak256(toHex('["Passed all checks."]'));

const respondents = {
  a: '0x00000000000000000000000000000000000000a1',
  b: '0x00000000000000000000000000000000000000b2',
  c: '0x00000000000000000000000000000000000000c3',
  d: '0x00000000000000000000000000000000000000d4',
} as const;

let node: ChildProcess | undefined;
let pub: PublicClient;
let escrowAddress: Address;
let createTx: Hex;
let chain: typeof import('./escrow');
let fee: typeof import('./fee');

const accounts = {
  deployer: privateKeyToAccount(KEYS.deployer),
  agent: privateKeyToAccount(KEYS.agent),
  platform: privateKeyToAccount(KEYS.platform),
  researcher: privateKeyToAccount(KEYS.researcher),
};
const wallet = (key: Hex) => createWalletClient({ account: privateKeyToAccount(key), chain: bscTestnet, transport: http(RPC) });

async function waitForNode(timeoutMs: number) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    try {
      const res = await fetch(RPC, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_chainId', params: [] }),
      });
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('hardhat node did not start');
}

function stopNode() {
  if (!node?.pid) return;
  if (process.platform === 'win32') {
    try {
      execSync(`taskkill /pid ${node.pid} /T /F`, { stdio: 'ignore' });
    } catch {
      // already gone
    }
  } else {
    node.kill('SIGTERM');
  }
}

async function rpc(method: string, params: unknown[]) {
  const res = await fetch(RPC, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const body = (await res.json()) as { error?: { message: string } };
  if (body.error) throw new Error(`${method}: ${body.error.message}`);
}

async function mined(hash: Hex) {
  return pub.waitForTransactionReceipt({ hash });
}

beforeAll(async () => {
  node = spawn('npx', ['hardhat', 'node', '--chain-id', '97', '--port', String(PORT)], {
    cwd: CONTRACTS_DIR,
    shell: true,
    stdio: 'ignore',
  });
  await waitForNode(90_000);

  pub = createPublicClient({ chain: bscTestnet, transport: http(RPC), pollingInterval: 200 });
  expect(await pub.getChainId()).toBe(97);

  const artifact = JSON.parse(
    await readFile(new URL('artifacts/contracts/SurveyEscrow.sol/SurveyEscrow.json', CONTRACTS_DIR), 'utf8'),
  ) as { abi: unknown[]; bytecode: Hex };
  const deployHash = await wallet(KEYS.deployer).deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode,
    args: [accounts.agent.address, accounts.platform.address, GAS, PROFIT],
  });
  const receipt = await mined(deployHash);
  escrowAddress = receipt.contractAddress!;

  // Server env, set before lib/chain is first imported (abi.ts reads the address at load).
  process.env.CHAIN_RPC_URL = RPC;
  delete process.env.CHAIN_RPC_FALLBACK;
  process.env.AGENT_PRIVATE_KEY = KEYS.agent;
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS = escrowAddress;
  process.env.FEE_PER_RESPONSE_WEI = FEE.toString();
  chain = await import('./escrow');
  fee = await import('./fee');
}, 120_000);

afterAll(() => stopNode());

describe('lib/chain against a local chain 97 node', () => {
  const abi = async () => (await import('./abi')).ESCROW_ABI;

  it('getFeePerResponse returns FEE_PER_RESPONSE_WEI', async () => {
    expect(await fee.getFeePerResponse()).toBe(FEE);
  });

  it('readSurveyCreated returns the event from a real createSurvey tx', async () => {
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
    const hash = surveyHash(demo as SurveyJson);
    createTx = await wallet(KEYS.researcher).writeContract({
      address: escrowAddress,
      abi: await abi(),
      functionName: 'createSurvey',
      args: [hash, RATE, QUOTA, deadline, FEE],
      value: RATE * QUOTA + QUOTA * FEE,
    });
    await mined(createTx);

    const ev = await chain.readSurveyCreated(createTx);
    expect(ev).toEqual({
      surveyId: 1,
      researcher: accounts.researcher.address.toLowerCase(),
      surveyHash: hash,
      rate: RATE,
      quota: 3,
      deadline: Number(deadline),
      feePerResponse: FEE,
    });
  });

  it('readSurveyCreated is null for an unknown hash, a tx to another address, and a Closed-only tx', async () => {
    expect(await chain.readSurveyCreated(`0x${'12'.repeat(32)}`)).toBeNull();
    const transfer = await wallet(KEYS.researcher).sendTransaction({ to: respondents.d, value: 1n });
    await mined(transfer);
    expect(await chain.readSurveyCreated(transfer)).toBeNull();
    expect(await chain.readClosed(createTx)).toBeNull();
  });

  it('sendDecision pay returns a hash at broadcast and pays exactly the rate', async () => {
    const before = await pub.getBalance({ address: respondents.a });
    const tx = await chain.sendDecision({ surveyId: 1, respondent: respondents.a, decision: 'pay', reasonHash: REASON });
    expect(tx).toMatch(/^0x[0-9a-f]{64}$/);
    expect(await chain.waitForReceipt(tx, 30_000)).toEqual({ state: 'success' });
    expect(await chain.getReceiptStatus(tx)).toEqual({ state: 'success' });
    expect((await pub.getBalance({ address: respondents.a })) - before).toBe(RATE);
  });

  it('two sendDecision calls at once are serialized and both confirm', async () => {
    const [t1, t2] = await Promise.all([
      chain.sendDecision({ surveyId: 1, respondent: respondents.b, decision: 'dont_pay', reasonHash: REASON }),
      chain.sendDecision({ surveyId: 1, respondent: respondents.c, decision: 'pay', reasonHash: REASON }),
    ]);
    expect(t1).not.toBe(t2);
    expect(await chain.waitForReceipt(t1, 30_000)).toEqual({ state: 'success' });
    expect(await chain.waitForReceipt(t2, 30_000)).toEqual({ state: 'success' });
    const [n1, n2] = await Promise.all([pub.getTransaction({ hash: t1 }), pub.getTransaction({ hash: t2 })]);
    expect(Math.abs(n1.nonce - n2.nonce)).toBe(1);
    expect(await pub.getBalance({ address: respondents.b })).toBe(0n);
  });

  it('sendDecision throws before a hash exists when the contract would revert', async () => {
    await expect(
      chain.sendDecision({ surveyId: 1, respondent: respondents.a, decision: 'pay', reasonHash: REASON }),
    ).rejects.toThrow(/AlreadyDecided/);
    // The queue keeps working after a failed send.
    await expect(
      chain.sendDecision({ surveyId: 99, respondent: respondents.d, decision: 'pay', reasonHash: REASON }),
    ).rejects.toThrow(/SurveyNotFound/);
  });

  it('getReceiptStatus is pending for an unknown hash and reverted for a mined revert', async () => {
    expect(await chain.getReceiptStatus(`0x${'34'.repeat(32)}`)).toEqual({ state: 'pending' });
    expect(await chain.waitForReceipt(`0x${'56'.repeat(32)}`, 1_500)).toEqual({ state: 'pending' });

    // A stranger's closeSurvey with a fixed gas limit skips estimation. With automine on, the local
    // node would reject it at send time; real chains mine it. So queue it and mine it by hand.
    await rpc('evm_setAutomine', [false]);
    let reverted: Hex;
    try {
      reverted = await wallet(KEYS.platform).writeContract({
        address: escrowAddress,
        abi: await abi(),
        functionName: 'closeSurvey',
        args: [1n],
        gas: 100_000n,
      });
      await rpc('evm_mine', []);
    } finally {
      await rpc('evm_setAutomine', [true]);
    }
    const status = await chain.waitForReceipt(reverted, 30_000);
    expect(status.state).toBe('reverted');
    expect(status.state === 'reverted' && status.error).toContain(reverted);
  });

  it('readClosed returns the refund from a real closeSurvey tx', async () => {
    const closeTx = await wallet(KEYS.researcher).writeContract({
      address: escrowAddress,
      abi: await abi(),
      functionName: 'closeSurvey',
      args: [1n],
    });
    await mined(closeTx);
    // Paid: a and c. Refund = budget - 2 x rate.
    expect(await chain.readClosed(closeTx)).toEqual({
      surveyId: 1,
      researcher: accounts.researcher.address.toLowerCase(),
      refunded: RATE * QUOTA - 2n * RATE,
    });
    expect(await chain.readSurveyCreated(closeTx)).toBeNull();
  });

  it('sendDecision on a closed survey throws SurveyNotOpen', async () => {
    await expect(
      chain.sendDecision({ surveyId: 1, respondent: respondents.d, decision: 'pay', reasonHash: REASON }),
    ).rejects.toThrow(/SurveyNotOpen/);
  });
});
