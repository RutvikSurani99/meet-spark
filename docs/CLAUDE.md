# Meet Spark — notes for Claude Code (and any AI working on this repo)

Chrome extension (Manifest V3) that adds engagement tools to Google Meet. It has no build step yet: Chrome loads `extension/` directly. The planned move to WXT + React + TypeScript is described in `docs/ENGINEERING_PLAN.md`.

## Spec-first workflow (mandatory, enforced by GR-14)

**Every bug fix and every feature starts with a spec. No spec approval → no code.** This applies even to a one-line fix and to content changes.

1. **Read first:** `docs/PROJECT_NOTES.md`, `docs/GUARDRAILS.md` and the existing specs (`npm run spec:check` lists them and their status).
2. **Write the spec:** update the spec that owns the area, or create one with `npm run spec:new -- <kebab-slug> <PREFIX>` (from `docs/specs/_TEMPLATE.md`). Give every requirement an ID (`PREFIX-001`), a MUST/SHOULD statement, Given/When/Then acceptance criteria and a test level. Set `Status: **Draft**`.
3. **Stop and ask for approval.** Show the user the spec (summary + open questions). Do not write tests or code yet. Never mark a spec Approved yourself unless the user has explicitly approved it in this conversation.
4. **Commit the approved spec on its own:** set `Status: **Approved** (date, who)`, commit as `docs(specs): …`. The spec must be committed *before* the code: the `commit-msg` hook and CI reject a code commit whose IDs weren't already Approved in an earlier commit.
5. **Tests first (red):** for each requirement write a test whose name starts with or contains its ID, and see it fail on the current code. Add new test IDs to `requiredTests` in `scripts/guardrails.json` (protected: ask).
6. **Mutant for every bug fix:** add an entry to `scripts/mutants.json` that re-introduces the bug (protected: ask).
7. **Code (green):** implement until `npm run verify` passes, then run `npm run mutate` (every mutant must be killed).
8. **Commit the code** with the requirement IDs in the message, e.g. `fix(sync): only complete scans replace the roster (SYNC-001, SYNC-002)`.
9. **Close out:** set the spec to `Status: **Implemented**` (the guard then requires every ID to be traced to a test), add a `docs/CHANGELOG.md` entry naming the IDs, update `docs/PROJECT_NOTES.md`.

If you find a new problem while implementing, **don't silently fix it**: add it to the spec as an amendment (changelog line), flag it to the user, and only implement it once approved.

Claude Code commands in this repo: **`/spec <request>`** runs steps 1–3, **`/implement <spec file>`** runs steps 4–9 for an approved spec.

## Docs
- **All documentation lives in `docs/`.** The only Markdown file at the repo root is the `CLAUDE.md` stub, which imports this file. Never create docs anywhere else (`.github/` templates and `.claude/commands/` are tooling, not docs).
- Every `` `docs/…` `` path mentioned in the docs must exist (guard GRH-070). Mark future files "(Phase 1)".

## Commands
- `npm run setup`: one-time install of dependencies and Playwright Chromium. It also turns on the git hooks.
- `npm run verify`: **the single gate**. Runs check, lint, guard and every test. Run it before saying any change is done, and report its output.
- `npm run mutate`: the mutation gate. Plants every mistake in `scripts/mutants.json`; all must be caught.
- `npm run spec:check` lists specs · `npm run spec:new -- <slug> <PREFIX>` creates a Draft spec.
- `npm run lint` · `npm run guard` · `npm test` (or `node tests/run.js <file>.test.js` for one file) · `npm run check`
- `npm run package`: runs verify, then builds `dist/meet-spark-<version>.zip`

## Guardrails (read docs/GUARDRAILS.md)
- **Never weaken a guardrail to make a change pass.** No new `eslint-disable`, no ledger edits, no loosened or deleted assertions or mutants, no `--no-verify`, no `--relock`. If a guardrail blocks you, stop, explain why, and propose a spec change.
- **Protected files** (listed in `docs/GUARDRAILS.md` §4 and `scripts/guardrails.json`): ask the user before editing. Their SHA-256 fingerprints are locked; after an approved edit the **user** runs `node scripts/guard.js --relock`.
- New tests go in new files freely; add their IDs to `requiredTests` (needs approval).

