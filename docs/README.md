# Meet Spark

A Chrome extension that makes long Google Meet calls more engaging. It adds icebreakers, "This or That" prompts, Meeting Bingo and a speaker picker. The content is written for Indian teams.

## Load it in Chrome
1. Open `chrome://extensions` and turn on **Developer mode**.
2. Click **Load unpacked** and select the `extension/` folder.
3. Join a Meet call, then click **Spark** (bottom-right) or press **Alt+S**.

After you change any code, click ↻ on the extension card, then **refresh the Meet tab**.

## How changes are made: spec first
Every bug fix or feature starts as a spec in `docs/specs/`, whether you write the code or an AI does:
1. `npm run spec:new -- <slug> <PREFIX>` (or `/spec <request>` in Claude Code) → a **Draft** spec
2. Review it → mark it **Approved** and commit it on its own
3. Tests (named with the requirement IDs) → code → `npm run verify` → `npm run mutate`
4. Commit with the IDs in the message (e.g. `fix(sync): … (SYNC-001)`). The commit-msg hook and CI reject code changes without an already-approved spec ID.

Details: `docs/CLAUDE.md` (workflow) and `docs/GUARDRAILS.md` (what each check protects).

## Develop
```bash
npm run setup       # one time: dependencies, Playwright Chromium, git hooks
npm run verify      # the gate: syntax, lint, guardrails, all tests (~25 s)
npm run mutate      # proves the gate: every known mistake in scripts/mutants.json must be caught (~2 min)
npm run spec:check  # list specs and their status
npm test            # tests only (node tests/run.js safety.test.js for one file)
npm run package     # verify, then build dist/meet-spark-<version>.zip
```
Guardrails run automatically: on every commit (lint, guard, content policy, spec-first check), on every push (full verify) and in CI (verify, spec-first, mutation gate). See `docs/GUARDRAILS.md`.

## Project layout
```
extension/          the extension Chrome loads
  manifest.json     MV3 manifest
  content.js        all logic + UI (Shadow DOM)
  icons/
docs/               all docs: CLAUDE.md, GUARDRAILS.md, PROJECT_NOTES.md, CHANGELOG.md, specs/
tests/              Playwright tests against mock Meet pages (fake clock, click recorder)
  helpers/          meet.js (openMeet, tick, click recorder), mock-meet.js (mock People panels)
scripts/            guard.js, spec-check.js, mutate.js + mutants.json, guardrails.json (+ .lock.json), package.sh
.githooks/          pre-commit, commit-msg, pre-push
.github/            CI workflow, PR template
.claude/            Claude Code settings (protected files, hooks) and the /spec and /implement commands
CLAUDE.md           stub that imports docs/CLAUDE.md
```
