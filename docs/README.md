# Meet Spark

A Chrome extension that makes long Google Meet calls more engaging. It adds icebreakers, "This or That" prompts, Meeting Bingo and a speaker picker. The content is written for Indian teams.

## Load it in Chrome
1. Open `chrome://extensions` and turn on **Developer mode**.
2. Click **Load unpacked** and select the `extension/` folder.
3. Join a Meet call, then click **Spark** (bottom-right) or press **Alt+S**.

After you change any code, click ↻ on the extension card, then **refresh the Meet tab**.

## Develop
```bash
npm run setup     # one time: installs Playwright + Chromium
npm test          # runs the mock-Meet browser tests
npm run package   # builds dist/meet-spark-<version>.zip
```

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
