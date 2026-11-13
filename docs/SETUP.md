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
Set `BETTER_AUTH_URL=http://localhost:3000` for local dev. On Vercel, leave it unset (see section 6).

## 2. Database

```bash
npm run db:apply        # surveys, responses, decisions (lib/db/schema.sql)
npm run db:apply:auth   # Better Auth tables (lib/db/auth-schema.sql)
npm run db:apply:app    # profiles (lib/db/app-schema.sql)
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

## 6. Deploy on Vercel

Vercel detects Next.js; no `vercel.json` is needed. Build command `npm run build`, Node.js 24.

1. Import the GitHub repo `SjNera/GETHUB-resfunder` in Vercel (New Project → Import Git Repository), root directory `/`,
   framework Next.js. The `contracts/` package is not built. With the repo connected, **every push deploys**: a push to
   `main` deploys Production, a push to any other branch (and each pull request) gets its own Preview URL. Keep
   Settings → Git → "Automatically deploy" on (the default). No workflow file or token is needed.
2. Add the environment variables below in Project Settings → Environment Variables. Never add `DEPLOYER_PRIVATE_KEY`
   or the `E2E_*` keys to Vercel.

| Name | Environments | Note |
|---|---|---|
| `NEXT_PUBLIC_CHAIN_ID` | all | `97`. Read at build time |
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | all | Read at build time: redeploy after changing it |
| `CHAIN_RPC_URL`, `CHAIN_RPC_FALLBACK` | all | |
| `AGENT_PRIVATE_KEY` | all | Sensitive |
| `FEE_PER_RESPONSE_WEI` | all | |
| `GROQ_API_KEY`, `GROQ_MODEL` | all | `GROQ_API_KEY` sensitive |
| `DATABASE_URL` | all | Neon pooled string. A separate Neon branch for Preview keeps test data apart |
| `HASH_SECRET` | all | Sensitive. The same value as before: changing it breaks duplicate-email checks |
| `BETTER_AUTH_SECRET` | all | Sensitive, 32+ characters |
| `REQUIRE_RESEARCHER_AUTH` | all | `true` |
| `BETTER_AUTH_URL` | Production only, optional | Only for a custom domain, e.g. `https://resfunder.app` |

3. `BETTER_AUTH_URL` decides which address the wallet sign-in accepts. Unset on Vercel, the app uses
   `VERCEL_PROJECT_PRODUCTION_URL` in production and `VERCEL_BRANCH_URL` on previews
   (`lib/auth/better-auth.ts`, `appUrl()`). Open a preview from its branch URL, not the per-commit URL, or set
   `BETTER_AUTH_URL` for that environment. Setting it to the production URL for Preview breaks preview sign-in.
4. Before the first production deploy, create the tables in the production database:
   `npm run db:apply && npm run db:apply:auth && npm run db:apply:app` with that `DATABASE_URL` in `.env`.
5. After deploying: open the site, Create account (MetaMask on BSC Testnet), log out, log in with email and password,
   fund a small survey, answer it from a second wallet, and check the decision log.
6. `/lab` is off in production (`labEnabled()` needs `LAB_ENABLED=true` and a non-production build). Don't set `LAB_ENABLED` on Vercel.

## Known limits

- Email is a label. It is not verified, and nothing in the app sends email (there is no email service or dependency).
- Better Auth stores wallet addresses checksummed. Application tables store them lowercase.
- A review is never paid or rejected by itself. Undecided reviews stay unpaid until the researcher decides (no 24-hour auto-pay).
- Review decisions use the sign-in session plus the survey's researcher wallet. The per-action signature (`AuthAction`)
  has no "decide" action, and `lib/types.ts` is frozen. Adding one needs all three devs.
- Paying or rejecting a response in review is recorded on chain, so it is final and can't be undone. It needs the survey to be
  open: after the deadline or a close the contract refuses it, and the dashboard says so. There are no appeals.
- The log route (R8) still returns each respondent's email to the researcher. The dashboard doesn't show it.
- Sign-up answers are saved on the server (profiles table) but researchers don't see them yet.
- CSV export (R11) is not built on the server. The dashboard exports the decision log in the browser.
- Checked live on 2026-11-13: `db:smoke`, `auth:smoke`, `screen()` against Groq, `npm run eval`, and read-only
  `lib/chain` calls against the deployment above. Funding, paying, review decisions and close still need a manual run with MetaMask.
- `GROQ_MODEL`: `llama-3.3-70b-versatile` is no longer served (404 `model_not_found`), and every response went to
  Review. Use `openai/gpt-oss-120b`. Eval: 0/20 genuine flagged, 18/20 junk caught, 3/3 injection caught.
- Only a code check can block payment on its own. To see "Not paid" in a manual run, give an open-ended answer with no
  vowels (`xkcd bdfg hjkl`), one repeated character (`zzzzzz`), or the exact text of an earlier response.
  Keyboard mash with vowels (`asdf qwerty`) goes to Review, where the researcher decides.
