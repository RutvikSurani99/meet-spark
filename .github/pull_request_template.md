<!-- PROTECTED FILE — Definition of Done (docs/CLAUDE.md, docs/ENGINEERING_PLAN.md §7.4) -->
## Spec
Spec file: `docs/specs/<name>.md` · Requirement IDs: <!-- e.g. SAFE-001, SYNC-002 -->

## Checklist
- [ ] The spec was written first, approved, and committed with `Status: Approved` **before** the code (GR-14)
- [ ] Every requirement ID has a test whose name contains the ID, and the test failed before the fix
- [ ] Every bug fix adds a mutant to `scripts/mutants.json` that re-introduces the bug (GRH-053)
- [ ] `npm run verify` is green locally; `npm run mutate` kills every mutant
- [ ] Any new click into Meet goes through `safeClick()` and has a trap-page test in `tests/safety.test.js`
- [ ] No new permissions or hosts (or an ADR justifies them)
- [ ] Checked in a real Meet call if detection or sync changed (date: )
- [ ] `docs/PROJECT_NOTES.md` and `docs/CHANGELOG.md` updated; spec `Status: Implemented` once shipped
- [ ] If a protected guardrail file changed: reason stated here, `node scripts/guard.js --relock` run, label `guardrail-change` added
