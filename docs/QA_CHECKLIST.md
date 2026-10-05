# Real-call QA checklist

Mock pages can't prove Meet's real DOM (COV-007). Before every release, and after any change to detection or sync, run this in a real Google Meet call, then write the date and result in `docs/PROJECT_NOTES.md`.

Setup: load the unpacked `extension/` folder in Chrome (`docs/README.md`), join a call with **more than 15 people** if possible (a second device or colleagues help), and open Spark (bottom-right, or Alt+S outside text boxes).

| # | Check | Expected | Spec |
|---|---|---|---|
| 1 | Wait 10 s after joining with the People panel closed | The Speakers list fills in; the People panel opens and closes once at most | SYNC-102, SYNC-001b |
| 2 | Leave Spark open for 2 minutes with nobody joining | The People panel does **not** keep flashing open | SYNC-103 |
| 3 | Someone joins or leaves | The list updates within about 10–15 s | SYNC-103 |
| 4 | Open Meet's People panel yourself and scroll it | The list never shrinks to the people on screen | SYNC-001 |
| 5 | Open **Chat** right after tapping sync | Chat stays open; Spark doesn't click it closed | SAFE-003 |
| 6 | Type "s" with Alt/Option held in Meet's chat box | The character is typed; Spark's panel doesn't toggle | KEYS-001 |
| 7 | Tap **Diagnose**, paste the report somewhere private | No names and no meeting code appear in it | DIAG-001, DIAG-103 |
| 8 | Copy an icebreaker, a This-or-that prompt and the Bingo invite into Meet's chat | Each pastes the expected text | COPY-003…005 |
| 9 | As host, check Meet's host controls after a few syncs | Nothing was toggled (chat, mic, captions, access settings unchanged) | GR-2, SAFE-001 |
| 10 | Move to another meeting without reloading | The new meeting starts with an empty list; going back restores the old one | ROSTER-001 |
| 11 | Pick next speaker with each Animation style, then with Surprise me a few times | Popup over the call, lands on the name shown, confetti; Surprise me shows all six once, then changes style every time | PSTY-003, PSTY-004, PSTY-006, PSTY-030…035 |
| 12 | Share your screen or tab and pick | The popup appears in what you share (only the extension draws it); Done closes it and the panel shows the name | PSTY-019, non-goal note |
| 13 | Look at the Animation tiles, hover each, use the arrow keys | Only the selected/hovered tile moves; Departure board fits on one line; arrows change the choice without triggering Meet shortcuts | PTILE-003, PTILE-005, PTILE-006 |
| 14 | Open Chrome DevTools → Console on the Meet tab, then use each tab | No Spark errors; the only Spark-related line allowed is Chrome's "TrustedTypePolicy named 'meet-spark-…'" blocked-policy message (expected: Spark falls back to building the DOM itself) | TTC-001, LAUNCH-009 |

If anything fails, run **Diagnose** in that call and start a spec (`/spec` or `npm run spec:new`) with the report attached.
