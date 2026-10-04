// GR-3: the UI must render and work under Meet's Trusted Types CSP, in both strictness levels.
const assert = require("assert");
const { chromium } = require("playwright");
const { openMeet, ui, suite } = require("./helpers/meet");

const { test, run } = suite("trusted-types");
let browser;

const CSPS = {
  "TT-1": "require-trusted-types-for 'script'",
  "TT-2": "require-trusted-types-for 'script'; trusted-types goog#html",
};

for (const [id, csp] of Object.entries(CSPS)) {
  test(`${id} renders and works under CSP: ${csp}`, async () => {
    const { page, errors, close } = await openMeet({ browser, csp });
    const res = await ui(page, (r) => {
      r.querySelector("#launcher").click();
      r.querySelector(".nav [data-v=bingo]").click(); r.querySelectorAll(".cell")[0].click();
      r.querySelector(".nav [data-v=people]").click();
      r.querySelector("#addName").value = "Asha"; r.querySelector("#addBtn").click();
      return { cells: r.querySelectorAll(".cell").length, people: [...r.querySelectorAll(".person .nm")].map((e) => e.textContent), open: r.querySelector("#panel").classList.contains("open") };
    });
    assert.deepStrictEqual(res, { cells: 25, people: ["Asha"], open: true });
    assert.deepStrictEqual(errors, []);
    await close();
  });
}

(async () => {
  browser = await chromium.launch();
  try { await run(); } finally { await browser.close(); }
})();
