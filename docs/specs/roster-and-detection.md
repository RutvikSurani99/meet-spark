# Roster and participant detection — Spec
ID prefix: ROSTER (baseline rows numbered ROSTER-101+; ROSTER-001…004 live in `v2.5.1-fixes.md`) · Status: **Approved** (2026-10-04, Rutvik) · Version: 1 · Owner: Rutvik Bharat
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

## Edge cases
- Two people with the same display name appear once (names are the identity). Known limitation.
- A display name that is also a Meet word (e.g. someone called "Pin") is rejected by detection but can be added manually (SPK-002).

## Safety / privacy notes
Detection only reads the DOM. Names stay in this browser.

## Decisions (were open questions)
1. Participants with the same display name are shown once (current behaviour).

## Changelog
- 2026-10-04 v1: Draft (backfill).
- 2026-10-04 v1: Approved by Rutvik (all ten backfill specs together; current behaviour kept for every open question).
