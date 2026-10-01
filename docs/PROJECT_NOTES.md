# Meet Spark — Project Reference

Working reference for Claude. `docs/CLAUDE.md` holds the hard rules, and this file maps the codebase and records its current state.
Last updated: 2026-10-01

## What it is
Meet Spark is a Chrome extension (Manifest V3, v2.5.0) that adds engagement tools to Google Meet calls. It has no build step, because Chrome loads `extension/` directly. Clicking the **Spark** button (bottom-right) or pressing **Alt+S** opens a panel with four tabs:

1. **Icebreakers**: questions in 4 categories (Warm-up 10, Work 9, Fun 10, Reflective 7)
2. **This or that** (`WYR`): 18 prompts
3. **Meeting Bingo** (`BINGO`): 30 squares
4. **Speakers**: a random speaker picker that uses an auto-synced participant roster

The content is written for Indian teams (chai, cricket, festivals, trains, monsoon, "Am I audible?"). It avoids religion, politics, caste and region-vs-region comparisons.

## Layout
```
extension/
  manifest.json        MV3; content script on https://meet.google.com/*, run_at document_idle
  content.js           ~1080 lines, all logic + UI (wrapped in one IIFE)
  icons/               16 / 48 / 128 px
tests/                 Playwright tests against mock Meet pages
  run.js               runs every *.test.js in order
  safety.test.js       unsafe buttons are never clicked; diagnose() peopleButton is null
  trusted-types.test.js  renders under a Trusted Types CSP
  roster-sync.test.js
  remove-clear-sync.test.js
  markup-variants.test.js  alternate Meet DOM shapes
scripts/package.sh     builds dist/meet-spark-<version>.zip
CLAUDE.md              2-line stub → @docs/CLAUDE.md (only root .md; Claude Code auto-loads it)
docs/
  CLAUDE.md            rules for Claude (authoritative)
  README.md            user install/dev instructions
  PROJECT_NOTES.md     this file
  ENGINEERING_PLAN.md  standards + roadmap (v2: WXT + React + TS)
```
**Rule:** all docs live in `docs/`, and docs are updated before any code change.

## content.js map (approx. line numbers)
| Lines | Section |
|---|---|
| 9–168 | Content arrays: `ICEBREAKERS`, `WYR`, `BINGO` |
| 169–222 | `ttPolicy`, `setHTML()`, `buildDOM()` (Trusted Types–safe HTML) |
| 223–260 | Helpers: `sleep`, `pick`, `shuffle`, `meetingId()`, `store` (localStorage, `meetSpark:` prefix), `esc`, `initials`, `avatarColor`, icons `I` / `icon()` |
| 262–272 | `JUNK` regex + `cleanName()` |
| 274–310 | DOM helpers, `labelOf()`, `PEOPLE_LABEL`, `UNSAFE_LABEL`, `safeCandidate()`, `peopleButton()`, `leaveButton()`, `inCall()` |
| 312–399 | `peopleCount()`, `participantsList()`, `selfName()`, `nameFrom()`, `scanPanel()`, `scanTiles()`, `scanAvatars()`, `scanVisible()` |
| 400–443 | `diagnose()`: masked JSON report of Meet's DOM |
| 444–483 | `roster` (`live`, `manual`, `excluded`, `dismissed`) + `applyScan()` |
| 484–560 | `syncing`, `syncPaused`, `screenSync()`, `fullSync()` (opens People panel, scrolls list, closes it again) |
| 561–~600 | Passive watcher (`setInterval`, 2.5 s) |
| ~600–1082 | UI: Shadow DOM host `#meet-spark-host`, launcher, tabs, Alt+S handler (~846), speaker tab handlers |

## Key safety logic
- `UNSAFE_LABEL = /\b(let|allow|turn|send|message|chat|mute|remove|lock|admit|deny|host|settings|option|access)\b/i`. Any element that matches is never clicked.
- `peopleButton()` tries, in order: `data-panel-id="1"`, then a label matching `PEOPLE_LABEL`, then an icon text (`people`, `group`, …). Every candidate has to pass `safeCandidate()`.
- Never click switches, checkboxes or anything with `aria-checked`. Every new click into Meet's DOM needs a test in `tests/safety.test.js`.
- Never use raw `innerHTML`, `insertAdjacentHTML` or `DOMParser`. Always use `setHTML(el, html)`.

## Commands
```bash
npm run setup     # one time: Playwright + Chromium (NOT yet done on this Mac)
npm run check     # node --check extension/content.js
npm test          # all mock-Meet tests
npm run package   # dist/meet-spark-<version>.zip
```
After every change to `content.js`, run `npm run check && npm test`.
To release, bump `version` in `extension/manifest.json` and `package.json`, then run `npm test` and `npm run package`.

## Real-world Meet state (v2.5 Diagnose report)
- Meet showed no `data-participant-id` tiles, no `role="list"`, and no button labelled "People".
- Detection in that setup relies on `scanAvatars()` (googleusercontent images) plus the user opening the People panel and tapping sync.
- To fix selectors from a new report, use its `peopleLikeControls`, `dataAttrs`, `roles`, `regions` and `noTranslate` fields, then add a mock variant to `tests/markup-variants.test.js`.

## Guardrails (Layer 0, active)
See `docs/GUARDRAILS.md`. Run `npm run verify` (check, lint, guard, 7 test files: 16 feature tests, content policy, 4 sync/detection tests, safety, Trusted Types). Hooks: pre-commit (check, lint, guard, content policy) and pre-push (verify). Baseline tag: `v2.5.0-baseline`.
Browser tests can't download Chromium inside Cowork's sandbox on this Mac, so Claude runs them in the cloud workspace. On the Mac itself, `npm run setup` works normally.

## Current state (2026-10-01)
- `npm run check` passes.
- Dependencies are installed and git hooks are on (`core.hooksPath=.githooks`).
- Git: baseline commit `8ee14fc`, tagged `v2.5.0-baseline`, then the guardrails commit.
- Still to add by hand: `.github/workflows/ci.yml` and `.claude/settings.json`. Cowork can't write protected folders, so these are in the chat outputs.
- Node v22 is available.

## Change log
- 2026-10-01: Reference file created.
- 2026-10-01: Engineering plan proposed in `docs/ENGINEERING_PLAN.md` (TypeScript + esbuild, GitHub solo, spec-driven). Found F1: `fullSync()` clicks `[aria-expanded="false"]` without `safeCandidate()`.
- 2026-10-01: Plan v2: WXT + React + TypeScript, localhost playground, docs-first rule. Moved README, CLAUDE.md and PROJECT_NOTES into `docs/`; root `CLAUDE.md` is now a stub that imports `docs/CLAUDE.md`.
- 2026-10-01: Layer 0 guardrails added (GR-1…GR-11): ESLint rules, guard script + suppression ledger, content-policy test, 16-test feature regression suite, git hooks, CI workflow and Claude Code settings. 15 deliberate breakages were all caught.
