// ADR-0229 Đ10 — bổ sung theo người kiểm độc lập 23/11 (N3): cảnh báo khi Kế toán ghi mức hoa hồng TAY (`chenhGiamGiaSauGhiTay`) tính mức tỷ lệ mới trên cơ sở đã bỏ phần tăng
// mùa vụ — cùng số sẽ vào sổ. Đơn 2 × 515.000 (cơ sở 900.000), giảm giá 100.000: ghi tay 10 % ⇒ hoa hồng 90.000 < 100.000 ⇒ báo chênh 10.000 (trên thành tiền sẽ là 103.000, không báo).
import { test } from "node:test";
import assert from "node:assert/strict";
import { chenhGiamGiaSauGhiTay } from "./hoa-hong-dong.ts";

test("N3: ghi tay 10 % trên đơn mùa vụ ⇒ tổng hoa hồng 90.000, chênh 10.000 với giảm giá 100.000", () => {
  const k = chenhGiamGiaSauGhiTay({
    dong: [{ serviceId: "s1", thanhTien: 1_030_000, coSoHoaHong: 900_000, soKhachTinh: 2, hoaHong: 0 }],
    serviceId: "s1", moi: { kieu: "RATE", tyLeBp: 1000 }, giamGiaHieuLuc: 100_000,
  });
  assert.deepEqual(k, { tongHoaHong: 90_000, chenh: 10_000 });
  assert.equal(chenhGiamGiaSauGhiTay({ dong: [{ serviceId: "s1", thanhTien: 1_030_000, coSoHoaHong: 1_030_000, soKhachTinh: 2, hoaHong: 0 }], serviceId: "s1", moi: { kieu: "RATE", tyLeBp: 1000 }, giamGiaHieuLuc: 100_000 }), null, "đơn không mùa vụ: 103.000 ≥ 100.000, không báo");
});
