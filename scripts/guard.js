#!/usr/bin/env node
// PROTECTED FILE — repo invariants that ESLint can't express. See docs/GUARDRAILS.md.
// Checks: GR-2 unsafe label · GR-4 suppression ledger · GR-6 manifest lock · GR-8 test inventory (GRH-012)
// · GR-9 docs layout + dangling doc paths (GRH-070) · GR-10 protected-file fingerprints (GRH-014) and
// Claude Code settings (GRH-001, GRH-003, GRH-010) · GR-11 locked gate scripts (GRH-011)
// · GR-13 spec traceability (GRH-072) · test hygiene: no sleeps, no writes outside test-results/ (GRH-060, GRH-062).
//
// `node scripts/guard.js --relock` rewrites scripts/guardrails.lock.json after an APPROVED change to a
// protected file. Claude Code is denied this command (.claude/settings.json); the diff shows up in review.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.join(__dirname, "..");
const exists = (p) => fs.existsSync(path.join(ROOT, p));
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const cfg = JSON.parse(read("scripts/guardrails.json"));
const errors = [];
const warnings = [];
const fail = (id, msg) => errors.push(`${id}: ${msg}`);
const walk = (dir, keep = () => true) => !exists(dir) ? [] : fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(path.join(dir, e.name), keep) : keep(e.name) ? [path.join(dir, e.name)] : []);

// ---------- GR-10 / GRH-014: protected-file fingerprints ----------
const LOCK = "scripts/guardrails.lock.json";
const hash = (p) => crypto.createHash("sha256").update(read(p).replace(/\r\n/g, "\n")).digest("hex");
const lockable = cfg.protectedFiles.filter((f) => f !== LOCK);
if (process.argv.includes("--relock")) {
  const missing = lockable.filter((f) => !exists(f));
  if (missing.length) { console.error(`✗ cannot relock, missing: ${missing.join(", ")}`); process.exit(1); }
  const lock = Object.fromEntries(lockable.map((f) => [f, hash(f)]));
  fs.writeFileSync(path.join(ROOT, LOCK), JSON.stringify(lock, null, 2) + "\n");
  console.log(`✓ relocked ${lockable.length} protected files → ${LOCK}. Commit it with the approved change (label: guardrail-change).`);
  process.exit(0);
}
if (!exists(LOCK)) fail("GR-10", `${LOCK} is missing — run: node scripts/guard.js --relock (after approval)`);
else {
  const lock = JSON.parse(read(LOCK));
  for (const f of lockable) {
    if (!exists(f)) fail("GR-10", `protected file missing: ${f}`);
    else if (lock[f] !== hash(f)) fail("GR-10", `${f} changed — protected files need approval, then: node scripts/guard.js --relock`);
  }
  for (const f of Object.keys(lock)) if (!lockable.includes(f)) fail("GR-10", `${LOCK} lists ${f}, which is not in protectedFiles`);
}

// ---------- GR-10 / GRH-001, GRH-003, GRH-010: Claude Code settings and CI exist ----------
for (const f of [".claude/settings.json", ".github/workflows/ci.yml"]) if (!exists(f)) fail("GRH-001", `${f} is missing`);
if (exists("Claude outputs")) fail("GRH-001", `"Claude outputs/" must be removed once its files are installed`);
if (exists(".claude/settings.json")) {
  const s = JSON.parse(read(".claude/settings.json"));
  const ask = new Set(s.permissions?.ask || []);
  const deny = new Set(s.permissions?.deny || []);
  for (const f of [...cfg.protectedFiles, ...cfg.unlockedProtectedFiles]) {
    if (!ask.has(`Edit(./${f})`) || !ask.has(`Write(./${f})`)) fail("GRH-010", `.claude/settings.json must ask before Edit/Write of ${f}`);
  }
  for (const d of cfg.requiredDeny) if (!deny.has(d)) fail("GRH-003", `.claude/settings.json must deny ${d}`);
}

// ---------- GR-11 / GRH-011: the gate commands are locked ----------
const pkg = JSON.parse(read("package.json"));
for (const [k, v] of Object.entries(cfg.lockedScripts)) {
  if (pkg.scripts?.[k] !== v) fail("GR-11", `package.json script "${k}" changed (expected: ${v}) — the verify gate is locked`);
}

