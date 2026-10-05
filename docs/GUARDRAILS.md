# Meet Spark — Guardrails

**Status:** Active from v2.5.1 (Layer 0.5: current JavaScript codebase, hardened per `docs/specs/guardrails-hardening.md`)
**Owner:** Rutvik Bharat
**Last updated:** 2026-10-04

Guardrails are automatic checks that stop a change, whether a person or an AI made it, from breaking an existing feature or a safety rule. They run on their own; nobody has to remember to run them. If a guardrail blocks a change, fix the change. **Never weaken the guardrail to make a change pass.** If a guardrail itself is wrong, write a spec (and an ADR (Phase 1)) and get approval first.

> **Proof they work:** `npm run mutate` plants every mistake in `scripts/mutants.json` (unsafe clicks, broken Bingo, leaked names, auto-sync ignoring OFF, extra permissions …) and fails unless each one is caught. On 2026-10-04, before hardening, only 1 of 7 was caught; now every mutant must be killed.

---

## 1. How changes are protected

```
 ask for a bug fix / feature
   └─► spec in docs/specs/ (Draft) ──► your approval ──► commit spec as Approved      (GR-14)
         └─► tests (red) ──► code (green) ──► commit naming the requirement IDs
 edit ──► Claude Code hooks: spec gate before editing extension/ · lint + guard after every edit
      ──► git pre-commit  (check · lint · guard · content policy · lint self-test)
      ──► git commit-msg  (code commits must name an Approved requirement ID)
      ──► git pre-push    (npm run verify: everything, including browser tests)
      ──► GitHub CI       (verify · spec-first check · mutation gate · guardrail-change label)
      ──► branch protection on main (CI must pass; no direct pushes) (manual setup, see §6)
```

One command runs the gate: `npm run verify` (check + lint + guard + all tests). `npm run mutate` proves the gate.

---

## 2. Guardrail catalogue

| ID | Guardrail | What it stops | Enforced by |
|---|---|---|---|
| **GR-1** | Git baseline and rollback | Losing working code | Tag `v2.5.0-baseline`. Every change is a commit on a branch |
| **GR-2** | **No unsafe clicks into Meet** | Toggling a host setting, muting or removing someone in a live call | All clicks go through **`safeClick()`**, the one reviewed click site. ESLint bans every other reference to `.click` / `dispatchEvent` (also `.call`, `["click"]`, `Reflect.apply`). `tests/safety.test.js`: trap page + 30-row People-button table. The click recorder (GR-15) checks every browser test. Guard checks `UNSAFE_LABEL` still matches all 15 words **and their plurals** |
| **GR-3** | **Trusted Types safe rendering** | The UI failing inside Meet; HTML injection | ESLint bans HTML sinks (also computed `["innerHTML"]`). `tests/trusted-types.test.js` under two strict CSPs. SPK-3 shows `<img onerror>` as text |
| **GR-4** | **Suppression ledger** | Silencing a lint rule to sneak a violation through | Every `eslint-disable` in `extension/` must match `scripts/guardrails.json`. File-wide disables are forbidden |
| **GR-5** | **Privacy: no network** | Sending names or meeting data anywhere | ESLint bans `fetch`/XHR/WebSocket/EventSource (also via `globalThis`/`self`/`window`), `sendBeacon`, `new Image()`, `window.open`, `location` writes, `import()`. Diagnose redacts names and the meeting code (DIAG-001) |
| **GR-6** | **Manifest lock** | Extra permissions, sites, background code | `npm run guard`: MV3 · only `https://meet.google.com/*` · permissions ⊆ `storage` · no host/background/web-accessible keys · versions match |
| **GR-7** | **Content policy** | Offensive or off-brand prompts | `tests/content-policy.test.js` |
| **GR-8** | **Feature regression suite + test inventory** | A change quietly breaking or deleting a feature test | The tests in §3. Guard fails if any test file or **test ID** listed in `scripts/guardrails.json` disappears. `tests/run.js` fails a file that runs 0 tests |
| **GR-9** | **Docs location and docs first** | Docs scattered around; dangling references | Guard: `.md` only in `docs/`; every `` `docs/…` `` path mentioned in the docs must exist |
| **GR-10** | **Protected guardrail files** | An AI editing a guardrail to get a change through | `.claude/settings.json` asks before editing any file in §4. **Fingerprints**: `scripts/guardrails.lock.json` holds a SHA-256 per protected file; guard fails on any change until you approve and run `node scripts/guard.js --relock` (Claude Code is denied that command). CI requires the `guardrail-change` label when the lock changes |
| **GR-11** | **Locked single gate** | Turning the gate off (e.g. `"test": "echo ok"`) | Guard checks the `check`/`lint`/`guard`/`test`/`verify`/`mutate`/`spec:check` scripts in `package.json` are exactly as recorded |
| **GR-12** | **Mutation gate** | Guardrails with holes nobody noticed | `npm run mutate` (CI job `mutate`). Every bug fix adds a mutant that re-introduces the bug |
| **GR-13** | **Spec traceability** | Approved requirements that were never tested | Guard: every requirement ID of an **Implemented** spec must appear in a **test name** or a gate script (Approved specs: warning). `mutants.json` and comments don't count |
| **GR-14** | **Spec-first** | Code written before a spec was approved | `commit-msg` hook + CI: a commit touching `extension/` must name a requirement ID from a spec that was **already Approved in an earlier commit**. Claude Code hook: no edits to `extension/` while no spec is Approved |
| **GR-15** | **Click recorder** | A new code path clicking Meet controls | `tests/helpers/meet.js` records every click on Meet's DOM in every browser test; `assertOnlySafeClicks()` allows only the People button and list group headers |
| **GR-16** | **No obfuscated selectors** | Detection breaking when Meet renames internals | ESLint bans `jsname=`/`jscontroller=`/`jsaction=` selectors and generated class names in `q()`/`qa()` |

