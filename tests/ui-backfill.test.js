// Backfill tests for the original UI features (docs/specs/test-coverage-backfill.md COV-001).
// Specs: launcher-and-panel, icebreakers, this-or-that, bingo, speakers, copy-to-chat, diagnose.
// Every test name carries the requirement IDs it proves. Fake clock wherever timing matters.
const assert = require("assert");
const { chromium } = require("playwright");
const { openMeet, tick, ui, click, text, storage, names, addName, diagnose, suite, clipboard, snack, activeView } = require("./helpers/meet");
const { BINGO } = require("./helpers/content");

const { test, run } = suite("ui-backfill");
let browser;
const CALL = `<body><button aria-label="Leave call">call_end</button></body>`;
const SELF = `<body><button aria-label="Leave call">call_end</button>
  <div data-participant-id="a"><span class="notranslate">Rutvik Bharat</span><div data-self-name="Rutvik Bharat"></div></div></body>`;
const cls = (page, sel, c) => ui(page, (r, [s, k]) => !!r.querySelector(s)?.classList.contains(k), [sel, c]);
const prop = (page, sel, p) => ui(page, (r, [s, k]) => r.querySelector(s)?.[k], [sel, p]);
const waitClip = (page, n = 1) => page.waitForFunction((k) => (window.__clipboard || []).length >= k, n);
const waitSnack = (page, t) => page.waitForFunction((x) => document.getElementById("meet-spark-host").shadowRoot.querySelector("#snack").textContent === x, t);

// ---------------- Launcher and panel ----------------
test("LAUNCH-002 injecting the script twice still gives one host and one launcher", async () => {
  const { page, inject, close } = await openMeet({ browser });
  await inject();
  assert.strictEqual(await page.evaluate(() => document.querySelectorAll("#meet-spark-host").length), 1);
  assert.strictEqual(await ui(page, (r) => r.querySelectorAll("#launcher").length), 1);
  await close();
});

test("LAUNCH-005 the Speakers badge follows the roster (add and remove)", async () => {
  const { page, close } = await openMeet({ browser });
  await addName(page, "Asha Rao"); await addName(page, "Priya Nair");
  assert.strictEqual(await text(page, "#navCount"), "2");
  await ui(page, (r) => r.querySelector('#people .person[data-n="Asha Rao"] .rm').click());
  assert.strictEqual(await text(page, "#navCount"), "1");
  await close();
});

test("LAUNCH-006 status reads Not in call / Live / Manual", async () => {
  const out = await openMeet({ browser });
  assert.strictEqual(await text(out.page, "#liveState"), "Not in call");
  assert.ok(await cls(out.page, "#liveState", "off"));
  await out.close();
  const { page, close } = await openMeet({ browser, clock: true, body: CALL });
  await tick(page, 3000);
  assert.strictEqual(await text(page, "#liveState"), "Live");
  assert.ok(!(await cls(page, "#liveState", "off")));
  await click(page, "#autoSync");
  assert.strictEqual(await text(page, "#liveState"), "Manual");
  await close();
});

test("LAUNCH-007 one snackbar: the newest message replaces the old one and hides 2.2 s later", async () => {
  const { page, close } = await openMeet({ browser, clock: true });
  await click(page, "#iceCopy"); // "Draw a question first"
  await tick(page, 1000);
  await click(page, "#wyrCopy"); // "Draw a prompt first"
  assert.deepStrictEqual(await snack(page), { text: "Draw a prompt first", shown: true });
  await tick(page, 2100);
  assert.strictEqual((await snack(page)).shown, true, "hid too early");
  await tick(page, 200);
  assert.strictEqual((await snack(page)).shown, false, "never hid");
  await close();
});

test("LAUNCH-008 typing in Spark's name box never reaches Meet's keyboard shortcuts", async () => {
  const body = `<body><script>window.keys = 0; document.addEventListener("keydown", () => window.keys++); document.addEventListener("keyup", () => window.keys++);</script></body>`;
  const { page, close } = await openMeet({ browser, body });
  await click(page, "#launcher"); await click(page, ".nav [data-v=people]");
  await ui(page, (r) => r.querySelector("#addName").focus());
  await page.keyboard.type("asha");
  assert.strictEqual(await page.evaluate(() => window.keys), 0, "keystrokes leaked to the page");
  assert.strictEqual(await prop(page, "#addName", "value"), "asha");
  await close();
});

