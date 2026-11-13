# Contracts (Lane A)

`SurveyEscrow.sol` on BNB Smart Chain testnet (chain 97), native tBNB. The spec is `docs/TDD.md` section 6.
This is its own npm package (Hardhat 3, viem toolbox, OpenZeppelin `ReentrancyGuard`), compiled with solc 0.8.28,
optimizer 200 runs, EVM cancun.

## Design in short

- No owner, no admin functions, no pause. Fee settings are immutable constructor arguments.
- `createSurvey(surveyHash, rate, quota, deadline, feePerResponse)`, payable, called by the researcher's wallet.
  `msg.value` must equal `rate × quota + quota × feePerResponse`. At funding, `quota × gasPerResponse` goes to the
  agent wallet and the rest of the fee goes to the platform wallet. The budget stays in the contract.
- `recordDecision(surveyId, respondent, decision, reasonHash)`: agent only, once per respondent. Pay sends `rate`.
- `closeSurvey(surveyId)`: the researcher any time; the agent only when full or past the deadline. Refunds the
  remaining budget to the researcher. The fee is not refunded.
- Errors: `ZeroAddress`, `InvalidSurvey`, `FeeTooLow`, `WrongDeposit`, `NotAgent`, `SurveyNotFound`,
  `SurveyNotOpen`, `AlreadyDecided`, `QuotaFull`, `AlreadyClosed`, `NotAllowed`, `TransferFailed`.

## Files

| Path | What |
|---|---|
| `contracts/SurveyEscrow.sol` | The contract (A1) |
| `contracts/mocks/Attackers.sol` | Test-only reentrancy and rejecting-receiver helpers. Never deployed. |
| `test/SurveyEscrow.ts` | 33 tests (A2) |
| `scripts/measure-gas.ts`, `GAS.md` | Gas measurement and fee values (A3) |
| `scripts/deploy.ts`, `scripts/export-abi.ts` | Deploy, and write `lib/chain/abi.ts` (A4) |
| `scripts/smoke.ts` | Fund, Pay, DontPay, close, refund check (A6) |
| `deployments/bscTestnet.json` | Written by the testnet deploy: address, tx, constructor args |

The app side of Lane A is `lib/chain/` (`abi.ts`, `client.ts`, `fee.ts`, `escrow.ts`) and `app/api/fee/`. Its
integration test runs from the repo root with `npm run test:chain` (local hardhat node on chain 97).

## Local commands (no .env needed)

```bash
npm install
npx hardhat build
npx hardhat test                          # 33 contract tests
npx hardhat run scripts/measure-gas.ts    # rewrites GAS.md (reads the public testnet gas price)
npx hardhat run scripts/deploy.ts         # local deploy (needs the fee env vars, see below)
npx hardhat run scripts/smoke.ts          # full lifecycle on a fresh local contract
npx hardhat run scripts/export-abi.ts     # rewrites ../lib/chain/abi.ts
```

## Testnet: finishing A4 and A6

Hardhat reads the root `.env`. Fill in: `CHAIN_RPC_URL`, `CHAIN_RPC_FALLBACK`, `DEPLOYER_PRIVATE_KEY` (funded),
`AGENT_PRIVATE_KEY`, `PLATFORM_WALLET_ADDRESS`, `BSCSCAN_API_KEY` (an Etherscan API V2 key), and the three fee
values from `GAS.md`. Re-run `measure-gas.ts` first so the gas price is current.

```bash
# A4: deploy (refuses without CONFIRM_DEPLOY=yes), then verify with the command it prints
CONFIRM_DEPLOY=yes npx hardhat run scripts/deploy.ts --network bscTestnet
npx hardhat verify etherscan --network bscTestnet <address> <agent> <platform> <gasPerResponse> <minProfit>
#     then set NEXT_PUBLIC_CONTRACT_ADDRESS=<address> in the root .env and tell the team

# A6: smoke test (refuses without CONFIRM_SMOKE=yes). Researcher = E2E_RESEARCHER_PRIVATE_KEY, else the deployer.
CONFIRM_SMOKE=yes npx hardhat run scripts/smoke.ts --network bscTestnet
```

On Windows PowerShell, set the flag first: `$env:CONFIRM_DEPLOY='yes'; npx hardhat run ...`.

A deploy cannot be undone. A wrong deploy means deploying again to a new address. The ABI is frozen after
deployment (AGENTS.md rule 10).
