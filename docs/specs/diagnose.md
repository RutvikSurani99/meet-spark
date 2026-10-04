# Diagnose report — Spec
ID prefix: DIAG (baseline rows numbered DIAG-101+; DIAG-001 lives in `v2.5.1-fixes.md`) · Status: **Implemented** (2026-10-04) · Approved 2026-10-04 by Rutvik · Version: 1 · Owner: Rutvik Bharat
Backfill of current behaviour (v2.5.1). Part of `docs/specs/test-coverage-backfill.md`.

## Problem / goal
When detection misses people in a real call, the host can hand over a structural report of Meet's page so selectors can be fixed, without exposing anyone's name.

## Behaviour
| ID | Requirement (MUST/SHOULD) | Acceptance criteria (Given/When/Then) | Test level |
|----|---------------------------|----------------------------------------|------------|
| DIAG-101 | MUST, on **Diagnose**, build a JSON report, log it to the console with the prefix `[Meet Spark] diagnostics` and copy it to the clipboard (with the copy toast) | Click Diagnose → console line present and the clipboard holds the same JSON | e2e · existing DIAG-1 (console) + new clipboard check (P31) |
| DIAG-102 | MUST include these fields: `version`, `path`, `inCall`, `leaveButton`, `peopleButton`, `peopleCount`, `selfName` (true/false only), `participantsListFound`, `lists`, `tiles`, `tileSample`, `detected`, `buttons`, `peopleLikeControls`, `dataAttrs`, `roles`, `regions`, `noTranslate`, `syncPaused`, `watcher` | All fields present with the right types | e2e · existing DIAG-001 (partial) + new full field check |
| DIAG-103 | MUST NOT contain any participant name or the meeting code: text is masked ("A…(8)") and labels keep only known control words (DIAG-001) | See DIAG-1, DIAG-001 | e2e · existing DIAG-1, DIAG-001 |
| DIAG-104 | MUST NOT click anything in Meet | Diagnose on any page records zero clicks | e2e · existing SAFE-TABLE, SAFETY-1 |

## Changelog
- 2026-10-04 v1: Draft (backfill).
- 2026-10-04 v1: Approved by Rutvik (all ten backfill specs together; current behaviour kept for every open question).
- 2026-10-04 v1: Implemented. Tests carry the requirement IDs in their names; mutants in `scripts/mutants.json` (COV-Pnn).
