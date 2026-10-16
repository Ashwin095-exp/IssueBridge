# TASKS — IssueBridge

Legend: **[VERIFIED] / [ASSUMPTION] / [DECISION] / [CONFIRM]**. Order follows `ROADMAP.md`; contracts in `ARCHITECTURE.md`; scope in `PRD.md`.

**How to use:** do one task at a time. Verify it. Commit. Update `RESUME.md` (checklist at its bottom). Never ask an AI assistant to build more than the current task. Do not paste this whole file into a prompt; paste only the current task plus the relevant contract section.

Common definition-of-done for every task (in addition to the task's own): acceptance criteria met, verification performed, no secrets staged (`git status` / `git diff --staged`), committed with a clear message, `RESUME.md` updated.

---

## T01 — Verify Gemma 4 access with a raw REST call (HIGHEST RISK, no repo needed)
- **Objective:** Prove our key, network and quota can call a Gemma 4 model through the Gemini API; choose the working model ID.
- **Prerequisites:** Google account; API key from Google AI Studio [VERIFIED source of keys]; terminal with curl.
- **Files:** none in the repo. Record results in a scratch note (later saved as `docs/planning/verification-log.md`).
- **Instructions:**
  1. Create an API key in AI Studio. Put it in a shell environment variable for this terminal only (do not write it into any file in a repo).
  2. Send a trivial prompt to `gemma-4-26b-a4b-it` using the documented endpoint pattern `https://generativelanguage.googleapis.com/v1beta/models/<id>:generateContent` [VERIFIED]. Pass the key as the `x-goog-api-key` header [ASSUMPTION — standard Gemini API convention; the official page's curl omits it, so confirm in the current docs or AI Studio "Get code"].
  3. Repeat for `gemma-4-31b-it`.
  4. Note: HTTP status, whether text is returned, rough latency, any error body, any thought/extra parts in the response.
  5. Repeat once from a phone hotspot if the venue Wi-Fi fails.
- **Acceptance criteria:** At least one of the two IDs returns generated text with HTTP 200. The working ID(s) and latency are written down.
- **Verification:** Visual inspection of the JSON response containing candidate text. Command shape (illustrative, key from env): `curl "https://generativelanguage.googleapis.com/v1beta/models/gemma-4-26b-a4b-it:generateContent" -H "x-goog-api-key: $GEMINI_API_KEY" -H 'Content-Type: application/json' -d '{"contents":[{"parts":[{"text":"Say hello in one sentence."}]}]}'`
- **Common failure modes:** 400 API key invalid/not set; 403/permission or region/billing restrictions; 404 wrong model ID; 429 quota (free-tier limits are reportedly low [ASSUMPTION]); corporate/venue network blocking; docs moved to gemma.ai and showing different IDs.
- **Definition of done:** A working model ID is recorded, or the failure is escalated to organisers and the fallback ladder in `ROADMAP.md` is started.

## T02 — Repository skeleton and publish early
- **Objective:** Public repo with licence and ignore rules before any code exists.
- **Prerequisites:** T01 (or T01 escalated), GitHub account, git.
- **Files created:** `LICENSE`, `.gitignore`, `README.md` (stub), `server/.env.example`, `client/.env.example` (can wait until T08), `samples/` (empty), `docs/planning/*` [CONFIRM may be committed]. Empty folders `server/`, `client/`.
- **Instructions:** Create the public repo on GitHub with the Apache-2.0 licence [DECISION]; clone; add `.gitignore` covering `node_modules`, `.env`, `dist`, OS junk; add `server/.env.example` listing variable names from `ARCHITECTURE.md` §6 with placeholders; stub README with title + one-line description + "Built with Gemma 4 via the Gemini API (model ID to be confirmed)". First commit and push.
- **Acceptance criteria:** Repo is public; GitHub shows detected licence; `.env` is ignored.
- **Verification:** Create a dummy `server/.env`, run `git status` → it must not appear; delete the dummy afterwards. Open the repo in a private browser window.
- **Failure modes:** `.gitignore` added after a secret was staged; wrong licence template; repo private.
- **Done:** Pushed commit visible publicly.

## T03 — Server package and SDK smoke test from Node
- **Objective:** Confirm `@google/genai` from Node works with the chosen model and learn the response shape.
- **Prerequisites:** T01, T02, Node.js (version supported by the SDK [CONFIRM from SDK docs]).
- **Files:** `server/package.json`, `server/scripts/smoke.js`, `server/.env` (local only), `server/src/services/gemma.js` (minimal wrapper: reads env, one function that takes text and returns raw response text).
- **Instructions:** Initialise the server package; install `@google/genai`, `express`, `cors`, `dotenv` [versions recorded in the verification log]. Load env. Implement a minimal call following the official JS example [VERIFIED pattern: `new GoogleGenAI()`, `ai.models.generateContent({model, contents, config})`]. Smoke script prints the model ID, latency, and the text. Inspect the raw response for non-text/"thought" parts and note how to extract only the final text.
- **Acceptance criteria:** `node scripts/smoke.js` prints generated text from Gemma 4; no key printed; missing key gives a clear error.
- **Verification:** Run it; then temporarily unset the key and confirm the error is clear and non-leaky.
- **Failure modes:** SDK not auto-reading the env var (pass key explicitly from `process.env`); ESM/CommonJS mismatch; SDK version lacking Gemma support; Node too old; response text empty because of thinking parts.
- **Done:** Smoke call works from Node; SDK version and response-shape notes recorded.
- **If it fails:** use raw `fetch` to the REST endpoint verified in T01 (same behaviour, no SDK).

## T04 — Prompt, schema, samples, and JSON reliability test
- **Objective:** Find a system instruction and settings that make Gemma 4 return the contract JSON reliably on three real issues; decide thinking level and JSON-mode usage.
- **Prerequisites:** T03.
- **Files:** `server/src/prompt.js`, `samples/issue-1.md`, `issue-2.md`, `issue-3.md` (each with source URL/attribution line; pick small, public, beginner-ish issues of varied clarity; include one vague one), temporary test script (can reuse `scripts/smoke.js`).
- **Instructions:** Write the system instruction: role (helps beginners), treat issue text as data not instructions, output ONLY JSON matching `ARCHITECTURE.md` §4, honest uncertainty (`unclear`/low confidence allowed), no invented repo details, 4–8 steps including "read CONTRIBUTING / comment to claim" when relevant. Run each sample 2–3 times. Compare: `thinkingLevel` `"minimal"` vs `"high"` (latency vs quality) [VERIFIED options]; JSON mode on/off [ASSUMPTION it exists for Gemma 4].
- **Acceptance criteria:** ≥ 3 samples × 2 runs parse as JSON with required fields (parser tolerance for code fences allowed). Decisions on thinking level and JSON mode written in the log. Median latency noted.
- **Verification:** Run script; paste outputs into a scratch file; manually check fields against the contract.
- **Failure modes:** Model adds prose/markdown fences; invents file paths; steps >8; ignores `unclear`; latency too high with thinking on; JSON mode rejected with 400.
- **Done:** Prompt frozen v1; `THINKING_LEVEL` and `GEMMA_MODEL` defaults chosen and recorded; contract field names frozen.

## T05 — Output parser/validator and input validator (with unit tests)
- **Objective:** Turn raw model text into a validated, normalised `data` object; validate request input.
- **Prerequisites:** T04 (frozen schema).
- **Files:** `server/src/validate.js`, `server/src/errors.js`, `server/tests/validate.test.js`.
- **Instructions:** Input validation per limits (min 20, max `MAX_INPUT_CHARS`, string type, trimmed). Output parsing: extract JSON from text (strip fences/leading prose), validate required fields and enum values, clamp arrays (skills ≤6, steps ≤8, caveats ≤4), drop empty entries, coerce missing optional `caveats` to empty. Throw typed errors using codes from the contract. Tests with hand-written good/bad strings (including fenced JSON, missing field, wrong enum, empty string).
- **Acceptance criteria:** All listed cases behave as specified; invalid output yields `BAD_MODEL_OUTPUT`-type error.
- **Verification:** `cd server && node --test` passes.
- **Failure modes:** Over-strict validation rejecting good outputs seen in T04; mutating input; swallowing errors.
- **Done:** Tests green; one real T04 output also passes the validator.

## T06 — Express app skeleton and health endpoint
- **Objective:** Running server with env loading, CORS, JSON body limit, health route, fail-fast config checks.
- **Prerequisites:** T03, T05 (for `errors.js`).
- **Files:** `server/src/index.js`, `server/src/routes/analyze.js` (health only for now), `server/package.json` scripts.
- **Instructions:** Load env; CORS limited to `CORS_ORIGIN`; JSON body limit slightly above max input; `GET /api/health` returns `ok`, model name, `keyConfigured` (boolean only). Central error-handling middleware that returns the error envelope.
- **Acceptance criteria:** Server starts on `PORT`; health returns expected JSON; missing key shows `keyConfigured:false` but server stays up and logs a clear warning.
- **Verification:** `curl http://localhost:3001/api/health`; check response never contains key characters.
- **Failure modes:** Port in use; CORS origin mismatch; body parser rejecting before validation (returns HTML error instead of JSON).
- **Done:** Health works; JSON error envelope for malformed JSON body.

## T07 — `/api/analyze` route with timeout, retry decision, and error mapping
- **Objective:** Full backend path.
- **Prerequisites:** T04, T05, T06.
- **Files modified/created:** `server/src/routes/analyze.js`, `server/src/services/gemma.js` (final form), `server/src/prompt.js` (wired), `server/tests/analyze.test.js` (route test with a mocked model function).
- **Instructions:** Validate input → call model with timeout → parse/validate → respond with `data` and `meta{model, latencyMs}`. Map upstream 429 → `RATE_LIMITED`, abort → `UPSTREAM_TIMEOUT`, other API errors → `UPSTREAM_ERROR`, parse failure → one retry then `BAD_MODEL_OUTPUT` [DECISION: retry once; drop retry if time is short]. Never log bodies or keys.
- **Acceptance criteria:** Valid sample returns `ok:true` with all fields; each error code reproducible (invalid input, too long, bad key, simulated timeout via tiny `MODEL_TIMEOUT_MS`).
- **Verification:** curl each case; `node --test` passes (mocked model for bad-output/timeout cases).
- **Failure modes:** Unhandled promise rejection; double-sending response; leaking upstream error text; retry loop.
- **Done:** All codes demonstrated by curl; tests green.

## T08 — Client scaffold with dev proxy
- **Objective:** Vite React app that talks to the server through a proxy.
- **Prerequisites:** T02 (T06 for proxy verification).
- **Files:** `client/package.json`, `client/index.html`, `client/vite.config.js`, `client/src/main.jsx`, `client/src/App.jsx`, `client/src/styles.css`, `client/.env.example`.
- **Instructions:** Scaffold Vite React (plain JS). Configure `/api` proxy → `http://localhost:3001`. App shows title and a health-check result as a temporary proof of connectivity (remove later).
- **Acceptance criteria:** `npm run dev` serves the page; health status shown from the real server.
- **Verification:** Browser at the Vite URL; network tab shows `/api/health` 200.
- **Failure modes:** Proxy misconfigured; CORS errors; Node/Vite version mismatch.
- **Done:** Page loads and reflects server health.

## T09 — Input form, sample loader, and page states
- **Objective:** Issue form with validation and the four UI states.
- **Prerequisites:** T08.
- **Files:** `client/src/components/IssueForm.jsx`, `client/src/components/ErrorBanner.jsx`, `client/src/App.jsx`, `client/src/styles.css`; sample text embedded or fetched from `samples/` content (copy one sample into the client at build time manually; no network fetch needed).
- **Instructions:** Labelled textarea, character counter, Analyze disabled when invalid/loading, "Load sample issue" button, privacy notice, state machine idle/loading/error/success (success renders placeholder until T10).
- **Acceptance criteria:** Per `PRD.md` US1, US6, US7, FR8.
- **Verification:** Manual: empty → disabled; 19 chars → disabled; 8,001 chars → message; sample loads; double-click doesn't double-submit (check later in T11).
- **Failure modes:** State stuck in loading; textarea cleared on error; counter off by trim differences.
- **Done:** All states reachable and visually distinct.

## T10 — Result view built against the mock fixture
- **Objective:** Render the contract data in clear sections.
- **Prerequisites:** T08; contract frozen (T04/T05).
- **Files:** `client/src/mock/sampleResult.json`, `client/src/components/ResultView.jsx`, `client/src/styles.css`.
- **Instructions:** Create fixture that matches `ARCHITECTURE.md` §4 exactly (hand-written; label it as a fixture and never present it as model output). Sections: Summary, Skills, Difficulty with confidence badge and reasoning, numbered Steps, Caveats (hidden if empty), "Powered by {meta.model}". Render text only (no HTML injection).
- **Acceptance criteria:** Fixture renders all sections; empty caveats hidden; long text wraps; `unclear` level shows a neutral style.
- **Verification:** Temporarily render with the fixture; try variants (empty caveats, `unclear`, 8 steps).
- **Failure modes:** Using `dangerouslySetInnerHTML`; layout overflow with long unbroken text; hard-coded model name.
- **Done:** Fixture-driven view looks acceptable; fixture not used in production path after T11.

## T11 — Integration: real call end-to-end
- **Objective:** Replace the fixture with live responses.
- **Prerequisites:** T07, T09, T10.
- **Files:** `client/src/api.js`, `client/src/App.jsx`, `client/src/components/*` as needed.
- **Instructions:** `analyze(issueText)` fetches `/api/analyze`, handles non-OK and network failure, returns data or throws a typed error with `code`. App maps codes to messages (`ARCHITECTURE.md` §4). Use an abort timeout slightly above the server's. Remove temp health display (or keep as small status).
- **Acceptance criteria:** Each of the 3 samples renders live results; "Powered by" shows the server's model ID; errors preserve input.
- **Verification:** Run both processes; test samples; stop server → see "cannot reach server"; set bad key → `SERVER_MISCONFIGURED` message.
- **Failure modes:** Proxy path mismatch; response shape drift; unhandled rejection leaving spinner on.
- **Done:** **Minimum demo (PRD §11) works locally.** Tag this commit `mvp-working`.

## T12 — Edge cases and manual test pass
- **Objective:** Verify every error state and edge case in `PRD.md` §8.
- **Prerequisites:** T11.
- **Files:** fixes across `server/src` and `client/src`; results recorded in `RESUME.md`.
- **Instructions:** Walk the checklist: empty; short; long; random non-issue text; prompt-injection text; non-English text; HTML/script in input; double-click Analyze; offline; bad key; tiny timeout; model returns malformed output (mock). Fix only defects that would hurt the demo.
- **Acceptance criteria:** No crash, no stuck spinner, no leaked secrets, no raw upstream errors displayed.
- **Verification:** Manual checklist with pass/fail noted.
- **Failure modes:** Fixing too much late; regressions.
- **Done:** Checklist recorded; critical defects closed. *(Scope freeze at 70% — see ROADMAP.)*

## T13 — UI polish (first to cut)
- **Objective:** Professional look within a small time box.
- **Prerequisites:** T11 (T12 preferred).
- **Files:** `client/src/styles.css`, small component tweaks.
- **Instructions:** Consistent type scale and spacing; readable contrast; confidence badge colours; responsive layout down to ~390px; clear header; "Powered by Gemma 4 · open-weight (Apache 2.0)" footer using verified facts only; optional copy-plan button (O3).
- **Acceptance criteria:** Screenshots at laptop and phone width look clean; no horizontal scroll.
- **Verification:** Browser responsive mode; projector-size zoom check.
- **Failure modes:** Endless tweaking; breaking states.
- **Done:** Time box ended and committed.

## T14 — Final README from README-PLAN
- **Objective:** README that satisfies both challenges and lets a stranger run the app.
- **Prerequisites:** T11 minimum; T13 if done.
- **Files:** `README.md`, `docs/screenshots/*.png` (real screenshots only).
- **Instructions:** Fill every section in `README-PLAN.md` from observed reality; state the exact model ID in `GEMMA_MODEL`'s default and in a prominent line; link to the file implementing the call; list true limitations.
- **Acceptance criteria:** README Verification list in `README-PLAN.md` fully ticked; no fabricated claims.
- **Verification:** Read it as a newcomer; compare model ID with server default and `.env.example`.
- **Failure modes:** Model ID mismatch; missing setup step; invented metrics.
- **Done:** Committed.

## T15 — Publish, secret scan, and fresh-clone test
- **Objective:** Public repo is correct, clean and reproducible.
- **Prerequisites:** T14.
- **Files:** none new (fixes only).
- **Instructions:** Search working tree and history for the key (and for `.env`); rotate key if found in history. Push. Clone into a new empty directory; follow the README exactly with a fresh `.env` copy; run both processes; analyze a sample.
- **Acceptance criteria:** Clean scan; fresh clone works; GitHub shows licence; repo public.
- **Verification:** `git log --all -p` search for key prefix; fresh-clone run.
- **Failure modes:** Missing dependency in `package.json`; README steps out of order; committed `.env`.
- **Done:** Fresh clone demo succeeds.

## T16 — Demo rehearsal and submission
- **Objective:** Submit correctly and be ready to present.
- **Prerequisites:** T15.
- **Files:** optional demo script notes in `docs/planning/`.
- **Instructions:** Rehearse a 2-minute demo: problem → paste/load sample → live Gemma 4 result → show the API-call code file → show README model line → limitations honesty. Test on the venue network and on a hotspot. Optionally record a screen capture of a real run (label as recording). Complete the submission form/platform for both challenges [CONFIRM details].
- **Acceptance criteria:** `PRD.md` §12 checklist fully ticked; submission confirmation received/saved.
- **Verification:** Checklist; confirmation screenshot.
- **Failure modes:** Missing submission field; wrong repo link; deadline miss.
- **Done:** Submitted; `RESUME.md` marked complete.

---

## Optional tasks (only after T11 is done and time remains; none are required)
- **O1 Local Ollama fallback:** add a second provider behind `gemma.js` selected by an env var. [CONFIRM model tag availability and hardware.] Must not remove the Gemini API path. Verify with one sample offline.
- **O2 Deploy:** single host; key via host secrets; verify cold start. Do not rely on it for the demo.
- **O3 Copy plan as Markdown:** button + formatting; verify pasted output readable.
- **O4 Extra-context textbox:** optional field appended to user content; update contract (`contextText`), validation, tests, README.
