// Tổng hợp số đo bố cục (do-bo-cuc.mjs) thành các con số của hồ sơ phân tích khung gốc 21/11/2026. Chỉ đọc tệp số đo ngoài kho, in ra và ghi tong-hop.json ngoài kho.
// Chạy từ GỐC kho: node docs/evidence/2026-11-21-phan-tich-bo-cuc/kich-ban/tong-hop-bo-cuc.mjs [--ra ~/tourdao-bo-cuc-2026-11-21] [--nhan truoc]
import { readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

const lay = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const ra = resolve(lay("--ra", "~/tourdao-bo-cuc-2026-11-21").replace(/^~/, homedir()));
const NHAN = lay("--nhan", "truoc");
const { ketQua, kho: KHO } = JSON.parse(readFileSync(join(ra, "so-do", `bo-cuc-${NHAN}.json`), "utf8"));

// Loại màn do phiên phân tích xếp (theo việc người dùng làm ở trang đó). Ba màn chấm lúc không có quyền / báo lỗi tính là «Trạng thái».
const LOAI_TRANG = {
  "Tổng quan": ["/", "/cuoc", "/tai-xe", "/dieu-phoi", "/xe-dang-chay"],
  "Danh sách": ["/orders", "/cho-xac-nhan", "/parties", "/staff", "/xe", "/de-nghi", "/giay-to-sap-het-han", "/bang-ke-xe", "/so-cong-no", "/phan-dinh", "/phieu-dang-ky", "/catalog", "/sessions", "/audit", "/ve-kho", "/ve-doi-chieu", "/feedback", "/lich-xe-ban"],
  "Chi tiết": ["/order", "/chuyen", "/cuoc-chuyen", "/xe-chi-tiet", "/to-chuc", "/account"],
  "Biểu mẫu": ["/order-form", "/chuyen-sua", "/xe-sua", "/ban", "/dieu-chinh-cong-no", "/gui-thong-bao", "/dang-ky", "/khoa-thang", "/chup-bu"],
  "Thiết lập": ["/thiet-lap", "/locations", "/loai-giay-to-nguoi", "/loai-giay-to-xe", "/ly-do-dieu-phoi", "/chinh-sach-dieu-phoi", "/dieu-kien-xuat-ben", "/luat-ban", "/dac-diem-dich-vu", "/giao-dien", "/tro-ly-cai-dat", "/ve-cai-dat", "/cap-dai-ly", "/han-muc-tra-sau", "/hoa-hong", "/hoa-hong-gioi-han", "/phi-don", "/bang-gia-xe", "/nguoi-ban"],
  "Trang đọc": ["/huong-dan", "/help"],
  "Công cụ": ["/quet-ve"],
  "Trạng thái": ["/login", "/404", "/ngoai-mang"],
};
const TRANG_THAI_THEO_SO = new Set([63, 76, 86]);
const loaiCua = (x) => TRANG_THAI_THEO_SO.has(x.so) ? "Trạng thái" : (Object.entries(LOAI_TRANG).find(([, ds]) => ds.includes(x.trang))?.[0] ?? "CHƯA XẾP");

const dem = (ds) => { const m = new Map(); for (const x of ds) m.set(x, (m.get(x) ?? 0) + 1); return [...m.entries()].sort((a, b) => b[1] - a[1]); };
const trungVi = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };
const khac = (a, sai = 2) => { const s = [...a].sort((x, y) => x - y); const r = []; for (const v of s) if (!r.length || v - r[r.length - 1] > sai) r.push(v); return r; };
const tenMan = (x) => `${x.so} ${x.bo}:${x.trang}`;
const V2 = new Set(["nut", "o", "nhan", "vien", "huy-hieu", "the", "dong", "bang", "tab-phu", "bo-qua", "chan-dinh", "rong", "trang-thai", "trang-thai-phu", "trang-thai-xuong", "vong", "xuong", "dai", "toast"]);
const CU = /^(btn|card|badge|field|chip|toolbar|tabs?|table|empty|banner|alert|list|row|muted|stack|grid)(-|$)/;

