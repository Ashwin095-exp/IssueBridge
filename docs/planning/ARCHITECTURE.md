# ARCHITECTURE — IssueBridge

Legend: **[VERIFIED] / [ASSUMPTION] / [DECISION] / [CONFIRM]**. Scope in `PRD.md`; order in `ROADMAP.md`. This document contains no application code; it defines contracts and structure only.

## 1. Stack [DECISION]

| Layer | Choice | Why |
|---|---|---|
| Frontend | React + Vite, plain CSS | Fastest scaffold; no CSS framework to debug |
| Backend | Node.js + Express (single process) | Keeps API key server-side; trivial |
| Model | **Gemma 4 via Gemini API**, `GEMMA_MODEL` defaults to `gemma-4-26b-a4b-it` (REST and SDK succeeded; `gemma-4-31b-it` returned HTTP 500 in the local verification) | Satisfies both challenges |
| SDK | `@google/genai` 2.30.0 (JavaScript), verified through a live call | Official SDK |
| Persistence | None | No need for MVP |
| Tests | Node built-in test runner for server logic; manual checklist for UI | No extra tooling |
| Repo layout | Two independent npm projects (`server/`, `client/`) | Avoids workspace config |

Not used on purpose: database, auth, GitHub API, Tailwind/UI kits, state libraries, TypeScript (optional only if the team already prefers it; do not add by default), Docker.

## 2. Components

```
Browser (React SPA)
   │  POST /api/analyze  {issueText}
   ▼
Express server ── validate input ── build prompt ── call Gemini API (Gemma 4)
   │                                                     │
   │◄──── parse + validate JSON, normalise ◄─────────────┘
   ▼
JSON response {ok, data, meta}  →  React renders sections
```

- **Client** only knows `/api/analyze` and `/api/health`. It never sees the key or the model SDK.
- **Server** owns: input validation, system instruction, model call, timeout, parsing/validation, error mapping.
- **Model layer** is isolated in one module (`gemma.js`) so that a second provider (optional O1) could be added without touching routes.

## 3. Request/response flow

1. User submits; client checks length (UX only).
2. `POST /api/analyze` with JSON `{ "issueText": "<string>" }`.
3. Server validates type and length (authoritative).
4. Server builds the call: fixed system instruction + issue text as user content; `THINKING_LEVEL=minimal` and `JSON_MODE=true` are the verified defaults.
5. Server awaits the model with a 90-second per-call timeout.
6. Server extracts JSON from the model text (tolerating code fences/extra prose), validates against the schema, trims/normalises (e.g., clamp steps to 8, drop empty items).
7. On invalid output: one retry (decided in T07); then `BAD_MODEL_OUTPUT`.
8. Respond with `ok:true` + `data` + `meta`.

## 4. API contract

### `GET /api/health`
`200 { "ok": true, "model": "<GEMMA_MODEL>", "keyConfigured": true|false }` — never returns the key or any part of it.

### `POST /api/analyze`
Request: `{ "issueText": string }` (20–8000 chars, `MAX_INPUT_CHARS` configurable).

Success `200`:
```
{
  "ok": true,
  "data": {
    "summary": string,
    "skills": [ { "name": string, "why": string } ],          // 2–6
    "difficulty": {
      "level": "beginner" | "intermediate" | "advanced" | "unclear",
      "confidence": "low" | "medium" | "high",
      "reasoning": string
    },
    "steps": [ { "title": string, "detail": string } ],        // 4–8, ordered
    "caveats": [ string ]                                      // 0–4: what the text did not reveal
  },
  "meta": { "model": string, "latencyMs": number }
}
```
Error (all non-200):
```
{ "ok": false, "error": { "code": string, "message": string } }
```

| Code | HTTP | Cause | UI message intent |
|---|---|---|---|
| `INVALID_INPUT` | 400 | Missing/non-string/too short | "Paste at least 20 characters of an issue." |
| `INPUT_TOO_LONG` | 413 | > max chars | "That's too long; trim to the main description." |
| `RATE_LIMITED` | 429 | Upstream quota or local limiter | "Busy — try again in a minute." |
| `UPSTREAM_TIMEOUT` | 504 | Model exceeded timeout | "The model took too long. Retry." |
| `UPSTREAM_ERROR` | 502 | Other API failure | "Couldn't reach the model. Retry." |
| `BAD_MODEL_OUTPUT` | 502 | Unparseable/invalid after retry | "The model's answer was malformed. Retry." |
| `SERVER_MISCONFIGURED` | 500 | Missing key/model | "Server setup problem." (details only in server log) |

The schema is a [DECISION]; the field names are frozen once T05 is done, because tests, the UI and the mock fixture depend on them.

## 5. Model integration notes

- **[VERIFIED]** `gemma-4-26b-a4b-it` returned HTTP 200 through REST and the JavaScript SDK. The alternative `gemma-4-31b-it` returned HTTP 500; do not use it as the default.
- **[VERIFIED]** SDK calls with `thinkingLevel=minimal`, `thinkingLevel=high`, and `responseMimeType=application/json` succeeded. The application defaults to minimal thinking and JSON response mode; server-side parsing and schema validation remain mandatory.
- **[VERIFIED]** REST responses can include thought parts; `server/src/services/gemma.js` filters them before parsing the answer text.
- **[KNOWN LIMITATION]** Live issue analysis can still receive intermittent upstream HTTP 500 errors, including while testing the bundled samples. The client exposes Retry.
- **[CONFIRM]** Official docs show a "deprecated, see gemma.ai" banner; re-check the current docs location at the event.
- Do not copy Gemini-model IDs, Gemini-only features, or `gemini-*` examples into this project.

