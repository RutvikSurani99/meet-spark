// PROTECTED FILE — runs every *.test.js file in this folder (GR-8, GR-11, GRH-013).
// A file only counts as passed if it exits 0 AND prints a final `PASS <name> (N tests)` line with N > 0,
// so a file whose tests were commented out or skipped fails the run.
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const only = process.argv.slice(2); // optional: node tests/run.js safety.test.js features.test.js
const files = fs.readdirSync(__dirname).filter((f) => f.endsWith(".test.js")).filter((f) => !only.length || only.includes(f)).sort();
if (!files.length) { console.error("✗ no test files found"); process.exit(1); }

let failed = 0, total = 0;
const t0 = Date.now();
for (const f of files) {
  process.stdout.write(`\n▶ ${f}\n`);
  const r = spawnSync(process.execPath, [path.join(__dirname, f)], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  process.stdout.write(r.stdout || "");
  process.stderr.write(r.stderr || "");
  const m = (r.stdout || "").match(/^PASS \S+ \((\d+) tests?\)\s*$/m);
  if (r.status !== 0) { failed++; console.error(`✗ ${f} failed`); }
  else if (!m || +m[1] === 0) { failed++; console.error(`✗ ${f} ran no tests (missing "PASS <name> (N tests)" line)`); }
  else total += +m[1];
}
const secs = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`\n${files.length - failed}/${files.length} test files passed · ${total} tests · ${secs} s`);
// GRH-063: keep the suite fast. On CI, warn above 60 s and fail above 120 s.
if (process.env.CI && !only.length) {
  if (+secs > 120) { console.error(`✗ GRH-063: the test suite took ${secs} s (limit 120 s) — remove real waits, use the fake clock`); failed++; }
  else if (+secs > 60) console.warn(`⚠ GRH-063: the test suite took ${secs} s (target under 60 s)`);
}
process.exit(failed ? 1 : 0);
