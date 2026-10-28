// Đối chiếu token của bản xuất Claude Design (tokens/*.css, dạng CSS custom property) với
// (1) giá trị chép từ mã (cùng 88 giá trị của doi-chieu-bo-v2.mjs) và (2) tokens.json của bộ v2 trên Claude.
// Chỉ đọc, in bảng. Dùng:
//   node doi-chieu-claude-design.mjs <thư mục bản xuất Claude Design> <tokens.json của bộ v2>
import { readFileSync } from "node:fs";
import { join } from "node:path";

const thuMuc = process.argv[2] ?? new URL("../../2026-10-28-claude-design-bo-v2/", import.meta.url).pathname;
const boJson = process.argv[3] ?? new URL("../so-lieu/bo-v2-tokens-1793143219-823e.json", import.meta.url).pathname;

// --- Đọc token CSS của Claude Design: "  --ten: gia-tri; /* công dụng | nguồn */"
const cd = [];
for (const tep of ["goc.css", "y-nghia.css", "thanh-phan.css", "nen-tang.css"]) {
  const src = readFileSync(join(thuMuc, "tokens", tep), "utf8");
  for (const dong of src.split("\n")) {
    const m = dong.match(/^\s*(--[\w-]+):\s*([^;]+);\s*(.*)$/);
    if (!m) continue;
    const ghi = [...m[3].matchAll(/\/\*\s*([^*]*?)\s*\*\//g)].map((x) => x[1]).filter((x) => !x.startsWith("@kind")).join(" ");
    cd.push({ tep, name: m[1], raw: m[2].trim(), desc: ghi });
  }
}
const cdMap = new Map(cd.map((t) => [t.name, t]));
const giai = (v, sau = 0) => {
  if (sau > 8) return v;
  return v.replace(/var\((--[\w-]+)\)/g, (_, n) => (cdMap.has(n) ? giai(cdMap.get(n).raw, sau + 1) : `var(${n})`));
};
for (const t of cd) t.value = giai(t.raw);

// --- Đọc tokens.json của bộ v2 (cấu trúc {name,value|size|weight,usage})
const bo = [];
(function walk(o, p) {
  if (Array.isArray(o)) { o.forEach((v) => walk(v, p)); return; }
  if (o && typeof o === "object") {
    if ("name" in o && ("value" in o || "size" in o || "weight" in o)) {
      const val = o.value ?? (o.size !== undefined ? `${o.size}/${o.weight ?? ""}` : o.weight);
      bo.push({ path: `${p.join(".")}.${o.name}`, name: String(o.name), value: val, desc: String(o.usage ?? o.note ?? "") });
      return;
    }
    for (const [k, v] of Object.entries(o)) walk(v, [...p, k]);
  }
})(JSON.parse(readFileSync(boJson, "utf8")), []);

const norm = (s) => String(typeof s === "object" ? JSON.stringify(s) : s).toLowerCase().replace(/\s+/g, "").replace(/0\./g, ".").replace(/px$/, "px");

// --- (1) 88 giá trị chép từ mã (giống doi-chieu-bo-v2.mjs)
const EXP = [
  ["màu", ["#0c4a6e","#082f49","#dcebf6","#c9def0","#0b5c84","#c0392b","#96271a","#fef2f0","#f5a623","#fbe3b3","#5a4109","#e9d3a4","#dcfce7","#166534","#a7e3bc","#b01235","#8e0e2b","#fde9ee","#f1c3cf","#0e7490","#155e75","#e0f2f7","#0891b2","rgba(8,145,178,.2)","#ffffff","#f2f5f9","#f1f5f9","#0f172a","#475569","#f8fafc","#94a3b8","#e1e7ef","#c9d4e0","rgba(15,23,42,.45)","rgba(255,255,255,.86)","#fcd34d","#f4f9fd","#fef3c7","#fdf1d8","#eef2f6"]],
  ["cỡ chữ", ["12px","13px","14px","15px","16px","17px","18px","19px","20px","22px","24px","26px","28px","32px","1.16"]],
  ["khoảng cách", ["4px","8px","12px","16px","24px","32px","48px"]],
  ["bo góc", ["6px","8px","12px","18px","999px","14px"]],
  ["bóng", ["01px2pxrgba(15,23,42,.04),03px10pxrgba(15,23,42,.05)","02px6pxrgba(15,23,42,.06),012px28pxrgba(15,23,42,.1)","016px48pxrgba(15,23,42,.18),02px8pxrgba(15,23,42,.06)","04px14pxrgba(15,23,42,.12),01px3pxrgba(15,23,42,.08)","01px2pxrgba(8,47,73,.22),04px14pxrgba(12,74,110,.24)"]],
  ["chuyển động", ["cubic-bezier(.22,1,.36,1)","150ms","200ms"]],
  ["chiều cao", ["44px","52px","60px"]],
  ["lớp xếp", ["10","20","30","40","50"]],
  ["bề rộng", ["1280px"]],
  ["độ đậm", ["400","500","600"]],
];
console.log(`Claude Design: ${cd.length} token CSS (goc ${cd.filter((t) => t.tep === "goc.css").length}, y-nghia ${cd.filter((t) => t.tep === "y-nghia.css").length}, thanh-phan ${cd.filter((t) => t.tep === "thanh-phan.css").length}, nen-tang ${cd.filter((t) => t.tep === "nen-tang.css").length}); bộ v2: ${bo.length} token\n`);
console.log("== (1) 88 giá trị chép từ mã — có trong Claude Design? ==");
let dat = 0, thieu = 0;
for (const [nhom, vals] of EXP) {
  for (const v of vals) {
    const nv = norm(v);
    const hit = cd.filter((x) => norm(x.value) === nv || (nhom === "bóng" && norm(x.value).includes(nv)));
    if (hit.length) { dat++; console.log(`ĐẠT  ${nhom.padEnd(12)} ${String(v).padEnd(44)} ← ${hit.slice(0, 3).map((h) => h.name).join(", ")}${hit.length > 3 ? ` (+${hit.length - 3})` : ""}`); }
    else { thieu++; console.log(`THIẾU ${nhom.padEnd(12)} ${v}`); }
  }
}
console.log(`Tổng: ĐẠT ${dat}, THIẾU ${thieu}\n`);

// --- (2) Token Claude Design ghi nguồn "MỚI" hay "chốt" (khác mã)
console.log("== (2) Token Claude Design khai MỚI / chốt (không phải 'từ mã') ==");
for (const t of cd.filter((x) => !/từ mã/.test(x.desc))) console.log(`  ${t.tep.padEnd(14)} ${t.name.padEnd(26)} = ${t.value.slice(0, 40).padEnd(40)} — ${t.desc.slice(0, 100)}`);

// --- (3) Giá trị của Claude Design không có trong bộ v2, và ngược lại (so theo giá trị đã giải var)
const boVals = new Set(bo.map((b) => norm(b.value)));
const cdVals = new Set(cd.map((t) => norm(t.value)));
console.log("\n== (3a) Token Claude Design có GIÁ TRỊ không xuất hiện trong bộ v2 ==");
for (const t of cd.filter((x) => !boVals.has(norm(x.value)) && !/^var\(/.test(x.value) && !/font|phong|f-chinh|f-so/.test(x.name))) console.log(`  ${t.name.padEnd(26)} = ${t.value.slice(0, 60)} — ${t.desc.slice(0, 80)}`);
console.log("\n== (3b) Token bộ v2 có GIÁ TRỊ không xuất hiện trong Claude Design ==");
for (const b of bo.filter((x) => !cdVals.has(norm(x.value)) && !/\//.test(String(x.value)))) console.log(`  ${b.path.padEnd(40)} = ${String(b.value).slice(0, 50)} — ${b.desc.slice(0, 80)}`);
console.log("\n== (4) Token bộ v2 ghi MỚI ==");
for (const b of bo.filter((x) => /MỚI/.test(x.desc))) console.log(`  ${b.path.padEnd(40)} = ${String(b.value).slice(0, 40)} — ${b.desc.slice(0, 90)}`);
