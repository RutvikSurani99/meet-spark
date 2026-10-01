# Meet Spark — notes for Claude Code

Chrome extension (Manifest V3) that adds engagement tools to Google Meet. It has no build step yet: Chrome loads `extension/` directly. The planned move to WXT + React + TypeScript is described in `docs/ENGINEERING_PLAN.md`.

## Docs-first workflow (mandatory)
- **All documentation lives in `docs/`.** The only Markdown file at the repo root is the `CLAUDE.md` stub, which imports this file. Never create docs anywhere else.
- **Update the docs before you change any code.** For every change: (1) update or add the relevant spec in `docs/specs/`, plus any affected docs (`ARCHITECTURE.md`, `GUARDRAILS.md`, an ADR and so on); (2) get the user's approval; (3) then write the tests and the code; (4) finally update `docs/PROJECT_NOTES.md` (state and change log) and `docs/CHANGELOG.md`.
- Read `docs/PROJECT_NOTES.md` and the relevant `docs/specs/*.md` before starting work.

## Commands
- `npm run setup`: one-time install of dependencies and Playwright Chromium. It also turns on the git hooks.
- `npm run verify`: **the single gate**. Runs check, lint, guard and every test. Run it before saying any change is done, and report its output.
- `npm run lint`: ESLint with the guardrail rules (GR-2, GR-3, GR-5)
- `npm run guard`: repo invariants: manifest lock, `UNSAFE_LABEL` strictness, suppression ledger, docs layout
- `npm test`: every `tests/*.test.js` (feature regression suite, content policy, sync, safety, Trusted Types)
- `npm run check`: syntax check of `extension/content.js`
- `npm run package`: runs verify, then builds `dist/meet-spark-<version>.zip`

## Guardrails (read docs/GUARDRAILS.md)
- **Never weaken a guardrail to make a change pass.** That means no new `eslint-disable`, no edits to the ledger, no loosened or deleted assertions, no `--no-verify`. If a guardrail blocks you, stop and explain why, then propose an ADR.
- **Protected files** (ask the user before editing): `eslint.config.js`, `scripts/guard.js`, `scripts/guardrails.json`, `tests/safety.test.js`, `tests/content-policy.test.js`, `tests/features.test.js`, `.githooks/*`, `.github/workflows/*`, `.claude/settings.json`. Adding new tests is always fine.
- Every new or changed feature needs a row in the coverage map (`docs/GUARDRAILS.md` §3) and a test that fails before the code change.

## Architecture (all in `extension/content.js`)
1. **Content**: `ICEBREAKERS` (by category), `WYR`, `BINGO` arrays at the top. Keep them India-friendly (chai, cricket, festivals, trains, monsoon, office phrases like "Am I audible?"). Avoid religion, politics, caste and region-vs-region comparisons.
2. **Utilities**: `setHTML()`, `buildDOM()` and storage helpers.
3. **Participant detection**: `peopleButton()`, `participantsList()`, `scanPanel()`, `scanTiles()`, `scanAvatars()`, `scanVisible()`, `diagnose()`.
4. **Roster**: `roster` object (`live`, `manual`, `excluded`, `dismissed`), `applyScan()`, `screenSync()`, `fullSync()`, and a 2.5 s passive watcher interval.
5. **UI**: Shadow DOM host `#meet-spark-host`, with four tabs: Icebreakers, This or that, Bingo, Speakers.

## Hard rules
- **Trusted Types:** Meet enforces Trusted Types, so a plain `el.innerHTML = ...` throws and nothing renders. Always use `setHTML(el, html)`, which tries a TT policy first and falls back to `buildDOM()`. Never add raw `innerHTML`, `insertAdjacentHTML` or `DOMParser` calls.
- **Never click unsafe Meet controls.** An early version matched "Let participants send messages" and toggled a host setting in a live call. `peopleButton()` must only return elements that pass `safeCandidate()`. Keep `UNSAFE_LABEL` strict, and never click switches, checkboxes or anything with `aria-checked`. Any new click into Meet's DOM needs a test in `tests/safety.test.js`.
- **Sync must undo its own clicks.** If `fullSync()` opened the People panel, it must close it. If no list appeared, it clicks again to revert and sets `syncPaused`.
- **Meet's DOM is private and changes often.** Never rely on obfuscated class names. Prefer aria labels, roles, `data-*` attributes, `.notranslate` / `translate="no"`, and googleusercontent avatar images.
- Names the user removes go into `roster.dismissed`, so passive scans don't add them back. A manual sync clears `dismissed`.
- Storage keys are prefixed `meetSpark:` and scoped per meeting code where relevant.

## Debugging in a real call
In the Speakers tab, **Diagnose** copies a JSON report of Meet's structure (names are masked). The user can paste it here. Use its `peopleLikeControls`, `dataAttrs`, `roles`, `regions` and `noTranslate` fields to update the selectors, then add a matching mock variant to `tests/markup-variants.test.js`.

Known state as of v2.5 (from a real report): the user's Meet had no `data-participant-id` tiles, no `role="list"`, and no button labelled "People". Detection there relies on `scanAvatars()` and the user opening the People panel and tapping sync.

## Releasing
Bump `version` in both `extension/manifest.json` and `package.json`, then run `npm test`, then `npm run package`.
