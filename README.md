# IssueBridge

**An AI assistant that helps beginners understand a GitHub issue and plan their first open-source contribution.**
Built for MLH Hacktoberfest Hack Day, AIT Pune (17 Oct 2026).

Paste an issue → get a plain-language summary, the skills involved, a difficulty estimate **with a stated confidence**, a step-by-step contribution plan, and a list of assumptions / missing information.

> **Powered by Gemma 4 (`gemma-4-26b-a4b-it`) through the Gemini API.** The model ID is read from `GEMMA_MODEL`; the default is set in [`server/src/services/gemma.js`](server/src/services/gemma.js) and [`server/.env.example`](server/.env.example). `gemma-4-31b-it` is the other ID listed in Google's Gemma-on-Gemini-API docs. Gemma 4 is an open-weight model released under Apache 2.0 (per Google's Gemma documentation).

## Status (read this)

| Item | State |
|---|---|
| Server validation, output parsing, error mapping, routes | Unit/route tests pass (`cd server && npm test`, model call mocked) |
| React UI states and rendering | Checked in a real browser against the real Express app with a **stubbed model** |
| Live Gemma 4 call | **Run `npm run verify` in `server/` to confirm your key and model ID** and write `docs/verification-log.md`. Until that log exists, the live call is unverified. |

## Features

- Paste an issue (20–8,000 characters) or load one of three built-in samples (including a deliberately vague one).
- Structured result: summary, skills, difficulty + confidence + reasoning, 4–8 plan steps, caveats.
- The "Powered by" line shows the model name reported by the server, not hard-coded text.
- Loading, error and success states; input is kept on errors; Retry button; double-submit guard.
- Model text is rendered as plain text (no HTML injection). Issue text is treated as data in the prompt.

## Architecture

```
Browser (React + Vite)  --POST /api/analyze-->  Express  --> Gemma 4 via Gemini API
        ^                                          |  validate input, build prompt,
        └------- {ok, data, meta} <---- parse + validate model JSON (one retry)
```

- `server/src/services/gemma.js` is the **only** file that calls Gemma 4 (`@google/genai`, `ai.models.generateContent`).
- `server/src/prompt.js` system instruction · `server/src/validate.js` input + output validation · `server/src/errors.js` error codes.
- The API key lives only in `server/.env`. The browser never sees it. Full contract: [`docs/planning/ARCHITECTURE.md`](docs/planning/ARCHITECTURE.md).

## Setup

Requirements: Node.js 20+ (built and tested here with Node 22), npm, and a Gemini API key from [Google AI Studio](https://aistudio.google.com/).

```bash
git clone <this repo> && cd issuebridge

cd server && npm install
cp .env.example .env        # then edit .env and set GEMINI_API_KEY
npm run verify              # checks your key and the Gemma 4 model IDs (never prints the key)

cd ../client && npm install
```

## Run

Two terminals:

```bash
# terminal 1
cd server && npm start      # http://localhost:3001  (check: curl localhost:3001/api/health)

# terminal 2
cd client && npm run dev    # http://localhost:5173
```

Open http://localhost:5173, load a sample, click **Analyze issue**.

## Environment variables (`server/.env`)

| Name | Required | Default | Purpose |
|---|---|---|---|
| `GEMINI_API_KEY` | yes | – | Google AI Studio key. Never commit it. Never use a `VITE_` prefix. |
| `GEMMA_MODEL` | no | `gemma-4-26b-a4b-it` | Gemma 4 model ID |
| `PORT` | no | `3001` | API port |
| `CORS_ORIGIN` | no | `http://localhost:5173` | Allowed browser origin |
| `MAX_INPUT_CHARS` | no | `8000` | Input limit |
| `MODEL_TIMEOUT_MS` | no | `30000` | Model call timeout |
| `THINKING_LEVEL` | no | empty (not sent) | e.g. `minimal` / `high`; decide using `npm run verify` |
| `JSON_MODE` | no | `false` | `true` sends `responseMimeType=application/json` |

## Tests

```bash
cd server && npm test       # 20 tests: validators, parser, error mapping, routes (model mocked)
cd client && npm run build  # production build check
```

## Limitations

- Works only from pasted text. It does not read the repository, CONTRIBUTING file or code, so plans are generic guidance.
- Difficulty and skills are model estimates and can be wrong; that is why confidence and caveats are shown.
- Needs internet, a valid key, and is subject to API quotas and rate limits.
- Issue text is sent to Google's Gemini API. Don't paste confidential content. Whether free-tier prompts are used by Google for product improvement has not been checked here; see Google's Gemini API terms.
- No accounts, history or database. Nothing is saved.
- Non-English and very long issues are untested. Output quality of the live model has not been measured in this repository.

## Licence and attribution

Apache-2.0 (see [`LICENSE`](LICENSE)). Gemma 4 is by Google. React, Vite, Express and `@google/genai` are under their own licences. The samples in `samples/` are fictional issues written for this demo.
AI coding assistance (Claude) was used to write the code in this repository during the event; disclose per the organisers' rules.

Planning documents: [`docs/planning/`](docs/planning/).
