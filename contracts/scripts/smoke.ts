// Task A6: chain smoke test. Funds a tiny survey, records one Pay and one DontPay, closes, checks the
// refund, and prints BscScan links. Source: docs/TDD.md section 9.
//
//   Local:    npx hardhat run scripts/smoke.ts
//             (deploys a fresh contract on the in-process chain)
//   Testnet:  CONFIRM_SMOKE=yes npx hardhat run scripts/smoke.ts --network bscTestnet
//             (uses the deployed contract; researcher = E2E_RESEARCHER_PRIVATE_KEY, else the deployer;
//              agent = AGENT_PRIVATE_KEY)
// Keys are never printed.
import { readFile } from 'node:fs/promises';
import { network } from 'hardhat';
import {
  createWalletClient,
  custom,
  formatEther,
  getAddress,
  isAddress,
  keccak256,
  parseEther,
  parseEventLogs,
  toHex,
  type Address,
  type Hex,
} from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

const RATE = parseEther('0.0001');
const QUOTA = 2n;
// Hardhat's public test account #1. Used as the agent only on the local in-process chain.
const LOCAL_AGENT_KEY: Hex = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';
const LOCAL_GAS = 18_390_000_000_000n;
const LOCAL_PROFIT = 20_000_000_000_000n;

const toKey = (raw: string): Hex => (raw.startsWith('0x') ? raw : `0x${raw}`) as Hex;

const connection = await network.create();
const { viem, networkName, provider } = connection;
const publicClient = await viem.getPublicClient();
const chainId = await publicClient.getChainId();
const isLocal = networkName === 'default' || chainId === 31337;
const explorer = (kind: 'tx' | 'address', v: string) => (isLocal ? v : `https://testnet.bscscan.com/${kind}/${v}`);

if (!isLocal && process.env.CONFIRM_SMOKE !== 'yes') {
  throw new Error('Refusing to send testnet transactions without CONFIRM_SMOKE=yes.');
}

const [defaultWallet] = await viem.getWalletClients();
const agentKey = isLocal ? LOCAL_AGENT_KEY : process.env.AGENT_PRIVATE_KEY?.trim();
if (!agentKey) throw new Error('AGENT_PRIVATE_KEY is not set.');
const agent = createWalletClient({ account: privateKeyToAccount(toKey(agentKey)), transport: custom(provider) });
const researcherKey = process.env.E2E_RESEARCHER_PRIVATE_KEY?.trim();
const researcher = researcherKey && !isLocal
  ? createWalletClient({ account: privateKeyToAccount(toKey(researcherKey)), transport: custom(provider) })
  : defaultWallet;

async function escrowAddress(): Promise<Address> {
  if (isLocal) {
    const platform = (await viem.getWalletClients())[2].account.address;
    const c = await viem.deployContract('SurveyEscrow', [agent.account.address, platform, LOCAL_GAS, LOCAL_PROFIT]);
    return c.address;
  }
  const fromEnv = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS?.trim();
  if (fromEnv && isAddress(fromEnv, { strict: false })) return getAddress(fromEnv);
  try {
    const record = JSON.parse(await readFile(new URL(`../deployments/${networkName}.json`, import.meta.url), 'utf8'));
    return getAddress(record.address);
  } catch {
    throw new Error('No contract address. Set NEXT_PUBLIC_CONTRACT_ADDRESS or deploy first (task A4).');
  }
}

const address = await escrowAddress();
const escrow = await viem.getContractAt('SurveyEscrow', address);
const abi = escrow.abi;

async function send(label: string, hash: Promise<Hex>) {
  const h = await hash;
  const receipt = await publicClient.waitForTransactionReceipt({ hash: h });
  if (receipt.status !== 'success') throw new Error(`${label} reverted: ${h}`);
  console.log(`  ${label.padEnd(16)} ${explorer('tx', h)}  (gas ${receipt.gasUsed})`);
  return receipt;
}

const onChainAgent = await escrow.read.agent();
if (onChainAgent !== agent.account.address) {
  throw new Error(`AGENT_PRIVATE_KEY is not the contract's agent (${onChainAgent}).`);
}
const fee = (await escrow.read.gasPerResponse()) + (await escrow.read.minProfitPerResponse());
const deposit = RATE * QUOTA + QUOTA * fee;
const latest = await publicClient.getBlock();
const deadline = latest.timestamp + 3600n;
const respondentPay = privateKeyToAccount(generatePrivateKey()).address;
const respondentBlock = privateKeyToAccount(generatePrivateKey()).address;
const reasonPay = keccak256(toHex('["Passed all checks."]'));
const reasonBlock = keccak256(toHex('["An open-ended answer was not readable text."]'));

console.log(`Network:    ${networkName} (chain ${chainId})`);
console.log(`Contract:   ${explorer('address', address)}`);
console.log(`Researcher: ${researcher.account.address}`);
console.log(`Agent:      ${agent.account.address}`);
console.log(`Survey:     rate ${formatEther(RATE)} tBNB x quota ${QUOTA}, fee ${formatEther(fee)}/response, deposit ${formatEther(deposit)} tBNB\n`);

const balance = await publicClient.getBalance({ address: researcher.account.address });
if (balance < deposit) throw new Error(`Researcher has ${formatEther(balance)} tBNB, needs ${formatEther(deposit)} plus gas.`);

console.log('Transactions:');
const createReceipt = await send(
  'createSurvey',
  researcher.writeContract({
    address,
    abi,
    functionName: 'createSurvey',
    args: [keccak256(toHex(`smoke ${Date.now()}`)), RATE, QUOTA, deadline, fee],
    value: deposit,
    chain: null,
  }),
);
const [created] = parseEventLogs({ abi, eventName: 'SurveyCreated', logs: createReceipt.logs });
const surveyId = created.args.surveyId;

await send(
  'Pay',
  agent.writeContract({ address, abi, functionName: 'recordDecision', args: [surveyId, respondentPay, 1, reasonPay], chain: null }),
);
await send(
  'DontPay',
  agent.writeContract({ address, abi, functionName: 'recordDecision', args: [surveyId, respondentBlock, 0, reasonBlock], chain: null }),
);
const closeReceipt = await send(
  'closeSurvey',
  researcher.writeContract({ address, abi, functionName: 'closeSurvey', args: [surveyId], chain: null }),
);

const [closed] = parseEventLogs({ abi, eventName: 'Closed', logs: closeReceipt.logs });
const paidBalance = await publicClient.getBalance({ address: respondentPay });
const blockedBalance = await publicClient.getBalance({ address: respondentBlock });
const expectedRefund = RATE * QUOTA - RATE;

const checks: [string, boolean][] = [
  [`survey #${surveyId} created`, surveyId > 0n],
  [`paid respondent received ${formatEther(RATE)} tBNB`, paidBalance === RATE],
  ['blocked respondent received nothing', blockedBalance === 0n],
  [`refund ${formatEther(closed.args.refunded)} tBNB = budget - 1 x rate`, closed.args.refunded === expectedRefund],
];
console.log('\nChecks:');
for (const [label, ok] of checks) console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}`);
if (checks.some(([, ok]) => !ok)) {
  process.exitCode = 1;
  throw new Error('Smoke test failed.');
}
console.log('\nSmoke test passed.');
