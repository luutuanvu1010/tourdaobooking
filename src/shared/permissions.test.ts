import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MATRIX, PERMISSION_CODES, can, canAccessOrders, hasPermission, isOffice, isPermissionCode, quyenHienThi, seesOnlyAssignedOrders, type OperationCode, type PermissionCode, type Scope,
} from "./permissions.ts";

// BẢN ĐỌC THỨ HAI của bảng ADR-0007 điều 1 SAU khi ADR-0009 đổi ba ô của SALES (order.modify, order.history.view, dispatch.assign: own → ownOrAssigned),
// ADR-0014 thêm PARTNER/SUPER_ADMIN + bốn thao tác mới, và ADR-0018 (giai đoạn 1) thêm cột INTERN TẠM HẸP — viết lại độc lập từ tài liệu ADR, không suy
// ra từ MATRIX. Cột: SALES, ACCOUNTING, ADMIN, FIELD, PARTNER, SUPER_ADMIN, INTERN, DRIVER, DRIVER_PARTNER.
// ADR-0040 D3 + Ruling R2 (điều phối 2026-09-28): cột thứ tám DRIVER (Tài xế) thêm CUỐI — lượt 1a mọi ô nghiệp vụ = none, trừ gửi/xem góp ý của mình.
// ADR-0048 D2 (accepted 2026-09-28): cột thứ chín DRIVER_PARTNER (Tài xế đối tác) thêm CUỐI — mọi ô nghiệp vụ = none, trừ gửi/xem góp ý của mình và xem
// giấy tờ của chính mình (số che). Mọi ô tiền (money.view, order.money.edit, payment.*, invoice.*) = none.
// 3 dòng "feedback.*" là mở rộng của module Góp ý (spec 2026-09-21), không thuộc bảng ADR-0007 gốc.
const ADR: Record<string, [Scope, Scope, Scope, Scope, Scope, Scope, Scope, Scope, Scope]> = {
  "order.view": ["any", "any", "any", "assigned", "own", "any", "own", "none", "none"], // ADR-0030 S23-1: FIELD chỉ đơn ĐANG phụ trách (thay ADR-0017 điều 1)
  "money.view": ["any", "any", "any", "assigned", "own", "any", "own", "none", "none"], // ADR-0030 S23-1/S23-5 (sửa ADR-0019 điều 3: FIELD assigned, không any)
  "order.history.view": ["ownOrAssigned", "any", "any", "assigned", "own", "any", "own", "none", "none"], // ADR-0030 S23-3: kể cả lịch sử đơn mình phụ trách
  "contact.view": ["any", "any", "any", "assigned", "ownOrAssigned", "any", "own", "none", "none"],
  "order.create": ["any", "none", "any", "none", "any", "any", "any", "none", "none"],
  "order.modify": ["ownOrAssigned", "none", "any", "none", "own", "any", "own", "none", "none"],
  "order.trip.edit": ["ownOrAssigned", "none", "any", "none", "none", "any", "none", "none", "none"],
  "order.leg.short_notice": ["none", "none", "any", "none", "none", "any", "none", "none", "none"], // ADR-0049 D3: ô MỚI — đặt gấp chặng dưới mốc 6 giờ; chỉ Quản trị, Toàn quyền
  "order.passenger.write": ["ownOrAssigned", "none", "any", "none", "own", "any", "own", "none", "none"], // ADR-0047 A2: ô MỚI — nhập/sửa (dòng mới)/huỷ dòng trong danh sách hành khách; bằng order.modify
  "task.progress": ["none", "none", "any", "assigned", "assigned", "any", "none", "none", "none"],
  "order.money.edit": ["own", "any", "any", "assigned", "none", "any", "none", "none", "none"], // ADR-0014 điều 6: FIELD đang phụ trách (đổi từ ADR-0009 điều 1 "KHÔNG đổi")
  "order.cancel": ["none", "none", "none", "assigned", "none", "any", "none", "none", "none"], // ADR-0014 điều 11: thao tác MỚI
  "dispatch.assign": ["ownOrAssigned", "none", "any", "none", "none", "any", "none", "none", "none"],
  "dispatch.claim": ["any", "none", "any", "any", "none", "any", "none", "none", "none"], // ADR-0009 điều 2: nhận phụ trách đơn chưa có người (điều kiện do dịch vụ của dispatch kiểm, không phải ô ma trận); ADR-0030 S20-6/S20-12: FIELD any
  "dispatch.guides.view": ["none", "none", "none", "none", "any", "any", "none", "none", "none"], // ADR-0014 điều 9: thao tác MỚI
  "payment.receive": ["own", "any", "any", "none", "none", "any", "none", "none", "none"],
  "payment.refund": ["none", "any", "any", "none", "none", "any", "none", "none", "none"],
  "invoice.request": ["own", "any", "any", "none", "none", "any", "none", "none", "none"],
  "invoice.issue": ["none", "any", "any", "none", "none", "any", "none", "none", "none"],
  "party.view": ["any", "any", "any", "none", "none", "any", "none", "none", "none"],
  "party.write": ["any", "any", "any", "none", "none", "any", "none", "none", "none"],
  "party.staff.write": ["none", "none", "any", "none", "none", "any", "none", "none", "none"], // ADR-0013
  "admin.manage": ["none", "none", "any", "none", "none", "any", "none", "none", "none"],
  "admin.manage.superadmin": ["none", "none", "none", "none", "none", "any", "none", "none", "none"], // ADR-0014 điều 2/8: thao tác MỚI
  "account.access.manage": ["none", "none", "any", "none", "none", "any", "none", "none", "none"], // ADR-0042: Quản trị lấy lại (cấp dưới)
  "staff.sheet.sync": ["none", "none", "none", "none", "none", "any", "none", "none", "none"], // ADR-0038 điều 6
  "audit.view": ["none", "none", "none", "none", "none", "any", "none", "none", "none"], // ADR-0038 điều 6
  "feedback.submit": ["any", "any", "any", "any", "any", "any", "any", "any", "any"],
  "feedback.view": ["own", "own", "own", "own", "own", "any", "own", "own", "own"], // ADR-0038: Quản trị any → own
  "feedback.triage": ["none", "none", "none", "none", "none", "any", "none", "none", "none"], // ADR-0038: Quản trị any → none
  "settings.ops": ["none", "none", "none", "none", "none", "any", "none", "none", "none"], // ADR-0019: chỉ Toàn quyền (chế độ bảo trì)
  "order.pool.view": ["none", "none", "none", "any", "none", "any", "none", "none", "none"], // ADR-0030 S23-1: thao tác MỚI — hàng chờ nhận (phần hẹp); Quản trị KHÔNG có (xem mọi đơn qua order.view)
  "notice.send": ["none", "none", "none", "none", "none", "any", "none", "none", "none"], // ADR-0034 điều 7: chỉ Toàn quyền gửi/thu hồi tin thủ công
  "company.legal.write": ["none", "none", "none", "none", "none", "any", "none", "none", "none"], // ADR-0038 điều 7 + ADR-0024 6.4: chỉ Toàn quyền sửa hồ sơ công ty chủ (và đổi công ty chủ — chủ trả lời 2026-09-28)
  "party.document.view": ["own", "own", "own", "own", "none", "any", "own", "own", "own"], // ADR-0040 D2 + R5 (chủ 28/9: "Mọi nhân viên"): giấy tờ của CHÍNH MÌNH, số che; Đối tác không
  "party.document.write": ["none", "none", "any", "none", "none", "any", "none", "none", "none"], // ADR-0040 D2: ghi giấy tờ của người + xem danh sách (số che) của người khác — Quản trị + Toàn quyền
  "party.document.reveal": ["none", "none", "any", "none", "none", "any", "none", "none", "none"], // ADR-0040 D2: "xem đủ số" — Quản trị + Toàn quyền; mỗi lần một dòng nhật ký không kèm số
  "vehicle.manage": ["none", "none", "any", "none", "none", "any", "none", "none", "none"], // ADR-0040 D1: xe, giấy tờ xe, danh sách sắp hết hạn — Quản trị + Toàn quyền (ADR-0038 điều 6)
};
const ORDER: readonly PermissionCode[] = ["SALES", "ACCOUNTING", "ADMIN", "FIELD", "PARTNER", "SUPER_ADMIN", "INTERN", "DRIVER", "DRIVER_PARTNER"];
const OPS = Object.keys(ADR) as OperationCode[];

