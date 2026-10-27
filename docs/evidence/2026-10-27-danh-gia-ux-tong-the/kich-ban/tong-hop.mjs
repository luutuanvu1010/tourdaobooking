// TỔNG HỢP số liệu quét (đánh giá UX 27/10/2026): đọc so-lieu/{nhieu,it,rong}.json do do-trang.mjs ghi, sinh các bảng Markdown để ghép vào KIEM-KE.md và
// PHU-LUC-PHAT-HIEN.md (không chấm, chỉ đếm): (A) trang × họ × bộ quyền có lối vào × ảnh; (B) số đo từng trang ở 390 / 1040; (C) ba trạng thái 403 / 404 / mất
// mạng theo bộ; (D) rỗng so với nhiều; (E) sổ lệch ĐO TRÊN MÀN HÌNH (chữ ký nút / huy hiệu / thẻ / ô gõ / h1 / vùng dính / chữ rỗng / phông); (F) axe theo luật;
// (G) chữ Anh lộ ra; (H) lỗi console; (I) thanh điều hướng từng bộ (vai nào nhìn giống vai nào). Chỉ đọc. Chạy từ GỐC kho:
//   node docs/evidence/2026-10-27-danh-gia-ux-tong-the/kich-ban/tong-hop.mjs   → so-lieu/tong-hop.md + so-lieu/tong-hop.json
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const EVID = join(HERE, "..");
const SL = join(EVID, "so-lieu");
const maTran = JSON.parse(readFileSync(join(EVID, "ma-tran-quyen.json"), "utf8"));
const NHAN = ["nhieu", "it", "rong"].filter((n) => existsSync(join(SL, `${n}.json`)));
const D = Object.fromEntries(NHAN.map((n) => [n, JSON.parse(readFileSync(join(SL, `${n}.json`), "utf8")).ketQua]));
const TEN_BO = { SALES: "Bán hàng", INTERN: "Thực tập", ACCOUNTING: "Kế toán", ADMIN: "Quản trị", FIELD: "Hướng dẫn viên", PARTNER: "Đối tác", SUPER_ADMIN: "Toàn quyền", DRIVER: "Tài xế công ty", DRIVER_PARTNER: "Tài xế đối tác", HR: "Nhân sự" };
const VIET = { SALES: "BH", INTERN: "TT", ACCOUNTING: "KT", ADMIN: "QT", FIELD: "HDV", PARTNER: "ĐT", SUPER_ADMIN: "TQ", DRIVER: "TX", DRIVER_PARTNER: "TXĐT", HR: "NS" };
const UU_TIEN = ["SUPER_ADMIN", "ADMIN", "ACCOUNTING", "SALES", "FIELD", "PARTNER", "INTERN", "HR", "DRIVER", "DRIVER_PARTNER"];
const md = [];
const bang = (cot, dong) => { md.push(`| ${cot.join(" | ")} |`, `| ${cot.map(() => "---").join(" | ")} |`); for (const d of dong) md.push(`| ${d.map((x) => String(x ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ")).join(" | ")} |`); md.push(""); };
const tieuDe = (o) => (o.do?.tieuDe ?? "").replace(/\s*[—-]\s*Island Booking System\s*$/, "").trim();
const oCua = (nhan, trang, kho, loai = null) => UU_TIEN.map((bo) => D[nhan]?.find((o) => o.bo === bo && o.trang === trang && o.kho === kho && (o.loai ?? null) === loai && !o.loi)).find(Boolean);
const tatCaTrang = [...new Set(Object.values(maTran.bo).flatMap((b) => b.trang))].filter((p) => !["/home", "/danh-muc-giay-to"].includes(p));
const hoCua = (p) => D.nhieu?.find((o) => o.trang === p && !o.loai)?.ho ?? D[NHAN[0]]?.find((o) => o.trang === p && !o.loai)?.ho ?? "?";
const THU_TU_HO = ["bảng điều khiển", "danh sách", "chi tiết", "biểu mẫu", "thiết lập"];
const trangXep = [...tatCaTrang].sort((a, b) => THU_TU_HO.indexOf(hoCua(a)) - THU_TU_HO.indexOf(hoCua(b)) || a.localeCompare(b));
const boCo = (p) => UU_TIEN.filter((bo) => maTran.bo[bo].trang.includes(p));
const J = { trang: {}, soLech: {}, axe: {}, tuAnh: {}, console: {}, nav: {}, trangThai: {} };

