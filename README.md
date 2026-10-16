# IssueBridge

IssueBridge helps people new to open source understand a GitHub issue and plan a first contribution. Paste an issue title and description to get a beginner-friendly explanation, relevant skills, an uncertainty-aware difficulty estimate, an ordered roadmap, and questions or assumptions to investigate.

Built for MLH Hacktoberfest Hack Day, AIT Pune (17 Oct 2026).

> **Real AI: Gemma 4 (`gemma-4-26b-a4b-it`) through the Gemini API.** This is the verified model for this project; `gemma-4-31b-it` returned HTTP 500 in the local verification. The model ID is configured server-side and reported back by the API. Gemma 4 is an open-weight model released under Apache 2.0 according to Google's Gemma documentation.

## Features

- Paste an issue (20–8,000 characters) or load one of three built-in examples.
- Get a plain-language summary, 2–6 relevant skills, difficulty and confidence with reasoning, 4–8 ordered steps, and caveats.
- Validate and normalize model JSON on the server; retry once if the model output does not match the expected structure.
- Loading, success, validation/error, and retry states; submitted text is preserved after errors.
- Render model output as plain text. Issue text is treated as untrusted data in the prompt.
- Keep the Gemini API key on the server; no key or model SDK is sent to the browser.

## Architecture

```text
React + Vite browser --POST /api/analyze--> Express server --> Gemma 4 via Gemini API
        ^                                     | validate input and prompt
        └------ {ok, data, meta} <------------└ parse and validate model JSON
```

- [`server/src/services/gemma.js`](server/src/services/gemma.js) calls `@google/genai` 2.30.0 with `GoogleGenAI` and `ai.models.generateContent`.
- [`server/src/prompt.js`](server/src/prompt.js) defines the system instruction; [`server/src/validate.js`](server/src/validate.js) validates requests and model output.
- The server returns `{ ok, data, meta }`; see [`docs/planning/ARCHITECTURE.md`](docs/planning/ARCHITECTURE.md) for the API contract.
- No database, account system, GitHub API, or repository access is used.

## Verification status

- Backend automated tests: **21/21 passed** (`server`: `npm test`, including error distinction and custom issue regression tests).
- Client production build: **passed** (`client`: `npm run build`).
- Live end-to-end: verified with real model `gemma-4-26b-a4b-it` through `/api/analyze` and the browser UI for both built-in samples and custom GitHub issues. Transient upstream 5xx errors from the hosted provider are handled via automatic backoff retry and clear error reporting.
- Live error checks: malformed JSON, missing/empty/short input returned HTTP 400 `INVALID_INPUT`; an 8,001-character input returned HTTP 413 `INPUT_TOO_LONG`. A separate process using a dummy invalid credential returned HTTP 500 `SERVER_MISCONFIGURED` without echoing the credential. A 1 ms timeout returned HTTP 504 `UPSTREAM_TIMEOUT`. The rate-limit response is covered by a mocked route test (HTTP 429); no real quota was exhausted to induce it.
- Live edge inputs: a prompt-injection/HTML-containing issue returned schema-valid analysis; a Spanish issue returned valid analysis after one transient upstream failure. An unrelated paragraph returned `BAD_MODEL_OUTPUT` after the server's single retry, without crashing or leaking upstream details. The browser input checks disabled submission for empty, 19-character, and over-limit values and showed the over-limit message.
- Fresh local clone: overlaid the current working-tree changes onto a separate Git clone, then ran `npm ci`, server tests (21/21), and the client production build from that checkout with no original `node_modules` or build artifacts. Both documented dev servers started; health and frontend returned HTTP 200. The clone used a blank `.env` (the real key was not copied), so its `/analyze` correctly returned `SERVER_MISCONFIGURED`.
- A stopped backend displayed the network error while preserving the issue text. Retry succeeded after a transient upstream HTTP 500.
- Intermittent upstream Gemma 4 provider 5xx errors are handled via automatic backoff retry in `callGemma` and safe error propagation; both built-in samples and custom GitHub issues have been verified end-to-end with live inference.
- There is no automated browser-test suite in this repository; the browser flow was checked manually and with headless browser subagent verification.

