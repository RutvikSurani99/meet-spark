// PROTECTED FILE — GR-2 safety suite. See docs/GUARDRAILS.md §2 and §7.
// Spark must never click a Meet control other than the People button (and, inside the
// participants list, a group header). Every new click into Meet needs a test here (GRH-033).
const assert = require("assert");
const { chromium } = require("playwright");
const { openMeet, tick, click, diagnose, clicks, names, assertOnlySafeClicks, suite } = require("./helpers/meet");
const { peopleNames, panelPage } = require("./helpers/mock-meet");

const { test, run } = suite("safety");
let browser;

// Controls that must never be clicked. Each one tempts a detection path (data-panel-id, a People-like
// label, or a People icon) and carries data-trap so the click recorder flags it.
const TRAPS = `
  <button data-trap="1" role="switch" data-panel-id="1" aria-label="Let participants send messages">people</button>
  <button data-trap="2" aria-label="Turn on captions">closed_caption</button>
  <button data-trap="3" aria-label="Mute all">mic_off</button>
  <button data-trap="4" aria-label="Remove from meeting">person_remove</button>
  <button data-trap="5" aria-label="Admit all">group_add</button>
  <button data-trap="6" aria-label="Lock meeting">lock</button>
  <button data-trap="7" aria-label="Host controls">people</button>
  <button data-trap="8" aria-label="Everyone can chat">chat</button>
  <button data-trap="9" aria-label="Meeting settings">settings</button>
  <button data-trap="10" aria-label="More options">more_vert</button>
  <button data-trap="11" aria-checked="false" aria-label="People can join without asking">people</button>
  <div data-trap="12" role="checkbox" aria-label="Participants can share">x</div>
  <button data-trap="13" role="menuitemcheckbox" aria-label="People">people</button>
  <button data-trap="14" aria-label="Everyone can send messages">people</button>`;

const trapPage = (extraTraps = "", listExtra = "", sideExtra = "") => `<body style="background:#202124;height:100vh">
  <div id="toolbar">${TRAPS}${extraTraps}</div>
  <button aria-label="Leave call">call_end</button>
  <div data-participant-id="a"><span class="notranslate">Rutvik Bharat</span></div>
  <div><button aria-label="People" id="pb">people</button><span id="cnt">3</span></div>
  <aside id="side"></aside>
  <script>
    window.PEOPLE = ['Rutvik Bharat (You)', 'Asha Rao', 'Vikram Singh'];
    window.LIST_EXTRA = ${JSON.stringify(listExtra)}; window.SIDE_EXTRA = ${JSON.stringify(sideExtra)};
    document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('[data-trap]')) window.trapped = (window.trapped || 0) + 1; }, true);
    document.getElementById('pb').onclick = () => { const s = document.getElementById('side');
      if (s.childElementCount) { s.replaceChildren(); return; }
      s.innerHTML = SIDE_EXTRA + '<div role="list" aria-label="Participants">' + LIST_EXTRA + PEOPLE.map(n => '<div role="listitem" aria-label="' + n + '">' + n + '</div>').join('') + '</div>'; };
  </script></body>`;

async function syncEverything(page) {
  await tick(page, 20000); // first automatic sync
  await click(page, "#launcher"); await click(page, ".nav [data-v=people]");
  await click(page, "#syncBtn"); await tick(page, 6000); // manual sync
  await diagnose(page);
}

test("SAFETY-1 unsafe-only page: nothing is clicked and Diagnose finds no People button", async () => {
  const body = `<body><button aria-label="Let participants send messages" data-trap="x">x</button><button aria-label="Leave call">call_end</button>
    <button aria-label="Chat with everyone" data-trap="y">chat</button><button aria-label="Host controls" data-trap="z">x</button></body>`;
  const { page, close } = await openMeet({ browser, clock: true, body });
  await tick(page, 20000);
  assert.deepStrictEqual(await clicks(page), []);
  assert.strictEqual((await diagnose(page)).peopleButton, null);
  await close();
});

