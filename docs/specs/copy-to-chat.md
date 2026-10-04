# Copy to chat — Spec
ID prefix: COPY · Status: **Draft** · Version: 1 · Owner: Rutvik Bharat
Backfill of current behaviour (v2.5.1). Part of `docs/specs/test-coverage-backfill.md`.

## Problem / goal
The host can paste a prompt into Meet's chat so everyone sees it. Spark only writes to the clipboard; it never types into Meet's chat itself (that would be a click into Meet, GR-2).

## Behaviour
| ID | Requirement (MUST/SHOULD) | Acceptance criteria (Given/When/Then) | Test level |
|----|---------------------------|----------------------------------------|------------|
| COPY-001 | MUST copy with the clipboard API and show "Copied — paste it into the Meet chat" on success | Any copy → clipboard text set + toast | e2e · new |
| COPY-002 | MUST show "Copy failed — please copy manually" when the clipboard refuses | Clipboard write rejects → that toast, no page error | e2e · new (P05) |
| COPY-003 | MUST copy an icebreaker as "Icebreaker: <question>", or "Icebreaker for <name>: <question>" after Ask; with no question drawn, show "Draw a question first" and copy nothing | Three cases, exact texts | e2e · new (P01, P02) |
| COPY-004 | MUST copy This or that as "Would you rather…\nA) <a>\nB) <b>\nReact 👍 for A or ❤️ for B"; with no prompt drawn, show "Draw a prompt first" | Exact text after a draw; hint before | e2e · new (P03) |
| COPY-005 | MUST copy the Bingo invite: "Meeting Bingo is on — open Meet Spark → Bingo and mark squares as they happen. First to five in a row wins." | Exact text | e2e · new (P04) |
| COPY-006 | MUST copy the Diagnose report (DIAG-101) | Clipboard holds the report JSON | e2e · new (P31) |

## Safety / privacy notes
Nothing is pasted or sent automatically; the host decides what to paste.

## Changelog
- 2026-10-04 v1: Draft (backfill).
