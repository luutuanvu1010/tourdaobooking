// Câu màn hình hiện sau lệnh đơn nối máy đồng bộ chuyến (ADR-0104 Đ2; kế hoạch §8): `nhac` của máy chủ, hoặc câu cố định khi `capNhatTay`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { CAU_CAP_NHAT_TAY, CAU_NHAC_XE_DANG_CHAY, cauDongBoChuyen } from "./dong-bo-chuyen-cau.ts";

test("ADR-0104 Đ2 (kế hoạch §8): cauDongBoChuyen — không có / không gì → rỗng; nhac → đúng câu máy chủ; capNhatTay → câu cố định; gộp nhiều lệnh, không lặp", () => {
  assert.deepEqual(cauDongBoChuyen([]), []);
  assert.deepEqual(cauDongBoChuyen([undefined]), []);
  assert.deepEqual(cauDongBoChuyen([{ nhac: null, capNhatTay: false }]), []);
  assert.deepEqual(cauDongBoChuyen([{ nhac: CAU_NHAC_XE_DANG_CHAY, capNhatTay: false }]), [CAU_NHAC_XE_DANG_CHAY]);
  assert.deepEqual(cauDongBoChuyen([{ nhac: null, capNhatTay: true }]), [CAU_CAP_NHAT_TAY]);
  assert.deepEqual(cauDongBoChuyen([{ nhac: CAU_NHAC_XE_DANG_CHAY, capNhatTay: true }]), [CAU_NHAC_XE_DANG_CHAY, CAU_CAP_NHAT_TAY]);
  // Bảng "Sửa đưa đón" chạy nhiều lệnh: gộp, mỗi câu một lần, nhắc trước cập nhật tay.
  assert.deepEqual(
    cauDongBoChuyen([{ nhac: null, capNhatTay: true }, undefined, { nhac: CAU_NHAC_XE_DANG_CHAY, capNhatTay: false }, { nhac: CAU_NHAC_XE_DANG_CHAY, capNhatTay: true }]),
    [CAU_NHAC_XE_DANG_CHAY, CAU_CAP_NHAT_TAY],
  );
});
