import { test } from "node:test";
import assert from "node:assert/strict";
import { HAN_XEM_NHU_VAI_PHUT, VAI_CHON_DUOC, laVaiChonDuoc, daHetHan, quyenHieuLuc } from "./xem-nhu-vai.ts";

test("hạn xem như vai khác là 60 phút", () => {
  assert.equal(HAN_XEM_NHU_VAI_PHUT, 60);
});

test("VAI_CHON_DUOC có đúng 10 mã và không có SUPER_ADMIN", () => {
  assert.equal(VAI_CHON_DUOC.length, 10);
  assert.equal(new Set(VAI_CHON_DUOC).size, 10);
  assert.ok(!(VAI_CHON_DUOC as readonly string[]).includes("SUPER_ADMIN"));
});

test("laVaiChonDuoc", () => {
  assert.equal(laVaiChonDuoc("SUPER_ADMIN"), false);
  assert.equal(laVaiChonDuoc("SALES"), true);
  assert.equal(laVaiChonDuoc(5), false);
  assert.equal(laVaiChonDuoc(null), false);
  assert.equal(laVaiChonDuoc("khong-co"), false);
});

test("daHetHan: 59'59\" chưa hết, 60'01\" đã hết", () => {
  const t0 = Date.parse("2026-11-07T01:00:00.000Z");
  assert.equal(daHetHan("2026-11-07T01:00:00.000Z", t0 + (60 * 60 - 1) * 1000), false);
  assert.equal(daHetHan("2026-11-07T01:00:00.000Z", t0 + (60 * 60 + 1) * 1000), true);
});

test("quyenHieuLuc: đang xem như vai khác thì chỉ còn vai đó", () => {
  assert.deepEqual(quyenHieuLuc(["SUPER_ADMIN"], "ACCOUNTING"), ["ACCOUNTING"]);
});

test("quyenHieuLuc: không xem như ai thì giữ nguyên (và là bản sao)", () => {
  const real = ["SUPER_ADMIN", "ADMIN"] as const;
  const out = quyenHieuLuc(real, null);
  assert.deepEqual(out, ["SUPER_ADMIN", "ADMIN"]);
  assert.notEqual(out, real);
});

test("daHetHan: ngày hỏng hoặc rỗng thì coi là đã hết hạn", () => {
  const now = Date.parse("2026-11-07T01:00:00.000Z");
  assert.equal(daHetHan("hỏng", now), true);
  assert.equal(daHetHan("", now), true);
});

test("daHetHan: đúng 60'00\" thì chưa hết hạn", () => {
  const t0 = Date.parse("2026-11-07T01:00:00.000Z");
  assert.equal(daHetHan("2026-11-07T01:00:00.000Z", t0 + 60 * 60 * 1000), false);
});
