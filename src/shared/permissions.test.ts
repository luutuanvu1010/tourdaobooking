import { test } from "node:test";
import assert from "node:assert/strict";
import { MATRIX, PERMISSION_CODES, can, canAccessOrders, hasPermission, isOffice, isPermissionCode, type OperationCode, type PermissionCode, type Scope } from "./permissions.ts";

// BẢN ĐỌC THỨ HAI của bảng ADR-0007 điều 1 SAU khi ADR-0009 đổi ba ô của SALES (order.modify, order.history.view, dispatch.assign: own → ownOrAssigned)
// và ADR-0014 thêm PARTNER/SUPER_ADMIN + bốn thao tác mới — viết lại độc lập từ tài liệu ADR, không suy ra từ MATRIX. Cột: SALES, ACCOUNTING, ADMIN, FIELD, PARTNER, SUPER_ADMIN.
// 3 dòng "feedback.*" là mở rộng của module Góp ý (spec 2026-09-21), không thuộc bảng ADR-0007 gốc.
const ADR: Record<string, [Scope, Scope, Scope, Scope, Scope, Scope]> = {
  "order.view": ["any", "any", "any", "none", "own", "any"],
  "money.view": ["any", "any", "any", "none", "own", "any"],
  "order.history.view": ["ownOrAssigned", "any", "any", "none", "own", "any"],
  "contact.view": ["any", "any", "any", "assigned", "ownOrAssigned", "any"],
  "order.create": ["any", "none", "any", "none", "any", "any"],
  "order.modify": ["ownOrAssigned", "none", "any", "none", "own", "any"],
  "order.trip.edit": ["ownOrAssigned", "none", "any", "none", "none", "any"],
  "task.progress": ["none", "none", "any", "assigned", "assigned", "any"],
  "order.money.edit": ["own", "any", "any", "assigned", "none", "any"], // ADR-0014 điều 6: FIELD đang phụ trách (đổi từ ADR-0009 điều 1 "KHÔNG đổi")
  "order.cancel": ["none", "none", "none", "assigned", "none", "any"], // ADR-0014 điều 11: thao tác MỚI
  "dispatch.assign": ["ownOrAssigned", "none", "any", "none", "none", "any"],
  "dispatch.claim": ["any", "none", "any", "none", "none", "any"], // ADR-0009 điều 2: nhận phụ trách đơn chưa có người (điều kiện do dịch vụ của dispatch kiểm, không phải ô ma trận)
  "dispatch.guides.view": ["none", "none", "none", "none", "any", "any"], // ADR-0014 điều 9: thao tác MỚI
  "dispatch.request": ["none", "none", "none", "none", "any", "any"], // ADR-0014 điều 10: thao tác MỚI
  "payment.receive": ["own", "any", "any", "none", "none", "any"],
  "payment.refund": ["none", "any", "any", "none", "none", "any"],
  "invoice.request": ["own", "any", "any", "none", "none", "any"],
  "invoice.issue": ["none", "any", "any", "none", "none", "any"],
  "party.view": ["any", "any", "any", "none", "none", "any"],
  "party.write": ["any", "any", "any", "none", "none", "any"],
  "admin.manage": ["none", "none", "any", "none", "none", "any"],
  "admin.manage.superadmin": ["none", "none", "none", "none", "none", "any"], // ADR-0014 điều 2/8: thao tác MỚI
  "feedback.submit": ["any", "any", "any", "any", "any", "any"],
  "feedback.view": ["own", "own", "any", "own", "own", "any"],
  "feedback.triage": ["none", "none", "any", "none", "none", "any"],
};
const ORDER: readonly PermissionCode[] = ["SALES", "ACCOUNTING", "ADMIN", "FIELD", "PARTNER", "SUPER_ADMIN"];
const OPS = Object.keys(ADR) as OperationCode[];

