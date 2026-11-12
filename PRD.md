# ResFunder PRD

Product requirements for the hackathon build (BCC 2026 × Binance Academy, AI Agents track). Build Day is November 13, 2026. The technical design is in `docs/TDD.md`.

## 1. Problem

Student researchers struggle to get enough survey respondents. Paying them fixes the shortage but invites people who answer only for the money, so payment has to follow screening.

Problem in one sentence: student researchers can't get enough honest respondents, and paying for them today means paying for junk too.

## 2. Users

- **Researcher (core):** a student who funds a survey and wants usable responses.
- **Respondent (core):** a student who answers and earns the rate.
- **Faculty adviser (secondary):** reads the decision log to audit how responses were accepted.

## 3. What the product does

1. The researcher creates a survey, sets a rate per response, a quota, and a deadline, and locks the money in a smart contract.
2. Respondents connect a wallet, answer, and submit.
3. Each response is screened: code checks first, then an AI label on open-ended answers.
4. A rule engine decides Pay, Review, or Don't pay.
5. The contract pays the fixed rate to passing respondents right away.
6. The researcher closes the survey and the contract refunds the unused budget.
7. Every decision is shown in a log with its reason and a BscScan link.

## 4. Why blockchain and why AI

- **Blockchain:** the platform never holds the researcher's money. The contract holds the budget, pays only the fixed rate, pays each respondent at most once, and refunds the rest to the researcher. Anyone can verify this on BscScan.
- **AI:** code can only see the shape of text. The AI label catches what code cannot: answers that are fluent but off the question, evasive filler, text copied from elsewhere, and prompt injection attempts. It also gives a one-sentence reason for the log.
- **Guardrail:** the AI never decides payment. It can only send a response to Review.

## 5. Features

### 5.1 Main features (must work for the demo)

| # | Feature | Summary |
|---|---|---|
| 1 | Fund a survey | Researcher locks `rate x quota` plus the fee in tBNB, with a deadline. One MetaMask confirmation. |
| 2 | Submit answers | Respondent connects a wallet, signs a free message, enters an email and answers. One submission per wallet and per email. |
| 3 | Code checks | Empty, gibberish, and duplicate answers are hard fails. Too fast and same-option-repeated are weak signals. |
| 4 | AI label | Groq labels each open-ended answer as valid, unclear, or non-answer, flags injection, and gives a reason. Two runs must agree. |
| 5 | Rule engine | Hard fail means Don't pay. AI concern or two weak signals means Review. Otherwise Pay. |
| 6 | Instant payment | The server's agent wallet calls the contract, and the contract sends the rate to the respondent. |
| 7 | Close and refund | The researcher closes the survey at any time and receives the unused budget. |
| 8 | Decision log | Every response with its decision, reasons, status, and BscScan link. |

### 5.2 Supporting features (must work for the demo)

- Wallet connect with a switch to BSC testnet.
- Signed-message sign-in for respondents (on submit) and researchers (results page).
- Landing page with a researcher path and a respondent path.
- Fee preview before funding: budget, fee, deposit in tBNB.
- Finish setup: if the browser closes after funding, the researcher can re-send the registration.
- Instant result for the respondent after submitting: paid, not paid with the reason, or under review.
- Researcher's list of their surveys.
- Exempt setting: an open-ended question can be marked as allowing short answers.
- Clear error messages for rejected submissions.

### 5.3 Extras (only after the above works, in this order)

1. CSV export of the decision log.
2. Filters on the decision log.
3. Pause switch: the researcher stops new submissions without closing. Server-only.
4. Survey builder UI. Until it exists, surveys come from a JSON file.

### 5.4 Deferred (not in this build)

Review queue approve and reject, automatic close by the agent, respondent history, adviser access, chain scan for unregistered surveys, parallel payment locking, on-chain fee updates, embedded wallets, email or school-domain verification, appeals.

## 6. User flows

### 6.1 Researcher

