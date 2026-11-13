import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { configVariable, defineConfig } from 'hardhat/config';
import hardhatToolboxViemPlugin from '@nomicfoundation/hardhat-toolbox-viem';

// Load the shared root .env (git-ignored) if present. Config variables below are
// read lazily, only by tasks that need them.
const ROOT_ENV = fileURLToPath(new URL('../.env', import.meta.url));
if (existsSync(ROOT_ENV)) process.loadEnvFile(ROOT_ENV);

export default defineConfig({
  plugins: [hardhatToolboxViemPlugin],
  solidity: {
    // One profile for tests, gas measurement and deploy, so measured gas matches production.
    profiles: {
      default: {
        version: '0.8.28',
        settings: { optimizer: { enabled: true, runs: 200 }, evmVersion: 'cancun' },
      },
    },
  },
  networks: {
    bscTestnet: {
      type: 'http',
      chainType: 'l1',
      chainId: 97,
      url: configVariable('CHAIN_RPC_URL'),
      accounts: [configVariable('DEPLOYER_PRIVATE_KEY')],
    },
    // Local simulated chain that reports chain ID 97, for running lib/chain against `hardhat node`.
    localBsc: {
      type: 'edr-simulated',
      chainType: 'l1',
      chainId: 97,
    },
  },
  // Etherscan API V2: one key covers BSC testnet (chain 97).
  verify: {
    etherscan: { apiKey: configVariable('BSCSCAN_API_KEY') },
  },
});
