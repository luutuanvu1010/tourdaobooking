// Đổi giờ VN ↔ mili-giây (ADR-0047 A1 giao `vnLocalToMs`; ADR-0049 thêm ĐÚNG MỘT hàm ngược `msToVnLocal` — kế hoạch mục 1.1, Task A3, TC-18).
// Tách tệp riêng (không sửa `vn-date.test.ts`) để khỏi va dòng import mà nhánh ADR-0047 cũng sửa — xem nhật ký thi công ADR-0049.
import { test } from "node:test";
import assert from "node:assert/strict";
import { msToVnLocal, vnLocalToMs } from "./vn-date.ts";

test("TC-18 msToVnLocal: mili-giây → ngày + giờ dân sự VN; 22:30 VN ngày D đúng mili-giây; ca 00:00–07:00 VN (ngày UTC TRƯỚC)", () => {
  assert.equal(vnLocalToMs("2026-09-30", "22:30"), Date.parse("2026-09-30T15:30:00.000Z"));
  assert.deepEqual(msToVnLocal(Date.parse("2026-09-30T15:30:00.000Z")), { date: "2026-09-30", time: "22:30" });
  assert.deepEqual(msToVnLocal(Date.parse("2026-09-29T17:00:00.000Z")), { date: "2026-09-30", time: "00:00" }, "00:00 VN = 17:00 UTC hôm trước");
  assert.deepEqual(msToVnLocal(Date.parse("2026-09-29T23:59:00.000Z")), { date: "2026-09-30", time: "06:59" });
  assert.deepEqual(msToVnLocal(Date.parse("2026-09-30T00:00:00.000Z")), { date: "2026-09-30", time: "07:00" });
  assert.deepEqual(msToVnLocal(Date.parse("2026-12-31T17:30:00.000Z")), { date: "2027-01-01", time: "00:30" }, "qua năm");
  // Giây lẻ bị bỏ (giờ "HH:MM" là giờ dân sự đến phút); làm tròn XUỐNG.
  assert.deepEqual(msToVnLocal(Date.parse("2026-09-30T15:30:59.999Z")), { date: "2026-09-30", time: "22:30" });
});

test("TC-18 msToVnLocal(vnLocalToMs(d, t)) quay về (d, t) cho mọi phút của một ngày, và cho ngày qua tháng / qua năm / năm nhuận", () => {
  for (const d of ["2026-09-30", "2026-10-01", "2026-12-31", "2028-02-29"]) {
    for (let m = 0; m < 24 * 60; m += 7) {
      const t = `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
      const ms = vnLocalToMs(d, t);
      assert.ok(ms !== null, `${d} ${t}`);
      assert.deepEqual(msToVnLocal(ms), { date: d, time: t }, `${d} ${t}`);
    }
  }
});

test("TC-18 chuyến 23:00 → 01:00 hôm sau là 2 giờ; vnLocalToMs sai khuôn → null", () => {
  assert.equal(vnLocalToMs("2026-10-01", "01:00")! - vnLocalToMs("2026-09-30", "23:00")!, 2 * 3600e3);
  assert.equal(vnLocalToMs("2026-02-30", "07:00"), null);
  assert.equal(vnLocalToMs("2026-10-10", "24:00"), null);
});
