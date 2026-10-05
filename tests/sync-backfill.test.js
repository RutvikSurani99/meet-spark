// Backfill tests for auto-sync, manual sync and detection (docs/specs/test-coverage-backfill.md COV-001).
// Specs: sync.md (SYNC-101+), roster-and-detection.md (ROSTER-101+). Fake clock throughout.
const assert = require("assert");
const { chromium } = require("playwright");
const { openMeet, tick, ui, click, text, names, addName, diagnose, clicks, assertOnlySafeClicks, suite, snack } = require("./helpers/meet");
const { peopleNames, panelPage } = require("./helpers/mock-meet");

const { test, run } = suite("sync-backfill");
let browser;
const sorted = (a) => [...a].sort((x, y) => x.localeCompare(y));
const peopleClicks = async (page) => (await clicks(page)).filter((c) => c.label === "People").length;
const prop = (page, sel, p) => ui(page, (r, [s, k]) => r.querySelector(s)?.[k], [sel, p]);
// Something that happens to the side panel the first time it opens (from the safety suite).
const ONCE_AFTER_OPEN = (action) => `<script>document.addEventListener("DOMContentLoaded", () => {
  const orig = window.togglePeople; let once = true;
  window.togglePeople = () => { orig(); if (once && document.getElementById("side").childElementCount) { once = false; setTimeout(() => { ${action} }, 150); } };
});</script>`;

test("SYNC-102 with a readable, different headcount the first sync runs on the first tick, with no toast [SYNC-108]", async () => {
  const { page, close } = await openMeet({ browser, clock: true, body: panelPage({ people: peopleNames(4) }) });
  await tick(page, 2000);
  assert.strictEqual(await peopleClicks(page), 0, "synced before the first watcher tick");
  await tick(page, 1500);
  assert.strictEqual(await peopleClicks(page), 2, "expected one sync (open + close) on the first tick");
  assert.strictEqual((await snack(page)).shown, false, "automatic syncs must not show a toast");
  await tick(page, 30000);
  assert.strictEqual(await peopleClicks(page), 2, "synced again although nothing changed");
  await close();
});

test("SYNC-102 without a headcount the first sync waits more than 4 s after the call is detected", async () => {
  const { page, close } = await openMeet({ browser, clock: true, body: panelPage({ people: peopleNames(4), count: false }) });
  await tick(page, 5000);
  assert.strictEqual(await peopleClicks(page), 0, "synced too early");
  await tick(page, 4000);
  assert.strictEqual(await peopleClicks(page), 2, "expected one sync by 9 s");
  await tick(page, 30000);
  assert.strictEqual(await peopleClicks(page), 2, "synced again although nothing changed");
  await close();
});

test("SYNC-103 an unreadable name never makes the panel flash; a real join syncs once, after the 8 s gap", async () => {
  // 6 in the call, but one display name can't be read, so the roster settles at 5 against a headcount of 6.
  const people = [...peopleNames(5), "x_y"];
  const { page, close } = await openMeet({ browser, clock: true, body: panelPage({ people }) });
  await tick(page, 4000);
  assert.strictEqual(await peopleClicks(page), 2, "first sync");
  await page.evaluate(() => { window.PEOPLE.push("Meera Iyer"); window.setCount(7); }); // a real join, right after the first sync
  await tick(page, 6000);
  assert.strictEqual(await peopleClicks(page), 2, "re-synced before the 8 s gap");
  await tick(page, 4000);
  assert.strictEqual(await peopleClicks(page), 4, "the join didn't trigger a sync");
  assert.ok((await names(page)).includes("Meera Iyer"));
  await tick(page, 60000);
  assert.strictEqual(await peopleClicks(page), 4, "the People panel kept flashing: re-synced while the headcount didn't change");
  await assertOnlySafeClicks(page);
  await close();
});

test("SYNC-105 tapping sync un-pauses auto-sync", async () => {
  // The People button does nothing the first two times (the failed open and its revert), then works.
  const flaky = `<script>document.addEventListener("DOMContentLoaded", () => {
    const orig = window.togglePeople; let n = 0; window.togglePeople = () => { if (n++ < 2) return; orig(); }; });</script>`;
  const { page, close } = await openMeet({ browser, clock: true, body: panelPage({ people: peopleNames(4), extraBody: flaky }) });
  await tick(page, 9000);
  assert.strictEqual((await diagnose(page)).syncPaused, true, "setup: the first sync should pause");
  await click(page, "#syncBtn");
  await tick(page, 2000);
  assert.strictEqual((await diagnose(page)).syncPaused, false, "tapping sync didn't un-pause");
  await page.evaluate(() => { window.PEOPLE.push("Meera Iyer"); window.setCount(5); });
  await tick(page, 15000);
  assert.ok((await names(page)).includes("Meera Iyer"), "auto-sync stayed off after a successful manual sync");
  await close();
});

