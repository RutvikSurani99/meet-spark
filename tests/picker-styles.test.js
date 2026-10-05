// Picker popup with six animation styles (docs/specs/picker-styles.md, PSTY-001…035).
// Every test name carries the requirement IDs it proves. Fake clock everywhere: no real waits (GRH-060).
const assert = require("assert");
const { chromium } = require("playwright");
const { openMeet, tick, ui, click, text, storage, suite, assertOnlySafeClicks } = require("./helpers/meet");

const { test, run } = suite("picker-styles");
let browser;
const STYLES = ["slot", "wheel", "spotlight", "cards", "board", "countdown"];
const CALL = `<body><button aria-label="Leave call">call_end</button></body>`;
const people = (n) => Array.from({ length: n }, (_, i) => `First${i + 1} Last${i + 1}`);

async function setup({ n = 0, list = null, style = null, random = false, body, init } = {}) {
  const out = await openMeet({ browser, clock: true, body, init });
  const names = list || people(n);
  if (names.length) await ui(out.page, (r, ns) => { for (const v of ns) { r.querySelector("#addName").value = v; r.querySelector("#addBtn").click(); } }, names);
  if (random) await click(out.page, '#mode [data-m="random"]');
  if (style) await setStyle(out.page, style);
  return { ...out, names };
}
const setStyle = (page, v) => ui(page, (r, s) => { const el = r.querySelector("#pickStyle"); el.value = s; el.dispatchEvent(new Event("change")); }, v);
const state = (page) => ui(page, (r) => ({
  open: !r.querySelector("#psty").hidden,
  style: r.querySelector("#pstyDlg").dataset.style,
  label: r.querySelector("#pstyStyle").textContent,
  revealed: !r.querySelector("#pstyActs").hidden,
  name: r.querySelector("#pstyWin .psty-name")?.textContent ?? null,
  confetti: r.querySelectorAll("#pstyFx .psty-cf").length,
  coins: r.querySelectorAll("#pstyFx .psty-coin").length,
}));
const spokenNow = (page) => storage(page, "spoken:abc-defg-hij").then((v) => v || []);

// Where each style shows the winner once it has landed (PSTY-030…035).
const landed = (page) => ui(page, (r) => {
  const st = r.querySelector("#pstyStage"), style = r.querySelector("#pstyDlg").dataset.style;
  if (style === "slot") return [...st.querySelectorAll(".ps-strip")].map((s) => s.children[s.children.length - 2].dataset.n);
  if (style === "wheel") return [...st.querySelectorAll(".ps-wl")].map((l) => l.dataset.n);
  if (style === "spotlight") return [st.querySelector(".ps-cell.lit")?.dataset.n];
  if (style === "cards") return [st.querySelector(".ps-f.face b")?.dataset.n];
  if (style === "board") return [...st.querySelectorAll(".ps-brow")].map((row) => [...row.children].map((t) => t.textContent).join("").trim());
  if (style === "countdown") return [st.querySelector(".ps-pop .psty-av")?.textContent];
  return [];
});
async function assertLanded(page, w, note) {
  const s = await state(page);
  const got = await landed(page);
  const avatar = await text(page, "#pickedAvatar");
  if (s.style === "slot") assert.deepStrictEqual(got, [w, w, w], `${note}: slot reels`);
  else if (s.style === "wheel") assert.ok(got.includes(w), `${note}: wheel lacks the winner`);
  else if (s.style === "board") { // both rows settle: first name, then the rest of the name, 11 tiles each
    const [first, ...rest] = w.trim().split(/\s+/);
    assert.deepStrictEqual(got, [first, rest.join(" ")].map((t) => t.toUpperCase().slice(0, 11).trim()), `${note}: board`);
  }
  else if (s.style === "countdown") assert.strictEqual(got[0], avatar, `${note}: countdown avatar`);
  else assert.deepStrictEqual(got, [w], `${note}: ${s.style}`);
}

