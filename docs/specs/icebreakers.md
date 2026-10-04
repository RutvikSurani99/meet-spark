# Icebreakers — Spec
ID prefix: ICE · Status: **Draft** · Version: 1 · Owner: Rutvik Bharat
Backfill of current behaviour (v2.5.1). Part of `docs/specs/test-coverage-backfill.md`. Copy text: `copy-to-chat.md`.

## Problem / goal
Give the host a steady supply of India-friendly warm-up questions, grouped by mood, that don't repeat until the category is used up, and that can be directed at a participant.

## Non-goals
- Content rules (owned by the content-policy test, GR-7).
- Avoiding a repeat right after a reshuffle (DECK-1, deferred to v2.6).

## Behaviour
| ID | Requirement (MUST/SHOULD) | Acceptance criteria (Given/When/Then) | Test level |
|----|---------------------------|----------------------------------------|------------|
| ICE-001 | MUST show the categories Warm-up, Work, Fun, Reflective as chips, in that order, with the selected one highlighted | Chips in order; exactly one chip has the active style, and it is the selected category | e2e · existing ICE-1 (+ new highlight check, P32) |
| ICE-002 | MUST draw a question from the selected category when a chip is clicked or **Next question** is pressed, and remember the category (`meetSpark:cat`); an unknown saved category falls back to Warm-up | Clicking "Fun" shows a Fun question and saves "Fun" | e2e · existing ICE-2 |
| ICE-003 | MUST NOT repeat a question within a category until all of that category's questions have been shown; then it starts a new shuffled pass | n draws in a category of n give n distinct questions | e2e · existing ICE-2 |
| ICE-004 | MUST show a counter "<Category> · <k> of <n>" | After 3 draws in Warm-up (10) → "Warm-up · 3 of 10" | e2e · existing ICE-2 |
| ICE-005 | MUST, on **Ask**, draw a question first if none is shown, pick a participant with the speaker-picker rules (no animation; marks them as spoken in "Everyone once"), and show "Question for <name>" | Given no question and one participant, Ask shows a question and "Question for Asha Rao" | e2e · existing ICE-3, SPK-4 |
| ICE-006 | MUST clear the "Question for …" line when the next question is drawn | Ask → "Question for X"; Next → the line is empty | e2e · new (P23) |
| ICE-007 | MUST, when Ask is pressed with no active participants, show "No participants yet — sync or add names" and switch to the Speakers tab | Empty roster → toast + Speakers tab active | e2e · new (P42, shared with SPK-015) |

## UI: states, copy, accessibility
Placeholder before the first draw: "Choose a category and draw a question to get the conversation going."

## Edge cases
- Switching category keeps each category's own deck position.
- Ask with everyone already asked starts a new round (SPK rules).

## Safety / privacy notes
None.

## Open questions
None.

## Changelog
- 2026-10-04 v1: Draft (backfill).