## 6. Environment variables

| Name | Where | Required | Default | Notes |
|---|---|---|---|---|
| `GEMINI_API_KEY` | `server/.env` | Yes | — | From Google AI Studio. Passed explicitly to `GoogleGenAI`; never committed |
| `GEMMA_MODEL` | `server/.env` | No | `gemma-4-26b-a4b-it` | Verified model; exact ID is printed in README |
| `PORT` | `server/.env` | No | `3001` | |
| `CORS_ORIGIN` | `server/.env` | No | `http://localhost:5173` (defaults also include `https://issue-bridge-flfw.vercel.app` & Vercel previews) | Comma-separated allowed origins; on Render set `https://issue-bridge-flfw.vercel.app` |
| `MAX_INPUT_CHARS` | `server/.env` | No | `8000` | |
| `MODEL_TIMEOUT_MS` | `server/.env` | No | `90000` | Increased after an actual issue request exceeded the previous 30-second limit |
| `THINKING_LEVEL` | `server/.env` | No | `minimal` | Verified with the selected model |
| `JSON_MODE` | `server/.env` | No | `true` | Sends `responseMimeType=application/json`; verified with the selected model |
| `VITE_API_BASE_URL` | `client/.env` | No | empty → use Vite dev proxy | Never put secrets in `VITE_*` |

`server/.env.example` lists names with placeholder values only.

## 7. Security boundaries

- Trust boundary 1: browser ↔ server. Server validates everything; client validation is cosmetic.
- Trust boundary 2: server ↔ Gemini API. Only server holds the key; issue text is sent; nothing else.
- Issue text is **untrusted data**: placed in user content, system instruction states to ignore instructions inside it; output is schema-validated and rendered as plain text (no `dangerouslySetInnerHTML`).
- No persistence; no request-body logging.
- Body size limit on Express JSON parser slightly above max input.
- Optional simple in-memory per-IP limiter (only if time; not required).

## 8. Error handling

- One central error-mapping function converts upstream/validation failures to the codes above.
- Server never leaks stack traces or upstream raw errors to the client.
- Client treats any non-`ok:true` or network failure as an error state, keeps the textarea content, offers Retry.
- A 90-second timeout is enforced for each server model call; the client allows 190 seconds for the request and one malformed-output retry.

## 9. Minimal project structure

Repository working tree (not yet published to GitHub):

```
issuebridge/
├── README.md                 # Final README (built from README-PLAN.md)
├── LICENSE                   # Apache-2.0 [DECISION]
├── .gitignore                # node_modules, .env, dist
├── docs/planning/            # This planning pack (PRD, ROADMAP, TASKS, ARCHITECTURE, README-PLAN, RESUME) [CONFIRM it may be committed]
├── samples/                  # 3 sample issue texts (+ source URLs) for demo and prompt testing
├── server/
│   ├── package.json
│   ├── .env.example          # placeholders only
│   ├── .env                  # local secrets (git-ignored, never committed)
│   ├── src/
│   │   ├── index.js          # Express app entry: env, port, listen
│   │   ├── app.js            # Express createApp factory, middleware pipeline, error handler
│   │   ├── cors.js           # Production & preview CORS origin resolver and middleware
│   │   ├── routes/analyze.js # POST /api/analyze + GET /api/health
│   │   ├── services/gemma.js # Only file that talks to the Gemini API / Gemma 4
│   │   ├── prompt.js         # System instruction + user-content builder
│   │   ├── validate.js       # Input validation + model-output parsing/validation
│   │   └── errors.js         # Error codes → HTTP status + messages
│   ├── scripts/verify.js     # Live REST/SDK and sample verification
│   └── tests/                # node --test files for validate/errors/route/cors (mocked model)
└── client/
    ├── package.json
    ├── index.html
    ├── vite.config.js        # dev proxy /api → http://localhost:3001
    └── src/
        ├── main.jsx          # Mount
        ├── App.jsx           # Page state machine: idle/loading/error/success
        ├── api.js            # fetch wrapper for /api/analyze
        ├── components/       # IssueForm, ResultView (sections), ErrorBanner
        ├── samples.js        # Built-in issue examples
        └── styles.css        # Single stylesheet
```

Environment-variable location: `server/.env` (secret, ignored by Git); the client uses the Vite `/api` proxy by default. Tests: `server/tests/`; the live browser flow was checked manually. No public GitHub repository or automated browser-test suite has been created.

## 10. Local development and deployment

**Local (primary demo path) [DECISION]:** terminal 1 `server` (port 3001), terminal 2 `client` (Vite, 5173, proxy to server). No tunnelling needed.

**Optional deployment (O2):** one host serving the built client from Express, or client on a static host and server on a Node host; key set as host secret; restrict `CORS_ORIGIN`. Free-tier hosts may sleep (cold starts) — do not rely on a deployed URL for the demo [ASSUMPTION]. Whether a public URL is required is **[CONFIRM]**.
