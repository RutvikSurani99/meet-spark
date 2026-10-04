// Remove / Clear all vs passive scans and manual sync (GR-8). Uses a fake clock: no real waiting.
const assert = require("assert");
const { chromium } = require("playwright");
const { openMeet, tick, click, names, addName, ui, assertOnlySafeClicks, suite } = require("./helpers/meet");

const { test, run } = suite("remove-clear-sync");
let browser;

const row = (n) => `<div class="r"><img src="https://lh3.googleusercontent.com/a/x" width="32" height="32"><div><div>${n}</div><div>Meeting host</div></div></div>`;
const body = `<body style="background:#202124"><button aria-label="Leave call">call_end</button>
  <button aria-label="Let participants send messages" data-trap="1">x</button>
  <section id="pp" style="background:#fff;width:300px"><h2>People</h2><div>In the meeting</div>
  ${["Rutvik Bharat (You)", "Asha Rao", "Vikram Singh", "Priya Nair"].map(row).join("")}</section></body>`;

test("RCS-1 removed names stay removed on passive scans; Clear all empties; a manual sync restores [SYNC-101, SYNC-107, ROSTER-102, ROSTER-105, SPK-008]", async () => {
  const { page, errors, close } = await openMeet({ browser, clock: true, body });
  await tick(page, 3000);
  assert.deepStrictEqual(await names(page), ["Asha Rao", "Priya Nair", "Rutvik Bharat", "Vikram Singh"], "passive scan");

  // Vikram leaves, then the user taps sync
  await page.evaluate(() => document.querySelectorAll(".r")[2].remove());
  await click(page, "#launcher"); await click(page, ".nav [data-v=people]"); await click(page, "#syncBtn");
  await tick(page, 500);
  assert.deepStrictEqual(await names(page), ["Asha Rao", "Priya Nair", "Rutvik Bharat"]);

  await addName(page, "Guest One");
  await ui(page, (r) => r.querySelector('.person[data-n="Asha Rao"] .rm').click());
  await tick(page, 3000);
  assert.deepStrictEqual(await names(page), ["Guest One", "Priya Nair", "Rutvik Bharat"], "removed name came back on a passive scan");

  await click(page, "#clearAll");
  await tick(page, 200);
  assert.deepStrictEqual(await names(page), []);
  await tick(page, 3000);
  assert.deepStrictEqual(await names(page), [], "cleared names came back on a passive scan");

  await click(page, "#syncBtn");
  await tick(page, 300);
  assert.deepStrictEqual(await names(page), ["Asha Rao", "Priya Nair", "Rutvik Bharat"]);
  await assertOnlySafeClicks(page);
  assert.deepStrictEqual(errors, []);
  await close();
});

(async () => {
  browser = await chromium.launch();
  try { await run(); } finally { await browser.close(); }
})();
