// Luật quét vé Tour Đảo (ADR-0175 Đ3; đặc tả 2026-11-05-ve-tour-dao-design.md §2.5): một ca cho mỗi dòng bảng thứ tự kiểm.
import { test } from "node:test";
import assert from "node:assert/strict";
import { CAU_QUET, canXacNhanQuet, ketQuaQuet, type VeQuet } from "./ket-qua-quet.ts";

const HOM_NAY = "2026-11-10";
const ve = (o: Partial<VeQuet> = {}): VeQuet => ({
  nguon: "TOUR_DAO", trangThaiVe: "ALLOCATED", trangThaiDon: "confirmed", daMo: true, tuNgay: "2026-11-01", denNgay: "2026-11-30", daDung: null,
  ngayDi: HOM_NAY, moTheoTien: true, soLuotDaTinh: 0, soKhachHieuLuc: 2, ...o,
});
const ngu = (o: { quyenTinh?: boolean; lechNgay?: boolean; chuaThu?: boolean; vuotKhach?: boolean } = {}) => ({
  homNay: HOM_NAY, quyenTinh: o.quyenTinh ?? true, xacNhan: { lechNgay: o.lechNgay ?? false, chuaThu: o.chuaThu ?? false, vuotKhach: o.vuotKhach ?? false },
});

test("mã lạ (null) và vé hãng ngoài trả CÙNG một kết quả, không ghi", () => {
  const a = ketQuaQuet(null, ngu());
  const b = ketQuaQuet(ve({ nguon: "HANG_NGOAI" }), ngu());
  assert.deepEqual(a, b);
  assert.deepEqual(a, { mau: "DO", ma: "KHONG_PHAI_VE_TD", ghi: null });
  assert.equal(CAU_QUET.KHONG_PHAI_VE_TD, "Không phải vé Tour Đảo");
});

test("vé VOID hoặc đơn huỷ → đỏ «Vé đã huỷ», ghi TU_CHOI", () => {
  for (const v of [ve({ trangThaiVe: "VOID" }), ve({ trangThaiDon: "cancelled" })]) assert.deepEqual(ketQuaQuet(v, ngu()), { mau: "DO", ma: "VE_DA_HUY", ghi: "TU_CHOI" });
});

test("chưa cấp cho đơn hoặc chưa lộ → đỏ CHUA_GIAO, TU_CHOI", () => {
  assert.equal(ketQuaQuet(ve({ trangThaiVe: "AVAILABLE", trangThaiDon: null, daMo: false }), ngu()).ma, "CHUA_GIAO");
  const r = ketQuaQuet(ve({ daMo: false }), ngu());
  assert.deepEqual(r, { mau: "DO", ma: "CHUA_GIAO", ghi: "TU_CHOI" });
});

test("ngoài khoảng hiệu lực: hết hạn / chưa tới ngày", () => {
  assert.deepEqual(ketQuaQuet(ve({ denNgay: "2026-11-09" }), ngu()), { mau: "DO", ma: "HET_HAN", ghi: "TU_CHOI" });
  assert.deepEqual(ketQuaQuet(ve({ tuNgay: "2026-11-11" }), ngu()), { mau: "DO", ma: "CHUA_TOI_NGAY", ghi: "TU_CHOI" });
  assert.equal(ketQuaQuet(ve({ tuNgay: HOM_NAY, denNgay: HOM_NAY }), ngu()).ma, "HOP_LE", "biên hai đầu còn hạn");
});

test("đã có lượt DA_TINH chưa bỏ → đỏ DA_DUNG, TU_CHOI (cả khi người quét chỉ xem)", () => {
  const v = ve({ daDung: { luc: "2026-11-10T01:00:00.000Z", nguoi: "An" } });
  assert.deepEqual(ketQuaQuet(v, ngu()), { mau: "DO", ma: "DA_DUNG", ghi: "TU_CHOI" });
  assert.equal(ketQuaQuet(v, ngu({ quyenTinh: false })).ma, "DA_DUNG");
});

