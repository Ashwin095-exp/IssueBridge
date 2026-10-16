# Verification log
Generated 2026-10-16T19:48:50.895Z by server/scripts/verify.js (key redacted)

```
T01 REST gemma-4-26b-a4b-it: HTTP 200 4352ms parts=[thought,text] text="Hello!"
T01 REST gemma-4-31b-it: HTTP 500 1100ms error=INTERNAL Internal error encountered.

Using model for SDK/JSON tests: gemma-4-26b-a4b-it
T03 SDK gemma-4-26b-a4b-it: OK 4770ms text="Hello!"
T04 thinkingLevel=minimal: OK 898ms
T04 thinkingLevel=high: OK 5197ms
T04 JSON mode (responseMimeType): OK 5529ms text="{"ok": true}"
T04 sample issue-1.md run 1: valid 49462ms
T04 sample issue-1.md run 2: valid 41562ms
T04 sample issue-2.md run 1: CALL FAIL status=500 {"error":{"code":500,"message":"Internal error encountered.","status":"INTERNAL"}} 1315ms
T04 sample issue-2.md run 2: CALL FAIL status=500 {"error":{"code":500,"message":"Internal error encountered.","status":"INTERNAL"}} 784ms
T04 sample issue-3.md run 1: CALL FAIL status=500 {"error":{"code":500,"message":"Internal error encountered.","status":"INTERNAL"}} 932ms
T04 sample issue-3.md run 2: valid 35345ms
T04 summary: 3/6 valid; median latency 41562ms

RESULT: working IDs=gemma-4-26b-a4b-it. Set GEMMA_MODEL in server/.env accordingly.
```

## Follow-up verification — 17 Oct 2026

Configuration used by the running server: `GEMMA_MODEL=gemma-4-26b-a4b-it`, `THINKING_LEVEL=minimal`, `JSON_MODE=true`, `MODEL_TIMEOUT_MS=90000`. The local API key was not printed or written to this log.

- Backend: `npm test` passed 20/20 tests. Client: `npm ci` completed with 0 reported vulnerabilities; `npm run build` passed.
- Health: `GET /api/health` returned `ok=true`, model `gemma-4-26b-a4b-it`, and `keyConfigured=true`; no key was returned.
- Live API: a realistic CLI issue returned HTTP 200 and schema-valid data through `POST /api/analyze` in 14,303 ms; response model was `gemma-4-26b-a4b-it`, with 3 skills and 7 steps.
- Live validation: a short issue returned HTTP 400 `INVALID_INPUT`.
- Browser: the built-in CLI issue sample rendered a live result with summary, skills, difficulty/confidence, 7 ordered steps, caveats, and the server-reported model in 15.6 seconds.
- Browser error/retry: with the backend stopped, the network error was displayed and the input remained. A transient upstream HTTP 500 occurred on a retry; a subsequent retry returned a live result.
- Sample sweep: the three files in `samples/` each returned HTTP 502 `UPSTREAM_ERROR` on this run due to upstream HTTP 500 responses. Do not claim that all bundled samples are currently reliable.
- Timeout fix: the first live API request using the previous 30-second server limit returned HTTP 504 `UPSTREAM_TIMEOUT`. The server timeout was raised to 90 seconds and the client timeout to 190 seconds; the later realistic issue request then completed.

## Edge-case and isolated-checkout follow-up — 17 Oct 2026

- `POST /api/analyze`: malformed JSON, missing issue text, empty text, and short text returned HTTP 400 `INVALID_INPUT`; 8,001 characters returned HTTP 413 `INPUT_TOO_LONG`.
- With a separate test process configured with a dummy invalid API credential (not the local key), the live provider request mapped to HTTP 500 `SERVER_MISCONFIGURED`; the response did not echo the dummy credential.
- A separate process with `MODEL_TIMEOUT_MS=1` returned HTTP 504 `UPSTREAM_TIMEOUT`; the response used the generic error envelope.
- The existing mocked route test exercises HTTP 429 `RATE_LIMITED` and verifies upstream details are not leaked. No real quota was intentionally exhausted to force a 429.
- A live prompt-injection/HTML-containing issue returned schema-valid data. A Spanish issue returned schema-valid data on retry after one transient upstream HTTP 500. An unrelated paragraph returned HTTP 502 `BAD_MODEL_OUTPUT` on both attempts, as expected when output fails the required schema.
- Browser form checks: empty, 19-character, and 8,001-character values disabled submission; the long-input hint reported the number of characters over the limit.
- Fresh local Git clone: copied current working-tree changes into a separate clone (excluding `.env`, `node_modules`, and `dist`), ran `npm ci` in both packages, `npm test` (20/20), and `npm run build`. The cloned backend and Vite server both started; `/api/health` and `/` returned HTTP 200. The clone used only the blank `.env.example`; `POST /api/analyze` correctly returned HTTP 500 `SERVER_MISCONFIGURED`. The actual local API key was not copied.
- Restored the main workspace servers afterward and submitted the issue currently in the browser again. The first call returned HTTP 502 `UPSTREAM_ERROR`; manual Retry returned schema-valid analysis from `gemma-4-26b-a4b-it`, rendered in 13.7 seconds.

## Custom Issue Analysis Diagnosis and Resolution — 17 Oct 2026

- Root cause identified: Google Gemini API's hosted Gemma 4 endpoint (`gemma-4-26b-a4b-it`) intermittently returns fast HTTP 500 (`INTERNAL`, "Internal error encountered.") within ~800-1000ms.
- Previously, the backend did not retry transient 5xx errors from the upstream model call (only retrying `BAD_MODEL_OUTPUT`), and mapped all non-4xx upstream failures to `UPSTREAM_ERROR` with the message "Couldn't reach the model. Please retry.", conflating upstream provider server errors with network connectivity problems. The client also discarded backend error messages in favor of this hardcoded string.
- Fix applied:
  1. `server/src/services/gemma.js`: added `isConnectionFailure()` to distinguish genuine network/socket failures from upstream HTTP error responses. Added automatic 1-second backoff retry in `callGemma` for transient upstream 5xx errors.
  2. `server/src/errors.js`: updated `UPSTREAM_ERROR` default message from "Couldn't reach the model. Please retry." to "The model provider encountered an error. Please retry." Custom upstream messages (such as `HTTP 500`) are preserved.
  3. `server/src/routes/analyze.js`: added safe structured logging with failure stage and status, and explicit handling for schema validation retry.
  4. `client/src/api.js`: preserved safe backend error messages in `ApiError` and updated `UPSTREAM_ERROR` message.
- Verification results:
  - Backend unit and regression tests: 21/21 passing (`npm test`).
  - Frontend production build: passes cleanly (`npm run build`).
  - Health check: `GET /api/health` returned HTTP 200 with `keyConfigured: true`.
  - Live built-in sample ("README typo"): analyzed by `gemma-4-26b-a4b-it` in 15.5s with 3 skills, 7 steps, and high-confidence beginner rating.
  - Live custom issue ("CLI crashes when output dir does not exist"): analyzed by `gemma-4-26b-a4b-it` in 15.3s with 4 skills, 7 steps, and rendered cleanly in browser UI.
  - Failure cases verified: input < 20 chars returned HTTP 400 `INVALID_INPUT`; input > 8000 chars returned HTTP 413 `INPUT_TOO_LONG`.
  - Security confirmed: `.env` is ignored by Git, no credentials staged or committed.

