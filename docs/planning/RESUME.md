# RESUME — IssueBridge (read this first in any new session)

## 1. Project and objective
**IssueBridge**: an AI-powered open-source contribution assistant. User pastes a GitHub issue; the app explains it in beginner-friendly language, lists likely skills, estimates difficulty with stated uncertainty, and gives a step-by-step contribution plan. Built at **MLH Hacktoberfest Hack Day, AIT Pune, 17 Oct 2026**. Objective: a small, reliable, impressive MVP implemented *during* the event.

## 2. Competition requirements and constraints
- All project code must be written during the event. Planning docs, diagrams, checklists, task descriptions may be prepared beforehand. **No application code exists yet.**
- Challenge 1 — Best Use of Gemma 4: Gemma 4 explicitly, via the Gemini API; model named in README; integration shown in code or demo.
- Challenge 2 — Best Open-Source AI Project: open-source/open-weight AI core; public GitHub repo; open-source licence; model named in README.
- Gemini and Gemma models are **not** interchangeable; do not substitute Gemini for the Gemma challenge.

## 3. Agreed technology stack [DECISION]
React + Vite (plain CSS, plain JS) · Node.js + Express · `@google/genai` SDK · Gemma 4 via Gemini API (model ID from `GEMMA_MODEL`) · no database/auth/GitHub API · Node built-in test runner · Apache-2.0 licence · local run is the primary demo path.

## 4. Finalised MVP scope
Paste issue (20–8,000 chars) → `POST /api/analyze` → JSON `{summary, skills[], difficulty{level,confidence,reasoning}, steps[4–8], caveats[]}` + `meta{model, latencyMs}` → rendered sections. Sample loader, loading/error/success states, privacy notice, "Powered by" line. **Out of scope:** DB, auth, GitHub API/URL fetching, repo code analysis, history, streaming. Optional only after T11: O1 Ollama fallback, O2 deploy, O3 copy plan, O4 extra-context box.

## 5. Key architecture decisions
- API key only in `server/.env`; never `VITE_*`; no request-body logging.
- All model access in one file (`server/src/services/gemma.js`); contract and error codes in `ARCHITECTURE.md` §4.
- Server validates input and model output; one retry on malformed output (droppable).
- Client built against a mock fixture first, then integrated.
- Issue text is untrusted data; rendered as plain text.

## 6. Verified facts (16 Oct 2026) and unresolved assumptions
**Verified** (official page ai.google.dev/gemma/docs/core/gemma_on_gemini_api, "last updated 2026-07-02"):
- Gemini API supports Gemma 4 IDs `gemma-4-31b-it` and `gemma-4-26b-a4b-it`.
- REST pattern `https://generativelanguage.googleapis.com/v1beta/models/<id>:generateContent`.
- JS SDK `@google/genai` with `GoogleGenAI`, `ai.models.generateContent`; `systemInstruction`; `thinkingConfig.thinkingLevel` (`"high"` on, `"minimal"` off).
- API key from Google AI Studio.
- Gemma 4 is Apache 2.0 licensed (official nav "Gemma 4 license"; AI Studio announcement).
- That page shows a "documentation deprecated; see gemma.ai" banner.

**Unresolved [ASSUMPTION]/[CONFIRM] (test or ask):**
- Our key/network/region/quota actually work (T01). Free-tier limits for Gemma reportedly low (third-party source only).
- Auth header form `x-goog-api-key` for curl (standard convention; official curl omits it).
- JSON response mode support for Gemma 4 (T04); default thinking behaviour and whether thought parts appear in responses (T03/T04).
- SDK reads `GEMINI_API_KEY` automatically; SDK's Node version requirement.
- Whether Google may use free-tier prompts for product improvement (affects privacy wording).
- Organiser questions: see §12.

## 7. Planning documents (same folder; in the repo later at `docs/planning/`)
`README.md` (index) · `PRD.md` (scope, requirements, risks, submission checklist) · `ARCHITECTURE.md` (contract, env vars, folders) · `ROADMAP.md` (phases, %, fallbacks, cut-list, checkpoints) · `TASKS.md` (T01–T16, O1–O4) · `README-PLAN.md` (final README spec).

