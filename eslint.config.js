// PROTECTED FILE — see docs/GUARDRAILS.md §4. Do not loosen rules without an approved ADR.
const js = require("@eslint/js");
const globals = require("globals");

// GR-2: clicks / synthetic events into Meet's DOM
const G1 = "GR-2: never click into Meet's DOM directly. Clicks must pass safeCandidate() and be reviewed (docs/GUARDRAILS.md §6).";
// GR-3: Trusted Types / HTML sinks
const G2 = "GR-3: Meet enforces Trusted Types. Use setHTML(el, html) or DOM APIs (textContent, createElement).";

module.exports = [
  { ignores: ["node_modules/**", "dist/**", "test-results/**"] },
  js.configs.recommended,
  {
    linterOptions: { reportUnusedDisableDirectives: "error", noInlineConfig: false },
  },
  {
    files: ["extension/**/*.js"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "script",
      globals: { ...globals.browser, chrome: "readonly" },
    },
    rules: {
      "no-restricted-syntax": [
        "error",
        { selector: "CallExpression[callee.property.name='click']", message: G1 },
        { selector: "CallExpression[callee.property.name='dispatchEvent']", message: G1 },
        { selector: "AssignmentExpression[left.property.name=/^(innerHTML|outerHTML)$/]", message: G2 },
        { selector: "CallExpression[callee.property.name='insertAdjacentHTML']", message: G2 },
        { selector: "CallExpression[callee.object.name='document'][callee.property.name=/^(write|writeln)$/]", message: G2 },
        { selector: "NewExpression[callee.name='DOMParser']", message: G2 },
        { selector: "CallExpression[callee.property.name='createContextualFragment']", message: G2 },
        { selector: "CallExpression[callee.property.name='setAttribute'][arguments.0.value=/^on/i]", message: G2 },
        { selector: "CallExpression[callee.name=/^set(Timeout|Interval)$/][arguments.0.type='Literal']", message: G2 },
      ],
      // GR-5: privacy — no network from the extension
      "no-restricted-globals": [
        "error",
        { name: "fetch", message: "GR-5: the extension must not make network requests." },
        { name: "XMLHttpRequest", message: "GR-5: the extension must not make network requests." },
        { name: "WebSocket", message: "GR-5: the extension must not make network requests." },
        { name: "EventSource", message: "GR-5: the extension must not make network requests." },
      ],
      "no-restricted-properties": [
        "error",
        { object: "navigator", property: "sendBeacon", message: "GR-5: the extension must not make network requests." },
        { object: "window", property: "fetch", message: "GR-5: the extension must not make network requests." },
      ],
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      eqeqeq: ["error", "always", { null: "ignore" }],
      "no-empty": ["error", { allowEmptyCatch: true }],
      "no-useless-escape": "off", // pre-existing regex style; harmless
      "no-unused-vars": ["error", { args: "none", caughtErrors: "none" }],
    },
  },
  {
    files: ["tests/**/*.js", "scripts/**/*.js", "eslint.config.js"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "commonjs",
      // tests run code inside the page via page.evaluate(), so browser globals are valid there too
      globals: { ...globals.node, ...globals.browser, trustedTypes: "readonly" },
    },
    rules: { "no-unused-vars": ["error", { args: "none", caughtErrors: "none" }] },
  },
];
