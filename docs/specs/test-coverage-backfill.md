# Test coverage backfill — Spec
ID prefix: COV · Status: **Draft** · Version: 1 · Owner: Rutvik Bharat
Covers the work for: `launcher-and-panel.md`, `icebreakers.md`, `this-or-that.md`, `bingo.md`, `speakers.md`, `sync.md`, `roster-and-detection.md`, `diagnose.md`, `copy-to-chat.md` (all Draft, approve together).

## Problem / goal
The 2026-10-04 coverage audit found that:
1. Only the v2.5.1 fixes and the guardrails had specs. The original features had none, so their 21 tests weren't tied to any written requirement.
2. Of 42 probe mistakes (one per existing behaviour), only **3** were caught by a test (P08, P12, P34). Three more (P01, P26, P28) were "caught" only because the probe left a variable unused. 36 survived, including SYNC-103: without the re-sync cooldown, Meet's People panel would flash open every 2.5 s in a live call.
3. Guard traceability (GR-13) counts an ID mentioned anywhere in `scripts/` (including `mutants.json`) as "tested". GRH-041 and GRH-042 pass only that way.

**Goal:** every behaviour Spark has today is written down with a requirement ID, has a test whose name carries that ID, and has a mutant proving the test catches its loss. **No product behaviour changes.**

## Non-goals
- Changing any behaviour. Where current behaviour looks wrong, it is an open question in the feature spec, not a change here.
- The deferred v2.6 items (A11Y-1…3, DECK-1, PICK-1, STORE-1, SYNCUI-1, LOOKUP-1).

## Behaviour
| ID | Requirement (MUST/SHOULD) | Acceptance criteria (Given/When/Then) | Test level |
|----|---------------------------|----------------------------------------|------------|
| COV-001 | MUST give every requirement in the nine feature specs a test whose **test name** contains the requirement ID. Existing tests get the IDs added to their names (e.g. `ICE-2 … (ICE-002, ICE-003, ICE-004)`); rows marked "new" get new tests | Once the specs are Implemented, guard reports no untraced ID | guard |
| COV-002 | MUST make GR-13 traceability count only test names in `tests/*.test.js` (for e2e/node levels) and `scripts/guard.js`, `eslint.config.js`, `.github/workflows/ci.yml` (for guard/lint/CI levels). `scripts/mutants.json` and code comments no longer count | GRH-041 and GRH-042 are then traced through the SET-2 and DIAG-1 test names, which get those IDs added | guard |
| COV-003 | MUST turn every surviving probe (P02–P07, P09–P11, P13–P25, P27, P29–P33, P35–P42) and the three lint-masked ones (P01, P26, P28, rewritten so they no longer leave a variable unused) into permanent mutants in `scripts/mutants.json`, each with `killedBy` set and `spec` set to the requirement ID | `npm run mutate` kills all of them (29 existing + 39 new = 68) | node |
| COV-004 | MUST add a clipboard stub to `tests/helpers/meet.js` that records `navigator.clipboard.writeText` calls and can be told to reject, so copy behaviour can be tested | COPY-001…006 tests use it | e2e |
| COV-005 | MUST keep the full `npm test` run under 60 s on CI (GRH-063), using the fake clock for every timing requirement (toast 2.2 s, re-sync 8 s, first sync 4 s) | CI prints the duration under 60 s | CI |
| COV-006 | MUST update the coverage map in `docs/GUARDRAILS.md` §3 so it lists requirement IDs per feature, and list the nine specs in `docs/PROJECT_NOTES.md` | Docs reviewed | review |
| COV-007 | SHOULD add a short manual checklist for a real Meet call (`docs/QA_CHECKLIST.md`, planned): sync in a call with more than 15 people, open Chat during a sync, Alt+S in chat, Diagnose, copy to chat. Mock pages can't prove Meet's real DOM | Checklist exists and is linked from `docs/CLAUDE.md` "Releasing" | manual |

## Edge cases
- A requirement covered by an existing test: the test's name gains the ID; its assertions are not loosened (GR-8).
- Tests that need real timing use the fake clock; no `waitForTimeout` (GRH-060).

## Safety / privacy notes
Test-only work, plus a guard change. `extension/` doesn't change, so no product commit is needed. All test, mutant and guard edits are to protected files: this spec is the approval for them; the relock happens once at the end.

## Implementation order
1. Approve the ten Draft specs (this one plus the nine feature specs) together.
2. COV-002 first (stricter guard). It turns the missing traces red.
3. COV-004 clipboard stub, then tests per spec: sync.md first (SYNC-103 is the highest-value test), then speakers, launcher, copy, bingo, icebreakers, this-or-that, roster, diagnose.
4. COV-003 mutants; `npm run mutate` must report 68/68.
5. COV-006/007 docs; mark all ten specs Implemented.

## Open questions
1. Approve all ten specs together, or feature by feature? *Proposal: together; it's one test-only change.*
2. The open questions in the feature specs (Clear all removing manual names, random repeats, the 8 s gap, same-name merging, aria-live) are kept as **current behaviour** unless you decide otherwise.

## Changelog
- 2026-10-04 v1: Draft, from the coverage audit.