// ---------------- Choosing a style ----------------
test("PSTY-001 PSTY-002 the Animation setting defaults to Surprise me, is remembered, and falls back on bad values", async () => {
  const { page, close } = await setup();
  const opts = await ui(page, (r) => [...r.querySelectorAll("#pickStyle option")].map((o) => o.textContent));
  assert.deepStrictEqual(opts, ["Surprise me", "Slot machine", "Wheel", "Spotlight", "Cards", "Departure board", "Countdown"]);
  assert.strictEqual(await ui(page, (r) => r.querySelector("#pickStyle").value), "surprise");
  await setStyle(page, "wheel");
  assert.strictEqual(await storage(page, "pickStyle"), "wheel");
  await close();
  const saved = await setup({ init: [() => localStorage.setItem("meetSpark:pickStyle", '"wheel"')] });
  assert.strictEqual(await ui(saved.page, (r) => r.querySelector("#pickStyle").value), "wheel");
  await saved.close();
  const bad = await setup({ init: [() => localStorage.setItem("meetSpark:pickStyle", '"disco"')] });
  assert.strictEqual(await ui(bad.page, (r) => r.querySelector("#pickStyle").value), "surprise");
  await bad.close();
});

test("PSTY-003 PSTY-005 a fixed style is used for every pick and its name is shown", async () => {
  const { page, close } = await setup({ n: 4, style: "wheel" });
  for (let i = 0; i < 3; i++) {
    await click(page, "#pickBtn");
    const s = await state(page);
    assert.strictEqual(s.style, "wheel"); assert.strictEqual(s.label, "Wheel");
    await tick(page, 5000); await click(page, "#pstyDone");
  }
  await close();
});

test("PSTY-004 PSTY-018 Surprise me never repeats a style twice in a row; Pick again runs a new pick", async () => {
  const { page, close } = await setup({ n: 5, random: true });
  await click(page, "#pickBtn"); await tick(page, 5000);
  const seen = [(await state(page)).style];
  for (let i = 0; i < 39; i++) { // 40 picks: a repeat would show up almost surely
    await click(page, "#pstyAgain");
    const s = await state(page);
    assert.strictEqual(s.revealed, false, "Pick again did not start a new animation");
    await tick(page, 5000);
    assert.strictEqual((await state(page)).revealed, true);
    seen.push(s.style);
  }
  for (let i = 1; i < seen.length; i++) assert.notStrictEqual(seen[i], seen[i - 1], `same style twice in a row: ${seen}`);
  assert.ok(new Set(seen).size >= 3, `too few styles: ${seen}`);
  assert.ok(seen.every((s) => STYLES.includes(s)));
  await close();
});

// ---------------- The popup ----------------
test("PSTY-010 PSTY-011 PSTY-015 PSTY-019 the popup reveals the already-chosen winner with confetti; Done shows them in the panel", async () => {
  const { page, close } = await setup({ n: 3, style: "slot" });
  await click(page, "#pickBtn");
  const dlg = await ui(page, (r) => { const d = r.querySelector('[role="dialog"][aria-modal="true"]'); return d && d.id; });
  assert.strictEqual(dlg, "pstyDlg");
  assert.strictEqual((await state(page)).open, true);
  const chosen = await spokenNow(page);
  assert.strictEqual(chosen.length, 1, "the winner must be chosen before the animation starts");
  await tick(page, 5000);
  const s = await state(page);
  assert.strictEqual(s.name, chosen[0]);
  assert.ok(s.confetti > 0 && s.coins > 0, "no celebration");
  await assertLanded(page, chosen[0], "slot");
  await click(page, "#pstyDone");
  assert.strictEqual((await state(page)).open, false);
  assert.strictEqual(await text(page, "#pickedName"), chosen[0]);
  assert.ok(await ui(page, (r) => r.querySelector("#picker").classList.contains("done")));
  await close();
});

test("PSTY-012 PSTY-030 PSTY-031 PSTY-032 PSTY-033 PSTY-034 PSTY-035 every style lands on the winner within 5 s for 1 to 300 people", async () => {
  for (const n of [1, 6, 30, 150, 300]) {
    const { page, errors, close } = await setup({ n, random: true });
    for (const style of STYLES) {
      await setStyle(page, style);
      await click(page, "#pickBtn");
      await tick(page, 5000);
      const s = await state(page);
      assert.strictEqual(s.revealed, true, `${style} with ${n} people did not reveal within 5 s`);
      assert.strictEqual(s.style, style);
      await assertLanded(page, s.name, `${style} × ${n}`);
      await click(page, "#pstyDone");
    }
    assert.deepStrictEqual(errors, []);
    await close();
  }
});

