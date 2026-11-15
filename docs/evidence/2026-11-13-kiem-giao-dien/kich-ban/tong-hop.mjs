// Gộp số liệu thô của do-quet.mjs (ngoài kho: ~/tourdao-ux-2026-11-13/so-lieu/*.json) thành bảng tóm tắt theo tiêu chí T1–T16 (kiểm giao diện 13/11/2026).
// Chạy từ GỐC kho: node docs/evidence/2026-11-13-kiem-giao-dien/kich-ban/tong-hop.mjs → docs/evidence/2026-11-13-kiem-giao-dien/so-lieu/tong-hop.json + tong-hop.md
// Lọc giả (ghi rõ để người kiểm lại đối chiếu):
//   T2 cắt chữ: bỏ hộp rộng ≤ 2 px (tiêu đề ẩn cho trình đọc màn hình, cách làm «visually-hidden»).
//   T4: chỉ khổ điện thoại 360/390/430 (máy tính không bắt buộc 44 × 44).
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const RA = join(HERE, "..", "so-lieu");
const THO = join(homedir(), "tourdao-ux-2026-11-13", "so-lieu");
const tep = readdirSync(THO).filter((f) => /^(nhieu|rong)-.*\.json$|^rong\.json$/.test(f) && !f.includes("tung-trang"));
const o = tep.flatMap((f) => JSON.parse(readFileSync(join(THO, f), "utf8")).ketQua.map((x) => ({ ...x, nhan: f.startsWith("rong") ? "rong" : "nhieu" })));
const N = o.filter((x) => x.nhan === "nhieu");
const ten = (x) => `${x.bo} ${x.loai ? x.loai + ":" : ""}${x.trang} @${x.kho}`;
const dem = (arr, k) => arr.reduce((a, x) => { const key = k(x); a[key] = (a[key] || 0) + 1; return a; }, {});
const top = (m, n = 15) => Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, n);
const trangDuy = (arr) => [...new Set(arr.map((x) => (x.loai ? x.loai + ":" : "") + x.trang))];
const DT = [360, 390, 430];
const that = N.filter((x) => !x.loi && typeof x.kho === "number");
const thatTrang = that.filter((x) => !x.loai);

const kq = { luc: new Date().toISOString(), tep, soO: o.length, soOLoi: o.filter((x) => x.loi).map(ten), soCapTrangVai: new Set(thatTrang.map((x) => x.bo + x.trang)).size };

