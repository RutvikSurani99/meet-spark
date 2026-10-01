// Shared helpers for browser tests: opens a mock meet.google.com page and injects the extension.
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const EXT = fs.readFileSync(path.join(__dirname, "../../extension/content.js"), "utf8");
const MEET_URL = "https://meet.google.com/abc-defg-hij";

async function openMeet({ body = "<body style='background:#202124;height:100vh'></body>", csp, browser } = {}) {
  const b = browser || (await chromium.launch());
  const context = await b.newContext({ viewport: { width: 1280, height: 820 } });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.route("https://meet.google.com/**", (r) =>
    r.fulfill({ contentType: "text/html", headers: csp ? { "content-security-policy": csp } : {}, body }));
  await page.goto(MEET_URL);
  const inject = () => page.evaluate(EXT);
  await inject();
  await page.waitForFunction(() => !!document.getElementById("meet-spark-host")?.shadowRoot?.querySelector("#launcher"));
  return { browser: b, context, page, errors, inject };
}

// Run fn inside the extension's shadow root: ui(page, (r, arg) => r.querySelector(...), arg)
const ui = (page, fn, arg) =>
  page.evaluate(([src, a]) => (0, eval)(`(${src})`)(document.getElementById("meet-spark-host").shadowRoot, a), [fn.toString(), arg]);

const click = (page, sel) => ui(page, (r, s) => { const el = r.querySelector(s); if (!el) throw new Error("missing " + s); el.click(); }, sel);
const text = (page, sel) => ui(page, (r, s) => r.querySelector(s)?.textContent ?? null, sel);
const storage = (page, key) => page.evaluate((k) => JSON.parse(localStorage.getItem("meetSpark:" + k)), key);

module.exports = { openMeet, ui, click, text, storage, MEET_URL };