const kq = { luc: new Date().toISOString(), nhan: NHAN, soO: ketQua.length, hong: ketQua.filter((x) => x.loi).map((x) => `${tenMan(x)} @${x.kho}: ${x.loi}`), theoKho: {} };
kq.loaiMan = dem(ketQua.filter((x) => x.kho === KHO[0]).map(loaiCua));
kq.chuaXep = [...new Set(ketQua.filter((x) => loaiCua(x) === "CHƯA XẾP").map((x) => x.trang))];
kq.loaiManChiTiet = ketQua.filter((x) => x.kho === KHO[KHO.length - 1]).map((x) => ({ so: x.so, bo: x.bo, trang: x.trang, loai: loaiCua(x), tieuDe: (x.do?.tieuDe || x.trang).trim() }));

for (const k of KHO) {
  const ds = ketQua.filter((x) => x.kho === k && x.do && !x.do.loi);
  const t = { soMan: ds.length };
  // A. Viền ngoài: bề rộng vùng nội dung theo mức đã khai
  const theoMuc = {};
  for (const x of ds) { const m = x.do.rong || "(không khai)"; (theoMuc[m] ??= []).push(x.do.main.noiDung); }
  t.A_vienNgoai = Object.fromEntries(Object.entries(theoMuc).map(([m, a]) => [m, { soMan: a.length, beRong: dem(a).map(([v, n]) => `${v}×${n}`).join(" ") }]));
  t.A_soBeRongNoiDung = new Set(ds.map((x) => x.do.main.noiDung)).size;
  t.A_khongKhai = ds.filter((x) => !x.do.rong).map((x) => `${tenMan(x)} (${x.do.main.noiDung})`);
  t.A_demMain = dem(ds.map((x) => x.do.main.dem.join("/"))).map(([v, n]) => `${v}×${n}`);
  // B. Lớp bọc tự bó bề rộng (nội dung thật hẹp hơn vùng nội dung của trang)
  const tuBo = ds.filter((x) => x.do.boc.some((b) => b.trai > 8 || b.phai > 8));
  t.B_lopBocTuBo = tuBo.map((x) => { const b = x.do.boc.find((q) => q.trai > 8 || q.phai > 8); return `${tenMan(x)}: ${b.ten} rộng ${b.rong}/${x.do.main.noiDung} (trái ${b.trai}, phải ${b.phai}${b.maxW ? ", trần " + b.maxW : ""})`; });
  // C. Hàng cấp 1: khối không kín bề rộng; cách chia cột
  const lech = [], chiaCot = [], soHangLech = [];
  for (const x of ds) {
    const o = x.do; const gT = o.boc.length ? o.boc.at(-1).trai : 0, gP = o.boc.length ? o.boc.at(-1).phai : 0; const rongGoc = o.main.noiDung - gT - gP;
    const hang = []; for (const kh of [...o.khoi].sort((a, b) => a.y - b.y)) { const h = hang.find((r) => kh.y < r.day - 4 && kh.y + kh.cao > r.y + 4); if (h) { h.ds.push(kh); h.day = Math.max(h.day, kh.y + kh.cao); } else hang.push({ y: kh.y, day: kh.y + kh.cao, ds: [kh] }); }
    let nLech = 0;
    for (const h of hang) {
      const trai = Math.min(...h.ds.map((q) => q.trai)) - gT, phai = Math.min(...h.ds.map((q) => q.phai)) - gP; const cao = h.day - h.y;
      const dang = h.ds.some((q) => q.coVo || q.dac.kyTu > 30 || q.dac.o > 0 || q.dac.bang > 0);
      if ((trai > 8 || phai > 8) && cao >= 40 && dang && !h.ds.every((q) => /^(button|a|p|h[1-5])\b/.test(q.ten))) { nLech++; lech.push(`${tenMan(x)}: ${h.ds.map((q) => q.ten).join(" + ")} rộng ${h.ds.map((q) => q.rong).join("+")}/${rongGoc} (trái ${trai}, phải ${phai})`); }
      if (h.ds.length >= 2 && h.ds.some((q) => q.rong >= 200)) chiaCot.push({ man: tenMan(x), cot: h.ds.sort((a, b) => a.trai - b.trai).map((q) => q.rong), rongGoc });
    }
    soHangLech.push(nLech);
  }
  t.C_manCoKhoiLech = soHangLech.filter((n) => n > 0).length; t.C_khoiLech = lech;
  t.C_chiaCotCap1 = chiaCot.map((c) => `${c.man}: ${c.cot.join(" + ")} / ${c.rongGoc} (${c.cot.map((w) => Math.round(100 * w / c.rongGoc)).join("–")} %)`);
  // Chia cột BÊN TRONG khối cấp 1 và cấp 2
  const cotTrong = [];
  for (const x of ds) for (const kh of x.do.khoi) for (const q of [kh, ...kh.con]) if (q.hang && q.hang.cot.length >= 2 && q.rong >= 400 && q.hang.cot.some((w) => w >= 160)) cotTrong.push({ man: tenMan(x), ten: q.ten, tl: q.hang.cot.map((w) => Math.round(100 * w / q.rong)).join("–"), khe: q.hang.khe.join("/") });
  t.C_chiaCotTrong = { soChoChia: cotTrong.length, tiLeKhacNhau: new Set(cotTrong.map((c) => c.tl)).size, kheKhacNhau: dem(cotTrong.flatMap((c) => c.khe.split("/").filter((v) => v !== "").map(Number))).slice(0, 14).map(([v, n]) => `${v}×${n}`), nhieuNhat: dem(cotTrong.map((c) => c.tl)).slice(0, 14).map(([v, n]) => `${v}×${n}`) };
  // D. Thẻ tầng ngoài cùng: bề rộng
  const the0 = ds.map((x) => ({ x, the: x.do.the.filter((q) => q.sau === 0 && !/^(tr|li)\b/.test(q.ten)) }));
  const soBeRongThe = the0.map(({ the }) => khac(the.map((q) => q.rong), 6).length);
  t.D_theNgoaiCung = { manCoThe: the0.filter((q) => q.the.length).length, beRongKhacNhauToanNenTang: khac(the0.flatMap(({ the }) => the.map((q) => q.rong)), 6).length, manCoTu2BeRong: soBeRongThe.filter((n) => n >= 2).length, manCoTu3BeRong: soBeRongThe.filter((n) => n >= 3).length, vd: the0.filter(({ the }) => khac(the.map((q) => q.rong), 6).length >= 3).map(({ x, the }) => `${tenMan(x)}: ${khac(the.map((q) => q.rong), 6).join(", ")}`) };
  // E. Vỏ thẻ: đệm, bo góc, kiểu vỏ; thẻ lồng thẻ
  const moiThe = ds.flatMap((x) => x.do.the.map((q) => ({ ...q, man: tenMan(x) })));
  const kieuVo = (v) => [v.vien >= 3 ? "viền" : v.vien > 0 ? "viền một phần" : "", v.nen ? "nền" : "", v.bong ? "bóng" : ""].filter(Boolean).join("+") || "không";
  const chuKy = (q) => `đệm ${q.dem.join("/")} · bo ${q.bo} · ${kieuVo(q.vo)}`;
  const the0All = moiThe.filter((q) => q.sau === 0);
  const manTheoKy = new Map(); for (const q of the0All) { const c = chuKy(q); if (!manTheoKy.has(c)) manTheoKy.set(c, new Set()); manTheoKy.get(c).add(q.man); }
  t.E_voThe = { kieuKhacNhau: manTheoKy.size, nhieuNhat: [...manTheoKy.entries()].sort((a, b) => b[1].size - a[1].size).slice(0, 14).map(([c, s]) => `${c} — ${s.size} màn`), demKhacNhau: new Set(the0All.map((q) => q.dem.join("/"))).size, boKhacNhau: dem(the0All.map((q) => q.bo)).map(([v, n]) => `${v}×${n}`), mauNen: dem(the0All.filter((q) => q.vo.nen).map((q) => q.vo.nen)).slice(0, 10).map(([v, n]) => `${v}×${n}`), mauVien: dem(the0All.filter((q) => q.vo.vien).map((q) => q.vo.vienMau)).slice(0, 10).map(([v, n]) => `${v}×${n}`) };
  const sauNhat = ds.map((x) => Math.max(0, ...x.do.the.map((q) => q.sau)));
  t.E_theLong = { manCoTheLongThe: sauNhat.filter((n) => n >= 1).length, manLongTu2Tang: sauNhat.filter((n) => n >= 2).length, sauNhat: Math.max(...sauNhat) };
  t.E_demMoiManKhacNhau = dem(ds.map((x) => new Set(x.do.the.filter((q) => q.sau === 0).map((q) => q.dem.join("/"))).size)).map(([v, n]) => `${v} kiểu đệm: ${n} màn`);
  // F. Nhịp dọc
  t.F_nhipCap1 = { giaTri: dem(ds.flatMap((x) => [...new Set(x.do.nhip)])).map(([v, n]) => `${v}×${n}`), soGiaTri: new Set(ds.flatMap((x) => x.do.nhip)).size, manCoTu3Nhip: ds.filter((x) => new Set(x.do.nhip).size >= 3).length };
  t.F_nhipTrongKhoi = { giaTri: dem(ds.flatMap((x) => [...new Set(x.do.khoi.flatMap((q) => q.nhipTrong))])).slice(0, 24).map(([v, n]) => `${v}×${n}`), soGiaTri: new Set(ds.flatMap((x) => x.do.khoi.flatMap((q) => q.nhipTrong))).size };
  // G. Tiêu đề
  const td = ds.flatMap((x) => x.do.tieuDeTrong.map((q) => ({ ...q, man: tenMan(x) })));
  t.G_tieuDe = Object.fromEntries(["h1", "h2", "h3", "h4", "legend"].map((tag) => { const a = td.filter((q) => q.tag === tag); return [tag, { soMan: new Set(a.map((q) => q.man)).size, co: dem(a.map((q) => q.co)).map(([v, n]) => `${v}×${n}`).join(" "), kieu: new Set(a.map((q) => [q.co, q.dam, q.mau, q.hoa].join("|"))).size, leTren: dem(a.map((q) => q.mt)).slice(0, 8).map(([v, n]) => `${v}×${n}`).join(" "), leDuoi: dem(a.map((q) => q.mb)).slice(0, 8).map(([v, n]) => `${v}×${n}`).join(" ") }]; }));
  // H. Ô nhập
  const oo = ds.flatMap((x) => x.do.o.map((q) => ({ ...q, man: tenMan(x) })));
  const viTriNhan = ds.map((x) => new Set(x.do.o.filter((q) => ["tren", "trai", "trong"].includes(q.nhan)).map((q) => q.nhan)));
  t.H_oNhap = { manCoO: ds.filter((x) => x.do.o.length).length, cao: dem(oo.map((q) => q.cao)).slice(0, 12).map(([v, n]) => `${v}×${n}`), viTriNhan: dem(oo.map((q) => q.nhan)).map(([v, n]) => `${v}×${n}`), manTronViTriNhan: viTriNhan.filter((s) => s.size >= 2).length, bo: dem(oo.map((q) => q.bo)).map(([v, n]) => `${v}×${n}`), co: dem(oo.map((q) => q.co)).map(([v, n]) => `${v}×${n}`), rongToiDa: trungVi(ds.filter((x) => x.do.o.length).map((x) => Math.max(...x.do.o.map((q) => q.rong)))), manCoORongHon600: ds.filter((x) => x.do.o.some((q) => q.rong > 600)).map((x) => `${tenMan(x)} (${Math.max(...x.do.o.map((q) => q.rong))})`) };
  // I. Nút
  const nut = ds.flatMap((x) => x.do.nut.filter((q) => q.trongMain).map((q) => ({ ...q, man: tenMan(x), ho: /(^|\.)nut(\.|$)/.test(q.lop) ? "mới (.nut)" : /(^|\.)btn/.test(q.lop) ? "cũ (.btn)" : "riêng của trang" })));
  const hoTheoMan = ds.map((x) => new Set(x.do.nut.filter((q) => q.trongMain).map((q) => /(^|\.)nut(\.|$)/.test(q.lop) ? "moi" : /(^|\.)btn/.test(q.lop) ? "cu" : "rieng")));
  const kieuNut = new Map(); for (const q of nut) { const k = [q.ho, q.cao, q.bo, q.nen, q.coChu, q.dam, q.vien].join("|"); if (!kieuNut.has(k)) kieuNut.set(k, q.ho); }
  t.I_nut = { kieuKhacNhauToanNenTang: Object.fromEntries(dem([...kieuNut.values()])), theoHo: dem(nut.map((q) => q.ho)).map(([v, n]) => `${v}: ${n} lượt (màn × kiểu)`), manChiMoi: hoTheoMan.filter((s) => s.has("moi") && !s.has("cu")).length, manChiCu: hoTheoMan.filter((s) => s.has("cu") && !s.has("moi")).length, manCaHai: hoTheoMan.filter((s) => s.has("cu") && s.has("moi")).length, manCoNutRieng: hoTheoMan.filter((s) => s.has("rieng")).length, cao: dem(nut.map((q) => q.cao)).slice(0, 16).map(([v, n]) => `${v}×${n}`), bo: dem(nut.map((q) => q.bo)).map(([v, n]) => `${v}×${n}`), coChu: dem(nut.map((q) => q.coChu)).map(([v, n]) => `${v}×${n}`), soKieuMoiMan: trungVi(ds.map((x) => new Set(x.do.nut.filter((q) => q.trongMain).map((q) => [q.cao, q.bo, q.nen, q.coChu].join("|"))).size)) };
  // J. Bảng
  const bang = ds.flatMap((x) => x.do.bang.map((q) => ({ ...q, man: tenMan(x) })));
  t.J_bang = { manCoBang: new Set(bang.map((q) => q.man)).size, coO: dem(bang.map((q) => q.coO)).map(([v, n]) => `${v}×${n}`), caoDong: dem(bang.map((q) => q.caoDong)).slice(0, 12).map(([v, n]) => `${v}×${n}`), demO: dem(bang.map((q) => (q.demO ?? []).join("/"))).map(([v, n]) => `${v}×${n}`), tieuDeHoa: dem(bang.map((q) => q.hoaTh)).map(([v, n]) => `${v}×${n}`), coTh: dem(bang.map((q) => q.coTh)).map(([v, n]) => `${v}×${n}`), cuonNgang: bang.filter((q) => q.cuon).length, khongKinBeRong: bang.filter((q) => q.phai > 8).map((q) => `${q.man}: ${q.ten} rộng ${q.rong}`) };
  // K. Cỡ chữ
  const coMoiMan = ds.map((x) => { const tong = Object.values(x.do.chu).reduce((a, b) => a + b, 0) || 1; return new Set(Object.entries(x.do.chu).filter(([, n]) => n / tong >= 0.02).map(([c]) => c.split("/")[0])).size; });
  const coToan = new Map(); for (const x of ds) for (const [c, n] of Object.entries(x.do.chu)) { const s = c.split("/")[0]; coToan.set(s, (coToan.get(s) ?? 0) + n); }
  t.K_coChu = { trungViMoiMan: trungVi(coMoiMan), manTren5Co: coMoiMan.filter((n) => n > 5).length, coDangDung: [...coToan.entries()].sort((a, b) => b[1] - a[1]).map(([c, n]) => `${c}px: ${Math.round(100 * n / [...coToan.values()].reduce((a, b) => a + b, 0))} %`) };
  // L. Lớp dùng chung so với lớp riêng
  const tl = ds.map((x) => { const a = x.do.lop; const v2 = a.filter((c) => V2.has(c)).length, cu = a.filter((c) => !V2.has(c) && CU.test(c)).length; return { man: tenMan(x), tong: a.length, v2, cu, rieng: a.length - v2 - cu }; });
  t.L_lop = { trungViLopMoiMan: trungVi(tl.map((q) => q.tong)), trungViV2: trungVi(tl.map((q) => q.v2)), trungViCu: trungVi(tl.map((q) => q.cu)), trungViRieng: trungVi(tl.map((q) => q.rieng)), manKhongCoLopV2: tl.filter((q) => q.v2 === 0).length, tiLeRiengTrungVi: trungVi(tl.filter((q) => q.tong).map((q) => Math.round(100 * q.rieng / q.tong))) };
  // M. Theo loại màn: mức bề rộng, khối đầu tiên, vị trí nút chính, thanh dính
  const viTriNut = (x) => { const o = x.do; const ds2 = o.nutChinh.filter((q) => q.trongMain || q.dinh); if (!ds2.length) return ["không có nút chính"]; return [...new Set(ds2.map((q) => q.dinh && q.yKhung > o.vh * 0.55 ? "dính đáy" : q.dinh ? "dính đầu" : q.y < 320 ? (q.phai < q.trai ? "đầu trang, bên phải" : "đầu trang, bên trái") : q.y > o.caoTrang - 320 ? "cuối trang" : "giữa trang"))]; };
  const khoiDau = (x) => { const q = x.do.khoi[0]; if (!q) return "(không có khối)"; return q.dac.bang ? "bảng" : q.dac.o > 0 && q.cao < 140 ? "thanh lọc / tìm" : q.dac.nut > 0 && q.cao < 100 ? "thanh nút" : /^nav\b|tab/.test(q.ten) ? "dải tab" : /^p\b/.test(q.ten) ? "đoạn chữ dẫn" : q.coVo ? "thẻ" : /^h[1-4]\b/.test(q.ten) ? "tiêu đề" : "khối khác"; };
  t.M_theoLoai = {};
  for (const loai of Object.keys(LOAI_TRANG)) {
    const a = ds.filter((x) => loaiCua(x) === loai); if (!a.length) continue;
    t.M_theoLoai[loai] = { soMan: a.length, muc: dem(a.map((x) => x.do.rong || "(không khai)")).map(([v, n]) => `${v}×${n}`).join(" "), khoiDau: dem(a.map(khoiDau)).map(([v, n]) => `${v}×${n}`).join(" · "), nutChinh: dem(a.flatMap(viTriNut)).map(([v, n]) => `${v}×${n}`).join(" · "), coThanhDinhDay: a.filter((x) => x.do.dinh.some((q) => q.day <= 80 && q.top > x.do.vh * 0.5 && !/tabbar/.test(q.ten))).length, soKhoiTrungVi: trungVi(a.map((x) => x.do.khoi.length)), coTieuDeTrongThan: a.filter((x) => x.do.tieuDeTrong.some((q) => q.tag === "h1")).length };
  }
  t.M_theoLoaiTrang = {};
  for (const loai of Object.keys(LOAI_TRANG)) {
    const daCo = new Set(); const a = ds.filter((x) => loaiCua(x) === loai && !TRANG_THAI_THEO_SO.has(x.so) && !daCo.has(x.trang) && daCo.add(x.trang)); if (!a.length) continue;
    const vt = a.map(viTriNut);
    t.M_theoLoaiTrang[loai] = { soTrang: a.length, muc: dem(a.map((x) => x.do.rong || "(không khai)")).map(([v, n]) => `${v}×${n}`).join(" "), khoiDau: dem(a.map(khoiDau)).map(([v, n]) => `${v}×${n}`).join(" · "), soKieuKhoiDau: new Set(a.map(khoiDau)).size, nutChinh: dem(vt.flat()).map(([v, n]) => `${v}×${n}`).join(" · "), soViTriNut: new Set(vt.flat().filter((v) => v !== "không có nút chính")).size, trangKhongCoNutChinh: vt.filter((v) => v.length === 1 && v[0] === "không có nút chính").length, nutChinhBenTrai: a.filter((x) => x.do.nutChinh.some((q) => (q.trongMain || q.dinh) && q.trai < q.phai)).length, nutChinhBenPhai: a.filter((x) => x.do.nutChinh.some((q) => (q.trongMain || q.dinh) && q.phai < q.trai)).length };
  }
  // N. Mép chữ đầu khối: bao nhiêu «đường gióng trái» mỗi màn
  const giong = ds.map((x) => { const a = []; for (const kh of x.do.khoi) for (const q of [kh, ...kh.con]) if (q.chuDau && !q.chuDau.trongNut && ["start", "left"].includes(q.chuDau.canh) && q.chuDau.trai >= -2 && q.chuDau.trai < x.do.main.noiDung * 0.35) a.push(q.chuDau.trai); return { man: tenMan(x), ds: khac(a, 2) }; });
  t.N_duongGiongTrai = { phanBo: dem(giong.map((g) => g.ds.length)).sort((a, b) => a[0] - b[0]).map(([v, n]) => `${v} đường: ${n} màn`), manTu4: giong.filter((g) => g.ds.length >= 4).map((g) => `${g.man}: ${g.ds.join(", ")}`) };
  // O. Điện thoại: phần tử tràn sát mép màn (lệch âm) lẫn với phần tử thụt lề
  t.O_tranMep = ds.filter((x) => x.do.khoi.some((q) => q.trai < -4) && x.do.khoi.some((q) => q.trai >= 0)).length;
  kq.theoKho[k] = t;
}
writeFileSync(join(ra, "so-do", `tong-hop-${NHAN}.json`), JSON.stringify(kq, null, 1));
console.log(JSON.stringify(kq, null, 1));
