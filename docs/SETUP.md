# Setup: from a fresh clone to a working run

Everything below is a command or a value. Put values in `.env` (git-ignored). Never commit it.

## 1. Accounts to create

| Need | Where | `.env` names |
|---|---|---|
| Postgres | Neon (use the pooled connection string) | `DATABASE_URL` |
| AI label | Groq | `GROQ_API_KEY`, `GROQ_MODEL` |
| Chain RPC | Any BSC testnet RPC | `CHAIN_RPC_URL`, `CHAIN_RPC_FALLBACK` |
| Wallets | MetaMask, funded with tBNB from a faucet | `DEPLOYER_PRIVATE_KEY`, `AGENT_PRIVATE_KEY`, `PLATFORM_WALLET_ADDRESS` |
| Verification | BscScan (Etherscan API v2 key) | `BSCSCAN_API_KEY` |

Also generate two secrets: `openssl rand -hex 32` for `HASH_SECRET` and again for `BETTER_AUTH_SECRET`.
Set `BETTER_AUTH_URL` to the address the browser uses (`http://localhost:3000` in dev, the Vercel URL in production).

## 2. Database

```bash
npm run db:apply        # surveys, responses, decisions (lib/db/schema.sql)
npm run db:apply:auth   # Better Auth tables (lib/db/auth-schema.sql)
npm run auth:smoke      # nonce -> SIWE signature -> session -> sign-out, with a throwaway key
npm run db:smoke        # one row per table
```

## 3. Contract

```bash
cd contracts
npm install
# set the three fee values from contracts/GAS.md in .env first; confirm MIN_PROFIT_PER_RESPONSE_WEI
npx hardhat run scripts/deploy.ts --network bscTestnet
npx hardhat run scripts/export-abi.ts
```

Then put the printed address in `NEXT_PUBLIC_CONTRACT_ADDRESS` and rebuild (it is read at build time).
The fee values are immutable in the contract. Changing them means a new deployment.

## 4. Check the backend before trusting the UI

```bash
npm run dev
npm run e2e -- --stubs     # needs the server and DATABASE_URL
npm run e2e                # full run: deployed contract, real screening
```

## 5. Try the UI with MetaMask on BSC Testnet

1. `/sign-in`: email + MetaMask. One email maps to one wallet.
2. `/publish`: build questions, set rate, quota and deadline, then Fund.
3. Open the share link `/s/<id>` in a second browser profile, sign in with another wallet, and answer.
4. `/surveys`: open the survey, check the decision log, then Close and refund.

## Known limits

- Email is a label. It is not verified yet (deferred, see AGENTS.md section 9).
- Better Auth stores wallet addresses checksummed. Application tables store them lowercase.
- Review actions, pause (R10) and CSV export (R11) are not built.
- Nothing here has run against Neon, BSC testnet or Groq yet. Expect a first-run debugging pass.
