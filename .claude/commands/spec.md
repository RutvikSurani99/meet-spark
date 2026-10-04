---
description: Start a bug fix or feature the spec-first way. Writes or updates a Draft spec in docs/specs/ and stops for approval. No code.
argument-hint: <describe the bug or feature>
---
You are starting new work on Meet Spark: **$ARGUMENTS**

Follow the spec-first workflow in `docs/CLAUDE.md` (GR-14). In this command you only write the spec. **Do not edit tests or anything in `extension/`.**

1. Read `docs/PROJECT_NOTES.md`, `docs/GUARDRAILS.md` and run `npm run spec:check` to see the existing specs. Read the spec(s) that cover this area and the relevant parts of `extension/content.js`.
2. Decide: amend an existing spec (add rows with new IDs, add a changelog line, set Status back to **Draft**) or create a new one with `npm run spec:new -- <kebab-slug> <PREFIX>`.
3. Fill in every section of the template:
   - Problem / goal (for a bug: steps to reproduce, expected vs actual, how bad it is in a live call)
   - Non-goals
   - Behaviour table: one row per requirement, ID `PREFIX-NNN`, MUST/SHOULD, Given/When/Then acceptance criteria, test level (`e2e`, `guard`, `lint`, `node`, or `manual`/`process`/`review` for things a test can't check)
   - UI states and copy, edge cases, safety/privacy notes (any new click into Meet? any data leaving the page?)
   - Open questions: anything you'd otherwise have to guess
   - For bug fixes: describe the mutant that re-introduces the bug (it goes into `scripts/mutants.json` later)
4. Keep `Status: **Draft**`. Run `npm run guard` (Markdown must stay in `docs/`).
5. Reply with: the spec file path, a short summary of each requirement, the open questions, and the question **"Do you approve this spec?"** Then stop. Never mark the spec Approved yourself.
