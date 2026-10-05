# Roster and participant detection — Spec
ID prefix: ROSTER (baseline rows numbered ROSTER-101+; ROSTER-001…004 live in `v2.5.1-fixes.md`) · Status: **Approved** (v2 amendment ROSTER-107…110 approved 2026-10-05 by Rutvik; ROSTER-101…106 Implemented 2026-10-04) · Version: 2 · Owner: Rutvik Bharat
Backfill of current behaviour (v2.5.1). Part of `docs/specs/test-coverage-backfill.md`.

## Problem / goal
Turn Meet's changing, private DOM into a clean list of people's display names, without reading Meet's controls or Spark's own UI as people.

## Non-goals
Selecting by obfuscated attributes (forbidden, GR-16).

## Behaviour
| ID | Requirement (MUST/SHOULD) | Acceptance criteria (Given/When/Then) | Test level |
|----|---------------------------|----------------------------------------|------------|
| ROSTER-101 | MUST clean every detected name. Take the first line; drop "(You)", "(Presenting)", "(Host)", "(Meeting host)", "(Co-host)"; collapse spaces. Reject names shorter than 2 or longer than 60 characters, Meet's own words (you, me, pin, mute, more options, presentation, contributors, people, participants …), anything with an underscore (icon names like `more_vert`), digits only, and lines like "… is presenting", "joined", "left the meeting" | "Rutvik Bharat (You)" → "Rutvik Bharat"; "more_vert", "Mute", "12", "Asha is presenting" → not names | e2e · new (P28): table test over a mock tile/list |
| ROSTER-102 | MUST read names from: the People list rows (aria-label, `.notranslate`, `translate="no"`, `data-tooltip`, first readable line), participant tiles (`data-participant-id`, `data-requested-participant-id`), `data-self-name`, and profile photos (googleusercontent images) with the nearest readable name | Each source alone yields the right names | e2e · existing SYNC-JOIN, RCS-1, VARIANT-* |
| ROSTER-103 | MUST ignore profile photos inside Spark's own panel | With Spark's panel showing avatars, no extra names appear | e2e · new (P40) |
| ROSTER-104 | MUST NOT let a sync or scan remove or change manually added names | A manual name not in the call survives full syncs | e2e · new |
| ROSTER-105 | MUST NOT re-add a name the host removed, on passive scans; a manual sync clears that list | See SPK-007, SYNC-105 | e2e · existing RCS-1 |
| ROSTER-106 | MUST work when the browser's storage is unavailable (e.g. blocked site data): no errors, nothing saved, everything else works | With `localStorage` throwing on every call, Spark mounts, names can be added and picked, no page errors | e2e · new |
| ROSTER-107 | MUST strip **any** Meet status note in brackets after a name, not only exact single words: the bracket is removed when its first item is a status word (you, presenting, presentation, host, meeting host, co-host), whatever follows it ("(Presenting, annotating)", "(You, presenting)", "(Host · Presenting)"), and also when Meet cuts the note off without a closing bracket ("(Presenting, a"). Brackets that aren't status notes stay ("Raj (Delhi office)") | "Shourja Raj (Presenting, annotating)" → "Shourja Raj"; "Asha Rao (You, presenting)" → "Asha Rao"; "Raj (Delhi office)" unchanged | e2e (ROSTER-101 table extended) |
| ROSTER-108 | MUST NOT read a name from a button or other control: tooltips and labels of `button`, `[role=button]`, `a`, `input` and their children are ignored when looking for names in tiles, the People list and next to avatars | A presenter tile with a zoom button whose tooltip is "Zoom in" adds only the presenter's name | e2e |
| ROSTER-109 | MUST also reject Meet's presenting and tile control phrases as names, as a backup for ROSTER-108: zoom in, zoom out, reset zoom, fit to frame, fill frame, you are presenting, stop presenting, present now, presentation, full screen, exit full screen, backgrounds and effects | None of these phrases ever appears in the roster from a scan; they can still be added by hand (SPK-002) | e2e (ROSTER-101 table extended) |
| ROSTER-110 | MUST show a presenter once: "X" and "X (Presenting…)" are the same person | During a presentation the roster has "Shourja Raj" once, and the count badge counts them once | e2e |

## Edge cases
- While someone presents, Meet adds a presentation tile with its own controls (zoom, full screen) and status notes next to the presenter's name. Those must never become roster entries (ROSTER-107…110). Bug report: 2026-10-05, screenshot from a real call showing "Shourja Raj (Presenting, a…" and "Zoom in".
- Two people with the same display name appear once (names are the identity). Known limitation.
- A display name that is also a Meet word (e.g. someone called "Pin") is rejected by detection but can be added manually (SPK-002).

## Safety / privacy notes
Detection only reads the DOM. Names stay in this browser.

## Decisions (were open questions)
1. Participants with the same display name are shown once (current behaviour).

## Changelog
- 2026-10-04 v1: Draft (backfill).
- 2026-10-04 v1: Approved by Rutvik (all ten backfill specs together; current behaviour kept for every open question).
- 2026-10-04 note: ROSTER-103 has a test but no mutant. Probe P40 (removing the `#meet-spark-host` check in `scanAvatars()`) can't change behaviour, because Spark's own UI lives in a closed-off Shadow DOM that `document.querySelectorAll` never reaches, so the check is redundant (an "equivalent mutant").
- 2026-10-04 v1: Implemented. Tests carry the requirement IDs in their names; mutants in `scripts/mutants.json` (COV-Pnn).
- 2026-10-05 v2 (Draft): bug from a real call while someone was presenting. Cause: `cleanName()` strips only exact one-word notes like "(Presenting)", so "(Presenting, annotating)" survived as a second person; `nameFrom()` reads `data-tooltip` on any element, so the presenter tile's zoom button ("Zoom in") was taken as a name. Adds ROSTER-107…110. Tests: ROSTER-101 table extended + a presenter-tile mock; mutants: one per new rule. Wrong entries already in the list disappear on the next full sync or after 90 s.
- 2026-10-05 v2: Approved by Rutvik.
