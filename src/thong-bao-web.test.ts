// Logic hiển thị của chuông/hộp thông báo (web/thong-bao-logic.ts) — giờ Việt Nam, nhãn số "9+".
import { test } from "node:test";
import assert from "node:assert/strict";
import { gioVN, nhanSo, nhomTheoNgay, thoiGian } from "../web/thong-bao-logic.ts";

test("gioVN đổi ISO UTC sang giờ:phút Việt Nam", () => {
  assert.equal(gioVN("2026-09-27T01:30:00.000Z"), "08:30");
  assert.equal(gioVN("2026-09-26T17:30:00.000Z"), "00:30"); // sang ngày 27 giờ VN
});
test("nhanSo", () => { assert.equal(nhanSo(0), ""); assert.equal(nhanSo(3), "3"); assert.equal(nhanSo(9), "9"); assert.equal(nhanSo(10), "9+"); });
test("thoiGian theo giờ Việt Nam", () => {
  const now = "2026-09-27T02:40:00.000Z"; // 09:40 VN
  assert.equal(thoiGian("2026-09-27T02:35:00.000Z", now), "5 phút trước");
  assert.equal(thoiGian("2026-09-27T01:30:00.000Z", now), "08:30");
  assert.equal(thoiGian("2026-09-26T09:20:00.000Z", now), "Hôm qua 16:20");
  assert.equal(thoiGian("2026-09-24T03:00:00.000Z", now), "24/09 10:00");
  assert.equal(thoiGian("2026-09-26T17:30:00.000Z", now), "00:30"); // 00:30 VN ngày 27 = hôm nay
});
test("nhomTheoNgay giữ thứ tự, nhãn Hôm nay/Hôm qua/dd-mm", () => {
  const t = (luc: string) => ({ luc }) as never;
  const g = nhomTheoNgay([t("2026-09-27T01:00:00.000Z"), t("2026-09-26T09:00:00.000Z"), t("2026-09-24T09:00:00.000Z")], "2026-09-27T02:40:00.000Z");
  assert.deepEqual(g.map((x) => [x.nhan, x.tin.length]), [["Hôm nay", 1], ["Hôm qua", 1], ["24/09", 1]]);
});