// T1
const t1 = that.filter((x) => x.do?.tranNgang);
kq.T1 = { soO: t1.length, theoKho: dem(t1, (x) => x.kho), trang: trangDuy(t1), vd: t1.slice(0, 20).map((x) => `${ten(x)} thò: ${(x.do.thoRa || []).slice(0, 3).join(",")}`) };
// T2
const cat = that.flatMap((x) => (x.loiHt?.cat || []).filter((c) => c.rong > 2).map((c) => ({ ...c, o: ten(x), kho: x.kho, trang: x.trang })));
kq.T2 = { soCho: cat.length, theoPhanTu: top(dem(cat, (c) => c.el), 25), vd: Object.values(Object.fromEntries(cat.map((c) => [c.el, c]))).slice(0, 25).map((c) => `${c.o}: ${c.el} «${c.chu}» ${c.rong}/${c.can}px`) };
// T3
const t3 = that.flatMap((x) => (x.them?.t3 || []).map((c) => ({ ...c, o: ten(x), trang: x.trang, kho: x.kho })));
kq.T3 = { soCho: t3.length, soO: new Set(t3.map((c) => c.o)).size, theoCap: top(dem(t3, (c) => `${c.loai} ${c.el} ← ${c.biDeBoi}`), 25), theoKho: dem(t3, (c) => c.kho), vd: t3.slice(0, 25).map((c) => `${c.o}: ${c.loai} ${c.el} «${c.chu}» bị ${c.biDeBoi} đè (y ${c.y}/${c.vh})`) };
// T4
const t4o = that.filter((x) => DT.includes(x.kho) && !x.loai);
const t4 = t4o.flatMap((x) => (x.do?.nhoHon44 || []).map((c) => ({ ...c, o: ten(x) })));
kq.T4 = { soO: t4o.length, soOCoNhoHon44: t4o.filter((x) => x.do.soNhoHon44 > 0).length, tongCho: t4o.reduce((a, x) => a + x.do.soNhoHon44, 0), theoLop: top(dem(t4, (c) => `${c.the}.${c.lop} ${c.w}×${c.h}`), 25) };
// T5
const t5o = thatTrang.filter((x) => [390, 1280].includes(x.kho));
kq.T5 = { soO: t5o.length, khongMotH1: t5o.filter((x) => (x.do?.h1 || []).length !== 1).map((x) => `${ten(x)} h1=${(x.do?.h1 || []).length}`), nhieuNutChinh: t5o.filter((x) => (x.do?.nutChinhTrongManDau || []).length > 1).map((x) => `${ten(x)}: ${x.do.nutChinhTrongManDau.slice(0, 4).join(" | ")}`) };
// T6
const t6 = thatTrang.filter((x) => x.kho === 1280).map((x) => ({ o: ten(x), hinhNut: new Set((x.do?.nutKieu || []).map((n) => n.sig.replace(/\|c[^|]+/, ""))).size, coChu: x.them?.coChu?.so ?? 0, huyHieu: new Set((x.do?.huyHieuKieu || []).map((h) => h.sig)).size }));
kq.T6 = { soTrang: t6.length, quaBaHinhNut: t6.filter((x) => x.hinhNut > 3).length, quaNamCoChu: t6.filter((x) => x.coChu > 5).length, tbHinhNut: +(t6.reduce((a, x) => a + x.hinhNut, 0) / (t6.length || 1)).toFixed(1), tbCoChu: +(t6.reduce((a, x) => a + x.coChu, 0) / (t6.length || 1)).toFixed(1), nhieuNhat: t6.sort((a, b) => b.hinhNut - a.hinhNut).slice(0, 12) };
// T7
kq.T7 = {};
for (const k of [820, 1180, 1280, 1440]) {
  const a = thatTrang.filter((x) => x.kho === k && x.them?.t7);
  const rong = a.map((x) => x.them.t7.noiDungRong).filter(Number.isFinite).sort((p, q) => p - q);
  kq.T7[k] = { soTrang: a.length, noiDungRongMin: rong[0], noiDungRongTrungVi: rong[Math.floor(rong.length / 2)], noiDungRongMax: rong.at(-1), soMucRongKhacNhau: new Set(rong.map((r) => Math.round(r / 20) * 20)).size,
    khoiMotDau: a.reduce((s, x) => s + (x.loiHt?.rong?.length || 0), 0), vdRong: a.filter((x) => x.them.t7.noiDungRong).map((x) => `${x.trang}:${x.them.t7.noiDungRong}`).slice(0, 60) };
}
// T8
const ax = that.filter((x) => x.axe);
const axv = ax.flatMap((x) => x.axe.map((v) => ({ ...v, o: ten(x), trang: x.trang })));
kq.T8 = { soO: ax.length, theoLuat: Object.entries(axv.reduce((a, v) => { a[v.id] ??= { impact: v.impact, soO: 0, soNut: 0, vd: [] }; a[v.id].soO++; a[v.id].soNut += v.n; if (a[v.id].vd.length < 4) a[v.id].vd.push(`${v.o}: ${v.vd[0]}`); return a; }, {})).sort((a, b) => b[1].soO - a[1].soO),
  nangNghiemTrong: axv.filter((v) => ["serious", "critical"].includes(v.impact)).length };