test("bản đồ quyền khớp TỪNG Ô của ADR-0007 + ADR-0009 + ADR-0014 + Góp ý (25 thao tác × 6 quyền)", () => {
  assert.deepEqual([...PERMISSION_CODES], [...ORDER]);
  assert.deepEqual(Object.keys(MATRIX).sort(), Object.keys(ADR).sort(), "MATRIX và ADR phải có cùng danh sách thao tác");
  for (const op of OPS) ORDER.forEach((p, i) => assert.equal(MATRIX[op][p], ADR[op]![i], `${op} × ${p}`));
});

test("ADR-0014 điều 2: SUPER_ADMIN = any ở MỌI thao tác, không ngoại lệ", () => {
  const who = { id: "sa", permissions: ["SUPER_ADMIN"] as const };
  for (const op of Object.keys(MATRIX) as OperationCode[]) assert.equal(can(who, op, { ownerId: "x" }), true, `SUPER_ADMIN × ${op}`);
});

test("ADR-0014: PARTNER chỉ thấy/sửa đơn của mình, không tự nhận việc, không đụng danh bạ/quản trị", () => {
  const partner = { id: "p1", permissions: ["PARTNER"] as const };
  assert.equal(can(partner, "order.view", { ownerId: "p1" }), true);
  assert.equal(can(partner, "order.view", { ownerId: "other" }), false);
  assert.equal(can(partner, "order.view"), false, "không ngữ cảnh = không có gì để xem là của mình");
  assert.equal(can(partner, "order.create"), true);
  assert.equal(can(partner, "order.modify", { ownerId: "p1" }), true);
  assert.equal(can(partner, "order.modify", { ownerId: "other" }), false);
  assert.equal(can(partner, "dispatch.assign"), false);
  assert.equal(can(partner, "dispatch.claim"), false);
  assert.equal(can(partner, "order.money.edit", { ownerId: "p1" }), false);
  assert.equal(can(partner, "order.cancel", { ownerId: "p1", assigned: true }), false);
  assert.equal(can(partner, "party.view"), false);
  assert.equal(can(partner, "party.write"), false);
  assert.equal(can(partner, "admin.manage"), false);
  assert.equal(can(partner, "contact.view", { ownerId: "other", assigned: true }), true, "đơn đang phụ trách sau khi được duyệt xin nhận (điều 10)");
  assert.equal(can(partner, "task.progress", { assigned: true }), true);
  assert.equal(can(partner, "task.progress"), false);
});

test("ADR-0014 điều 6/11: FIELD được sửa tiền và huỷ đơn ĐANG PHỤ TRÁCH, không được lập/sửa/xác nhận đơn", () => {
  const field = { id: "f1", permissions: ["FIELD"] as const };
  assert.equal(can(field, "order.money.edit", { ownerId: "x", assigned: true }), true);
  assert.equal(can(field, "order.money.edit", { ownerId: "x", assigned: false }), false);
  assert.equal(can(field, "order.cancel", { ownerId: "x", assigned: true }), true);
  assert.equal(can(field, "order.cancel", { ownerId: "x", assigned: false }), false);
  assert.equal(can(field, "order.modify", { ownerId: "x", assigned: true }), false, "vẫn không tự xác nhận/sửa nháp — chỉ order.money.edit/order.cancel mở");
});

test("canAccessOrders: văn phòng và PARTNER dùng được route đơn; FIELD một mình thì không", () => {
  assert.equal(canAccessOrders({ id: "a", permissions: ["SALES"] }), true);
  assert.equal(canAccessOrders({ id: "a", permissions: ["ADMIN"] }), true);
  assert.equal(canAccessOrders({ id: "a", permissions: ["SUPER_ADMIN"] }), true);
  assert.equal(canAccessOrders({ id: "a", permissions: ["PARTNER"] }), true);
  assert.equal(canAccessOrders({ id: "a", permissions: ["FIELD"] }), false);
  assert.equal(canAccessOrders({ id: "a", permissions: [] }), false);
});

