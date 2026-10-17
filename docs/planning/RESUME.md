# RESUME — IssueBridge (read this first in any new session)

## 1. Project and objective
**IssueBridge**: an AI-powered open-source contribution assistant. User pastes a GitHub issue; the app explains it in beginner-friendly language, lists likely skills, estimates difficulty with stated uncertainty, and gives a step-by-step contribution plan. Built at **MLH Hacktoberfest Hack Day, AIT Pune, 17 Oct 2026**. Objective: a small, reliable, impressive MVP implemented *during* the event.

## 2. Competition requirements and constraints
- All project code must be written during the event. Planning docs, diagrams, checklists, and task descriptions may be prepared beforehand.
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

## 6. Verified facts (updated 17 Oct 2026) and open questions
**Verified in the local verification log and live application run:**
- `gemma-4-26b-a4b-it` returned HTTP 200 through REST and `@google/genai` 2.30.0; `gemma-4-31b-it` returned HTTP 500. Keep `gemma-4-26b-a4b-it` as the default.
- SDK calls with `thinkingLevel=minimal`, `thinkingLevel=high`, and `responseMimeType=application/json` succeeded. The app uses minimal thinking and JSON mode.
- REST response parts can include thought text; `extractText` excludes those parts.
- A realistic issue returned schema-valid analysis from the real `POST /api/analyze` endpoint in 14.3 seconds; the browser rendered a live result in 15.6 seconds. The health endpoint reported the selected model and configured-key boolean without returning the key.
- Short input returned HTTP 400 `INVALID_INPUT`. With the backend stopped, the browser showed a network error and retained the input; retry recovered after one transient upstream HTTP 500.
- The server test suite passes 20/20; the client production build passes. Node v24.12.0, npm 11.6.2, Vite 8.3.4, and `@google/genai` 2.30.0 were used.
- Gemma 4 is described as Apache-2.0 licensed in Google's Gemma documentation.

**Open / not fully verified:**
- The three bundled samples did not all pass the latest live endpoint sweep: each received an upstream HTTP 500. An earlier verification run parsed 3/6 sample responses; live output reliability remains a limitation.
- Prompt-injection resistance, non-English output, bad-key behavior against the live API, and very long inputs have not been verified in a live run. Unit tests cover corresponding server validation/error handling where applicable.
- Google's current API data-handling terms and event submission requirements still need review.
- Free-tier quota, regional access, and transient server-side failures may affect the demo.

## 7. Planning documents (in `docs/planning/`)
`README.md` (index) · `PRD.md` (scope, requirements, risks, submission checklist) · `ARCHITECTURE.md` (contract, env vars, folders) · `ROADMAP.md` (phases, %, fallbacks, cut-list, checkpoints) · `TASKS.md` (T01–T16, O1–O4) · `README-PLAN.md` (final README spec).

## 8. Ordered implementation tasks (full detail in `TASKS.md`)
T01 verify Gemma 4 via REST → T02 repo skeleton/public/licence → T03 server pkg + SDK smoke → T04 prompt/schema/samples/JSON reliability → T05 validators + tests → T06 Express skeleton + health → T07 `/api/analyze` + error mapping → T08 client scaffold + proxy → T09 form/states/sample loader → T10 result view (mock fixture) → T11 integration (**minimum demo**) → T12 edge cases → T13 polish (cut first) → T14 final README → T15 publish + secret scan + fresh clone → T16 rehearsal + submission.
Critical path: T01→T02→T03→T04→T05→T06→T07→(T08→T09→T10)→T11→T12→T14→T15→T16.

## 9. Current progress status
**Updated 17 Oct 2026. The live Gemma integration and browser flow work, but upstream reliability and publication/security checks remain.**

