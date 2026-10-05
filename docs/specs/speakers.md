# Speakers: participant list and speaker picker — Spec
ID prefix: SPK · Status: **Implemented** (2026-10-04) · Approved 2026-10-04 by Rutvik · Version: 1 · Owner: Rutvik Bharat
Backfill of current behaviour (v2.5.1). Part of `docs/specs/test-coverage-backfill.md`. How names get into the roster automatically: `sync.md` and `roster-and-detection.md`.

## Problem / goal
Let the host see who's in the call, adjust the list, and fairly pick the next speaker, either everyone once or fully at random.

## Non-goals
- Ask during the Pick animation showing a different name (PICK-1, v2.6).
- Keeping focus on list buttons during re-renders (A11Y-3, v2.6).

## Behaviour: the list
| ID | Requirement (MUST/SHOULD) | Acceptance criteria (Given/When/Then) | Test level |
|----|---------------------------|----------------------------------------|------------|
| SPK-001 | MUST list everyone in the roster (live + manually added), sorted A–Z, with the header "Participants (<n>)"; an empty roster shows the "No participants yet…" hint | 2 names added out of order → sorted, header "Participants (2)" | e2e · existing SPK-1 |
| SPK-002 | MUST add a name with **Add** or Enter. The name is cleaned like a detected name (so "Asha Rao (You)" becomes "Asha Rao"); if cleaning rejects it (e.g. "Mute", a single letter), the trimmed text is kept as typed. Max 60 characters. Blank input adds nothing | "Asha Rao (You)" → "Asha Rao"; "   " → nothing | e2e · existing SPK-1 (+ new cleaning check, P18) |
| SPK-003 | MUST re-include a person who was excluded when their name is added again | Exclude Asha, add "Asha Rao" again → included | e2e · new (P19) |
| SPK-004 | MUST save manually added names and excluded names per meeting (see ROSTER-001/002) | Reload → same names and exclusions | e2e · existing SPK-1, SPK-2 |
| SPK-005 | MUST show each row with initials avatar (first letters of the first two words, upper case), a stable colour per name, and a label: "Added manually" for a manual name not seen in the call, "You" for your own name | "asha rao" → "AR"; manual-only row shows "Added manually"; your row shows "You" | e2e · new (P26, P27, P35) |
| SPK-006 | MUST toggle a person in/out of the draw with the checkbox (excluded rows are dimmed), saved | Exclude → dimmed + saved | e2e · existing SPK-2 |
| SPK-007 | MUST remove a person with ✕: they leave the list, the spoken list and the saved lists, passive scans don't add them back until the next manual sync, and the toast "Removed <name>" shows | Remove Asha after she spoke → gone from list and from `spoken`, toast shown | e2e · existing SPK-2, RCS-1 (+ new spoken/toast checks, P15, P16) |
| SPK-008 | MUST, on **Clear all**, empty the list (manual names, exclusions, spoken list), keep detected people from coming back on passive scans, and show "List cleared — tap sync to re-read who's in the call" | Clear all → empty list, empty `spoken`, toast | e2e · existing RCS-1 (+ new spoken/toast checks, P17) |
| SPK-009 | MUST show names as text, never HTML | `<img onerror>` name → shown literally | e2e · existing SPK-3 |

## Behaviour: picking
| ID | Requirement (MUST/SHOULD) | Acceptance criteria (Given/When/Then) | Test level |
|----|---------------------------|----------------------------------------|------------|
| SPK-010 | MUST offer two modes, "Everyone once" (default) and "Fully random", and remember the choice (`meetSpark:mode`; an invalid value falls back to Everyone once) | Choose random → reload → random still selected | e2e · new (P10) |
| SPK-011 | MUST, in Everyone once, pick each active (not excluded) person once per round, cross out people who have spoken, show "<left> of <active> still to speak", and when everyone has spoken start a new round with the toast "Everyone has spoken — starting a new round" | 3 active → 3 picks cover all 3; 4th pick → toast + `spoken` has 1 name | e2e · existing SPK-4 (+ new toast check, P11) |
| SPK-012 | MUST, in Fully random, pick any active person each time (repeats allowed) and show "<active> in the draw" | 2 active → sub text "2 in the draw" | e2e · new (P09) |
| SPK-013 | MUST never pick an excluded or removed person | 30 random picks never land on them | e2e · existing SPK-4, SPK-7 |
| SPK-014 | MUST animate **Pick next speaker** for about 2 s, landing on the winner; the Pick button is disabled until the animation ends | During the animation the button is disabled; after it, enabled and the name is a real participant | e2e · existing SPK-5 (+ new disabled check, P21) |
| SPK-015 | MUST, with no active participants, show "No participants yet — sync or add names" and switch to the Speakers tab | Empty roster → toast + Speakers tab active | e2e · existing SPK-6 (+ new tab check, P42) |
| SPK-016 | MUST, on **Reset**, clear the spoken list and the picker ("Who's next?", default avatar) | After a pick, Reset → "Who's next?" and `spoken` = [] | e2e · existing SPK-5 |

## Edge cases
- An excluded person is shown dimmed, not crossed out, even if they spoke, and isn't counted in "still to speak".
- The spoken list is per meeting (ROSTER-001) and isn't saved outside a meeting (ROSTER-002).

## Safety / privacy notes
Names are stored only in this browser (`localStorage`, `meetSpark:` keys). Nothing is sent anywhere (GR-5).

## Decisions (were open questions)
1. **Clear all** keeps clearing manually added names too (current behaviour).
2. **Fully random** may pick the same person twice in a row (current behaviour).

## Changelog
- 2026-10-04 v1: Draft (backfill).
- 2026-10-04 v1: Approved by Rutvik (all ten backfill specs together; current behaviour kept for every open question).
- 2026-10-05: SPK-014 amended by `docs/specs/picker-styles.md` PSTY-021: the pick now plays in a popup (≤ 5 s, style-dependent) and the Pick button stays disabled until the popup closes.
- 2026-10-04 v1: Implemented. Tests carry the requirement IDs in their names; mutants in `scripts/mutants.json` (COV-Pnn).