// Kết quả mong đợi của can() cho MỘT quyền, theo phạm vi và ngữ cảnh — bảng chân lý viết tay, không dùng lại logic của file nguồn.
const TRUTH: Record<Scope, { none: boolean; mine: boolean; theirs: boolean; assigned: boolean; mineAndAssigned: boolean }> = {
  //             không ctx  của mình  của người khác  được giao  cả hai
  none: { none: false, mine: false, theirs: false, assigned: false, mineAndAssigned: false },
  own: { none: false, mine: true, theirs: false, assigned: false, mineAndAssigned: true },
  assigned: { none: false, mine: false, theirs: false, assigned: true, mineAndAssigned: true },
  ownOrAssigned: { none: false, mine: true, theirs: false, assigned: true, mineAndAssigned: true },
  any: { none: true, mine: true, theirs: true, assigned: true, mineAndAssigned: true },
};

test("can(): mọi ô × mọi ngữ cảnh cho tài khoản một quyền", () => {
  for (const op of OPS) {
    ORDER.forEach((p, i) => {
      const scope = ADR[op]![i]!;
      const who = { id: "u1", permissions: [p] };
      assert.equal(can(who, op), TRUTH[scope].none, `${op} × ${p} không ctx`);
      assert.equal(can(who, op, { ownerId: "u1" }), TRUTH[scope].mine, `${op} × ${p} của mình`);
      assert.equal(can(who, op, { ownerId: "u2" }), TRUTH[scope].theirs, `${op} × ${p} của người khác`);
      assert.equal(can(who, op, { ownerId: "u2", assigned: true }), TRUTH[scope].assigned, `${op} × ${p} được giao`);
      assert.equal(can(who, op, { ownerId: "u1", assigned: true }), TRUTH[scope].mineAndAssigned, `${op} × ${p} của mình + được giao`);
    });
  }
});

test("ADR-0009: người được giao (assigned) sửa được đơn của người khác; người khác không; người lập vẫn được kể cả sau khi giao lại", () => {
  const sales = { id: "u1", permissions: ["SALES"] as const };
  for (const op of ["order.modify", "order.history.view", "dispatch.assign"] as OperationCode[]) {
    assert.equal(can(sales, op, { ownerId: "u2", assigned: true }), true, `${op}: người được giao (không phải người lập)`);
    assert.equal(can(sales, op, { ownerId: "u2", assigned: false }), false, `${op}: người khác, không được giao`);
    assert.equal(can(sales, op, { ownerId: "u2" }), false, `${op}: người khác, chưa biết có được giao không (mặc định từ chối)`);
    assert.equal(can(sales, op, { ownerId: "u1" }), true, `${op}: người lập`);
    assert.equal(can(sales, op, { ownerId: "u1", assigned: false }), true, `${op}: người lập đã giao lại cho người khác vẫn được (ADR-0009 hệ quả)`);
  }
  // Ba thao tác ADR-0009 KHÔNG đổi: sửa tiền/số khách/dịch vụ SAU xác nhận vẫn chỉ của người lập (N3, ADR-0007 điều 3).
  assert.equal(can(sales, "order.money.edit", { ownerId: "u2", assigned: true }), false, "được giao KHÔNG mở order.money.edit");
  assert.equal(can(sales, "order.money.edit", { ownerId: "u1" }), true);
  // Ô `none` không mở dù được giao: kế toán và người thực hiện không sửa đơn.
  for (const p of ["ACCOUNTING", "FIELD"] as const) {
    const who = { id: "u1", permissions: [p] as const };
    for (const op of ["order.modify", "dispatch.assign"] as OperationCode[]) assert.equal(can(who, op, { ownerId: "u2", assigned: true }), false, `${p} × ${op}`);
  }
});

