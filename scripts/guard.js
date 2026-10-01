#!/usr/bin/env node
// PROTECTED FILE — repo invariants that ESLint can't express. See docs/GUARDRAILS.md (GR-2, GR-4, GR-6, GR-9).
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const cfg = JSON.parse(read("scripts/guardrails.json"));
const errors = [];
const warnings = [];
const fail = (id, msg) => errors.push(`${id}: ${msg}`);

// ---------- GR-6: manifest lock ----------
const manifest = JSON.parse(read("extension/manifest.json"));
const pkg = JSON.parse(read("package.json"));
if (manifest.manifest_version !== 3) fail("GR-6", "manifest_version must be 3");
if (manifest.version !== pkg.version) fail("GR-6", `version mismatch: manifest.json ${manifest.version} vs package.json ${pkg.version}`);
for (const p of manifest.permissions || []) if (!cfg.allowedPermissions.includes(p)) fail("GR-6", `permission "${p}" is not in the allowlist`);
for (const key of ["host_permissions", "optional_permissions", "optional_host_permissions", "background", "externally_connectable", "web_accessible_resources", "content_security_policy"]) {
  if (manifest[key] !== undefined) fail("GR-6", `manifest must not declare "${key}" (needs an ADR)`);
}
const scripts = manifest.content_scripts || [];
if (scripts.length !== 1) fail("GR-6", "expected exactly one content script");
for (const cs of scripts) {
  for (const m of cs.matches || []) if (!cfg.allowedMatches.includes(m)) fail("GR-6", `content script match "${m}" is not allowed`);
  if (cs.all_frames) fail("GR-6", "content script must not run in all frames");
  for (const f of cs.js || []) if (!fs.existsSync(path.join(ROOT, "extension", f))) fail("GR-6", `content script file missing: ${f}`);
}

// ---------- GR-2: UNSAFE_LABEL must stay strict ----------
const src = read("extension/content.js");
const m = src.match(/const UNSAFE_LABEL = \/(.+)\/(\w*);/);
if (!m) fail("GR-2", "UNSAFE_LABEL regex not found in extension/content.js");
else {
  const re = new RegExp(m[1], m[2]);
  for (const w of cfg.requiredUnsafeWords) if (!re.test(`x ${w} y`)) fail("GR-2", `UNSAFE_LABEL no longer matches required word "${w}"`);
  if (!m[2].includes("i")) fail("GR-2", "UNSAFE_LABEL must be case-insensitive");
}
if (!/function safeCandidate\(/.test(src)) fail("GR-2", "safeCandidate() is missing");

// ---------- GR-4: suppression ledger ----------
const walk = (dir) => fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(path.join(dir, e.name)) : e.name.endsWith(".js") ? [path.join(dir, e.name)] : []);
const found = {};
for (const file of walk("extension")) {
  const text = read(file);
  if (/\/\*\s*eslint-disable(?!-)/.test(text)) fail("GR-4", `${file}: file-wide /* eslint-disable */ is forbidden`);
  if (/eslint\s+[a-z-]+\s*:\s*0|eslint\s+[a-z-]+\s*:\s*["']?off/.test(text)) fail("GR-4", `${file}: inline rule config (/* eslint rule: off */) is forbidden`);
  for (const line of text.split("\n")) {
    const d = line.match(/eslint-disable(?:-next)?-line\s+([\w/-]+(?:\s*,\s*[\w/-]+)*)(?:\s+--\s+([A-Z0-9-]+))?/);
    if (!d) continue;
    if (!d[2]) { fail("GR-4", `${file}: eslint-disable without a reason tag: ${line.trim()}`); continue; }
    for (const rule of d[1].split(/\s*,\s*/)) {
      const k = `${file}|${rule}|${d[2]}`;
      found[k] = (found[k] || 0) + 1;
    }
  }
}
const expected = {};
for (const s of cfg.suppressions) expected[`${s.file}|${s.rule}|${s.tag}`] = s.count;
for (const [k, n] of Object.entries(found)) if (expected[k] !== n) fail("GR-4", `unexpected suppression ${k.split("|").join(" / ")}: found ${n}, ledger allows ${expected[k] || 0}`);
for (const [k, n] of Object.entries(expected)) if (!found[k]) fail("GR-4", `ledger entry ${k.split("|").join(" / ")} (${n}) no longer used — remove it from scripts/guardrails.json`);
for (const s of cfg.suppressions) if (s.knownIssue) warnings.push(`known issue ${s.knownIssue} still open: ${s.why}`);

// ---------- GR-9: docs live in docs/ ----------
const SKIP = new Set(["node_modules", ".git", "docs", "dist", "test-results", ".output", ".wxt"]);
const mdOutside = [];
const scan = (dir) => {
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = path.join(dir, e.name);
    if (e.isDirectory()) { if (!SKIP.has(e.name)) scan(rel); }
    else if (/\.md$/i.test(e.name) && !(dir === "" && cfg.rootMarkdownAllowed.includes(e.name)) && !rel.startsWith(".github")) mdOutside.push(rel);
  }
};
scan("");
for (const f of mdOutside) fail("GR-9", `Markdown docs must live in docs/: ${f}`);
const stub = fs.existsSync(path.join(ROOT, "CLAUDE.md")) ? read("CLAUDE.md") : "";
if (!/@docs\/CLAUDE\.md/.test(stub)) fail("GR-9", "root CLAUDE.md must import @docs/CLAUDE.md");
for (const d of ["docs/CLAUDE.md", "docs/GUARDRAILS.md", "docs/PROJECT_NOTES.md"]) if (!fs.existsSync(path.join(ROOT, d))) fail("GR-9", `${d} is missing`);

// ---------- report ----------
for (const w of warnings) console.warn(`⚠  ${w}`);
if (errors.length) {
  console.error(`\n✗ guard: ${errors.length} problem(s)\n` + errors.map((e) => `  - ${e}`).join("\n"));
  console.error("\nFix the change, not the guardrail. See docs/GUARDRAILS.md.");
  process.exit(1);
}
console.log("✓ guard: manifest, unsafe-label, suppression ledger and docs layout OK");
