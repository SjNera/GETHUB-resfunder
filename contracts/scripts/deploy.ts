// Task A4: deploy SurveyEscrow. Source: docs/TDD.md section 6.5.
//
//   Testnet:  CONFIRM_DEPLOY=yes npx hardhat run scripts/deploy.ts --network bscTestnet
//   Local:    npx hardhat run scripts/deploy.ts
//
// Constructor: (agent, PLATFORM_WALLET_ADDRESS, GAS_PER_RESPONSE_WEI, MIN_PROFIT_PER_RESPONSE_WEI).
// The agent address comes from AGENT_ADDRESS, else is derived from AGENT_PRIVATE_KEY. Keys are never printed.
// On a real chain, writes contracts/deployments/<network>.json and prints the verify command.
import { mkdir, writeFile } from 'node:fs/promises';
import { network } from 'hardhat';
import { getAddress, isAddress, type Address, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const LOCAL_CHAIN_IDS = new Set([31337]);

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`${name} is not set. Add it to the root .env.`);
  return v;
}

function requireWei(name: string): bigint {
  const v = requireEnv(name);
  if (!/^\d+$/.test(v)) throw new Error(`${name} must be a decimal wei amount, got "${v}".`);
  return BigInt(v);
}

function requireAddress(name: string, value: string): Address {
  if (!isAddress(value, { strict: false })) throw new Error(`${name} is not a valid address.`);
  return getAddress(value);
}

function agentAddress(): Address {
  if (process.env.AGENT_ADDRESS) return requireAddress('AGENT_ADDRESS', process.env.AGENT_ADDRESS);
  const key = requireEnv('AGENT_PRIVATE_KEY');
  const hex = (key.startsWith('0x') ? key : `0x${key}`) as Hex;
  return privateKeyToAccount(hex).address;
}

const connection = await network.create();
const { viem, networkName } = connection;
const publicClient = await viem.getPublicClient();
const [deployer] = await viem.getWalletClients();
const chainId = await publicClient.getChainId();
const isLocal = LOCAL_CHAIN_IDS.has(chainId) || networkName === 'default' || networkName === 'localBsc';

const agent = agentAddress();
const platform = requireAddress('PLATFORM_WALLET_ADDRESS', requireEnv('PLATFORM_WALLET_ADDRESS'));
const gasPerResponse = requireWei('GAS_PER_RESPONSE_WEI');
const minProfitPerResponse = requireWei('MIN_PROFIT_PER_RESPONSE_WEI');

console.log(`Network:   ${networkName} (chain ${chainId})`);
console.log(`Deployer:  ${deployer.account.address}`);
console.log(`Agent:     ${agent}`);
console.log(`Platform:  ${platform}`);
console.log(`Gas/resp:  ${gasPerResponse} wei`);
console.log(`Profit:    ${minProfitPerResponse} wei`);

if (!isLocal && process.env.CONFIRM_DEPLOY !== 'yes') {
  throw new Error('Refusing to deploy to a real chain without CONFIRM_DEPLOY=yes.');
}
if (!isLocal) {
  const balance = await publicClient.getBalance({ address: deployer.account.address });
  if (balance === 0n) throw new Error('Deployer has no tBNB. Use the BNB Chain testnet faucet.');
}

const args = [agent, platform, gasPerResponse, minProfitPerResponse] as const;
const { contract: escrow, deploymentTransaction } = await viem.sendDeploymentTransaction('SurveyEscrow', [...args]);
console.log(`Deploy tx: ${deploymentTransaction.hash}`);
const receipt = await publicClient.waitForTransactionReceipt({ hash: deploymentTransaction.hash });
if (receipt.status !== 'success') throw new Error('Deployment reverted.');

// Read back the immutables to confirm the constructor arguments.
const onChain = {
  agent: await escrow.read.agent(),
  platform: await escrow.read.platform(),
  gasPerResponse: await escrow.read.gasPerResponse(),
  minProfitPerResponse: await escrow.read.minProfitPerResponse(),
};
if (
  onChain.agent !== agent ||
  onChain.platform !== platform ||
  onChain.gasPerResponse !== gasPerResponse ||
  onChain.minProfitPerResponse !== minProfitPerResponse
) {
  throw new Error('Deployed contract settings do not match the constructor arguments.');
}

console.log(`\nSurveyEscrow deployed at ${escrow.address} (block ${receipt.blockNumber}, gas ${receipt.gasUsed})`);

if (!isLocal) {
  const record = {
    network: networkName,
    chainId,
    address: escrow.address,
    deployTxHash: deploymentTransaction.hash,
    blockNumber: Number(receipt.blockNumber),
    constructorArgs: { agent, platform, gasPerResponse: gasPerResponse.toString(), minProfitPerResponse: minProfitPerResponse.toString() },
    deployedAt: new Date().toISOString(),
  };
  const dir = new URL('../deployments/', import.meta.url);
  await mkdir(dir, { recursive: true });
  await writeFile(new URL(`${networkName}.json`, dir), JSON.stringify(record, null, 2) + '\n');
  console.log(`Explorer:  https://testnet.bscscan.com/address/${escrow.address}`);
  console.log(`Saved:     contracts/deployments/${networkName}.json`);
  console.log(`\nNext:`);
  console.log(`  npx hardhat verify etherscan --network ${networkName} ${escrow.address} ${args.join(' ')}`);
  console.log(`  set NEXT_PUBLIC_CONTRACT_ADDRESS=${escrow.address} in the root .env`);
}