// ---------- A. Trang × họ × bộ quyền × ảnh ----------
md.push("## A. Trang × họ màn × bộ quyền có lối vào × ảnh (trạng thái NHIỀU; ảnh của bộ quyền rộng nhất có trang)", "");
bang(["Trang", "Tiêu đề", "Họ", "Bộ quyền có lối vào", "Ảnh 390", "Ảnh 1040", "Ảnh thêm"], trangXep.map((p) => {
  const o390 = oCua("nhieu", p, 390), o1040 = oCua("nhieu", p, 1040), o768 = oCua("nhieu", p, 768), o1440 = oCua("nhieu", p, 1440);
  J.trang[p] = { ho: hoCua(p), tieuDe: tieuDe(o390 ?? o1040 ?? {}), bo: boCo(p), anh390: o390?.anh, anh1040: o1040?.anh, boAnh: o390?.bo };
  return [`\`${p}\``, tieuDe(o390 ?? o1040 ?? {}), hoCua(p), boCo(p).map((b) => VIET[b]).join(", "), o390?.anh ?? "—", o1040?.anh ?? "—", [o768?.anh, o1440?.anh].filter(Boolean).join("; ") || "—"];
}));

// ---------- B. Số đo từng trang ----------
const soAxe = (o) => (o?.axe ?? []).reduce((a, v) => a + v.n, 0);
const axeNang = (o) => (o?.axe ?? []).filter((v) => ["serious", "critical"].includes(v.impact)).map((v) => `${v.id}×${v.n}`).join(", ");
const focusThay = (o) => (o?.focus?.length ? `${o.focus.filter((f) => f.thay).length}/${o.focus.length}` : "—");
for (const kho of [390, 1040]) {
  md.push(`## B${kho === 390 ? "1" : "2"}. Số đo từng trang ở khổ ${kho} (NHIỀU; bộ quyền rộng nhất)`, "");
  bang(["Trang", "Bộ", "Màn cuộn", "Tương tác", "Vùng chạm <44", "Ô gõ <16px", "Ô không nhãn", "Tràn ngang", "axe (lỗi)", "axe nặng", "Chữ Anh / mã thô", "Lỗi console", kho === 1040 ? "Focus thấy (Tab)" : "Nút chính màn đầu", "h1 (cỡ/đậm)", "Phông"], trangXep.map((p) => {
    const o = oCua("nhieu", p, kho); if (!o) return [`\`${p}\``, "—"];
    const d = o.do;
    J.trang[p][`do${kho}`] = { soManCuon: d.soManCuon, soTuongTac: d.soTuongTac, soNhoHon44: d.soNhoHon44, oGoNho: d.oGoNho.length, oKhongNhan: d.oKhongNhan.length, tranNgang: d.tranNgang, axe: soAxe(o), axeNang: axeNang(o), tuAnh: d.tuAnh, loiConsole: o.loiConsole?.length ?? 0, focus: focusThay(o), nutChinh: d.nutChinhTrongManDau, h1: d.h1.map((h) => `${h.co}/${h.dam}`), phong: d.phong, dinh: d.dinh, catChu: d.catChu, thoRa: d.thoRa };
    return [`\`${p}\``, VIET[o.bo], d.soManCuon, d.soTuongTac, d.soNhoHon44, d.oGoNho.length, d.oKhongNhan.length, d.tranNgang ? `CÓ (${d.thoRa.slice(0, 3).join(", ")})` : "không", soAxe(o), axeNang(o) || "—", d.tuAnh.slice(0, 4).join(", ") || "—", o.loiConsole?.length ?? 0, kho === 1040 ? focusThay(o) : `${d.nutChinhTrongManDau.length}: ${d.nutChinhTrongManDau.slice(0, 3).join(" / ")}`, d.h1.map((h) => `${h.co}/${h.dam}`).join("; ") || "(không h1)", d.phong];
  }));
}

