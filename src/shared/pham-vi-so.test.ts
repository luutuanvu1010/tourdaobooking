// Kiểu D (kiểm theo vai 2/10 — lộ trình 3/10 V1.5c): số khác phạm vi phải mang nhãn. Trang chủ trộn số TOÀN CÔNG TY (Còn thiếu tiền, Chờ xác nhận, Chưa phụ
// trách — máy chủ đếm cả bảng) với số CỦA TÔI (Doanh thu tuần — chỉ đơn người xem lập) mà không nói rõ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { NHAN_PHAM_VI, PHAM_VI_O_TRANG_CHU } from "./pham-vi-so.ts";

test("bốn ô số Trang chủ: ba ô 'Toàn công ty', Doanh thu 'Của tôi'; nhãn tiếng Việt", () => {
  assert.deepEqual(PHAM_VI_O_TRANG_CHU, { conThieu: "TOAN_CONG_TY", choXacNhan: "TOAN_CONG_TY", chuaPhuTrach: "TOAN_CONG_TY", doanhThu: "CUA_TOI" });
  assert.deepEqual(NHAN_PHAM_VI, { TOAN_CONG_TY: "Toàn công ty", CUA_TOI: "Của tôi" });
});

test("web/home.ts: MỌI ô số (oSo / oSoMayTinh) truyền phạm vi từ bảng chung — không ô nào thiếu nhãn", () => {
  const src = readFileSync(fileURLToPath(new URL("../../web/home.ts", import.meta.url)), "utf8");
  const goi = [...src.matchAll(/\boSo(?:MayTinh)?\(\s*"/g)].map((m) => src.slice(m.index!, src.indexOf("\n", m.index!)));
  assert.ok(goi.length >= 8, `đếm được ${goi.length} lời gọi ô số`);
  for (const g of goi) assert.match(g, /PHAM_VI_O_TRANG_CHU\.\w+/, g);
});
