# Picker style tiles: visual Animation picker — Spec
ID prefix: PTILE · Status: **Approved** (2026-10-05) · Approved 2026-10-05 by Rutvik · Version: 1 · Owner: Rutvik Bharat
Changes the UI of PSTY-001 in `docs/specs/picker-styles.md` (the Animation setting). Behaviour of the styles, Surprise me and storage (PSTY-002…006) is unchanged.

## Problem / goal
The Animation setting is a plain dropdown, so people can't see what each style looks like. Replace it with small tiles that each show a tiny live preview of the animation. Design reference: board 7 "Animation picker tiles" on the "Speaker Picker Concepts" canvas.

## Non-goals
- Playing the full animation from the tile (that is what Pick does).
- New styles, or changes to how Surprise me chooses (PSTY-004, PSTY-006).

## Behaviour
| ID | Requirement (MUST/SHOULD) | Acceptance criteria (Given/When/Then) | Test level |
|----|---------------------------|----------------------------------------|------------|
| PTILE-001 | MUST replace the Animation dropdown with a **Surprise me** tile (full width) and six style tiles in a 3 × 2 grid, each with its name and a small preview drawn with CSS only (no images, no network) | Speakers tab → 7 tiles in order Surprise me, Slot machine, Wheel, Spotlight, Cards, Departure board, Countdown; no `<select>` | e2e |
| PTILE-002 | MUST select a style by clicking its tile; the selected tile has a blue border, a check mark and `aria-checked="true"`; the choice is saved exactly as before (`meetSpark:pickStyle`, PSTY-002) | Click Wheel → Wheel tile checked, others not; reload → Wheel still checked | e2e |
| PTILE-003 | MUST play a tile's mini preview only while it is selected or hovered; all other tiles stay still. With "reduce motion" on, no preview moves | Selected tile's preview has running animation, others paused; reduced motion → none running | e2e |
| PTILE-004 | MUST show the Surprise me tour on its tile: "Every animation once, then random · n of 6 shown" with six progress dots (n filled), or "All 6 shown · now random" once complete, using the meeting's shown set (PSTY-006). While Surprise me is selected, style tiles already shown this meeting get a small green dot | After 2 Surprise picks → "2 of 6 shown", 2 dots filled, 2 tiles dotted; after 6 → "All 6 shown…" | e2e |
| PTILE-005 | MUST work as one radio group for the keyboard: `role="radiogroup"` labelled "Animation", tiles are `role="radio"`; Tab reaches the selected tile, arrow keys move and select, Space/Enter selects; keys don't reach Meet | ArrowRight from Surprise me → Slot machine selected and focused; page key listener sees nothing | e2e |
| PTILE-006 | MUST fit the 360 px panel without horizontal scrolling and keep tile text readable (≥ 12 px); long names such as "Departure board" fit on one line | Tile row width ≤ panel content width; no tile text wraps or overflows | e2e |
| PTILE-007 | SHOULD show under the panel's picker card which style the last pick used ("Picked with: Wheel") | After a pick → sub line names the style | e2e |

## UI: copy
- Label "Animation"; hint on the right shows the current choice ("Surprise me" / style name).
- Surprise me tile: title "Surprise me", sub line per PTILE-004.
- Tiles: Slot machine, Wheel, Spotlight, Cards, Departure board, Countdown.

## Edge cases
- Outside a meeting the tour counts in memory only (PSTY-006), so the dots reset on reload there.
- Storage blocked: tiles still work for the session (ROSTER-106 style).

## Safety / privacy notes
CSS and fixed markup only (`setHTML` for static markup, GR-3); listeners only on Spark's own elements (GR-2, GR-15); no new storage keys.

## Decisions (were open questions; accepted 2026-10-05)
1. Picked-with line under the picker card (PTILE-007): **yes, include it**.
2. Green "shown" dots on style tiles: **only while Surprise me is selected**.

## Changelog
- 2026-10-05 v1: Draft, from Rutvik's request for small animation highlights instead of a dropdown.
- 2026-10-05 v1: Approved by Rutvik (both proposed answers accepted).
