// MỘT luật số người của chặng (ADR-0054 D10.3; kế hoạch 2026-10-01-may-chu-o-moi-chang Task 2, TC-P8 phần thuần). Chạy trực tiếp bằng `node --test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { soNguoiChang, tongKhach } from "./so-nguoi-chang.ts";

test("soNguoiChang: chặng VỀ có số riêng → min(số riêng, số khách dịch vụ); không có → số khách dịch vụ; chặng ĐI luôn số khách dịch vụ", () => {
  assert.equal(soNguoiChang({ direction: "RETURN", paxOverride: 2 }, 4), 2);
  assert.equal(soNguoiChang({ direction: "RETURN", paxOverride: null }, 4), 4);
  assert.equal(soNguoiChang({ direction: "RETURN", paxOverride: 2 }, 1), 1, "số khách dịch vụ giảm dưới số riêng → kẹp lúc đọc (cột không tự sửa)");
  assert.equal(soNguoiChang({ direction: "OUT", paxOverride: null }, 4), 4);
  assert.equal(soNguoiChang({ direction: "OUT", paxOverride: 2 }, 4), 4, "chiều đi không bao giờ dùng số riêng (CSDL cũng chặn)");
  assert.equal(soNguoiChang({ direction: "RETURN", paxOverride: 2 }, 0), 0);
});

test("soNguoiChang: tham số thứ ba (móc ADR-0065 `soKhachDiXe`, Task 8) hôm nay BỊ BỎ QUA — ghim để khi ADR-0065 được duyệt thì sửa ở đây, không sửa nơi gọi", () => {
  assert.equal(soNguoiChang({ direction: "OUT", paxOverride: null }, 4, { soKhachDiXe: 2 }), 4);
  assert.equal(soNguoiChang({ direction: "RETURN", paxOverride: 3 }, 4, { soKhachDiXe: 1 }), 3);
});

test("tongKhach: cộng bốn loại tuổi của số khách hiệu lực (MỘT chỗ cộng cho số khách dịch vụ của chặng)", () => {
  assert.equal(tongKhach({ adult: 2, child: 1, senior: 1, infant: 1 }), 5);
  assert.equal(tongKhach({ adult: 0, child: 0, senior: 0, infant: 0 }), 0);
});
