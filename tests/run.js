// Runs every *.test.js file in this folder one after another.
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const files = fs.readdirSync(__dirname).filter((f) => f.endsWith(".test.js")).sort();
let failed = 0;
for (const f of files) {
  process.stdout.write(`\n▶ ${f}\n`);
  try { execFileSync(process.execPath, [path.join(__dirname, f)], { stdio: "inherit" }); }
  catch { failed++; console.error(`✗ ${f} failed`); }
}
console.log(`\n${files.length - failed}/${files.length} test files passed`);
process.exit(failed ? 1 : 0);
