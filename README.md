# ResFunder

**Fund research. Pay honest answers.** BCC 2026 Hackathon · AI Agents track.

A student researcher locks a small survey budget in a smart contract on BNB Smart Chain, and the contract pays
only for responses that pass screening. A Groq-hosted LLM labels non-answers and flags prompt injection;
deterministic code makes every payment decision.

| Folder | What |
|---|---|
| [`web/`](web/README.md) | The website: researcher builder, funding, review queue, decision log, respondent flow |
| [`contracts/`](contracts/README.md) | `SurveyEscrow.sol` built in Remix, plus the hand-off steps to the frontend |
| `.claude/skills/` | Curated design skills (Emil Kowalski, MIT) that Claude Code uses on this repo |

Team: EJ Bagayan · Victor Condicion · Stephen Nera
