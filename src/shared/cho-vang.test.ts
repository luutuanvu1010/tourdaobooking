// C59 (đánh giá ERP 7/10): đồng hồ chờ ở điểm đón — CHỈ HIỂN THỊ "đã chờ bao lâu" để tài xế tự quyết bấm Vắng; không ngưỡng, không khoá nút (chưa có luật).
// Giờ tới của DTO tài xế chỉ có HH:MM nên đếm theo PHÚT.
import { test } from "node:test";
import assert from "node:assert/strict";
import { cauChoVang, daToiMs, phutDaCho } from "./cho-vang.ts";
import { vnLocalToMs } from "./vn-date.ts";

const ms = (ngay: string, gio: string, giay = 0) => vnLocalToMs(ngay, gio)! + giay * 1000;

test("daToiMs: giờ tới 'HH:MM' + ngày → mili-giây; thiếu → null", () => {
  assert.equal(daToiMs({ ngay: "2026-10-12", gio: "07:31" }), ms("2026-10-12", "07:31"));
  assert.equal(daToiMs(null), null);
});

test("phutDaCho: đếm số phút đã qua kể từ phút tới (cắt giây); không âm", () => {
  const tu = ms("2026-10-12", "07:31");
  assert.equal(phutDaCho(tu, ms("2026-10-12", "07:31", 59)), 0);
  assert.equal(phutDaCho(tu, ms("2026-10-12", "07:32", 0)), 1);
  assert.equal(phutDaCho(tu, ms("2026-10-12", "07:38", 30)), 7);
  assert.equal(phutDaCho(tu, ms("2026-10-12", "07:30")), 0, "đồng hồ máy chậm hơn giờ tới: không âm");
  assert.equal(phutDaCho(ms("2026-10-11", "23:55"), ms("2026-10-12", "00:05")), 10, "qua nửa đêm");
});

test("cauChoVang: 'Vừa tới' dưới 1 phút; 'Đã chờ N phút'; từ 60 phút đổi sang giờ + phút", () => {
  const tu = ms("2026-10-12", "07:31");
  assert.equal(cauChoVang(tu, ms("2026-10-12", "07:31", 30)), "Vừa tới");
  assert.equal(cauChoVang(tu, ms("2026-10-12", "07:32")), "Đã chờ 1 phút");
  assert.equal(cauChoVang(tu, ms("2026-10-12", "07:38")), "Đã chờ 7 phút");
  assert.equal(cauChoVang(tu, ms("2026-10-12", "08:31")), "Đã chờ 1 giờ");
  assert.equal(cauChoVang(tu, ms("2026-10-12", "08:36")), "Đã chờ 1 giờ 5 phút");
});