// ---------- C. Ba trạng thái ----------
md.push("## C. Ba trạng thái chung theo bộ quyền (NHIỀU, 390): không có quyền (403), không có trang (404), mất mạng", "");
bang(["Bộ", "Trạng thái", "Trang thử", "Đích cuối (url)", "Tiêu đề", "Chữ đầu màn (120 ký tự)", "Ảnh"], D.nhieu?.filter((o) => o.loai && o.kho === 390).map((o) => {
  (J.trangThai[o.loai] ??= []).push({ bo: o.bo, trang: o.trang, url: o.url, chu: o.do?.chuDau?.slice(0, 200), anh: o.anh });
  return [VIET[o.bo], o.loai, `\`${o.trang}\``, o.url ?? o.loi, tieuDe(o), (o.do?.chuDau ?? o.loi ?? "").slice(0, 120), o.anh ?? "—"];
}) ?? []);

// ---------- D. Rỗng so với nhiều ----------
if (D.rong) {
  md.push("## D. Trạng thái RỖNG so với NHIỀU (390, bộ rộng nhất): trang nói gì khi chưa có dữ liệu", "");
  bang(["Trang", "Rỗng: chữ trạng thái rỗng", "Rỗng: màn cuộn", "Nhiều: màn cuộn", "Rỗng: chữ đầu màn (100)", "Ảnh rỗng 390"], trangXep.map((p) => {
    const r = oCua("rong", p, 390), n = oCua("nhieu", p, 390); if (!r) return [`\`${p}\``, "—"];
    J.trang[p].rong = { chuRong: r.do.rong, soManCuon: r.do.soManCuon, chuDau: r.do.chuDau.slice(0, 160), anh: r.anh };
    return [`\`${p}\``, r.do.rong.slice(0, 3).join(" / ") || "(không có chữ rỗng)", r.do.soManCuon, n?.do.soManCuon ?? "—", r.do.chuDau.slice(0, 100), r.anh];
  }));
}

