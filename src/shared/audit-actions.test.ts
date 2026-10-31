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

test("Mã định danh 5.26: đổi tên và sửa ghi chú loại đối tác — nhóm 'ledger', nhãn tiếng Việt, hành động thương mại (Đối tác không thấy)", () => {
  assert.deepEqual({ ...AUDIT_ACTIONS.prc_partner_type_renamed }, { label: "Đổi tên loại đối tác", group: "ledger" });
  assert.deepEqual({ ...AUDIT_ACTIONS.prc_partner_type_note }, { label: "Sửa ghi chú loại đối tác", group: "ledger" });
  for (const a of ["prc_partner_type_renamed", "prc_partner_type_note"]) assert.equal(laHanhDongThuongMai(a), true, a);
});

test("ADR-0117 lần 2: năm hành động mức TA (thêm, tắt, bật lại, gắn loại, kết thúc gắn) nhóm 'ledger', có nhãn tiếng Việt, và là hành động thương mại (Đối tác không thấy)", () => {
  assert.deepEqual({ ...AUDIT_ACTIONS.prc_rate_tier_added }, { label: "Thêm cấp đại lý", group: "ledger" });
  assert.deepEqual({ ...AUDIT_ACTIONS.prc_rate_tier_off }, { label: "Khoá cấp đại lý", group: "ledger" });
  assert.deepEqual({ ...AUDIT_ACTIONS.prc_rate_tier_on }, { label: "Mở lại cấp đại lý", group: "ledger" });
  assert.deepEqual({ ...AUDIT_ACTIONS.prc_role_tier_set }, { label: "Áp dụng cấp đại lý cho loại", group: "ledger" });
  assert.deepEqual({ ...AUDIT_ACTIONS.prc_role_tier_closed }, { label: "Ngừng áp dụng cấp đại lý cho loại", group: "ledger" });
  for (const a of ["prc_rate_tier_added", "prc_rate_tier_off", "prc_rate_tier_on", "prc_role_tier_set", "prc_role_tier_closed"]) assert.equal(laHanhDongThuongMai(a), true, a);
});

test("Mã định danh 5.26: hành động đổi tên / sửa ghi chú cấp đại lý nhóm 'ledger', có nhãn, là hành động thương mại", () => {
  assert.deepEqual({ ...AUDIT_ACTIONS.prc_rate_tier_renamed }, { label: "Đổi tên cấp đại lý", group: "ledger" });
  assert.deepEqual({ ...AUDIT_ACTIONS.prc_rate_tier_note }, { label: "Sửa ghi chú cấp đại lý", group: "ledger" });
  for (const a of ["prc_rate_tier_renamed", "prc_rate_tier_note"]) assert.equal(laHanhDongThuongMai(a), true, a);
});

test("ADR-0030 điều 1 (nút Từ chối): hành động 'order_handler_refused' nhóm 'order', nhãn «Trả đơn (Từ chối)»", () => {
  assert.deepEqual({ ...AUDIT_ACTIONS.order_handler_refused }, { label: "Trả đơn (Từ chối)", group: "order" });
});
