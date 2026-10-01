# Meet Spark — Engineering Plan

**Status:** Proposed. Waiting for approval before any code changes.
**Owner:** Rutvik Bharat
**Version:** 2 (2026-10-01)
**Decisions in:** WXT + React + TypeScript · local playground on localhost · GitHub (solo maintainer) · **docs-first** · **all docs in `docs/`**

This plan moves Meet Spark from a working prototype (a single 1,080-line `content.js` and ad-hoc browser tests) to a codebase built to professional standards: typed React components, a fast local dev loop, layered tests, enforced guardrails, written specs and CI. The work happens in small phases, and each phase ends with green CI and a tagged commit.

---

## 0. Working rules

1. **Docs first.** No code change starts until the docs that describe it are updated and approved. The order is always **docs/spec → approval → tests → code → notes/changelog**.
2. **All docs live in `docs/`.** That includes README, CONTRIBUTING, SECURITY, CHANGELOG, specs and ADRs. GitHub recognises `docs/README.md`, `docs/CONTRIBUTING.md` and `docs/SECURITY.md` automatically.
   *One exception:* a 2-line root `CLAUDE.md` stub that imports `docs/CLAUDE.md`. Claude Code only auto-loads instructions from the repo root, so the stub has to stay there.
3. **Guardrails are never weakened to make a change pass.** If a guardrail blocks a change, propose an ADR instead.

---

## 1. Baseline findings (review of v2.5.0)

| # | Finding | Risk | Fix in |
|---|---|---|---|
| F1 | `fullSync()` (line 518) clicks **every** `[aria-expanded="false"]` element near the participant list without running it through `safeCandidate()`. This breaks the "never click unsafe controls" rule. | **High**: it could toggle a Meet control in a live call | Phase 0 |
| F2 | The roster comment says expiry is "3 minutes", but the code uses `90000` ms (90 s). | Medium: we don't know which behaviour is intended | Phase 0, spec ROSTER |
| F3 | `store` writes to `localStorage` on the **meet.google.com origin**. Meet's own scripts can read that data, and clearing site data wipes it. | Medium: privacy and data loss | Phase 3 (move to `browser.storage.local`) |
| F4 | Tests rely on fixed sleeps (8 to 12 s), write screenshots to `/tmp`, and use dense one-line code. They are slow and flaky, and failures are hard to read. | Medium | Phase 4 |
| F5 | There are no unit tests. Pure logic (`cleanName`, `applyScan`, roster rules) can only be tested through a full browser. | Medium | Phase 4 |
| F6 | The version lives in two places (`manifest.json` and `package.json`) with no check that they match. | Low | Phase 2 (WXT generates the manifest from `package.json`) |
| F7 | One file mixes content, DOM adapters, state and UI, so module boundaries can't be enforced. | Medium | Phase 3 |
| F8 | Git has no commits yet, so there is no history to roll back to. | High for any refactor | Phase 0 |
| F9 | The only way to try a change is a real Meet call plus a manual extension reload. | Medium: slow feedback | Phase 2 (playground + hot reload) |

---

## 2. Technology choices

