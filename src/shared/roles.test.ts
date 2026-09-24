import { test } from "node:test";
import assert from "node:assert/strict";
import { PERMISSION_CODES } from "./permissions.ts";
import {
  EXTERNAL_ALLOWED, ROLES, ROLE_CODES, defaultPermissions, effectivePermissions, groupOf, highPermissionProblem, isRoleCode, parseRoleAssignment,
  permissionsLabel, roleAssignmentProblem, rolesLabel, type RoleAssignment,
} from "./roles.ts";

const assignment = (roles: RoleAssignment["roles"], extra: Partial<RoleAssignment> = {}): RoleAssignment => ({ roles, adds: [], removes: [], reason: null, ...extra });

test("danh mục: đủ 11 vai, 6 nội bộ + 5 bên ngoài, bộ mặc định là mã quyền hợp lệ", () => {
  assert.equal(ROLE_CODES.length, 11);
  assert.deepEqual(Object.keys(ROLES).sort(), [...ROLE_CODES].sort());
  assert.equal(ROLE_CODES.filter((r) => ROLES[r].group === "INTERNAL").length, 6);
  assert.equal(ROLE_CODES.filter((r) => ROLES[r].group === "EXTERNAL").length, 5);
  for (const r of ROLE_CODES) for (const p of ROLES[r].defaults) assert.ok((PERMISSION_CODES as readonly string[]).includes(p), `${r} → ${p}`);
  for (const r of ROLE_CODES.filter((x) => ROLES[x].group === "EXTERNAL")) assert.deepEqual([...ROLES[r].defaults], ["PARTNER"], r);
  assert.deepEqual(ROLE_CODES.filter((r) => ROLES[r].superAdminOnly), ["DIRECTOR", "OPERATIONS_MANAGER"]);
  assert.equal(isRoleCode("SALES_STAFF"), true);
  assert.equal(isRoleCode("STAFF"), false, "vai cũ mơ hồ không thuộc mô hình mới");
});

test("bộ mặc định đúng đặc tả §4 + ADR-0018 điều 4 (Giám đốc = Toàn quyền kèm Quản trị; Điều hành = Quản trị)", () => {
  assert.deepEqual(defaultPermissions(["DIRECTOR"]), ["ADMIN", "SUPER_ADMIN"]);
  assert.deepEqual(defaultPermissions(["OPERATIONS_MANAGER"]), ["ADMIN"]);
  assert.deepEqual(defaultPermissions(["GUIDE_INTERNAL"]), ["FIELD"]);
  assert.deepEqual(defaultPermissions(["SALES_STAFF"]), ["SALES"]);
  assert.deepEqual(defaultPermissions(["INTERN"]), ["INTERN"]);
  assert.deepEqual(defaultPermissions(["ACCOUNTANT"]), ["ACCOUNTING"]);
  assert.deepEqual(defaultPermissions(["TAXI_DRIVER"]), ["PARTNER"]);
  assert.deepEqual(defaultPermissions(["GUIDE_INTERNAL", "SALES_STAFF"]), ["SALES", "FIELD"], "nhiều vai = hợp, theo thứ tự chuẩn");
  assert.deepEqual(defaultPermissions([]), []);
});

test("groupOf: NONE / INTERNAL / EXTERNAL / MIXED", () => {
  assert.equal(groupOf([]), "NONE");
  assert.equal(groupOf(["SALES_STAFF", "ACCOUNTANT"]), "INTERNAL");
  assert.equal(groupOf(["COLLABORATOR"]), "EXTERNAL");
  assert.equal(groupOf(["SALES_STAFF", "COLLABORATOR"]), "MIXED");
});

test("effectivePermissions: mặc định + cộng − bớt; nhóm bên ngoài bị lọc về Đối tác (LC-1)", () => {
  assert.deepEqual(effectivePermissions(["SALES_STAFF"], { adds: ["ACCOUNTING"], removes: [] }), { permissions: ["SALES", "ACCOUNTING"], dropped: [] });
  assert.deepEqual(effectivePermissions(["DIRECTOR"], { adds: [], removes: ["ADMIN"] }), { permissions: ["SUPER_ADMIN"], dropped: [] });
  assert.deepEqual(effectivePermissions(["COLLABORATOR"], { adds: ["SALES"], removes: [] }), { permissions: ["PARTNER"], dropped: ["SALES"] });
  assert.deepEqual(effectivePermissions([], { adds: ["SALES"], removes: [] }), { permissions: ["SALES"], dropped: [] });
  assert.deepEqual([...EXTERNAL_ALLOWED], ["PARTNER"]);
});

