// Luật thuần của thanh tiến độ bốn bước màn Tạo đơn — src/shared/buoc-tao-don.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { BUOC_TAO_DON, buocDangXem, buocXong, type DauVaoBuoc } from "./buoc-tao-don.ts";

const DU: DauVaoBuoc = { coNgayDi: true, ten: "Lan", sdt: "0912345678", soDichVu: 1, coLoiDichVu: false, coLoiTien: false, daChonNguoi: false };

test("bốn bước: thứ tự và chữ ngắn đúng ảnh phác", () => {
  assert.deepEqual(BUOC_TAO_DON.map((b) => [b.ma, b.nhan]), [["khach", "Khách"], ["dich-vu", "Dịch vụ"], ["thanh-toan", "Thanh toán"], ["phu-trach", "Phụ trách"]]);
});

test("buocXong: Khách cần ngày khởi hành + tên + SĐT (khoảng trắng không tính)", () => {
  assert.equal(buocXong(DU)["khach"], true);
  assert.equal(buocXong({ ...DU, coNgayDi: false })["khach"], false);
  assert.equal(buocXong({ ...DU, ten: "  " })["khach"], false);
  assert.equal(buocXong({ ...DU, sdt: "" })["khach"], false);
});

test("buocXong: Dịch vụ cần ít nhất một dịch vụ và không còn lỗi chặn Lưu", () => {
  assert.equal(buocXong(DU)["dich-vu"], true);
  assert.equal(buocXong({ ...DU, soDichVu: 0 })["dich-vu"], false);
  assert.equal(buocXong({ ...DU, coLoiDichVu: true })["dich-vu"], false, "dịch vụ còn thiếu nơi đón / số khách: chưa ✓");
});

test("buocXong: Thanh toán ✓ khi có dịch vụ và tiền không lệch luật; Phụ trách ✓ khi đã chọn người", () => {
  assert.equal(buocXong(DU)["thanh-toan"], true);
  assert.equal(buocXong({ ...DU, soDichVu: 0 })["thanh-toan"], false);
  assert.equal(buocXong({ ...DU, coLoiTien: true })["thanh-toan"], false);
  assert.equal(buocXong(DU)["phu-trach"], false);
  assert.equal(buocXong({ ...DU, daChonNguoi: true })["phu-trach"], true);
});

test("buocDangXem: bước cuối đã chạm ngưỡng; chưa chạm bước nào → bước đầu; chạm đáy trang → bước cuối", () => {
  assert.equal(buocDangXem([100, 900, 1700, 2300], 120, false), 0);
  assert.equal(buocDangXem([-400, 300, 1100, 1700], 120, false), 0, "bước hai còn dưới ngưỡng");
  assert.equal(buocDangXem([-1000, -200, 100, 700], 120, false), 2);
  assert.equal(buocDangXem([-1000, -900, -500, -100], 120, false), 3);
  assert.equal(buocDangXem([300, 900], 120, false), 0, "chưa bước nào chạm ngưỡng → bước đầu");
  assert.equal(buocDangXem([-1000, -200, 300, 500], 120, true), 3, "đáy trang: bước cuối dù chưa chạm ngưỡng");
  assert.equal(buocDangXem([], 120, false), 0);
  assert.equal(buocDangXem([-50, 500], 120, false), 0, "ba bước (vai không có bước Phụ trách) cũng đúng");
});
