# Changelog

All notable changes to Meet Spark. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versions follow SemVer.
Every entry names the spec requirement IDs it implements (see `docs/specs/`).

## [Unreleased]

## [2.5.1] — 2026-10-04
Specs: `docs/specs/v2.5.1-fixes.md`, `docs/specs/guardrails-hardening.md` (both Implemented).

### Fixed: live-call safety
- Every click into Meet now goes through one function, `safeClick()`, which re-checks the control at click time (SAFE-001).
- **F1:** sync expands only "Contributors"-style group headers inside the participants list. It used to click every collapsed control near the list (SAFE-002).
- Closing the People panel after a sync is safe: if Chat or another panel replaced it, Spark doesn't click, and if Meet re-rendered the button, Spark uses the new one (SAFE-003).
- `UNSAFE_LABEL` now matches plurals and verb forms, so "Meeting options" / "More options" can never be mistaken for the People button (SAFE-004).

### Fixed: roster
- Large calls: only a complete People-panel scan (scrolled to the bottom, groups expanded, headcount matches) can remove people. Sync scrolls long lists to the bottom, up to about 300 people (SYNC-001, SYNC-002).
- The watcher doesn't read the list in the middle of a sync (SYNC-003); a chat list or a hidden list is no longer taken for the People panel (SYNC-004).
- Each meeting keeps its own names, excluded and spoken lists, even without a page reload; nothing is saved on the home screen (ROSTER-001, ROSTER-002).
- Passive expiry is 90 s, one named constant (F2, ROSTER-003); bad stored data no longer stops Spark from loading (ROSTER-004).

### Fixed: other
- Alt+S no longer fires while typing in Meet's chat or with Ctrl/Cmd/AltGr, and holding the keys doesn't flicker the panel (KEYS-001).
- Diagnose redacts names inside control labels and the meeting code (DIAG-001).
- `leaveButton()` no longer uses Meet's obfuscated `jsname` (DETECT-001).

### Guardrails
- Mutation gate (`npm run mutate`, 26 mutants), protected-file fingerprints, locked gate scripts, test inventory, spec traceability, closed lint loopholes, click recorder + trap page + People-button table, fake-clock tests (the suite went from about 90 s to about 25 s).
- Spec-first workflow enforced: commit-msg hook, CI check, Claude Code hook, and the `/spec` and `/implement` commands (GR-14).

## [2.5.0] — 2026-10-01
Baseline before the guardrails work (tag `v2.5.0-baseline`).