test("parseRoleAssignment: đúng dạng, thứ tự chuẩn, lý do bắt buộc khi chỉnh tay", () => {
  assert.deepEqual(parseRoleAssignment({ roles: ["ACCOUNTANT", "SALES_STAFF"] }), { ok: true, value: { roles: ["SALES_STAFF", "ACCOUNTANT"], adds: [], removes: [], reason: null } });
  assert.deepEqual(parseRoleAssignment({ roles: ["SALES_STAFF"], adds: ["ACCOUNTING"], reason: "  kiêm   nhiệm " }), {
    ok: true,
    value: { roles: ["SALES_STAFF"], adds: ["ACCOUNTING"], removes: [], reason: "kiêm nhiệm" },
  });
  for (const bad of [null, {}, { roles: [] }, { roles: ["STAFF"] }, { roles: ["SALES_STAFF", "SALES_STAFF"] }, { roles: "SALES_STAFF" }]) {
    assert.equal(parseRoleAssignment(bad).ok, false, JSON.stringify(bad));
  }
  assert.equal(parseRoleAssignment({ roles: ["SALES_STAFF"], adds: ["BOSS"] }).ok, false);
  assert.equal(parseRoleAssignment({ roles: ["SALES_STAFF"], adds: ["ACCOUNTING"], removes: ["ACCOUNTING"], reason: "x" }).ok, false, "vừa cộng vừa bớt");
  assert.equal(parseRoleAssignment({ roles: ["SALES_STAFF"], adds: ["ACCOUNTING"] }).ok, false, "thiếu lý do");
  assert.equal(parseRoleAssignment({ roles: ["SALES_STAFF"], adds: ["ACCOUNTING"], reason: "x".repeat(201) }).ok, false, "lý do quá dài");
  const ignored = parseRoleAssignment({ roles: ["SALES_STAFF"], reason: "không chỉnh gì" });
  assert.ok(ignored.ok && ignored.value.reason === null, "không chỉnh tay thì không lưu lý do");
});

test("highPermissionProblem (LC-4): chỉ Toàn quyền cấp/gỡ Quản trị, Toàn quyền", () => {
  assert.equal(highPermissionProblem(["SUPER_ADMIN"], ["SALES"], ["SALES", "ADMIN"]), null);
  assert.deepEqual(highPermissionProblem(["ADMIN"], ["SALES"], ["SALES", "ADMIN"]), { forbidden: true, message: "Chỉ Toàn quyền mới cấp hoặc gỡ quyền Quản trị, Toàn quyền." });
  assert.equal(highPermissionProblem(["ADMIN"], ["SALES"], ["SALES", "ACCOUNTING"]), null);
});

test("roleAssignmentProblem: LC-3, LC-1 (cộng tay), LC-4, còn ít nhất một quyền", () => {
  const base = { actor: ["ADMIN"] as const, currentRoles: [] as const, currentPermissions: [] as const, currentAdjustments: { adds: [], removes: [] } as const };
  const mixed = roleAssignmentProblem({ ...base, next: assignment(["SALES_STAFF", "COLLABORATOR"]) });
  assert.equal(mixed?.forbidden, false);
  assert.match(mixed!.message, /cùng lúc vai nội bộ và vai bên ngoài/);
  assert.match(roleAssignmentProblem({ ...base, next: assignment(["COLLABORATOR"], { adds: ["SALES"], reason: "x" }) })!.message, /chỉ giữ quyền Đối tác/);
  assert.deepEqual(roleAssignmentProblem({ ...base, next: assignment(["OPERATIONS_MANAGER"]) }), {
    forbidden: true,
    message: "Chỉ Toàn quyền mới gán hoặc gỡ vai Giám đốc, Điều hành chung.",
  });
  assert.equal(roleAssignmentProblem({ ...base, next: assignment(["SALES_STAFF"], { adds: ["ADMIN"], reason: "x" }) })?.forbidden, true, "cộng tay Quản trị");
  assert.equal(roleAssignmentProblem({ ...base, actor: ["SUPER_ADMIN"], next: assignment(["OPERATIONS_MANAGER"]) }), null);
  assert.match(roleAssignmentProblem({ ...base, next: assignment(["INTERN"], { removes: ["INTERN"], reason: "x" }) })!.message, /ít nhất một quyền/);
  assert.equal(roleAssignmentProblem({ ...base, next: assignment(["ACCOUNTANT"]) }), null);
});

