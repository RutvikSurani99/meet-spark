# Meet Spark

A Chrome extension that makes long Google Meet calls more engaging. It adds icebreakers, "This or That" prompts, Meeting Bingo and a speaker picker. The content is written for Indian teams.

## Load it in Chrome
1. Open `chrome://extensions` and turn on **Developer mode**.
2. Click **Load unpacked** and select the `extension/` folder.
3. Join a Meet call, then click **Spark** (bottom-right) or press **Alt+S**.

After you change any code, click ↻ on the extension card, then **refresh the Meet tab**.

## Develop
```bash
npm run setup     # one time: dependencies, Playwright Chromium, git hooks
npm run verify    # everything: syntax, lint, guardrails, all tests
npm test          # tests only
npm run package   # verify, then build dist/meet-spark-<version>.zip
```
Guardrails run automatically: lint and guard on every commit, full verify on every push and in CI. See `docs/GUARDRAILS.md`.

## Project layout
```
extension/          the extension Chrome loads
  manifest.json     MV3 manifest
  content.js        all logic + UI (Shadow DOM)
  icons/
tests/              Playwright tests against mock Meet pages
scripts/package.sh  builds the zip
CLAUDE.md           notes for Claude Code
```
