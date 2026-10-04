#!/usr/bin/env node
// PROTECTED FILE — GR-14 spec-first gate (docs/GUARDRAILS.md, docs/CLAUDE.md "Spec-first workflow").
// No change to the shipped extension (extension/) without an APPROVED spec that existed BEFORE the change.
//
//   node scripts/spec-check.js --commit-msg <file>   git commit-msg hook: a commit that touches extension/ must name
//                                                    ≥1 requirement ID (e.g. SAFE-001) from a spec whose Status was
//                                                    Approved/Implemented in HEAD, i.e. approved in an earlier commit.
//   node scripts/spec-check.js --range <base> <head> CI: the same rule for every commit in a PR / push.
//   node scripts/spec-check.js --hook                Claude Code PreToolUse hook: blocks Edit/Write in extension/
//                                                    while no spec is Approved (work must start with a spec).
//   node scripts/spec-check.js --new <slug> <PREFIX> scaffold docs/specs/<slug>.md from the template (Status: Draft).
//   node scripts/spec-check.js                       list specs and their status.
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const SPECS = "docs/specs";
const ID_RE = /\b[A-Z][A-Z0-9]*-\d{3}\b/g;
const PRODUCT = /^extension\//;
const git = (...a) => execFileSync("git", a, { cwd: ROOT, encoding: "utf8" }).trim();
const tryGit = (...a) => { try { return git(...a); } catch { return ""; } };

function parseSpec(text) {
  const status = ((text.match(/Status:\s*\**\s*(Draft|Approved|Implemented|Superseded)/i) || [])[1] || "unknown").toLowerCase();
  const ids = new Set();
  for (const line of text.split("\n")) { const m = line.match(/^\|\s*([A-Z][A-Z0-9]*-\d{3})\s*\|/); if (m) ids.add(m[1]); }
  return { status, ids };
}
// Approved IDs as of a git revision (or the working tree when rev is null).
function approvedIds(rev) {
  const ids = new Map();
  const files = rev
    ? tryGit("ls-tree", "-r", "--name-only", rev, SPECS).split("\n").filter((f) => f.endsWith(".md"))
    : (fs.existsSync(path.join(ROOT, SPECS)) ? fs.readdirSync(path.join(ROOT, SPECS)).filter((f) => f.endsWith(".md")).map((f) => `${SPECS}/${f}`) : []);
  for (const f of files) {
    if (path.basename(f).startsWith("_")) continue;
    const text = rev ? tryGit("show", `${rev}:${f}`) : fs.readFileSync(path.join(ROOT, f), "utf8");
    const s = parseSpec(text);
    if (s.status === "approved" || s.status === "implemented") for (const id of s.ids) ids.set(id, f);
  }
  return ids;
}
function check({ files, message, baseRev, label }) {
  const product = files.filter((f) => PRODUCT.test(f));
  if (!product.length) return null;
  const named = [...new Set(message.match(ID_RE) || [])];
  const approved = approvedIds(baseRev);
  const ok = named.filter((id) => approved.has(id));
  if (ok.length) return null;
  return [
    `✗ GR-14 spec-first: ${label} changes ${product.join(", ")}`,
    named.length
      ? `  but none of ${named.join(", ")} is in a spec that was already Approved (${baseRev || "working tree"}).`
      : "  but the commit message names no requirement ID (e.g. SAFE-001).",
    "  Workflow: write/update a spec in docs/specs/ (Status: Draft) → get approval → commit the spec with",
    "  Status: Approved → then commit tests + code with the requirement IDs in the message. See docs/CLAUDE.md.",
  ].join("\n");
}

const [mode, ...args] = process.argv.slice(2);

if (mode === "--commit-msg") {
  const message = fs.readFileSync(args[0], "utf8").split("\n").filter((l) => !l.startsWith("#")).join("\n");
  if (/^(Merge|Revert) /.test(message)) process.exit(0);
  const files = tryGit("diff", "--cached", "--name-only").split("\n").filter(Boolean);
  const head = tryGit("rev-parse", "--verify", "HEAD") ? "HEAD" : null;
  const err = check({ files, message, baseRev: head, label: "this commit" });
  if (err) { console.error(err); process.exit(1); }
  process.exit(0);
}

