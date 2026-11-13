import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Integration tests against a local hardhat node (chain 97). Run with: npm run test:chain
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
  test: {
    include: ['lib/chain/**/*.it.ts'],
    testTimeout: 60_000,
    hookTimeout: 120_000,
    fileParallelism: false,
  },
});
