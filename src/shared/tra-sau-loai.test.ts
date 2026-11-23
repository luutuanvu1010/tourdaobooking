// Luật thuần chọn LOẠI Trả sau (ADR-0230 Đ1 mục 2–3): theo dịch vụ (SERVICE) hay theo hạn mức (LIMIT). Không I/O. Sổ vàng (a), (c), (d) phần luật; phần route ở
// src/tra-sau-dich-vu-don.test.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { hanTraTu, hetAnHanTu, quyetTraSau, CAU_TRA_SAU_DICH_VU_KHONG_DAU, type HanMucHieuLuc } from "./tra-sau.ts";
import { dichVuXetTuDanhMuc, dieuKienTraSauDichVu, type DauDichVu } from "./tra-sau-dich-vu.ts";

const H10: HanMucHieuLuc = { hanMuc: 10_000_000, gioTra: 168, gioAnHan: 12, tuNgay: "2026-11-01", denNgay: null };
const DV = { gioTra: 24, gioAnHan: 6 };

test("sổ vàng (a): hai vé Tour Đảo dấu 24 giờ (ân hạn 12) và 48 giờ (ân hạn 6), xác nhận 2026-11-23T03:00:00.000Z ⇒ hạn trả 2026-11-24T03:00:00.000Z, hết ân hạn 2026-11-24T09:00:00.000Z", () => {
  const dau: DauDichVu[] = [{ targetKind: "SERVICE", targetCode: "T24", gioTra: 24, gioAnHan: 12 }, { targetKind: "GROUP", targetCode: "N48", gioTra: 48, gioAnHan: 6 }];
  const dm = { dichVu: new Map([["T24", { nhom: null, coVe: true, nguonVe: "TOUR_DAO" as const }], ["T48", { nhom: "N48", coVe: true, nguonVe: "TOUR_DAO" as const }]]) };
  const dk = dieuKienTraSauDichVu(dichVuXetTuDanhMuc(["T24", "T48"], dm), dau);
  assert.deepEqual(dk, { gioTra: 24, gioAnHan: 6 });
  const kq = quyetTraSau({ laDoiTacHuong: true, dichVu: dk, hanMuc: null, noHanMuc: 0, soTienDon: 3_000_000, coDonQuaHan: false });
  assert.ok(kq.ok);
  assert.equal(kq.coSo, "SERVICE");
  const han = hanTraTu("2026-11-23T03:00:00.000Z", kq.gioTra);
  assert.equal(han, "2026-11-24T03:00:00.000Z");
  assert.equal(hetAnHanTu(han, kq.gioAnHan), "2026-11-24T09:00:00.000Z");
});

test("dichVuXetTuDanhMuc: dòng nhập tay (mã null) và mã không còn trong danh mục đều thành dòng nhập tay ⇒ cả đơn không đủ điều kiện; danh mục không đọc được ⇒ không đủ", () => {
  const dm = { dichVu: new Map([["T", { nhom: null, coVe: true, nguonVe: "TOUR_DAO" as const }]]) };
  const dau: DauDichVu[] = [{ targetKind: "SERVICE", targetCode: "T", gioTra: 24, gioAnHan: 0 }];
  assert.deepEqual(dieuKienTraSauDichVu(dichVuXetTuDanhMuc(["T"], dm), dau), { gioTra: 24, gioAnHan: 0 });
  assert.equal(dieuKienTraSauDichVu(dichVuXetTuDanhMuc(["T", null], dm), dau), null);
  assert.equal(dieuKienTraSauDichVu(dichVuXetTuDanhMuc(["T", "DA_XOA"], dm), dau), null);
  assert.equal(dieuKienTraSauDichVu(dichVuXetTuDanhMuc(["T"], null), dau), null);
});

