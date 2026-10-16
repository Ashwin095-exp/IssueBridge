# IssueBridge — Planning Pack

**Status:** Planning complete. Implementation NOT started. No application code exists in this pack.
**Event:** MLH Hacktoberfest Hack Day, AIT Pune, 17 October 2026 (all project code must be written during the event).
**Prepared:** 16 October 2026.

IssueBridge is an AI assistant that helps beginners understand a pasted GitHub issue and get a realistic, step-by-step contribution plan. It is built on **Gemma 4 via the Gemini API** so that it can enter both the *Best Use of Gemma 4* and *Best Open-Source AI Project* challenges.

> Note on names: this file (`README.md`) is the index of the *planning pack*. The project's real, public `README.md` is written during the event from `README-PLAN.md`.

## Files and reading order

| # | File | What it answers | Read when |
|---|------|-----------------|-----------|
| 1 | `README.md` | What is this pack, what is the status | First |
| 2 | `RESUME.md` | Where are we, what is next, recovery prompt | Every new session, and after every task |
| 3 | `PRD.md` | What are we building, for whom, what counts as done | Before changing scope |
| 4 | `ARCHITECTURE.md` | How it fits together, API contract, folders, env vars | Before writing code |
| 5 | `ROADMAP.md` | In what order, with what fallbacks and cut-list | When planning time |
| 6 | `TASKS.md` | The exact small tasks (T01–T16, plus optional O1–O4) | While building |
| 7 | `README-PLAN.md` | What the final repo README must contain | Last 15% of the event |

## Legend used in every file

- **[VERIFIED]** Confirmed against an official source on 16 Oct 2026 (source stated).
- **[ASSUMPTION]** Believed true, not confirmed. Must be tested at the event.
- **[DECISION]** A choice made in planning; can be changed if a task disproves it.
- **[CONFIRM]** Needs an answer from the organisers or from official docs.

## Rules for this pack

1. Do not generate the whole project at once. Work task by task (`TASKS.md`).
2. Do not hard-code a model ID until `T01` has passed.
3. Do not write application code before the event starts.
4. After every task, update `RESUME.md` (checklist at the bottom of that file).