// ---------- E. Sổ lệch đo trên màn hình ----------
md.push("## E. Sổ lệch thành phần ĐO TRÊN MÀN HÌNH (mọi trang, mọi bộ, 390 + 1040, NHIỀU): chữ ký = chiều cao | bo góc | nền | chữ | viền | cỡ/đậm", "");
const gom = (lay) => { const m = new Map(); for (const o of D.nhieu ?? []) { if (o.loai || !o.do) continue; for (const x of lay(o.do)) { const k = x.sig; if (!m.has(k)) m.set(k, { sig: k, trang: new Set(), lop: new Set(), chu: new Set(), n: 0 }); const e = m.get(k); e.n++; e.trang.add(`${o.trang}@${o.kho}`); if (x.lop) e.lop.add(x.lop); if (x.chu) e.chu.add(x.chu); } } return [...m.values()].sort((a, b) => b.trang.size - a.trang.size); };
const nhom = { "Nút": gom((d) => d.nutKieu), "Huy hiệu / thẻ trạng thái": gom((d) => d.huyHieuKieu), "Thẻ / khối": gom((d) => d.theKieu), "Ô gõ": gom((d) => d.oGoKieu.map((s) => ({ sig: s }))) };
for (const [ten, ds] of Object.entries(nhom)) {
  J.soLech[ten] = { soKieu: ds.length, kieu: ds.map((e) => ({ sig: e.sig, soTrang: e.trang.size, trang: [...e.trang].slice(0, 12), lop: [...e.lop].slice(0, 6), chu: [...e.chu].slice(0, 6) })) };
  md.push(`### E.${ten}: ${ds.length} chữ ký khác nhau (${ds.reduce((a, e) => a + e.n, 0)} lần đo)`, "");
  bang(["Chữ ký", "Số trang@khổ", "Lớp CSS hay gặp", "Chữ ví dụ", "Trang ví dụ"], ds.slice(0, 45).map((e) => [`\`${e.sig}\``, e.trang.size, [...e.lop].slice(0, 4).join(", "), [...e.chu].slice(0, 4).join(" / "), [...e.trang].slice(0, 5).join(", ")]));
}
// Huy hiệu: cùng CHỮ mà khác chữ ký = cùng ý nghĩa khác hình.
const chuHH = new Map();
for (const o of D.nhieu ?? []) { if (o.loai || !o.do) continue; for (const x of o.do.huyHieuKieu) { if (!chuHH.has(x.chu)) chuHH.set(x.chu, new Map()); const m = chuHH.get(x.chu); if (!m.has(x.sig)) m.set(x.sig, new Set()); m.get(x.sig).add(`${o.trang}@${o.kho}`); } }
const hhLech = [...chuHH.entries()].filter(([, m]) => m.size > 1).sort((a, b) => b[1].size - a[1].size);
J.soLech.huyHieuCungChuKhacHinh = hhLech.map(([chu, m]) => ({ chu, soHinh: m.size, hinh: [...m.entries()].map(([sig, tr]) => ({ sig, trang: [...tr].slice(0, 6) })) }));
md.push(`### E.Huy hiệu CÙNG CHỮ nhưng KHÁC HÌNH: ${hhLech.length} chữ`, "");
bang(["Chữ", "Số hình", "Các hình (chữ ký → trang)"], hhLech.slice(0, 40).map(([chu, m]) => [chu, m.size, [...m.entries()].map(([sig, tr]) => `\`${sig}\` → ${[...tr].slice(0, 3).join(", ")}`).join("<br>")]));
// h1, vùng dính, chữ rỗng, phông
const h1Map = new Map(); const dinhMap = new Map(); const rongMap = new Map(); const phongMap = new Map();
for (const o of D.nhieu ?? []) { if (o.loai || !o.do) continue; for (const h of o.do.h1) { const k = `${h.co}/${h.dam}`; (h1Map.get(k) ?? h1Map.set(k, new Set()).get(k)).add(`${o.trang}@${o.kho}`); } for (const s of o.do.dinh) { const k = s.replace(/:-?\d+$/, ""); (dinhMap.get(k) ?? dinhMap.set(k, new Set()).get(k)).add(`${o.trang}@${o.kho}`); } for (const r of o.do.rong) (rongMap.get(r) ?? rongMap.set(r, new Set()).get(r)).add(o.trang); (phongMap.get(o.do.phong) ?? phongMap.set(o.do.phong, new Set()).get(o.do.phong)).add(o.trang); }
J.soLech.h1 = [...h1Map.entries()].map(([k, s]) => ({ coDam: k, soTrang: s.size, trang: [...s].slice(0, 10) }));
md.push(`### E.Tiêu đề h1: ${h1Map.size} cặp cỡ/đậm`, ""); bang(["Cỡ/đậm", "Số trang@khổ", "Ví dụ"], [...h1Map.entries()].sort((a, b) => b[1].size - a[1].size).map(([k, s]) => [k, s.size, [...s].slice(0, 8).join(", ")]));
md.push(`### E.Vùng dính (sticky/fixed): ${dinhMap.size} kiểu`, ""); bang(["Lớp:vị trí", "Số trang@khổ", "Ví dụ"], [...dinhMap.entries()].sort((a, b) => b[1].size - a[1].size).slice(0, 40).map(([k, s]) => [`\`${k}\``, s.size, [...s].slice(0, 6).join(", ")]));
md.push(`### E.Chữ trạng thái rỗng: ${rongMap.size} câu`, ""); bang(["Câu", "Trang"], [...rongMap.entries()].map(([k, s]) => [k, [...s].join(", ")]));
md.push(`### E.Phông thân trang: ${phongMap.size}`, ""); bang(["Phông", "Số trang", "Ví dụ"], [...phongMap.entries()].map(([k, s]) => [k, s.size, [...s].slice(0, 6).join(", ")]));
J.soLech.dinh = [...dinhMap.entries()].map(([k, s]) => ({ kieu: k, soTrang: s.size })); J.soLech.rong = [...rongMap.entries()].map(([k, s]) => ({ chu: k, trang: [...s] })); J.soLech.phong = [...phongMap.entries()].map(([k, s]) => ({ phong: k, trang: [...s] }));

