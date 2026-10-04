# Auto-sync and manual sync — Spec
ID prefix: SYNC (baseline rows numbered SYNC-101+; SYNC-001…004 live in `v2.5.1-fixes.md`) · Status: **Approved** (2026-10-04, Rutvik) · Version: 1 · Owner: Rutvik Bharat
Backfill of current behaviour (v2.5.1). Part of `docs/specs/test-coverage-backfill.md`.

## Problem / goal
Keep the participant list current without the host doing anything, while touching Meet as little as possible: no repeated panel flashing, and nothing clicked except the People button (GR-2).

## Non-goals
- How a single sync reads the panel safely (SAFE-001…004, SYNC-001…004 in `v2.5.1-fixes.md`).
- Showing "Paused" when a background sync pauses itself (SYNCUI-1, awaiting approval).

## Behaviour
| ID | Requirement (MUST/SHOULD) | Acceptance criteria (Given/When/Then) | Test level |
|----|---------------------------|----------------------------------------|------------|
| SYNC-101 | MUST watch the page every 2.5 s while in a call (a Leave button, a People button or a participant tile exists), reading the open People list or the visible tiles/avatars | Name tiles appearing are picked up within one tick | e2e · existing ROSTER-EXP, RCS-1 |
| SYNC-102 | MUST run the first automatic sync once, on the first watcher tick more than 4 s after the call is first detected (about 7.5 s after Spark loads in a call) | With a People panel mock: no People-button click at 5 s, exactly one sync by 8 s | e2e · existing SYNC-JOIN (+ new timing check) |
| SYNC-103 | MUST re-sync automatically only when **all** are true: Meet's headcount is known, it differs from the roster's live count, it differs from the headcount at the last sync, and at least 8 s have passed since the last sync. So a headcount that never matches doesn't make the panel flash every tick | Headcount 6, roster settles at 5 (one name can't be read): over 60 s the People button is pressed at most once after the first sync. A real join (5 → 6) triggers one sync, not before 8 s since the previous one | e2e · new (P29, P30): **most important new test** |
| SYNC-104 | MUST have an "Auto-add participants" switch, on by default and saved (`meetSpark:autoSync`). OFF means no automatic sync ever clicks Meet; turning it ON syncs straight away | OFF → no clicks for 50 s even with headcount changes; ON → a sync runs immediately | e2e · existing SET-1, SET-2 |
| SYNC-105 | MUST let the host sync now with the sync button: it un-pauses auto-sync, clears the removed-names list (so removed people can come back), and shows a result toast | After a paused sync, tapping sync clears the pause; a removed name present in the panel comes back | e2e · new (P25, P39); existing RCS-1 covers the screen-sync path |
| SYNC-106 | MUST show the sync button as busy (spinning icon, disabled) during a sync and restore it afterwards | During a sync the button is disabled; after it, enabled | e2e · new (P22) |
| SYNC-107 | MUST fall back to reading the screen (tiles, avatars, self name) when there is no People button and no open People list, treating that as the whole call for a manual sync | No People button: tap sync → the roster equals the visible names | e2e · existing RCS-1 |
| SYNC-108 | MUST tell the host the outcome of a manual sync: "Synced <n> participant(s)" for a complete panel read, "Synced <n> so far. Scroll the People panel to the bottom or tap sync again." for a partial one, "No names found. Open Meet's People panel, then tap sync." when nothing was found, "Synced <n> from screen — open the People panel to include everyone" for a screen read, and "Sync paused: Meet's side panel changed. Tap sync again when the People panel is closed." when the undo was unsafe. Automatic syncs show no toast | Each case shows its exact text; an automatic sync shows none | e2e · new (P36, P37, P38) |

## Edge cases
- Headcount unreadable (no badge, no number in the People button label): automatic re-syncs never trigger; only the first sync and manual syncs run.
- The People button disappears mid-call: the next sync falls back to reading the screen.

## Safety / privacy notes
Every sync click goes through `safeClick()`. SYNC-103 limits how often Spark opens the People panel in someone else's live call.

## Decisions (were open questions)
1. The minimum gap between automatic syncs stays **8 s** (revisit with a real-call report).

## Changelog
- 2026-10-04 v1: Draft (backfill).
- 2026-10-04 v1: Approved by Rutvik (all ten backfill specs together; current behaviour kept for every open question).
