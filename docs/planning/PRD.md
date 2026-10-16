# PRD — IssueBridge

Legend: **[VERIFIED] / [ASSUMPTION] / [DECISION] / [CONFIRM]** (see `README.md`). Architecture, API contract and folders live in `ARCHITECTURE.md`; ordering in `ROADMAP.md`; tasks in `TASKS.md`.

## 1. Product overview and problem statement

Beginners who want to contribute to open source (for example during Hacktoberfest) often open a GitHub issue and cannot tell: what is it asking, what skills does it need, is it too hard for me, and what should I do first. Maintainers' issue text assumes context beginners lack. This leads to abandoned attempts, low-quality pull requests, or never starting.

**IssueBridge** takes a pasted issue description and returns four things: a plain-language explanation, the likely skills required, a difficulty estimate that states its own uncertainty, and a step-by-step contribution plan.

### Idea challenge (planning-time review) [DECISION]
- *Keep* the core idea: it is small, demoable in under a minute, and maps cleanly to both challenges.
- *Weakness:* "paste text, get LLM summary" is easy to dismiss as a thin wrapper. *Mitigation (cheap, in scope):* make the output **honest and structured** — explicit confidence on difficulty, explicit "what I could not tell from this text" caveats, and a plan whose first steps are about *claiming and understanding* the issue (read CONTRIBUTING, comment to claim, reproduce), not just coding.
- *Weakness:* without repo context the plan is generic. *Mitigation:* say so in the UI and README; optional enhancement lets the user paste extra context (CONTRIBUTING excerpt / file list).
- *Alternative rejected:* fetching issues by URL via the GitHub API. Adds rate limits, error cases and a dependency for no judging benefit. Out of scope.
- *Alternative rejected:* RAG over repository code. Too large for a hack day.

## 2. Target users and personas

| Persona | Description | Need |
|---|---|---|
| **Aarav, first-year student** | Joined Hacktoberfest, knows basic Python/JS, never made a PR | "What is this issue even saying, and can I do it?" |
| **Meera, bootcamp grad** | Comfortable coding, new to open-source workflow | "What are the exact steps — fork, branch, test, PR?" |
| **Rohan, mentor/organiser** | Helps many beginners pick issues | "Quickly judge whether an issue suits a beginner." |

Primary persona for the demo: Aarav.

## 3. Value proposition

Turn an intimidating issue into an actionable, honest plan in under a minute, without needing an account, a GitHub token, or any setup, using an open-weight model (Gemma 4).

## 4. User journey

1. Open the app. See a short explanation, a privacy notice, and a "Load sample issue" button.
2. Paste an issue (or load a sample). Click **Analyze**.
3. See a loading state (target under ~20 s [ASSUMPTION], measured in T01/T04).
4. Read results top to bottom: **Summary → Skills → Difficulty (with confidence) → Contribution plan → Caveats**.
5. (Optional) Copy the plan. Start a new analysis.
6. On failure: see a specific, friendly error with a Retry button; input is preserved.

## 5. Requirements

### 5.1 Mandatory functional requirements (MVP)
- **FR1** Accept pasted issue text in a textarea; enforce min 20 and max 8,000 characters [DECISION, tunable].
- **FR2** Send text to the backend; backend calls **Gemma 4 through the Gemini API** with a fixed system instruction.
- **FR3** Return structured JSON with: `summary`, `skills[]`, `difficulty{level, confidence, reasoning}`, `steps[]` (4–8), `caveats[]` (schema in `ARCHITECTURE.md`).
- **FR4** Render each section distinctly; render model text as plain text (no raw HTML injection).
- **FR5** Loading, empty, error and success states.
- **FR6** "Load sample issue" button with at least one realistic sample (demo safety net).
- **FR7** Show which model produced the answer (from server metadata, not hard-coded text in UI).
- **FR8** Privacy notice: text is sent to Google's Gemini API; do not paste confidential content.

### 5.2 Mandatory non-functional requirements
- **NFR1 Security:** API key only on the server; never in client bundle, repo, logs, or screenshots.
- **NFR2 Reliability:** malformed model output never crashes the server or UI; handled as `BAD_MODEL_OUTPUT`.
- **NFR3 Performance:** request timeout (default 30 s [ASSUMPTION]); UI never hangs without feedback.
- **NFR4 Usability:** works on latest Chrome at laptop width; basic mobile width does not break; labelled inputs; keyboard-usable button.
- **NFR5 Privacy:** no database; issue text is not persisted and not logged.
- **NFR6 Reproducibility:** a fresh clone runs by following the README with only Node and an API key.
- **NFR7 Honesty:** uncertainty shown; no invented benchmarks or accuracy claims anywhere.

