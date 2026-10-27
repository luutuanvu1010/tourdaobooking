// Đối chiếu tokens.json của bộ v2 với giá trị ở DAU-VAO-BO-V2.md (chép từ mã). Chỉ đọc, in bảng.
import { readFileSync } from "node:fs";
const t = JSON.parse(readFileSync("/Users/tuanbao/.claude/jobs/f5f75857/tmp/bo-v2/project/tokens.json", "utf8"));
const all = [];
(function walk(o, p) {
  if (Array.isArray(o)) { o.forEach((v, i) => walk(v, [...p, String(i)])); return; }
  if (o && typeof o === "object") {
    if ("name" in o && ("value" in o || "size" in o || "weight" in o)) {
      const val = o.value ?? (o.size !== undefined ? `${o.size}/${o.weight ?? ""}` : o.weight);
      all.push({ path: `${p.filter((x) => !/^\d+$/.test(x)).join(".")}.${o.name}`, value: val, desc: String(o.usage ?? o.note ?? ""), raw: o });
      return;
    }
    for (const [k, v] of Object.entries(o)) walk(v, [...p, k]);
  }
})(t, []);
console.log("Khoá của type:", Object.keys(t.type).join(", "), "| ví dụ:", JSON.stringify(Object.values(t.type)[1]).slice(0, 300), "\n");
const norm = (s) => String(typeof s === "object" ? JSON.stringify(s) : s).toLowerCase().replace(/\s+/g, "").replace(/0\./g, ".");
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
let dat = 0, thieu = 0;
for (const [nhom, vals] of EXP) {
  for (const v of vals) {
    const nv = norm(v);
    const hit = all.filter((x) => norm(x.value) === nv || (nhom === "bóng" && norm(x.value).includes(nv)));
    if (hit.length) { dat++; console.log(`ĐẠT  ${nhom.padEnd(12)} ${String(v).padEnd(44)} ← ${hit.slice(0, 3).map((h) => h.path).join(", ")}${hit.length > 3 ? ` (+${hit.length - 3})` : ""}`); }
    else { thieu++; console.log(`THIẾU ${nhom.padEnd(12)} ${v}`); }
  }
}
console.log(`\nTổng token: ${all.length}; giá trị đầu vào ĐẠT ${dat}, THIẾU ${thieu}`);
const dem = (re) => all.filter((x) => re.test(x.desc)).length;
console.log(`Ghi MỚI: ${dem(/MỚI/)}; ĐỔI: ${dem(/ĐỔI/)}; Gốc·tourdaovn: ${dem(/tourdaovn/)}; không có dòng công dụng: ${all.filter((x) => !x.desc.trim()).length}`);
console.log("\nToken MỚI / ĐỔI:");
for (const x of all.filter((x) => /MỚI|ĐỔI/.test(x.desc))) console.log(`  ${x.path} = ${typeof x.value === "object" ? JSON.stringify(x.value) : x.value} — ${x.desc.slice(0, 110)}`);
console.log("\nĐộ đậm:");
for (const x of all.filter((x) => /fw|weight|dam/i.test(x.path))) console.log(`  ${x.path} = ${x.value}`);
console.log("\nNhóm cấp 1:", Object.keys(t).filter((k) => !k.startsWith("$")).join(", "));
