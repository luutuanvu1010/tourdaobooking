// Kiểm định kỳ phần thương mại của sổ đại lý đợt 2 (ADR-0079 «Bất biến» R-BIL-2, điều 9 R-ORD-DC1; ADR-0078 R-BIL-5; đặc tả 2026-10-18-so-dai-ly-dot-2 P9; sổ thi công
// Ruling R-P22, R-P23). Hai kiểm này cần SỐ TÍNH LẠI (hoa hồng, giá vốn, trần giảm giá) — viết công thức trong SQL là đường tính thứ hai (Hiến chương 5.4, ADR-0079 điều 6
// «phần chỉ ở mã»), nên câu SQL của scripts/audit-checks.mjs chỉ ĐỌC DỮ LIỆU THÔ (bản chụp hiện hành, dòng tiền đã lưu, dòng điều chỉnh số khách gần nhất, dòng sổ), còn
// phép tính đi qua CHÍNH các hàm thuần mà máy chủ dùng:
//   - tiền dòng hiện hành: `parseAdjustmentAfter` + `effectiveService` (orders/money-adjustment.ts — đường của `loadOrderView`), `thanhTienDong` (shared/order-lines.ts),
//     số khách tính hoa hồng `soKhachTinhHoaHong` (pricing/rules.ts) — ghép đúng như `tienChoHoaHong` của orders/index.ts (Σ thành tiền dòng, số khách trên dòng hiện hành);
//   - bản chụp: `banChupTuDb`, `chuaCoBanChup`, `coNguoiHuongDon`, `tongHoaHongDon` (orders/thuong-mai.ts);
//   - dòng sổ dự kiến: `dongThuongMaiTu`, `tinhTrangThuongMai`, `sinhPhieuDaGiao` (billing/rules.ts) — đúng ba hàm lô «Đã giao» gọi;
//   - so trần: `discountWithinCap` (orders/price-guards.ts), giảm giá hiệu lực `effectiveMoney` (hàm phải thu duy nhất).
// GIỚI HẠN (đọc trước khi tin): kiểm này bắt DỮ LIỆU lệch mã (SQL chạy tay, lô ghi chen giữa, trigger bị gỡ), KHÔNG bắt mã tính sai — mã sai thì cả lô lẫn kiểm cùng sai
// (việc của sổ vàng). Phép GHÉP tiền dòng ở đây là bản chép của `tienChoHoaHong` + `loadOrderView` (chỉ ghép, không có phép tính tiền riêng); hai chỗ đó đổi cách ghép
// thì kiểm này báo lệch ngay (báo to, không im lặng). Hàng rào K-A-3 (src/hoa-hong-mot-nguon.test.ts) không quét `scripts/` — tệp này KHÔNG nhân / chia tỷ lệ nào.
import { effectiveMoney, effectiveService, parseAdjustmentAfter } from "../src/modules/orders/money-adjustment.ts";
import { banChupTuDb, chuaCoBanChup, coNguoiHuongDon, tongHoaHongDon } from "../src/modules/orders/thuong-mai.ts";
import { discountWithinCap } from "../src/modules/orders/price-guards.ts";
import { soKhachTinhHoaHong } from "../src/modules/pricing/rules.ts";
import { dongThuongMaiTu, sinhPhieuDaGiao, tinhTrangThuongMai } from "../src/modules/billing/rules.ts";
import { thanhTienDong } from "../src/shared/order-lines.ts";

const docJson = (s, macDinh) => {
  if (s === null || s === undefined) return macDinh;
  try {
    return JSON.parse(s);
  } catch {
    return macDinh;
  }
};

/** Nhóm các dòng kết quả SQL theo khoá (giữ thứ tự xuất hiện). */
function nhom(rows, khoa) {
  const m = new Map();
  for (const r of rows) {
    const k = r[khoa];
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(r);
  }
  return m;
}

