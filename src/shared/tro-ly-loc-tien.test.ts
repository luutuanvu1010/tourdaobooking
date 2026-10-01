// Lọc số tiền ở câu trả lời của mẫu AI (ADR-0073 Đ7a — lớp máy chủ cho Hiến chương 5.15 "AI không bao giờ tính tiền"). Hàng rào (docs/SO-HANG-RAO.md):
// mọi câu trả lời đi qua anSoTien TRƯỚC khi trả và TRƯỚC khi lưu tl_hoi_dap (ca route ở src/modules/tro-ly/bo-nao-route.test.ts, Task 5).
// Review Focus 2: không ẩn nhầm số không phải tiền (số chỗ, số khách, giờ, ngày, mã đơn, số bước, số trang).
import { test } from "node:test";
import assert from "node:assert/strict";
import { AN_SO_TIEN, anSoTien } from "./tro-ly-loc-tien.ts";

test("P1: số kèm đơn vị tiền ⇒ [đã ẩn số tiền]", () => {
  for (const [vao, ra] of [
    ["Giá 500.000 đ mỗi khách.", `Giá ${AN_SO_TIEN} mỗi khách.`],
    ["Giá 500.000đ.", `Giá ${AN_SO_TIEN}.`],
    ["Khoảng 1,2 triệu một người", `Khoảng ${AN_SO_TIEN} một người`],
    ["Phụ thu 300k", `Phụ thu ${AN_SO_TIEN}`],
    ["Cọc 2 tr nhé", `Cọc ${AN_SO_TIEN} nhé`],
    ["Tổng 1.200.000 cho cả đoàn", `Tổng ${AN_SO_TIEN} cho cả đoàn`],
    ["Phí 1.500.000 VNĐ", `Phí ${AN_SO_TIEN}`],
    ["Phí 450.000 ₫", `Phí ${AN_SO_TIEN}`],
    ["Giá 200 nghìn", `Giá ${AN_SO_TIEN}`],
    ["Trả 5 đồng", `Trả ${AN_SO_TIEN}`],
    ["Chi phí $5 mỗi tháng", `Chi phí ${AN_SO_TIEN} mỗi tháng`],
    ["Trần 10 USD", `Trần ${AN_SO_TIEN}`],
    ["Lãi 2 tỷ", `Lãi ${AN_SO_TIEN}`],
  ] as const) assert.equal(anSoTien(vao), ra, vao);
  assert.equal(anSoTien("A 100k, B 200k."), `A ${AN_SO_TIEN}, B ${AN_SO_TIEN}.`, "nhiều chỗ");
});

test("Review Focus 2 — KHÔNG ẩn: số chỗ, số khách, giờ, ngày, mã đơn, số bước, số trang, số lần, tỉnh, đơn, tầng, số phòng", () => {
  for (const s of [
    "Xe 16 chỗ, 4 khách.", "Đón lúc 08:30 ngày 05/10.", "Mã đơn TD-2026-0012.", "1. Vào trang Tôi.\n2. Bấm Đổi PIN.", "Xem 2 trang đầu.",
    "Bấm 2 lần.", "Đi 3 tỉnh.", "Có 2 đơn chờ.", "Lên 2 tầng.", "Phòng 1203.", "Mất 1.5 giờ.", "Tour 3N2Đ.", "Tối đa khoảng 8 dòng.", "5 đến 7 người",
  ]) assert.equal(anSoTien(s), s, s);
});

test("KHÔNG ẩn thêm: SĐT đã che, năm, số lượng, phiên bản, thời lượng, phần trăm", () => {
  // Phần trăm là tỉ lệ, không phải số tiền ⇒ giữ (quyết định ghi trong báo cáo).
  for (const s of [
    "SĐT [đã che] gọi lại.", "Năm 2026.", "Từ năm 2026 trở đi.", "3 người, 12 đoạn.", "Bản 1.53 mới.", "Chờ 20 giây.", "Chờ 3 phút.",
    "Giảm 10% cho đoàn.", "Còn 2/3 chỗ.", "Cách 15 km.", "Nặng 20 kg.", "Ngày 1/10/2026.",
  ]) assert.equal(anSoTien(s), s, s);
});

test("Vòng sửa 1 — ẨN: số có dấu nhóm nghìn luôn là tiền, tiền ghi TRƯỚC số, viết tắt tiếng Việt, đơn vị thừa, dãy số dài", () => {
  for (const [vao, ra] of [
    ["giá vé 350.000", `giá vé ${AN_SO_TIEN}`],
    ["350.000", AN_SO_TIEN],
    ["Vé 350.000.", `Vé ${AN_SO_TIEN}.`],
    ["Tổng 1,500,000 nhé", `Tổng ${AN_SO_TIEN} nhé`],
    ["VND 500.000", AN_SO_TIEN],
    ["VNĐ 500.000", AN_SO_TIEN],
    ["Giá USD 20 một vé", `Giá ${AN_SO_TIEN} một vé`],
    ["Giá US$20", `Giá ${AN_SO_TIEN}`],
    ["Giá $5", `Giá ${AN_SO_TIEN}`],
    ["Cọc 1tr2", `Cọc ${AN_SO_TIEN}`],
    ["Cọc 2tr5 nhé", `Cọc ${AN_SO_TIEN} nhé`],
    ["Lãi 1tỷ2", `Lãi ${AN_SO_TIEN}`],
    ["Giá 2 triệu 5", `Giá ${AN_SO_TIEN}`],
    ["Giá 2 triệu 500 nghìn", `Giá ${AN_SO_TIEN}`],
    ["Giá 1 triệu rưỡi", `Giá ${AN_SO_TIEN}`],
    ["Giá 500 nghìn đồng", `Giá ${AN_SO_TIEN}`],
    ["Giá 500k đ.", `Giá ${AN_SO_TIEN}.`],
    ["Giá 1200000", `Giá ${AN_SO_TIEN}`],
    ["Giá 1200000đ", `Giá ${AN_SO_TIEN}`],
  ] as const) assert.equal(anSoTien(vao), ra, vao);
});

test("Vòng sửa 1 — KHÔNG ẩn: nhóm nghìn kèm đơn vị không phải tiền, mã đơn, giờ, [đã che]", () => {
  for (const s of [
    "Dài 1.200 km.", "Nặng 2.500 kg.", "Xe 1.000 người?", "Tối đa 3.000 ký tự.", "Còn 1.500 token.", "Giảm 10.000 %", "Có 1.200 lượt xem.", "Cách 1.200 m.",
    "Mã TD-20261001-001.", "TD-20261001", "Mã đơn TD20261001001.", "Đón 14h30.", "Lúc 08:30.", "[đã che] gọi.", "Bản 1.53.", "Xem 2 trang.", "Có 3 tỉnh.", "Có 2 đơn.",
  ]) assert.equal(anSoTien(s), s, s);
});

test("anSoTien: chữ dài chạy nhanh (dưới 50 ms cho 20.000 ký tự)", () => {
  const s = "Bấm 2 lần rồi chờ 3 phút. ".repeat(800);
  const t0 = performance.now();
  anSoTien(s);
  assert.ok(performance.now() - t0 < 50);
  for (const x of ["9".repeat(20000), "1.234".repeat(4000), "1.1".repeat(8000), "5 tr ".repeat(4000), "$".repeat(20000), "1tr".repeat(6000)]) {
    const t1 = performance.now();
    anSoTien(x);
    assert.ok(performance.now() - t1 < 100, x.slice(0, 12));
  }
});