test("PSTY-013 big calls stay small: reels ≤ 40 rows, wheel ≤ 12 slices, spotlight ≤ 200 faces, all with the winner", async () => {
  const { page, close } = await setup({ n: 300, random: true });
  for (const style of ["slot", "wheel", "spotlight"]) {
    await setStyle(page, style);
    await click(page, "#pickBtn"); await tick(page, 5000);
    const w = (await state(page)).name;
    const sizes = await ui(page, (r) => ({
      reels: [...r.querySelectorAll(".ps-strip")].map((s) => s.children.length),
      slices: [...r.querySelectorAll(".ps-wl")].map((l) => l.dataset.n),
      faces: [...r.querySelectorAll(".ps-cell")].map((c) => c.dataset.n),
    }));
    if (style === "slot") assert.ok(sizes.reels.length === 3 && sizes.reels.every((k) => k <= 40), `reels ${sizes.reels}`);
    if (style === "wheel") assert.ok(sizes.slices.length === 12 && sizes.slices.includes(w), `wheel ${sizes.slices.length}`);
    if (style === "spotlight") assert.ok(sizes.faces.length === 200 && sizes.faces.includes(w), `spotlight ${sizes.faces.length}`);
    await click(page, "#pstyDone");
  }
  await close();
});

test("PSTY-014 in Everyone once the animation shows only people still to speak", async () => {
  const all = people(30);
  const spoke = all.slice(0, 25);
  const seed = new Function(`localStorage.setItem("meetSpark:manual:abc-defg-hij", ${JSON.stringify(JSON.stringify(all))});
    localStorage.setItem("meetSpark:spoken:abc-defg-hij", ${JSON.stringify(JSON.stringify(spoke))});`);
  const { page, close } = await setup({ init: [seed] });
  for (const style of ["wheel", "spotlight"]) {
    await setStyle(page, style);
    await click(page, "#pickBtn"); await tick(page, 5000);
    const shown = await ui(page, (r) => [...r.querySelectorAll(".ps-wl, .ps-cell")].map((e) => e.dataset.n));
    assert.ok(shown.length > 0 && shown.length <= 5, `${style} showed ${shown.length}`);
    assert.ok(shown.every((n) => !spoke.includes(n)), `${style} showed someone who already spoke`);
    await click(page, "#pstySkip"); await tick(page, 5000); // skipping keeps the round the same size
    await click(page, "#pstyDone");
  }
  await close();
});

test("PSTY-016 PSTY-017 Skip doesn't count the skipped person and picks someone else; Esc closes", async () => {
  const { page, close } = await setup({ n: 3, style: "cards" });
  await click(page, "#pickBtn"); await tick(page, 5000);
  const ids = await ui(page, (r) => [...r.querySelectorAll("#pstyActs button, #pstyClose")].map((b) => b.textContent.trim() || b.getAttribute("aria-label")));
  assert.deepStrictEqual(ids.sort(), ["Close", "Done", "Pick again", "Skip, not here"]);
  const first = (await state(page)).name;
  await click(page, "#pstySkip");
  assert.ok(!(await spokenNow(page)).includes(first), "the skipped person was counted as spoken");
  await tick(page, 5000);
  const second = (await state(page)).name;
  assert.notStrictEqual(second, first);
  assert.deepStrictEqual(await spokenNow(page), [second]);
  await page.keyboard.press("Escape");
  assert.strictEqual((await state(page)).open, false);
  await close();
  // Two people, fully random: every Skip must land on the other person.
  const duo = await setup({ n: 2, style: "countdown", random: true });
  await click(duo.page, "#pickBtn"); await tick(duo.page, 5000);
  let prev = (await state(duo.page)).name;
  for (let i = 0; i < 10; i++) {
    await click(duo.page, "#pstySkip"); await tick(duo.page, 5000);
    const now = (await state(duo.page)).name;
    assert.notStrictEqual(now, prev, "Skip landed on the skipped person again");
    prev = now;
  }
  await duo.close();
  // Only one person: Skip says so and keeps the popup open.
  const solo = await setup({ n: 1, style: "board" });
  await click(solo.page, "#pickBtn"); await tick(solo.page, 5000);
  await click(solo.page, "#pstySkip");
  assert.strictEqual(await text(solo.page, "#snack"), "No one else to pick");
  assert.strictEqual((await state(solo.page)).open, true);
  await solo.close();
});

