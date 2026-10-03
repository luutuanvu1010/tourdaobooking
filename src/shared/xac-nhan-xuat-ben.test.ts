// HT-03 (kiểm theo vai 2/10 — lộ trình 3/10 V1.3): nội dung hộp xác nhận "Xuất bến" của tài xế + dòng cảnh báo khi ngày chạy khác hôm nay (tài xế và văn
// phòng). Hàm thuần — giao diện chỉ vẽ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { canhBaoNgayChay, hopXuatBen } from "./xac-nhan-xuat-ben.ts";

const C = { ma: "CX-0510-01", ngayChay: "2026-10-05", gioDuKien: "06:00", bienSo: "79B-123.45", soKhach: 9 };

test("hopXuatBen: đủ năm dòng — mã chuyến, NGÀY CHẠY (có thứ), giờ dự kiến, biển số, số khách; nút 'Xuất bến'; cùng ngày → không cảnh báo", () => {
  const h = hopXuatBen({ ...C, ngayChay: "2026-10-02" }, "2026-10-02");
  assert.equal(h.tieuDe, "Xuất bến CX-0510-01?");
  assert.deepEqual(h.dong, [
    ["Mã chuyến", "CX-0510-01"],
    ["Ngày chạy", "Thứ Sáu 02/10/2026 (hôm nay)"],
    ["Giờ dự kiến", "06:00"],
    ["Biển số", "79B-123.45"],
    ["Số khách", "9 khách"],
  ]);
  assert.equal(h.canhBao, null);
  assert.equal(h.nutXacNhan, "Xuất bến");
  assert.match(h.ghiChu, /giờ ghi là lúc bấm/);
});

test("hopXuatBen + canhBaoNgayChay: tái hiện HT-03 — chuyến ngày 05/10 mở lúc 02/10 → cảnh báo đỏ nêu ngày chạy và hôm nay; nút đổi chữ 'Vẫn xuất bến' (ngắn — vừa khổ 390)", () => {
  const h = hopXuatBen(C, "2026-10-02");
  assert.equal(h.dong[1]![1], "Thứ Hai 05/10/2026");
  assert.equal(h.canhBao, "Chuyến này chạy ngày Thứ Hai 05/10/2026, không phải hôm nay (Thứ Sáu 02/10/2026). Chỉ bấm khi xe thật sự lăn bánh cho chuyến này.");
  assert.equal(h.nutXacNhan, "Vẫn xuất bến");
  assert.equal(canhBaoNgayChay("2026-10-05", "2026-10-02"), h.canhBao, "màn văn phòng dùng CHUNG câu");
  // Chuyến của hôm qua (vắt đêm, xuất bến muộn) cũng cảnh báo.
  assert.match(canhBaoNgayChay("2026-10-01", "2026-10-02")!, /Thứ Năm 01\/10\/2026/);
  assert.equal(canhBaoNgayChay("2026-10-02", "2026-10-02"), null);
});

test("hopXuatBen: chưa có khách → '0 khách' (không ẩn dòng); số khách không âm", () => {
  assert.equal(hopXuatBen({ ...C, soKhach: 0 }, "2026-10-05").dong[4]![1], "0 khách");
});
