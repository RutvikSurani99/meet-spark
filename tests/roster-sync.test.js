// Roster sync against a mock Meet People panel (GR-8). Uses a fake clock: no real waiting.
const assert = require("assert");
const { chromium } = require("playwright");
const { openMeet, tick, click, names, assertOnlySafeClicks, suite } = require("./helpers/meet");

const { test, run } = suite("roster-sync");
let browser;

const body = `<body style="margin:0;background:#202124;height:100vh;font-family:Arial">
 <div id="tiles" style="display:flex;gap:8px;padding:20px">
  <div data-participant-id="a" style="width:200px;height:120px"><span class="notranslate">Rutvik Bharat</span><div data-self-name="Rutvik Bharat"></div></div>
  <div data-participant-id="b" style="width:200px;height:120px"><span class="notranslate">Asha Rao</span></div>
 </div>
 <div style="position:fixed;bottom:20px;right:20px"><button data-panel-id="1" aria-label="People">people</button><span id="cnt">5</span></div>
 <div id="side"></div>
 <script>
  window.PEOPLE = ['Rutvik Bharat (You)', 'Asha Rao', 'Vikram Singh', 'Priya Nair', 'Karthik M'];
  document.querySelector('[data-panel-id="1"]').onclick = () => { const s = document.getElementById('side');
    if (s.childElementCount) { s.replaceChildren(); return; }
    s.innerHTML = '<div role="list" aria-label="Participants">' + PEOPLE.map(n => '<div role="listitem" aria-label="' + n + '">' + n + '</div>').join('') + '</div>'; };
 </script></body>`;

test("SYNC-JOIN full sync reads the People panel, closes it again and picks up joiners [SYNC-102, ROSTER-102]", async () => {
  const { page, errors, close } = await openMeet({ browser, clock: true, body });
  await tick(page, 8000); // first automatic sync
  assert.deepStrictEqual(await names(page), ["Asha Rao", "Karthik M", "Priya Nair", "Rutvik Bharat", "Vikram Singh"]);
  assert.strictEqual(await page.evaluate(() => document.getElementById("side").childElementCount), 0, "sync left the People panel open");
  await click(page, "#launcher"); await click(page, "[data-v=people]");
  await page.evaluate(() => { window.PEOPLE.push("Meera Iyer"); document.getElementById("cnt").textContent = "6"; }); // someone joins
  await tick(page, 12000);
  assert.deepStrictEqual(await names(page), ["Asha Rao", "Karthik M", "Meera Iyer", "Priya Nair", "Rutvik Bharat", "Vikram Singh"]);
  assert.strictEqual(await page.evaluate(() => document.getElementById("side").childElementCount), 0, "sync left the People panel open");
  await assertOnlySafeClicks(page);
  assert.deepStrictEqual(errors, []);
  await close();
});

test("SYNC-UI picking and the other tabs still work after a sync", async () => {
  const { page, errors, close } = await openMeet({ browser, clock: true, body });
  await tick(page, 8000);
  await click(page, "#launcher"); await click(page, "[data-v=people]");
  await click(page, "#pickBtn"); await tick(page, 6000);
  const picked = await page.evaluate(() => document.getElementById("meet-spark-host").shadowRoot.querySelector("#pickedName").textContent);
  assert.ok(["Asha Rao", "Karthik M", "Priya Nair", "Rutvik Bharat", "Vikram Singh"].includes(picked), picked);
  for (const v of ["ice", "wyr", "bingo"]) await click(page, `.nav [data-v=${v}]`);
  assert.deepStrictEqual(errors, []);
  await close();
});

(async () => {
  browser = await chromium.launch();
  try { await run(); } finally { await browser.close(); }
})();
