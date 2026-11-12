// Task A3: measure recordDecision gas and derive the fee settings. Source: docs/TDD.md section 6.5.
//
//   npx hardhat run scripts/measure-gas.ts
//
// Gas units are measured on the local simulated chain with the production compiler settings.
// The gas price is read from BSC testnet (CHAIN_RPC_URL, else viem's public bscTestnet RPC),
// or taken from GAS_PRICE_WEI if set. Writes contracts/GAS.md.
import { writeFile } from 'node:fs/promises';
import { network } from 'hardhat';
import { createPublicClient, formatEther, formatGwei, http, keccak256, parseEther, toHex, type Hash } from 'viem';
import { bscTestnet } from 'viem/chains';

const MARGIN_NUM = 15n; // x 1.5 (TDD 6.5)
const MARGIN_DEN = 10n;
// Team choice. Placeholder until the team confirms: 0.00002 tBNB.
const DEFAULT_MIN_PROFIT_WEI = parseEther('0.00002');

const { viem, networkHelpers } = await network.create();
const publicClient = await viem.getPublicClient();
const [, agent, platform, researcher, r1, r2] = await viem.getWalletClients();

async function gasOf(hash: Promise<Hash>): Promise<bigint> {
  const receipt = await publicClient.waitForTransactionReceipt({ hash: await hash });
  if (receipt.status !== 'success') throw new Error('transaction reverted');
  return receipt.gasUsed;
}

// Measurement deploy: fee settings do not change recordDecision gas.
const escrow = await viem.deployContract('SurveyEscrow', [agent.account.address, platform.account.address, 1n, 1n]);
const rate = parseEther('0.001');
const quota = 3n;
const fee = 2n;
const deadline = BigInt(await networkHelpers.time.latest()) + 3600n;
const reason = keccak256(toHex('["Passed all checks."]'));

const createGas = await gasOf(
  escrow.write.createSurvey([keccak256(toHex('survey')), rate, quota, deadline, fee], {
    account: researcher.account,
    value: rate * quota + quota * fee,
  }),
);

// Worst case: first Pay in the survey (paidCount 0 -> 1) to an address that has never held funds.
const freshAccount = `0x${'00'.repeat(19)}a3` as const;
const payFirstFreshGas = await gasOf(
  escrow.write.recordDecision([1n, freshAccount, 1, reason], { account: agent.account }),
);
// A later Pay to an existing account.
const payLaterGas = await gasOf(escrow.write.recordDecision([1n, r1.account.address, 1, reason], { account: agent.account }));
const dontPayGas = await gasOf(escrow.write.recordDecision([1n, r2.account.address, 0, reason], { account: agent.account }));
const closeGas = await gasOf(escrow.write.closeSurvey([1n], { account: researcher.account }));

const maxUnits = [payFirstFreshGas, payLaterGas, dontPayGas].reduce((a, b) => (a > b ? a : b));

let gasPrice: bigint;
let gasPriceSource: string;
if (process.env.GAS_PRICE_WEI) {
  gasPrice = BigInt(process.env.GAS_PRICE_WEI);
  gasPriceSource = 'GAS_PRICE_WEI override';
} else {
  const url = process.env.CHAIN_RPC_URL || undefined;
  const testnet = createPublicClient({ chain: bscTestnet, transport: http(url) });
  gasPrice = await testnet.getGasPrice();
  gasPriceSource = url ? 'CHAIN_RPC_URL eth_gasPrice' : 'public bscTestnet RPC eth_gasPrice';
}

const gasPerResponse = (maxUnits * gasPrice * MARGIN_NUM) / MARGIN_DEN;
const minProfit = process.env.MIN_PROFIT_PER_RESPONSE_WEI
  ? BigInt(process.env.MIN_PROFIT_PER_RESPONSE_WEI)
  : DEFAULT_MIN_PROFIT_WEI;
const minProfitSource = process.env.MIN_PROFIT_PER_RESPONSE_WEI ? 'MIN_PROFIT_PER_RESPONSE_WEI' : 'placeholder, team to confirm';
const feePerResponse = gasPerResponse + minProfit;
const measuredAt = new Date().toISOString();

const bnb = (wei: bigint) => `${formatEther(wei)} tBNB`;

const md = `# Gas measurement (task A3)

Measured ${measuredAt} with \`npx hardhat run scripts/measure-gas.ts\`.
Compiler: solc 0.8.28, optimizer 200 runs, EVM cancun (same profile as deploy).

## Gas units

| Call | Gas units |
|---|---|
| \`recordDecision\` Pay, first in survey, to a new address (worst case) | ${payFirstFreshGas} |
| \`recordDecision\` Pay, later, to an existing address | ${payLaterGas} |
| \`recordDecision\` DontPay | ${dontPayGas} |
| \`createSurvey\` (paid by the researcher) | ${createGas} |
| \`closeSurvey\` (paid by the caller) | ${closeGas} |

The agent pays gas only for \`recordDecision\`, so the fee covers the worst case: **${maxUnits} units**.

## Fee settings

| Value | Wei | tBNB |
|---|---|---|
| Testnet gas price (${gasPriceSource}) | ${gasPrice} | ${formatGwei(gasPrice)} gwei |
| \`GAS_PER_RESPONSE_WEI\` = ${maxUnits} x gas price x 1.5 | ${gasPerResponse} | ${formatEther(gasPerResponse)} |
| \`MIN_PROFIT_PER_RESPONSE_WEI\` (${minProfitSource}) | ${minProfit} | ${formatEther(minProfit)} |
| \`FEE_PER_RESPONSE_WEI\` = gas + profit | ${feePerResponse} | ${formatEther(feePerResponse)} |

Example: a survey with rate 0.001 tBNB and quota 150 deposits
${bnb(parseEther('0.001') * 150n)} budget + ${bnb(150n * feePerResponse)} fee = ${bnb(parseEther('0.001') * 150n + 150n * feePerResponse)}.

## Set in the root \`.env\`

\`\`\`
GAS_PER_RESPONSE_WEI=${gasPerResponse}
MIN_PROFIT_PER_RESPONSE_WEI=${minProfit}
FEE_PER_RESPONSE_WEI=${feePerResponse}
\`\`\`

The contract's fee settings are immutable. Re-run this script right before deploying (task A4);
changing them later means a new deployment.
`;

await writeFile(new URL('../GAS.md', import.meta.url), md);
console.log(md);