Test hygiene (GRH-060/062): no fixed sleeps in tests (use the fake clock `tick()`), no writes outside `test-results/`.

---

## 3. Feature coverage map (GR-8)

Every behaviour has a requirement ID in a spec, a test whose **name** carries that ID (GR-13 checks this), and a mutant that proves the test catches its loss (GR-12). **A new feature is not done until it has all three.**

| Feature | Spec | Requirement IDs | Main test files |
|---|---|---|---|
| Launcher, panel, tabs, status, toasts, Trusted Types | `docs/specs/launcher-and-panel.md` | LAUNCH-001…009, KEYS-001 | features, ui-backfill, keys-diag, trusted-types |
| Icebreakers | `docs/specs/icebreakers.md` | ICE-001…007 | features, ui-backfill |
| This or that | `docs/specs/this-or-that.md` | WYR-001…003 | features, ui-backfill |
| Meeting Bingo | `docs/specs/bingo.md` | BINGO-001…008 | features, ui-backfill |
| Speakers: list and picker | `docs/specs/speakers.md` | SPK-001…016 | features, ui-backfill |
| Picker popup and animation styles | `docs/specs/picker-styles.md` | PSTY-001…005, PSTY-010…027, PSTY-030…035 | picker-styles, ui-backfill, features |
| Copy to chat | `docs/specs/copy-to-chat.md` | COPY-001…006 | ui-backfill |
| Auto-sync and manual sync | `docs/specs/sync.md`, `docs/specs/v2.5.1-fixes.md` | SYNC-101…108, SYNC-001…004 | sync-backfill, sync-roster, roster-sync, remove-clear-sync |
| Roster and detection | `docs/specs/roster-and-detection.md`, `docs/specs/v2.5.1-fixes.md` | ROSTER-101…110, ROSTER-001…004, DETECT-001 | sync-backfill, sync-roster, markup-variants, features |
| Safety (clicks into Meet) | `docs/specs/v2.5.1-fixes.md`, `docs/specs/guardrails-hardening.md` | SAFE-001…004, GRH-030…033 | safety (+ click recorder in every browser test) |
| Diagnose | `docs/specs/diagnose.md`, `docs/specs/v2.5.1-fixes.md` | DIAG-101…104, DIAG-001 | ui-backfill, keys-diag, features, safety |
| Content | (GR-7) | CONTENT-1 | content-policy |
| Lint rules | `docs/specs/guardrails-hardening.md` | GRH-020…023 | lint-bypass |

Real-call checks that mocks can't cover: `docs/QA_CHECKLIST.md`.

