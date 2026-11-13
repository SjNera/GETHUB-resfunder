# ResFunder

**Fund research. Pay honest answers.**

![BNB Smart Chain testnet](https://img.shields.io/badge/BNB%20Smart%20Chain-testnet-F0B90B)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![Solidity](https://img.shields.io/badge/Solidity-0.8.28-363636)
![License: MIT](https://img.shields.io/badge/license-MIT-green)

BCC 2026 Hackathon (Binance Academy) · AI Agents track.

- **Live demo:** _Vercel deployment link coming soon._ ResFunder will be deployed on [Vercel](https://vercel.com).
- **Demo video / deck:** _coming soon._

## The problem

Student researchers struggle to get enough honest survey respondents. Paying respondents fixes the shortage, but it
also invites people who answer only for the money. Today a researcher pays for the junk too.

## What it does

1. The researcher creates a survey, sets a rate per response, a quota and a deadline, and locks the money in a smart contract.
2. Respondents connect a wallet, answer, and submit.
3. Each response is screened: code checks first, then an AI label on open-ended answers.
4. A plain rule engine decides **Pay**, **Review**, or **Don't pay**.
5. The contract pays the fixed rate to passing respondents right away.
6. The researcher closes the survey and the contract refunds the unused budget.

Every decision appears in a log with its reason and a BscScan link.

<!-- TODO: screenshot or GIF of publish -> answer -> paid -->

## How it works

```
Researcher ──fund (tBNB)──▶ SurveyEscrow (BSC testnet)
                                 ▲   │ pay rate / refund
                  recordDecision │   ▼
Respondent ──answers──▶ Next.js server ──▶ code checks + Groq label ──▶ rule engine
                                 │
                            agent wallet signs the decision
```

## Why blockchain (BNB Smart Chain)

- **The platform never holds the money.** The `SurveyEscrow` contract holds the budget. It pays only the fixed rate,
  pays each respondent at most once, and refunds the rest to the researcher.
- **Only the agent wallet can record decisions.** The contract has no owner, no admin functions and no pause, and the
  fee settings are immutable. The researcher can close their survey at any time and get the unused budget back.
- **The server never trusts the browser about the chain.** Survey registration and close are verified from the
  transaction receipt and events. The survey hash comes from one shared function, `lib/canonical.ts`.
- **Why BSC.** Low gas makes a payout per response affordable, and the flat fee is built from measured gas cost.
  Native tBNB means no token approvals. BscScan lets anyone check each payment.
- **Auditable.** Each decision stores a reason hash on-chain and shows a BscScan link in the decision log.

Current testnet deployment (chain 97), recorded in [`contracts/deployments/bscTestnet.json`](contracts/deployments/bscTestnet.json):

| | |
|---|---|
| `SurveyEscrow` | `0x31F3E8161d4626BB932e0E3A3A9e53BC47688751` |
| Agent wallet | `0xA9E8986712c0b6784Ff5ad7c0a2FB13396561624` |
| Platform wallet | `0x346b021Feeb931A7Ddbc226d5df5e9eA4cD0a09d` |

## Why AI (Groq)

- **The gap.** Code can only see the shape of text. The AI label catches what code cannot: answers that are fluent but
  off the question, evasive filler, copied text, and prompt injection. It also gives a one-sentence reason for the log.
- **How it is used.** Groq labels each open-ended answer as `valid`, `unclear` or `non-answer`, flags injection, and
  runs twice. The two runs must agree.
- **Guardrails.**
  - The AI never decides payment. It can only move a response to Review.
  - Any AI failure (timeout, bad JSON, disagreement) becomes Review, never Pay or Don't pay.
  - Respondent text is data. It goes only inside a marked data block in the prompt, and instructions inside it are ignored.
- **Measured.** With `openai/gpt-oss-120b` on the labeled set (`npm run eval`): 0/20 genuine answers flagged,
  18/20 junk caught, 3/3 injection attempts caught.

## Screening and payment rules

| Outcome | When |
|---|---|
| **Don't pay** | A code-confirmed hard fail: empty, gibberish, or duplicate answer |
| **Review** | An AI concern or failure, or two weak signals (too fast, same option repeated) |
| **Pay** | Everything else |

Decisions live in [`lib/screening/rules.ts`](lib/screening/rules.ts). A response in Review stays unpaid until the researcher decides.

## Fee model

- `budget = rate × quota`
- `fee = quota × fee per response` (a flat amount in tBNB, built from measured gas cost plus a profit part)
- `deposit = budget + fee`

At funding the contract sends the gas part to the agent wallet and the profit part to the platform wallet. The budget
stays in the contract. The fee is not refunded at close. See [`contracts/GAS.md`](contracts/GAS.md).

## Tech stack

| Layer | Tools |
|---|---|
| App | Next.js 16, React 19, TypeScript, Tailwind CSS 4, Base UI, three.js |
| Chain | Solidity 0.8.28, Hardhat 3, OpenZeppelin, viem, wagmi |
| Data and auth | Neon Postgres (plain SQL), Better Auth with wallet sign-in |
| AI | Groq SDK, Zod |
| Hosting | Vercel (planned) |

## Getting started with the web app

The live app link will be added once ResFunder is deployed on Vercel. Until then, run it locally (see the end of this section).

**You need:** [MetaMask](https://metamask.io) switched to **BNB Smart Chain Testnet** (chain ID 97), and some free tBNB from a BSC testnet faucet.

### As a researcher

1. Go to `/sign-in` and sign in with your email and wallet.
2. Go to `/publish`. Build your questions, then set the rate per response, the quota and the deadline.
3. Review the budget, fee and deposit, then click **Fund** and confirm in MetaMask.
4. Copy the share link (`/s/<id>`) and send it to respondents.
5. Open `/surveys` and select your survey to see each response, its decision, the reason and a BscScan link. Decide any responses in Review.
6. Click **Close survey**, confirm in MetaMask, and get the unused budget back.

### As a respondent

1. Open the share link you were given.
2. Connect MetaMask, sign the free message, and enter your email.
3. Answer the questions and submit.
4. Within seconds you see one of: **Paid** (with a BscScan link), **Not paid** (with the reason), or **Under review**.

### Run it locally

```bash
npm install
cp .env.example .env     # fill in values; see docs/SETUP.md
npm run db:apply         # once: apply the database schema
npm run dev              # http://localhost:3000
```

Accounts, database setup, contract deploy and the end-to-end check are in [`docs/SETUP.md`](docs/SETUP.md).

## Testing

```bash
npm run check        # types + unit tests
npm run lint
npm run test:chain   # chain integration against a local node
npm run e2e          # full run against the deployed contract
npm run eval         # screening accuracy on the labeled set
cd contracts && npm test   # contract tests
```

## Security notes

- Secrets live in `.env` (git-ignored) and in Vercel environment variables. Nothing secret uses a `NEXT_PUBLIC_` name.
- A decision row is saved to the database before any transaction is sent.
- Money is handled as wei (`bigint`), never floats. Wallet addresses are stored in lowercase.
- Respondent text is never treated as instructions.

## Known limits

- Email is a label. It is not verified.
- Review decisions, once recorded on-chain, are final.
- This is testnet only (tBNB has no value).

Deferred features (review-queue automation, auto close, respondent history, appeals) are listed in [`docs/PRD.md`](docs/PRD.md) §5.4.

## Deploy

ResFunder is planned for deployment on Vercel (link coming soon). Import the repo in Vercel with the **repo root** as
the root directory and add the server variables from [`docs/SETUP.md`](docs/SETUP.md). Do not add the deployer or E2E keys.
See [`docs/TDD.md`](docs/TDD.md) section 15.

## Docs

- [`docs/PRD.md`](docs/PRD.md): product scope
- [`docs/TDD.md`](docs/TDD.md): technical spec
- [`docs/SETUP.md`](docs/SETUP.md): setup from a fresh clone
- [`AGENTS.md`](AGENTS.md): rules for contributors and coding agents

## Team

EJ Bagayan · Victor Condicion · Stephen Nera

## License

[MIT](LICENSE)
