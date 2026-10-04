// PROTECTED FILE — see docs/GUARDRAILS.md §4. Do not loosen rules without an approved ADR.
// tests/lint-bypass.test.js proves every rule below still fires (GRH-023).
const js = require("@eslint/js");
const globals = require("globals");

// GR-2: clicks / synthetic events into Meet's DOM
const G1 = "GR-2: never click into Meet's DOM directly. Use safeClick(el, reason) — the one reviewed click site (docs/GUARDRAILS.md §6).";
// GR-3: Trusted Types / HTML sinks
const G2 = "GR-3: Meet enforces Trusted Types. Use setHTML(el, html) or DOM APIs (textContent, createElement).";
// GR-5: privacy — no network from the extension
const G5 = "GR-5: the extension must not make network requests or navigate.";
// GR-16: Meet's obfuscated attributes/classes change without notice
const G4 = "GR-16: don't select Meet elements by obfuscated attributes (jsname/jscontroller/jsaction) or generated class names. Use aria labels, roles, data-* or text.";

const NETWORK_GLOBALS = "fetch|XMLHttpRequest|WebSocket|EventSource";

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
        // GR-2 (GRH-020): any reference to click/dispatchEvent, including .call/.apply and computed access
        { selector: "MemberExpression[property.name=/^(click|dispatchEvent)$/]", message: G1 },
        { selector: "MemberExpression[computed=true][property.value=/^(click|dispatchEvent)$/]", message: G1 },
        { selector: "CallExpression[callee.object.name='Reflect'][callee.property.name=/^(apply|set|get)$/]", message: G1 },
        // GR-3
        { selector: "AssignmentExpression[left.property.name=/^(innerHTML|outerHTML)$/]", message: G2 },
        { selector: "MemberExpression[computed=true][property.value=/^(innerHTML|outerHTML|insertAdjacentHTML)$/]", message: G2 },
        { selector: "CallExpression[callee.property.name='insertAdjacentHTML']", message: G2 },
        { selector: "CallExpression[callee.object.name='document'][callee.property.name=/^(write|writeln)$/]", message: G2 },
        { selector: "NewExpression[callee.name='DOMParser']", message: G2 },
        { selector: "CallExpression[callee.property.name='createContextualFragment']", message: G2 },
        { selector: "CallExpression[callee.property.name='setAttribute'][arguments.0.value=/^on/i]", message: G2 },
        { selector: "CallExpression[callee.name=/^set(Timeout|Interval)$/][arguments.0.type='Literal']", message: G2 },
        // GR-5 (GRH-021): network through other routes
        { selector: `MemberExpression[object.name=/^(globalThis|self|window|top|parent)$/][property.name=/^(${NETWORK_GLOBALS})$/]`, message: G5 },
        { selector: "NewExpression[callee.name='Image']", message: G5 },
        { selector: "CallExpression[callee.object.name=/^(window|globalThis|self)$/][callee.property.name='open']", message: G5 },
        { selector: "AssignmentExpression[left.name='location']", message: G5 },
        { selector: "AssignmentExpression[left.object.name='location'][left.property.name=/^(href|search|hash|pathname)$/]", message: G5 },
        { selector: "AssignmentExpression[left.property.name='location']", message: G5 },
        { selector: "AssignmentExpression[left.object.property.name='location']", message: G5 },
        { selector: "CallExpression[callee.object.name='location'][callee.property.name=/^(assign|replace)$/]", message: G5 },
        { selector: "ImportExpression", message: G5 },
        { selector: "CallExpression[callee.name='importScripts']", message: G5 },
        // GR-16 (GRH-022): obfuscated Meet selectors
        { selector: "Literal[value=/(jsname|jscontroller|jsaction|jsmodel)\\s*[~|^$*]?=/]", message: G4 },
        { selector: "TemplateElement[value.raw=/(jsname|jscontroller|jsaction|jsmodel)\\s*[~|^$*]?=/]", message: G4 },
        { selector: "CallExpression[callee.name=/^(q|qa)$/] > Literal.arguments:first-child[value=/(^|[\\s,>+~(])\\.[A-Za-z][A-Za-z0-9]{4,6}(?![\\w-])/]", message: G4 },
      ],
      "no-restricted-globals": [
        "error",
        ...NETWORK_GLOBALS.split("|").map((name) => ({ name, message: G5 })),
      ],
      "no-restricted-properties": [
        "error",
        { object: "navigator", property: "sendBeacon", message: G5 },
        { object: "window", property: "fetch", message: G5 },
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