test("ADR-0009: dispatch.claim — SALES và ADMIN nhận được không cần là chủ đơn/người được giao; ACCOUNTING và FIELD không", () => {
  assert.equal(can({ id: "u1", permissions: ["SALES"] }, "dispatch.claim"), true);
  assert.equal(can({ id: "u1", permissions: ["SALES"] }, "dispatch.claim", { ownerId: "u2" }), true);
  assert.equal(can({ id: "a", permissions: ["ADMIN"] }, "dispatch.claim"), true);
  for (const p of ["ACCOUNTING", "FIELD"] as const) {
    const who = { id: "u1", permissions: [p] as const };
    assert.equal(can(who, "dispatch.claim"), false, p);
    assert.equal(can(who, "dispatch.claim", { ownerId: "u1", assigned: true }), false, `${p} dù là chủ đơn/được giao`);
  }
});

test("nhiều quyền: hợp các ô (SALES + ACCOUNTING sửa tiền đơn người khác được, sửa đơn người khác thì không)", () => {
  const both = { id: "u1", permissions: ["SALES", "ACCOUNTING"] as const };
  assert.equal(can(both, "order.money.edit", { ownerId: "u2" }), true);
  assert.equal(can(both, "order.modify", { ownerId: "u2" }), false);
  assert.equal(can(both, "order.modify", { ownerId: "u1" }), true);
  const sf = { id: "u1", permissions: ["SALES", "FIELD"] as const };
  assert.equal(can(sf, "task.progress", { assigned: true }), true);
  assert.equal(can(sf, "task.progress"), false);
});

test("mặc định từ chối: không quyền, thao tác lạ, chủ đơn thiếu", () => {
  assert.equal(can({ id: "u1", permissions: [] }, "order.view"), false);
  assert.equal(can({ id: "u1", permissions: ["ADMIN"] }, "khong.co" as OperationCode), false);
  assert.equal(can({ id: "u1", permissions: ["SALES"] }, "order.modify", { ownerId: undefined }), false, "thiếu chủ đơn ≠ của mình");
  assert.equal(can({ id: "", permissions: ["SALES"] }, "order.modify", { ownerId: "" }), true, "so sánh id nguyên văn (id rỗng không tồn tại thật)");
});

// Bốn thao tác hẹp, cố ý KHÔNG mở cho ADMIN (ADR-0014): admin.manage.superadmin/order.cancel/dispatch.guides.view/dispatch.request
// chỉ dành cho SUPER_ADMIN hoặc PARTNER/FIELD theo đúng bảng — ADMIN vẫn làm được việc tương ứng qua đường khác (permissions route, order.modify, dispatch.assign).
const ADMIN_NONE_OPS: readonly OperationCode[] = ["admin.manage.superadmin", "order.cancel", "dispatch.guides.view", "dispatch.request"];

test("FIELD không xem đơn/tiền/nhật ký; ADMIN làm mọi thao tác của bản đồ TRỪ bốn thao tác hẹp cố ý không mở", () => {
  const field = { id: "f", permissions: ["FIELD"] as const };
  for (const op of ["order.view", "money.view", "order.history.view", "order.create", "order.modify", "party.view", "admin.manage"] as OperationCode[]) assert.equal(can(field, op, { ownerId: "x" }), false, op);
  const admin = { id: "a", permissions: ["ADMIN"] as const };
  for (const op of OPS) assert.equal(can(admin, op, { ownerId: "x" }), !ADMIN_NONE_OPS.includes(op), `ADMIN × ${op}`);
});

test("isOffice / hasPermission / isPermissionCode", () => {
  assert.equal(isOffice({ id: "a", permissions: ["FIELD"] }), false);
  assert.equal(isOffice({ id: "a", permissions: ["FIELD", "ACCOUNTING"] }), true);
  assert.equal(hasPermission({ permissions: ["ADMIN"] }, "ADMIN"), true);
  assert.equal(hasPermission({ permissions: ["SALES"] }, "ADMIN"), false);
  assert.equal(isPermissionCode("SALES"), true);
  assert.equal(isPermissionCode("sales"), false);
  assert.equal(isPermissionCode(1), false);
});