// ---------------- Icebreakers ----------------
test("ICE-001 the selected category chip is highlighted", async () => {
  const { page, close } = await openMeet({ browser });
  await ui(page, (r) => r.querySelector('#cats .chip[data-c="Fun"]').click());
  assert.deepStrictEqual(await ui(page, (r) => [...r.querySelectorAll("#cats .chip.active")].map((c) => c.textContent)), ["Fun"]);
  await close();
});

test("ICE-006 drawing the next question clears 'Question for …'", async () => {
  const { page, close } = await openMeet({ browser });
  await addName(page, "Asha Rao");
  await click(page, "#iceAsk");
  assert.strictEqual(await text(page, "#iceTo"), "Question for Asha Rao");
  await click(page, "#iceNext");
  assert.strictEqual(await text(page, "#iceTo"), "");
  await close();
});

test("ICE-007 Ask with nobody: hint and switch to Speakers", async () => {
  const { page, close } = await openMeet({ browser });
  await click(page, "#iceAsk");
  assert.strictEqual((await snack(page)).text, "No participants yet — sync or add names");
  assert.deepStrictEqual(await activeView(page), ["people"]);
  await close();
});

// ---------------- This or that ----------------
test("WYR-003 placeholder and voting hint before the first draw", async () => {
  const { page, close } = await openMeet({ browser });
  assert.strictEqual(await text(page, "#wyrA"), "Draw a prompt to start");
  assert.strictEqual(await ui(page, (r) => r.querySelector('.view[data-v="wyr"] .muted').textContent), "Ask everyone to vote with Meet reactions — 👍 for A, ❤️ for B.");
  await close();
});

// ---------------- Bingo ----------------
test("BINGO-001 FREE can't be unmarked", async () => {
  const { page, close } = await openMeet({ browser });
  await ui(page, (r) => r.querySelectorAll("#grid .cell")[12].click());
  assert.strictEqual(await text(page, "#bingoScore"), "0 marked · 0 lines");
  assert.ok(await ui(page, (r) => r.querySelectorAll("#grid .cell")[12].classList.contains("free")));
  await close();
});

test("BINGO-005 a new line celebrates once: confetti + 'Bingo!' toast", async () => {
  const { page, close } = await openMeet({ browser, clock: true });
  const cell = (i) => ui(page, (r, n) => r.querySelectorAll("#grid .cell")[n].click(), i);
  const bursts = () => ui(page, (r) => r.querySelectorAll(".burst").length);
  await click(page, "#bingoNew");
  for (const i of [0, 1, 2, 3, 4]) await cell(i);
  assert.ok((await bursts()) > 0, "no confetti");
  assert.deepStrictEqual(await snack(page), { text: "Bingo! Call it out in the meeting", shown: true });
  await tick(page, 2500);
  assert.strictEqual(await bursts(), 0, "confetti never cleared");
  await cell(10); // not part of a new line
  assert.strictEqual(await bursts(), 0, "celebrated without a new line");
  assert.strictEqual((await snack(page)).shown, false);
  await close();
});

test("BINGO-008 card text is shown as text, never parsed as HTML", async () => {
  const { page, inject, close } = await openMeet({ browser, inject: false });
  const items = ["<b>x</b>", ...BINGO.slice(0, 23)]; items.splice(12, 0, "FREE");
  await page.evaluate((b) => localStorage.setItem("meetSpark:bingo_in", JSON.stringify(b)), { items, marked: [12], won: [] });
  await inject();
  assert.strictEqual(await ui(page, (r) => r.querySelectorAll("#grid .cell")[0].textContent), "<b>x</b>");
  assert.strictEqual(await ui(page, (r) => r.querySelectorAll("#grid b").length), 0);
  await close();
});

// ---------------- Speakers: list ----------------
test("SPK-002 added names are cleaned; blank adds nothing; rejected words are kept as typed", async () => {
  const { page, close } = await openMeet({ browser });
  await addName(page, "Asha Rao (You)");
  await addName(page, "   ");
  await addName(page, "Mute");
  assert.deepStrictEqual(await names(page), ["Asha Rao", "Mute"]);
  await close();
});

