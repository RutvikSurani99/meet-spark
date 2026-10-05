// PROTECTED FILE — shared helpers for every browser test (docs/GUARDRAILS.md GR-8, GR-15).
// Opens a mock meet.google.com page, injects the extension, drives time with a fake clock
// and records every click that lands on Meet's DOM (GRH-030 click recorder).
const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { chromium } = require("playwright");

const EXT = fs.readFileSync(path.join(__dirname, "../../extension/content.js"), "utf8");
const MEET_URL = "https://meet.google.com/abc-defg-hij";
const DEFAULT_BODY = "<body style='background:#202124;height:100vh'></body>";

// Runs in the page before any other script. Records clicks on Meet's DOM (not on Spark's own Shadow DOM).
function clickRecorder() {
  window.__clicks = [];
  const describe = (el) => ({
    tag: el.tagName ? el.tagName.toLowerCase() : "?",
    label: (el.getAttribute("aria-label") || el.getAttribute("data-tooltip") || el.getAttribute("title") || "").trim(),
    text: (el.textContent || "").trim().slice(0, 40),
    role: el.getAttribute("role"),
    panelId: el.getAttribute("data-panel-id"),
    ariaChecked: el.hasAttribute("aria-checked"),
    ariaPressed: el.hasAttribute("aria-pressed"),
    ariaExpanded: el.getAttribute("aria-expanded"),
    inList: !!el.closest('[role="list"]'),
    trap: el.getAttribute("data-trap"),
  });
  document.addEventListener("click", (e) => {
    const p = e.composedPath();
    if (p.some((n) => n && n.id === "meet-spark-host")) return; // Spark's own UI
    const el = p[0];
    if (el && el.nodeType === 1) window.__clicks.push(describe(el));
  }, true);
}

// COV-004: clipboard stub. Records every navigator.clipboard.writeText() call in window.__clipboard;
// set window.__clipboardFail = true to make the next writes reject (like a denied permission).
function clipboardStub() {
  window.__clipboard = [];
  const writeText = async (t) => { if (window.__clipboardFail) throw new Error("NotAllowedError"); window.__clipboard.push(String(t)); };
  try { Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } }); } catch (e) { /* ignore */ }
}
const clipboard = (page) => page.evaluate(() => window.__clipboard || []);

// The only Meet elements Spark may ever click (GR-2): the People button, and a group header
// ("Contributors" etc.) inside the participants list. Mirrors safeCandidate()/safeClick() in content.js.
const PEOPLE_LABEL = /^(people|show everyone|everyone|participants|show participants|view participants)\b/i;
const PEOPLE_ICON = /^(people|group|groups|people_alt|groups_2)$/i;
const UNSAFE_LABEL = /\b(let|allow|turn|send|message|chat|mute|remove|lock|admit|deny|host|settings|option|access)\b/i;
const GROUP_HEADER = /\b(contributors|in the meeting|in call|participants|others|guests)\b/i;
function isAllowedClick(c) {
  if (c.trap) return false;
  if (["switch", "checkbox", "menuitemcheckbox"].includes(c.role) || c.ariaChecked || c.ariaPressed) return false;
  if (UNSAFE_LABEL.test(c.label)) return false;
  const people = c.panelId === "1" || PEOPLE_LABEL.test(c.label) || PEOPLE_ICON.test(c.text.split(/\s+/)[0] || "");
  const group = c.ariaExpanded != null && c.inList && GROUP_HEADER.test(c.label || c.text);
  return people || group;
}
const clicks = (page) => page.evaluate(() => window.__clicks || []);
async function assertOnlySafeClicks(page, note = "") {
  const bad = (await clicks(page)).filter((c) => !isAllowedClick(c));
  assert.deepStrictEqual(bad, [], `GR-2: Spark clicked Meet controls it must never click ${note}`);
}

