import { test } from "node:test";
import assert from "node:assert/strict";
import { addDays, isHHMM, isISODate, vnDateTimeText, vnLocalToIso, vnToday } from "./vn-date.ts";

test("vnToday: ngày theo giờ Việt Nam, không phải UTC", () => {
  assert.equal(vnToday(new Date("2026-09-16T18:30:00Z")), "2026-09-17"); // 01:30 ngày 17 giờ VN
  assert.equal(vnToday(new Date("2026-09-16T16:59:59Z")), "2026-09-16"); // 23:59:59 ngày 16 giờ VN
  assert.equal(vnToday(new Date("2026-12-31T17:00:00Z")), "2027-01-01"); // qua năm
});

test("isISODate: đúng khuôn dạng và đúng lịch", () => {
  for (const ok of ["2026-09-20", "2028-02-29", "2026-12-31"]) assert.ok(isISODate(ok), ok);
  for (const bad of ["2026-02-30", "2027-02-29", "2026-13-01", "2026-9-2", "20/09/2026", "2026-09-20T00:00", "", " 2026-09-20", "2026-00-10"]) assert.ok(!isISODate(bad), bad);
});

test("addDays: qua tháng, qua năm, năm nhuận", () => {
  assert.equal(addDays("2026-09-19", 365), "2027-09-19");
  assert.equal(addDays("2027-12-31", 1), "2028-01-01");
  assert.equal(addDays("2028-02-28", 1), "2028-02-29");
  assert.equal(addDays("2026-09-19", -19), "2026-08-31");
});

test("isHHMM: 00:00–23:59, đủ hai chữ số", () => {
  for (const ok of ["00:00", "07:30", "12:00", "23:59"]) assert.ok(isHHMM(ok), ok);
  for (const bad of ["24:00", "7:30", "07:60", "0730", "07:3", "", "07:30:00", "ab:cd"]) assert.ok(!isHHMM(bad), bad);
});

test("vnDateTimeText: 'HH:MM DD/MM/YYYY' theo giờ Việt Nam từ mốc ISO UTC (qua ngày, qua năm)", () => {
  assert.equal(vnDateTimeText("2026-09-22T03:05:00.000Z"), "10:05 22/09/2026");
  assert.equal(vnDateTimeText("2026-09-21T18:30:00Z"), "01:30 22/09/2026"); // qua ngày
  assert.equal(vnDateTimeText("2026-12-31T17:00:00Z"), "00:00 01/01/2027"); // qua năm
});

test("vnLocalToIso: giá trị ô datetime-local hiểu là GIỜ VIỆT NAM (không theo múi giờ thiết bị) → ISO UTC", () => {
  assert.equal(vnLocalToIso("2026-09-22T10:05"), "2026-09-22T03:05:00.000Z");
  assert.equal(vnLocalToIso("2026-09-22T00:30"), "2026-09-21T17:30:00.000Z"); // qua ngày (lùi 7 tiếng)
  assert.equal(vnLocalToIso("2027-01-01T06:59"), "2026-12-31T23:59:00.000Z"); // qua năm
  assert.equal(vnLocalToIso("2026-09-22T10:05:30"), "2026-09-22T03:05:30.000Z"); // trình duyệt có thể kèm giây
});

test("vnLocalToIso: sai khuôn dạng hoặc không đúng lịch/giờ → null", () => {
  for (const bad of ["", "2026-09-22", "2026-09-22 10:05", "2026-02-30T10:00", "2026-09-22T24:00", "2026-09-22T10:60", "2026-13-01T10:00", "abc"]) assert.equal(vnLocalToIso(bad), null, bad);
});