test("SPK-003 adding an excluded name again includes it again", async () => {
  const { page, close } = await openMeet({ browser });
  await addName(page, "Asha Rao");
  await ui(page, (r) => r.querySelector('#people .person[data-n="Asha Rao"] .toggle').click());
  await addName(page, "Asha Rao");
  assert.ok(!(await ui(page, (r) => r.querySelector('#people .person[data-n="Asha Rao"]').classList.contains("out"))));
  assert.deepStrictEqual(await storage(page, "excluded:abc-defg-hij"), []);
  await close();
});

test("SPK-005 rows show initials and the 'Added manually' / 'You' labels", async () => {
  const { page, close } = await openMeet({ browser, clock: true, body: SELF });
  await addName(page, "asha rao");
  await tick(page, 10000); // first sync reads your own tile
  const row = (n) => ui(page, (r, k) => { const li = r.querySelector(`#people .person[data-n="${k}"]`); return { av: li.querySelector(".avatar").textContent, meta: li.querySelector(".meta")?.textContent ?? "" }; }, n);
  assert.deepStrictEqual(await row("asha rao"), { av: "AR", meta: "Added manually" });
  assert.deepStrictEqual(await row("Rutvik Bharat"), { av: "RB", meta: "You" });
  await close();
});

test("SPK-007 Remove also clears 'already spoken' and says 'Removed <name>' [LAUNCH-005]", async () => {
  const { page, close } = await openMeet({ browser });
  await addName(page, "Asha Rao");
  await click(page, "#iceAsk"); // Asha has now spoken
  assert.deepStrictEqual(await storage(page, "spoken:abc-defg-hij"), ["Asha Rao"]);
  await ui(page, (r) => r.querySelector('#people .person[data-n="Asha Rao"] .rm').click());
  assert.deepStrictEqual(await storage(page, "spoken:abc-defg-hij"), []);
  assert.strictEqual((await snack(page)).text, "Removed Asha Rao");
  await close();
});

test("SPK-008 Clear all empties the list and the spoken list, with a hint", async () => {
  const { page, close } = await openMeet({ browser });
  await addName(page, "Asha Rao"); await addName(page, "Priya Nair");
  await click(page, "#iceAsk");
  await click(page, "#clearAll");
  assert.deepStrictEqual(await names(page), []);
  assert.deepStrictEqual(await storage(page, "spoken:abc-defg-hij"), []);
  assert.strictEqual((await snack(page)).text, "List cleared — tap sync to re-read who's in the call");
  await close();
});

// ---------------- Speakers: picking ----------------
test("SPK-010 the pick mode is remembered; an invalid saved mode falls back to Everyone once", async () => {
  const { page, inject, close } = await openMeet({ browser });
  await click(page, '#mode [data-m="random"]');
  assert.strictEqual(await storage(page, "mode"), "random");
  await page.reload(); await inject();
  assert.ok(await cls(page, '#mode [data-m="random"]', "active"), "mode not restored");
  await page.evaluate(() => localStorage.setItem("meetSpark:mode", JSON.stringify("x")));
  await page.reload(); await inject();
  assert.ok(await cls(page, '#mode [data-m="round"]', "active"));
  await close();
});

test("SPK-011 a finished round says 'Everyone has spoken — starting a new round'", async () => {
  const { page, close } = await openMeet({ browser });
  await addName(page, "Asha Rao"); await addName(page, "Priya Nair");
  await click(page, "#iceAsk"); await click(page, "#iceAsk");
  await click(page, "#iceAsk");
  assert.strictEqual((await snack(page)).text, "Everyone has spoken — starting a new round");
  await close();
});

test("SPK-012 Fully random shows '<n> in the draw'", async () => {
  const { page, close } = await openMeet({ browser });
  await addName(page, "Asha Rao"); await addName(page, "Priya Nair");
  await click(page, '#mode [data-m="random"]');
  assert.strictEqual(await text(page, "#pickedSub"), "2 in the draw");
  await close();
});

// SPK-014 as amended by picker-styles PSTY-021: disabled while the pick popup is open, enabled after Done.
test("SPK-014 PSTY-021 the Pick button is disabled while the pick popup is open", async () => {
  const { page, close } = await openMeet({ browser, clock: true });
  await addName(page, "Asha Rao"); await addName(page, "Priya Nair");
  await click(page, "#pickBtn");
  assert.strictEqual(await prop(page, "#pickBtn", "disabled"), true);
  await tick(page, 6000);
  assert.strictEqual(await prop(page, "#pickBtn", "disabled"), true, "still disabled: the popup is open");
  await click(page, "#pstyDone");
  assert.strictEqual(await prop(page, "#pickBtn", "disabled"), false);
  await close();
});

