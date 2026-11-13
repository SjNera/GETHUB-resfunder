# Gas measurement (task A3)

Measured 2026-11-12T17:31:28.055Z with `npx hardhat run scripts/measure-gas.ts`.
Compiler: solc 0.8.28, optimizer 200 runs, EVM cancun (same profile as deploy).

## Gas units

| Call | Gas units |
|---|---|
| `recordDecision` Pay, first in survey, to a new address (worst case) | 122600 |
| `recordDecision` Pay, later, to an existing address | 80500 |
| `recordDecision` DontPay | 60385 |
| `createSurvey` (paid by the researcher) | 190216 |
| `closeSurvey` (paid by the caller) | 57833 |

The agent pays gas only for `recordDecision`, so the fee covers the worst case: **122600 units**.

## Fee settings

| Value | Wei | tBNB |
|---|---|---|
| Testnet gas price (public bscTestnet RPC eth_gasPrice) | 100000000 | 0.1 gwei |
| `GAS_PER_RESPONSE_WEI` = 122600 x gas price x 1.5 | 18390000000000 | 0.00001839 |
| `MIN_PROFIT_PER_RESPONSE_WEI` (placeholder, team to confirm) | 20000000000000 | 0.00002 |
| `FEE_PER_RESPONSE_WEI` = gas + profit | 38390000000000 | 0.00003839 |

Example: a survey with rate 0.001 tBNB and quota 150 deposits
0.15 tBNB budget + 0.0057585 tBNB fee = 0.1557585 tBNB.

## Set in the root `.env`

```
GAS_PER_RESPONSE_WEI=18390000000000
MIN_PROFIT_PER_RESPONSE_WEI=20000000000000
FEE_PER_RESPONSE_WEI=38390000000000
```

The contract's fee settings are immutable. Re-run this script right before deploying (task A4);
changing them later means a new deployment.
