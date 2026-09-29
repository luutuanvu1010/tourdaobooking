import { test } from "node:test";
import assert from "node:assert/strict";
import { AUDIT_ACTIONS, AUDIT_GROUPS, isAuditAction } from "./audit-actions.ts";

test("mọi hành động có nhãn tiếng Việt và thuộc một nhóm đã khai", () => {
  for (const [code, a] of Object.entries(AUDIT_ACTIONS)) {
    assert.match(code, /^[a-z_]+$/, code);
    assert.ok(a.label.trim().length > 0, `${code} thiếu nhãn`);
    assert.ok(Object.hasOwn(AUDIT_GROUPS, a.group), `${code}: nhóm lạ ${a.group}`);
  }
  assert.equal(new Set(Object.values(AUDIT_ACTIONS).map((a) => a.label)).size, Object.keys(AUDIT_ACTIONS).length, "nhãn không trùng");
});

test("isAuditAction chỉ nhận mã đã khai (kể cả không nhận thuộc tính kế thừa)", () => {
  assert.ok(isAuditAction("created"));
  assert.ok(isAuditAction("catalog_unhidden"));
  assert.ok(!isAuditAction("hack"));
  assert.ok(!isAuditAction("toString"));
  assert.ok(!isAuditAction(undefined));
});

test("ADR-0050 VK1-B: hành động 'cập nhật điểm theo đơn' (trip_stops_synced) thuộc nhóm 'Điều phối xe' (trip), có nhãn", () => {
  assert.deepEqual({ ...AUDIT_ACTIONS.trip_stops_synced }, { label: "Cập nhật điểm theo đơn", group: "trip" });
});
