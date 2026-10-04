# This or that — Spec
ID prefix: WYR · Status: **Approved** (2026-10-04, Rutvik) · Version: 1 · Owner: Rutvik Bharat
Backfill of current behaviour (v2.5.1). Part of `docs/specs/test-coverage-backfill.md`. Copy text: `copy-to-chat.md`.

## Problem / goal
A quick "would you rather" poll the whole call can vote on with Meet reactions.

## Non-goals
Counting votes; repeat right after a reshuffle (DECK-1, v2.6).

## Behaviour
| ID | Requirement (MUST/SHOULD) | Acceptance criteria (Given/When/Then) | Test level |
|----|---------------------------|----------------------------------------|------------|
| WYR-001 | MUST show a real pair (A and B) from the deck on **Next prompt** | Each shown pair is one of the `WYR` pairs, A in the A slot, B in the B slot | e2e · existing WYR-1 |
| WYR-002 | MUST NOT repeat a pair until the whole deck (18) has been shown, then reshuffle | 18 draws → 18 distinct pairs | e2e · existing WYR-1 |
| WYR-003 | MUST show the voting hint "Ask everyone to vote with Meet reactions — 👍 for A, ❤️ for B." and the placeholder "Draw a prompt to start" before the first draw | Texts present before any draw | e2e · new |

## Changelog
- 2026-10-04 v1: Draft (backfill).
- 2026-10-04 v1: Approved by Rutvik (all ten backfill specs together; current behaviour kept for every open question).