if (mode === "--range") {
  const [base, head] = args;
  const revs = tryGit("rev-list", "--no-merges", "--reverse", `${base}..${head}`).split("\n").filter(Boolean);
  const errs = [];
  for (const rev of revs) {
    const files = git("diff-tree", "--no-commit-id", "--name-only", "-r", rev).split("\n").filter(Boolean);
    const message = git("log", "-1", "--format=%B", rev);
    const parent = tryGit("rev-parse", "--verify", `${rev}^`) || null;
    const err = check({ files, message, baseRev: parent, label: `commit ${rev.slice(0, 7)}` });
    if (err) errs.push(err);
  }
  if (errs.length) { console.error(errs.join("\n\n")); process.exit(1); }
  console.log(`✓ GR-14 spec-first: ${revs.length} commit(s) checked`);
  process.exit(0);
}

if (mode === "--hook") {
  // Claude Code PreToolUse hook. Input: JSON on stdin with tool_input.file_path. Exit 2 = block, stderr goes to Claude.
  let input = {};
  try { input = JSON.parse(fs.readFileSync(0, "utf8") || "{}"); } catch { input = {}; }
  const file = path.relative(ROOT, path.resolve(ROOT, input.tool_input?.file_path || input.tool_input?.notebook_path || ""));
  if (!PRODUCT.test(file)) process.exit(0);
  const specs = fs.readdirSync(path.join(ROOT, SPECS)).filter((f) => f.endsWith(".md") && !f.startsWith("_"))
    .map((f) => ({ f, ...parseSpec(fs.readFileSync(path.join(ROOT, SPECS, f), "utf8")) }));
  if (specs.some((s) => s.status === "approved")) process.exit(0);
  console.error([
    `GR-14 spec-first: blocked editing ${file}.`,
    "No spec in docs/specs/ is Approved (all are Draft or Implemented), so there is no approved work to implement.",
    "Do this first: create or update a spec (npm run spec:new -- <slug> <PREFIX>), set Status: Draft, show it to the user",
    "and wait for their explicit approval. Only then set Status: Approved and change code.",
  ].join("\n"));
  process.exit(2);
}

if (mode === "--new") {
  const [slug, prefix] = args;
  if (!slug || !/^[a-z0-9-]+$/.test(slug) || !prefix || !/^[A-Z][A-Z0-9]*$/.test(prefix)) {
    console.error("usage: npm run spec:new -- <kebab-slug> <PREFIX>   e.g. npm run spec:new -- dark-mode THEME"); process.exit(1);
  }
  const dest = path.join(ROOT, SPECS, `${slug}.md`);
  if (fs.existsSync(dest)) { console.error(`✗ ${SPECS}/${slug}.md already exists`); process.exit(1); }
  const taken = approvedIds(null);
  if ([...taken.keys()].some((id) => id.startsWith(prefix + "-"))) console.warn(`⚠ prefix ${prefix} is already used by an approved spec; IDs must stay unique`);
  const today = new Date().toISOString().slice(0, 10);
  const text = fs.readFileSync(path.join(ROOT, SPECS, "_TEMPLATE.md"), "utf8")
    .replace("<Feature>", slug.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase()))
    .replace("ID prefix: XXX · Status: Draft | Approved | Implemented", `ID prefix: ${prefix} · Status: **Draft**`)
    .replace(/XXX-001/g, `${prefix}-001`)
    .replace("## Changelog", `## Changelog\n- ${today} v1: Draft.`);
  fs.writeFileSync(dest, text);
  console.log(`✓ created ${SPECS}/${slug}.md (Status: Draft). Fill it in and get approval before writing code.`);
  process.exit(0);
}

// default: list
const dir = path.join(ROOT, SPECS);
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".md") && !f.startsWith("_")).sort()) {
  const s = parseSpec(fs.readFileSync(path.join(dir, f), "utf8"));
  console.log(`${s.status.padEnd(12)} ${f}  (${s.ids.size} requirements)`);
}