## Architecture (all in `extension/content.js`)
1. **Content**: `ICEBREAKERS` (by category), `WYR`, `BINGO` arrays at the top. Keep them India-friendly (chai, cricket, festivals, trains, monsoon, office phrases like "Am I audible?"). Avoid religion, politics, caste and region-vs-region comparisons.
2. **Utilities**: `setHTML()`, `buildDOM()`, `meetingId()`, `validNames()`, `store`.
3. **Participant detection**: `safeCandidate()`, **`safeClick()`** (the only click site), `expandGroups()`, `peopleButton()`, `participantsList()`, `scanPanel()`, `scanTiles()`, `scanAvatars()`, `scanVisible()`, `diagnose()` + `redact()`.
4. **Roster**: `roster` object (`live`, `manual`, `excluded`, `dismissed`), `applyScan()` (`PASSIVE_EXPIRY_MS` = 90 s), `checkMeeting()`, `looksComplete()`, `collectPanel()`, `screenSync()`, `fullSync()`, `undoOpen()`, and a 2.5 s passive watcher.
5. **UI**: Shadow DOM host `#meet-spark-host`, with four tabs: Icebreakers, This or that, Bingo, Speakers.

## Hard rules
- **Trusted Types:** Meet enforces Trusted Types, so a plain `el.innerHTML = ...` throws and nothing renders. Always use `setHTML(el, html)`. Never add raw `innerHTML`, `insertAdjacentHTML` or `DOMParser` calls.
- **Never click unsafe Meet controls.** An early version matched "Let participants send messages" and toggled a host setting in a live call. Every click goes through `safeClick(el, reason)`. Keep `UNSAFE_LABEL` strict (it matches plurals too), never click switches, checkboxes or anything with `aria-checked`. Any new click needs a trap-page test in `tests/safety.test.js`.
- **Sync must undo its own clicks** — safely. If `fullSync()` opened the People panel, it closes it with a freshly found People button while our list is still showing; if no list ever appeared it reverts its click; if another panel replaced the list it does **not** click and pauses sync.
- **Only a complete People-panel scan removes people** (scrolled to the bottom, no collapsed group, count matches). Partial scans only add.
- **Meet's DOM is private and changes often.** Never rely on obfuscated class names or `jsname`/`jscontroller`/`jsaction` (lint enforces it). Prefer aria labels, roles, `data-*`, `.notranslate` / `translate="no"`, googleusercontent avatars.
- Names the user removes go into `roster.dismissed`, so passive scans don't add them back. A manual sync clears `dismissed`.
- Storage keys are prefixed `meetSpark:`. Per-meeting keys use the meeting code and are never written outside a meeting; stored data is validated before use.
- **Tests:** never use real sleeps; use the fake clock (`openMeet({ clock: true })` + `tick()`). Every browser test runs the click recorder; end sync tests with `assertOnlySafeClicks(page)`.

## Debugging in a real call
In the Speakers tab, **Diagnose** copies a JSON report of Meet's structure (names, labels and the meeting code are redacted). The user can paste it here. Use its `peopleLikeControls`, `dataAttrs`, `roles`, `regions`, `noTranslate` and `watcher` fields to update the selectors, then add a matching mock to `tests/helpers/mock-meet.js` / `tests/markup-variants.test.js` (via a spec, as always).

Known state as of v2.5 (from a real report): the user's Meet had no `data-participant-id` tiles, no `role="list"`, and no button labelled "People". Detection there relies on `scanAvatars()` and the user opening the People panel and tapping sync.

## Releasing
Bump `version` in both `extension/manifest.json` and `package.json` (this is a code change: name the release spec IDs in the commit), move the `[Unreleased]` notes in `docs/CHANGELOG.md` under the new version, run `npm run verify` and `npm run mutate`, go through `docs/QA_CHECKLIST.md` in a real Meet call, then `npm run package`.
