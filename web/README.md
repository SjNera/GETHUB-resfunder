# ResFunder — landing page

Next.js 16 (App Router) · Tailwind CSS 4 · Base UI · three.js (react-three-fiber).

This folder is the **landing page only**, plus the public screening rubric:

| Route | What |
|---|---|
| `/` | Landing: hero, "Publish a survey" / "Answer a survey" with a first-time intro, how it works, big numbers |
| `/rubric` | Public screening rubric |

The app pages (sign-in, publish, answer, review, decision log) come from the developer.

## Run it

```bash
pnpm install
pnpm dev        # http://localhost:3000
```

```bash
pnpm test       # screening rules, fees, survey hash
pnpm lint
pnpm build
```

## For the developer: wiring the two buttons

`src/lib/links.ts` holds where "Publish a survey" and "Answer a survey" go after the intro:

```ts
export const PUBLISH_URL: string | null = null;
export const ANSWER_URL: string | null = null;
```

While they're `null`, the intro's last button says "Got it" and closes. Set a path (`"/publish"`) or a full
`https://` link and the button becomes "Fund the survey" / "See open surveys" and navigates there; visitors who
have already seen the intro go straight in.

## Reusable logic kept here

`src/lib/rules/` is the deterministic rule engine and code checks from the proposal (Pay / Review / Don't pay),
with unit tests. `src/lib/fees.ts` has the budget math in mock tPHP units (₱10 × 150 + 5% = ₱1,575). The app can
import both.

## Where things are

| Path | What |
|---|---|
| `src/app/page.tsx` | Landing page |
| `src/components/landing/` | Hero buttons + intro sheet, orbit rings, activity cards |
| `src/components/three/` | The "How it works" orb (three.js, with a CSS fallback) |
| `src/app/globals.css` | Chalk / Onyx / Tangerine tokens and motion tokens |

## Deploy

Import the GitHub repo in Vercel and set **Root Directory** to `web`. No environment variables are needed.