### 5.3 Optional enhancements (only after the minimum demo works)
- O1 Local Ollama fallback provider (open-weight, offline story; strengthens the Open-Source challenge). See `TASKS.md`.
- O2 Deploy a public demo URL.
- O3 Copy plan as Markdown.
- O4 Optional "extra context" textbox (CONTRIBUTING excerpt) passed to the model.
- Later ideas, not planned: streaming output, dark mode, per-step checkboxes (localStorage), light rate limiting UI.

## 6. MVP scope and explicit out-of-scope

**In scope:** single page; paste-only input; one backend endpoint plus a health check; one hosted model call per analysis; structured output; local run as the primary demo path.

**Out of scope:** database, accounts/auth, GitHub API or URL fetching, repository code analysis, history/saved analyses, multi-language UI, payments, analytics, fine-tuning, multi-model comparison, streaming, browser extension, anything requiring a GitHub token.

## 7. User stories and acceptance criteria (mandatory unless marked)

| ID | Story | Acceptance criteria |
|---|---|---|
| US1 | As a beginner, I paste an issue and press Analyze | Button disabled when input is invalid or while loading; request sent once; results appear without page reload |
| US2 | I want a plain-language explanation | `summary` is 2–5 sentences, jargon explained; shown first |
| US3 | I want to know required skills | 2–6 skills, each with a short reason |
| US4 | I want a difficulty estimate I can trust | Level shown with confidence and reasoning; if the issue text is vague, level may be `unclear` with low confidence |
| US5 | I want a plan | 4–8 ordered steps, each with title and detail; includes at least one step about reading contribution guidelines/claiming the issue when the text allows |
| US6 | I want clear errors | Each error code in `ARCHITECTURE.md` maps to a human message; input preserved; Retry works |
| US7 | I want to try without finding an issue | Sample loader fills the textarea with a realistic issue |
| US8 (optional) | I want to copy the plan | Copy button yields readable Markdown |

## 8. Error states and edge cases

| Case | Expected behaviour |
|---|---|
| Empty / too short input (<20 chars) | Client and server reject; message explains minimum |
| Too long input (>8,000 chars) | Rejected with `INPUT_TOO_LONG`; do not truncate silently |
| Not an issue (random text, code dump) | Model returns `unclear` difficulty with caveats; app still renders |
| Non-English issue | Best effort; caveat if model is unsure [ASSUMPTION: acceptable] |
| Prompt-injection text inside the issue ("ignore previous instructions…") | Issue is treated as data; output still conforms to schema; fails safe to `BAD_MODEL_OUTPUT` |
| Model returns invalid/partial JSON | One retry (decision in T07); then `BAD_MODEL_OUTPUT` |
| Quota/rate limit (HTTP 429 from API) | `RATE_LIMITED` with "try again in a minute" |
| Timeout | `UPSTREAM_TIMEOUT` |
| Missing/invalid API key | `SERVER_MISCONFIGURED`; clear server log message without printing the key |
| Backend down | UI shows "cannot reach server" |
| Double click on Analyze | Only one request in flight |
| Markdown/HTML/code in issue text | Rendered as text; no script execution |

## 9. AI model integration requirements

- **MR1** Use Gemma 4 through the Gemini API (not a Gemini model, not a local fallback) for the primary path. Gemini and Gemma IDs are **not** interchangeable.
- **MR2** Model ID comes from the `GEMMA_MODEL` environment variable; its default is set only after T01 passes.
- **MR3** Fixed system instruction, issue text passed as user content, treated as untrusted data.
- **MR4** Output requested as JSON matching the schema; parse and validate server-side regardless of whether a JSON mode is available.
- **MR5** The exact model ID used must appear in the README and be visible in the demo (UI "Powered by" line fed from response metadata).
- **MR6** Thinking level (`"high"` vs `"minimal"`) chosen by measurement in T04 [DECISION pending].

### Facts status

| Item | Status | Source / note |
|---|---|---|
| Gemini API supports Gemma 4 models `gemma-4-31b-it` and `gemma-4-26b-a4b-it` | **[VERIFIED]** | Official page ai.google.dev/gemma/docs/core/gemma_on_gemini_api (fetched 16 Oct 2026, page "last updated 2026-07-02") |
| REST pattern `https://generativelanguage.googleapis.com/v1beta/models/<id>:generateContent` | **[VERIFIED]** | Same page |
| Node SDK `@google/genai`, `new GoogleGenAI()`, `ai.models.generateContent({model, contents, config})` | **[VERIFIED]** (usage shown in docs) | Same page; exact installed version to be noted in T03 |
| `systemInstruction` supported for Gemma 4 | **[VERIFIED]** | Same page |
| `thinkingConfig.thinkingLevel` `"high"` on / `"minimal"` off | **[VERIFIED]** (documented); default behaviour **[ASSUMPTION]** | Same page |
| API key obtained from Google AI Studio | **[VERIFIED]** | Same page |
| Gemma 4 licensed Apache 2.0 | **[VERIFIED]** | Official nav links "Gemma 4 license (apache_2)"; Google AI Studio launch post (secondary) |
| Official Gemma docs carry a notice "documentation deprecated, see gemma.ai" | **[VERIFIED]** | Banner on the same page → **[CONFIRM]** nothing changed on gemma.ai |
| Context window ≈ 262,144 tokens | [ASSUMPTION] | Secondary sources only; irrelevant at 8,000 chars |
| Native JSON mode (`responseMimeType`/schema) works for Gemma 4 on Gemini API | **[ASSUMPTION]** | Not shown on the fetched page; a secondary article claims structured output support. Test in T04; fallback = prompt for JSON + defensive parsing |
| Free-tier rate limits for Gemma are low | [ASSUMPTION] | Third-party doc only; actual numbers unknown → check AI Studio quota page at event |
| Key works from India/AIT network without billing | **[ASSUMPTION]** | Test in T01 |
| Env var name `GEMINI_API_KEY` auto-read by SDK | **[ASSUMPTION]** | Common SDK convention; if not, pass key explicitly from env |
| Whether free-tier prompts may be used by Google to improve products | **[CONFIRM]** | Read Gemini API terms before telling users "private" |

