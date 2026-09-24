import { readFileSync } from "node:fs";
const files = readFileSync(process.argv[2], "utf8").trim().split("\n");
const keys = ["pickupPlace", "customerName", "checkinPlace", "pickup_place", "customer_name"];
const res = {};
for (const k of keys) res[k] = { literal: 0, lien25: [], files: new Set() };
const re = (k) => new RegExp(`${k}["']?\\s*:\\s*(["'\`])((?:(?!\\1).)*)\\1`, "g");
for (const f of files) {
  const t = readFileSync(f, "utf8");
  for (const k of keys) for (const m of t.matchAll(re(k))) {
    res[k].literal++; res[k].files.add(f);
    if (/[^\s]{25,}/.test(m[2].replace(/\$\{[^}]*\}/g, (x) => x))) res[k].lien25.push(`${f}: ${m[2].slice(0, 80)}`);
  }
}
for (const k of keys) console.log(k, "literal:", res[k].literal, "tệp:", res[k].files.size, "chuỗi liền>=25:", res[k].lien25.length, res[k].lien25.slice(0, 6));
// viewport widths in Chrome scripts
const w = {};
for (const f of files.filter((x) => x.endsWith(".mjs"))) {
  const t = readFileSync(f, "utf8");
  for (const m of t.matchAll(/width\s*[:=]\s*(\d{3,4})/g)) (w[m[1]] ??= new Set()).add(f);
}
console.log("khổ (width:N) → số tệp:", Object.fromEntries(Object.entries(w).map(([k, v]) => [k, v.size])));
for (const n of ["320", "340", "360", "375", "390"]) console.log(n, [...(w[n] ?? [])]);