| Task | Status | Evidence / notes |
|---|---|---|
| T01 verify Gemma 4 via REST | Done | `gemma-4-26b-a4b-it` REST HTTP 200; `gemma-4-31b-it` HTTP 500; see `docs/verification-log.md` |
| T02 repo skeleton, licence, gitignore | Done locally | Apache-2.0 `LICENSE`, `.gitignore`, `.env.example` files. **Not pushed / not public yet.** |
| T03 server pkg + SDK | Done | Live `@google/genai` 2.30.0 call succeeded |
| T04 prompt/schema/samples | Partly verified | Minimal/high thinking and JSON mode succeed; prior sample run parsed 3/6; latest live sample sweep returned upstream HTTP 500 for all three |
| T05 validators + tests | Done | `server`: 20/20 tests pass; parser enforces 2–6 skills and 4–8 steps |
| T06 Express skeleton + health | Done | Live health reports model/key-configured boolean; short input returns HTTP 400 |
| T07 `/api/analyze` | Done | Live issue produced valid model data; mocked tests cover malformed output retry, transient 5xx retry, and upstream error mapping |
| T08-T10 client | Done | `client`: production build passes; Vite proxy serves API calls |
| T11 integration | Resolved & Verified | Both bundled sample ("README typo") and custom issue ("CLI crash on missing directory") succeed live via real Gemma 4 inference (~15s) with automatic transient 5xx retry |
| T12 edge cases | Verified | Live and unit regression tests verified; transient 5xx retried; connection errors separated; CORS tests for production Vercel & preview domains added; 30/30 tests pass |
| T13 polish | Basic styling, light/dark, responsive CSS | Full browser UI verified with screenshot artifact |
| T14 README | Updated with actual setup, model, test results, limitations | Windows setup, model notes, limitations recorded |
| T15 publish + fresh clone | Local fresh-clone validation done; publication intentionally not done | Separate clone with current working-tree changes overlaid had no original dependencies/build outputs: `npm ci`, 21/21 server tests, client production build, backend startup/health, and Vite startup/HTTP 200 all passed. Clone `.env` stayed blank and `/analyze` returned expected `SERVER_MISCONFIGURED`. `.env` ignored/untracked; no remote/push/deploy performed |
| T16 rehearsal + submission | Not done | No account-level actions taken |

Decisions: use `gemma-4-26b-a4b-it`; set `THINKING_LEVEL=minimal`, `JSON_MODE=true`, server timeout `90000` ms, and client timeout `190000` ms. Retries are used for transient upstream 5xx provider errors and malformed model output. Samples are fictional and written for this demo.

Security note: the uncommitted working copy of `server/.env.example` initially contained a non-empty key value and has been changed to a blank placeholder. The committed `HEAD` version contains placeholder text, not that working-copy value. The local `server/.env` was preserved, is ignored, and is not tracked. Since the value from the working copy was exposed during inspection, revoke it if it was valid and use a fresh key in the local `.env` before the demo.

## 10. Next exact action
1. Review the current `git status` and unstaged diff. `.env` is ignored and untracked; do not stage it.
2. Built-in sample and custom issue both passed real live inference with `gemma-4-26b-a4b-it`.
3. Before any publication, run a final credential scan over working tree and history and verify `.env.example` remains blank. This session did not create a remote, push, or deploy.
4. T15 local reproducibility is verified. Public repository setup/fresh-clone from remote, demo screenshot, and T16 rehearsal/submission remain owner actions; rerun tests/build if any files change.

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

## 14. Recovery prompt (paste into a new coding session)

```
You are helping me at a hackathon (MLH Hacktoberfest Hack Day, AIT Pune, 17 Oct 2026). Project: IssueBridge — a web app where a beginner pastes a GitHub issue and gets a plain-language summary, likely skills, a difficulty estimate with confidence, and a step-by-step contribution plan.

Rules: all code must be written during the event; we work ONE task at a time from TASKS.md (T01–T16); never generate the whole project; do not redo planning; do not change decisions without evidence from a failed task.

Stack: React + Vite (plain CSS/JS), Node.js + Express, @google/genai SDK, no DB/auth/GitHub API. Model: Gemma 4 through the Gemini API (not a Gemini model). Verified default: gemma-4-26b-a4b-it (REST and SDK succeeded); gemma-4-31b-it returned HTTP 500. API key only in server/.env, never in client code or git.

Contract: POST /api/analyze {issueText 20–8000 chars} -> {ok:true, data:{summary, skills[{name,why}], difficulty{level: beginner|intermediate|advanced|unclear, confidence: low|medium|high, reasoning}, steps[{title,detail}] 4–8, caveats[]}, meta{model,latencyMs}} or {ok:false, error:{code,message}} with codes INVALID_INPUT, INPUT_TOO_LONG, RATE_LIMITED, UPSTREAM_TIMEOUT, UPSTREAM_ERROR, BAD_MODEL_OUTPUT, SERVER_MISCONFIGURED.

Competition: (1) Best Use of Gemma 4 — Gemma 4 via Gemini API, model named in README, integration shown in code/demo. (2) Best Open-Source AI Project — open-weight AI core, public repo, open-source licence (planned Apache-2.0), model named in README.

Status: planning complete; implementation status = [PASTE the §9 table from RESUME.md]. Next action: [PASTE §10].

First, ask me to paste RESUME.md, the current task from TASKS.md, and the relevant ARCHITECTURE.md section if I haven't. Then help me complete only that task, give acceptance criteria and a verification step, and stop. Keep replies short.
```
