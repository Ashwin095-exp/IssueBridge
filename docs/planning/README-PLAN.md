# README-PLAN — What the final repo README must contain

Legend: **[VERIFIED] / [ASSUMPTION] / [DECISION] / [CONFIRM]**. The final `README.md` of the public repo is written during the event (task T14) from this plan.

**Rules:** fill each section only from observed reality (what actually runs, what you actually saw). No invented benchmarks, accuracy numbers, user counts, or test results. Use real screenshots only. Replace every `<<FILL>>` marker; none may remain at submission.

## Sections to complete

### 1. Project overview
- Name, one-sentence pitch, the problem (beginners struggle to understand and start on GitHub issues), who it is for.
- Mention: built for MLH Hacktoberfest Hack Day, AIT Pune, 17 Oct 2026 `<<FILL: team/names>>`.

### 2. Features
- Only features that work in the submitted commit: paste issue → summary, skills, difficulty with confidence, step-by-step plan, caveats; sample loader; error handling.
- Mark anything partial as "experimental". Optional items (O1–O4) listed only if actually finished.

### 3. Screenshots or demo
- At least one real screenshot of a successful result (`docs/screenshots/`); optional link to a demo video or live URL `<<FILL or remove>>`. Label recorded demos as recordings.

### 4. Architecture
- Short description and a simple diagram (reuse the flow from `ARCHITECTURE.md` §2). Link to the file that calls the model (`server/src/services/gemma.js` [DECISION — confirm final path]).

### 5. Exact AI model and integration (mandatory for both challenges)
- A prominent line, e.g.: "Powered by **Gemma 4** (`<<FILL: exact model ID from GEMMA_MODEL default>>`) through the **Gemini API**." Candidate IDs [VERIFIED as listed in official docs]: `gemma-4-26b-a4b-it`, `gemma-4-31b-it`. Use whichever T01/T04 actually confirmed.
- State that Gemma 4 is an open-weight model released under Apache 2.0 [VERIFIED per official Gemma docs navigation; re-check the licence page before publishing].
- Where the integration lives (path), SDK name/version used `<<FILL>>`, how the key is supplied (server-side env only), thinking level and JSON handling as decided in T04 `<<FILL>>`.
- If O1 (local model) was built: say exactly which model tag and how to select it; otherwise omit.

### 6. Prerequisites and setup
- Node.js version `<<FILL: tested version>>`, git, a Gemini API key from Google AI Studio.
- Clone, install in `server/` and `client/`, copy `.env.example` to `.env`, add key.

### 7. Environment variables
- Table from `ARCHITECTURE.md` §6 as actually implemented (name, required?, default, purpose). Explicit warning: never commit `.env`; never prefix the key with `VITE_`.

### 8. How to run
- Two terminals: start server, start client, open the printed URL. Include the exact commands as they work in the fresh-clone test (T15). Include a quick health-check step.

### 9. Limitations (state honestly)
Candidate list to confirm against reality at the end:
- Works only from pasted text; does not read the repository, CONTRIBUTING file, or code, so plans are generic guidance.
- Difficulty and skills are model estimates and can be wrong; confidence is shown for that reason.
- Depends on a hosted API: needs internet, a valid key, and is subject to rate limits and quotas.
- Issue text is sent to Google's Gemini API; do not paste confidential content `<<FILL after checking terms>>`.
- No accounts, history, or database; nothing is saved.
- Output language/quality on non-English or very long issues untested `<<FILL>>`.
- Tested manually on `<<FILL: samples/browsers>>`; automated tests cover `<<FILL: server validation/route only>>`.

### 10. Licence and attribution
- Licence: Apache-2.0 [DECISION; must match the `LICENSE` file; confirm no organiser requirement].
- Attribution: Gemma 4 by Google (Apache 2.0); React, Vite, Express and other dependencies under their own licences; sample issue texts credited to their source repositories with links; MLH Hacktoberfest Hack Day mention.
- AI coding-assistant disclosure, if the organisers require it `<<CONFIRM>>`.

## Competition coverage map (every known requirement → where it appears)

| Requirement | README section | Also verified in |
|---|---|---|
| Gemma 4 via Gemini API explicitly named | 5 | Server code path; demo "Powered by" line |
| Model name in README | 5 (and 1 if desired) | `.env.example`, server default |
| Integration demonstrated in code or demo | 4, 5 | Demo script (T16) |
| Open-source / open-weight AI is core | 1, 5 | — |
| Public GitHub repository | top of README (repo link) | T15 |
| Open-source licence | 10 | `LICENSE` file |
| All code written during event | 1 (statement) `<<CONFIRM wording>>` | Commit history |

## README verification list (tick before T14 is done)
- [ ] Exact model ID matches the server default and `.env.example`
- [ ] Call-site file path is correct and the file exists
- [ ] Commands copied from a successful fresh-clone run
- [ ] Every `<<FILL>>` removed
- [ ] Screenshot(s) real, current, and show no secrets
- [ ] Limitations are truthful
- [ ] Licence name matches the `LICENSE` file
