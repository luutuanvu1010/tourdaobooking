// Ô tìm điểm ở ô chọn Nơi đón / Nơi trả (C10, việc 11 — C4): lọc danh mục điểm theo nhãn, bỏ dấu, giữ điểm đang chọn.
import { test } from "node:test";
import assert from "node:assert/strict";
import { locDiem } from "./loc-diem.ts";

const ds = [
  { id: "a", nhan: "Khách sạn Mường Thanh Luxury Nha Trang · khách sạn" },
  { id: "b", nhan: "Sân bay Cam Ranh · sân bay" },
  { id: "c", nhan: "Ga cáp treo Vinpearl · ga cáp treo" },
  { id: "d", nhan: "Văn phòng Trần Phú · văn phòng" },
];
const ids = (r: readonly { id: string }[]) => r.map((x) => x.id);

test("ô tìm trống (hoặc chỉ dấu cách) → đúng danh sách cũ, cùng thứ tự", () => {
  assert.deepEqual(ids(locDiem(ds, "", "")), ["a", "b", "c", "d"]);
  assert.deepEqual(ids(locDiem(ds, "   ", "")), ["a", "b", "c", "d"]);
});

test("bỏ dấu, không phân biệt hoa thường: 'muong' tìm ra Mường Thanh; 'SAN BAY' ra Sân bay; 'tran phu' ra Trần Phú", () => {
  assert.deepEqual(ids(locDiem(ds, "muong", "")), ["a"]);
  assert.deepEqual(ids(locDiem(ds, "SAN BAY", "")), ["b"]);
  assert.deepEqual(ids(locDiem(ds, "trần phú", "")), ["d"]);
  assert.deepEqual(ids(locDiem(ds, "  tran   phu ", "")), ["d"]);
});

test("tìm theo loại điểm trong nhãn: 'khách sạn' ra mọi khách sạn", () => {
  assert.deepEqual(ids(locDiem(ds, "khach san", "")), ["a"]);
});

test("điểm đang chọn luôn còn trong danh sách dù không khớp (ô chọn không tự rơi về trống)", () => {
  assert.deepEqual(ids(locDiem(ds, "muong", "c")), ["a", "c"]);
  assert.deepEqual(ids(locDiem(ds, "khong co dau", "b")), ["b"]);
});

test("không khớp gì và không có điểm đang chọn → rỗng (giao diện hiện câu 'Không thấy điểm nào')", () => {
  assert.deepEqual(locDiem(ds, "havana", ""), []);
});
