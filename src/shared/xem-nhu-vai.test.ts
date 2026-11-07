import { test } from "node:test";
import assert from "node:assert/strict";
import { HAN_XEM_NHU_VAI_PHUT, VAI_CHON_DUOC, laToanQuyenThat, laVaiChonDuoc, daHetHan, quyenHieuLuc, quyenThat } from "./xem-nhu-vai.ts";
import { readFileSync } from "node:fs";

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

test("quyenHieuLuc: đóng vai Quản lý bán hàng thì kèm Bán hàng (ADR-0169 Đ1); mã khác vẫn một mã", () => {
  assert.deepEqual(quyenHieuLuc(["SUPER_ADMIN"], "SALES_MANAGER"), ["SALES_MANAGER", "SALES"]);
  for (const ma of VAI_CHON_DUOC.filter((m) => m !== "SALES_MANAGER")) assert.deepEqual(quyenHieuLuc(["SUPER_ADMIN"], ma), [ma]);
});

test("quyenThat: có realPermissions thì lấy nó, không thì lấy permissions", () => {
  assert.deepEqual(quyenThat({ permissions: ["SALES"], realPermissions: ["SUPER_ADMIN"] }), ["SUPER_ADMIN"]);
  assert.deepEqual(quyenThat({ permissions: ["SALES"] }), ["SALES"]);
});

test("laToanQuyenThat: xét quyền THẬT, không xét bộ hiệu lực", () => {
  assert.equal(laToanQuyenThat({ permissions: ["SUPER_ADMIN"] }), true);
  assert.equal(laToanQuyenThat({ permissions: ["SALES"], realPermissions: ["SUPER_ADMIN"] }), true); // đang đóng Bán hàng vẫn thoát được
  assert.equal(laToanQuyenThat({ permissions: ["ADMIN"] }), false);
  assert.equal(laToanQuyenThat({ permissions: ["SUPER_ADMIN"], realPermissions: ["ADMIN"] }), false); // bộ hiệu lực có SUPER_ADMIN cũng không tính
});

test("cả hai route bật / thoát đòi laToanQuyenThat bên cạnh ô settings.ops (không phụ thuộc một ô của bảng quyền)", () => {
  const src = readFileSync(new URL("../modules/accounts/index.ts", import.meta.url), "utf8");
  for (const m of ["POST", "DELETE"]) {
    const dau = src.indexOf(`route("${m}", "/api/auth/xem-nhu-vai"`);
    assert.ok(dau >= 0, `không thấy route ${m}`);
    const than = src.slice(dau, src.indexOf("\n    }),", dau));
    assert.match(than, /can\(\{ id: ctx\.staff\.id, permissions: \[\.\.\.quyenThat\(ctx\.staff\)\] \}, "settings\.ops"\) \|\| !laToanQuyenThat\(ctx\.staff\)\) return NOT_ACTING_ROLE\(\)/, m);
  }
});

test("daHetHan: last_seen_at ở TƯƠNG LAI (đồng hồ lệch) thì chưa hết hạn — hành vi hiện tại, được chấp nhận vì `now` luôn lấy từ máy chủ", () => {
  const now = Date.parse("2026-11-07T01:00:00.000Z");
  assert.equal(daHetHan("2026-11-07T05:00:00.000Z", now), false);
});
