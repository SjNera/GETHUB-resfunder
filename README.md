# ResFunder

**Fund research. Pay honest answers.** BCC 2026 Hackathon · AI Agents track.

A student researcher locks a small survey budget in a smart contract on BNB Smart Chain testnet (native tBNB), and
the contract pays only for responses that pass screening. A Groq-hosted LLM labels non-answers and flags prompt
injection; deterministic code makes every payment decision.

Start with [`AGENTS.md`](AGENTS.md), then [`docs/TDD.md`](docs/TDD.md) (the spec) and [`docs/PRD.md`](docs/PRD.md).

| Folder | What |
|---|---|
| `app/`, `components/`, `lib/` | The Next.js app: pages, API routes, and shared logic (one app, at the repo root) |
| [`contracts/`](contracts/README.md) | `SurveyEscrow.sol`: Hardhat package with tests and deploy scripts |
| `data/`, `scripts/` | Demo survey, labeled set, schema, eval and end-to-end scripts |
| `docs/` | PRD, TDD, sign-up spec |
| `site/` | Standalone static demo page (not part of the app) |
| `.claude/skills/` | Curated design skills (Emil Kowalski, MIT) that Claude Code uses on this repo |

## Run it

```bash
npm install
cp .env.example .env     # fill in values, shared privately
npm run dev              # http://localhost:3000
npm run check            # types + unit tests
npm run lint
npm run build
npm run db:apply         # once: apply lib/db/schema.sql to DATABASE_URL
```

## UI notes

- **Landing buttons.** `lib/ui/links.ts` sets where "Publish a survey" and "Answer a survey" go after the intro.
  While they're `null`, the intro's last button says "Got it" and closes. Set a path (`"/publish"`) or a full
  `https://` link once those pages exist; visitors who have seen the intro go straight in.
- **Design tokens.** `app/globals.css` holds the Chalk / Onyx / Tangerine color tokens and the motion tokens.
- **"How it works" orb.** `components/three/` (three.js, with a CSS fallback).

## Deploy

Import the repo in Vercel with the **repo root** as the root directory. Add the server variables from
`AGENTS.md` section 7 (not the deployer or E2E keys). See `docs/TDD.md` section 15.

Team: EJ Bagayan · Victor Condicion · Stephen Nera
