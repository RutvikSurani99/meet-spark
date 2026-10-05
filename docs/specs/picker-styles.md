# Picker styles: animated popup for "Pick next speaker" — Spec
ID prefix: PSTY · Status: **Approved** (2026-10-05) · Approved 2026-10-05 by Rutvik · Version: 1 · Owner: Rutvik Bharat
Amends `docs/specs/speakers.md` (SPK-014 timing). Who can be picked is unchanged: SPK-010…SPK-013 still decide the winner.

## Problem / goal
The current pick is a 2 s name flicker inside the panel card. Make picking fun and big: open a popup over the call with one of six animations and a celebration, and let the host either choose a favourite style or get a different one every pick. It must work the same for 2 people or 150+ people.

Design reference: the "Speaker Picker Concepts" design canvas (boards 1–6, 1b, 4b).

## Non-goals
- Showing the animation to other people in the call. The popup is drawn by the extension on the host's own screen only (sharing the screen or tab shows it, like anything else on screen).
- Sound.
- Changing who can be picked, the modes, or the spoken list (SPK-010…013, SPK-016).
- New permissions, remote fonts or images (GR-5, GR-6): all fonts are system fonts, all shapes are CSS/SVG.

## Behaviour: choosing a style
| ID | Requirement (MUST/SHOULD) | Acceptance criteria (Given/When/Then) | Test level |
|----|---------------------------|----------------------------------------|------------|
| PSTY-001 | MUST offer an **Animation** setting in the Speakers tab with 7 options: **Surprise me** (default), **Slot machine**, **Wheel**, **Spotlight**, **Cards**, **Departure board**, **Countdown** | Open Speakers → the setting shows "Surprise me" selected | e2e |
| PSTY-002 | MUST remember the choice in this browser (`meetSpark:pickStyle`, not per meeting); an unknown value falls back to Surprise me | Choose Wheel → reload → Wheel; stored "disco" → Surprise me | e2e |
| PSTY-003 | MUST, with a fixed style chosen, use that style for every pick | Wheel chosen → 3 picks all show the wheel | e2e |
| PSTY-004 | MUST, with **Surprise me**, use a random style for each pick, never the same style twice in a row | 12 picks → no two neighbours share a style; at least 3 different styles seen | e2e |
| PSTY-005 | SHOULD show the style's name small at the top of the popup (e.g. "Slot machine") so people learn the names | Popup shows "Wheel" label | e2e |

## Behaviour: the popup
| ID | Requirement (MUST/SHOULD) | Acceptance criteria (Given/When/Then) | Test level |
|----|---------------------------|----------------------------------------|------------|
| PSTY-010 | MUST open the popup on **Pick next speaker**, over the call, centred, with a dimmed background, inside the extension's shadow root | Pick → `[role=dialog]` visible in `#meet-spark-host` shadow root | e2e |
| PSTY-011 | MUST choose the winner **before** the animation starts (existing `pickSpeaker` rules); the animation only reveals it and always lands on that person | Stub random → animation ends on the stubbed winner; `spoken` updated per SPK-011 | e2e |
| PSTY-012 | MUST end every style's animation within **5 s**, whatever the number of active people (1–300) | Fake clock: reveal state reached ≤ 5000 ms for 1, 6, 30, 150, 300 people, each style | e2e |
| PSTY-013 | MUST keep the popup small in the page for big calls: the slot reels hold at most 40 rows each, the wheel at most 12 slices (a random shortlist that always contains the winner), the spotlight at most 200 faces (a random sample that always contains the winner) | 300 people → each reel ≤ 40 rows; wheel ≤ 12 labels incl. winner; spotlight ≤ 200 faces incl. winner | e2e |
| PSTY-014 | MUST, in Everyone once, draw the reel / wheel / spotlight names only from people still to speak (plus the winner) | 30 people, 25 spoken → wheel shows ≤ 5 names, none of the spoken | e2e |
| PSTY-015 | MUST celebrate the reveal: the winner's initials avatar and full name, big, plus confetti (coins for the slot machine) | After reveal → winner name text visible, confetti elements present | e2e |
| PSTY-016 | MUST offer three buttons after the reveal: **Skip, not here**, **Pick again**, **Done**, and a close (✕) button. Esc closes too | Buttons visible after reveal; Esc → popup gone | e2e |
| PSTY-017 | MUST, on **Skip, not here**, not count the skipped person as spoken (Everyone once) and pick again at once, not landing on the skipped person if anyone else is available | Skip → skipped name not in `spoken`; next winner ≠ skipped (2+ active) | e2e |
| PSTY-018 | MUST, on **Pick again**, run a new pick in the same popup (new style if Surprise me) | Pick again → new reveal; style differs under Surprise me | e2e |
| PSTY-019 | MUST, on Done / ✕ / Esc, close the popup and show the winner in the panel's picker card as today (`showPicked`), and update the list (crossed out) | Done → panel shows winner name and avatar | e2e |
| PSTY-020 | MUST, if closed during the animation, still keep the pick (already chosen) and show it in the panel; no timers left running | Close at 500 ms → panel shows winner; advancing the clock changes nothing | e2e |
| PSTY-021 | MUST disable **Pick next speaker** while the popup is open, and ignore a second pick (amends SPK-014: duration depends on the style, ≤ 5 s) | Popup open → Pick button disabled; after close → enabled | e2e |
| PSTY-022 | MUST, with the system setting "reduce motion" on, skip the spinning: fade straight to the reveal, no confetti, no flashing lights | Emulate reduced motion → reveal shown at once, 0 confetti | e2e |
| PSTY-023 | MUST be keyboard and screen-reader friendly: `role="dialog"`, `aria-modal="true"`, a label ("Picking the next speaker"); focus moves into the popup and back to the Pick button after closing; the winner is announced through an `aria-live` region; buttons are at least 44 px tall | Open → focus inside dialog; reveal → live region text = winner; close → focus on Pick button | e2e |
| PSTY-024 | MUST show names as text only, never HTML (GR-3) | `<img onerror>` name → shown literally in reels, wheel, cards, board | e2e |
| PSTY-025 | MUST NOT click or change anything in Meet; Esc and other keys are handled only while the popup is open and only inside the popup (KEYS-001 still holds) | Click recorder clean; Esc with popup closed → not prevented | e2e (GR-15) |
| PSTY-026 | MUST remove the popup and stop its timers when the meeting is left or the panel is torn down | Navigate away mid-animation → no popup, no errors | e2e |
| PSTY-027 | MUST keep the **Ask** button (Icebreakers) instant, without the popup | Ask → name in the card at once, no dialog | e2e |