/**
 * Thành tiền + số khách tính hoa hồng của MỘT dòng dịch vụ (khuôn `tienChoHoaHong`). `apDieuChinh` = có áp dòng điều chỉnh số khách gần nhất (`loadOrderView`) hay
 * dùng dòng tiền ĐÃ LƯU (lúc Xác nhận — cột tiền khoá từ 0081). Cột cần: dv, ten, unit, catalog_code, pax (JSON), items (JSON), after_json.
 */
function tienDichVu(r, apDieuChinh) {
  const items = docJson(r.items, []);
  const paxLuu = docJson(r.pax, { adult: 0, child: 0, senior: 0, infant: 0 });
  const vao = { id: r.dv, catalogCode: r.catalog_code, name: r.ten, unit: r.unit, items: items.map((i) => ({ paxCode: i.paxCode, catalogPrice: i.catalogPrice, unitPrice: i.unitPrice, lineTotal: i.lineTotal })) };
  const moi = apDieuChinh && r.after_json ? parseAdjustmentAfter(r.after_json).find((a) => a.serviceId === r.dv)?.pax : undefined;
  const eff = effectiveService(vao, moi);
  const dong = eff.recomputed ? eff.recomputed.lines.map((l) => ({ quantity: l.quantity, lineTotal: thanhTienDong(l) })) : items.map((i) => ({ quantity: i.quantity, lineTotal: i.lineTotal }));
  const pax = eff.recomputed ? eff.recomputed.pax : paxLuu;
  return { id: r.dv, name: r.ten, thanhTien: dong.reduce((t, i) => t + i.lineTotal, 0), soKhachTinh: soKhachTinhHoaHong({ unit: r.unit, pax, items: dong }) };
}
const banChupCua = (r) => {
  const t = docJson(r.chup, null);
  return t ? banChupTuDb(t) : chuaCoBanChup(r.dv);
};
const coBanChupVaNguoiBan = (r) => {
  const t = docJson(r.chup, null);
  return t !== null && t.supply_status === "SET";
};

const CONG_TY = "__cong_ty__";
/**
 * Dòng HOA_HONG / GIA_VON mà lô «Đã giao» SẼ ghi cho một phiếu, tính lại từ bản chụp hiện hành + tiền dòng hiện hành. Trả:
 *  - { boQua: true } — có dòng dịch vụ chưa có bản chụp hiện hành mang người bán: việc của R-BIL-5 (không đếm hai lần);
 *  - { loi: "…" } — không tính lại được (thiếu mức, vượt giá bán, hàm ném) — đơn đã «Đã giao» thì đây là vi phạm;
 *  - { du: [...] } — danh sách dòng dự kiến {kind, dv, ben, so} (`ben` = người được nợ: người hưởng / nhà cung cấp).
 */
function dongDuKien(dongPhieu) {
  if (!dongPhieu.every(coBanChupVaNguoiBan)) return { boQua: true };
  const chup = dongPhieu.map(banChupCua);
  const dichVu = dongPhieu.map((r) => tienDichVu(r, true));
  const dong = dongThuongMaiTu({ chup, dichVu });
  const tt = tinhTrangThuongMai({ chup, dong });
  if (tt.trangThai === "THIEU" || tt.trangThai === "VUOT") return { loi: tt.trangThai };
  try {
    const nhap = sinhPhieuDaGiao({ congTyId: CONG_TY, nguoiHuongPartyId: tt.trangThai === "DU" ? tt.nguoiHuongPartyId : null, giamGiaBenDat: 0, dong });
    return { du: nhap.filter((d) => d.kind === "HOA_HONG" || d.kind === "GIA_VON").map((d) => ({ kind: d.kind, dv: d.orderServiceId, ben: d.creditorPartyId, so: d.amount })) };
  } catch (e) {
    return { loi: String(e?.message ?? e) };
  }
}
const khoaDong = (d) => `${d.kind}|${d.dv}|${d.ben}|${d.so}`;

