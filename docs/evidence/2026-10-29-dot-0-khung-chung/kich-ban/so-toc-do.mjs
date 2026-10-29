// QA2 đợt 0 (29/10/2026): so số đo tốc độ 27/10 (docs/evidence/2026-10-27-danh-gia-ux-tong-the/so-lieu/toc-do.json) với số mới (../so-lieu/toc-do.json)
// theo ngưỡng đặc tả đợt 0 mục 10.16: FCP lạnh và «khung xong» lạnh không xấu hơn 5 %; CLS lạnh ở hai trang mới ≤ 0,1; chuyển trang ≤ 101 ms.
// Chạy từ GỐC repo: node docs/evidence/2026-10-29-dot-0-khung-chung/kich-ban/so-toc-do.mjs [--lap-lai so-lieu/toc-do-tung-trang-lap3.json] > so-lieu/so-toc-do.md
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const MOI = join(HERE, "..", "so-lieu", "toc-do.json");
const CU = join(HERE, "..", "..", "2026-10-27-danh-gia-ux-tong-the", "so-lieu", "toc-do.json");
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };
const cu = JSON.parse(readFileSync(CU, "utf8")).ketQua, moi = JSON.parse(readFileSync(MOI, "utf8")).ketQua;
const lapLai = arg("--lap-lai") && existsSync(join(HERE, "..", arg("--lap-lai"))) ? JSON.parse(readFileSync(join(HERE, "..", arg("--lap-lai")), "utf8")).ketQua : [];
const trang = (ds) => new Map(ds.filter((x) => x.trang && x.lanh).map((x) => [`${x.bo} ${x.trang}`, x]));
const A = trang(cu), B = trang(moi);
const trungVi = (a) => { const s = a.filter((x) => x != null).sort((x, y) => x - y); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : null; };
const r = (x) => (x == null ? "—" : Math.round(x));
const pc = (a, b) => (a && b != null ? ((b - a) / a) * 100 : null);
const nhan = (p) => (p == null ? "—" : p > 5 ? `**+${p.toFixed(1)} % (xấu đi)**` : p < -5 ? `${p.toFixed(1)} % (tốt lên)` : `${p >= 0 ? "+" : ""}${p.toFixed(1)} % (chưa đổi)`);
const lapCua = (k, f) => { const ds = lapLai.filter((x) => `${x.bo} ${x.trang}` === k && x.lanh).map((x) => x.lanh[f]); return ds.length ? trungVi(ds) : null; };

const out = [];
out.push("| Bộ | Trang | FCP lạnh 27/10 | FCP lạnh mới | Δ FCP | Khung xong 27/10 | Khung xong mới | Δ khung | CLS lạnh 27/10 → mới | Nội dung xong 27/10 → mới | Lặp lại (trung vị FCP / khung) |");
out.push("|---|---|---:|---:|---|---:|---:|---|---|---|---|");
const fA = [], fB = [], kA = [], kB = [];
for (const [k, b] of B) {
  const a = A.get(k);
  const [bo, tr] = k.split(" ");
  if (!a) { out.push(`| ${bo} | ${tr} | mới | ${r(b.lanh.fcp)} | — | mới | ${r(b.lanh.khungXong)} | — | mới → ${b.lanh.cls} | mới → ${r(b.lanh.noiDungXong)} | ${r(lapCua(k, "fcp"))} / ${r(lapCua(k, "khungXong"))} |`); continue; }
  fA.push(a.lanh.fcp); fB.push(b.lanh.fcp); if (a.lanh.khungXong != null && b.lanh.khungXong != null) { kA.push(a.lanh.khungXong); kB.push(b.lanh.khungXong); }
  out.push(`| ${bo} | ${tr} | ${r(a.lanh.fcp)} | ${r(b.lanh.fcp)} | ${nhan(pc(a.lanh.fcp, b.lanh.fcp))} | ${r(a.lanh.khungXong)} | ${r(b.lanh.khungXong)} | ${nhan(pc(a.lanh.khungXong, b.lanh.khungXong))} | ${a.lanh.cls} → ${b.lanh.cls} | ${r(a.lanh.noiDungXong)} → ${r(b.lanh.noiDungXong)} | ${lapLai.length ? `${r(lapCua(k, "fcp"))} / ${r(lapCua(k, "khungXong"))}` : "—"} |`);
}
for (const [k] of A) if (!B.has(k)) out.push(`| ${k.split(" ")[0]} | ${k.split(" ")[1]} | (27/10 có, lần này không đo) | | | | | | | | |`);
out.push("");
out.push(`**Trung vị trên ${fA.length} trang chung:** FCP lạnh ${r(trungVi(fA))} → ${r(trungVi(fB))} ms (${nhan(pc(trungVi(fA), trungVi(fB)))}); khung xong lạnh ${r(trungVi(kA))} → ${r(trungVi(kB))} ms (${nhan(pc(trungVi(kA), trungVi(kB)))}).`);
out.push("");
const ct = (ds) => ds.find((x) => x.chuyenTrang)?.chuyenTrang ?? [];
out.push("| Khổ | Đích | Bấm→FCP 27/10 | Bấm→FCP mới | Bấm→nội dung 27/10 | Bấm→nội dung mới |");
out.push("|---|---|---:|---:|---:|---:|");
for (const b of ct(moi).filter((x) => x.dich || x.loi)) {
  const a = ct(cu).find((x) => x.kho === b.kho && x.dich === b.dich) ?? {};
  out.push(`| ${b.kho} | ${b.dich ?? "—"} | ${r(a.chuyenTrangFcp)} | ${b.loi ? "LỖI: " + b.loi : r(b.chuyenTrangFcp)} | ${r(a.chuyenTrangNoiDung)} | ${r(b.chuyenTrangNoiDung)} |`);
}
out.push("");
out.push("| Khổ | Trang | Nút | Phản hồi chạm 27/10 (ms) | Mới (ms) |");
out.push("|---|---|---|---:|---:|");
for (const b of ct(moi).filter((x) => x.cham)) for (const c of b.cham) {
  const a = (ct(cu).find((x) => x.kho === b.kho && x.cham)?.cham ?? []).find((y) => y.trang === c.trang && y.nut === c.nut) ?? {};
  out.push(`| ${b.kho} | ${c.trang} | ${c.nut} | ${r(a.ms)} | ${r(c.ms)} |`);
}
console.log(out.join("\n"));