1. Open the app, choose Researcher, connect MetaMask.
2. Create a survey (builder or the seeded JSON), mark any short-answer questions.
3. Enter rate, quota, deadline. See budget, fee, and deposit.
4. Click Fund and confirm in MetaMask.
5. Receive the share link. Send it to respondents.
6. Open the results page. See the summary and the decision log.
7. Click Close survey, confirm in MetaMask, and receive the refund.

### 6.2 Respondent

1. Open the share link.
2. Connect MetaMask and sign a free message.
3. Enter an email and answer the questions.
4. Submit. Within seconds, see one of:
   - Paid, with a BscScan link.
   - Not paid, with the reason.
   - Under review. The researcher will decide.

## 7. Fee model

- The fee is a flat amount per response, shown in tBNB, not a percentage.
- `fee per response = gas cost per response (with a margin) + profit per response`
- `budget = rate x quota`
- `fee = quota x fee per response`
- `deposit = budget + fee`
- At funding, the contract sends the gas part to the agent wallet, which pays gas for payouts, and the profit part to the platform wallet. The budget stays in the contract.
- The fee is not refunded at close.
- For the MVP the fee per response is a fixed configured value. A live gas estimate is a later improvement.
- The gas cost per response must be measured on testnet before the fee is set. No fee number is final until then.

## 8. Wallets

| Wallet | Controlled by | Role |
|---|---|---|
| Researcher | the researcher | funds the survey, receives the refund |
| Respondent | the respondent | receives the rate |
| Agent | the server | signs payment decisions, pays gas, receives the gas part of each fee |
| Platform | the team | receives the profit part of each fee, key never on the server |

## 9. Requirements

### 9.1 Functional

- A survey cannot be registered unless its funding transaction and question hash are verified on-chain.
- A wallet can submit once per survey. An email can submit once per survey.
- A survey stops accepting answers when it is closed, paused, past its deadline, or full.
- A response is never paid without a Pay decision from the rule engine.
- A respondent is never paid twice for the same survey. The contract enforces this.
- A failed payment sends the response to Review and is visible in the log.
- Review responses are not paid in this build.

### 9.2 Privacy

- The email is stored for contact and is visible only to the survey's researcher.
- The duplicate check uses a keyed hash of the email, not the email itself.
- Answers and emails never go on-chain. Only hashes, wallet addresses, and amounts do.
- Respondent answers are sent to Groq for labeling.

### 9.3 Non-functional

- A respondent sees a result within about 30 seconds in the normal case.
- Works on desktop Chrome with MetaMask on BSC testnet.
- All secrets stay in environment variables.

## 10. Success measures for the demo

- End to end on testnet: fund, three responses (paid, blocked, review), log, close, refund, all visible on BscScan.
- Accuracy table on a labeled set of about 40 answers: what code checks alone catch against what code plus AI catches, with false flags on genuine answers.
- Measured gas cost per payout.

## 11. Build tiers

- **Tier 1 (first):** contract deployed and verified, screening, database, routes, payment, end-to-end script passing.
- **Tier 2:** UI wired to the routes, sign-in, accuracy test, hosted deployment.
- **Tier 3:** CSV export, filters, pause switch, then the survey builder.

## 12. Known limits and flags

| Flag | Decision for this build |
|---|---|
| Open surveys can be farmed with many wallets | Accepted. Mitigated by duplicate-text checks, the AI label, and small rates. |
| Respondents need MetaMask | Accepted for the demo. |
| Review cases never resolve | Accepted. Shown as under review. |
| Parallel payments can collide on the agent wallet | Payments run one at a time per server instance. Test with two quick submissions. |
| Browser closes after funding | Finish setup re-sends registration from local storage. Lost if browser data is cleared, but the researcher can still close and get the budget back. |
| Closing with responses still processing | Those responses cannot be paid. The page warns before closing. |
| Gas price rises after funding | The margin absorbs it. No on-chain update in this build. |
| Tiny rate with a huge quota | The fee becomes a large share of the budget. No minimum rate yet. |
| The too-fast floor (2 seconds per question) | A judgment value. Check it against the labeled set. |
| Hosted function time limits | Screening and payment run in a separate call. Fallback is running locally. |