test("sổ vàng (b) phần luật: hạn mức 10.000.000 ₫ đang nợ đủ (LIMIT), đơn SERVICE 3.000.000 ₫ ⇒ đạt theo dịch vụ, không kiểm hạn mức", () => {
  const kq = quyetTraSau({ laDoiTacHuong: true, dichVu: DV, hanMuc: H10, noHanMuc: 10_000_000, soTienDon: 3_000_000, coDonQuaHan: false });
  assert.deepEqual(kq, { ok: true, coSo: "SERVICE", gioTra: 24, gioAnHan: 6, hanMuc: H10 });
  // Cùng đơn mà không đủ điều kiện dịch vụ ⇒ theo hạn mức ⇒ vượt.
  assert.equal(quyetTraSau({ laDoiTacHuong: true, dichVu: null, hanMuc: H10, noHanMuc: 10_000_000, soTienDon: 3_000_000, coDonQuaHan: false }).ok, false);
});

test("sổ vàng (c) phần luật: có đơn hết ân hạn còn nợ ⇒ đơn theo dịch vụ và đơn theo hạn mức đều co_don_qua_han; quá hạn thắng «không có hạn mức»", () => {
  const sv = quyetTraSau({ laDoiTacHuong: true, dichVu: DV, hanMuc: null, noHanMuc: 0, soTienDon: 1, coDonQuaHan: true });
  assert.equal(!sv.ok && sv.ma, "co_don_qua_han");
  const lim = quyetTraSau({ laDoiTacHuong: true, dichVu: null, hanMuc: H10, noHanMuc: 0, soTienDon: 1, coDonQuaHan: true });
  assert.equal(!lim.ok && lim.ma, "co_don_qua_han");
  const khongHan = quyetTraSau({ laDoiTacHuong: true, dichVu: null, hanMuc: null, noHanMuc: 0, soTienDon: 1, coDonQuaHan: true });
  assert.equal(!khongHan.ok && khongHan.ma, "co_don_qua_han", "kiểm quá hạn TRƯỚC thiếu hạn mức");
});

test("sổ vàng (d) phần luật: bên đặt không phải đối tác được hưởng, đơn toàn vé có dấu ⇒ không theo dịch vụ; không hạn mức ⇒ khong_co_han_muc", () => {
  const kq = quyetTraSau({ laDoiTacHuong: false, dichVu: DV, hanMuc: null, noHanMuc: 0, soTienDon: 1, coDonQuaHan: false });
  assert.equal(!kq.ok && kq.ma, "khong_co_han_muc");
  const coHan = quyetTraSau({ laDoiTacHuong: false, dichVu: DV, hanMuc: H10, noHanMuc: 0, soTienDon: 1, coDonQuaHan: false });
  assert.ok(coHan.ok && coHan.coSo === "LIMIT" && coHan.gioTra === 168 && coHan.gioAnHan === 12);
});

test("ép loại: coSo SERVICE (đơn đã xác nhận theo dịch vụ, sửa tăng) mà hết đủ điều kiện ⇒ tra_sau_dich_vu_khong_dau, KHÔNG lùi về hạn mức; coSo LIMIT bỏ qua dấu", () => {
  const kq = quyetTraSau({ laDoiTacHuong: true, dichVu: null, hanMuc: H10, noHanMuc: 0, soTienDon: 1, coDonQuaHan: false, coSo: "SERVICE" });
  assert.deepEqual(kq, { ok: false, ma: "tra_sau_dich_vu_khong_dau", cau: CAU_TRA_SAU_DICH_VU_KHONG_DAU });
  assert.equal(CAU_TRA_SAU_DICH_VU_KHONG_DAU, "Đơn trả sau theo dịch vụ chỉ nhận dịch vụ vé Tour Đảo có dấu Trả sau theo dịch vụ. Bỏ dịch vụ này, hoặc huỷ đơn và lập lại với hình thức khác.");
  const ok = quyetTraSau({ laDoiTacHuong: true, dichVu: DV, hanMuc: null, noHanMuc: 0, soTienDon: 1, coDonQuaHan: false, coSo: "SERVICE" });
  assert.ok(ok.ok && ok.coSo === "SERVICE");
  const lim = quyetTraSau({ laDoiTacHuong: true, dichVu: DV, hanMuc: H10, noHanMuc: 0, soTienDon: 1, coDonQuaHan: false, coSo: "LIMIT" });
  assert.ok(lim.ok && lim.coSo === "LIMIT");
});