test("PSTY-020 closing during the animation keeps the pick and leaves no timers running", async () => {
  const { page, close } = await setup({ n: 4, style: "wheel" });
  await click(page, "#pickBtn"); await tick(page, 500);
  const [w] = await spokenNow(page);
  await click(page, "#pstyClose");
  assert.strictEqual((await state(page)).open, false);
  assert.strictEqual(await text(page, "#pickedName"), w);
  await tick(page, 8000);
  const after = await ui(page, (r) => ({ stage: r.querySelector("#pstyStage").children.length, fx: r.querySelector("#pstyFx").children.length, hidden: r.querySelector("#psty").hidden }));
  assert.deepStrictEqual(after, { stage: 0, fx: 0, hidden: true });
  assert.strictEqual(await text(page, "#pickedName"), w);
  await close();
});

test("PSTY-021 a second pick is ignored while the popup is open", async () => {
  const { page, close } = await setup({ n: 4, style: "spotlight" });
  await click(page, "#pickBtn"); await click(page, "#pickBtn"); await tick(page, 300); await click(page, "#pickBtn");
  assert.strictEqual((await spokenNow(page)).length, 1);
  assert.strictEqual(await ui(page, (r) => r.querySelector("#pickBtn").disabled), true);
  await tick(page, 5000); await click(page, "#pstyDone");
  assert.strictEqual(await ui(page, (r) => r.querySelector("#pickBtn").disabled), false);
  await close();
});

test("PSTY-022 with reduce motion on, the popup goes straight to the reveal without confetti", async () => {
  const { page, close } = await setup({ n: 3, style: "slot" });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await click(page, "#pickBtn");
  const s = await state(page);
  assert.strictEqual(s.revealed, true);
  assert.strictEqual(s.name, (await spokenNow(page))[0]);
  assert.strictEqual(s.confetti + s.coins, 0);
  assert.strictEqual(await ui(page, (r) => r.querySelector("#pstyStage").children.length), 0, "no spinning reels");
  await close();
});

test("PSTY-023 the popup works with the keyboard and screen readers", async () => {
  const { page, close } = await setup({ n: 3, style: "countdown" });
  await click(page, "#launcher"); await click(page, ".nav [data-v=people]");
  const a = await ui(page, (r) => { const d = r.querySelector("#pstyDlg"); return [d.getAttribute("role"), d.getAttribute("aria-modal"), d.getAttribute("aria-label"), r.querySelector("#pstyLive").getAttribute("aria-live")]; });
  assert.deepStrictEqual(a, ["dialog", "true", "Picking the next speaker", "polite"]);
  await click(page, "#pickBtn");
  assert.strictEqual(await ui(page, (r) => r.activeElement?.id), "pstyDlg", "focus did not move into the popup");
  await tick(page, 5000);
  const w = (await state(page)).name;
  assert.strictEqual(await text(page, "#pstyLive"), `Next speaker: ${w}`);
  assert.strictEqual(await ui(page, (r) => r.activeElement?.id), "pstyDone");
  const heights = await ui(page, (r) => [...r.querySelectorAll("#pstyActs button, #pstyClose")].map((b) => b.offsetHeight)); // layout size (the pop-in animation scales the box)
  assert.ok(heights.every((h) => h >= 44), `buttons too small: ${heights}`);
  await page.keyboard.press("Tab");
  assert.strictEqual(await ui(page, (r) => r.activeElement?.id), "pstyClose", "Tab must wrap inside the popup");
  await page.keyboard.press("Shift+Tab");
  assert.strictEqual(await ui(page, (r) => r.activeElement?.id), "pstyDone");
  await page.keyboard.press("Escape");
  assert.strictEqual(await ui(page, (r) => r.activeElement?.id), "pickBtn", "focus did not return to the Pick button");
  await close();
});

