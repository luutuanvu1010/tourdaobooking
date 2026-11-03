import { readFileSync } from "node:fs";
const files = readFileSync(process.argv[2], "utf8").trim().split("\n");
const hits = {};
for (const f of files) {
  const t = readFileSync(f, "utf8");
  for (const m of t.matchAll(/(["'`])((?:(?!\1)[^\n])*)\1/g)) {
    const s = m[2];
    const tok = s.split(/\s+/).find((w) => w.length >= 25 && /\p{L}/u.test(w) && /[À-ỹ]|[A-Z][a-z]+[A-Z]|-[A-ZĐ]/u.test(w) && !/^(\/|https?:|\.\/|node:|file:)|\.(ts|mjs|png|json|sql|md|css|js)\b|\$\{|=>|\(|\)|\[|\]|\{|\}/.test(w));
    if (tok) (hits[f] ??= []).push(tok.slice(0, 60));
  }
}
for (const [f, v] of Object.entries(hits)) console.log(f, v.length, v.slice(0, 3));
