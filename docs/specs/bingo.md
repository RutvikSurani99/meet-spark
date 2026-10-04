# Meeting Bingo — Spec
ID prefix: BINGO · Status: **Draft** · Version: 1 · Owner: Rutvik Bharat
Backfill of current behaviour (v2.5.1). Part of `docs/specs/test-coverage-backfill.md`. Invite text: `copy-to-chat.md`.

## Problem / goal
A personal 5×5 card of things that always happen in Indian office calls, marked as they happen, with a celebration on every completed line.

## Non-goals
Shared/multiplayer cards; keyboard play (A11Y-1, v2.6).

## Behaviour
| ID | Requirement (MUST/SHOULD) | Acceptance criteria (Given/When/Then) | Test level |
|----|---------------------------|----------------------------------------|------------|
| BINGO-001 | MUST deal 25 cells: 24 different items from `BINGO` plus "FREE" in the centre (index 12), which starts marked and can't be unmarked | 25 cells, cell 12 = FREE, 24 unique real items; clicking FREE changes nothing | e2e · existing BINGO-1 (+ new FREE-click check) |
| BINGO-002 | MUST toggle a cell's mark on click | Click → marked; click again → unmarked | e2e · existing BINGO-2 |
| BINGO-003 | MUST score all 12 lines (5 rows, 5 columns, 2 diagonals; FREE counts) and highlight the cells of completed lines | Each line scores "… · 1 line" and its cells get the win style | e2e · existing BINGO-3 |
| BINGO-004 | MUST show "<marked> marked · <lines> line(s)" (FREE not counted in "marked"; "line" singular for 1) | 5 marked in a row → "5 marked · 1 line"; new card → "0 marked · 0 lines" | e2e · existing BINGO-2 |
| BINGO-005 | MUST celebrate a **newly** completed line with confetti and the toast "Bingo! Call it out in the meeting"; unmarking and re-marking a cell that doesn't create a new line doesn't celebrate again | First line → confetti pieces appear + toast; marking a 6th cell outside any line → no new confetti | e2e · new (P06, P07) |
| BINGO-006 | MUST keep the card and marks across reloads (`meetSpark:bingo_in`), ignoring a stored card of the wrong shape | Reload → same card and score; a broken stored card → fresh card | e2e · existing BINGO-2, ROSTER-004 |
| BINGO-007 | MUST deal a fresh card on **New card**, with only FREE marked | New card → "0 marked · 0 lines", stored `marked` = [12] | e2e · existing BINGO-2 |
| BINGO-008 | MUST show cell text as text, never as HTML | A card item containing `<b>x</b>` renders the literal characters | e2e · new (P33) |

## Changelog
- 2026-10-04 v1: Draft (backfill).
