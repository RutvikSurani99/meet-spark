# Guardrails hardening (Layer 0.5) — Spec
ID prefix: GRH · Status: **Implemented** (2026-10-04; GRH-002 GitHub setup is still a manual step) · Approved 2026-10-04 by Rutvik · Version: 1 · Owner: Rutvik Bharat
Related: `docs/GUARDRAILS.md`, `docs/ENGINEERING_PLAN.md` §4–5, audit of 2026-10-04

## Problem / goal
On 2026-10-04 we planted 7 realistic "AI mistakes" in `extension/content.js` and ran `npm run verify`. **Only 1 of the 7 was caught.**

| # | Mistake planted | Caught? | Why it slipped through |
|---|---|---|---|
| M1 | Removed the Bingo diagonal lines | No | BINGO-2 only scores the top row |
| M2 | Auto-sync still runs when it is switched OFF | No | SET-1 only checks the setting is saved, not what it does |
| M3 | Participant expiry changed from 90 s to 5 s | **Yes** | `roster-sync.test.js` |
| M4 | Removed the `aria-checked` check from `safeCandidate()` | No | The safety page has no `aria-checked` control |
| M5 | `safeCandidate()` ignores `UNSAFE_LABEL` | No | The unsafe button in the safety test is never offered to `peopleButton()` |
| M6 | Diagnose stops masking names | No | No test checks the masking |
| M7 | Switches clicked via `HTMLElement.prototype.click.call(el)` | No | Lint only bans the `x.click()` call form |

The gate can also be switched off **without touching a protected file**: edit the `test` script in `package.json`, skip a file in `tests/run.js`, or loosen one of the four unprotected test files. Two guardrails were written but never switched on: `.claude/settings.json` and `.github/workflows/ci.yml` are still in `Claude outputs/`, and there is no GitHub remote yet.

**Goal:** after this spec is done, a change from any AI (or from a person) that breaks a shipped feature or a safety rule fails `npm run verify`, the pre-push hook or CI. All seven mistakes M1–M7 must be caught, and the gate itself must be tamper-evident.

