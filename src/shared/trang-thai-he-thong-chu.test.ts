import assert from "node:assert/strict";
import { test } from "node:test";
import * as chu from "./trang-thai-he-thong-chu.ts";

// web/api.ts dùng "parameter property" nên node (strip-only) không nhập được: dựng lớp cùng hình (Error có `status`).
class ApiError extends Error {
  status: number;
  constructor(status: number, _code: string, message: string) {
    super(message);
    this.status = status;
  }
}

test("cauThieuMa ghép đúng đối tượng", () => {
  assert.equal(chu.cauThieuMa("đơn"), "Thiếu mã đơn. Mở từ danh sách để xem đúng đơn.");
});

test("cauLoiMayChu: ApiError giữ thông điệp, hết giờ nói 45 giây, còn lại câu chung", () => {
  assert.equal(chu.cauLoiMayChu(new ApiError(500, "x", "Lỗi riêng của máy chủ."), false), "Lỗi riêng của máy chủ.");
  assert.ok(chu.cauLoiMayChu(new TypeError("x"), true).includes("45 giây"));
  assert.equal(chu.cauLoiMayChu(new TypeError("x"), false), "Máy chủ không trả lời. Thử lại sau ít phút.");
});

test("mọi hằng chữ không lộ mã kỹ thuật hay chữ Anh", () => {
  const cho = new Set(["Wi-Fi", "4G"]);
  for (const [ten, v] of Object.entries(chu)) {
    if (typeof v !== "string") continue;
    assert.ok(!/[{}]/.test(v), `${ten} chứa ngoặc nhọn`);
    // Tách theo từ Unicode; từ thuần ASCII dài ≥ 4 phải là tiếng Việt không dấu thường gặp, không thì là chữ Anh.
    const khongDau = new Set(["trang", "nang", "mang", "tren", "nhan", "thay", "chua", "mo", "dia", "chi", "gian", "mot", "dung", "danh", "sach", "tinh", "nguoi", "tung", "ngay", "ve", "lai", "khi", "trong", "ten", "con", "nay"]);
    for (const t of v.match(/[\p{L}-]+/gu) ?? []) if (/^[A-Za-z-]{4,}$/.test(t) && !cho.has(t) && !khongDau.has(t.toLowerCase())) assert.fail(`${ten}: chữ Anh "${t}"`);
  }
});