test("roleAssignmentProblem (I-1, kiểm độc lập vòng 1): chặn cộng tay Toàn quyền dù Giám đốc đã có sẵn qua mặc định (chỉnh tay 'ngủ')", () => {
  const problem = roleAssignmentProblem({
    actor: ["ADMIN"],
    currentRoles: ["DIRECTOR"],
    currentPermissions: ["ADMIN", "SUPER_ADMIN"],
    currentAdjustments: { adds: [], removes: [] },
    next: assignment(["DIRECTOR"], { adds: ["SUPER_ADMIN"], reason: "x" }),
  });
  assert.deepEqual(problem, { forbidden: true, message: "Chỉ Toàn quyền mới cấp hoặc gỡ quyền Quản trị, Toàn quyền." });
});

test("roleAssignmentProblem (I-1, kiểm độc lập vòng 1): chặn bớt tay Quản trị dù Nhân viên kinh doanh chưa từng có quyền đó (chỉnh tay 'ngủ')", () => {
  const problem = roleAssignmentProblem({
    actor: ["ADMIN"],
    currentRoles: ["SALES_STAFF"],
    currentPermissions: ["SALES"],
    currentAdjustments: { adds: [], removes: [] },
    next: assignment(["SALES_STAFF"], { removes: ["ADMIN"], reason: "x" }),
  });
  assert.deepEqual(problem, { forbidden: true, message: "Chỉ Toàn quyền mới cấp hoặc gỡ quyền Quản trị, Toàn quyền." });
});

test("roleAssignmentProblem (I-1, kiểm độc lập vòng 1): giữ nguyên một dòng chỉnh tay Quản trị/Toàn quyền đã có (không đổi) vẫn được phép", () => {
  const problem = roleAssignmentProblem({
    actor: ["ADMIN"],
    currentRoles: ["OPERATIONS_MANAGER", "SALES_STAFF"],
    currentPermissions: ["SALES"],
    currentAdjustments: { adds: [], removes: ["ADMIN"] },
    next: assignment(["OPERATIONS_MANAGER", "SALES_STAFF"], { removes: ["ADMIN"], reason: "x" }),
  });
  assert.equal(problem, null);
});

test("roleAssignmentProblem (I-2, kiểm độc lập vòng 1): bỏ vai chỉ-Toàn-quyền-mới-được-gán bằng cách không chọn lại — vẫn phải chặn (ghim luật cũ)", () => {
  const problem = roleAssignmentProblem({
    actor: ["ADMIN"],
    currentRoles: ["OPERATIONS_MANAGER"],
    currentPermissions: ["ADMIN"],
    currentAdjustments: { adds: [], removes: [] },
    next: assignment(["SALES_STAFF"]),
  });
  assert.deepEqual(problem, { forbidden: true, message: "Chỉ Toàn quyền mới gán hoặc gỡ vai Giám đốc, Điều hành chung." });
});

test("highPermissionProblem (I-2, kiểm độc lập vòng 1): chặn cả chiều gỡ Quản trị/Toàn quyền, không chỉ chiều cấp (ghim luật cũ)", () => {
  assert.deepEqual(highPermissionProblem(["ADMIN"], ["SALES", "ADMIN"], ["SALES"]), {
    forbidden: true,
    message: "Chỉ Toàn quyền mới cấp hoặc gỡ quyền Quản trị, Toàn quyền.",
  });
});

test("nhãn lời thường", () => {
  assert.equal(rolesLabel(["SALES_STAFF", "ACCOUNTANT"]), "Nhân viên kinh doanh, Kế toán");
  assert.equal(rolesLabel([]), "chưa gán vai");
  assert.equal(permissionsLabel(["SUPER_ADMIN", "INTERN"]), "Toàn quyền, Thực tập");
  assert.equal(permissionsLabel([]), "không có quyền");
});
