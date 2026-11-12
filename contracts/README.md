# Contracts (Lane A)

`SurveyEscrow.sol` on BNB Smart Chain testnet (chain 97), native tBNB. The spec is `docs/TDD.md` section 6.
This is its own npm package (Hardhat 3, viem toolbox, OpenZeppelin `ReentrancyGuard`).

## Design in short

- No owner, no admin functions, no pause. Fee settings are immutable constructor arguments.
- `createSurvey(surveyHash, rate, quota, deadline, feePerResponse)`, payable, called by the researcher's wallet.
  `msg.value` must equal `rate × quota + quota × feePerResponse`. At funding, `quota × gasPerResponse` goes to the
  agent wallet and the rest of the fee goes to the platform wallet. The budget stays in the contract.
- `recordDecision(surveyId, respondent, decision, reasonHash)`: agent only, once per respondent. Pay sends `rate`.
- `closeSurvey(surveyId)`: the researcher any time; the agent only when full or past the deadline. Refunds the
  remaining budget to the researcher. The fee is not refunded.

## Commands

```bash
npm install
npx hardhat build
npx hardhat test
```

Deploy, verify, gas measurement and the smoke script are tasks A3, A4 and A6 in `docs/TDD.md` section 13.

## Hand-off to the app

After deploy (task A4): write `lib/chain/abi.ts` (`ESCROW_ABI` as a `const` array, `ESCROW_ADDRESS` from
`NEXT_PUBLIC_CONTRACT_ADDRESS`), set `NEXT_PUBLIC_CONTRACT_ADDRESS`, and tell the team. The ABI is frozen after
deployment.