test("SPK-015 Pick with nobody switches to the Speakers tab", async () => {
  const { page, close } = await openMeet({ browser });
  assert.deepStrictEqual(await activeView(page), ["ice"]);
  await click(page, "#pickBtn");
  assert.deepStrictEqual(await activeView(page), ["people"]);
  await close();
});

// ---------------- Copy to chat ----------------
test("COPY-001 copying writes the clipboard and confirms", async () => {
  const { page, close } = await openMeet({ browser });
  await click(page, "#iceNext");
  const q = await text(page, "#iceQ");
  await click(page, "#iceCopy"); await waitClip(page);
  assert.deepStrictEqual(await clipboard(page), [`Icebreaker: ${q}`]);
  await waitSnack(page, "Copied — paste it into the Meet chat");
  await close();
});

test("COPY-002 a refused clipboard shows 'Copy failed — please copy manually'", async () => {
  const { page, errors, close } = await openMeet({ browser });
  await page.evaluate(() => { window.__clipboardFail = true; });
  await click(page, "#bingoCopy");
  await waitSnack(page, "Copy failed — please copy manually");
  assert.deepStrictEqual(await clipboard(page), []);
  assert.deepStrictEqual(errors, []);
  await close();
});

test("COPY-003 icebreaker copy: hint with no question, 'for <name>' after Ask", async () => {
  const { page, close } = await openMeet({ browser });
  await click(page, "#iceCopy");
  assert.strictEqual((await snack(page)).text, "Draw a question first");
  assert.deepStrictEqual(await clipboard(page), []);
  await addName(page, "Asha Rao");
  await click(page, "#iceAsk");
  const q = await text(page, "#iceQ");
  await click(page, "#iceCopy"); await waitClip(page);
  assert.deepStrictEqual(await clipboard(page), [`Icebreaker for Asha Rao: ${q}`]);
  await close();
});

test("COPY-004 This or that copy text, and the hint before a draw", async () => {
  const { page, close } = await openMeet({ browser });
  await click(page, "#wyrCopy");
  assert.strictEqual((await snack(page)).text, "Draw a prompt first");
  await click(page, "#wyrNext");
  const [a, b] = [await text(page, "#wyrA"), await text(page, "#wyrB")];
  await click(page, "#wyrCopy"); await waitClip(page);
  assert.deepStrictEqual(await clipboard(page), [`Would you rather…\nA) ${a}\nB) ${b}\nReact 👍 for A or ❤️ for B`]);
  await close();
});

test("COPY-005 Bingo invite text", async () => {
  const { page, close } = await openMeet({ browser });
  await click(page, "#bingoCopy"); await waitClip(page);
  assert.deepStrictEqual(await clipboard(page), ["Meeting Bingo is on — open Meet Spark → Bingo and mark squares as they happen. First to five in a row wins."]);
  await close();
});

// ---------------- Diagnose ----------------
test("COPY-006 DIAG-101 Diagnose logs the report and copies the same JSON", async () => {
  const { page, close } = await openMeet({ browser, body: CALL });
  const report = await diagnose(page);
  await waitClip(page);
  assert.deepStrictEqual(JSON.parse((await clipboard(page))[0]), report);
  await close();
});

test("DIAG-102 the report has every documented field with the right type", async () => {
  const { page, close } = await openMeet({ browser, clock: true, body: SELF });
  await tick(page, 3000);
  const r = await diagnose(page);
  const T = { version: "string", path: "string", inCall: "boolean", leaveButton: "boolean", peopleCount: ["number", "null"], selfName: "boolean",
    participantsListFound: "boolean", lists: "array", tiles: "number", tileSample: ["object", "null"], detected: "object", buttons: "array",
    peopleLikeControls: "array", dataAttrs: "array", roles: "object", regions: "array", noTranslate: "array", syncPaused: "boolean", watcher: "object", peopleButton: ["object", "null"] };
  const type = (v) => (v === null ? "null" : Array.isArray(v) ? "array" : typeof v);
  for (const [k, want] of Object.entries(T)) assert.ok([].concat(want).includes(type(r[k])), `${k}: ${type(r[k])}, expected ${want}`);
  assert.strictEqual(typeof r.watcher.ticks, "number");
  await close();
});

(async () => {
  browser = await chromium.launch();
  try { await run(); } finally { await browser.close(); }
})();