## 8. Ordered implementation tasks (full detail in `TASKS.md`)
T01 verify Gemma 4 via REST → T02 repo skeleton/public/licence → T03 server pkg + SDK smoke → T04 prompt/schema/samples/JSON reliability → T05 validators + tests → T06 Express skeleton + health → T07 `/api/analyze` + error mapping → T08 client scaffold + proxy → T09 form/states/sample loader → T10 result view (mock fixture) → T11 integration (**minimum demo**) → T12 edge cases → T13 polish (cut first) → T14 final README → T15 publish + secret scan + fresh clone → T16 rehearsal + submission.
Critical path: T01→T02→T03→T04→T05→T06→T07→(T08→T09→T10)→T11→T12→T14→T15→T16.

## 9. Current progress status
**Updated 17 Oct 2026 (build session). MVP code complete; LIVE Gemma 4 call NOT yet verified.**

The build workspace could not reach `generativelanguage.googleapis.com` (egress proxy returned 403 for the host), so T01/T03/T04 live checks must be run on the developer machine via `cd server && npm run verify`.

| Task | Status | Evidence / notes |
|---|---|---|
| T01 verify Gemma 4 via REST | **BLOCKED here; script ready** | `server/scripts/verify.js` does REST (both IDs), SDK, thinking levels, JSON mode, 3 samples x2; writes `docs/verification-log.md` (key redacted) |
| T02 repo skeleton, licence, gitignore | Done locally | Apache-2.0 `LICENSE`, `.gitignore`, `.env.example` files. **Not pushed / not public yet.** |
| T03 server pkg + SDK | Code done; live smoke pending | `@google/genai` 2.30.0, express 5.3.0, Node 22.22.0 |
| T04 prompt/schema/samples | Prompt v1 + 3 fictional samples written; **JSON reliability on real model untested** | `server/src/prompt.js`, `samples/` |
| T05 validators + tests | Done | `cd server && npm test` -> 20/20 pass |
| T06 Express skeleton + health | Done | curl-verified (health, invalid input, missing key, bad JSON, unknown route) |
| T07 `/api/analyze` | Done (model mocked in tests) | one retry on bad output; error mapping tested |
| T08-T10 client | Done | `npm run build` OK |
| T11 integration | Done against STUBBED model | 18/18 Playwright checks through real Vite proxy + real Express; backend-down state checked |
| T12 edge cases | Partly | Verified: empty/short/long, double-click, rate-limit, malformed output, backend down, HTML-in-output rendered as text, 390px no h-scroll. **Not verified:** real prompt-injection / non-English behaviour, real timeout, real bad key |
| T13 polish | Basic styling, light/dark | no real screenshots in repo yet (must be taken from a LIVE run) |
| T14 README | Written, honest status table | Remove/adjust the Status table after `npm run verify` passes |
| T15 publish + fresh clone | **Not done** | Secret scan of working tree clean (no `AQ.`/`AIza` patterns). Not pushed. |
| T16 rehearsal + submission | Not done | |

Decisions: model default `gemma-4-26b-a4b-it` (unverified live); `THINKING_LEVEL` empty (thinkingConfig not sent) and `JSON_MODE=false` until `verify` shows what Gemma 4 accepts; retry once on malformed output; samples are fictional (labelled), not copied from real repos.

Security note: the API key was pasted into the chat by the user. Rotate it in Google AI Studio after the event (or now) and use a fresh key in `server/.env`.

## 10. Next exact action
1. On your machine: `cd server && npm install && cp .env.example .env`, edit `.env` and set `GEMINI_API_KEY` (never paste it in chat).
2. `npm run verify`. Read `docs/verification-log.md`.
   - If a model ID works: set `GEMMA_MODEL` in `.env` and in the defaults (`server/src/services/gemma.js`, `server/.env.example`, README), set `THINKING_LEVEL`/`JSON_MODE` per the log, and fix `prompt.js` if samples are not 6/6 valid.
   - If it fails: use the HTTP status table in TASKS T01 failure modes; try hotspot; ask organisers.