test("SAFETY-2 trap page: auto-sync, manual sync and Diagnose never click a trap (GRH-031)", async () => {
  const { page, close } = await openMeet({ browser, clock: true, body: trapPage() });
  await syncEverything(page);
  assert.strictEqual(await page.evaluate(() => window.trapped || 0), 0, "a trap control was clicked");
  assert.ok((await clicks(page)).length >= 2, "sync never opened the People panel");
  await assertOnlySafeClicks(page);
  assert.strictEqual(await page.evaluate(() => document.getElementById("side").childElementCount), 0, "sync left the People panel open");
  await close();
});

test("SAFE-002 group expand clicks only the Contributors header inside the list, never other expandable controls (F1)", async () => {
  const listExtra = `<div role="button" aria-expanded="false" aria-label="Contributors">Contributors</div>
    <button data-trap="L1" aria-expanded="false" aria-label="More options for Asha Rao">more_vert</button>
    <button data-trap="L2" aria-expanded="false" aria-label="Mute Asha Rao">mic</button>
    <div data-trap="L3" role="button" aria-expanded="false">Waiting to join</div>
    <button data-trap="L4" role="switch" aria-expanded="false" aria-label="Contributors can share">x</button>`;
  const sideExtra = `<button data-trap="S1" aria-expanded="false" aria-label="Add people">person_add</button>
    <button data-trap="S2" aria-expanded="false" aria-label="Host controls">x</button>`;
  const { page, close } = await openMeet({ browser, clock: true, body: trapPage("", listExtra, sideExtra) });
  await syncEverything(page);
  assert.strictEqual(await page.evaluate(() => window.trapped || 0), 0, "an expandable control other than the group header was clicked");
  assert.ok((await clicks(page)).some((c) => c.label === "Contributors"), "the Contributors group was never expanded");
  await assertOnlySafeClicks(page);
  await close();
});

// Opens a mock where something else happens to the side panel while a sync is running (SAFE-003).
const DURING_SYNC = (action) => `<script>document.addEventListener("DOMContentLoaded", () => {
  const orig = window.togglePeople; let once = true;
  window.togglePeople = () => { orig(); if (once && document.getElementById("side").childElementCount) { once = false; setTimeout(() => { ${action} }, 150); } };
});</script>`;

test("SAFE-003 if Chat replaces the People panel during a sync, Spark doesn't click to undo", async () => {
  const people = peopleNames(4);
  const hijack = DURING_SYNC(`document.getElementById("side").innerHTML = '<section id="chatp" aria-label="In-call messages">Chat</section>';`);
  const { page, close } = await openMeet({ browser, clock: true, body: panelPage({ people, extraBody: hijack }) });
  await tick(page, 12000); // first automatic sync
  assert.ok(await page.evaluate(() => !!document.getElementById("chatp")), "Spark's undo click closed the host's Chat panel");
  assert.strictEqual((await clicks(page)).filter((c) => c.label === "People").length, 1, "People button clicked again after Chat took over");
  assert.strictEqual((await diagnose(page)).syncPaused, true, "auto-sync should pause after an unsafe undo");
  await assertOnlySafeClicks(page);
  await close();
});

test("SAFE-003 if Meet re-renders the People button during a sync, Spark closes the panel with the new button", async () => {
  const people = peopleNames(4);
  const rerender = DURING_SYNC(`const b = document.getElementById("pb"); b.replaceWith(b.cloneNode(true));`);
  const { page, close } = await openMeet({ browser, clock: true, body: panelPage({ people, delegated: true, extraBody: rerender }) });
  await tick(page, 12000);
  assert.strictEqual(await page.evaluate(() => document.getElementById("side").childElementCount), 0, "People panel left open after the toolbar re-rendered");
  assert.strictEqual((await names(page)).length, 4);
  await assertOnlySafeClicks(page);
  await close();
});

