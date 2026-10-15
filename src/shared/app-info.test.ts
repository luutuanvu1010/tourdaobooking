import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { APP_NAME, APP_RELEASE_DATE, APP_VERSION, formatLongDate, formatReleaseLine } from "./app-info.ts";
import { isISODate } from "./vn-date.ts";
import { CHANGELOG } from "./changelog.ts";

test("số phiên bản và ngày phát hành DẪN XUẤT từ mục đầu của nhật ký (một nguồn)", () => {
  assert.equal(APP_NAME, "Island Booking System");
  assert.equal(APP_VERSION, CHANGELOG[0]?.version);
  assert.equal(APP_RELEASE_DATE, CHANGELOG[0]?.date);
  assert.ok(isISODate(APP_RELEASE_DATE));
});

test("APP_NAME trùng tên ứng dụng khai ở manifest (nguồn khai của tên app)", () => {
  const manifest = JSON.parse(readFileSync(new URL("../../public/manifest.webmanifest", import.meta.url), "utf8")) as { name: string };
  assert.equal(APP_NAME, manifest.name);
});

test("formatReleaseLine: dòng phiên bản của bản mới nhất", () => {
  assert.equal(formatReleaseLine(), "Phiên bản 1.97 · ngày 15 tháng 10 năm 2026");
});

test("formatReleaseLine: nhận số phiên bản và ngày khác (kể cả số 1 chữ số và 2 chữ số)", () => {
  assert.equal(formatReleaseLine("1.1", "2027-01-05"), "Phiên bản 1.1 · ngày 5 tháng 1 năm 2027");
  assert.equal(formatReleaseLine("2.0", "2026-12-31"), "Phiên bản 2.0 · ngày 31 tháng 12 năm 2026");
});

test("formatLongDate: ngày và tháng không đệm số 0, không lệch múi giờ", () => {
  assert.equal(formatLongDate("2026-09-21"), "21 tháng 9 năm 2026");
  assert.equal(formatLongDate("2026-01-05"), "5 tháng 1 năm 2026", "tháng 1 chữ số, ngày 1 chữ số");
  assert.equal(formatLongDate("2026-10-01"), "1 tháng 10 năm 2026", "tháng 2 chữ số, ngày 1 chữ số");
  assert.equal(formatLongDate("2028-02-29"), "29 tháng 2 năm 2028", "năm nhuận");
  assert.equal(formatLongDate("2026-12-31"), "31 tháng 12 năm 2026");
});

test("formatLongDate: ngày sai khuôn dạng hoặc sai lịch thì báo lỗi, không đoán", () => {
  for (const bad of ["2026-02-30", "2026-9-21", "21/09/2026", "", "2026-13-01"]) assert.throws(() => formatLongDate(bad), /ngày/i, bad);
});