test("PSTY-024 names with HTML show as text in every style", async () => {
  const evil = "<img src=x onerror=window.__pwned=1>";
  const { page, errors, close } = await setup({ list: [evil], random: true }); // the only person, so always the winner
  for (const style of STYLES) {
    await setStyle(page, style);
    await click(page, "#pickBtn"); await tick(page, 5000);
    assert.strictEqual((await state(page)).name, evil, `${style}: the name was not shown literally`);
    assert.strictEqual(await ui(page, (r) => r.querySelectorAll("#psty img").length), 0, `${style} rendered HTML`);
    await click(page, "#pstyDone");
  }
  assert.strictEqual(await page.evaluate(() => window.__pwned), undefined);
  assert.deepStrictEqual(errors, []);
  await close();
});

test("PSTY-024 every style also works under Meet's strictest Trusted Types CSP (GR-3)", async () => {
  const csp = "require-trusted-types-for 'script'; trusted-types goog#html";
  const out = await openMeet({ browser, clock: true, csp });
  const { page, errors } = out;
  await ui(page, (r, ns) => { for (const v of ns) { r.querySelector("#addName").value = v; r.querySelector("#addBtn").click(); } }, ["Asha Rao", "<b>Bold</b> Name", "Priya"]);
  await click(page, '#mode [data-m="random"]');
  assert.strictEqual(await ui(page, (r) => r.querySelectorAll("#pickStyle option").length), 7);
  for (const style of STYLES) {
    await setStyle(page, style);
    await click(page, "#pickBtn"); await tick(page, 5000);
    const s = await state(page);
    assert.strictEqual(s.revealed, true, style);
    await assertLanded(page, s.name, `${style} under TT`);
    assert.strictEqual(await ui(page, (r) => r.querySelectorAll("#psty b b, #psty script").length), 0);
    await click(page, "#pstyDone");
  }
  assert.deepStrictEqual(errors, []);
  await out.close();
});

test("PSTY-025 the popup never clicks Meet, keeps its keys to itself, and Esc outside it isn't blocked", async () => {
  const body = `<body><script>window.keys = 0; document.addEventListener("keydown", () => window.keys++);</script></body>`;
  const { page, close } = await setup({ n: 3, style: "board", body });
  await click(page, "#pickBtn"); await tick(page, 5000);
  await page.keyboard.press("KeyD"); await page.keyboard.press("Tab");
  assert.strictEqual(await page.evaluate(() => window.keys), 0, "keys inside the popup reached Meet");
  await click(page, "#pstySkip"); await tick(page, 5000); await click(page, "#pstyAgain"); await tick(page, 5000); await click(page, "#pstyDone");
  const prevented = await page.evaluate(() => { const e = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }); document.body.dispatchEvent(e); return e.defaultPrevented; });
  assert.strictEqual(prevented, false);
  await assertOnlySafeClicks(page, "(picker popup)");
  await close();
});

test("PSTY-026 leaving the call or switching meeting closes the popup", async () => {
  const { page, errors, close } = await setup({ n: 3, style: "wheel", body: CALL });
  await click(page, "#pickBtn"); await tick(page, 500);
  await page.evaluate(() => document.querySelector('[aria-label="Leave call"]').remove());
  await tick(page, 2600);
  assert.strictEqual((await state(page)).open, false, "still open after leaving the call");
  await page.evaluate(() => { const b = document.createElement("button"); b.setAttribute("aria-label", "Leave call"); document.body.appendChild(b); });
  await tick(page, 2600);
  await click(page, "#pickBtn"); await tick(page, 500);
  await page.evaluate(() => history.pushState({}, "", "/xyz-abcd-efg"));
  await tick(page, 2600);
  assert.strictEqual((await state(page)).open, false, "still open after switching meeting");
  await tick(page, 6000);
  assert.deepStrictEqual(errors, []);
  await close();
});

test("PSTY-027 Ask stays instant and never opens the popup", async () => {
  const { page, names, close } = await setup({ n: 3 });
  await click(page, "#iceAsk");
  assert.strictEqual((await state(page)).open, false);
  assert.ok(names.includes((await text(page, "#iceTo")).replace("Question for ", "")));
  await close();
});

(async () => {
  browser = await chromium.launch();
  try { await run(); } finally { await browser.close(); }
})();