// ---------- F. axe theo luật ----------
const axeMap = new Map();
for (const o of D.nhieu ?? []) for (const v of o.axe ?? []) { const e = axeMap.get(v.id) ?? axeMap.set(v.id, { id: v.id, impact: v.impact, n: 0, trang: new Set(), vd: v.vd }).get(v.id); e.n += v.n; e.trang.add(`${o.trang}@${o.kho}${o.loai ? ":" + o.loai : ""}`); }
J.axe = [...axeMap.values()].map((e) => ({ ...e, trang: [...e.trang] }));
md.push("## F. axe (WCAG 2.1 A/AA) theo luật, mọi ô NHIỀU", ""); bang(["Luật", "Mức", "Số nút lỗi", "Số trang@khổ", "Ví dụ phần tử", "Trang ví dụ"], [...axeMap.values()].sort((a, b) => b.trang.size - a.trang.size).map((e) => [e.id, e.impact, e.n, e.trang.size, e.vd.slice(0, 2).join(" ; ").slice(0, 100), [...e.trang].slice(0, 5).join(", ")]));

// ---------- G. Chữ Anh ----------
const tuMap = new Map();
for (const o of D.nhieu ?? []) for (const t of o.do?.tuAnh ?? []) (tuMap.get(t) ?? tuMap.set(t, new Set()).get(t)).add(`${o.trang}@${o.kho}${o.loai ? ":" + o.loai : ""}`);
J.tuAnh = [...tuMap.entries()].map(([t, s]) => ({ tu: t, trang: [...s] }));
md.push("## G. Chữ Anh / mã thô lộ ra (NHIỀU)", ""); bang(["Chữ", "Số trang@khổ", "Trang"], [...tuMap.entries()].sort((a, b) => b[1].size - a[1].size).map(([t, s]) => [`\`${t}\``, s.size, [...s].slice(0, 8).join(", ")]));

// ---------- H. Lỗi console ----------
md.push("## H. Lỗi console (NHIỀU)", ""); const cs = (D.nhieu ?? []).filter((o) => o.loiConsole?.length); J.console = cs.map((o) => ({ bo: o.bo, trang: o.trang, kho: o.kho, loai: o.loai, loi: o.loiConsole.slice(0, 3) }));
bang(["Bộ", "Trang", "Khổ", "Trạng thái", "Lỗi đầu tiên (200)"], cs.map((o) => [VIET[o.bo], `\`${o.trang}\``, o.kho, o.loai ?? "", o.loiConsole[0].slice(0, 200)]));

// ---------- I. Thanh điều hướng từng bộ ----------
md.push("## I. Thanh điều hướng mỗi bộ quyền nhìn thấy (NHIỀU, trang đầu): vai nào nhìn giống vai nào", "");
bang(["Bộ", "Trang đầu", "390: mục thanh tab / thanh trên", "1040: mục thanh bên"], UU_TIEN.map((bo) => {
  const dau = maTran.bo[bo].trangDau ?? "/";
  const o390 = D.nhieu?.find((o) => o.bo === bo && o.trang === dau && o.kho === 390 && !o.loai), o1040 = D.nhieu?.find((o) => o.bo === bo && o.trang === dau && o.kho === 1040 && !o.loai);
  J.nav[bo] = { trangDau: dau, nav390: o390?.do.nav.map((n) => n.ten), nav1040: o1040?.do.nav.map((n) => n.ten), coTabbar: o390?.do.coTabbar, coSidebar: o1040?.do.coSidebar };
  return [`${TEN_BO[bo]} (${VIET[bo]})`, `\`${dau}\``, (o390?.do.nav ?? []).map((n) => n.sang ? `**${n.ten}**` : n.ten).join(" · ") || "—", (o1040?.do.nav ?? []).map((n) => n.sang ? `**${n.ten}**` : n.ten).join(" · ") || "—"];
}));

