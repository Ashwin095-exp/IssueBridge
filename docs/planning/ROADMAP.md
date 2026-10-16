# ROADMAP — IssueBridge

Legend: **[VERIFIED] / [ASSUMPTION] / [DECISION] / [CONFIRM]**. Percentages are shares of *available build time* (the event's coding deadline is not assumed; **[CONFIRM]** actual hours). Task details are in `TASKS.md`; scope in `PRD.md`.

## Principles
1. Highest-risk dependency first: **Can we call Gemma 4 through the Gemini API from our key and network?** Everything else is easy by comparison.
2. Get one real end-to-end path (paste → Gemma → render) as early as possible, then harden.
3. Freeze scope at **70%** of build time. After that: bugs, polish, docs, submission only.

## Phase table

| # | Phase | Time | Tasks |
|---|---|---|---|
| 1 | Initial setup | 5% | T01, T02 |
| 2 | AI integration verification | 10% | T03, T04 |
| 3 | Backend implementation | 20% | T05, T06, T07 |
| 4 | Frontend implementation | 20% | T08, T09, T10 |
| 5 | Frontend/backend integration | 10% | T11 |
| 6 | Testing and error handling | 10% | T12 |
| 7 | UI polish | 10% | T13 |
| 8 | GitHub publishing and submission | 10% | T14, T15, T16 |
| — | Unallocated buffer | 5% | — |

Note on ordering: `T01` (a raw REST check, no repo needed) is deliberately the very first action even though Phase 1 is "setup", because it validates the highest risk before any scaffolding time is spent. Phase 4 can run in parallel with Phase 3 if more than one person is building; it uses a mock fixture so it does not depend on the backend.

## Phases in detail

### Phase 1 — Initial setup (5%)
- **Objective:** Confirm key + network + model access; create the public repo skeleton.
- **Deliverable:** Recorded T01 result (working model ID, latency, any errors); repo with LICENSE, `.gitignore`, folders, first commit.
- **Dependencies:** Google account, AI Studio key, Node.js, git, GitHub account.
- **Verification:** curl returns text from `gemma-4-…` model; `git status` shows `.env` ignored.
- **Fallback:** See *Model fallback ladder* below; if no key is obtainable, ask organisers immediately (do not wait).

### Phase 2 — AI integration verification (10%)
- **Objective:** Prove Node + `@google/genai` calls the chosen Gemma 4 model, and find a prompt that yields reliable JSON on 3 real sample issues.
- **Deliverable:** `server/src/services/gemma.js` (minimal), `smoke` script, `prompt.js`, `samples/` ×3, a short notes file of observations (latency, JSON mode yes/no, thinking level chosen).
- **Dependencies:** Phase 1.
- **Verification:** 3/3 samples produce parseable JSON matching the schema (allowing the parser's tolerance); latency recorded.
- **Fallback:** If JSON mode is unsupported → rely on prompt + parser. If one model ID fails → try the other. If outputs are unreliable → shrink the schema (drop `caveats`, reduce skills), then simplify prompts. If SDK misbehaves → raw REST `fetch` from Node (same endpoint, [VERIFIED] pattern).

### Phase 3 — Backend implementation (20%)
- **Objective:** Robust `/api/analyze` with validation, error mapping, tests.
- **Deliverable:** `validate.js`, `errors.js`, `index.js`, `routes/analyze.js`, tests.
- **Dependencies:** Phase 2 results (schema, thinking level).
- **Verification:** curl with valid input returns `ok:true`; invalid inputs return documented codes; `node --test` passes.
- **Fallback:** Cut unit tests to `validate.js` only; skip retry logic (single attempt); drop rate limiter.

### Phase 4 — Frontend implementation (20%)
- **Objective:** Usable page for input, sample loading, and all states, built against `mock/sampleResult.json`.
- **Deliverable:** Vite React app with `IssueForm`, `ResultView`, `ErrorBanner`, `styles.css`.
- **Dependencies:** Phase 1 (repo) and contract in `ARCHITECTURE.md`. Not dependent on a working backend.
- **Verification:** Visual check with the fixture; all four states reachable via a temporary dev switch or by editing mock data.
- **Fallback:** Collapse components into `App.jsx`; drop section icons/animations; keep plain HTML structure.

### Phase 5 — Integration (10%)
- **Objective:** Real model output renders in the real UI through the proxy.
- **Deliverable:** `api.js` wired into `App.jsx`; remove/keep fixture only for dev.
- **Dependencies:** Phases 3 and 4.
- **Verification:** Load each sample, click Analyze, see live results; metadata shows model ID.
- **Fallback:** If proxy/CORS troubles → set `CORS_ORIGIN` and `VITE_API_BASE_URL` explicitly; if still failing, serve built client from Express.

### Phase 6 — Testing and error handling (10%)
- **Objective:** Every error code and edge case in `PRD.md` §8 behaves.
- **Deliverable:** Manual test checklist results recorded in `RESUME.md`; fixes.
- **Dependencies:** Phase 5.
- **Verification:** Checklist in T12 fully ticked; double-submit prevented; disconnected network handled.
- **Fallback:** Prioritise: empty input, upstream error, malformed output, timeout. Skip exotic cases.

### Phase 7 — UI polish (10%) — *first to be cut*
- **Objective:** Looks professional and legible on projector and phone width.
- **Deliverable:** Typography, spacing, confidence badge, "Powered by Gemma 4" line, privacy notice, responsive tweaks; optional copy button.
- **Dependencies:** Phase 5 (Phase 6 preferred).
- **Verification:** Screenshot review at laptop and ~390px widths.
- **Fallback:** Ship with the minimal clean style; do only the "Powered by" line and privacy notice.

### Phase 8 — GitHub publishing and submission (10%) — *protect this time*
- **Objective:** Public, licensed, documented, secret-free repo; submission and demo ready.
- **Deliverable:** Final README (from `README-PLAN.md`), screenshots, pushed repo, fresh-clone test, demo rehearsal, submission form complete.
- **Dependencies:** Working MVP (Phase 5 minimum).
- **Verification:** Fresh clone in a clean directory runs from the README; secret scan clean; submission checklist (`PRD.md` §12) ticked.
- **Fallback:** If short on time, publish the minimum: README with model name + setup, LICENSE, one screenshot.

## Model fallback ladder (Phase 1–2 failure handling)

1. `gemma-4-26b-a4b-it` fails → try `gemma-4-31b-it` (or vice versa).
2. Retry with `thinking` set to the other level; shorten the prompt.
3. Wait/retry on 429; check quota page; ask organisers for another key/credits; try another network (phone hotspot).
4. Run Gemma 4 locally (e.g., via Ollama or similar) behind the same `gemma.js` interface — **[CONFIRM]** exact model tag and hardware feasibility beforehand; this satisfies the Open-Source challenge but **may not satisfy the "through the Gemini API" requirement** of the Gemma 4 challenge → ask organisers.
5. Last-resort demo safety only: replay a previously recorded *real* Gemma 4 output, clearly labelled as recorded. Never present it as live.
6. Do **not** substitute a Gemini model for the Gemma challenge.

## Checkpoints (percent of build time)

| At | Must be true | If not |
|---|---|---|
| 10% | T01 passed; repo public with LICENSE | Escalate to organisers; start ladder step 3–4 |
| 25% | T04 passed (3/3 samples parseable) | Shrink schema; simplify prompt |
| 45% | T07 passed (backend works by curl) | Cut tests/retry; keep single path |
| 60% | T11 passed (end-to-end in browser) | Stop all frontend extras; fix integration |
| 70% | **Scope freeze.** MVP demo works | Switch to bug-fix/docs only |
| 85% | T14 README complete, T15 pushed | Drop polish entirely |
| 95% | T16 submission done | Submit what exists |

## Critical path

`T01 → T02 → T03 → T04 → T05 → T06 → T07 → (T08 → T09 → T10) → T11 → T12 → T14 → T15 → T16`

T13 (polish) is off the critical path. T08–T10 can run in parallel with T05–T07 for a multi-person team.

## What to drop first (in order)

1. All optional items O1–O4.
2. Polish extras: animations, copy button, dark mode, icons (T13).
3. Extra samples (keep at least 1, ideally 3).
4. Tests beyond `validate.js` and a mocked route test.
5. Retry-on-bad-output logic (single attempt + clear error).
6. `caveats` field (schema shrink; update fixture and UI together).
7. Responsive/mobile tweaks.
8. Number of screenshots (keep one).

**Never drop:** T01, T03–T07, T11, model name in README, public repo + licence, secret scan, T16.
