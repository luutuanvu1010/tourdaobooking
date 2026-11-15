// ADR-0175 Đ2.1, Đ2.2 (kế hoạch vé Tour Đảo Task 7): cổng mở vé quyết THEO TỪNG VÉ. Vé hãng ngoài: đúng `moTheoTien` (kết quả `moVeDuoc` hiện hành), không thêm điều kiện.
// Vé Tour Đảo: đơn đã xác nhận, và (không thuộc diện đối tác hoặc cổng tiền đạt). «Khách đã trả đủ» là cờ riêng, đơn vẫn `confirmed`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { veMoDuocTheoVe } from "./mo-ve-theo-ve.ts";

const TD = (daMo = false) => ({ nguon: "TOUR_DAO" as const, daMo });
const HN = (daMo = false) => ({ nguon: "HANG_NGOAI" as const, daMo });

test("đơn nội bộ đã xác nhận, chưa thu đủ: vé Tour Đảo mở, vé hãng ngoài không", () => {
  const d = { trangThai: "confirmed", dienDoiTac: false, moTheoTien: false };
  assert.equal(veMoDuocTheoVe(TD(), d), true);
  assert.equal(veMoDuocTheoVe(HN(), d), false);
});

test("đơn tài khoản Đối tác lập (diện đối tác), chưa thu: cả hai loại vé không mở; thu đủ: cả hai mở", () => {
  assert.equal(veMoDuocTheoVe(TD(), { trangThai: "confirmed", dienDoiTac: true, moTheoTien: false }), false);
  assert.equal(veMoDuocTheoVe(HN(), { trangThai: "confirmed", dienDoiTac: true, moTheoTien: false }), false);
  assert.equal(veMoDuocTheoVe(TD(), { trangThai: "confirmed", dienDoiTac: true, moTheoTien: true }), true);
  assert.equal(veMoDuocTheoVe(HN(), { trangThai: "confirmed", dienDoiTac: true, moTheoTien: true }), true);
});

test("bên đặt là đối tác, Trả sau trong hạn mức (cổng tiền đạt): vé Tour Đảo mở", () => {
  assert.equal(veMoDuocTheoVe(TD(), { trangThai: "confirmed", dienDoiTac: true, moTheoTien: true }), true);
});

test("đơn huỷ hoặc nháp: vé Tour Đảo không bao giờ mở, kể cả thu đủ hay đã mở; vé hãng ngoài vẫn đúng moTheoTien", () => {
  for (const trangThai of ["cancelled", "draft", null]) {
    assert.equal(veMoDuocTheoVe(TD(), { trangThai, dienDoiTac: false, moTheoTien: true }), false, String(trangThai));
    assert.equal(veMoDuocTheoVe(TD(true), { trangThai, dienDoiTac: false, moTheoTien: true }), false, String(trangThai));
    assert.equal(veMoDuocTheoVe(HN(true), { trangThai, dienDoiTac: false, moTheoTien: true }), true, String(trangThai));
    assert.equal(veMoDuocTheoVe(HN(), { trangThai, dienDoiTac: false, moTheoTien: false }), false, String(trangThai));
  }
});

test("đơn đã đánh dấu «Khách đã trả đủ» (vẫn confirmed): vé Tour Đảo vẫn mở, vé đã mở vẫn xem được", () => {
  assert.equal(veMoDuocTheoVe(TD(), { trangThai: "confirmed", dienDoiTac: false, moTheoTien: true }), true);
  assert.equal(veMoDuocTheoVe(TD(true), { trangThai: "confirmed", dienDoiTac: true, moTheoTien: true }), true);
  assert.equal(veMoDuocTheoVe(HN(true), { trangThai: "confirmed", dienDoiTac: false, moTheoTien: true }), true);
});
