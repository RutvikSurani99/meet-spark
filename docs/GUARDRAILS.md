# Meet Spark — Guardrails

**Status:** Active from v2.5.0 (Layer 0: current JavaScript codebase)
**Owner:** Rutvik Bharat
**Last updated:** 2026-10-01

Guardrails are automatic checks that stop a change, whether a person or Claude made it, from breaking an existing feature or a safety rule. Every guardrail runs on its own; nobody has to remember to run it. If a guardrail blocks a change, fix the change. **Never weaken the guardrail to make a change pass.** If a guardrail itself is wrong, propose the change in an ADR (`docs/adr/`) and get approval first.

> This is the guardrail set for today's plain-JS code. After the WXT + React migration (see `ENGINEERING_PLAN.md` §4), the same rules carry over into TypeScript lint rules and Vitest/Playwright suites.

---

## 1. How changes are protected

```
 edit ──► Claude Code hook (lint + guard after every edit)
      ──► git pre-commit  (check · lint · guard · content policy)
      ──► git pre-push    (npm run verify: everything, including browser tests)
      ──► GitHub CI       (npm run verify on every PR and every push to main)
      ──► branch protection on main (CI must pass; no direct pushes)
```

One command runs everything:

```bash
npm run verify      # check + lint + guard + all tests
```

---

## 2. Guardrail catalogue

| ID | Guardrail | What it stops | Enforced by |
|---|---|---|---|
| **GR-1** | Git baseline and rollback | Losing working code; changes nobody can review | Tag `v2.5.0-baseline`. Every change is a commit on a branch, so `git diff` and `git revert` always work |
| **GR-2** | **No unsafe clicks into Meet** | Toggling a host setting, muting or removing someone in a live call | ESLint bans `.click()` and `dispatchEvent()` in `extension/`. The 3 existing clicks are listed in the suppression ledger (GR-4). `tests/safety.test.js` confirms that unsafe controls are never clicked. `npm run guard` checks that `UNSAFE_LABEL` still contains all 15 required words |
| **GR-3** | **Trusted Types safe rendering** | The UI failing to render inside Meet (TT throws) and HTML-injection bugs | ESLint bans `innerHTML`/`outerHTML` assignment, `insertAdjacentHTML`, `DOMParser`, `document.write`, `eval`, `new Function` and string `setTimeout`. `tests/trusted-types.test.js` runs under a strict CSP. `tests/features.test.js` checks that a name like `<img onerror>` is shown as plain text |
| **GR-4** | **Suppression ledger** | Silencing a lint rule to sneak a violation through | Every `eslint-disable` in `extension/` must match an entry in `scripts/guardrails.json` (same rule, same reason tag). File-wide `/* eslint-disable */` is forbidden. Lint fails on unused disables |
| **GR-5** | **Privacy: no network** | Sending participant names or meeting data anywhere | ESLint bans `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource` and `navigator.sendBeacon` in `extension/` |
| **GR-6** | **Manifest lock** | Extra permissions, extra sites, background code, mismatched versions | `npm run guard`: MV3 only · runs only on `https://meet.google.com/*` · permissions limited to the allowlist (`storage`) · no `host_permissions`, background, `externally_connectable` or web-accessible resources · `manifest.json` version equals `package.json` version |
| **GR-7** | **Content policy** | Offensive or off-brand prompts | `tests/content-policy.test.js`: denylist (religion, politics, caste, region-vs-region), no duplicates, length limits, required counts (≥ 24 Bingo items so a card can be filled, every category non-empty) |
| **GR-8** | **Feature regression suite** | A change quietly breaking a feature that already works | `tests/features.test.js` plus the 4 sync/detection tests. See the coverage map in §3 |
| **GR-9** | **Docs location and docs first** | Docs scattered around the repo; code changed without its docs | `npm run guard` fails if any `.md` exists outside `docs/` (except the root `CLAUDE.md` stub). The docs-first workflow is mandatory in `docs/CLAUDE.md` |
| **GR-10** | **Protected guardrail files** | Claude editing a guardrail to get a change through | Claude Code asks you before editing any file in §4 (`.claude/settings.json`). `docs/CLAUDE.md` forbids weakening guardrails |
| **GR-11** | **Single verify gate** | "It works on my machine" | `npm run verify` locally, in the pre-push hook and in CI. All three run the same command |