/**
 * R-BIL-2 (lỗi, phiếu «Đã giao» ghi TỪ mốc 0112): mỗi dòng HOA_HONG / GIA_VON GỐC của phiếu = đúng dòng lô «Đã giao» sẽ ghi khi tính lại từ bản chụp hiện hành (đã đóng
 * băng sau «Đã giao») — cùng loại, cùng dòng dịch vụ, cùng người được nợ, cùng số; bên nợ là công ty chủ. Phiếu điều chỉnh KHÔNG cộng vào (ví dụ D-3 của ADR-0080: Kế toán
 * sửa mức sai bằng điều chỉnh có người duyệt — bản chụp vẫn mang mức cũ; đó là sửa có chủ đích, R-BIL-14 / R-BIL-15 canh). Đếm PHIẾU lệch. Dòng của `rows`: một dòng mỗi
 * (phiếu, dòng dịch vụ) — cột phieu, sau_moc, chu (JSON các công ty chủ), dong_phieu (JSON dòng gốc HOA_HONG / GIA_VON của phiếu) + cột của `tienDichVu` / `banChupCua`.
 */
export function demRBil2(rows) {
  let n = 0;
  for (const dongPhieu of nhom(rows.filter((r) => Number(r.sau_moc) === 1), "phieu").values()) {
    const kq = dongDuKien(dongPhieu);
    if (kq.boQua) continue;
    if (kq.loi) {
      n++;
      continue;
    }
    const chu = new Set(docJson(dongPhieu[0].chu, []));
    const thuc = docJson(dongPhieu[0].dong_phieu, []);
    if (thuc.some((d) => !chu.has(d.no))) {
      n++;
      continue;
    }
    const a = kq.du.map(khoaDong).sort();
    const b = thuc.map((d) => khoaDong({ kind: d.kind, dv: d.dv, ben: d.co, so: d.so })).sort();
    if (a.length !== b.length || a.some((x, i) => x !== b[i])) n++;
  }
  return n;
}

/**
 * R-BIL-2w (cảnh báo, phiếu «Đã giao» ghi TRƯỚC mốc 0112 — ADR-0079 điều 7a, M1 = A): số hoa hồng / giá vốn RÒNG của ĐƠN theo từng bên (mọi phiếu, CỘNG phiếu điều chỉnh
 * và dòng đảo — chính đường Kế toán bổ sung giá vốn cho đơn khách lẻ đã giao ở lượt 1) = số tính lại. Đơn chưa có bản chụp mang người bán ⇒ R-BIL-5w liệt kê, bỏ qua ở
 * đây. Trả danh sách mã đơn lệch (Kế toán bổ sung bằng yêu cầu điều chỉnh). Cột thêm: ma_don, dong_don (JSON mọi dòng HOA_HONG / GIA_VON của đơn).
 */
export function dsRBil2w(rows) {
  const lech = [];
  for (const dongPhieu of nhom(rows.filter((r) => Number(r.sau_moc) !== 1), "phieu").values()) {
    const kq = dongDuKien(dongPhieu);
    if (kq.boQua) continue;
    if (kq.loi) {
      lech.push(dongPhieu[0].ma_don);
      continue;
    }
    const chu = new Set(docJson(dongPhieu[0].chu, []));
    const duKien = new Map();
    for (const d of kq.du) duKien.set(`${d.kind}|${d.ben}`, (duKien.get(`${d.kind}|${d.ben}`) ?? 0) + d.so);
    const thuc = new Map();
    for (const d of docJson(dongPhieu[0].dong_don, [])) {
      const [ben, dau] = chu.has(d.no) ? [d.co, 1] : chu.has(d.co) ? [d.no, -1] : [null, 0];
      if (ben === null) continue;
      thuc.set(`${d.kind}|${ben}`, (thuc.get(`${d.kind}|${ben}`) ?? 0) + dau * d.so);
    }
    const khoa = new Set([...duKien.keys(), ...thuc.keys()]);
    if ([...khoa].some((k) => (duKien.get(k) ?? 0) !== (thuc.get(k) ?? 0))) lech.push(dongPhieu[0].ma_don);
  }
  return lech;
}