test("bản đồ quyền khớp TỪNG Ô của ADR-0007 + ADR-0009 + ADR-0013 + ADR-0014 + ADR-0018 (giai đoạn 1) + Góp ý + ADR-0019 + ADR-0024 (T2b) + ADR-0030 + ADR-0034 + ADR-0040 + ADR-0047 + ADR-0048 + ADR-0049 (mọi thao tác × 9 quyền)", () => {
  for (const op of OPS) assert.equal(ADR[op]!.length, ORDER.length, `bảng ADR: hàng ${op} phải đủ ${ORDER.length} cột`);
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
  assert.equal(can(partner, "party.staff.write"), false);
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
  // ADR-0030 S23-1/S23-3 (thay ADR-0014 điều 6 "FIELD không xem đơn"): xem đơn, tiền, liên hệ, lịch sử của đơn ĐANG phụ trách — và CHỈ đơn đó.
  for (const op of ["order.view", "money.view", "contact.view", "order.history.view"] as OperationCode[]) {
    assert.equal(can(field, op, { ownerId: "x", assigned: true }), true, `${op}: đơn đang phụ trách`);
    assert.equal(can(field, op, { ownerId: "x", assigned: false }), false, `${op}: đơn không phụ trách`);
    assert.equal(can(field, op), false, `${op}: không ngữ cảnh (= mọi đơn) → không`);
  }
  assert.equal(can(field, "order.create"), false, "vẫn không lập đơn");
  assert.equal(can(field, "order.pool.view"), true, "hàng chờ nhận (phần hẹp) — ADR-0030 S23-1");
});

