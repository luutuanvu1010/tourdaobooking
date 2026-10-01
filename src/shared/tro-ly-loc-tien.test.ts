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

test("anSoTien: chữ dài chạy nhanh (dưới 50 ms cho 20.000 ký tự)", () => {
  const s = "Bấm 2 lần rồi chờ 3 phút. ".repeat(800);
  const t0 = performance.now();
  anSoTien(s);
  assert.ok(performance.now() - t0 < 50);
});