## Behaviour: the six styles
Shared: the popup is ~640×560 px (shrinks to fit small windows), dark backdrop, white text, system fonts.

| ID | Style | What it does (from the design canvas) | Test level |
|----|-------|----------------------------------------|------------|
| PSTY-030 | Slot machine | Marquee "SPARK JACKPOT" with chasing bulbs; 3 reels (face, first name, last name) built from a random sample (≤ 40 rows each) ending on the winner; reels stop left to right; lever animates; "STILL TO SPEAK x / y" counter; coins + confetti, "JACKPOT! {FIRST NAME}, YOU'RE UP". About 3 s | e2e |
| PSTY-031 | Wheel | Up to 12 slices (all people still to speak if ≤ 12, else a shortlist shuffled on with a short flicker); first names on slices; spins ~4 s and stops with the pointer on the winner; "The wheel has spoken". About 4.8 s | e2e |
| PSTY-032 | Spotlight | All faces (≤ 200) in a grid that shrinks to fit; a spotlight hops and slows; the hovered name ticks below; winner pulses. About 2.8 s | e2e |
| PSTY-033 | Cards | Three card backs riffle twice, the top card flips to the winner; light rays, sparkles and confetti. About 1.9 s | e2e |
| PSTY-034 | Departure board | Split-flap letters for first and last name flutter and settle left to right; "NOW SPEAKING". About 2 s | e2e |
| PSTY-035 | Countdown | 3-2-1 ring countdown, then the winner pops in with confetti. About 2.6 s | e2e |

## UI: copy
- Setting label: "Animation". Options as in PSTY-001. Help text under it: "Surprise me picks a different animation each time."
- Dialog label: "Picking the next speaker". Buttons: "Skip, not here", "Pick again", "Done", ✕ "Close".
- Panel card after close: unchanged (`showPicked`).

## Edge cases
- 1 active person: every style still plays and lands on them; Skip shows the toast "No one else to pick" and keeps the popup open.
- 0 active people: no popup; existing SPK-015 toast.
- A new round starts during Pick again (everyone spoke): existing SPK-011 toast shows behind the popup.
- Very long names: ellipsis on reels, slices and board (board shows the first 11 letters).
- The roster changes while the popup is open (someone leaves): the pick stands.

## Safety / privacy notes
- Built inside the existing shadow root with `setHTML()` for fixed markup and `textContent` for names (GR-3). No `innerHTML`.
- No network, no remote fonts or images (GR-5); no new permissions (GR-6).
- No clicks into Meet; all popup listeners live on popup elements (GR-2, GR-15).
- The style choice is stored only in this browser's `localStorage`.

## Implementation notes (not requirements)
- All code stays in `extension/content.js` (no build step), in a new "Picker popup" section: one `openPickerPopup(winner, pool, style)` plus one small renderer per style. CSS goes in the existing shadow-root stylesheet with a `psty-` prefix. Estimated +600 lines.
- Tests: new `tests/picker-styles.test.js` using the fake clock; mutants in `scripts/mutants.json` (PSTY-…).

## Decisions (were open questions; all proposed answers accepted 2026-10-05)
1. Default style: **Surprise me**.
2. Ask button: **stays instant** (PSTY-027). Earlier I suggested Ask could open the popup too; keeping it instant avoids a popup in the middle of an icebreaker.
3. Fixed style: **all six available**, including the wheel's longer 4.8 s.
4. Popup on small windows: **scale down to fit**, never scroll.

## Changelog
- 2026-10-05 v1: Draft.
- 2026-10-05 v1: Approved by Rutvik (all proposed answers accepted).