test("canAccessOrders: văn phòng, PARTNER, INTERN và (ADR-0030 S23-5) FIELD dùng được route đơn; không quyền nào thì không", () => {
  assert.equal(canAccessOrders({ id: "a", permissions: ["SALES"] }), true);
  assert.equal(canAccessOrders({ id: "a", permissions: ["ADMIN"] }), true);
  assert.equal(canAccessOrders({ id: "a", permissions: ["SUPER_ADMIN"] }), true);
  assert.equal(canAccessOrders({ id: "a", permissions: ["PARTNER"] }), true);
  assert.equal(canAccessOrders({ id: "a", permissions: ["INTERN"] }), true);
  assert.equal(canAccessOrders({ id: "a", permissions: ["FIELD"] }), true, "ADR-0030 S23-5: hướng dẫn viên vào cổng orders (mỗi route vẫn tự hỏi can())");
  assert.equal(canAccessOrders({ id: "a", permissions: [] }), false);
});

test("ADR-0018 giai đoạn 1: INTERN lập đơn, xem/sửa đơn của mình; không thấy đơn người khác, không làm người phụ trách, không quản trị", () => {
  const intern = { id: "i1", permissions: ["INTERN"] as const };
  assert.equal(isOffice(intern), false, "không phải văn phòng → dùng trang Đơn hàng như Đối tác");
  assert.equal(can(intern, "order.create"), true);
  assert.equal(can(intern, "order.view", { ownerId: "i1" }), true);
  assert.equal(can(intern, "order.view", { ownerId: "other" }), false);
  assert.equal(can(intern, "order.modify", { ownerId: "i1" }), true);
  assert.equal(can(intern, "order.modify", { ownerId: "other", assigned: true }), false, "chưa là cấp người phụ trách (giai đoạn 2 mở)");
  assert.equal(can(intern, "dispatch.claim"), false);
  assert.equal(can(intern, "party.view"), false);
  assert.equal(can(intern, "admin.manage"), false);
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

test("ADR-0009 + ADR-0030 S20-6: dispatch.claim — SALES, ADMIN và FIELD nhận được không cần là chủ đơn/người được giao; ACCOUNTING không", () => {
  assert.equal(can({ id: "u1", permissions: ["SALES"] }, "dispatch.claim"), true);
  assert.equal(can({ id: "u1", permissions: ["SALES"] }, "dispatch.claim", { ownerId: "u2" }), true);
  assert.equal(can({ id: "a", permissions: ["ADMIN"] }, "dispatch.claim"), true);
  assert.equal(can({ id: "f", permissions: ["FIELD"] }, "dispatch.claim"), true, "ADR-0030 S20-6/S20-12: hướng dẫn viên tự nhận đơn chờ nhận");
  assert.equal(can({ id: "f", permissions: ["FIELD"] }, "dispatch.assign", { ownerId: "f" }), false, "nhưng vẫn KHÔNG giao cho người khác");
  for (const p of ["ACCOUNTING"] as const) {
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

// Mười hai thao tác hẹp, cố ý KHÔNG mở cho ADMIN (ADR-0014, ADR-0019, ADR-0024, ADR-0030, ADR-0034, ADR-0038): admin.manage.superadmin/order.cancel/
// dispatch.guides.view/settings.ops/order.pool.view/notice.send/feedback.view/feedback.triage/staff.sheet.sync/audit.view/company.legal.write (dispatch.request
// đã bỏ khỏi bản đồ, ADR-0019) chỉ dành cho SUPER_ADMIN hoặc PARTNER/FIELD theo đúng bảng (settings.ops: chỉ Toàn quyền — bật/tắt bảo trì; notice.send: chỉ
// Toàn quyền gửi/thu hồi tin thủ công, ADR-0034 điều 7) — ADMIN vẫn làm được việc tương ứng qua đường khác (permissions route, order.modify, dispatch.assign).
// order.pool.view (ADR-0030 S23-1, quyết định "Quản trị không có ô này"): Quản trị đã thấy ĐỦ mọi đơn qua order.view, không cần phần hẹp của hàng chờ.
// ADR-0038: thêm feedback.view (own — đơn của người khác → không) và feedback.triage (none); điều 6: staff.sheet.sync, audit.view (account.access.manage:
// Quản trị lấy lại theo ADR-0042 nên không còn ở đây).
// ADR-0038 điều 7 + ADR-0024 6.4 (T2b): company.legal.write — chỉ Toàn quyền sửa hồ sơ công ty chủ và đổi công ty chủ.
// ADR-0040 D2: party.document.view — ô `own` của Quản trị (giấy tờ của chính mình); Quản trị xem giấy tờ NGƯỜI KHÁC qua party.document.write.
const ADMIN_NONE_OPS: readonly OperationCode[] = [
  "admin.manage.superadmin", "order.cancel", "dispatch.guides.view", "settings.ops", "order.pool.view",
  "notice.send", "feedback.view", "feedback.triage", "staff.sheet.sync", "audit.view", "company.legal.write", "party.document.view",
];

test("FIELD không xem đơn/tiền/nhật ký của đơn KHÔNG được giao; ADMIN làm mọi thao tác của bản đồ TRỪ mười hai thao tác hẹp cố ý không mở", () => {
  const field = { id: "f", permissions: ["FIELD"] as const };
  for (const op of ["order.view", "money.view", "order.history.view", "order.create", "order.modify", "party.view", "party.staff.write", "admin.manage"] as OperationCode[]) assert.equal(can(field, op, { ownerId: "x" }), false, op);
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

// Khoá GIÁ TRỊ (ADR-0033): "được lập đơn ⇒ được xem giá bán lẻ" — điều kiện để `GET /api/catalog/for-order` (chốt chặn `can(order.create)`) không
// 403 oan ở lời hỏi `money.view` { ownerId: staff.id } ngay sau đó (người lập đơn cần giá bán lẻ để chọn dịch vụ). KHÔNG phải phép kiểm tương đương
// lúc chạy: sửa cả hai cột cho khớp nhau thì bài này vẫn xanh — xem giới hạn ở docs/SO-HANG-RAO.md.
test("ADR-0033: mọi mã quyền có order.create ≠ none thì money.view ≠ none (khoá cho GET /api/catalog/for-order)", () => {
  for (const p of PERMISSION_CODES) {
    if (MATRIX["order.create"][p] !== "none") assert.notEqual(MATRIX["money.view"][p], "none", `${p}: order.create ≠ none nhưng money.view = none`);
  }
});

// Khoá GIÁ TRỊ (ADR-0033): "được sửa đơn ⇒ được lập đơn" — `web/order-form.ts` chỉ nạp danh mục khi `can(staff, "order.create")`
// (`if (can(staff, "order.create")) await loadCatalog()`), nên người có `order.modify` mà không có `order.create` sẽ mở form SỬA đơn mà mất danh mục.
// Cũng chỉ khoá giá trị bảng, không phải phép kiểm lúc chạy.
test("ADR-0033: mọi mã quyền có order.modify ≠ none thì có order.create ≠ none (form lập/sửa đơn chỉ nạp danh mục cho người lập đơn)", () => {
  for (const p of PERMISSION_CODES) {
    if (MATRIX["order.modify"][p] !== "none") assert.notEqual(MATRIX["order.create"][p], "none", `${p}: order.modify ≠ none nhưng order.create = none`);
  }
});

// ADR-0030 S23-4 (Review Focus 2): chi tiết đơn không được xem trả 404 (không phải 403) CHỈ cho tài khoản mà mọi ô `order.view` của nó là `none` hoặc
// `assigned` (và có ít nhất một `assigned`) — hôm nay đúng BỐN tập: chỉ-FIELD, FIELD+DRIVER, FIELD+DRIVER_PARTNER, FIELD+DRIVER+DRIVER_PARTNER. Hai tập
// sau BẤT HỢP LỆ về dữ liệu (LC-1b, ADR-0048: tài khoản giữ DRIVER_PARTNER không giữ quyền nào khác — trigger + lời kiểm máy chủ) nhưng hàm thuần không
// biết luật đó: chỉ đọc MATRIX, nơi order.view của DRIVER_PARTNER là none. Đối tác/Thực tập (own) mở đơn người khác vẫn 403.
test("seesOnlyAssignedOrders: trên cả 512 tập con quyền — đúng bằng định nghĩa từ MATRIX, và hôm nay CHỈ bốn tập có FIELD, không mã 'mọi đơn/của mình' là đúng", () => {
  let count = 0;
  for (let mask = 0; mask < 1 << PERMISSION_CODES.length; mask++) {
    const permissions = PERMISSION_CODES.filter((_, i) => mask & (1 << i));
    const who = { id: "u1", permissions };
    const cells = permissions.map((p) => MATRIX["order.view"][p]);
    const definition = cells.some((c) => c === "assigned") && cells.every((c) => c === "none" || c === "assigned");
    assert.equal(seesOnlyAssignedOrders(who), definition, `định nghĩa lệch: ${permissions.join("+") || "(không quyền)"}`);
    // Hướng dẫn viên kiêm Tài xế: order.view của DRIVER là none (ADR-0040 D3) nên vẫn chỉ xem đơn mình phụ trách.
    // Tài xế đối tác (ADR-0048): order.view của DRIVER_PARTNER cũng none — hai tập có nó là ảnh chụp của hàm thuần, KHÔNG phải tài khoản hợp lệ (LC-1b).
    const ANH_CHUP = ["FIELD", "FIELD+DRIVER", "FIELD+DRIVER_PARTNER", "FIELD+DRIVER+DRIVER_PARTNER"];
    assert.equal(seesOnlyAssignedOrders(who), ANH_CHUP.includes(permissions.join("+")), `ảnh chụp hôm nay lệch: ${permissions.join("+") || "(không quyền)"}`);
    count++;
  }
  assert.equal(count, 512);
});

// ADR-0040 D3 + Ruling R2 (điều phối 2026-09-28): cột Tài xế (DRIVER) — lượt 1a MỌI ô nghiệp vụ = không. Ngoại lệ có tên: gửi/xem góp ý của mình
// (ADR-0038, như mọi tài khoản) và xem giấy tờ của chính mình (ô thêm ở Task A7). Liệt kê TỪNG ô, không suy từ MATRIX: thêm ô mới mà quên cột
// DRIVER thì đỏ ở đây — buộc người thêm QUYẾT giá trị cho tài xế (khuôn bài ghim hàng Đối tác, src/modules/orders/xem-don-theo-quyen.test.ts).
test("ADR-0040 D3: MỌI ô của Tài xế (DRIVER) — ghim nguyên dòng", () => {
  const DRIVER_ROW: Record<string, Scope> = {
    "order.view": "none", "money.view": "none", "order.history.view": "none", "contact.view": "none", "order.create": "none", "order.modify": "none",
    "order.trip.edit": "none", "task.progress": "none", "order.money.edit": "none", "order.cancel": "none", "dispatch.assign": "none", "dispatch.claim": "none",
    "order.passenger.write": "none", // ADR-0047 A2: tài xế KHÔNG đi qua ô này (đường ghi của tài xế, nếu có, do ADR lượt 2 quyết)
    "order.leg.short_notice": "none", // ADR-0049 D3: đặt gấp chỉ Quản trị, Toàn quyền
    "dispatch.guides.view": "none", "payment.receive": "none", "payment.refund": "none", "invoice.request": "none", "invoice.issue": "none",
    "party.view": "none", "party.write": "none", "party.staff.write": "none", "admin.manage": "none", "admin.manage.superadmin": "none",
    "account.access.manage": "none", "staff.sheet.sync": "none", "audit.view": "none",
    "feedback.submit": "any", "feedback.view": "own", // ngoại lệ có tên (Ruling R2)
    "feedback.triage": "none", "settings.ops": "none", "order.pool.view": "none", "notice.send": "none", "company.legal.write": "none",
    "party.document.view": "own", // ngoại lệ có tên (Ruling R2, R5): xem giấy tờ của CHÍNH MÌNH, số che
    "party.document.write": "none", "party.document.reveal": "none", "vehicle.manage": "none",
  };
  assert.deepEqual(Object.fromEntries((Object.keys(MATRIX) as OperationCode[]).map((op) => [op, MATRIX[op].DRIVER])), DRIVER_ROW);
});

// ADR-0048 D2 (accepted 2026-09-28): cột Tài xế đối tác (DRIVER_PARTNER) — MỌI ô nghiệp vụ = không. Ngoại lệ có tên: gửi/xem góp ý của mình (như mọi tài
// khoản) và xem giấy tờ của CHÍNH MÌNH, số che (party.document.view = own — ADR-0040 D2 sửa bởi ADR-0048). Liệt kê TỪNG ô, không suy từ MATRIX: thêm ô
// mới mà quên cột DRIVER_PARTNER thì đỏ ở đây — buộc người thêm QUYẾT giá trị cho tài xế đối tác (khuôn bài ghim hàng DRIVER ở trên).
// MỌI Ô TIỀN (money.view, order.money.edit, payment.receive, payment.refund, invoice.request, invoice.issue) = none — lượt 3 (giá thuê xe) lỡ mở ô tiền
// cho tài xế đối tác thì đỏ ở đây (ADR-0048 D2: "tài xế đối tác không thấy mọi con số tiền, kể cả giá thuê xe ở lượt 3").
test("ADR-0048 D2: MỌI ô của Tài xế đối tác (DRIVER_PARTNER) — ghim nguyên dòng, mọi ô tiền = none", () => {
  const DRIVER_PARTNER_ROW: Record<string, Scope> = {
    "order.view": "none", "money.view": "none", "order.history.view": "none", "contact.view": "none", "order.create": "none", "order.modify": "none",
    "order.trip.edit": "none", "task.progress": "none", "order.money.edit": "none", "order.cancel": "none", "dispatch.assign": "none", "dispatch.claim": "none",
    "order.passenger.write": "none", // ADR-0047 A2 × ADR-0048 D2 (mọi ô nghiệp vụ của tài xế đối tác = none): không nhập / sửa / huỷ danh sách hành khách
    "order.leg.short_notice": "none", // ADR-0049 D3 × ADR-0048 D2
    "dispatch.guides.view": "none", "payment.receive": "none", "payment.refund": "none", "invoice.request": "none", "invoice.issue": "none",
    "party.view": "none", "party.write": "none", "party.staff.write": "none", "admin.manage": "none", "admin.manage.superadmin": "none",
    "account.access.manage": "none", "staff.sheet.sync": "none", "audit.view": "none",
    "feedback.submit": "any", "feedback.view": "own", // ngoại lệ có tên (ADR-0048 D2)
    "feedback.triage": "none", "settings.ops": "none", "order.pool.view": "none", "notice.send": "none", "company.legal.write": "none",
    "party.document.view": "own", // ngoại lệ có tên (ADR-0048 D2): xem giấy tờ của CHÍNH MÌNH, số che
    "party.document.write": "none", "party.document.reveal": "none", "vehicle.manage": "none",
  };
  assert.deepEqual(Object.fromEntries((Object.keys(MATRIX) as OperationCode[]).map((op) => [op, MATRIX[op].DRIVER_PARTNER])), DRIVER_PARTNER_ROW);
});

test("quyenHienThi (ADR-0042): người xem không giữ Toàn quyền thấy SUPER_ADMIN thành ADMIN, bỏ trùng, đúng thứ tự; Toàn quyền thấy nguyên", () => {
  assert.deepEqual(quyenHienThi(["SUPER_ADMIN"], false), ["ADMIN"]);
  assert.deepEqual(quyenHienThi(["ADMIN", "SUPER_ADMIN"], false), ["ADMIN"]);
  assert.deepEqual(quyenHienThi(["SUPER_ADMIN", "SALES"], false), ["SALES", "ADMIN"]);
  assert.deepEqual(quyenHienThi(["SALES"], false), ["SALES"]);
  assert.deepEqual(quyenHienThi(["SUPER_ADMIN", "ADMIN"], true), ["ADMIN", "SUPER_ADMIN"]);
});

// ADR-0047 A2: "order.passenger.write mang giá trị bằng order.modify — ai lập, sửa được đơn thì nhập được tên khách của đơn đó". SUY TỪ MATRIX (không
// chép tay): ai đổi một ô của một trong hai hàng mà quên hàng kia thì đỏ ở đây — tách ô nhập tên khách khỏi ô sửa đơn phải là quyết định có chủ đích.
test("ADR-0047 A2: order.passenger.write = order.modify ở MỌI cột quyền (suy từ MATRIX)", () => {
  for (const p of PERMISSION_CODES) assert.equal(MATRIX["order.passenger.write"][p], MATRIX["order.modify"][p], `order.passenger.write × ${p} phải bằng order.modify × ${p}`);
});

// ADR-0049 D3 (siết): đặt gấp chặng dưới mốc 6 giờ CHỈ Quản trị + Toàn quyền — lỡ mở cho Bán hàng / Thực tập / Đối tác thì đỏ ở đây.
test("ADR-0049 D3: ô order.leg.short_notice CHỈ ADMIN + SUPER_ADMIN (any); mọi mã khác none", () => {
  const co = PERMISSION_CODES.filter((p) => MATRIX["order.leg.short_notice"][p] !== "none");
  assert.deepEqual(co, ["ADMIN", "SUPER_ADMIN"]);
  assert.equal(MATRIX["order.leg.short_notice"].ADMIN, "any");
  assert.equal(MATRIX["order.leg.short_notice"].SUPER_ADMIN, "any");
});