### 2.1 Stack
| Concern | Choice | Why |
|---|---|---|
| Extension framework | **[WXT](https://wxt.dev)** (built on Vite) | Built for MV3 extensions. Generates the manifest, hot-reloads in dev, mounts the UI in a Shadow DOM (`createShadowRootUi`) and zips releases |
| UI | **React 19** + TypeScript (`strict`) | Component model and a large ecosystem. React writes to the DOM directly instead of using `innerHTML`, so it fits Meet's Trusted Types rules |
| Lighter option | Preact via `preact/compat` alias (≈4 KB vs ≈45 KB) | Switch only if the bundle budget (G8) is exceeded. No code changes needed |
| State | React state + a small framework-free roster store in `core/` (subscribed with `useSyncExternalStore`) | Keeps the logic testable without React |
| Styling | CSS Modules or plain CSS imported into the shadow root | Isolated from Meet's styles |
| Storage | `browser.storage.local` via WXT `storage` | Fixes F3 |
| Lint / format | ESLint flat config + typescript-eslint + eslint-plugin-react-hooks + custom restricted rules · Prettier | |
| Unit / component tests | Vitest + `WxtVitest` plugin (fake browser APIs) + happy-dom + React Testing Library | |
| E2E | Playwright, loading the built `.output/chrome-mv3` | |
| Hooks / commits | husky + lint-staged · Conventional Commits + commitlint | |
| CI | GitHub Actions | |

### 2.2 Why not Next.js
Next.js builds server-rendered **websites** with its own routing, pages and server. Meet Spark is a **content script injected into someone else's page** (meet.google.com). It has no routes and no server, it must not take over the page, and it has to load as static files. React is the part of Next.js we actually need, and WXT supplies the extension tooling around it. This is recorded in ADR-0001.

### 2.3 Running locally
| Command | What it does |
|---|---|
| `npm run dev` | WXT starts Chrome with the extension loaded and **hot-reloads on save**. Use it in a real Meet call |
| `npm run playground` | Serves mock Meet pages on `http://localhost:5173` (fake tiles, a People panel with N participants, join/leave buttons, a Trusted Types CSP toggle, markup variants from fixtures). The extension runs there in dev mode, so you can build and test **without joining a call** |
| `npm run build` / `npm run zip` | Production build in `.output/chrome-mv3` and the release zip |
| `npm run verify` | Format check, lint, typecheck, unit tests, build, e2e. Run before every PR |

**Guardrail:** `localhost` appears in `matches` **only in dev mode**. The CI manifest check fails if a production build contains any host other than `https://meet.google.com/*`.

---

## 3. Target architecture

### 3.1 Layers and their dependency rule
```
entrypoints/meet.content  →  ui/ (React)  →  core/
                              ↓
                            meet/  →  core/
                            platform/
```
- **`core/`**: pure TypeScript with **no DOM, React or `browser.*`**. Holds the roster store, name cleaning, the sync decision logic and the content arrays. It is 100% unit-testable.
- **`meet/`**: the only layer allowed to touch Meet's DOM. Holds the selectors, scanners, `diagnose()`, and `safeClick()`, which is the **only** function permitted to call `.click()` on a Meet element.
- **`ui/`**: React components (Launcher, Panel, Tabs: Icebreakers, ThisOrThat, Bingo, Speakers) and hooks.
- **`platform/`**: wrappers for storage, logging and the clock and timers (injectable, so tests can use fake timers).
- **`entrypoints/meet.content/`**: WXT content script that mounts `ui/` in a shadow root and starts the watcher.

`eslint-plugin-boundaries` enforces these rules in CI.

### 3.2 Repository layout (target)
```
meet-spark/
  CLAUDE.md                     stub → @docs/CLAUDE.md (only root .md)
  docs/
    README.md  CONTRIBUTING.md  SECURITY.md  CHANGELOG.md
    CLAUDE.md                   rules for Claude (authoritative)
    PROJECT_NOTES.md            current state + change log
    ENGINEERING_PLAN.md         this file
    ARCHITECTURE.md  GUARDRAILS.md  TESTING.md  LOCAL_DEV.md
    specs/      _TEMPLATE.md, roster.md, sync.md, ...
    adr/        0001-wxt-react-typescript.md, ...
  entrypoints/
    meet.content/  index.tsx     content script (matches meet.google.com; + localhost in dev)
  src/
    core/        roster.ts, names.ts, sync-policy.ts, content/{icebreakers,wyr,bingo}.ts
    meet/        selectors.ts, scan.ts, people-button.ts, safe-click.ts, diagnose.ts
    ui/          App.tsx, Launcher.tsx, Panel.tsx, tabs/*.tsx, hooks/*.ts, styles/*.css
    platform/    storage.ts, log.ts, clock.ts
  playground/    index.html, mock-meet/*.ts   (localhost mock Meet)
  public/icons/
  tests/
    unit/        *.test.ts               (Vitest: core/)
    component/   *.test.tsx              (Vitest + RTL: ui/)
    dom/         *.test.ts               (Vitest + happy-dom: meet/ against fixtures)
    e2e/         *.spec.ts               (Playwright: built extension)
    fixtures/meet-dom/*.html             (from Diagnose reports, names masked)
  .github/       workflows/ci.yml, workflows/release.yml, pull_request_template.md, ISSUE_TEMPLATE/
  wxt.config.ts  package.json  tsconfig.json  eslint.config.js  .prettierrc  vitest.config.ts  playwright.config.ts
```
`extension/` and `scripts/package.sh` are removed after the migration, because WXT replaces them.

---

## 4. Guardrails

Each guardrail is enforced in at least two ways (static + test, or test + runtime).

| Guardrail | Static (lint/type) | Test | Runtime |
|---|---|---|---|
| **G1: No unsafe clicks into Meet** | `no-restricted-syntax` bans `.click()` / `dispatchEvent` everywhere except `src/meet/safe-click.ts` | `e2e/safety.spec.ts` runs a fixture with every known unsafe control (host settings, chat toggle, mute, remove, admit, switches, `aria-checked`) and asserts **zero** clicks. A table-driven `safeCandidate` test covers more than 30 labels | `safeClick()` re-checks `safeCandidate()`, refuses `role=switch\|checkbox\|menuitemcheckbox`, `aria-checked` and `aria-pressed`, logs every click, and can be turned off with a kill switch (`autoSync=false`) |
| **G2: Trusted Types** | Bans `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `DOMParser`, `document.write` and **`dangerouslySetInnerHTML`** | E2E runs under a strict CSP `require-trusted-types-for 'script'` and asserts that no page errors occur | React DOM APIs only |
| **G3: Sync undoes its own clicks** | n/a | Unit: the sync state machine always ends with the panel in the state it started in. E2E: after a sync the panel's open/closed state is unchanged | `try/finally` revert + `syncPaused` |
| **G4: No obfuscated selectors** | Lint rule bans class selectors that look obfuscated inside `meet/selectors.ts`. All selectors live in that one file | Fixture tests cover every known markup variant | n/a |
| **G5: Privacy** | No `fetch`, `XMLHttpRequest`, `WebSocket` or `sendBeacon` in `src/` | Test checks that `diagnose()` masks every name | Manifest permissions are `storage` only, and the only host is `meet.google.com` in production (CI check) |
| **G6: Content policy** | n/a | `unit/content.test.ts` runs a denylist (religion, politics, caste, region-vs-region terms), checks for no duplicates and checks a length limit | n/a |
| **G7: Layer boundaries** | `eslint-plugin-boundaries`: `core` cannot import `meet`, `ui`, React or `browser` | CI | n/a |
| **G8: Bundle budget** | n/a | CI fails if the content script is over 150 KB (React) / 60 KB (Preact) | n/a |
| **G9: Dev-only hosts** | `wxt.config.ts` adds `localhost` only when `mode === 'development'` | CI manifest check on the production build | n/a |
| **G10: Docs first** | n/a | The PR template checklist and a CI check: if a PR touches `src/` or `entrypoints/` without touching `docs/`, it fails unless it carries the `no-docs-needed` label | n/a |

`docs/GUARDRAILS.md` will hold this table, the reason behind each rule (including the story of the "Let participants send messages" incident) and how to add a new click safely.

---

## 5. Test strategy

### 5.1 Pyramid
| Level | Tool | Scope | Target time | Coverage gate |
|---|---|---|---|---|
| Unit | Vitest | `core/`: roster, `cleanName`, sync policy, content checks | < 2 s | **90% lines / 85% branches** |
| Component | Vitest + React Testing Library | `ui/`: tabs render, interactions, accessibility (roles and labels), keyboard (Alt+S) | < 5 s | 80% |
| DOM / contract | Vitest + happy-dom | `meet/` scanners and `peopleButton` against `tests/fixtures/meet-dom/*.html` | < 5 s | 85% |
| E2E | Playwright + built extension | Real Chromium, mocked Meet origin, TT CSP. Covers the golden paths and the safety suite | < 60 s | Every spec criterion tagged `@e2e` has a test |

### 5.2 Rules
- **No fixed sleeps.** Unit and component tests use Vitest fake timers through the injectable `platform/clock`. E2E uses `expect.poll` and `waitFor` instead of `waitForTimeout`.
- **Each test is linked to a spec requirement ID** (e.g. `test('ROSTER-004: dismissed names are not re-added by passive scan')`). `npm run trace` reports any requirement that has no test.
- **Every Diagnose report becomes a fixture.** When Meet's DOM changes, the user pastes the report, a fixture goes into `tests/fixtures/meet-dom/`, and the playground and the DOM tests both use it.
- **Bug fix = failing test first.**
- **The playground and E2E share the mock Meet code** (`playground/mock-meet/`), so what you see locally is what CI tests.
- Test artefacts go to `test-results/`, which is gitignored and uploaded by CI only when a test fails.

### 5.3 Initial test inventory
- **Unit:** `cleanName` (junk words, `(You)`, multi-line names) · roster `remove`/`clear`/`dismissed`/`excluded` · expiry window (F2) · authoritative vs passive scans · sync trigger policy (first sync, headcount mismatch, cooldown) · storage scoped by meeting code · content policy.
- **Component:** Launcher toggle and Alt+S · each tab renders and navigates · Bingo marks cells and detects a win · speaker pick excludes excluded and dismissed names · add/remove/clear names.
- **DOM:** `peopleButton` priority order · `safeCandidate` table · `participantsList` scoring · `scanAvatars` · `diagnose` masking.
- **E2E:** extension mounts on a mock Meet page · full sync opens and closes the panel · sync with no list → paused · join/leave updates the roster · safety suite · Trusted Types CSP · the production manifest has no localhost.

---

## 6. Specs (spec-driven development)

`docs/specs/` holds one Markdown file per feature. **A spec is written and approved before any code for that feature.**

Initial specs (backfilled from current behaviour): `roster.md`, `participant-detection.md`, `sync.md`, `icebreakers.md`, `this-or-that.md`, `bingo.md`, `speaker-picker.md`, `launcher-and-panel.md`, `diagnose.md`, `storage.md`, `playground.md`.

### Spec template (`docs/specs/_TEMPLATE.md`)
```md
# <Feature> — Spec
ID prefix: ROSTER · Status: Draft | Approved | Implemented · Version: 1

## Problem / goal
## Non-goals
## Behaviour
| ID | Requirement (MUST/SHOULD) | Acceptance criteria (Given/When/Then) | Test level |
|----|---------------------------|----------------------------------------|------------|
| ROSTER-001 | ... | Given … When … Then … | unit |
## UI (if any): states, copy, accessibility
## Edge cases
## Safety / privacy notes
## Open questions
## Changelog
```

### Architecture Decision Records (`docs/adr/`)
- ADR-0001: WXT + React + TypeScript (Next.js and vanilla JS considered and rejected)
- ADR-0002: `browser.storage.local` instead of page `localStorage` (F3)
- ADR-0003: Single `safeClick()` choke point for all Meet DOM clicks (F1)
- ADR-0004: Layered architecture and boundary enforcement
- ADR-0005: Test pyramid and spec traceability
- ADR-0006: Docs-first workflow and the docs/-only rule

---

## 7. Process and repository standards

### 7.1 Change workflow (every change, however small)
1. **Docs:** update or add the spec in `docs/specs/` and any affected docs or ADR. Open the PR (or push the commit) as `docs(...)`.
2. **Approve:** you review and approve the docs.
3. **Tests:** write tests that fail, referencing the spec IDs.
4. **Code:** implement until `npm run verify` is green. Check the change in the playground (and in a real Meet call if it touches detection or sync).
5. **Close out:** update `docs/PROJECT_NOTES.md` and `docs/CHANGELOG.md`, then squash-merge.

### 7.2 Git (solo, GitHub)
- `main` is protected: changes go through PRs only, CI must be green, and history stays linear (squash merge).
- Branch names: `feat/…`, `fix/…`, `chore/…`, `docs/…`, `test/…`.
- Commits follow Conventional Commits (`feat(roster): …`) and are checked by commitlint.
- Releases: run `npm version minor`, which creates a tag. The tag runs `release.yml`, which builds, tests and zips the extension and attaches the zip to a GitHub Release.

### 7.3 CI (`.github/workflows/ci.yml`)
1. `npm ci`
2. Format check · lint · typecheck
3. Unit, component and DOM tests with coverage gates
4. `wxt build` · bundle-size check · manifest check (version, permissions, production hosts)
5. Playwright e2e (uploads a trace when a test fails)
6. Spec traceability report · docs-first check (G10)

### 7.4 Definition of Done (copied into the PR template)
- [ ] Docs and spec were updated **first** and approved, and every requirement ID is covered by a test
- [ ] `npm run verify` is green locally and in CI
- [ ] Any new Meet DOM interaction goes through `meet/` and `safeClick()`, with a safety test added
- [ ] No new permissions or hosts, or the new one is justified in an ADR
- [ ] Checked in the playground, and in a real Meet call if detection or sync changed (note the date)
- [ ] `docs/PROJECT_NOTES.md` and `docs/CHANGELOG.md` updated

### 7.5 Docs to create (all in `docs/`)
| File | Purpose |
|---|---|
| `README.md` | What it is, install, develop, test, release |
| `CONTRIBUTING.md` | Setup, the change workflow (§7.1), branch and commit conventions, DoD |
| `LOCAL_DEV.md` | `npm run dev` / `playground`, loading in Chrome, debugging, turning a Diagnose report into a fixture |
| `ARCHITECTURE.md` | Layers, data flow, sync state diagram, component tree |
| `GUARDRAILS.md` | §4 in full |
| `TESTING.md` | §5 in full, plus how to run, debug and write tests |
| `SECURITY.md` | Data handling (names stay on the device, nothing is sent over the network), how to report an issue |
| `CHANGELOG.md` | Keep a Changelog format |
| `CLAUDE.md` | Rules for Claude, kept up to date with the layout and commands |
| `PROJECT_NOTES.md` | Working reference and current state |
| `specs/*`, `adr/*` | See §6 |

---

## 8. Phased roadmap

Each phase starts with a **docs PR**, then the code PRs, and ends with a git tag.

| Phase | Goal | Key deliverables | Exit criteria |
|---|---|---|---|
| **0. Safety net** | Freeze current behaviour and fix the critical risk | Initial commit of v2.5.0 and tag `v2.5.0-baseline` · push to GitHub · spec note + **fix F1** with a safety test · decide on F2 | The existing 5 tests pass, plus the new F1 test |
| **1. Docs and standards** | Write the rules down before any refactor | Every doc in §7.5 (describing current state + target) · ADR 0001–0006 · spec template + backfilled specs · PR/issue templates | Docs reviewed, specs marked Approved |
| **2. WXT scaffold + local dev** | New toolchain and local dev loop, with **behaviour unchanged** | WXT + TS + React setup · port `content.js` into `entrypoints/meet.content` as-is (vanilla UI kept for now) · **playground** on localhost · ESLint/Prettier/husky/commitlint · CI + branch protection | `npm run dev` and `npm run playground` work, CI is green, the old e2e tests pass against the WXT build |
| **3. Modularise + React UI** | Split into layers and port the UI to React | Extract `core/` → `meet/` (with `safeClick`) → `platform/` (move to `browser.storage.local` with a migration, F3) → React components one tab at a time · boundary lint rules · remove `setHTML`/`buildDOM` once nothing uses them | All guardrail lint rules active, bundle under budget, behaviour matches the specs |
| **4. Test pyramid** | Fast, deterministic tests that trace back to specs | Unit, component and DOM suites, fixtures, e2e rewritten with no sleeps, `npm run trace`, coverage gates | Gates met, e2e under 60 s, every spec ID covered |
| **5. Release pipeline** | Repeatable releases | `release.yml`, version and CHANGELOG automation, Chrome Web Store–ready zip, manual QA checklist for a real call | v2.6.0 released through the pipeline |

After Phase 5, every feature follows §7.1: **docs/spec → approve → tests (red) → code (green) → notes/changelog → release.**

---

## 9. Working with Claude on this repo
- Claude reads `docs/CLAUDE.md`, `docs/PROJECT_NOTES.md` and the relevant `docs/specs/*.md` before every change.
- Claude **always proposes the doc and spec update first** and waits for approval before writing tests or code.
- Claude creates documentation only under `docs/`.
- Claude never weakens a guardrail (lint rule, safety test, coverage or bundle gate) to make a change pass. If a guardrail blocks the work, Claude raises it as an ADR proposal.
- Claude runs `npm run verify` before declaring work done, and reports the results.

---

## 10. Open questions
1. **F2:** should passively seen names expire after 90 s (current code) or 3 min (comment)?
2. Is publishing to the Chrome Web Store in scope? (If so: privacy policy, store listing assets, permissions review.)
3. What is the GitHub repo name and visibility (private or public)?
4. Might you want a Firefox version later? (WXT supports it, so it would mainly cost extra test runs.)
5. React or Preact by default? The plan starts with React and switches only if the bundle budget is exceeded.