// ---------- GR-6: manifest lock ----------
const manifest = JSON.parse(read("extension/manifest.json"));
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
  for (const f of cs.js || []) if (!exists(path.join("extension", f))) fail("GR-6", `content script file missing: ${f}`);
}

// ---------- GR-2: UNSAFE_LABEL must stay strict ----------
const src = read("extension/content.js");
const m = src.match(/const UNSAFE_LABEL = \/(.+)\/(\w*);/);
if (!m) fail("GR-2", "UNSAFE_LABEL regex not found in extension/content.js");
else {
  const re = new RegExp(m[1], m[2]);
  for (const w of cfg.requiredUnsafeWords) {
    if (!re.test(`x ${w} y`)) fail("GR-2", `UNSAFE_LABEL no longer matches required word "${w}"`);
    if (cfg.unsafePlurals && !re.test(`x ${w}s y`)) fail("GR-2", `UNSAFE_LABEL no longer matches the plural "${w}s"`);
  }
  if (!m[2].includes("i")) fail("GR-2", "UNSAFE_LABEL must be case-insensitive");
}
if (!/function safeCandidate\(/.test(src)) fail("GR-2", "safeCandidate() is missing");
// SAFE-001: exactly one click site, inside safeClick(), and safeClick() re-checks safeCandidate().
const clickSites = (src.match(/\.click\s*\(/g) || []).length;
const safeClickFn = (src.match(/function safeClick\([^)]*\)\s*\{[\s\S]*?\n {2}\}/) || [""])[0];
if (!safeClickFn) fail("SAFE-001", "safeClick() is missing from extension/content.js");
else {
  if (!/safeCandidate\(el\)/.test(safeClickFn) || !/isConnected/.test(safeClickFn)) fail("SAFE-001", "safeClick() must check el.isConnected and safeCandidate(el)");
  if (!/\.click\s*\(/.test(safeClickFn)) fail("SAFE-001", "the click must happen inside safeClick()");
}
if (clickSites !== 1) fail("SAFE-001", `extension/content.js has ${clickSites} .click( sites; only safeClick() may click`);

// ---------- GR-4: suppression ledger ----------
const found = {};
for (const file of walk("extension", (n) => n.endsWith(".js"))) {
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

// ---------- GR-8 / GRH-012: test inventory ----------
for (const [file, ids] of Object.entries(cfg.requiredTests)) {
  const p = path.join("tests", file);
  if (!exists(p)) { fail("GR-8", `required test file missing: ${p}`); continue; }
  const text = read(p);
  for (const id of ids) {
    const re = new RegExp(`["'\`\\[\\s]${id.replace(/[-]/g, "\\-")}["'\` ]`);
    if (!re.test(text)) fail("GR-8", `test ID ${id} missing from ${p} (deleted or renamed?)`);
  }
}
for (const f of walk("tests", (n) => n.endsWith(".test.js"))) {
  const name = path.basename(f);
  if (!cfg.requiredTests[name]) fail("GR-8", `${f} is not in requiredTests (scripts/guardrails.json) — add its test IDs`);
}

// ---------- GRH-060 / GRH-062: test hygiene ----------
for (const f of walk("tests", (n) => n.endsWith(".js"))) {
  const text = read(f);
  if (/waitForTimeout\s*\(/.test(text)) fail("GRH-060", `${f}: fixed sleeps (waitForTimeout) are not allowed — use the fake clock (tick) or waitForFunction`);
  if (/["'`](\/tmp\/|\/var\/|~\/|[A-Z]:\\)/.test(text)) fail("GRH-062", `${f}: tests may only write under test-results/`);
}

// ---------- GR-9: docs live in docs/ ----------
const SKIP = new Set(["node_modules", ".git", "docs", "dist", "test-results", ".output", ".wxt"]);
const mdOutside = [];
const scan = (dir) => {
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = path.join(dir, e.name);
    if (e.isDirectory()) { if (!SKIP.has(e.name)) scan(rel); }
    else if (/\.md$/i.test(e.name) && !(dir === "" && cfg.rootMarkdownAllowed.includes(e.name)) && !rel.startsWith(".github") && !rel.startsWith(".claude")) mdOutside.push(rel);
  }
};
scan("");
for (const f of mdOutside) fail("GR-9", `Markdown docs must live in docs/: ${f}`);
const stub = exists("CLAUDE.md") ? read("CLAUDE.md") : "";
if (!/@docs\/CLAUDE\.md/.test(stub)) fail("GR-9", "root CLAUDE.md must import @docs/CLAUDE.md");
for (const d of ["docs/CLAUDE.md", "docs/GUARDRAILS.md", "docs/PROJECT_NOTES.md", "docs/CHANGELOG.md", "docs/specs/_TEMPLATE.md"]) if (!exists(d)) fail("GR-9", `${d} is missing`);

// ---------- GRH-070: no dangling doc paths ----------
for (const f of walk("docs", (n) => n.endsWith(".md"))) {
  read(f).split("\n").forEach((line, i) => {
    if (/\([^)]*\b(Phase \d|planned)\b[^)]*\)/i.test(line)) return; // e.g. "(Phase 1)", "(created in Phase 1)"
    for (const [, p] of line.matchAll(/`(docs\/[\w./-]+)`/g)) {
      if (/[*<]/.test(p)) continue;
      if (!exists(p.replace(/\/$/, ""))) fail("GRH-070", `${f}:${i + 1} refers to ${p}, which doesn't exist (create it or mark the line "(Phase 1)")`);
    }
  });
}

// ---------- GR-13 / GRH-072: spec traceability ----------
const EXEMPT = /\b(manual|process|review)\b/i;
// COV-001 / COV-002: an ID counts as tested only if it appears in a TEST NAME (test("…") / "✓ …" lines in tests/*.test.js)
// or in one of the gate scripts that implement guard/lint/CI-level checks. scripts/mutants.json, guardrails.json
// and ordinary code comments in test files do not count.
const testNames = walk("tests", (n) => n.endsWith(".test.js")).flatMap((f) => {
  const t = read(f);
  return [...t.matchAll(/\btest\(\s*(["'`])([\s\S]*?)\1\s*,/g), ...t.matchAll(/✓["'`}\s]*([A-Z][^"'`\n]+)/g)].map((m) => m[2] || m[1]);
});
const gateFiles = ["scripts/guard.js", "scripts/mutate.js", "scripts/spec-check.js", "tests/run.js", "tests/helpers/meet.js",
  "eslint.config.js", ".github/workflows/ci.yml", ...walk(".githooks")].filter(exists);
const corpus = [...testNames, ...gateFiles.map(read)].join("\n");
const untested = [];
const pending = [];
for (const f of walk("docs/specs", (n) => n.endsWith(".md") && !n.startsWith("_"))) {
  const text = read(f);
  const status = (text.match(/Status:\s*\**\s*(Draft|Approved|Implemented|Superseded)/i) || [])[1];
  if (!status) { fail("GR-13", `${f}: no "Status: Draft|Approved|Implemented" line`); continue; }
  if (!/^(approved|implemented)$/i.test(status)) continue;
  const enforce = /^implemented$/i.test(status); // Approved = work in progress → warning; Implemented → must be fully traced
  for (const line of text.split("\n")) {
    const row = line.match(/^\|\s*([A-Z][A-Z0-9]*-\d{3})\s*\|.*\|\s*([^|]+?)\s*\|\s*$/);
    if (!row) continue;
    const [, id, level] = row;
    if (EXEMPT.test(level)) continue;
    if (new RegExp(`\\b${id}\\b`).test(corpus)) continue;
    if (enforce) untested.push(`${id} (${path.basename(f)}, level: ${level})`);
    else pending.push(id);
  }
}
for (const u of untested) fail("GR-13", `implemented requirement has no test or check: ${u}`);
if (pending.length) warnings.push(`GR-13: ${pending.length} approved requirement(s) not implemented/tested yet: ${pending.join(", ")}`);

// ---------- report ----------
for (const w of warnings) console.warn(`⚠  ${w}`);
if (errors.length) {
  console.error(`\n✗ guard: ${errors.length} problem(s)\n` + errors.map((e) => `  - ${e}`).join("\n"));
  console.error("\nFix the change, not the guardrail. See docs/GUARDRAILS.md.");
  process.exit(1);
}
console.log("✓ guard: lock, settings, gate scripts, manifest, unsafe-label, ledger, test inventory, docs, traceability OK");
