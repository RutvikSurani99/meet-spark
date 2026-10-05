# Trusted Types fallback console message — Spec
ID prefix: TTC · Status: **Approved** (2026-10-05, Rutvik) · Version: 1 · Owner: Rutvik Bharat
Bug fix. Related: `docs/specs/launcher-and-panel.md` (LAUNCH-009, GR-3).

## Problem / goal
`npm run verify` fails on this Mac, which blocks the pre-push hook and the first push to GitHub. Six browser tests fail: TT-2, PSTY-024 (strict CSP), VARIANT-A-aria, VARIANT-A-text, VARIANT-B-aria and VARIANT-B-text.

**Steps to reproduce:** `npm run verify` with Playwright 1.63.0, which uses Chromium build 1243. Any test that serves the page with `require-trusted-types-for 'script'; trusted-types goog#html` fails.

**Expected:** under the strictest CSP, Spark can't create its policy, falls back to `buildDOM()`, and the test sees no unexpected console errors (LAUNCH-009).

**Actual:** Spark behaves correctly: it renders, works and falls back. But Chromium logs the blocked `trustedTypes.createPolicy()` call with new wording:
- old: `Refused to create a TrustedTypePolicy named 'meet-spark-…' because it violates …`
- new: `Creating a TrustedTypePolicy named 'meet-spark-…' violates the following Content Security policy directive: …`

The test helper (`tests/helpers/meet.js`, `TT_FALLBACK`) deliberately ignores this expected browser message, but its pattern only matches the old wording. So the message is counted as an error.

**Root cause:** the test allowlist doesn't recognise the new Chromium wording. Spark's own code has no bug.

**How bad it is in a live call:** cosmetic. At most, the user sees one browser console line, the same message older Chrome versions already logged in other words. Nothing is broken and the user sees no difference. The real cost is that the verify gate is red, so nothing can be pushed or packaged.

**Can Spark detect the block before calling `createPolicy`?** No, not reliably. The page doesn't expose its allowed policy names: Meet sends the CSP as a response header, which a content script can't read, and the `trustedTypes` API has no "is this name allowed?" check. Any attempt to create the policy logs the same violation. So the original idea ("detect the policy isn't allowed before creating it") can't be built as stated. The choice between the remaining approaches is open question 1.

## Non-goals
- Changing how Spark renders under Trusted Types (`setHTML()` / `buildDOM()` stay as they are), unless open question 1 picks option C.
- Silencing genuine page errors or other CSP violations.
- Pinning or downgrading Playwright/Chromium.

## Behaviour
| ID | Requirement (MUST/SHOULD) | Acceptance criteria (Given/When/Then) | Test level |
|----|---------------------------|----------------------------------------|------------|
| TTC-001 | The browser-test error collector MUST ignore Chromium's "policy blocked" console message in **both** known wordings, but only when the policy name starts with `meet-spark-` | Given the CSP `require-trusted-types-for 'script'; trusted-types goog#html`, when Spark loads on Chromium 1243, then `errors` is `[]`. TT-2, PSTY-024 (strict CSP) and VARIANT-A/B pass again | e2e (TT-2, PSTY-024, VARIANT-*) |
| TTC-002 | The collector MUST still report a blocked-policy message for any other policy name, and any other console error | Given a page that also tries to create a policy named `other-policy` under the strict CSP, when it loads, then `errors` contains that violation message (in either wording) | e2e · new test `TTC-002` in a new file `tests/tt-console.test.js` |
| TTC-003 | Under both CSPs, Spark MUST keep rendering and working exactly as LAUNCH-009 describes (nothing in `extension/` changes) | TT-1 and TT-2 pass. The `content.js` diff for this fix is empty | e2e (TT-1, TT-2) · review |
| TTC-004 | `npm run verify` and `npm run mutate` MUST pass on the Chromium build installed by the locked Playwright version (1.63.0), so the pre-push hook allows the push | Given a clean checkout after `npm run setup`, when `git push` runs, then the hook passes | process |

## UI: states, copy, accessibility
None. No visible change.

## Edge cases
- Chromium may reword the message again. The pattern should key on the stable parts (`TrustedTypePolicy named 'meet-spark-`) instead of the leading verb, so it covers both wordings without matching other names.
- The pattern must not match a violation for Meet's own `goog#html` or any non-Spark name (TTC-002 checks this).
- The other expected message (`requires 'TrustedHTML' assignment`) still matches as before and doesn't change.

## Safety / privacy notes
- No new clicks into Meet. No new data leaves the page. Nothing in `extension/` changes.
- This edits **protected files**: `tests/helpers/meet.js` (the `TT_FALLBACK` pattern), `scripts/guardrails.json` (`requiredTests` += `TTC-002`) and `scripts/mutants.json` (new mutant). All three need your approval, and you run `node scripts/guard.js --relock` afterwards.
- Making the pattern broader is a weakening only if it hides real errors. TTC-002 exists to prove it doesn't.

## Mutant (re-introduces the bug)
`M-TTC-1` (spec TTC-001): in `tests/helpers/meet.js`, restore the old pattern that only matches `Refused to create a TrustedTypePolicy named 'meet-spark-`. Expected killed by `trusted-types.test.js` (TT-2). A second mutant, `M-TTC-2` (spec TTC-002), loosens the name check to `TrustedTypePolicy named '` and should be killed by `tt-console.test.js`.

## Decisions (were open questions)
1. Approach **A**: fix the test allowlist only. B and C are rejected, so `extension/` doesn't change.
2. No separate proof run on the old Chromium build 1228.
3. Add a note to `docs/QA_CHECKLIST.md`: in a real call, the only Spark-related console line allowed is the known blocked-policy message.

## Changelog
- 2026-10-05 v1: Draft. Root cause found: Chromium 1243 changed the wording of the blocked-policy console message. The test allowlist only knew the old wording.
- 2026-10-05 v1: Approved by Rutvik (option A, recommended answers to all open questions).
