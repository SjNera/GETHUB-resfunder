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

Current testnet deployment (Remix + MetaMask, record in `contracts/deployments/bscTestnet.json`):

| | |
|---|---|
| `SurveyEscrow` | `0x31F3E8161d4626BB932e0E3A3A9e53BC47688751` |
| agent | `0xA9E8986712c0b6784Ff5ad7c0a2FB13396561624` |
| platform | `0x346b021Feeb931A7Ddbc226d5df5e9eA4cD0a09d` |
| gas / profit per response | `18390000000000` / `20000000000000` wei |

Its runtime bytecode matches the local Hardhat build (immutables and metadata aside), so `lib/chain/abi.ts` is current.
The metadata hash differs from Hardhat's, so verify it from Remix or the BscScan upload page with the same settings.

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
- Checked live on 2026-11-13: `db:smoke`, `auth:smoke`, `screen()` against Groq, `npm run eval`, and read-only
  `lib/chain` calls against the deployment above. No decision or close has been sent on testnet yet.
- `GROQ_MODEL`: `llama-3.3-70b-versatile` is no longer served (404 `model_not_found`), and every response went to
  Review. Use `openai/gpt-oss-120b`. Eval: 0/20 genuine flagged, 18/20 junk caught, 3/3 injection caught.
- Only a code check can block payment. To see "Not paid" in a manual run, give an open-ended answer with no
  vowels (`xkcd bdfg hjkl`), one repeated character (`zzzzzz`), or the exact text of an earlier response.
  Keyboard mash with vowels (`asdf qwerty`) goes to Review.
