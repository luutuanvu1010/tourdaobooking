// ADR-0135 Đ1–Đ2: luật thuần «ai đọc / ghi được đơn». Đơn NHÁP chỉ người lập đọc và ghi; người khác (kể cả Toàn quyền, người phụ trách chọn sẵn) → 404.
// Bảng chân trị đủ 2×2×2 cho `draft` (coQuyenXem × laNguoiLap × (dangCho, xetDuyetDuoc) ghép) + hai ca `confirmed` / `cancelled` đi theo `coQuyenXem`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { chiNguoiLapGhiNhap, ketQuaXemDon, xemDuocDon } from "./xem-don-nhap.ts";

const TRANG_THAI = ["draft", "confirmed", "cancelled"] as const;
const BOOL = [false, true] as const;

test("đơn nháp: bảng chân trị đủ coQuyenXem × laNguoiLap × dangCho × xetDuyetDuoc", () => {
  for (const coQuyenXem of BOOL) for (const laNguoiLap of BOOL) for (const dangCho of BOOL) for (const xetDuyetDuoc of BOOL) {
    const mong = (laNguoiLap && coQuyenXem) || (dangCho && xetDuyetDuoc);
    assert.equal(xemDuocDon({ coQuyenXem, status: "draft", laNguoiLap, dangCho, xetDuyetDuoc }), mong, JSON.stringify({ coQuyenXem, laNguoiLap, dangCho, xetDuyetDuoc }));
  }
});

test("Đợt 2 (chưa có bước chờ): nháp của người khác KHÔNG xem được dù có quyền xem mọi đơn", () => {
  assert.equal(xemDuocDon({ coQuyenXem: true, status: "draft", laNguoiLap: false, dangCho: false, xetDuyetDuoc: false }), false);
  assert.equal(xemDuocDon({ coQuyenXem: true, status: "draft", laNguoiLap: true, dangCho: false, xetDuyetDuoc: false }), true);
  assert.equal(xemDuocDon({ coQuyenXem: false, status: "draft", laNguoiLap: true, dangCho: false, xetDuyetDuoc: false }), false, "người lập mà bảng quyền không cho xem vẫn không xem");
});

test("đơn đã xác nhận / đã huỷ: đi theo coQuyenXem, bất kể người lập, bước chờ", () => {
  for (const status of ["confirmed", "cancelled"] as const) for (const laNguoiLap of BOOL) for (const dangCho of BOOL) for (const xetDuyetDuoc of BOOL) {
    assert.equal(xemDuocDon({ coQuyenXem: true, status, laNguoiLap, dangCho, xetDuyetDuoc }), true);
    assert.equal(xemDuocDon({ coQuyenXem: false, status, laNguoiLap, dangCho, xetDuyetDuoc }), false);
  }
});

test("ketQuaXemDon: nháp của người khác LUÔN 404 (kể cả chỉ-HDV hay có ô xem mọi đơn); đơn khác giữ luật cũ (chỉ-HDV 404, còn lại 403)", () => {
  const co = { dangCho: false, xetDuyetDuoc: false };
  for (const coQuyenXem of BOOL) for (const chiXemDonDuocGiao of BOOL) {
    assert.equal(ketQuaXemDon({ ...co, coQuyenXem, status: "draft", laNguoiLap: false, chiXemDonDuocGiao }), "404");
  }
  assert.equal(ketQuaXemDon({ ...co, coQuyenXem: true, status: "draft", laNguoiLap: true, chiXemDonDuocGiao: false }), "ok");
  assert.equal(ketQuaXemDon({ ...co, coQuyenXem: false, status: "draft", laNguoiLap: true, chiXemDonDuocGiao: false }), "403", "người lập mà bảng quyền không cho xem: như cũ 403");
  assert.equal(ketQuaXemDon({ ...co, coQuyenXem: true, status: "confirmed", laNguoiLap: false, chiXemDonDuocGiao: true }), "ok");
  assert.equal(ketQuaXemDon({ ...co, coQuyenXem: false, status: "confirmed", laNguoiLap: false, chiXemDonDuocGiao: true }), "404");
  assert.equal(ketQuaXemDon({ ...co, coQuyenXem: false, status: "cancelled", laNguoiLap: false, chiXemDonDuocGiao: false }), "403");
});

test("chiNguoiLapGhiNhap: nháp chỉ người lập; đơn khác trạng thái không bị luật này chặn", () => {
  for (const status of TRANG_THAI) for (const laNguoiLap of BOOL) {
    assert.equal(chiNguoiLapGhiNhap({ status, laNguoiLap }), status !== "draft" || laNguoiLap, `${status}/${laNguoiLap}`);
  }
});
