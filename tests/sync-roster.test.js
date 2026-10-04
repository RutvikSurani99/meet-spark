// v2.5.1 fixes: sync completeness and roster state (docs/specs/v2.5.1-fixes.md SYNC-*, ROSTER-*).
// Fake clock throughout: no real waiting.
const assert = require("assert");
const { chromium } = require("playwright");
const { openMeet, tick, click, names, addName, storage, diagnose, assertOnlySafeClicks, suite, MEET_URL } = require("./helpers/meet");
const { peopleNames, panelPage } = require("./helpers/mock-meet");

const { test, run } = suite("sync-roster");
let browser;
const sorted = (a) => [...a].sort((x, y) => x.localeCompare(y));
const sideOpen = (page) => page.evaluate(() => document.getElementById("side").childElementCount > 0);

test("SYNC-001 a virtualised People panel left open never shrinks the roster (40 people)", async () => {
  const people = peopleNames(40);
  const { page, errors, close } = await openMeet({ browser, clock: true, body: panelPage({ people, virtual: true }) });
  await page.evaluate(() => window.togglePeople()); // the user opens the People panel themselves
  await tick(page, 25000); // first sync + 10 watcher ticks with only ~7 rows rendered
  assert.deepStrictEqual(await names(page), sorted(people), "roster shrank to the rows on screen");
  assert.ok(await sideOpen(page), "Spark closed a panel the user had opened");
  // someone leaves → headcount changes → a full sync removes exactly that person
  await page.evaluate(() => { window.PEOPLE.splice(5, 1); window.setCount(39); window.renderPeople(); });
  await tick(page, 15000);
  assert.deepStrictEqual(await names(page), sorted(people.filter((_, i) => i !== 5)));
  await assertOnlySafeClicks(page);
  assert.deepStrictEqual(errors, []);
  await close();
});

test("SYNC-001b auto-sync with the panel closed reads all 40 and closes the panel again", async () => {
  const people = peopleNames(40);
  const { page, close } = await openMeet({ browser, clock: true, body: panelPage({ people, virtual: true }) });
  await tick(page, 12000);
  assert.deepStrictEqual(await names(page), sorted(people));
  assert.ok(!(await sideOpen(page)), "People panel left open");
  await assertOnlySafeClicks(page);
  await close();
});

test("SYNC-002 a full sync collects all 150 people in a long virtualised list", async () => {
  const people = peopleNames(150);
  const { page, close } = await openMeet({ browser, clock: true, body: panelPage({ people, virtual: true }) });
  await tick(page, 20000);
  assert.strictEqual((await names(page)).length, 150);
  assert.ok(!(await sideOpen(page)), "People panel left open");
  await close();
});

test("SYNC-003 a watcher tick in the middle of a sync doesn't drop people", async () => {
  // No headcount badge and a collapsed "Contributors" group: before the sync expands it, the list
  // looks complete but shows only the host. A watcher tick at that moment must not act on it.
  const people = peopleNames(6);
  const { page, close } = await openMeet({ browser, clock: true, body: panelPage({ people, count: false, group: true, hosts: 1 }) });
  await tick(page, 10000); // first sync: expands the group, reads all 6
  assert.deepStrictEqual(await names(page), sorted(people));
  await tick(page, 2300); // 200 ms before the next watcher tick
  await click(page, "#syncBtn");
  for (let i = 0; i < 40; i++) {
    await tick(page, 50);
    assert.strictEqual((await names(page)).length, 6, `roster dropped to ${(await names(page)).length} during the sync (step ${i})`);
  }
  const w = (await diagnose(page)).watcher;
  assert.ok(w.skippedDuringSync >= 1, `the watcher read the list during a sync (ticks ${w.ticks}, skipped ${w.skippedDuringSync})`);
  await assertOnlySafeClicks(page);
  await close();
});

test("SYNC-REENTRY a second sync started while the panel is still opening doesn't click again (mutant M8)", async () => {
  const people = peopleNames(5);
  const { page, close } = await openMeet({ browser, clock: true, body: panelPage({ people, openDelay: 300 }) });
  await click(page, "#autoSync"); // OFF: only our own syncs below
  await click(page, "#syncBtn"); // manual sync: presses People, the list appears 300 ms later
  await tick(page, 50);
  await click(page, "#autoSync"); // ON → starts another sync while the first is still waiting
  await tick(page, 8000);
  assert.strictEqual(await page.evaluate(() => window.peopleToggles), 2, "People button pressed more than open + close");
  assert.ok(!(await sideOpen(page)), "People panel left open");
  assert.deepStrictEqual(await names(page), sorted(people));
  await assertOnlySafeClicks(page);
  await close();
});