// T9: chữ Anh / mã thô, trạng thái 403/404/mất mạng/rỗng
const anh = that.filter((x) => (x.do?.tuAnh || []).length);
kq.T9 = { chuAnh: top(dem(anh.flatMap((x) => x.do.tuAnh.map((t) => t)), (t) => t), 30), chuAnhVd: anh.slice(0, 20).map((x) => `${ten(x)}: ${x.do.tuAnh.join(", ")}`),
  trangThai: that.filter((x) => x.loai && x.kho === 390).map((x) => `${x.nhan} ${x.bo} ${x.loai}:${x.trang} → ${x.url} «${(x.do?.chuDau || "").slice(0, 90).replace(/\n/g, " / ")}»`),
  rong: o.filter((x) => x.nhan === "rong" && !x.loi && !x.loai && x.kho === 390).map((x) => `${x.bo} ${x.trang}: ${(x.do?.rong || []).slice(0, 2).join(" / ").slice(0, 120) || "(không có khối rỗng chung)"}`) };
// T15
const a15 = that.filter((x) => x.t15);
kq.T15 = { soO: a15.length, soOCoKhongTen: a15.filter((x) => x.t15.soKhongTen > 0).length, tong: a15.reduce((s, x) => s + x.t15.soKhongTen, 0), anhKhongTen: a15.reduce((s, x) => s + x.t15.anhKhongTen, 0), theoMota: top(dem(a15.flatMap((x) => x.t15.mota || []), (m) => m), 20), vd: a15.filter((x) => x.t15.soKhongTen).slice(0, 15).map((x) => `${ten(x)}: ${(x.t15.mota || []).join(", ")}`) };
// T16
for (const kieu of ["zoom200", "chu-x2"]) {
  const a = N.filter((x) => x.kho === `t16-${kieu}` && !x.loi);
  kq[`T16_${kieu}`] = { soTrang: a.length, tranNgang: a.filter((x) => x.tranNgang).map(ten), coChong: a.filter((x) => (x.them?.chong || []).length).length, coCat: a.filter((x) => (x.loiHt?.cat || []).filter((c) => c.rong > 2).length).length,
    chongVd: a.filter((x) => (x.them?.chong || []).length).slice(0, 15).map((x) => `${ten(x)}: ${x.them.chong.slice(0, 2).map((c) => `«${c.chuA}»×«${c.chuB}»`).join("; ")}`) };
}
kq.donVi = top(dem(thatTrang.filter((x) => x.kho === 390), (x) => `html ${x.them?.donVi?.html} body ${x.them?.donVi?.body}`), 5);
// chồng chữ ở khổ thường (T2 phụ)
const ch = that.filter((x) => (x.them?.chong || []).length);
kq.chongKhoThuong = { soO: ch.length, theoKho: dem(ch, (x) => x.kho), vd: ch.slice(0, 25).map((x) => `${ten(x)}: ${x.them.chong.slice(0, 2).map((c) => `${c.a}«${c.chuA}»×${c.b}«${c.chuB}» ${c.ox}×${c.oy}`).join("; ")}`) };
// Tab ở 1280
const tb = that.filter((x) => x.focus);
kq.focus = { soO: tb.length, oCoFocusKhongThay: tb.filter((x) => x.focus.some((f) => !f.thay)).length, vd: tb.filter((x) => x.focus.some((f) => !f.thay)).slice(0, 12).map((x) => `${ten(x)}: ${x.focus.filter((f) => !f.thay).map((f) => f.ten).slice(0, 3).join(" | ")}`) };

mkdirSync(RA, { recursive: true });
writeFileSync(join(RA, "tong-hop.json"), JSON.stringify(kq, null, 1));
const md = [`# Tổng hợp số liệu quét 13/11/2026 (máy sinh — tong-hop.mjs)`, ``, `Ô đo: ${kq.soO} (lỗi kịch bản: ${kq.soOLoi.length}); cặp trang × vai (NHIỀU): ${kq.soCapTrangVai}.`, ``,
  ...Object.entries(kq).filter(([k]) => /^T|chong|focus|donVi/.test(k)).map(([k, v]) => `## ${k}\n\n\`\`\`json\n${JSON.stringify(v, null, 1).slice(0, 6000)}\n\`\`\`\n`)].join("\n");
writeFileSync(join(RA, "tong-hop.md"), md);
console.log(`Ghi ${join(RA, "tong-hop.json")} — ${kq.soO} ô, ${kq.soOLoi.length} lỗi`);