// ---------- J. 15 vai → 10 bộ quyền (sinh từ mã: src/shared/roles.ts → permissions.ts) ----------
md.push("## J. Bảng gộp 15 vai → 10 bộ quyền (sinh từ mã; vai cùng bộ nhìn thấy cùng trang và cùng thanh điều hướng)", "");
const vaiTheoBo = {};
for (const v of maTran.vaiVeBo) { const bo = v.quyen.join("+"); (vaiTheoBo[bo] ??= []).push(v); }
bang(["Bộ quyền (mã)", "Vai được gộp (tên hiện trên giao diện)", "Nhóm", "Trang đầu", "Số trang có lối vào", "Mục thanh bên", "Chỉ Toàn quyền gán?"], Object.entries(vaiTheoBo).sort((a, b) => b[1].length - a[1].length).map(([bo, ds]) => {
  const chinh = bo.split("+")[0]; const info = maTran.bo[chinh] ?? {};
  return [`${TEN_BO[chinh] ?? chinh} (\`${bo}\`)`, ds.map((v) => `${v.ten} (\`${v.vai}\`)`).join("; "), [...new Set(ds.map((v) => v.nhom))].join("/"), `\`${info.trangDau ?? "?"}\``, (info.trang ?? []).filter((p) => !["/home", "/danh-muc-giay-to"].includes(p)).length, info.soMucThanhBen ?? "?", ds.every((v) => v.chiToanQuyenGan) ? "có" : ds.some((v) => v.chiToanQuyenGan) ? "một phần" : "không"];
}));
J.vaiTheoBo = Object.fromEntries(Object.entries(vaiTheoBo).map(([bo, ds]) => [bo, ds.map((v) => v.vai)]));

// ---------- K. Tốc độ (toc-do.json, nếu có) ----------
if (existsSync(join(SL, "toc-do.json"))) {
  const T = JSON.parse(readFileSync(join(SL, "toc-do.json"), "utf8"));
  const ds = T.ketQua.filter((o) => o.trang);
  const r = (x) => (x == null ? "—" : Math.round(x));
  const kb = (x) => (x == null ? "—" : Math.round(x / 1024));
  const qua = (v, nguong) => (v != null && v > nguong ? `**${Math.round(v)}**` : r(v));
  md.push(`## K. Tốc độ cảm nhận (mặt 11): ${T.dieuKien.mang}; CPU ${T.dieuKien.cpu}; ${T.dieuKien.khung}. In đậm = vượt ngân sách (mở trang > 1.000 ms, CLS > 0,1, TBT > 200 ms)`, "");
  bang(["Trang", "Bộ", "Lạnh: FCP", "LCP", "Khung xong", "Nội dung xong", "API cuối về", "CLS", "TBT", "Khung xương?", "Tải: JS KB (nén/giải)", "CSS KB", "Phông KB", "API (số)", "Nóng: FCP", "Nội dung xong", "CLS", "Nạp sẵn (mục / ms)"], ds.map((o) => {
    if (o.loi) return [`\`${o.trang}\``, VIET[o.bo], "LỖI: " + o.loi.slice(0, 80)];
    const l = o.lanh, n = o.nong;
    J.tocDo ??= {}; J.tocDo[o.trang] = { lanh: { fcp: l.fcp, lcp: l.lcp, khungXong: l.khungXong, noiDungXong: l.noiDungXong, cls: l.cls, tbt: l.tbt, jsNen: l.tai.js?.byte, jsGiai: l.tai.js?.giai, cssNen: l.tai.css?.byte, api: l.tai.api?.so, khungXuong: l.khungXuong }, nong: { fcp: n.fcp, noiDungXong: n.noiDungXong, cls: n.cls } };
    return [`\`${o.trang}\``, VIET[o.bo], r(l.fcp), r(l.lcp), r(l.khungXong), qua(l.noiDungXong, 1000), r(l.apiCuoiVe), l.cls > 0.1 ? `**${l.cls}**` : l.cls, qua(l.tbt, 200), l.khungXuong ? "có" : (l.dangTai ? "chữ" : "không"), `${kb(l.tai.js?.byte)}/${kb(l.tai.js?.giai)}`, kb(l.tai.css?.byte), kb(l.tai.phong?.byte), l.tai.api?.so ?? 0, r(n.fcp), qua(n.noiDungXong, 1000), n.cls, o.napSan ? `${o.napSan.soMuc} / ${o.napSan.choMs}` : "—"];
  }));
  const ct = T.ketQua.find((o) => o.chuyenTrang)?.chuyenTrang ?? [];
  md.push("### K.Chuyển trang (bấm mục thanh tab / thanh bên → trang kế, nóng) và phản hồi chạm. Ngân sách: chuyển trang ≤ 300 ms, chạm ≤ 100 ms", "");
  bang(["Khổ", "Đích / nút", "Bấm → vẽ đầu tiên (ms)", "Bấm → nội dung xong (ms)", "Chạm → DOM đổi (ms)"], ct.flatMap((c) => c.cham ? c.cham.map((x) => [c.kho, `${x.trang} «${x.nut}»`, "—", "—", x.ms == null ? "không thấy nút" : x.ms < 0 ? "**> 3000**" : qua(x.ms, 100)]) : c.loi ? [[c.kho, c.dich ?? "", "LỖI " + c.loi]] : [[c.kho, `→ ${c.dich}`, qua(c.chuyenTrangFcp, 300), qua(c.chuyenTrangNoiDung, 1000), "—"]]));
  J.chuyenTrang = ct;
}

