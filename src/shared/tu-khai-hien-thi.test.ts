import { test } from "node:test";
import assert from "node:assert/strict";
import { NHAN_LOAI_PHIEU, NHAN_TRANG_THAI_PHIEU, nhanLoaiPhieu, nhanTrangThaiPhieu } from "./tu-khai-hien-thi.ts";

test("nhãn tiếng Việt cho mọi loại / trạng thái phiếu; mã lạ (kể cả tên thuộc tính của Object) ra chữ trung tính, không lộ mã thô", () => {
  assert.deepEqual(Object.keys(NHAN_LOAI_PHIEU), ["NGAY_SINH", "DIA_CHI", "GIAY_TO"]);
  assert.deepEqual(Object.keys(NHAN_TRANG_THAI_PHIEU), ["CHO_XAC_MINH", "DA_CHAP_NHAN", "TU_CHOI", "RUT"]);
  assert.equal(nhanTrangThaiPhieu("CHO_XAC_MINH"), "Chờ xác minh");
  assert.equal(nhanTrangThaiPhieu("RUT"), "Đã rút");
  assert.equal(nhanLoaiPhieu("GIAY_TO"), "Giấy tờ");
  assert.equal(nhanLoaiPhieu("toString"), "Thông tin");
  assert.equal(nhanTrangThaiPhieu("LA"), "Không rõ");
});
