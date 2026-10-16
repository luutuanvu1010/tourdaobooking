import { test } from "node:test";
import assert from "node:assert/strict";
import { AUDIT_ACTIONS, AUDIT_GROUPS, isAuditAction, laHanhDongThuongMai } from "./audit-actions.ts";

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

test("ADR-0104 Đ2.9: hành động 'máy cập nhật chuyến theo đơn' (trip_order_synced) thuộc nhóm 'Điều phối xe' (trip), có nhãn", () => {
  assert.deepEqual({ ...AUDIT_ACTIONS.trip_order_synced }, { label: "Máy cập nhật chuyến theo đơn", group: "trip" });
});
test("ADR-0050 VK1-B: hành động 'cập nhật điểm theo đơn' (trip_stops_synced) thuộc nhóm 'Điều phối xe' (trip), có nhãn", () => {
  assert.deepEqual({ ...AUDIT_ACTIONS.trip_stops_synced }, { label: "Cập nhật điểm theo đơn", group: "trip" });
});

test("ADR-0052 D5 (Đợt 5): văn phòng thêm điểm / báo huỷ khi xe đang chạy — hai hành động nhóm 'Điều phối xe', có nhãn", () => {
  assert.deepEqual({ ...AUDIT_ACTIONS.trip_stop_added_running }, { label: "Thêm điểm khi xe đang chạy", group: "trip" });
  assert.deepEqual({ ...AUDIT_ACTIONS.trip_allocation_office_cancelled }, { label: "Văn phòng báo huỷ khách", group: "trip" });
});

test("ADR-0117 lần 1: ba hành động loại đối tác (thêm, tắt, bật lại) nhóm 'ledger', có nhãn tiếng Việt, và là hành động thương mại (Đối tác không thấy)", () => {
  assert.deepEqual({ ...AUDIT_ACTIONS.prc_partner_type_added }, { label: "Thêm loại đối tác", group: "ledger" });
  assert.deepEqual({ ...AUDIT_ACTIONS.prc_partner_type_off }, { label: "Tắt loại đối tác", group: "ledger" });
  assert.deepEqual({ ...AUDIT_ACTIONS.prc_partner_type_on }, { label: "Bật lại loại đối tác", group: "ledger" });
  for (const a of ["prc_partner_type_added", "prc_partner_type_off", "prc_partner_type_on"]) assert.equal(laHanhDongThuongMai(a), true, a);
});

test("ADR-0117 lần 2: năm hành động mức TA (thêm, tắt, bật lại, gắn loại, kết thúc gắn) nhóm 'ledger', có nhãn tiếng Việt, và là hành động thương mại (Đối tác không thấy)", () => {
  assert.deepEqual({ ...AUDIT_ACTIONS.prc_rate_tier_added }, { label: "Thêm mức TA", group: "ledger" });
  assert.deepEqual({ ...AUDIT_ACTIONS.prc_rate_tier_off }, { label: "Tắt mức TA", group: "ledger" });
  assert.deepEqual({ ...AUDIT_ACTIONS.prc_rate_tier_on }, { label: "Bật lại mức TA", group: "ledger" });
  assert.deepEqual({ ...AUDIT_ACTIONS.prc_role_tier_set }, { label: "Gắn loại đối tác vào mức TA", group: "ledger" });
  assert.deepEqual({ ...AUDIT_ACTIONS.prc_role_tier_closed }, { label: "Kết thúc gắn loại đối tác với mức TA", group: "ledger" });
  for (const a of ["prc_rate_tier_added", "prc_rate_tier_off", "prc_rate_tier_on", "prc_role_tier_set", "prc_role_tier_closed"]) assert.equal(laHanhDongThuongMai(a), true, a);
});
