// Luật thuần của khu vực đón (ADR-0147 Đ1; kế hoạch Phí đưa đón Đợt A, Task 2).
import { test } from "node:test";
import assert from "node:assert/strict";
import { kiemThanVungSua, kiemThanVungTao, MA_NGOAI_VUNG, MA_VUNG_RE } from "./vung-rules.ts";
import { validateLocationUpdate } from "./rules.ts";

test("vung-rules: tạo — mã chữ thường hoặc tên trống bị từ chối; hợp lệ thì chuẩn hoá tên", () => {
  assert.equal(kiemThanVungTao({ code: "bac", name: "Bắc", sortOrder: 1 }).ok, false);
  assert.equal(kiemThanVungTao({ code: "BAC", name: "  ", sortOrder: 1 }).ok, false);
  assert.equal(kiemThanVungTao(null).ok, false);
  assert.deepEqual(kiemThanVungTao({ code: "BAC", name: " Bắc   Nha Trang ", sortOrder: 2 }), { ok: true, value: { code: "BAC", name: "Bắc Nha Trang", sortOrder: 2 } });
  assert.deepEqual(kiemThanVungTao({ code: "BAC", name: "Bắc" }), { ok: true, value: { code: "BAC", name: "Bắc", sortOrder: 0 } });
  assert.equal(kiemThanVungTao({ code: "BAC", name: "Bắc", sortOrder: -1 }).ok, false);
  assert.ok(MA_VUNG_RE.test(MA_NGOAI_VUNG));
});

test("vung-rules: sửa — thiếu expectedUpdatedAt hoặc active sai kiểu thì lỗi", () => {
  assert.equal(kiemThanVungSua({ name: "Bắc", sortOrder: 1, active: true }).ok, false);
  assert.equal(kiemThanVungSua({ name: "Bắc", sortOrder: 1, active: "x", expectedUpdatedAt: "t" }).ok, false);
  assert.deepEqual(kiemThanVungSua({ name: " Bắc ", sortOrder: 1, active: false, expectedUpdatedAt: "t" }), { ok: true, value: { name: "Bắc", sortOrder: 1, active: false, expectedUpdatedAt: "t" } });
});

test("rules: validateLocationUpdate — zoneCode vắng thì không có khoá; null → null; mã hợp lệ → mã; mã sai → lỗi", () => {
  const goc = { name: "Quầy", locationTypeCode: "TICKET_COUNTER", active: true, expectedUpdatedAt: "x" };
  const v = validateLocationUpdate({ ...goc });
  assert.ok(v.ok && !("zoneCode" in v.value));
  const n = validateLocationUpdate({ ...goc, zoneCode: null });
  assert.ok(n.ok && n.value.zoneCode === null);
  const m = validateLocationUpdate({ ...goc, zoneCode: "BAC" });
  assert.ok(m.ok && m.value.zoneCode === "BAC");
  for (const sai of ["x y", "bac", "", 5, true]) assert.equal(validateLocationUpdate({ ...goc, zoneCode: sai }).ok, false, JSON.stringify(sai));
});