test("SYNC-105 a manual sync brings back people the host removed", async () => {
  const people = peopleNames(4);
  const { page, close } = await openMeet({ browser, clock: true, body: panelPage({ people }) });
  await tick(page, 9000);
  await ui(page, (r, n) => r.querySelector(`#people .person[data-n="${n}"] .rm`).click(), people[2]);
  assert.ok(!(await names(page)).includes(people[2]));
  await click(page, "#syncBtn");
  await tick(page, 2000);
  assert.deepStrictEqual(await names(page), sorted(people));
  await close();
});

test("SYNC-106 the sync button is busy (spinner, disabled) during a sync", async () => {
  const { page, close } = await openMeet({ browser, clock: true, body: panelPage({ people: peopleNames(4), openDelay: 300 }) });
  await click(page, "#autoSync"); // OFF
  await click(page, "#syncBtn");
  assert.strictEqual(await prop(page, "#syncBtn", "disabled"), true);
  assert.ok(await ui(page, (r) => !!r.querySelector("#syncBtn .spin")));
  await tick(page, 3000);
  assert.strictEqual(await prop(page, "#syncBtn", "disabled"), false);
  assert.ok(await ui(page, (r) => !r.querySelector("#syncBtn .spin")));
  await close();
});

test("SYNC-108 manual sync messages: complete, partial, nothing found, from screen, paused", async () => {
  const msg = async (body, { before, wait = 1000 } = {}) => {
    const { page, close } = await openMeet({ browser, clock: true, body });
    await click(page, "#autoSync"); // OFF: only the manual sync runs
    if (before) await page.evaluate(before);
    await click(page, "#syncBtn");
    await tick(page, wait);
    const s = await snack(page);
    await close();
    return s.text;
  };
  assert.strictEqual(await msg(panelPage({ people: peopleNames(4) })), "Synced 4 participants");
  assert.match(await msg(panelPage({ people: peopleNames(40), virtual: true }), { before: () => window.setCount(60), wait: 2500 }),
    /^Synced 40 so far\. Scroll the People panel to the bottom or tap sync again\.$/);
  assert.strictEqual(await msg(`<body><button aria-label="Leave call">call_end</button></body>`), "No names found. Open Meet's People panel, then tap sync.");
  assert.strictEqual(await msg(`<body><button aria-label="Leave call">call_end</button>
    <div data-participant-id="a"><span class="notranslate">Asha Rao</span></div><div data-participant-id="b"><span class="notranslate">Vikram Singh</span></div></body>`),
  "Synced 2 from screen — open the People panel to include everyone");
  const chat = ONCE_AFTER_OPEN(`document.getElementById("side").innerHTML = '<section id="chatp" aria-label="In-call messages">Chat</section>';`);
  assert.strictEqual(await msg(panelPage({ people: peopleNames(4), extraBody: chat })), "Sync paused: Meet's side panel changed. Tap sync again when the People panel is closed.");
});

test("ROSTER-101 detected names are cleaned and Meet's own words are rejected", async () => {
  const people = ["Rutvik Bharat", "Asha Rao (Presenting)", "more_vert", "Mute", "12", "Vikram is presenting", "A", "Karthik  M", "N".repeat(61)];
  const { page, close } = await openMeet({ browser, clock: true, body: panelPage({ people }) });
  await tick(page, 9000);
  assert.deepStrictEqual(await names(page), ["Asha Rao", "Karthik M", "Rutvik Bharat"]);
  await close();
});

