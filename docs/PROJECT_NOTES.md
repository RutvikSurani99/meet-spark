# Meet Spark — Project Reference

Working reference for Claude. `docs/CLAUDE.md` holds the hard rules, and this file maps the codebase and records its current state.
Last updated: 2026-10-04

## What it is
Meet Spark is a Chrome extension (Manifest V3, v2.7.0) that adds engagement tools to Google Meet calls. It has no build step, because Chrome loads `extension/` directly. Clicking the **Spark** button (bottom-right) or pressing **Alt+S** opens a panel with four tabs:

1. **Icebreakers**: questions in 4 categories (Warm-up 10, Work 9, Fun 10, Reflective 7)
2. **This or that** (`WYR`): 18 prompts
3. **Meeting Bingo** (`BINGO`): 30 squares
4. **Speakers**: a random speaker picker that uses an auto-synced participant roster. Picks play in a popup with six animation styles, or Surprise me (`docs/specs/picker-styles.md`)

The content is written for Indian teams (chai, cricket, festivals, trains, monsoon, "Am I audible?"). It avoids religion, politics, caste and region-vs-region comparisons.

## Layout
```
extension/
  manifest.json        MV3; content script on https://meet.google.com/*, run_at document_idle
  content.js           ~1560 lines, all logic + UI (wrapped in one IIFE)
  icons/               16 / 48 / 128 px
tests/                 Playwright tests against mock Meet pages (fake clock; no real waits)
  run.js               runs every *.test.js; a file must print "PASS <name> (N tests)" with N > 0
  helpers/meet.js      openMeet(), tick(), ui()/click()/names(), diagnose(), click recorder + assertOnlySafeClicks()
  helpers/mock-meet.js panelPage(): mock People panel (virtualised list, Contributors group, open delay …)
  helpers/content.js   reads ICEBREAKERS/WYR/BINGO out of content.js
  features.test.js     feature regression suite (21 tests)
  safety.test.js       trap page, People-button table, safe group expand, safe undo
  sync-roster.test.js  SYNC-*, ROSTER-* (v2.5.1)
  keys-diag.test.js    KEYS-001, DIAG-001
  picker-styles.test.js PSTY-* picker popup and animation styles
  roster-sync / remove-clear-sync / markup-variants / trusted-types / content-policy / lint-bypass
scripts/
  guard.js             repo invariants (see docs/GUARDRAILS.md); --relock after an approved protected-file change
  guardrails.json      guard config: ledger, locked scripts, test inventory, protected files, required deny rules
  guardrails.lock.json SHA-256 of every protected file
  spec-check.js        spec-first gate (commit-msg / CI / Claude hook), spec:new, spec list
  mutate.js + mutants.json   mutation gate
  package.sh           builds dist/meet-spark-<version>.zip
.githooks/             pre-commit · commit-msg · pre-push
.github/               workflows/ci.yml · pull_request_template.md
.claude/               settings.json (ask/deny rules, hooks) · commands/spec.md · commands/implement.md
docs/                  CLAUDE.md · GUARDRAILS.md · PROJECT_NOTES.md · CHANGELOG.md · README.md · ENGINEERING_PLAN.md · specs/
```
**Rule:** all docs live in `docs/`, and every change starts with a spec (`docs/CLAUDE.md`).

## content.js map (by function name, in file order)
| Section | Functions / values |
|---|---|
| Content | `ICEBREAKERS`, `WYR`, `BINGO` |
| Trusted Types | `ttPolicy`, `setHTML()`, `buildDOM()`, `decode()` |
| Helpers | `sleep`, `pick`, `shuffle`, `MEETING_PATH`, `meetingId()`, `validNames()`, `store` (`meetSpark:` prefix), `esc`, `initials`, `avatarColor`, icons `I` / `icon()` |
| Names | `JUNK`, `cleanName()` |
| Meet controls | `q`/`qa`, `labelOf()`, `PEOPLE_LABEL`, `UNSAFE_LABEL`, `safeCandidate()`, **`safeClick()`** (the only click), `GROUP_HEADER`, `expandGroups()`, `peopleButton()`, `leaveButton()`, `inCall()`, `peopleCount()` |
| Detection | `participantsList()`, `selfName()`, `nameFrom()`, `scanPanel()`, `scanTiles()`, `scanAvatars()`, `scanVisible()` |
| Diagnose | `DIAG_WORDS`, `redact()`, `diagnose()` |
| Roster | `currentMeeting`, `roster`, `PASSIVE_EXPIRY_MS`, `applyScan()`, `checkMeeting()` |
| Sync | `scrollerOf()`, `atBottom()`, `hasCollapsedGroup()`, `looksComplete()`, `collectPanel()`, `screenSync()`, `fullSync()`, `undoOpen()`, watcher `setInterval` (2.5 s, `watcherStats`) |
| UI | Shadow DOM host `#meet-spark-host`, launcher, `setOpen()`, Alt+S handler, `showView()`, `toast()`, Icebreakers, This or that, Bingo (`LINES`, `validBingo()`), Speakers (`loadSpoken()`, `renderPeople()`, `pickSpeaker()`, `animatePick()`), auto-sync switch |