3. `npm start` (server) + `cd ../client && npm install && npm run dev`; analyze all three samples; take real screenshots into `docs/screenshots/`.
4. Update README status table, create the public GitHub repo, secret-scan, push, fresh-clone test (T15), submit (T16).

## 11. Instructions for a new AI session
1. Read `RESUME.md`, then `TASKS.md` (current task only), then the relevant sections of `ARCHITECTURE.md`/`PRD.md` **before recommending any change**.
2. Do **not** repeat completed planning or re-derive decisions already marked [DECISION]; propose changes only with evidence from a failed task.
3. Do **not** generate the entire project at once. Help with exactly one task at a time and stop after its verification.
4. Never hard-code a model ID until T01 passes; never put the key in client code or committed files.
5. Distinguish verified facts, assumptions, and confirmations; re-verify anything dated before the event if it matters.
6. Keep answers short; code is written only at the event.

## 12. To confirm with the organisers
1. Hosted Gemma 4 via the Gemini API counts for *Best Open-Source AI Project* as "open-weight core"?
2. One project may enter both challenges?
3. Are API keys/credits provided; quotas/rate limits for shared Wi-Fi; allowed networks/hotspots?
4. Coding start time, deadline, submission platform and format; demo length; video required?
5. How "written during the event" is checked; may planning docs be in the repo; may `npm create vite`/dependency installs and AI coding assistants be used; disclosure needed?
6. Required/preferred licences; is a deployed public URL required?
7. Team size and judging criteria.

## 13. Update checklist (do after EVERY completed task)
- [ ] Mark the task Done in the §9 table with date/time and commit hash
- [ ] Record decisions (model ID, thinking level, JSON mode, SDK version, latency) in §9 and move items from §6 "unresolved" to "verified"
- [ ] Update §10 "Next exact action" to the next task
- [ ] Note deviations from `TASKS.md`/`ROADMAP.md` and any scope cuts
- [ ] Confirm no secrets staged; commit and push
- [ ] Check the ROADMAP checkpoint for the current % of time; trigger fallback if behind

## 14. Recovery prompt (paste into a new Claude or ChatGPT session)

```
You are helping me at a hackathon (MLH Hacktoberfest Hack Day, AIT Pune, 17 Oct 2026). Project: IssueBridge — a web app where a beginner pastes a GitHub issue and gets a plain-language summary, likely skills, a difficulty estimate with confidence, and a step-by-step contribution plan.

Rules: all code must be written during the event; we work ONE task at a time from TASKS.md (T01–T16); never generate the whole project; do not redo planning; do not change decisions without evidence from a failed task.

Stack: React + Vite (plain CSS/JS), Node.js + Express, @google/genai SDK, no DB/auth/GitHub API. Model: Gemma 4 through the Gemini API (not a Gemini model). Official docs (ai.google.dev/gemma/docs/core/gemma_on_gemini_api, checked 16 Oct 2026) list IDs gemma-4-31b-it and gemma-4-26b-a4b-it; do not assume an ID works until my T01 curl test passes. API key only in server/.env, never in client code or git.

Contract: POST /api/analyze {issueText 20–8000 chars} -> {ok:true, data:{summary, skills[{name,why}], difficulty{level: beginner|intermediate|advanced|unclear, confidence: low|medium|high, reasoning}, steps[{title,detail}] 4–8, caveats[]}, meta{model,latencyMs}} or {ok:false, error:{code,message}} with codes INVALID_INPUT, INPUT_TOO_LONG, RATE_LIMITED, UPSTREAM_TIMEOUT, UPSTREAM_ERROR, BAD_MODEL_OUTPUT, SERVER_MISCONFIGURED.

Competition: (1) Best Use of Gemma 4 — Gemma 4 via Gemini API, model named in README, integration shown in code/demo. (2) Best Open-Source AI Project — open-weight AI core, public repo, open-source licence (planned Apache-2.0), model named in README.

Status: planning complete; implementation status = [PASTE the §9 table from RESUME.md]. Next action: [PASTE §10].

First, ask me to paste RESUME.md, the current task from TASKS.md, and the relevant ARCHITECTURE.md section if I haven't. Then help me complete only that task, give acceptance criteria and a verification step, and stop. Keep replies short.
```
