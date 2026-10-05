// The error collector ignores only Spark's own blocked-policy message (docs/specs/trusted-types-console.md TTC-001, TTC-002).
const assert = require("assert");
const { chromium } = require("playwright");
const { openMeet, suite } = require("./helpers/meet");

const { test, run } = suite("tt-console");
let browser;
const CSP = "require-trusted-types-for 'script'; trusted-types goog#html";

test("TTC-001 Spark's blocked policy under the strictest CSP is not counted as an error, in any Chromium wording", async () => {
  const { errors, close } = await openMeet({ browser, csp: CSP });
  assert.deepStrictEqual(errors, []);
  await close();
});

test("TTC-002 a blocked policy with any other name is still reported", async () => {
  const body = `<body><script>try { trustedTypes.createPolicy("other-policy", { createHTML: (h) => h }); } catch (e) { /* logged by the browser */ }</script></body>`;
  const { errors, close } = await openMeet({ browser, csp: CSP, body });
  assert.strictEqual(errors.length, 1, `expected exactly the other-policy violation, got ${JSON.stringify(errors)}`);
  assert.match(errors[0], /TrustedTypePolicy named 'other-policy'/);
  await close();
});

(async () => {
  browser = await chromium.launch();
  try { await run(); } finally { await browser.close(); }
})();