## Non-goals
- Fixing the bugs in the code itself (F1, F2, N1–N7). Those are in `docs/specs/v2.5.1-fixes.md`, which is done **after** this spec.
- The WXT + React + TypeScript migration (Phase 2+). These guardrails carry over to it.
- Coverage percentages (`content.js` is one IIFE, so line coverage isn't meaningful yet).

## Behaviour

### A. Turn on what already exists
| ID | Requirement | Acceptance criteria | Test level |
|----|---|---|---|
| GRH-001 | MUST install `Claude outputs/settings.json` as `.claude/settings.json` and `Claude outputs/ci.yml` as `.github/workflows/ci.yml`, then delete `Claude outputs/` | Given a fresh clone, when Claude Code tries to edit a protected file, then it asks first. `npm run guard` fails if either file is missing | guard |
| GRH-002 | MUST push the repo to GitHub with `main` as the default branch, protected: PR required, the `verify` check required, no force-push, linear history | Given a direct push to `main`, then GitHub rejects it. Given a PR with a failing `verify`, then it can't be merged | manual (once) |
| GRH-003 | MUST add `Bash(git -c core.hooksPath*)`, `Bash(git -c core.hookspath*)` and `Bash(HUSKY=0*)` to the `deny` list (hooks can be skipped with `git -c`, not just `git config`) | Deny list contains the patterns; guard checks for them | guard |

### B. Protect the gate itself
| ID | Requirement | Acceptance criteria | Test level |
|----|---|---|---|
| GRH-010 | MUST add these to the protected list (GUARDRAILS §4 and the `ask` rules in `.claude/settings.json`): `package.json`, `tests/run.js`, `tests/helpers/**`, `tests/roster-sync.test.js`, `tests/remove-clear-sync.test.js`, `tests/markup-variants.test.js`, `tests/trusted-types.test.js`, `scripts/mutants.json` | Given Claude Code edits any of them, then it asks for approval | guard (checks the settings file lists them) |
| GRH-011 | MUST lock the gate commands. `scripts/guardrails.json` stores the exact `check`, `lint`, `guard`, `test` and `verify` scripts, and guard fails if `package.json` differs | Given `"test": "echo ok"`, when guard runs, then it fails with `GR-11: verify script changed` | guard |
| GRH-012 | MUST lock the test inventory. `scripts/guardrails.json` lists every required test file and every test ID (LAUNCH-1 … SET-1, plus the ones added by this spec). Guard fails if a file is missing or an ID no longer appears in a test name | Given ICE-2 is deleted or renamed, then guard fails with `GR-8: test ID ICE-2 missing` | guard |
| GRH-013 | MUST make `tests/run.js` print the number of tests that passed per file and fail if a file passes with 0 tests or exits without its final `PASS` line | Given a test file whose body is commented out, then the run fails | e2e (self-test) |
| GRH-014 | MUST add a protected-file fingerprint. `scripts/guardrails.lock.json` holds a SHA-256 for every protected file. Guard fails on a mismatch with `GR-10: <file> changed — needs approval`. Updating the lock is a deliberate step (`npm run guard -- --relock`) whose diff shows up in review | Given a one-character edit to `tests/safety.test.js`, then guard fails until relocked | guard |
| GRH-015 | SHOULD make CI fail a PR that changes `scripts/guardrails.lock.json` unless the PR has the `guardrail-change` label | A PR touching the lock without the label → CI red | CI |

### C. Close the lint loopholes (GR-2, GR-3, GR-5)
| ID | Requirement | Acceptance criteria | Test level |
|----|---|---|---|
| GRH-020 | MUST ban *any reference* to `click` / `dispatchEvent` (not just calls), including computed access: `MemberExpression[property.name=/^(click\|dispatchEvent)$/]` and `MemberExpression[computed=true][property.value=/^(click\|dispatchEvent\|innerHTML\|outerHTML)$/]` | Each line in the fixture below is a lint error | lint (fixture) |
| GRH-021 | MUST ban network through other routes: `globalThis.*` / `self.*` / `window.*` for `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`; `new Image()`; `window.open`; assigning to `location` / `location.href`; dynamic `import()`; `Reflect.apply` / `Reflect.set` | Each line in the fixture is a lint error | lint (fixture) |
| GRH-022 | MUST ban obfuscated Meet selectors: any string literal in `extension/` containing `jsname=`, `jscontroller`, `jsaction` or a class selector that looks generated (`/\.[A-Za-z]{5,7}\b(?![-_])/` inside `querySelector` arguments) | `[jsname="CQylAd"]` in `leaveButton()` becomes a lint error (fixed in the fixes spec, DETECT-001) | lint |
| GRH-023 | MUST keep a lint self-test. `tests/lint-bypass.test.js` writes the snippets below to a temp file inside `extension/`, runs ESLint and asserts **every** line is reported | Removing any of the rules above makes this test fail | node test |

Lint fixture (each line must be reported):
```js
el.click(); el["click"](); HTMLElement.prototype.click.call(el); const c = el.click;
el.dispatchEvent(e); el["innerHTML"] = s; globalThis.fetch(u); self.fetch(u); window.fetch(u);
new Image().src = u; window.open(u); location.href = u; import(u); Reflect.apply(f, el, []);
document.querySelector('[jsname="CQylAd"]');
```

### D. A safety net that watches every click (GR-2)
| ID | Requirement | Acceptance criteria | Test level |
|----|---|---|---|
| GRH-030 | MUST add a **click recorder** to `tests/helpers/meet.js`. Before the extension loads, a capture-phase listener on `document` records every trusted *and* synthetic click on Meet's DOM (outside `#meet-spark-host`) with its label. Every browser test ends with `assertOnlySafeClicks(page)`: every recorded click must be on an element that passes the People-button allowlist (label matches `PEOPLE_LABEL` or `data-panel-id="1"`, with no `role=switch/checkbox/menuitemcheckbox`, `aria-checked` or `aria-pressed`) | Mistake M7 makes every sync test fail | e2e (all) |
| GRH-031 | MUST add a **trap page** fixture `tests/fixtures/trap.html` containing at least: "Let participants send messages" (switch), "Turn on captions", "Mute all", "Remove from meeting", "Admit all", "Lock meeting", "Host controls", "Chat with everyone", "Meeting settings", "More options", an `aria-checked` checkbox, an `aria-pressed` toggle, and `[aria-expanded="false"]` controls *inside* the People list. Each also carries `data-panel-id="1"` or a People-like label/icon in some variant | Given the trap page, when Spark auto-syncs, manual-syncs and runs Diagnose, then the trap click counter is 0 | e2e |
| GRH-032 | MUST add a table-driven People-button test `SAFE-TABLE`: 30+ rows of `{ markup, expected: "people" \| null }` run through Diagnose's `peopleButton` field (the only public window onto `peopleButton()`) | M4 and M5 each fail at least one row | e2e |
| GRH-033 | MUST keep `tests/safety.test.js` as the home for GRH-031/032. The current 4-button check stays, and every assertion counts clicks on **every** unsafe control, not just one | — | e2e |

### E. Cover the features that have no tests yet (GR-8)
Each new test locks **current, correct** behaviour, so it passes on today's code. Tests for bugs go in the fixes spec.
| ID | Requirement | Acceptance criteria | Test level |
|----|---|---|---|
| GRH-040 | BINGO-3: all 12 lines score (5 rows, 5 columns, 2 diagonals), and the FREE centre counts toward its row, column and both diagonals | Given a new card, when each line is marked in turn, then the score shows `1 line` and those 5 cells get `.win`. M1 fails this | e2e |
| GRH-041 | SET-2: with auto-sync OFF, a headcount change never clicks the People button. With it ON, it does | Uses the click recorder; M2 fails this | e2e |
| GRH-042 | DIAG-1: the Diagnose report contains none of the participant names on the page (including inside labels such as "Pin Asha Rao" … see fixes spec DIAG-001) and keeps its documented fields | M6 fails this. The "names inside labels" part is marked `expected-fail` until DIAG-001 lands | e2e |
| GRH-043 | ROSTER-EXP: a passively seen name expires after the agreed window (F2) and not before | Uses Playwright `page.clock` to jump time; no real waiting | e2e |
| GRH-044 | SPK-7: excluded and dismissed names are never picked by **Pick** (not only by Ask) | 50 picks with fake timers, none excluded | e2e |

### F. Mutation gate: proof that the guardrails work (new GR-12)
| ID | Requirement | Acceptance criteria | Test level |
|----|---|---|---|
| GRH-050 | MUST add `scripts/mutants.json`, a list of `{ id, file, find, replace, killedBy }`. It starts with M1–M7 above plus: remove the `syncing` guard in `fullSync`; remove the `finally` undo click; make `esc()` return its input unchanged; add `"tabs"` to manifest permissions; add a religious word to an icebreaker | File exists and is protected (GRH-010) | guard |
| GRH-051 | MUST add `npm run mutate` (`scripts/mutate.js`). For each mutant it applies the edit to a temp copy of the repo, runs only the `killedBy` test files plus lint and guard, and expects a failure. It reports `killed n/N` and exits non-zero if any mutant survives | Today: 1/12 killed. After this spec: 12/12 | node |
| GRH-052 | MUST run `npm run mutate` in CI on every PR that touches `extension/`, `tests/` or `scripts/`. Not in pre-push (too slow) | CI job `mutate` is required by branch protection | CI |
| GRH-053 | MUST follow a rule, added to `docs/CLAUDE.md` and `GUARDRAILS.md`: **every bug fix adds a mutant that re-introduces the bug** | Reviewed in the PR checklist | process |

### G. Fast, readable, deterministic tests
| ID | Requirement | Acceptance criteria | Test level |
|----|---|---|---|
| GRH-060 | MUST remove every fixed `waitForTimeout` from the tests. Use `page.clock.install()` + `runFor()` to drive the 2.5 s watcher and sync timers, and `waitForFunction` for DOM state | `grep -r waitForTimeout tests/` returns nothing (guard check) | guard |
| GRH-061 | MUST reformat the five older tests (`safety`, `trusted-types`, `roster-sync`, `remove-clear-sync`, `markup-variants`) into the `test("ID name", …)` style of `features.test.js`, using the shared helpers | Every test has an ID and appears in the GRH-012 inventory | review |
| GRH-062 | MUST NOT write outside `test-results/` (no more screenshots to `/tmp`) | Guard greps tests for absolute output paths | guard |
| GRH-063 | SHOULD keep the full `npm test` under 60 s on CI | CI prints the duration; a warning above 60 s, a failure above 120 s | CI |

### H. Docs an AI can follow
| ID | Requirement | Acceptance criteria | Test level |
|----|---|---|---|
| GRH-070 | MUST make every `docs/...` path mentioned in `docs/CLAUDE.md` and `docs/GUARDRAILS.md` exist. Create `docs/CHANGELOG.md` (Keep a Changelog). Create `docs/specs/` (done: `_TEMPLATE.md`, this file, the fixes spec). `docs/adr/` and `ARCHITECTURE.md` are created in Phase 1; until then, `docs/CLAUDE.md` says "(Phase 1)" next to them | Guard fails on a dangling `docs/` path reference | guard |
| GRH-071 | MUST replace the line-number map in `PROJECT_NOTES.md` with a function-name map (line numbers drift after every edit) | No `| 123–456 |` style rows remain | review |
| GRH-072 | MUST add a spec traceability check, run by guard (`npm run spec:check` lists specs). For every spec with status **Implemented**, every requirement ID whose test level isn't `manual`/`process`/`review` must appear in a test, guard check or CI job. For **Approved** specs, the guard only warns, so the docs-first approval commit can land before the code | Given an Implemented spec with an untested ID, then guard fails. Given an Approved spec, then guard warns with the list of pending IDs | guard |
| GRH-073 | MUST update `GUARDRAILS.md`: add GR-12 (mutation gate), GR-13 (traceability), GR-14 (protected-file lock), GR-15 (click recorder); extend §3 and §4 | Docs reviewed | review |

## Edge cases
- **Protected-file approval loop:** GRH-010 and GRH-014 make several files protected *while this spec is being implemented*. Implement in this order: (1) the docs, (2) new test files, (3) edits to existing protected files in **one** reviewed commit labelled `guardrail-change`, (4) relock.
- **`page.clock` vs. Meet timers:** the clock must be installed before `content.js` is injected, or the 2.5 s interval keeps using real time.
- **The click recorder must not count Spark's own clicks** on its Shadow DOM UI. Ignore events whose `composedPath()` contains `#meet-spark-host`.
- **Mutants that stop matching:** if a refactor removes the `find` text, `mutate` must fail with "mutant M? no longer applies — update it" rather than silently passing.

## Safety / privacy notes
- The click recorder is test-only code in `tests/helpers/`; nothing ships in `extension/`.
- The trap page uses fake names only.

## Decisions (were open questions)
1. **F2:** 90 s (current behaviour). The comment is fixed in v2.5.1 (ROSTER-003).
2. **GRH-002** is a manual step for Rutvik (create the GitHub repo and turn on branch protection). Until then, the pre-commit, commit-msg and pre-push hooks are the gate.
3. `npm run mutate` runs in CI, not in pre-push. You can run it locally any time.

## Implementation order
1. Approve this spec.
2. A → H in order. Section E's tests should pass on today's code; D and F turn red first, then green as lint and helpers improve.
3. Exit criteria: `npm run verify` green, `npm run mutate` reports **12/12 killed**, CI + branch protection live.
4. Then start `docs/specs/v2.5.1-fixes.md`.

## Changelog
- 2026-10-04 v1: Draft, written from the mutation audit.
- 2026-10-04 v1: Approved. Open questions resolved with the defaults above.
- 2026-10-04 v1.1: GRH-072 enforces traceability on Implemented specs and warns on Approved ones (enforcing on Approved would block the docs-first approval commit).
- 2026-10-04 v1.2: Implemented. Notes: GRH-022's class-name check applies to the Meet helpers `q()`/`qa()` only (Spark's own Shadow DOM uses short class names); the mutation gate starts with 26 mutants (M1–M12 plus one per v2.5.1 fix) and found one more gap (M8, fullSync re-entry), which is now covered by SYNC-REENTRY; `isAllowedClick()` allows `aria-pressed` on the People button only (see v2.5.1-fixes SAFE-001).