## 10. Privacy and API-key security

- Key lives in `server/.env` (git-ignored); `server/.env.example` committed with placeholder only.
- Never use a `VITE_`-prefixed variable for the key (Vite exposes those to the browser).
- No request-body logging; log only code, status and latency.
- CORS restricted to the dev origin (and deploy origin if O2).
- Before first push and before submission: search the repo and git history for the key string; rotate the key immediately if it ever leaks.
- UI notice: issue text is sent to Google's Gemini API.
- No cookies, accounts or analytics.

## 11. Success metrics and demo acceptance criteria

Metrics are *event-level checks*, not benchmarks (do not invent numbers):
- 3 different sample issues each complete end-to-end on the demo machine.
- Every successful response passes schema validation.
- Each defined error state demonstrated at least once manually.
- Fresh-clone run succeeds following only the README.

**Minimum acceptable demo (all must be true):**
1. Public repo with licence and README naming the exact Gemma 4 model ID.
2. App runs locally; paste or load a sample issue; click Analyze.
3. Live Gemma 4 response renders summary, skills, difficulty with confidence, and steps.
4. UI shows the model name from server metadata.
5. One error state (e.g., empty input or disconnected network) shown gracefully.
6. Presenter can point at the code line where the Gemini API call is made.

## 12. Competition requirements and submission checklist

**Challenge 1 — Best Use of Gemma 4 (as stated by the brief):** Gemma 4 via Gemini API; model named in README; integration demonstrated in code or demo.
**Challenge 2 — Best Open-Source AI Project (as stated by the brief):** open-source/open-weight AI as a core part; public GitHub repo; open-source licence; model named in README.

Checklist (tick during event; mirror in `README-PLAN.md`):
- [ ] Repo is **public**
- [ ] `LICENSE` file present and recognised by GitHub [DECISION: Apache-2.0, consistent with Gemma 4's licence; confirm no organiser preference]
- [ ] README names `gemma-4-…` exact ID and says "via the Gemini API"
- [ ] README links to the file where the call is made
- [ ] Demo (live and/or video) visibly uses Gemma 4
- [ ] All code committed was written during the event (commit history reflects this) [CONFIRM how organisers check]
- [ ] No secrets in repo/history
- [ ] Submission form/platform completed before deadline [CONFIRM platform and deadline]
- [ ] Entered into both challenges [CONFIRM a single project may enter both]
- [ ] Any required demo video / team details provided [CONFIRM]

## 13. Risks, assumptions, mitigations

| # | Risk | Likelihood / Impact | Mitigation |
|---|---|---|---|
| R1 | **Gemma 4 API access fails or is throttled** (key, region, quota, shared Wi-Fi, many teams) — *highest risk* | Med / Critical | T01 first; test both model IDs; ask organisers for credits/keys; retry with backoff; fallback ladder in `ROADMAP.md` |
| R2 | Model returns non-JSON or inconsistent shape | High / High | Defensive parser + schema validation + one retry; prompt tested on 3 samples (T04) |
| R3 | High latency hurts demo | Med / Med | Try `minimal` thinking and the smaller-active-parameter model; loading UX; keep input capped |
| R4 | Hosted API judged "not core open-source" | Low–Med / Med | Name Apache-2.0 open-weight model; optional local Ollama (O1); ask organisers |
| R5 | Scope creep | High / High | Cut-list in `ROADMAP.md`; MVP freeze at 70% of time |
| R6 | Key leak | Low / High | `.gitignore` first commit; secret scan task; rotate |
| R7 | Venue network failure during demo | Med / High | Rehearse on hotspot; keep a screen recording of a real successful run (honestly labelled) |
| R8 | Prompt injection via issue text | Med / Low | Treat as data; schema validation; rendered as text |
| R9 | Time lost to tooling | Med / Med | Plain CSS, no extra libs, no DB, two npm projects |