// ---------- L. Hành trình thật (hanh-trinh-*.json, nếu có) ----------
for (const kho of [390, 1040]) {
  const p = join(SL, `hanh-trinh-${kho}.json`);
  if (!existsSync(p)) continue;
  const H = JSON.parse(readFileSync(p, "utf8"));
  md.push(`## L${kho === 390 ? "1" : "2"}. Hành trình thật ở khổ ${kho} (một hành trình mỗi bộ quyền, từ màn Đăng nhập): chạm, gõ, cuộn, đoán`, "");
  bang(["Bộ", "Hành trình", "Chạm", "Ký tự gõ", "Màn cuộn", "Đoán", "Không tìm thấy", "Bước", "Lỗi kịch bản", "Bước đáng chú ý"], H.ketQua.map((h) => [VIET[h.bo], h.ten, h.cham, h.go, h.cuon?.toFixed?.(1) ?? h.cuon, h.doan, h.khongThay, h.buoc.length, h.loi ? h.loi.slice(0, 80) : "—", h.buoc.filter((b) => b.ketQua || b.doan || b.ghi).map((b) => `${b.n}. ${b.viec}${b.ketQua ? " → " + b.ketQua : ""}${b.ghi ? " (" + b.ghi + ")" : ""}`).join("<br>")]));
  J[`hanhTrinh${kho}`] = H.ketQua.map((h) => ({ bo: h.bo, ten: h.ten, cham: h.cham, go: h.go, cuon: h.cuon, doan: h.doan, khongThay: h.khongThay, buoc: h.buoc.map((b) => ({ n: b.n, viec: b.viec, ketQua: b.ketQua, doan: b.doan, anh: b.anh, url: b.url, ghi: b.ghi })) }));
}

// ---------- Tóm tắt số ----------
const tongO = Object.fromEntries(NHAN.map((n) => [n, D[n].length])); const loiO = Object.fromEntries(NHAN.map((n) => [n, D[n].filter((o) => o.loi).length]));
md.unshift(`# Tổng hợp số liệu quét — ${new Date().toISOString().slice(0, 10)}`, "", `Số ô đã quét: ${NHAN.map((n) => `${n} ${tongO[n]} (lỗi kịch bản ${loiO[n]})`).join("; ")}. Trang: ${trangXep.length}. Bộ quyền: ${UU_TIEN.length}.`, "");
writeFileSync(join(SL, "tong-hop.md"), md.join("\n"));
writeFileSync(join(SL, "tong-hop.json"), JSON.stringify({ luc: new Date().toISOString(), tongO, loiO, ...J }, null, 1));
console.log(`Ghi ${join(SL, "tong-hop.md")} (${md.length} dòng) và tong-hop.json`);
