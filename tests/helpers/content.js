// Reads the content arrays (ICEBREAKERS, WYR, BINGO) straight out of extension/content.js
// without running the extension, so tests always check the real shipped content.
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const SRC = fs.readFileSync(path.join(__dirname, "../../extension/content.js"), "utf8");

function literal(name) {
  const start = SRC.indexOf(`const ${name} =`);
  if (start < 0) throw new Error(`${name} not found in content.js`);
  const open = SRC.slice(start).search(/[[{]/) + start;
  let depth = 0, inStr = null, i = open;
  for (; i < SRC.length; i++) {
    const c = SRC[i];
    if (inStr) { if (c === "\\") i++; else if (c === inStr) inStr = null; continue; }
    if (c === '"' || c === "'" || c === "`") inStr = c;
    else if (c === "[" || c === "{") depth++;
    else if (c === "]" || c === "}") { depth--; if (depth === 0) break; }
  }
  return vm.runInNewContext(`(${SRC.slice(open, i + 1)})`);
}

module.exports = { SRC, ICEBREAKERS: literal("ICEBREAKERS"), WYR: literal("WYR"), BINGO: literal("BINGO") };
