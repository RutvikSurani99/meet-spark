# Launcher and panel — Spec
ID prefix: LAUNCH · Status: **Approved** (2026-10-04, Rutvik) · Version: 1 · Owner: Rutvik Bharat
Backfill of current behaviour (v2.5.1). Part of `docs/specs/test-coverage-backfill.md`.

## Problem / goal
Write down how Spark's shell behaves (the launcher button, the panel, the tabs, the status badges, the toast) so that a change to any of it is a deliberate, spec'd change rather than an accident.

## Non-goals
- The contents of each tab (see `icebreakers.md`, `this-or-that.md`, `bingo.md`, `speakers.md`).
- Accessibility improvements (A11Y-1…3, deferred to v2.6).

## Behaviour
"Existing" = a test already covers it. "New" = a test is needed; P-numbers refer to the 2026-10-04 probe run that showed the gap.

| ID | Requirement (MUST/SHOULD) | Acceptance criteria (Given/When/Then) | Test level |
|----|---------------------------|----------------------------------------|------------|
| LAUNCH-001 | MUST mount exactly one Shadow-DOM host `#meet-spark-host` with a launcher button labelled "Spark", bottom-right | Given a Meet page, when Spark loads, then there is one host and the launcher reads "Spark" | e2e · existing LAUNCH-1 |
| LAUNCH-002 | MUST NOT mount twice if the script is injected again (e.g. extension reload) | Given Spark is loaded, when `content.js` is injected a second time, then there is still exactly one host and one launcher | e2e · new (P24) |
| LAUNCH-003 | MUST toggle the panel from the launcher, close it with ✕, and toggle it with Alt+S (with the KEYS-001 exceptions) | Launcher opens/closes, ✕ closes, Alt+S toggles | e2e · existing LAUNCH-2, KEYS-001 |
| LAUNCH-004 | MUST show four tabs (Icebreakers, This or that, Bingo, Speakers); exactly one view is active; the last tab is remembered (`meetSpark:tab`), and an invalid saved tab falls back to Icebreakers | Each tab shows its view; after reload the last tab is active; a saved value of `42` opens Icebreakers | e2e · existing TABS-1, ROSTER-004 |
| LAUNCH-005 | MUST show the number of people in the roster (live + manual) on the Speakers tab badge | Given 2 names, then the badge reads "2"; after removing one, "1" | e2e · existing SPK-1 (+ new removal check) |
| LAUNCH-006 | MUST show the sync status next to the participant list: "Not in call" outside a call, "Live" in a call with auto-sync on, "Manual" in a call with auto-sync off | Three page states → three exact texts; the `off` style is applied only for "Not in call" | e2e · new (P13, P14) |
| LAUNCH-007 | MUST show messages in one snackbar: a new message replaces the old one, and it hides by itself 2.2 s after the latest message | Toast A then toast B → text B; at +2.1 s still showing; at +2.3 s hidden | e2e · new (P41) |
| LAUNCH-008 | MUST keep keystrokes typed in Spark's own text box (Add a name) from reaching Meet's keyboard shortcuts (keydown and keyup don't propagate out of the box) | Given a document-level keydown listener on the page, when the user types in Spark's name box, then the listener receives nothing | e2e · new (P20) |
| LAUNCH-009 | MUST render and work under Meet's Trusted Types CSP, both with a permissive policy and with only `goog#html` allowed (falls back to building DOM nodes itself) | Both CSPs: panel opens, Bingo renders 25 cells, a name can be added, no page errors | e2e · existing TT-1, TT-2 |

## UI: states, copy, accessibility
Launcher title "Meet Spark (Alt+S)". Panel `role="dialog"`, `aria-label="Meet Spark"`. Status texts exactly "Not in call" / "Live" / "Manual".

## Edge cases
- Spark is injected before the Meet call UI exists: the badge shows "Not in call" until a Leave button, People button or tile appears.
- Toasts that fire within 2.2 s of each other: only the last is shown, and the timer restarts.

## Safety / privacy notes
None of these behaviours touch Meet's DOM except reading whether a call is active.

## Decisions (were open questions)
1. Screen-reader announcement of toasts stays deferred (A11Y-3, v2.6).

## Changelog
- 2026-10-04 v1: Draft (backfill from v2.5.1 behaviour and the probe audit).
- 2026-10-04 v1: Approved by Rutvik (all ten backfill specs together; current behaviour kept for every open question).