/**
 * R-ORD-DC1 (ADR-0079 điều 9, C11 = A; Ruling R-P23, R-P25): đơn ĐÃ XÁC NHẬN (chưa huỷ) có người hưởng (bản chụp TỰ ĐỘNG gần nhất mang `beneficiary_party_id` — `coNguoiHuongDon`, như trần
 * giảm giá của Task 7) mà giảm giá VƯỢT tổng hoa hồng (dòng thiếu mức tính 0 — `tongHoaHongDon(…, "tinh0")`) theo CẢ HAI cách đọc mà máy chủ từng chặn:
 *  (a) lúc Xác nhận: giảm giá đã lưu so với hoa hồng trên tiền dòng ĐÃ LƯU (chưa áp điều chỉnh số khách) — `tranGiamGiaDon` ở lô Xác nhận;
 *  (b) lúc đổi bên đặt: giảm giá HIỆU LỰC (`effectiveMoney`) so với hoa hồng trên tiền dòng HIỆN HÀNH — `cauDoiBenDatVuotHoaHong`.
 * Chỉ lệch MỘT cách đọc là ca hợp lệ: bớt khách sau Xác nhận (SV-SK-04 bản đại lý — đặc tả P7 «không chặn, chỉ cảnh báo») chỉ làm (b) vượt; thêm khách rồi đổi bên đặt chỉ
 * làm (a) vượt. Trả mã đơn vi phạm. Đơn chưa có bản chụp nào (xác nhận trước 0090) không có số để so — bỏ qua (R-74 của sổ thi công). Cột: don, ma_don, giam_gia + cột tiền.
 */
/**
 * Bản chụp TỰ ĐỘNG gần nhất của một dòng dịch vụ (Ruling R-P25, I-1 người kiểm Task 10+11): đi ngược chuỗi `supersedes_id` từ bản hiện hành tới bản `source = 'AUTO'`
 * đầu tiên gặp — bản lô Xác nhận (hoặc chụp lại khi đổi bên đặt) đã dùng để chặn trần. Bản ghi tay (`MANUAL`, Kế toán sửa mức sau Xác nhận — ví dụ D-3) KHÔNG đổi con số
 * trần đã chặn, nên không được biến đơn thành vi phạm. Thiếu cột `chuoi` / chuỗi hỏng ⇒ dùng bản hiện hành (như trước).
 */
const banChupTuDongCua = (r) => {
  const chuoi = docJson(r.chuoi, []);
  const theoId = new Map(chuoi.map((t) => [t.id, t]));
  const daThay = new Set(chuoi.map((t) => t.supersedes_id).filter((x) => x));
  let t = chuoi.find((x) => !daThay.has(x.id)) ?? null;
  for (let buoc = 0; t && t.source !== "AUTO" && buoc < chuoi.length; buoc++) t = t.supersedes_id ? theoId.get(t.supersedes_id) ?? null : null;
  return t && t.source === "AUTO" ? banChupTuDb(t) : banChupCua(r);
};

export function dsRORDDC1(rows) {
  const vp = [];
  for (const dongDon of nhom(rows, "don").values()) {
    if (!dongDon.some((r) => docJson(r.chup, null) !== null)) continue;
    const chup = dongDon.map(banChupTuDongCua);
    if (!coNguoiHuongDon(chup)) continue;
    const giam = Number(dongDon[0].giam_gia);
    const luu = dongDon.map((r) => tienDichVu(r, false));
    const nay = dongDon.map((r) => tienDichVu(r, true));
    const vuotLucXacNhan = !discountWithinCap(giam, tongHoaHongDon(chup, luu, "tinh0") ?? 0);
    const giamHieuLuc = effectiveMoney(nay.reduce((t, d) => t + d.thanhTien, 0), giam).giamGiaHieuLuc;
    const vuotHienHanh = !discountWithinCap(giamHieuLuc, tongHoaHongDon(chup, nay, "tinh0") ?? 0);
    if (vuotLucXacNhan && vuotHienHanh) vp.push(dongDon[0].ma_don);
  }
  return vp;
}
