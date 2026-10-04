---
description: Implement an APPROVED spec: tests first, mutants, code, verify, mutate, changelog. Refuses Draft specs.
argument-hint: <docs/specs/file.md>
---
Implement the spec **$ARGUMENTS** following `docs/CLAUDE.md` (spec-first workflow, steps 4–9).

1. Open the spec. If its status is not **Approved**, or the user has not approved it in this conversation, stop and ask. Do not proceed on a Draft.
2. If the approval isn't committed yet: set `Status: **Approved** (date, Rutvik)` and commit only the spec: `docs(specs): approve <name>`. Code commits are rejected unless their IDs were already Approved in an earlier commit.
3. Create a branch `fix/<slug>` or `feat/<slug>` if you're on `main`.
4. **Tests first.** For each requirement, write a test whose name contains its ID (fake clock, no sleeps, `assertOnlySafeClicks` for anything that syncs). Run it and confirm it **fails** on the current code. New test files and IDs go into `requiredTests` in `scripts/guardrails.json`. That file is protected, so ask first.
5. **Mutants.** For each bug fixed, add a mutant to `scripts/mutants.json` that re-introduces it (protected: ask).
6. **Code.** Change `extension/` until `npm run verify` is green. Every click into Meet goes through `safeClick()`. Never weaken a guardrail; if one blocks you, stop and explain.
7. Run `npm run mutate`. Every mutant must be KILLED. If one survives, strengthen a test. Never delete the mutant.
8. If protected files changed, tell the user exactly which ones and why, and ask them to review and run `node scripts/guard.js --relock`. You are not allowed to run it.
9. Commit with the requirement IDs in the message, e.g. `fix(sync): … (SYNC-001, SYNC-002)`.
10. Close out: set the spec to `Status: **Implemented**`, add the IDs to `docs/CHANGELOG.md` under `[Unreleased]`, update `docs/PROJECT_NOTES.md` and the coverage map in `docs/GUARDRAILS.md` §3. Run `npm run verify` again and report the output of both gates.