---|---|---|
| Launcher and panel | Mounts once · launcher/Close/Alt+S toggle · Alt+S ignored while typing, with Ctrl/Cmd/AltGr or key repeat | LAUNCH-1, LAUNCH-2, KEYS-001 |
| Tabs | Each tab shows its view · last tab remembered | TABS-1 |
| Icebreakers | 4 categories · no repeats until the deck is used up · counter · Ask | ICE-1, ICE-2, ICE-3 |
| This or that | Real pairs, no repeats across the deck | WYR-1 |
| Bingo | 25 cells, FREE centre · marking · **all 12 lines** score · persists · New card | BINGO-1, BINGO-2, BINGO-3 |
| Speakers: names | Add/sort/badge/remove/exclude · persisted per meeting · HTML shown as text | SPK-1, SPK-2, SPK-3 |
| Speakers: picking | Everyone once · Pick lands on a real name · never excluded/removed · Reset | SPK-4, SPK-5, SPK-6, SPK-7 |
| Auto-sync setting | Toggles and persists · **OFF really stops syncing** | SET-1, SET-2 |
| Roster sync | Reads the panel, closes it, picks up joiners · complete scans only (40/150 people) · no scan during a sync | SYNC-JOIN, SYNC-UI, SYNC-001, SYNC-002, SYNC-003, SYNC-004 |
| Roster state | Passive expiry 90 s · per-meeting state on meeting change · nothing saved on the home screen · bad stored data | ROSTER-EXP, ROSTER-001, ROSTER-002, ROSTER-003, ROSTER-004 |
| Remove / clear vs sync | Removed names stay removed; a manual sync restores | RCS-1 |
| Meet markup variants | Known button/list shapes under Trusted Types | VARIANT-A-aria, VARIANT-A-text, VARIANT-B-aria, VARIANT-B-text |
| Trusted Types | Renders under both strict CSPs | TT-1, TT-2 |
| Safety | Unsafe-only page · trap page · People-button table · safe group expand · safe undo | SAFETY-1, SAFETY-2, SAFE-TABLE, SAFE-002, SAFE-003 |
| Diagnose | Names, labels and the meeting code redacted | DIAG-1, DIAG-001 |
| Content | Policy, counts, duplicates | CONTENT-1 |
| Lint rules | Every banned pattern still reported; normal code still legal | LINT-1, LINT-2 |

---

## 4. Protected files

Changing these changes the guardrails themselves. Claude Code asks before editing them; the fingerprint lock fails until you approve and relock; a PR needs the `guardrail-change` label.

- `eslint.config.js`, `package.json` (scripts are locked)
- `scripts/guard.js`, `scripts/guardrails.json`, `scripts/guardrails.lock.json`, `scripts/mutate.js`, `scripts/mutants.json`, `scripts/spec-check.js`
- `tests/run.js`, `tests/helpers/*`, every existing `tests/*.test.js`
- `.githooks/*`, `.github/workflows/ci.yml`, `.github/pull_request_template.md`, `.claude/settings.json`

New tests go in **new** test files freely (then add their IDs to `requiredTests`, which needs approval). **Deleting or loosening an existing assertion, or deleting a mutant, requires your explicit approval.**

---

## 5. Known issues the guardrails are tracking

| ID | Issue | Status |
|---|---|---|
| F1 | `fullSync()` clicked every `[aria-expanded="false"]` near the list without `safeCandidate()` | **Fixed in v2.5.1** (SAFE-001, SAFE-002); ledger entry removed |
| F2 | Expiry comment said 3 min, code used 90 s | **Decided: 90 s** (ROSTER-003) |
| F3 | Storage uses Meet-origin `localStorage` | Phase 3 (ADR-0002, Phase 1) |

---

## 6. How to…

**Ask for a new feature or a bug fix (you or an AI).** `npm run spec:new -- <slug> <PREFIX>` → fill in the spec (Status: Draft) → review and approve → commit the spec with `Status: Approved` → write failing tests named with the requirement IDs → add a mutant for each bug → write the code → `npm run verify` and `npm run mutate` → commit with the IDs in the message → set the spec to `Implemented`, update `docs/CHANGELOG.md` and `docs/PROJECT_NOTES.md`.

**Add a new click into Meet's page.** Update the spec first. Call `safeClick(el, reason)`, never `.click()`. Add a trap-page case to `tests/safety.test.js` and, if the new element type is legitimate, teach `isAllowedClick()` in `tests/helpers/meet.js` about it (both protected: needs approval and a relock).

**Change content.** Edit the arrays in `content.js`; `npm test` checks the policy. (Content changes are product changes: they need a spec ID too.)

**Bump the version.** Change `package.json` and `extension/manifest.json` together; guard fails if they differ.

**Approve a change to a protected file.** Review the diff, then run `node scripts/guard.js --relock` yourself and commit the lock file with the change.

**Set up GitHub (one time, manual: GRH-002).** Create the repo, push `main`, then Settings → Branches → protect `main`: require a pull request, require the `verify` and `mutate` checks, block force pushes, require linear history. Create a label named `guardrail-change`.

---

## 7. Background: why GR-2 exists

An early version matched a control labelled "Let participants send messages" while looking for the People button and toggled that host setting during a live call. Since then every click into Meet goes through one function, `UNSAFE_LABEL` must stay strict, switches/checkboxes/`aria-checked`/`aria-pressed` are never clicked, and every click needs a safety test. The 2026-10-04 table test found that `UNSAFE_LABEL` didn't match plurals ("Meeting **options**"), fixed in SAFE-004.
