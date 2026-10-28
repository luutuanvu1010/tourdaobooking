// Đặc tả đợt 0 tiêu chí 10.5: `/audit` mở bằng tài khoản không có `audit.view` (vd Bán hàng) phải vẽ trạng thái 403 CÓ VỎ (không mục sáng, không ô tìm,
// không bộ lọc, nút «Về trang đầu của bạn»), không phải một dòng báo lỗi trên trang còn nguyên bộ lọc. Kịch bản Chrome dot-0-smoke.mjs bước 5 đo thật;
// bài này khoá ở mức mã nguồn để lần sửa sau không quay lại dòng báo lỗi cũ.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const MA = readFileSync(new URL("../web/audit.ts", import.meta.url), "utf8");

test("/audit không có quyền xem ⇒ trangThaiToanTrang(\"403\") với trang đầu theo người xem", () => {
  assert.match(MA, /if \(!can\(staff, "audit\.view"\)\) trangThaiToanTrang\("403", \{ trangDau: homeRedirect\(staff\) \?\? "\/" \}\)/);
  assert.doesNotMatch(MA, /chỉ người phụ trách hệ thống xem được/);
});