## Key safety logic
- `UNSAFE_LABEL = /\b(let|allow|turn|send|message|chat|mute|remove|lock|admit|deny|host|settings|option|access)(s|es|d|ed|ing)?\b/i`. Any element that matches is never clicked.
- `safeClick(el, reason)` is the only `.click()`: it re-checks `isConnected` and `safeCandidate()` at click time.
- `peopleButton()` tries `data-panel-id="1"`, then `PEOPLE_LABEL`, then an icon text (`people`, `group`, …); every candidate must pass `safeCandidate()`.
- Group expansion clicks only `[aria-expanded="false"]` headers inside the participants list whose label matches `GROUP_HEADER`.

## Commands
```bash
npm run setup       # one time: Playwright + Chromium + git hooks
npm run verify      # the gate
npm run mutate      # the mutation gate
npm run spec:check  # specs and status · npm run spec:new -- <slug> <PREFIX>
npm run package     # dist/meet-spark-<version>.zip
```

## Real-world Meet state (v2.5 Diagnose report)
- Meet showed no `data-participant-id` tiles, no `role="list"`, and no button labelled "People".
- Detection in that setup relies on `scanAvatars()` (googleusercontent images) plus the user opening the People panel and tapping sync.
- To fix selectors from a new report, use its `peopleLikeControls`, `dataAttrs`, `roles`, `regions` and `noTranslate` fields, then add a mock variant to `tests/markup-variants.test.js`.

## Guardrails (Layer 0.5, active)
See `docs/GUARDRAILS.md` (GR-1…GR-16). `npm run verify`: check, lint (+ lint self-test), guard, 13 test files / 120 tests. `npm run mutate`: 115 mutants, all killed. Hooks: pre-commit, commit-msg (spec-first), pre-push (verify). Baseline tag: `v2.5.0-baseline`.
Browser tests can't download Chromium inside Cowork's sandbox on the Mac, so Claude runs them in the cloud workspace. On the Mac itself, `npm run setup` works normally.

## Current state (2026-10-04)
- **v2.5.1** on branch `fix/v2.5.1`: all fixes from `docs/specs/v2.5.1-fixes.md` and all guardrails from `docs/specs/guardrails-hardening.md` (both Implemented).
- Spec-first workflow is enforced. No spec is Approved right now, so the next code change must start with `/spec` or `npm run spec:new`.
- Still manual: GitHub repo, branch protection, `guardrail-change` label (GRH-002, `docs/GUARDRAILS.md` §6). Test v2.5.1 in a real call with more than 15 people and send a Diagnose report (it settles the SYNC-001 headcount − 1 threshold).
- Needs review (flagged in `docs/specs/v2.5.1-fixes.md` v1.1/v1.2): SAFE-004 was added during implementation; `aria-pressed` is allowed on the People button; the passive watcher needs a known headcount before it treats an open panel as complete.

## Specs
Every feature has a spec in `docs/specs/` (see the coverage map in `docs/GUARDRAILS.md` §3): launcher-and-panel, icebreakers, this-or-that, bingo, speakers, sync, roster-and-detection, diagnose, copy-to-chat, plus the change specs guardrails-hardening, v2.5.1-fixes and test-coverage-backfill. All are Implemented, so the next change must start with a new or amended spec.

## Change log
- 2026-10-01: Reference file created.
- 2026-10-01: Engineering plan proposed in `docs/ENGINEERING_PLAN.md`. Found F1.
- 2026-10-01: Plan v2: WXT + React + TypeScript, localhost playground, docs-first rule. Docs moved into `docs/`.
- 2026-10-01: Layer 0 guardrails added (GR-1…GR-11).
- 2026-10-04: Mutation audit: only 1 of 7 planted mistakes was caught. Specs `guardrails-hardening.md` and `v2.5.1-fixes.md` written and approved.
- 2026-10-04: Layer 0.5 guardrails (GR-12…GR-16, mutation gate, fingerprints, spec-first enforcement) and v2.5.1 fixes (F1, F2, N1–N8) implemented, plus 3 fixes from an independent review. 29/29 mutants killed.
- 2026-10-04: Backfill specs for every feature approved and implemented (test-only): 40 new tests, IDs in every test name, 70/70 mutants killed, `docs/QA_CHECKLIST.md`.
- 2026-10-05: v2.5.2: presenter names fixed (ROSTER-107…110), from a real-call bug report. 74/74 mutants killed.
- 2026-10-05: v2.6.0: picker popup with six animation styles and Surprise me (PSTY-001…035), designed on the "Speaker Picker Concepts" canvas and built for 100+ people. 98/98 mutants killed.
- 2026-10-05: v2.6.1: Surprise me shows all six styles once per meeting before going random (PSTY-006).
- 2026-10-05: v2.7.0: Animation picker tiles with mini previews (PTILE-001…007).
