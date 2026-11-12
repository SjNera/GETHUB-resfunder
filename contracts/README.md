# Contracts

The contract (`SurveyEscrow.sol`) and the mock token (`MockToken.sol`, labelled as a test token) are written,
compiled, deployed and verified in **Remix IDE** (remix.ethereum.org). This folder holds a copy of the exact
source that was verified on BscScan, so the code lives in Git. There is no build tooling here on purpose.

## Hand-off to the frontend

The web app runs in **demo mode** (every transaction simulated) until these steps are done:

1. **Deploy** from Remix using *Injected Provider – MetaMask* on **BSC Testnet (chain 97)**. You need testnet
   BNB from the BNB Chain faucet for gas.
2. **Verify** both contracts with Remix's contract-verification plugin or BscScan's "Verify & Publish".
3. **Copy the source** of both `.sol` files into this folder and commit them.
4. **Copy the ABI**: in Remix's Solidity compiler tab, click **ABI**. Paste it into
   `web/src/lib/web3/abi/surveyEscrow.ts`, keeping `as const` at the end.
5. **Set the addresses** in `web/.env.local` (and in Vercel → Project → Environment Variables):

   ```bash
   NEXT_PUBLIC_ESCROW_ADDRESS=0x...
   NEXT_PUBLIC_TOKEN_ADDRESS=0x...
   ```

## What the frontend calls today

The stub ABI in `web/src/lib/web3/abi/surveyEscrow.ts` assumes:

| Function | Arguments |
|---|---|
| `approve` (ERC-20, on the token) | `spender = escrow`, `amount = rate × quota + 5%` in 18-decimal units |
| `createSurvey` | `bytes32 surveyHash, uint256 rate, uint256 quota, uint64 deadline` (unix seconds) |
| `closeSurvey` | `bytes32 surveyHash` |

If the real signatures differ, update the stub **and** the call in `web/src/components/researcher/fund.tsx`.
The 5% fee is computed with integer division (`budget * 500 / 10000`, rounded down); the contract must round
the same way, or the approval amount won't match.

Payouts (`recordDecision`, `resolveReview`, `claimAfterTimeout`, `appeal`) are sent by the server agent key,
not the browser, so they belong to the backend work.
