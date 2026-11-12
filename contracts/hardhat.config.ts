import { configVariable, defineConfig } from 'hardhat/config';
import hardhatToolboxViemPlugin from '@nomicfoundation/hardhat-toolbox-viem';

// Config variables are read lazily (env or hardhat-keystore), only when a task needs them.
export default defineConfig({
  plugins: [hardhatToolboxViemPlugin],
  solidity: {
    profiles: {
      default: { version: '0.8.28' },
      production: {
        version: '0.8.28',
        settings: { optimizer: { enabled: true, runs: 200 } },
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
  },
});