// init: extra functions to run in the page before anything else (e.g. to block localStorage).
async function openMeet({ body = DEFAULT_BODY, csp, browser, url = MEET_URL, clock = false, inject = true, init = [] } = {}) {
  const b = browser || (await chromium.launch());
  const context = await b.newContext({ viewport: { width: 1280, height: 820 } });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  // The browser logs its own console errors when setHTML() falls back under a strict Trusted Types CSP.
  // That fallback is expected (docs/CLAUDE.md, Trusted Types), so only those messages are ignored.
  // Chromium words the blocked-policy message as "Refused to create a …" (older) or "Creating a … violates" (1243+) (TTC-001).
  const TT_FALLBACK = /requires 'TrustedHTML' assignment|TrustedTypePolicy named 'meet-spark-/;
  page.on("console", (m) => { if (m.type() === "error" && !TT_FALLBACK.test(m.text())) errors.push(m.text()); });
  await page.addInitScript(clickRecorder);
  await page.addInitScript(clipboardStub);
  for (const fn of init) await page.addInitScript(fn);
  if (clock) await page.clock.install();
  await page.route("https://meet.google.com/**", (r) =>
    r.fulfill({ contentType: "text/html; charset=utf-8", headers: csp ? { "content-security-policy": csp } : {}, body }));
  await page.route("**/*googleusercontent.com/**", (r) => r.fulfill({ status: 200, contentType: "image/png", body: "" }));
  await page.goto(url);
  const doInject = async () => {
    await page.evaluate(EXT);
    await page.waitForFunction(() => !!document.getElementById("meet-spark-host")?.shadowRoot?.querySelector("#launcher"));
  };
  if (inject) await doInject();
  const close = async () => { await context.close(); if (!browser) await b.close(); };
  return { browser: b, context, page, errors, inject: doInject, close };
}

// Advance fake time (needs openMeet({ clock: true })). Never use real sleeps in tests (GRH-060).
const tick = (page, ms) => page.clock.runFor(ms);

// Run fn inside the extension's shadow root: ui(page, (r, arg) => r.querySelector(...), arg)
const ui = (page, fn, arg) =>
  page.evaluate(([src, a]) => (0, eval)(`(${src})`)(document.getElementById("meet-spark-host").shadowRoot, a), [fn.toString(), arg]);

const click = (page, sel) => ui(page, (r, s) => { const el = r.querySelector(s); if (!el) throw new Error("missing " + s); el.click(); }, sel);
const text = (page, sel) => ui(page, (r, s) => r.querySelector(s)?.textContent ?? null, sel);
const storage = (page, key) => page.evaluate((k) => JSON.parse(localStorage.getItem("meetSpark:" + k)), key);
const snack = (page) => ui(page, (r) => ({ text: r.querySelector("#snack").textContent, shown: r.querySelector("#snack").classList.contains("show") }));
const activeView = (page) => ui(page, (r) => [...r.querySelectorAll(".view.active")].map((e) => e.dataset.v));
const names = (page) => ui(page, (r) => [...r.querySelectorAll("#people .person .nm")].map((e) => e.textContent));
const addName = (page, n) => ui(page, (r, v) => { r.querySelector("#addName").value = v; r.querySelector("#addBtn").click(); }, n);
async function diagnose(page) {
  const msg = page.waitForEvent("console", { predicate: (m) => m.text().startsWith("[Meet Spark] diagnostics"), timeout: 5000 });
  await click(page, "#diagBtn");
  return JSON.parse((await msg).text().replace(/^\[Meet Spark\] diagnostics /, ""));
}

// Tiny runner shared by every browser test file. Each file ends with `PASS <name> (N tests)`,
// which tests/run.js requires (GRH-013).
function suite(name) {
  const tests = [];
  return {
    test: (id, fn) => tests.push([id, fn]),
    async run() {
      const results = [];
      let failed = null;
      for (const [id, fn] of tests) {
        const t0 = Date.now();
        try { await fn(); results.push(["✓", id, Date.now() - t0]); }
        catch (e) { results.push(["✗", id, Date.now() - t0]); if (!failed) { e.message = `${id}\n  ${e.message}`; failed = e; } }
      }
      for (const [s, n, ms] of results) console.log(`  ${s} ${n} (${ms} ms)`);
      if (failed) { console.error(failed.stack || failed.message); process.exit(1); }
      console.log(`PASS ${name} (${results.length} tests)`);
    },
  };
}

module.exports = {
  openMeet, tick, ui, click, text, storage, names, addName, diagnose, suite, clipboard, snack, activeView,
  clicks, assertOnlySafeClicks, isAllowedClick, MEET_URL, EXT,
};
