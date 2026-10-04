// Detection across known Meet markup shapes, under Trusted Types (GR-8). Fake clock: no real waiting.
// To add a shape from a real Diagnose report, add a button variant or a row style below.
const assert = require("assert");
const { chromium } = require("playwright");
const { openMeet, tick, names, assertOnlySafeClicks, suite } = require("./helpers/meet");

const { test, run } = suite("markup-variants");
let browser;

const BUTTONS = {
  A: `<div><button aria-label="Show everyone"><i>people</i></button><div class="badge">4</div></div>`,
  B: `<div><button data-tooltip="People"><i class="google-symbols">people</i></button><div>4</div></div>`,
};
const ROWS = {
  aria: `'<div role="listitem" aria-label="'+n+'"><span>'+n+'</span><i>mic_off</i></div>'`,
  text: `'<div role="listitem"><img><div><span class="notranslate">'+n+'</span></div><i>more_vert</i></div>'`,
};
const CSP = "require-trusted-types-for 'script'; trusted-types goog#html";

// Test IDs are listed literally so the guard's test inventory can find them (GRH-012).
const CASES = [["VARIANT-A-aria", "A", "aria"], ["VARIANT-A-text", "A", "text"], ["VARIANT-B-aria", "B", "aria"], ["VARIANT-B-text", "B", "text"]];
for (const [id, k, style] of CASES) {
  const btn = BUTTONS[k], rowJs = ROWS[style];
  test(`${id} button ${k} with ${style} rows`, async () => {
    const body = `<body style="background:#202124;height:100vh">
      <div data-participant-id="x1"><div class="notranslate">Rutvik Bharat</div></div>
      <div style="position:fixed;bottom:10px;right:10px">${btn}<button aria-label="Leave call"><i>call_end</i></button></div>
      <aside id="side"></aside>
      <script>
       const pol = trustedTypes.createPolicy('goog#html', { createHTML: x => x }); const P = ['Rutvik Bharat (You)', 'Asha Rao', 'Vikram Singh', 'Priya Nair'];
       document.querySelector('button').addEventListener('click', () => { const s = document.getElementById('side');
        if (s.childElementCount) { s.replaceChildren(); return; }
        s.innerHTML = pol.createHTML('<h2>People</h2><div role="list">' + P.map(n => ${rowJs}).join('') + '</div>'); });
      </script></body>`;
    const { page, errors, close } = await openMeet({ browser, clock: true, body, csp: CSP });
    await tick(page, 9000);
    assert.deepStrictEqual(await names(page), ["Asha Rao", "Priya Nair", "Rutvik Bharat", "Vikram Singh"]);
    assert.strictEqual(await page.evaluate(() => document.getElementById("side").childElementCount), 0, "People panel left open");
    await assertOnlySafeClicks(page);
    assert.deepStrictEqual(errors, []);
    await close();
  });
}

(async () => {
  browser = await chromium.launch();
  try { await run(); } finally { await browser.close(); }
})();
