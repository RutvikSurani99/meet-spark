#!/usr/bin/env node
// PROTECTED FILE — GR-12 mutation gate (GRH-050, GRH-051, GRH-052; COV-003 backfill mutants "COV-Pnn"). Proves the guardrails catch real mistakes.
// For each mutant in scripts/mutants.json: copy the repo to a temp dir, apply one deliberate bug,
// then run lint → guard → the mutant's `killedBy` test files. The mutant must be KILLED (something fails).
// A surviving mutant means a guardrail has a hole. Exit code 1 if any mutant survives or no longer applies.
//
//   npm run mutate                 all mutants
//   npm run mutate -- M3 SAFE-002  only these ids
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const ROOT = path.join(__dirname, "..");
const { mutants } = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts/mutants.json"), "utf8"));
const only = process.argv.slice(2);
const list = mutants.filter((m) => !only.length || only.includes(m.id));
const PARALLEL = Math.max(1, Math.min(4, Number(process.env.MUTATE_JOBS) || Math.floor(os.cpus().length / 2) || 1));
const SKIP = new Set(["node_modules", ".git", "dist", "test-results"]);

const run = (cmd, args, cwd) => new Promise((resolve) => {
  const p = spawn(cmd, args, { cwd, env: { ...process.env, CI: "" }, stdio: ["ignore", "pipe", "pipe"] });
  let out = "";
  p.stdout.on("data", (d) => { out += d; });
  p.stderr.on("data", (d) => { out += d; });
  p.on("close", (code) => resolve({ code, out }));
});

async function attempt(m) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `mutant-${m.id}-`));
  try {
    fs.cpSync(ROOT, dir, { recursive: true, filter: (src) => !SKIP.has(path.basename(src)) || src === ROOT });
    fs.symlinkSync(path.join(ROOT, "node_modules"), path.join(dir, "node_modules"), "dir");
    const file = path.join(dir, m.file);
    const text = fs.readFileSync(file, "utf8");
    const count = text.split(m.find).length - 1;
    if (count === 0) return { m, result: "STALE", why: `"find" text no longer appears in ${m.file} — update the mutant` };
    fs.writeFileSync(file, m.all ? text.split(m.find).join(m.replace) : text.replace(m.find, m.replace));
    const steps = [
      ["lint", process.execPath, [path.join(dir, "node_modules/eslint/bin/eslint.js"), "."]],
      ["guard", process.execPath, ["scripts/guard.js"]],
      ["tests", process.execPath, ["tests/run.js", ...m.killedBy]],
    ];
    for (const [name, cmd, args] of steps) {
      const r = await run(cmd, args, dir);
      if (r.code !== 0) {
        const line = (r.out.match(/^.*(✗|GR-\d+|GRH-\d+|Error|AssertionError).*$/m) || [r.out.trim().split("\n").pop()])[0];
        return { m, result: "KILLED", by: name, why: line.trim().slice(0, 160) };
      }
    }
    return { m, result: "SURVIVED", why: `lint, guard and ${m.killedBy.join(", ")} all passed` };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

(async () => {
  if (!list.length) { console.error("no mutants selected"); process.exit(1); }
  // Baseline: the unmutated repo must pass, otherwise every mutant would look "killed".
  for (const [name, args] of [["lint", [path.join(ROOT, "node_modules/eslint/bin/eslint.js"), "."]], ["guard", ["scripts/guard.js"]],
    ["tests", ["tests/run.js", ...new Set(list.flatMap((m) => m.killedBy))]]]) {
    const r = await run(process.execPath, args, ROOT);
    if (r.code !== 0) { console.error(`✗ baseline ${name} fails on the unmutated repo — fix npm run verify first.\n${r.out.slice(-1500)}`); process.exit(1); }
  }
  console.log(`▶ mutation gate: baseline green · ${list.length} mutants, ${PARALLEL} at a time\n`);
  const t0 = Date.now();
  const results = [];
  const queue = [...list];
  await Promise.all(Array.from({ length: PARALLEL }, async () => {
    while (queue.length) {
      const m = queue.shift();
      const r = await attempt(m);
      results.push(r);
      const icon = r.result === "KILLED" ? "✓" : "✗";
      console.log(`  ${icon} ${m.id.padEnd(10)} ${r.result.padEnd(8)} ${m.desc}${r.by ? `  [caught by ${r.by}]` : ""}`);
      if (r.result !== "KILLED") console.log(`      ${r.why}`);
    }
  }));
  const killed = results.filter((r) => r.result === "KILLED").length;
  console.log(`\nkilled ${killed}/${results.length} in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  if (killed !== results.length) {
    console.error("✗ GR-12: some mutants survived or no longer apply. A guardrail has a hole: add or strengthen a test (don't delete the mutant).");
    process.exit(1);
  }
})();