// GRH-032: table-driven People-button detection, read through Diagnose's peopleButton field.
// expect: null = Spark must not treat this as the People button; a string = the label/text it must pick.
const TABLE = [
  // must be refused
  [`<button role="switch" data-panel-id="1" aria-label="Let participants send messages">people</button>`, null],
  [`<button data-panel-id="1" aria-label="Host controls">people</button>`, null],
  [`<button role="checkbox" aria-label="People">people</button>`, null],
  [`<div role="button" aria-checked="true" aria-label="People">people</div>`, null],
  [`<button role="menuitemcheckbox" aria-label="Participants">people</button>`, null],
  [`<button aria-checked="false" aria-label="People">people</button>`, null],
  [`<button aria-label="Turn on captions">people</button>`, null],
  [`<button aria-label="Mute all">people</button>`, null],
  [`<button aria-label="Remove from meeting">group</button>`, null],
  [`<button aria-label="Admit all">group</button>`, null],
  [`<button aria-label="Deny entry">people</button>`, null],
  [`<button aria-label="Lock meeting">people</button>`, null],
  [`<button aria-label="Everyone can chat">people</button>`, null],
  [`<button aria-label="Everyone can send messages">people</button>`, null],
  [`<button aria-label="People settings">people</button>`, null],
  [`<button aria-label="Participants access">people</button>`, null],
  [`<button aria-label="Allow everyone to share">people</button>`, null],
  [`<button aria-label="Show everyone (host)">people</button>`, null],
  [`<button data-tooltip="Let people message">people</button>`, null],
  [`<button title="People settings">people</button>`, null],
  [`<button aria-label="People" style="display:none">people</button>`, null],
  [`<button aria-label="Chat with everyone">chat</button>`, null],
  // SAFE-004: plurals and verb forms of unsafe words
  [`<button aria-label="Meeting options">group</button>`, null],
  [`<button aria-label="More options">people</button>`, null],
  [`<button aria-label="Everyone messages">people</button>`, null],
  [`<button>mic</button>`, null],
  // must be found
  [`<button aria-label="People">people</button>`, "People"],
  [`<button aria-label="Show everyone">x</button>`, "Show everyone"],
  [`<button aria-label="View participants (4)">x</button>`, "View participants (4)"],
  [`<div role="button" aria-label="Participants">x</div>`, "Participants"],
  [`<button data-panel-id="1" aria-label="Side panel">x</button>`, "Side panel"],
  [`<button data-tooltip="People">people</button>`, "people"],
  [`<button><i>people</i></button>`, "people"],
  [`<button><i>group</i></button>`, "group"],
  [`<button title="Everyone">x</button>`, "…"], // Diagnose redacts unknown words (DIAG-001)
  [`<span id="lb">People</span><button aria-labelledby="lb">x</button>`, "…"],
];

test("SAFE-TABLE People-button detection accepts only safe People controls (GRH-032)", async () => {
  const { page, close } = await openMeet({ browser, clock: true, body: `<body><button aria-label="Leave call">call_end</button><div id="slot"></div></body>` });
  const wrong = [];
  for (const [markup, expect] of TABLE) {
    await page.evaluate((m) => { document.getElementById("slot").innerHTML = m; }, markup);
    const pb = (await diagnose(page)).peopleButton;
    const got = pb ? (pb.aria || pb.text || "").trim() : null;
    const ok = expect === null ? pb === null : got === expect;
    if (!ok) wrong.push(`${markup} → ${JSON.stringify(pb)} (expected ${expect})`);
  }
  assert.deepStrictEqual(wrong, [], "People-button detection is wrong for:\n" + wrong.join("\n"));
  assert.deepStrictEqual(await clicks(page), [], "detection must never click");
  await close();
});

module.exports = { trapPage, syncEverything };

if (require.main === module) {
  (async () => {
    browser = await chromium.launch();
    try { await run(); } finally { await browser.close(); }
  })();
}
