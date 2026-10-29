// Gom so-lieu/luoi.json thành so-lieu/tong-hop.md (bảng theo khuôn + bảng từng trang + ví dụ tệ nhất). Chạy: node …/tong-hop-luoi.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const EVID = join(dirname(fileURLToPath(import.meta.url)), "..");
const { ketQua, luc } = JSON.parse(readFileSync(join(EVID, "so-lieu", "luoi.json"), "utf8"));
// (f) Tiêu đề ẩn cho trình đọc màn hình (.visually-hidden / .sr-only, hộp 1×1 px) lọt bộ lọc «thấy được» của do-luoi.js — bỏ ở đây, tính lại «lặp».
for (const x of ketQua) { const f = x.do?.f; if (!f) continue; f.tieuDeThan = f.tieuDeThan.filter((t) => !/visually-hidden|sr-only/.test(t.phanTu)); f.coTieuDeLonTrongThan = f.tieuDeThan.some((t) => /^h1/.test(t.phanTu) || parseFloat(t.co) >= 22); f.lapChu = f.lapChu.filter((c) => f.tieuDeThan.some((t) => t.chu === c)); f.lap = f.lapChu.length > 0; }
const KHUON = ["bảng điều khiển", "danh sách", "chi tiết", "biểu mẫu", "thiết lập"];
const o = (p, w) => ketQua.find((x) => x.trang === p && x.kho === w && x.do && !x.do.loi);
const trang = [...new Set(ketQua.map((x) => x.trang))];
const loi = ketQua.filter((x) => x.loi || x.do?.loi);
// Mức bề rộng nội dung = bề rộng khối cấp một lớn nhất trong main (bỏ tiêu đề/dải/chú thích).
const rong = (x) => x?.do?.a?.rongKhoiLonNhat ?? x?.do?.a?.conDau?.rong ?? null;
const tran = (x) => (x?.do?.a?.tranChan ?? []).map((t) => `${t.maxWidth}${t.token ? " " + t.token.join("=") : t.styleNoiTuyen ? " (style nội tuyến)" : ""}`);
const L = [];
L.push(`# Tổng hợp số đo lưới bố cục — sinh tự động từ so-lieu/luoi.json (${luc})`, "");
L.push("## 1. Theo khuôn trang", "", "| Khuôn | Số trang | Bề rộng khối nội dung 1040 (px) | 1440 (px) | Trần max-width đang chặn (1040 / 1440) | (b) hàng >240 px ở 1040 · trang có | (b) ở 1440 | (c) ô lệch độ dài · dòng ô bỏ trống phải >240 (1040) | (d) vùng trống (1040) | (e) 390: trang tràn · hàng nút lộn xộn | (f) trang có tiêu đề lớn trong thân · trùng chữ thanh trên (1040) |", "|---|---|---|---|---|---|---|---|---|---|---|");
const tong = { n: 0 };
for (const k of KHUON) {
  const ds = trang.filter((p) => ketQua.find((x) => x.trang === p)?.khuon === k);
  const mức = (w) => [...new Set(ds.map((p) => rong(o(p, w))).filter((v) => v != null))].sort((a, b) => a - b).join(", ");
  const trn = (w) => [...new Set(ds.flatMap((p) => tran(o(p, w))))].join("; ") || "—";
  const dem = (w, f) => ds.reduce((s, p) => s + (o(p, w) ? f(o(p, w).do) : 0), 0);
  const coTrang = (w, f) => ds.filter((p) => o(p, w) && f(o(p, w).do)).length;
  L.push(`| ${k} | ${ds.length} | ${mức(1040)} | ${mức(1440)} | ${trn(1040)} / ${trn(1440)} | ${dem(1040, (d) => d.b.so)} · ${coTrang(1040, (d) => d.b.so > 0)} | ${dem(1440, (d) => d.b.so)} | ${dem(1040, (d) => d.c.so)} · ${dem(1040, (d) => d.c.soKhungTrongPhai)} | ${dem(1040, (d) => d.d.so)} | ${coTrang(390, (d) => d.e.tranNgang)} · ${dem(390, (d) => d.e.soHangNutLon)} | ${coTrang(1040, (d) => d.f.coTieuDeLonTrongThan)} · ${coTrang(1040, (d) => d.f.lap)} |`);
}
L.push("", "Ghi: bề rộng khối nội dung là khối cấp một lớn nhất trong `main` (bỏ tiêu đề, dải anh em, đoạn chú thích, thông báo). «Trần đang chặn» là phần tử có max-width px mà bề rộng thật bằng đúng trần ở khổ đó (±2 px); «—» nghĩa là ở khổ đó không trần nào chặn, nội dung rộng theo cột.", "");
L.push("## 2. Từng trang (1040 / 1440)", "", "| Trang | Khuôn | Bộ | main 1040 · 1440 | khối lớn nhất 1040 · 1440 | trần chặn 1440 | mực phải còn trống 1440 | b 1040 (lớn nhất px) | b 1440 | b >160 (1040) | c lệch · dòng trống phải | d | e tràn 390 · nút | f tiêu đề thân | f trùng | cắt 6 màn |", "|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|");
for (const p of trang) {
  const a = o(p, 1040), b = o(p, 1440), m = o(p, 390); const x = a ?? b; if (!x) { L.push(`| ${p} | — | — | không đo được | | | | | | | | | | | | |`); continue; }
  const bMax = (q) => (q?.do.b.ds[0]?.khoang ?? 0);
  L.push(`| \`${p}\` | ${x.khuon} | ${x.bo} | ${a?.do.a.main.rong ?? "—"} · ${b?.do.a.main.rong ?? "—"} | ${rong(a) ?? "—"} · ${rong(b) ?? "—"} | ${tran(b).join("; ") || "—"} | ${b?.do.a.trongPhaiMuc ?? "—"} | ${a?.do.b.so ?? "—"} (${bMax(a)}) | ${b?.do.b.so ?? "—"} (${bMax(b)}) | ${a?.do.b.so160 ?? "—"} | ${a?.do.c.so ?? "—"} · ${a?.do.c.soKhungTrongPhai ?? "—"} | ${a?.do.d.so ?? "—"} | ${m ? (m.do.e.tranNgang ? "CÓ" : "không") + " · " + m.do.e.soHangNutLon : "—"} | ${a?.do.f.coTieuDeLonTrongThan ? "có" : "không"} | ${a?.do.f.lap ? "trùng" : "—"} | ${a?.do.catDoc ? "có" : ""} |`);
}
// Ví dụ tệ nhất
const vd = (w, f, n = 8) => ketQua.filter((x) => x.kho === w && x.do && !x.do.loi).flatMap((x) => f(x.do).map((v) => ({ trang: x.trang, ...v }))).sort((a, b) => (b.khoang ?? b.trongPhai ?? b.rong ?? 0) - (a.khoang ?? a.trongPhai ?? a.rong ?? 0)).slice(0, n);
const motMoiTrang = (ds) => ds.filter((v, i) => ds.findIndex((u) => u.trang === v.trang) === i);
L.push("", "## 3. Ví dụ tệ nhất", "", "### (b) Hàng «chữ một đầu, nút/số một đầu» ở 1040 (mỗi trang một ví dụ, khoảng trống giữa hai cụm mực)", "");
for (const v of motMoiTrang(vd(1040, (d) => d.b.ds, 400)).slice(0, 10)) L.push(`- \`${v.trang}\` ${v.khoang} px — \`${v.phanTu}\` (${v.display}, justify-content ${v.jc}) — «${v.trai}» … «${v.phai}»`);
L.push("", "### (b) cùng phép đo ở 1440", "");
for (const v of motMoiTrang(vd(1440, (d) => d.b.ds, 400)).slice(0, 10)) L.push(`- \`${v.trang}\` ${v.khoang} px — \`${v.phanTu}\` — «${v.trai}» … «${v.phai}»`);
L.push("", "### (c) Ô nhập lệch độ dài dữ liệu (1040)", "");
for (const v of vd(1040, (d) => d.c.ds, 400)) L.push(`- \`${v.trang}\` ${v.loai} rộng ${v.rong} px — «${v.nhan}» \`${v.phanTu}\``);
L.push("", "### (c) Dòng ô nhập ngắn, phần phải khung trống > 240 px (1040)", "");
for (const v of vd(1040, (d) => d.c.khungTrongPhai, 400)) L.push(`- \`${v.trang}\` trống phải ${v.trongPhai} px / khung ${v.rongKhung} px — \`${v.phanTu}\` — ô: ${v.o.join("; ")}`);
L.push("", "### (d) Vùng trống chiếm chỗ (1040)", "");
for (const v of vd(1040, (d) => d.d.ds, 400)) L.push(`- \`${v.trang}\` ${v.rong} px (${Math.round(v.tiLe * 100)}% main) × cao hàng ${v.caoHang ?? v.cao} px, ${v.soNoiDung} phần tử nội dung — \`${v.phanTu}\` — «${v.chu}»`);
L.push("", "### (e) 390: tràn ngang và hàng nút lộn xộn", "");
for (const x of ketQua.filter((x) => x.kho === 390 && x.do && !x.do.loi)) { const e = x.do.e; if (e.tranNgang || e.soHangNutLon) L.push(`- \`${x.trang}\`${e.tranNgang ? ` TRÀN (scrollWidth ${e.scrollWidth}): ${e.thoRa.slice(0, 3).map((t) => "`" + t.phanTu + "` tới " + t.phai).join(", ")}` : ""}${e.soHangNutLon ? ` — ${e.soHangNutLon} hàng nút: ${e.hangNut.slice(0, 2).map((h) => `\`${h.phanTu.split(" > ").pop()}\` ${h.soNut} nút/${h.dong} dòng cao [${h.cao.join(",")}] (${h.nut.join(" | ")})`).join("; ")}` : ""}`); }
L.push("", "### (f) Tiêu đề lớn trong thân (1040)", "");
for (const x of ketQua.filter((x) => x.kho === 1040 && x.do && !x.do.loi && x.do.f.coTieuDeLonTrongThan)) L.push(`- \`${x.trang}\` thanh trên «${x.do.f.thanhTren}» — thân: ${x.do.f.tieuDeThan.map((t) => `«${t.chu}» ${t.co}/${t.dam}`).join(", ")}${x.do.f.lap ? " — TRÙNG" : ""}`);
L.push("", "## 4. Ô không đo được", "");
if (!loi.length) L.push("Không có ô lỗi."); else for (const x of loi) L.push(`- \`${x.trang}\` ${x.kho}: ${x.loi ?? x.do.loi}`);
writeFileSync(join(EVID, "so-lieu", "tong-hop.md"), L.join("\n") + "\n");
console.log("Ghi so-lieu/tong-hop.md", trang.length, "trang", ketQua.length, "ô,", loi.length, "lỗi");
