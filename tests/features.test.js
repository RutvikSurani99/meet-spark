// PROTECTED FILE — GR-8 feature regression suite. See docs/GUARDRAILS.md §3.
// Locks current behaviour of every user-facing feature. Add tests freely;
// never delete or loosen an assertion without explicit approval.
const assert = require("assert");
const { chromium } = require("playwright");
const { openMeet, ui, click, text, storage, tick, names, addName, clicks, assertOnlySafeClicks, diagnose } = require("./helpers/meet");
const { ICEBREAKERS, WYR, BINGO } = require("./helpers/content");

const results = [];
async function test(name, fn) {
  const t0 = Date.now();
  try { await fn(); results.push(["✓", name, Date.now() - t0]); }
  catch (e) { results.push(["✗", name, Date.now() - t0]); e.message = `${name}\n  ${e.message}`; throw e; }
}

(async () => {
  const browser = await chromium.launch();
  const fresh = () => openMeet({ browser });
  let failed = null;
  try {
    // ---------------- Launcher & panel ----------------
    await test("LAUNCH-1 host mounts exactly once and launcher is visible", async () => {
      const { page, errors, context } = await fresh();
      assert.strictEqual(await page.evaluate(() => document.querySelectorAll("#meet-spark-host").length), 1);
      assert.strictEqual(await text(page, "#launcher span"), "Spark");
      assert.deepStrictEqual(errors, []);
      await context.close();
    });

    await test("LAUNCH-2 launcher, Close button and Alt+S toggle the panel", async () => {
      const { page, context } = await fresh();
      const isOpen = () => ui(page, (r) => r.querySelector("#panel").classList.contains("open"));
      assert.strictEqual(await isOpen(), false);
      await click(page, "#launcher"); assert.strictEqual(await isOpen(), true);
      await click(page, "#close"); assert.strictEqual(await isOpen(), false);
      await page.keyboard.press("Alt+KeyS"); assert.strictEqual(await isOpen(), true);
      await page.keyboard.press("Alt+KeyS"); assert.strictEqual(await isOpen(), false);
      await context.close();
    });

    await test("TABS-1 each tab shows its view and the last tab is remembered", async () => {
      const { page, context, inject } = await fresh();
      for (const v of ["wyr", "bingo", "people", "ice"]) {
        await click(page, `.nav [data-v=${v}]`);
        const active = await ui(page, (r) => [...r.querySelectorAll(".view.active")].map((e) => e.dataset.v));
        assert.deepStrictEqual(active, [v]);
        assert.strictEqual(await storage(page, "tab"), v);
      }
      await click(page, ".nav [data-v=bingo]");
      await page.reload(); await inject();
      await page.waitForFunction(() => !!document.getElementById("meet-spark-host"));
      assert.deepStrictEqual(await ui(page, (r) => [...r.querySelectorAll(".view.active")].map((e) => e.dataset.v)), ["bingo"]);
      await context.close();
    });

    // ---------------- Icebreakers ----------------
    await test("ICE-1 shows the 4 categories in order", async () => {
      const { page, context } = await fresh();
      assert.deepStrictEqual(await ui(page, (r) => [...r.querySelectorAll("#cats .chip")].map((c) => c.textContent)), ["Warm-up", "Work", "Fun", "Reflective"]);
      await context.close();
    });

    await test("ICE-2 questions come from the chosen category, no repeats until the deck is used up", async () => {
      const { page, context } = await fresh();
      for (const cat of Object.keys(ICEBREAKERS)) {
        await ui(page, (r, c) => r.querySelector(`#cats .chip[data-c="${c}"]`).click(), cat);
        const deck = ICEBREAKERS[cat];
        // clicking a chip draws the first question
        const seen = [await text(page, "#iceQ")];
        for (let i = 1; i < deck.length; i++) { await click(page, "#iceNext"); seen.push(await text(page, "#iceQ")); }
        assert.strictEqual(new Set(seen).size, deck.length, `${cat}: repeated a question before the deck was used up`);
        seen.forEach((q) => assert.ok(deck.includes(q), `${cat}: "${q}" is not in this category`));
        assert.strictEqual(await text(page, "#iceCounter"), `${cat} · ${deck.length} of ${deck.length}`);
        assert.strictEqual(await storage(page, "cat"), cat);
      }
      await context.close();
    });

    await test("ICE-3 Ask addresses an active participant", async () => {
      const { page, context } = await fresh();
      await ui(page, (r) => { const i = r.querySelector("#addName"); i.value = "Asha Rao"; r.querySelector("#addBtn").click(); });
      await click(page, "#iceAsk");
      assert.strictEqual(await text(page, "#iceTo"), "Question for Asha Rao");
      assert.ok(Object.values(ICEBREAKERS).flat().includes(await text(page, "#iceQ")));
      await context.close();
    });

    // ---------------- This or that ----------------
    await test("WYR-1 shows real pairs with no repeats across the whole deck", async () => {
      const { page, context } = await fresh();
      const seen = new Set();
      for (let i = 0; i < WYR.length; i++) {
        await click(page, "#wyrNext");
        const pair = [await text(page, "#wyrA"), await text(page, "#wyrB")];
        assert.ok(WYR.some((p) => p[0] === pair[0] && p[1] === pair[1]), `unknown pair ${pair}`);
        seen.add(pair.join("|"));
      }
      assert.strictEqual(seen.size, WYR.length);
      await context.close();
    });

    // ---------------- Bingo ----------------
    await test("BINGO-1 card has 25 cells, FREE centre, 24 unique real items", async () => {
      const { page, context } = await fresh();
      const cells = await ui(page, (r) => [...r.querySelectorAll("#grid .cell")].map((c) => c.textContent));
      assert.strictEqual(cells.length, 25);
      assert.strictEqual(cells[12], "FREE");
      const items = cells.filter((_, i) => i !== 12);
      assert.strictEqual(new Set(items).size, 24);
      items.forEach((t) => assert.ok(BINGO.includes(t), `unknown bingo item "${t}"`));
      await context.close();
    });

    await test("BINGO-2 marking cells, scoring a line, persisting and New card", async () => {
      const { page, context, inject } = await fresh();
      const cell = (i) => ui(page, (r, n) => r.querySelectorAll("#grid .cell")[n].click(), i);
      await cell(0);
      assert.ok(await ui(page, (r) => r.querySelectorAll("#grid .cell")[0].classList.contains("on")));
      await cell(0); // unmark
      assert.ok(!(await ui(page, (r) => r.querySelectorAll("#grid .cell")[0].classList.contains("on"))));
      for (const i of [0, 1, 2, 3, 4]) await cell(i);
      assert.strictEqual(await text(page, "#bingoScore"), "5 marked · 1 line");
      assert.strictEqual(await ui(page, (r) => r.querySelectorAll("#grid .cell.win").length), 5);
      const saved = await storage(page, "bingo_in");
      assert.deepStrictEqual(saved.won.length, 1);
      const before = await ui(page, (r) => [...r.querySelectorAll("#grid .cell")].map((c) => c.textContent).join("|"));
      await page.reload(); await inject();
      await page.waitForFunction(() => !!document.getElementById("meet-spark-host"));
      assert.strictEqual(await ui(page, (r) => [...r.querySelectorAll("#grid .cell")].map((c) => c.textContent).join("|")), before, "card not restored after reload");
      assert.strictEqual(await text(page, "#bingoScore"), "5 marked · 1 line");
      await click(page, "#bingoNew");
      assert.strictEqual(await text(page, "#bingoScore"), "0 marked · 0 lines");
      assert.deepStrictEqual((await storage(page, "bingo_in")).marked, [12]);
      await context.close();
    });

    // ---------------- Speakers: names ----------------
    await test("SPK-1 add (button + Enter), sorted list, badge, persisted per meeting", async () => {
      const { page, context, inject } = await fresh();
      await click(page, "#launcher"); // input must be visible to take keyboard focus
      await click(page, ".nav [data-v=people]");
      await ui(page, (r) => { const i = r.querySelector("#addName"); i.value = "Vikram Singh"; r.querySelector("#addBtn").click(); });
      await ui(page, (r) => { r.querySelector("#addName").value = "Asha Rao"; });
      await page.evaluate(() => {
        const i = document.getElementById("meet-spark-host").shadowRoot.querySelector("#addName");
        i.focus();
      });
      await page.keyboard.press("Enter");
      const names = () => ui(page, (r) => [...r.querySelectorAll("#people .person .nm")].map((e) => e.textContent));
      assert.deepStrictEqual(await names(), ["Asha Rao", "Vikram Singh"]);
      assert.strictEqual(await text(page, "#navCount"), "2");
      assert.strictEqual(await text(page, "#peopleHead"), "Participants (2)");
      assert.deepStrictEqual((await storage(page, "manual:abc-defg-hij")).sort(), ["Asha Rao", "Vikram Singh"]);
      await page.reload(); await inject();
      await page.waitForFunction(() => !!document.getElementById("meet-spark-host"));
      assert.deepStrictEqual(await names(), ["Asha Rao", "Vikram Singh"], "names not restored after reload");
      await context.close();
    });

    await test("SPK-2 remove and exclude", async () => {
      const { page, context } = await fresh();
      for (const n of ["Asha Rao", "Priya Nair", "Vikram Singh"]) await ui(page, (r, v) => { r.querySelector("#addName").value = v; r.querySelector("#addBtn").click(); }, n);
      await ui(page, (r) => r.querySelector('#people .person[data-n="Priya Nair"] .rm').click());
      assert.deepStrictEqual(await ui(page, (r) => [...r.querySelectorAll("#people .nm")].map((e) => e.textContent)), ["Asha Rao", "Vikram Singh"]);
      await ui(page, (r) => r.querySelector('#people .person[data-n="Asha Rao"] .toggle').click());
      assert.ok(await ui(page, (r) => r.querySelector('#people .person[data-n="Asha Rao"]').classList.contains("out")));
      assert.deepStrictEqual(await storage(page, "excluded:abc-defg-hij"), ["Asha Rao"]);
      await context.close();
    });

    await test("SPK-3 HTML in a name is shown as text, never parsed", async () => {
      const { page, context, errors } = await fresh();
      const evil = '<img src=x onerror="window.__pwned=1">';
      await ui(page, (r, v) => { r.querySelector("#addName").value = v; r.querySelector("#addBtn").click(); }, evil);
      assert.strictEqual(await ui(page, (r) => r.querySelectorAll("#people img").length), 0);
      assert.strictEqual(await page.evaluate(() => window.__pwned || 0), 0);
      assert.ok((await ui(page, (r) => [...r.querySelectorAll("#people .nm")].map((e) => e.textContent))).includes(evil));
      assert.deepStrictEqual(errors, []);
      await context.close();
    });

    // ---------------- Speakers: picking ----------------
    await test("SPK-4 'Everyone once' picks each active person once, never an excluded one, then restarts", async () => {
      const { page, context } = await fresh();
      for (const n of ["Asha Rao", "Priya Nair", "Vikram Singh", "Meera Iyer"]) await ui(page, (r, v) => { r.querySelector("#addName").value = v; r.querySelector("#addBtn").click(); }, n);
      await ui(page, (r) => r.querySelector('#people .person[data-n="Meera Iyer"] .toggle').click()); // exclude
      const picked = [];
      for (let i = 0; i < 3; i++) { await click(page, "#iceAsk"); picked.push((await text(page, "#iceTo")).replace("Question for ", "")); }
      assert.deepStrictEqual([...picked].sort(), ["Asha Rao", "Priya Nair", "Vikram Singh"]);
      assert.deepStrictEqual((await storage(page, "spoken:abc-defg-hij")).sort(), ["Asha Rao", "Priya Nair", "Vikram Singh"]);
      await click(page, "#iceAsk"); // round complete → new round
      const fourth = (await text(page, "#iceTo")).replace("Question for ", "");
      assert.ok(["Asha Rao", "Priya Nair", "Vikram Singh"].includes(fourth));
      assert.strictEqual((await storage(page, "spoken:abc-defg-hij")).length, 1);
      await context.close();
    });

    await test("SPK-5 Pick animation lands on a real name; Reset clears the round", async () => {
      const { page, context } = await fresh();
      for (const n of ["Asha Rao", "Priya Nair"]) await ui(page, (r, v) => { r.querySelector("#addName").value = v; r.querySelector("#addBtn").click(); }, n);
      await click(page, ".nav [data-v=people]");
      await click(page, "#pickBtn");
      await page.waitForFunction(() => document.getElementById("meet-spark-host").shadowRoot.querySelector("#picker").classList.contains("done"), null, { timeout: 8000 });
      assert.ok(["Asha Rao", "Priya Nair"].includes(await text(page, "#pickedName")));
      assert.strictEqual(await text(page, "#pickedSub"), "1 of 2 still to speak");
      await click(page, "#resetRound");
      assert.strictEqual(await text(page, "#pickedName"), "Who's next?");
      assert.deepStrictEqual(await storage(page, "spoken:abc-defg-hij"), []);
      await context.close();
    });

    await test("SPK-6 no participants: picking asks you to add names", async () => {
      const { page, context } = await fresh();
      await click(page, "#pickBtn");
      assert.match(await text(page, "#snack"), /No participants yet/);
      await context.close();
    });

    // ---------------- Settings ----------------
    await test("SET-1 auto-sync switch toggles and persists", async () => {
      const { page, context } = await fresh();
      const on = () => ui(page, (r) => r.querySelector("#autoSync").classList.contains("on"));
      assert.strictEqual(await on(), true);
      await click(page, "#autoSync");
      assert.strictEqual(await on(), false);
      assert.strictEqual(await storage(page, "autoSync"), false);
      await click(page, "#autoSync");
      assert.strictEqual(await on(), true);
      await context.close();
    });

    // ---------------- Added by docs/specs/guardrails-hardening.md (GRH-040..044) ----------------
    await test("BINGO-3 all 12 lines score (5 rows, 5 columns, 2 diagonals) and FREE counts", async () => {
      const { page, context } = await fresh();
      const LINES = [];
      for (let i = 0; i < 5; i++) { LINES.push([0, 1, 2, 3, 4].map((j) => i * 5 + j)); LINES.push([0, 1, 2, 3, 4].map((j) => j * 5 + i)); }
      LINES.push([0, 6, 12, 18, 24], [4, 8, 12, 16, 20]);
      for (const line of LINES) {
        await click(page, "#bingoNew");
        for (const i of line) if (i !== 12) await ui(page, (r, n) => r.querySelectorAll("#grid .cell")[n].click(), i);
        const marked = line.filter((i) => i !== 12).length;
        assert.strictEqual(await text(page, "#bingoScore"), `${marked} marked · 1 line`, `line ${line} did not score`);
        const win = await ui(page, (r) => [...r.querySelectorAll("#grid .cell.win")].map((c) => +c.dataset.i));
        line.filter((i) => i !== 12).forEach((i) => assert.ok(win.includes(i), `cell ${i} of line ${line} not highlighted`));
      }
      await context.close();
    });

    const PANEL_PAGE = (people) => `<body style="background:#202124;height:100vh">
      <div data-participant-id="a"><span class="notranslate">Rutvik Bharat</span></div>
      <button aria-label="Leave call">call_end</button>
      <div><button data-panel-id="1" aria-label="People">people</button><span id="cnt">${people.length}</span></div>
      <div id="side"></div>
      <script>window.PEOPLE=${JSON.stringify(people)};
      document.querySelector('[data-panel-id="1"]').onclick=()=>{const s=document.getElementById('side');
        if(s.childElementCount){s.replaceChildren();return;}
        s.innerHTML='<div role="list" aria-label="Participants">'+PEOPLE.map(n=>'<div role="listitem" aria-label="'+n+'">'+n+'</div>').join('')+'</div>';};</script></body>`;

    await test("SET-2 auto-sync OFF never clicks the People button; ON does", async () => {
      const { page, context } = await openMeet({ browser, clock: true, body: PANEL_PAGE(["Rutvik Bharat (You)", "Asha Rao", "Vikram Singh"]) });
      await click(page, "#autoSync"); // OFF before the first automatic sync
      await tick(page, 20000);
      await page.evaluate(() => { window.PEOPLE.push("Meera Iyer"); document.getElementById("cnt").textContent = "4"; });
      await tick(page, 30000);
      assert.strictEqual((await clicks(page)).length, 0, "auto-sync is OFF but Spark clicked Meet's DOM");
      await click(page, "#autoSync"); // ON → syncs straight away
      await tick(page, 6000);
      assert.ok((await clicks(page)).length > 0, "auto-sync ON did not sync");
      await assertOnlySafeClicks(page);
      await context.close();
    });

    await test("DIAG-1 Diagnose report masks participant names", async () => {
      const people = ["Rutvik Bharat (You)", "Asha Rao", "Vikram Singh", "Priya Nair"];
      const { page, context } = await openMeet({ browser, clock: true, body: PANEL_PAGE(people) + "<div data-participant-id='b'><span class='notranslate'>Priya Nair</span></div>" });
      await tick(page, 10000);
      await page.evaluate(() => document.querySelector('[data-panel-id="1"]').click()); // the user opens the People panel
      const report = JSON.stringify(await diagnose(page));
      for (const w of ["Asha", "Vikram", "Priya", "Nair", "Rutvik", "Bharat"]) assert.ok(!report.includes(w), `Diagnose leaked "${w}"`);
      await context.close();
    });

    await test("ROSTER-EXP passively seen names expire after 90 s, not before (ROSTER-003, GRH-043)", async () => {
      const body = `<body><button aria-label="Leave call">call_end</button>
        <div data-participant-id="a"><span class="notranslate">Asha Rao</span></div>
        <div data-participant-id="b" id="v"><span class="notranslate">Vikram Singh</span></div></body>`;
      const { page, context } = await openMeet({ browser, clock: true, body });
      await tick(page, 10000);
      assert.deepStrictEqual(await names(page), ["Asha Rao", "Vikram Singh"]);
      await page.evaluate(() => document.getElementById("v").remove()); // Vikram scrolls out of view
      await tick(page, 85000);
      assert.deepStrictEqual(await names(page), ["Asha Rao", "Vikram Singh"], "expired before 90 s");
      await tick(page, 10000);
      assert.deepStrictEqual(await names(page), ["Asha Rao"], "not expired after 90 s");
      await context.close();
    });

    // GRH-044
    await test("SPK-7 Pick never lands on an excluded or removed name", async () => {
      const { page, context } = await openMeet({ browser, clock: true });
      for (const n of ["Asha Rao", "Priya Nair", "Vikram Singh", "Meera Iyer"]) await addName(page, n);
      await ui(page, (r) => r.querySelector('#people .person[data-n="Meera Iyer"] .toggle').click()); // exclude
      await ui(page, (r) => r.querySelector('#people .person[data-n="Vikram Singh"] .rm').click()); // remove
      await click(page, '#mode [data-m="random"]');
      const seen = new Set();
      for (let i = 0; i < 30; i++) { await click(page, "#pickBtn"); await tick(page, 6000); seen.add(await text(page, "#pickedName")); }
      assert.ok(!seen.has("Meera Iyer") && !seen.has("Vikram Singh"), `picked ${[...seen]}`);
      assert.deepStrictEqual([...seen].sort(), ["Asha Rao", "Priya Nair"]);
      await context.close();
    });
  } catch (e) { failed = e; }
  finally { await browser.close(); }

  for (const [s, n, ms] of results) console.log(`  ${s} ${n} (${ms} ms)`);
  if (failed) { console.error(failed.message); process.exit(1); }
  console.log(`PASS features (${results.length} tests)`);
})();
