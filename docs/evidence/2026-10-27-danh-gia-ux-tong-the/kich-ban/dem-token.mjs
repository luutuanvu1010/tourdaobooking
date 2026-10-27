// Đếm token :root của public/app.css: số lần dùng trong app.css (var(--x)), web/**/*.ts, public/*.html, src/shared/*.ts; liệt kê token không dùng và token chỉ dùng 1 lần. Chỉ đọc.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
const goc = process.argv[2];
const css = readFileSync(join(goc, "public/app.css"), "utf8");
const root = css.slice(css.indexOf(":root"), css.indexOf("}", css.indexOf(":root")));
const tokens = [...new Set([...root.matchAll(/^\s*(--[a-zA-Z0-9-]+)\s*:/gm)].map((m) => m[1]))];
const docDir = (d) => { const ra = []; for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) ra.push(...docDir(p)); else if (/\.(ts|html)$/.test(f) && !f.endsWith(".test.ts")) ra.push(p); } return ra; };
const tep = [...docDir(join(goc, "web")), ...docDir(join(goc, "public")), ...docDir(join(goc, "src/shared"))];
const khac = tep.map((p) => readFileSync(p, "utf8")).join("\n");
const dem = tokens.map((t) => { const rx = new RegExp(t.replace(/[-]/g, "\\-") + "(?![a-zA-Z0-9-])", "g"); const trongCss = (css.match(rx) || []).length - 1; const ngoai = (khac.match(rx) || []).length; return { t, trongCss, ngoai }; });
const khongDung = dem.filter((d) => d.trongCss + d.ngoai === 0);
const motLan = dem.filter((d) => d.trongCss + d.ngoai === 1);
console.log(`token :root: ${tokens.length}; không dùng ở đâu: ${khongDung.length}; chỉ dùng 1 lần: ${motLan.length}`);
console.log("KHÔNG DÙNG:", khongDung.map((d) => d.t).join(" "));
console.log("DÙNG 1 LẦN:", motLan.map((d) => d.t).join(" "));
// Token chỉ trỏ tới token khác (bí danh): giá trị là var(--...)
const biDanh = [...root.matchAll(/^\s*(--[a-zA-Z0-9-]+)\s*:\s*var\((--[a-zA-Z0-9-]+)\)\s*;/gm)].map((m) => `${m[1]}→${m[2]}`);
console.log(`BÍ DANH (giá trị = var khác): ${biDanh.length}:`, biDanh.join(" "));
// Token cùng giá trị (trùng giá trị màu/số)
const giaTri = new Map();
for (const m of root.matchAll(/^\s*(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);/gm)) { const v = m[2].trim(); if (!v.startsWith("var(")) (giaTri.get(v) ?? giaTri.set(v, []).get(v)).push(m[1]); }
const trung = [...giaTri.entries()].filter(([, ds]) => ds.length >= 3).sort((a, b) => b[1].length - a[1].length);
console.log(`GIÁ TRỊ có ≥3 token cùng giá trị: ${trung.length}`);
for (const [v, ds] of trung.slice(0, 25)) console.log(`  ${v} ← ${ds.length}: ${ds.join(" ")}`);
