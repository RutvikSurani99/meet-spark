# Changelog

All notable changes to Meet Spark. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versions follow SemVer.
Every entry names the spec requirement IDs it implements (see `docs/specs/`).

## [Unreleased]
Spec: `docs/specs/trusted-types-console.md` v1.

### Fixed
- Browser tests failed under the strictest Trusted Types CSP on Chromium 1243 (Playwright 1.63), which rewords the expected blocked-policy console message as "Creating a TrustedTypePolicy named … violates". The test error collector now accepts both wordings for Spark's own `meet-spark-…` policy only, and still reports any other name (TTC-001, TTC-002). No change to the extension (TTC-003). This unblocks the pre-push hook (TTC-004).

## [2.7.0] — 2026-10-05
Spec: `docs/specs/picker-style-tiles.md` v1.

### Changed
- The **Animation** dropdown is now a set of tiles: a Surprise me tile plus six style tiles, each with a tiny live CSS preview that plays only when selected or hovered (and never with reduce motion) (PTILE-001…003).
- The Surprise me tile shows the tour ("2 of 6 shown" with progress dots); while it's selected, styles already shown this meeting get a green dot (PTILE-004).
- Arrow keys move between tiles as one radio group; keys never reach Meet (PTILE-005). Tiles fit the 360 px panel (PTILE-006).
- The picker card now says which animation made the last pick ("Picked with: Wheel") (PTILE-007).

## [2.6.1] — 2026-10-05
Spec: `docs/specs/picker-styles.md` v2.

### Changed
- **Surprise me** now shows all six animations once in each meeting before going random (still never the same one twice in a row). Fixed-style picks, Pick again and Skip count as shown; progress is saved per meeting, so a reload doesn't restart it (PSTY-006).

## [2.6.0] — 2026-10-05
Spec: `docs/specs/picker-styles.md` v1.

### Added
- **Pick next speaker** opens a big popup over the call with one of six animations: Slot machine, Wheel, Spotlight, Cards, Departure board and Countdown, then celebrates the winner with confetti (coins for the slot machine) (PSTY-010, PSTY-015, PSTY-030…035).
- New **Animation** setting in the Speakers tab: pick one style, or **Surprise me** (default), which uses a different style every pick and never repeats one twice in a row. Remembered in this browser (PSTY-001…005).
- Popup buttons **Skip, not here** (not counted as spoken, lands on someone else), **Pick again** and **Done**, plus ✕ and Esc (PSTY-016…019).
- Works the same for 1 to 300 people: every animation ends within 5 s and stays small (slot reels ≤ 40 rows, wheel ≤ 12 names, spotlight ≤ 200 faces, always including the winner). In Everyone once, only people still to speak appear (PSTY-012…014).
- Reduce-motion support, keyboard focus handling and a screen-reader announcement (PSTY-022, PSTY-023).

### Changed
- The Pick button stays disabled while the popup is open (SPK-014 amended by PSTY-021). The Icebreakers **Ask** button stays instant (PSTY-027).

### Tests
- New `tests/picker-styles.test.js` (17 tests); SPK-014 and SPK-7 tests updated to close the popup. 24 new mutants (M-PSTY-…), all killed.

## [2.5.2] — 2026-10-05
Spec: `docs/specs/roster-and-detection.md` v2.

### Fixed
- While someone presents, the roster no longer shows them twice ("Shourja Raj" and "Shourja Raj (Presenting, …)"): any status note in brackets that starts with presenting/you/host is stripped, even when Meet cuts it off (ROSTER-107, ROSTER-110).
- Names are never read from buttons or other controls, so a presenter tile's "Zoom in" button no longer appears as a person (ROSTER-108). Meet's presenting and tile phrases are rejected as names as a backup (ROSTER-109).

### Tests and specs (2026-10-04, no product change)
- Specs for every existing feature: launcher-and-panel, icebreakers, this-or-that, bingo, speakers, sync, roster-and-detection, diagnose, copy-to-chat (67 requirements), plus test-coverage-backfill.
- 40 new tests (`tests/ui-backfill.test.js`, `tests/sync-backfill.test.js`), including SYNC-103, which stops the People panel from flashing in live calls; existing test names now carry their requirement IDs.
- Mutation gate grows from 29 to 70 mutants, all killed. Traceability counts test names only (COV-002). Clipboard stub for copy tests (COV-004).
- `docs/QA_CHECKLIST.md` for real-call checks (COV-007).

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
- Found by an independent review before release: a Chat panel whose text mentions "people" is no longer taken for the People list (SYNC-004, SAFE-003); lists that scroll themselves are read to the end (SYNC-002); `/_meet/<code>` URLs count as meetings (ROSTER-002).

### Guardrails
- Mutation gate (`npm run mutate`, 29 mutants), protected-file fingerprints, locked gate scripts, test inventory, spec traceability, closed lint loopholes, click recorder + trap page + People-button table, fake-clock tests (the suite went from about 90 s to about 25 s, 54 tests).
- Spec-first workflow enforced: commit-msg hook, CI check, Claude Code hook, and the `/spec` and `/implement` commands (GR-14).

## [2.5.0] — 2026-10-01
Baseline before the guardrails work (tag `v2.5.0-baseline`).