test("SYNC-004 a visible chat list and a hidden participants list are not read as the People panel", async () => {
  const body = `<body><button aria-label="Leave call">call_end</button>
    <div data-participant-id="a"><span class="notranslate">Asha Rao</span></div>
    <section aria-label="In-call messages"><div role="list" aria-label="Chat messages">
      <div role="listitem">Hi all</div><div role="listitem">Good morning</div><div role="listitem">Am I audible</div></div></section>
    <div role="list" aria-label="Participants" style="display:none"><div role="listitem" aria-label="Ghost Person">Ghost Person</div></div></body>`;
  const { page, close } = await openMeet({ browser, clock: true, body });
  await tick(page, 10000);
  assert.deepStrictEqual(await names(page), ["Asha Rao"]);
  assert.strictEqual((await diagnose(page)).participantsListFound, false);
  await close();
});

test("ROSTER-001 moving to another meeting without a reload starts a fresh roster; coming back restores it", async () => {
  // People button that never opens a list → the first sync pauses auto-sync in meeting A.
  const body = `<body><button aria-label="Leave call">call_end</button><button aria-label="People" id="pb">people</button><span>3</span></body>`;
  const { page, close } = await openMeet({ browser, clock: true, body });
  await addName(page, "Asha Rao"); await addName(page, "Vikram Singh");
  await tick(page, 12000);
  assert.strictEqual((await diagnose(page)).syncPaused, true, "setup: sync should be paused in meeting A");
  await page.evaluate(() => history.pushState({}, "", "/ddd-eeee-fff"));
  await tick(page, 3000);
  assert.deepStrictEqual(await names(page), [], "meeting A's names leaked into meeting B");
  assert.strictEqual(await storage(page, "manual:ddd-eeee-fff"), null, "meeting A's names were written under meeting B's key");
  assert.strictEqual((await diagnose(page)).syncPaused, false, "sync stayed paused in the new meeting");
  await addName(page, "Meera Iyer");
  assert.deepStrictEqual(await storage(page, "manual:ddd-eeee-fff"), ["Meera Iyer"]);
  await page.evaluate(() => history.pushState({}, "", "/abc-defg-hij"));
  await tick(page, 3000);
  assert.deepStrictEqual(await names(page), ["Asha Rao", "Vikram Singh"], "meeting A's names not restored");
  assert.deepStrictEqual(sorted(await storage(page, "manual:abc-defg-hij")), ["Asha Rao", "Vikram Singh"]);
  await close();
});

test("ROSTER-002 names added on the Meet home screen are never saved", async () => {
  const { page, close } = await openMeet({ browser, clock: true, url: "https://meet.google.com/" });
  await addName(page, "Asha Rao");
  assert.deepStrictEqual(await names(page), ["Asha Rao"]);
  const keys = await page.evaluate(() => Object.keys(localStorage).filter((k) => /^meetSpark:(manual|excluded|spoken):/.test(k)));
  assert.deepStrictEqual(keys, [], "per-meeting keys written on the home screen");
  await close();
});

test("ROSTER-004 stored data of the wrong type doesn't break startup", async () => {
  const { page, errors, inject, close } = await openMeet({ browser, clock: true, inject: false, url: MEET_URL });
  await page.evaluate(() => {
    localStorage.setItem("meetSpark:manual:abc-defg-hij", "42");
    localStorage.setItem("meetSpark:excluded:abc-defg-hij", JSON.stringify("abc"));
    localStorage.setItem("meetSpark:spoken:abc-defg-hij", JSON.stringify({ a: 1 }));
    localStorage.setItem("meetSpark:bingo_in", JSON.stringify({ items: Array(25).fill("x"), marked: "nope", won: null }));
    localStorage.setItem("meetSpark:tab", JSON.stringify(42));
  });
  await inject();
  assert.deepStrictEqual(await names(page), []);
  assert.strictEqual(await page.evaluate(() => document.getElementById("meet-spark-host").shadowRoot.querySelectorAll("#grid .cell").length), 25);
  assert.match(await page.evaluate(() => document.getElementById("meet-spark-host").shadowRoot.querySelector("#bingoScore").textContent), /^0 marked · 0 lines$/);
  await addName(page, "Asha Rao");
  assert.deepStrictEqual(await names(page), ["Asha Rao"]);
  assert.deepStrictEqual(errors, []);
  await close();
});

(async () => {
  browser = await chromium.launch();
  try { await run(); } finally { await browser.close(); }
})();