test("lệch ngày đi → vàng, chưa ghi; xác nhận rồi → xanh, DA_TINH", () => {
  const v = ve({ ngayDi: "2026-11-12" });
  assert.deepEqual(ketQuaQuet(v, ngu()), { mau: "VANG", ma: "LECH_NGAY", ghi: null });
  assert.deepEqual(ketQuaQuet(v, ngu({ lechNgay: true })), { mau: "XANH", ma: "HOP_LE", ghi: "DA_TINH" });
  assert.equal(ketQuaQuet(ve({ ngayDi: null }), ngu()).ma, "HOP_LE", "chưa có ngày đi thì không lệch");
});

test("chưa thu đủ → vàng; Trả sau trong hạn (moTheoTien true) không vàng", () => {
  assert.deepEqual(ketQuaQuet(ve({ moTheoTien: false }), ngu()), { mau: "VANG", ma: "CHUA_THU_DU", ghi: null });
  assert.equal(ketQuaQuet(ve({ moTheoTien: false }), ngu({ chuaThu: true })).ghi, "DA_TINH");
  assert.equal(ketQuaQuet(ve({ moTheoTien: true }), ngu()).ma, "HOP_LE");
});

test("số lượt đã tính đạt số khách hiệu lực → vàng VUOT_KHACH", () => {
  const v = ve({ soLuotDaTinh: 2, soKhachHieuLuc: 2 });
  assert.deepEqual(ketQuaQuet(v, ngu()), { mau: "VANG", ma: "VUOT_KHACH", ghi: null });
  assert.equal(ketQuaQuet(ve({ soLuotDaTinh: 1, soKhachHieuLuc: 2 }), ngu()).ma, "HOP_LE");
  assert.equal(ketQuaQuet(v, ngu({ vuotKhach: true })).ghi, "DA_TINH");
});

test("nhiều cảnh báo vàng: hỏi lần lượt theo thứ tự lệch ngày, chưa thu, vượt khách; phải xác nhận đủ", () => {
  const v = ve({ ngayDi: "2026-11-12", moTheoTien: false, soLuotDaTinh: 2 });
  assert.equal(ketQuaQuet(v, ngu()).ma, "LECH_NGAY");
  assert.equal(ketQuaQuet(v, ngu({ lechNgay: true })).ma, "CHUA_THU_DU");
  assert.equal(ketQuaQuet(v, ngu({ lechNgay: true, chuaThu: true })).ma, "VUOT_KHACH");
  assert.equal(ketQuaQuet(v, ngu({ lechNgay: true, chuaThu: true, vuotKhach: true })).ghi, "DA_TINH");
  assert.deepEqual(canXacNhanQuet(v, HOM_NAY), { lechNgay: true, chuaThu: true, vuotKhach: true });
});

test("vé hợp lệ: người có quyền tính → DA_TINH; tài xế (quyenTinh false) → CHI_XEM", () => {
  assert.deepEqual(ketQuaQuet(ve(), ngu()), { mau: "XANH", ma: "HOP_LE", ghi: "DA_TINH" });
  assert.deepEqual(ketQuaQuet(ve(), ngu({ quyenTinh: false })), { mau: "XANH", ma: "HOP_LE", ghi: "CHI_XEM" });
  assert.equal(ketQuaQuet(ve({ moTheoTien: false }), ngu({ quyenTinh: false, chuaThu: true })).ghi, "CHI_XEM");
  assert.equal(ketQuaQuet(ve({ moTheoTien: false }), ngu({ quyenTinh: false })).ghi, null, "vàng chưa xác nhận không ghi");
});

test("mọi mã đều có câu chữ tiếng Việt có dấu", () => {
  for (const [ma, cau] of Object.entries(CAU_QUET)) assert.ok(cau.length > 3, ma);
  assert.equal(Object.keys(CAU_QUET).length, 10);
});
