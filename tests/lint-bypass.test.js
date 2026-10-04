// GRH-023 — lint self-test. Proves every GR-2/GR-3/GR-5/GR-16 lint rule still fires, so removing or
// loosening a rule in eslint.config.js fails the build. Node only (no browser).
const assert = require("assert");
const path = require("path");
const { ESLint } = require("eslint");

// Each snippet must produce at least one lint error when it appears in extension/.
const MUST_FAIL = [
  // GR-2: clicks into Meet
  "el.click();",
  'el["click"]();',
  "HTMLElement.prototype.click.call(el);",
  "const c = el.click; c();",
  "el.dispatchEvent(new MouseEvent('click'));",
  "Reflect.apply(HTMLElement.prototype.click, el, []);",
  // GR-3: HTML sinks
  "el.innerHTML = s;",
  'el["innerHTML"] = s;',
  "el.outerHTML = s;",
  "el.insertAdjacentHTML('beforeend', s);",
  "new DOMParser();",
  "document.write(s);",
  "setTimeout('alert(1)', 1);",
  "el.setAttribute('onclick', s);",
  // GR-5: network / navigation
  "fetch(u);",
  "globalThis.fetch(u);",
  "self.fetch(u);",
  "window.fetch(u);",
  "new XMLHttpRequest();",
  "new WebSocket(u);",
  "navigator.sendBeacon(u, d);",
  "new Image().src = u;",
  "window.open(u);",
  "location.href = u;",
  "window.location = u;",
  "location.assign(u);",
  "import(u);",
  // GR-16: obfuscated selectors (DETECT-001: leaveButton() must never use jsname again)
  `document.querySelector('[jsname="CQylAd"]');`,
  "q('[jscontroller=abc]');",
  "qa('.NzPR9b');",
  "q('div .VfPpkd');",
  // eval family
  "eval(s);",
  "new Function(s);",
];

// Ordinary code that must stay legal (keeps the rules from being so broad they get disabled).
const MUST_PASS = [
  "el.addEventListener('click', () => {});",
  "el.textContent = s;",
  "q('.notranslate');",
  "qa('[role=\"listitem\"]', el);",
  "location.pathname.split('/');",
  "setTimeout(() => {}, 10);",
];

(async () => {
  const eslint = new ESLint({ cwd: path.join(__dirname, "..") });
  const lint = async (code) => {
    const src = `/* global el, s, u, d, q, qa */\n${code}\n`;
    const [r] = await eslint.lintText(src, { filePath: path.join(__dirname, "..", "extension", "__lint_fixture__.js") });
    return r.messages.filter((m) => m.severity === 2 && !["no-unused-vars", "no-undef"].includes(m.ruleId));
  };
  const escaped = [];
  for (const code of MUST_FAIL) if (!(await lint(code)).length) escaped.push(code);
  const flagged = [];
  for (const code of MUST_PASS) { const m = await lint(code); if (m.length) flagged.push(`${code} → ${m[0].message}`); }
  console.log(`  ${escaped.length ? "✗" : "✓"} LINT-1 ${MUST_FAIL.length} banned patterns are all reported`);
  console.log(`  ${flagged.length ? "✗" : "✓"} LINT-2 ${MUST_PASS.length} ordinary patterns stay legal`);
  assert.deepStrictEqual(escaped, [], "lint rules no longer catch:\n" + escaped.join("\n"));
  assert.deepStrictEqual(flagged, [], "lint rules wrongly flag:\n" + flagged.join("\n"));
  console.log("PASS lint-bypass (2 tests)");
})().catch((e) => { console.error(e.message); process.exit(1); });