test("ROSTER-107 status notes in brackets are stripped, even long or cut off; other brackets stay [ROSTER-110]", async () => {
  const people = ["Rutvik Bharat", "Shourja Raj (Presenting, annotating)", "Asha Rao (You, presenting)", "Hamid Abdul (Host · Presenting)",
    "Riya Sunil (Presenting, a", "Raj (Delhi office)", "Shourja Raj"];
  const { page, close } = await openMeet({ browser, clock: true, body: panelPage({ people }) });
  await tick(page, 9000);
  assert.deepStrictEqual(await names(page), ["Asha Rao", "Hamid Abdul", "Raj (Delhi office)", "Riya Sunil", "Rutvik Bharat", "Shourja Raj"]);
  await close();
});

test("ROSTER-109 Meet's presenting and tile control phrases are never names", async () => {
  const junk = ["Zoom in", "Zoom out", "Reset zoom", "Fit to frame", "Fill frame", "You are presenting", "Stop presenting", "Present now",
    "Presentation", "Full screen", "Exit full screen", "Backgrounds and effects"];
  const { page, close } = await openMeet({ browser, clock: true, body: panelPage({ people: ["Rutvik Bharat", ...junk] }) });
  await tick(page, 9000);
  assert.deepStrictEqual(await names(page), ["Rutvik Bharat"]);
  await close();
});

test("ROSTER-108 a presenter's tile adds only the presenter, never its controls (Zoom in) [ROSTER-110]", async () => {
  // Like Meet while someone presents: the presenter's own tile, plus a presentation tile with a zoom button
  // (tooltip "Zoom in"), a pop-out button whose tooltip isn't on any word list, and a full-screen button
  // whose visible text comes before the name.
  const body = `<body><button aria-label="Leave call">call_end</button>
    <div data-participant-id="me"><span class="notranslate">Rutvik Bharat</span><div data-self-name="Rutvik Bharat"></div></div>
    <div data-participant-id="sr"><span class="notranslate">Shourja Raj</span></div>
    <div data-participant-id="pres"><button data-tooltip="Show in a new window"><i>open_in_new</i></button>
      <button data-tooltip="Zoom in" aria-label="Zoom in"><i>zoom_in</i></button>
      <div>Shourja Raj (Presenting, annotating)</div></div>
    <div data-participant-id="pres2"><button>Full screen view</button><div>Shourja Raj (Presenting)</div></div></body>`;
  const { page, close } = await openMeet({ browser, clock: true, body });
  await tick(page, 10000);
  assert.deepStrictEqual(await names(page), ["Rutvik Bharat", "Shourja Raj"]);
  assert.strictEqual(await ui(page, (r) => r.querySelector("#navCount").textContent), "2");
  await close();
});

test("ROSTER-103 avatars and names inside Spark's own panel are never read as people", async () => {
  const { page, close } = await openMeet({ browser, clock: true, body: `<body><button aria-label="Leave call">call_end</button></body>` });
  await ui(page, (r) => { const d = document.createElement("div"); d.innerHTML = '<img src="https://lh3.googleusercontent.com/a/x" width="32" height="32"><div>Ghost Person</div>'; r.querySelector(".content").appendChild(d); });
  await tick(page, 10000);
  assert.ok(!(await names(page)).includes("Ghost Person"));
  await close();
});

test("ROSTER-104 syncs never remove or change manually added names", async () => {
  const { page, close } = await openMeet({ browser, clock: true, body: panelPage({ people: peopleNames(4) }) });
  await addName(page, "Guest One");
  await tick(page, 9000); // complete automatic sync
  await click(page, "#syncBtn"); await tick(page, 2000); // and a manual one
  assert.ok((await names(page)).includes("Guest One"));
  assert.strictEqual(await ui(page, (r) => r.querySelector('#people .person[data-n="Guest One"] .meta')?.textContent), "Added manually");
  await close();
});

test("ROSTER-106 Spark works with storage blocked: no errors, names and picking still work", async () => {
  const block = () => { Object.defineProperty(window, "localStorage", { configurable: true, get() { throw new Error("SecurityError: storage blocked"); } }); };
  const { page, errors, close } = await openMeet({ browser, clock: true, init: [block] });
  await addName(page, "Asha Rao"); await addName(page, "Priya Nair");
  assert.deepStrictEqual(await names(page), ["Asha Rao", "Priya Nair"]);
  await click(page, "#pickBtn"); await tick(page, 6000);
  assert.ok(["Asha Rao", "Priya Nair"].includes(await text(page, "#pickedName")));
  assert.deepStrictEqual(errors, []);
  await close();
});

(async () => {
  browser = await chromium.launch();
  try { await run(); } finally { await browser.close(); }
})();