## Windows setup

Requirements: Git, Node.js (tested with v24.12.0 and npm 11.6.2), and a Gemini API key from [Google AI Studio](https://aistudio.google.com/).

After cloning the repository, open PowerShell in its root folder:

```powershell
Set-Location .\server
npm ci
Copy-Item .env.example .env
code .env
```

Set `GEMINI_API_KEY` in `server/.env`. Leave the verified `GEMMA_MODEL` value as configured. Do not paste the key into the client, use a `VITE_` prefix, or commit `.env`.

Install client dependencies in a second PowerShell terminal:

```powershell
Set-Location .\client
npm ci
```

## Run locally

Start the backend in one terminal from the repository root:

```powershell
Set-Location .\server
npm start
```

Start Vite in another terminal:

```powershell
Set-Location .\client
npm run dev
```

Open <http://localhost:5173>. The server listens on <http://localhost:3001>; check it at <http://localhost:3001/api/health>. Load **CLI crash** or paste an issue, then select **Analyze issue**.

## Server environment (`server/.env`)

Copy [`server/.env.example`](server/.env.example) to `.env`. The example contains a blank key field and safe, verified defaults.

| Name | Required | Default | Purpose |
|---|---|---|---|
| `GEMINI_API_KEY` | Yes | — | Google AI Studio key; server-only, never commit it. |
| `GEMMA_MODEL` | No | `gemma-4-26b-a4b-it` | Exact Gemma 4 model identifier. |
| `PORT` | No | `3001` | Express API port. |
| `CORS_ORIGIN` | No | `http://localhost:5173` | Allowed browser origin. |
| `MAX_INPUT_CHARS` | No | `8000` | Maximum issue text length. |
| `MODEL_TIMEOUT_MS` | No | `90000` | Per-model-call timeout; increased after a real request exceeded the previous 30-second limit. |
| `THINKING_LEVEL` | No | `minimal` | Verified Gemma 4 setting. |
| `JSON_MODE` | No | `true` | Requests `application/json`; verified with this model. |

## Tests and checks

Run these commands from the repository root in one PowerShell terminal:

```powershell
# Backend unit and route tests (model calls mocked)
Set-Location .\server
npm test

# Client production bundle
Set-Location ..\client
npm run build
```

`server/scripts/verify.js` is an optional live diagnostic for REST, SDK, options, and sample output. It makes real API calls, consumes quota, and probes `gemma-4-31b-it` as well as the configured model; the latter is the only model to use for this project.

## Limitations

- Analysis uses only pasted text; it cannot inspect the repository, source code, or contribution guide, so its plan may be generic or make incorrect assumptions.
- Skills and difficulty are estimates, not authoritative guidance. Review the caveats and verify suggestions against the actual repository.
- The hosted API requires internet access and a valid key; quota and intermittent upstream failures can interrupt a request.
- Issue text is sent to Google's Gemini API to run Gemma 4. Do not submit confidential or private content; review Google's current Gemini API terms for data handling.
- No accounts, database, saved history, or GitHub issue fetching. Nothing is persisted by IssueBridge.
- Non-English analysis and very long issues have not been evaluated. Intermittent upstream Gemma 4 provider 5xx errors are handled via automatic backoff retry and safe error propagation; both built-in samples and custom GitHub issues have been verified end-to-end with live inference.

## Licence and attribution

This project is licensed under Apache-2.0; see [`LICENSE`](LICENSE). Gemma 4 is by Google. React, Vite, Express, and `@google/genai` retain their respective licences. The sample issue descriptions are fictional and written for this demo.

AI coding assistance was used during development; confirm any event-specific disclosure requirements with the organisers.

Planning documents: [`docs/planning/`](docs/planning/).
