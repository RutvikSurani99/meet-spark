// v2.5.1 fixes: Alt+S shortcut and Diagnose privacy (docs/specs/v2.5.1-fixes.md KEYS-001, DIAG-001).
const assert = require("assert");
const { chromium } = require("playwright");
const { openMeet, tick, ui, diagnose, suite } = require("./helpers/meet");

const { test, run } = suite("keys-diag");
let browser;
const isOpen = (page) => ui(page, (r) => r.querySelector("#panel").classList.contains("open"));

test("KEYS-001 Alt+S is ignored while typing, with Ctrl/Cmd/AltGr, and on key repeat [LAUNCH-003]", async () => {
  const body = `<body><textarea id="chat" aria-label="Send a message"></textarea><div id="ce" contenteditable="true">x</div><input id="inp">
    <script>window.prevented = []; window.addEventListener("keydown", (e) => { if (e.code === "KeyS") window.prevented.push(e.defaultPrevented); });</script></body>`;
  const { page, close } = await openMeet({ browser, body });
  for (const sel of ["#chat", "#ce", "#inp"]) {
    await page.focus(sel);
    await page.keyboard.press("Alt+KeyS");
    assert.strictEqual(await isOpen(page), false, `Alt+S toggled the panel while typing in ${sel}`);
  }
  assert.deepStrictEqual(await page.evaluate(() => window.prevented), [false, false, false], "Alt+S was swallowed while typing");
  await page.evaluate(() => document.activeElement.blur());
  for (const combo of ["Control+Alt+KeyS", "Meta+Alt+KeyS"]) {
    await page.keyboard.press(combo);
    assert.strictEqual(await isOpen(page), false, `${combo} toggled the panel`);
  }
  await page.evaluate(() => document.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyS", key: "s", altKey: true, repeat: true, bubbles: true })));
  assert.strictEqual(await isOpen(page), false, "a repeated keydown toggled the panel");
  await page.keyboard.press("Alt+KeyS");
  assert.strictEqual(await isOpen(page), true, "plain Alt+S no longer opens the panel");
  await close();
});

test("DIAG-001 Diagnose redacts names inside control labels and the meeting code [DIAG-102, DIAG-103]", async () => {
  const body = `<body><button aria-label="Leave call">call_end</button>
    <div data-participant-id="a" aria-label="Asha Rao"><span class="notranslate">Asha Rao</span>
      <button aria-label="Pin Asha Rao">keep</button><button aria-label="More options for Asha Rao">more_vert</button></div>
    <div data-participant-id="b"><span class="notranslate">Vikram Singh</span><button aria-label="Pin Vikram Singh">keep</button>
      <button title="Remove Vikram Singh from the meeting">x</button></div>
    <section role="region" aria-label="Vikram Singh is presenting"></section>
    <div><button aria-label="People (Asha Rao, Vikram Singh)" data-panel-id="1">people</button><span>2</span></div>
    <aside role="complementary" aria-label="People"><div role="list" aria-label="Participants: Asha Rao, Vikram Singh">
      <div role="listitem" aria-label="Asha Rao">Asha Rao</div><div role="listitem" aria-label="Vikram Singh">Vikram Singh</div></div></aside></body>`;
  const { page, close } = await openMeet({ browser, clock: true, body });
  await tick(page, 3000);
  const r = await diagnose(page);
  const json = JSON.stringify(r);
  for (const w of ["Asha", "Rao", "Vikram", "Singh", "abc-defg-hij"]) assert.ok(!json.includes(w), `Diagnose leaked "${w}"`);
  assert.ok(json.includes("Pin …"), "control words were removed too (expected 'Pin …')");
  assert.ok(json.includes("More options for …"), "expected 'More options for …'");
  assert.strictEqual(r.path, "/<meeting>");
  for (const k of ["peopleLikeControls", "dataAttrs", "roles", "regions", "noTranslate", "lists", "buttons"]) assert.ok(k in r, `report lost the ${k} field`);
  await close();
});

(async () => {
  browser = await chromium.launch();
  try { await run(); } finally { await browser.close(); }
})();
