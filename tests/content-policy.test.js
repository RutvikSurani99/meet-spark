// PROTECTED FILE — GR-7 content policy. See docs/GUARDRAILS.md.
// Node only (no browser): checks every shipped prompt.
const assert = require("assert");
const { ICEBREAKERS, WYR, BINGO } = require("./helpers/content");

// Whole-word, case-insensitive. Festivals, food, cricket, trains etc. are fine.
const DENY = [
  // religion
  "religion", "religious", "god", "gods", "hindu", "muslim", "islam", "christian", "sikh", "jain", "buddhist", "temple", "mosque", "church", "gurdwara", "pray", "prayer", "atheist",
  // politics
  "politics", "political", "election", "vote for", "bjp", "congress party", "aap", "modi", "rahul gandhi", "kejriwal", "government", "minister", "parliament", "pakistan",
  // caste / community
  "caste", "brahmin", "dalit", "reservation", "quota", "community",
  // region-vs-region / stereotyping
  "north vs south", "south vs north", "north indian vs", "south indian vs", "better state", "madrasi", "bihari", "chinki",
  // general
  "sexy", "drunk", "kill", "hate",
];
const denyRe = new RegExp(`\\b(${DENY.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`, "i");

const cats = Object.keys(ICEBREAKERS);
assert.deepStrictEqual(cats, ["Warm-up", "Work", "Fun", "Reflective"], "icebreaker categories changed: update docs/specs and this test together");

const all = [];
for (const c of cats) {
  assert.ok(ICEBREAKERS[c].length >= 5, `category ${c} needs at least 5 questions`);
  ICEBREAKERS[c].forEach((q) => all.push({ where: `ICEBREAKERS.${c}`, text: q, max: 140 }));
}
assert.ok(WYR.length >= 10, "This or that needs at least 10 prompts");
WYR.forEach((pair, i) => {
  assert.ok(Array.isArray(pair) && pair.length === 2, `WYR[${i}] must be a pair`);
  assert.notStrictEqual(pair[0].trim().toLowerCase(), pair[1].trim().toLowerCase(), `WYR[${i}] options are identical`);
  pair.forEach((t) => all.push({ where: `WYR[${i}]`, text: t, max: 80 }));
});
assert.ok(BINGO.length >= 24, "Bingo needs at least 24 items to fill a 5x5 card");
BINGO.forEach((t, i) => all.push({ where: `BINGO[${i}]`, text: t, max: 40 }));

const problems = [];
const seen = new Map();
for (const { where, text, max } of all) {
  if (typeof text !== "string" || !text.trim()) problems.push(`${where}: empty`);
  else {
    if (text !== text.trim()) problems.push(`${where}: leading/trailing spaces`);
    if (text.length > max) problems.push(`${where}: longer than ${max} chars (${text.length})`);
    const hit = text.match(denyRe);
    if (hit) problems.push(`${where}: denied term "${hit[0]}" in "${text}"`);
    if (/<|>/.test(text)) problems.push(`${where}: contains < or > (rendered as HTML-escaped text)`);
    const key = text.trim().toLowerCase();
    if (seen.has(key) && !where.startsWith("WYR")) problems.push(`${where}: duplicate of ${seen.get(key)}`);
    seen.set(key, where);
  }
}
const dupPairs = WYR.map((p) => p.map((s) => s.toLowerCase()).sort().join("|"));
dupPairs.forEach((k, i) => { if (dupPairs.indexOf(k) !== i) problems.push(`WYR[${i}]: duplicate pair`); });

assert.deepStrictEqual(problems, [], "content policy violations:\n" + problems.join("\n"));
console.log(`  ✓ CONTENT-1 policy, counts and duplicates (${all.length} strings, ${cats.length} categories, ${WYR.length} pairs, ${BINGO.length} bingo)`);
console.log("PASS content-policy (1 test)");