---

## 3. Feature coverage map (GR-8)

Every shipped feature has at least one automated test. **A new feature is not done until it has a row here and a test.**

| Feature | Behaviour locked by tests | Test file |
|---|---|---|
| Launcher and panel | Mounts exactly once · launcher opens and closes the panel · Close button · **Alt+S** toggles | `features.test.js` |
| Tabs | Each tab shows its view · last tab is remembered (`meetSpark:tab`) | `features.test.js` |
| Icebreakers | 4 categories · questions come from the selected category · no repeats until the deck is used up · counter `Warm-up · n of 10` · **Ask** addresses an active participant | `features.test.js` |
| This or that | Shows a real pair · no repeats across the full deck (18) | `features.test.js` |
| Bingo | 25 cells, centre FREE, 24 unique items · marking a cell · a 5-in-a-row is scored as a line · card survives a reload · **New card** resets | `features.test.js` |
| Speakers: names | Add by button and Enter · sorted list · count badge · remove · exclude · names persist per meeting (`meetSpark:manual:<code>`) · HTML in names is shown as text | `features.test.js` |
| Speakers: picking | "Everyone once" picks each active person once, then starts a new round · excluded people are never picked · **Pick** animation finishes on a real name · **Reset** | `features.test.js` |
| Auto-sync setting | The switch toggles and persists `meetSpark:autoSync` | `features.test.js` |
| Roster sync | Full sync reads the People panel, closes it again, and picks up joiners | `roster-sync.test.js` |
| Remove / clear vs sync | Removed names stay removed on passive scans; a manual sync restores them | `remove-clear-sync.test.js` |
| Meet markup variants | Detection works across known button and list shapes, under Trusted Types | `markup-variants.test.js` |
| Trusted Types | Renders under both strict CSP variants with no errors | `trusted-types.test.js` |
| Safety | Unsafe Meet controls are never clicked · Diagnose finds no People button on an unsafe-only page | `safety.test.js` |
| Content | Policy, counts and duplicates | `content-policy.test.js` |

---

## 4. Protected files

Changing these files changes the guardrails themselves. Claude Code always asks for approval before editing them, and a change to any of them needs a stated reason in the commit message.

- `eslint.config.js`
- `scripts/guard.js`, `scripts/guardrails.json`
- `tests/safety.test.js`, `tests/content-policy.test.js`, `tests/features.test.js`
- `.githooks/*`, `.github/workflows/*`, `.claude/settings.json`

You can add new tests freely. **Deleting or loosening an existing assertion requires your explicit approval.**

---

## 5. Known issues the guardrails are tracking

| ID | Issue | Status |
|---|---|---|
| **F1** | `fullSync()` clicks every `[aria-expanded="false"]` element near the participant list without `safeCandidate()` | Recorded in the ledger as `KNOWN-F1`. **Phase 0 fix**: route it through `safeCandidate()`, add a safety test, then delete the ledger entry. `npm run guard` prints a warning until it's fixed |
| F2 | The roster expiry comment says 3 min, the code uses 90 s | Waiting on your decision |

---

## 6. How to…

**Add a new click into Meet's page.** Update the spec first. Add a test in `tests/safety.test.js` proving the click can't hit an unsafe control. Add a `// eslint-disable-next-line no-restricted-syntax -- G1-REVIEWED: <why>` comment and a matching ledger entry in `scripts/guardrails.json`. Both files are protected, so this needs your approval.

**Add a new feature.** Write the spec in `docs/specs/`, add a row to §3, write the test (it should fail first), then write the code and run `npm run verify`.

**Change content.** Edit the arrays in `content.js` and run `npm test`. The content-policy test checks the new items.

**Bump the version.** Change `package.json` and `extension/manifest.json` together. `npm run guard` fails if they differ.

---

## 7. Background: why GR-2 exists

An early version matched a control labelled "Let participants send messages" while looking for the People button, and toggled that host setting during a live call. Since then, every click into Meet goes through `safeCandidate()`, `UNSAFE_LABEL` must stay strict, switches and checkboxes are never clicked, and every click needs a safety test.
