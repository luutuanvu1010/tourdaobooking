import { test } from "node:test";
import assert from "node:assert/strict";
import { EXTERNAL_PERMISSIONS, PERMISSION_CODES } from "./permissions.ts";
import {
  ROLES, ROLE_CODES, defaultPermissions, effectivePermissions, groupOf, highPermissionProblem, isRoleCode, parseRoleAssignment,
  permissionsLabel, roleAssignmentProblem, rolesLabel, taiKhoanLaiProblem, type RoleAssignment,
} from "./roles.ts";

const assignment = (roles: RoleAssignment["roles"], extra: Partial<RoleAssignment> = {}): RoleAssignment => ({ roles, adds: [], removes: [], reason: null, ...extra });

test("danh mục: đủ 14 vai, 8 nội bộ + 6 bên ngoài (ADR-0044 thêm vai IT; ADR-0040 D3 thêm vai Tài xế công ty; ADR-0048 D2 thêm vai Tài xế đối tác), bộ mặc định là mã quyền hợp lệ", () => {
  assert.equal(ROLE_CODES.length, 14);
  assert.deepEqual(Object.keys(ROLES).sort(), [...ROLE_CODES].sort());
  assert.equal(ROLE_CODES.filter((r) => ROLES[r].group === "INTERNAL").length, 8);
  assert.equal(ROLE_CODES.filter((r) => ROLES[r].group === "EXTERNAL").length, 6);
  for (const r of ROLE_CODES) for (const p of ROLES[r].defaults) assert.ok((PERMISSION_CODES as readonly string[]).includes(p), `${r} → ${p}`);
  // Mọi vai bên ngoài sinh ĐÚNG MỘT quyền bên ngoài: Đối tác, trừ ngoại lệ có tên "Tài xế đối tác" sinh Tài xế đối tác (ADR-0048 D2 — người lái chuyến,
  // không phải bên đặt; ADR-0018 điều 9 sửa bởi ADR-0048).
  for (const r of ROLE_CODES.filter((x) => ROLES[x].group === "EXTERNAL")) {
    assert.deepEqual([...ROLES[r].defaults], r === "DRIVER_EXTERNAL" ? ["DRIVER_PARTNER"] : ["PARTNER"], r);
    for (const p of ROLES[r].defaults) assert.ok((EXTERNAL_PERMISSIONS as readonly string[]).includes(p), `${r}: mặc định ${p} phải là quyền bên ngoài (LC-1)`);
  }
  assert.deepEqual(ROLE_CODES.filter((r) => ROLES[r].superAdminOnly), ["DIRECTOR", "OPERATIONS_MANAGER", "IT"]);
  assert.equal(isRoleCode("SALES_STAFF"), true);
  assert.equal(isRoleCode("STAFF"), false, "vai cũ mơ hồ không thuộc mô hình mới");
  assert.equal(isRoleCode("DRIVER"), false, "mã vai hồ sơ cũ DRIVER (nhóm OTHER, đã ngưng) không thuộc mô hình vai tài khoản — vai tài xế công ty là DRIVER_INTERNAL");
});

test("ADR-0040 D3 (Ruling R1, R12): vai 'Tài xế công ty' — nội bộ, bộ quyền mặc định chỉ Tài xế (DRIVER), không nhận đơn, Quản trị gán được", () => {
  assert.deepEqual(defaultPermissions(["DRIVER_INTERNAL"]), ["DRIVER"]);
  assert.equal(ROLES.DRIVER_INTERNAL.name, "Tài xế công ty");
  assert.equal(ROLES.DRIVER_INTERNAL.group, "INTERNAL");
  assert.equal(ROLES.DRIVER_INTERNAL.handles, "never", "vai này không nhận đơn (không phải người phụ trách đơn)");
  assert.equal(ROLES.DRIVER_INTERNAL.superAdminOnly, false);
  assert.equal(ROLE_CODES.indexOf("DRIVER_INTERNAL"), ROLE_CODES.indexOf("IT") + 1, "đứng ngay sau IT, cuối nhóm nội bộ — không xê dịch vai nội bộ nào đang có");
});

test("ADR-0048 D2: vai 'Tài xế đối tác' — bên ngoài, bộ quyền mặc định chỉ Tài xế đối tác (DRIVER_PARTNER), không nhận đơn, Quản trị gán được, đứng CUỐI", () => {
  assert.deepEqual(defaultPermissions(["DRIVER_EXTERNAL"]), ["DRIVER_PARTNER"]);
  assert.equal(ROLES.DRIVER_EXTERNAL.name, "Tài xế đối tác");
  assert.equal(ROLES.DRIVER_EXTERNAL.group, "EXTERNAL");
  assert.equal(ROLES.DRIVER_EXTERNAL.handles, "never");
  assert.equal(ROLES.DRIVER_EXTERNAL.superAdminOnly, false);
  assert.equal(ROLE_CODES[ROLE_CODES.length - 1], "DRIVER_EXTERNAL", "thêm CUỐI — không xê dịch vai nào đang có");
  // Đường #3 (POST /api/staff/sheet/apply, vai cố định SALES_STAFF) không bao giờ sinh tài khoản lai (LC-1b).
  assert.ok(!defaultPermissions(["SALES_STAFF"]).includes("DRIVER_PARTNER"));
});

test("bộ mặc định đúng đặc tả §4 + ADR-0018 điều 4 (Giám đốc = Toàn quyền kèm Quản trị; Điều hành = Quản trị)", () => {
  assert.deepEqual(defaultPermissions(["DIRECTOR"]), ["ADMIN", "SUPER_ADMIN"]);
  assert.deepEqual(defaultPermissions(["OPERATIONS_MANAGER"]), ["ADMIN"]);
  assert.deepEqual(defaultPermissions(["IT"]), ["ADMIN", "SUPER_ADMIN"], "ADR-0044: vai IT = cùng bộ quyền Giám đốc, chỉ khác tên hiện ra");
  assert.equal(ROLES.IT.name, "IT");
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

test("effectivePermissions: mặc định + cộng − bớt; nhóm bên ngoài bị lọc về quyền bên ngoài (LC-1, ADR-0048 B2.1)", () => {
  assert.deepEqual(effectivePermissions(["SALES_STAFF"], { adds: ["ACCOUNTING"], removes: [] }), { permissions: ["SALES", "ACCOUNTING"], dropped: [] });
  assert.deepEqual(effectivePermissions(["DIRECTOR"], { adds: [], removes: ["ADMIN"] }), { permissions: ["SUPER_ADMIN"], dropped: [] });
  assert.deepEqual(effectivePermissions(["COLLABORATOR"], { adds: ["SALES"], removes: [] }), { permissions: ["PARTNER"], dropped: ["SALES"] });
  assert.deepEqual(effectivePermissions([], { adds: ["SALES"], removes: [] }), { permissions: ["SALES"], dropped: [] });
  // ADR-0048 D2: vai Tài xế đối tác sinh DRIVER_PARTNER — quyền bên ngoài, không bị LC-1 gạt; quyền nội bộ cộng tay vẫn bị gạt (Tài xế công ty DRIVER cũng vậy).
  assert.deepEqual(effectivePermissions(["DRIVER_EXTERNAL"], { adds: [], removes: [] }), { permissions: ["DRIVER_PARTNER"], dropped: [] });
  assert.deepEqual(effectivePermissions(["DRIVER_EXTERNAL"], { adds: ["DRIVER"], removes: [] }), { permissions: ["DRIVER_PARTNER"], dropped: ["DRIVER"] });
  // MỘT hằng (ADR-0048 B2.1: "thay EXTERNAL_ALLOWED"), đứng ở permissions.ts để cả roles.ts lẫn thong-bao.ts dùng.
  assert.deepEqual([...EXTERNAL_PERMISSIONS], ["PARTNER", "DRIVER_PARTNER"]);
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
  assert.equal(highPermissionProblem(true, ["SALES"], ["SALES", "ADMIN"]), null);
  assert.deepEqual(highPermissionProblem(false, ["SALES"], ["SALES", "ADMIN"]), { forbidden: true, message: "Chỉ người phụ trách hệ thống mới cấp hoặc gỡ quyền Quản trị." });
  assert.equal(highPermissionProblem(false, ["SALES"], ["SALES", "ACCOUNTING"]), null);
});

test("roleAssignmentProblem: LC-3, LC-1 (cộng tay), LC-4, còn ít nhất một quyền", () => {
  const base = { actorIsSuper: false, currentRoles: [] as const, currentPermissions: [] as const, currentAdjustments: { adds: [], removes: [] } as const };
  const mixed = roleAssignmentProblem({ ...base, next: assignment(["SALES_STAFF", "COLLABORATOR"]) });
  assert.equal(mixed?.forbidden, false);
  assert.match(mixed!.message, /cùng lúc vai nội bộ và vai bên ngoài/);
  assert.match(roleAssignmentProblem({ ...base, next: assignment(["COLLABORATOR"], { adds: ["SALES"], reason: "x" }) })!.message, /chỉ giữ quyền bên ngoài \(Đối tác hoặc Tài xế đối tác\)/);
  assert.deepEqual(roleAssignmentProblem({ ...base, next: assignment(["OPERATIONS_MANAGER"]) }), {
    forbidden: true,
    message: "Chỉ người phụ trách hệ thống mới gán hoặc gỡ vai Giám đốc, Điều hành chung.",
  });
  assert.equal(roleAssignmentProblem({ ...base, next: assignment(["SALES_STAFF"], { adds: ["ADMIN"], reason: "x" }) })?.forbidden, true, "cộng tay Quản trị");
  assert.equal(roleAssignmentProblem({ ...base, actorIsSuper: true, next: assignment(["OPERATIONS_MANAGER"]) }), null);
  assert.match(roleAssignmentProblem({ ...base, next: assignment(["INTERN"], { removes: ["INTERN"], reason: "x" }) })!.message, /ít nhất một quyền/);
  assert.equal(roleAssignmentProblem({ ...base, next: assignment(["ACCOUNTANT"]) }), null);
});

test("roleAssignmentProblem (I-1, kiểm độc lập vòng 1): chặn cộng tay Toàn quyền dù Giám đốc đã có sẵn qua mặc định (chỉnh tay 'ngủ')", () => {
  const problem = roleAssignmentProblem({
    actorIsSuper: false,
    currentRoles: ["DIRECTOR"],
    currentPermissions: ["ADMIN", "SUPER_ADMIN"],
    currentAdjustments: { adds: [], removes: [] },
    next: assignment(["DIRECTOR"], { adds: ["SUPER_ADMIN"], reason: "x" }),
  });
  assert.deepEqual(problem, { forbidden: true, message: "Chỉ người phụ trách hệ thống mới cấp hoặc gỡ quyền Quản trị." });
});

test("roleAssignmentProblem (I-1, kiểm độc lập vòng 1): chặn bớt tay Quản trị dù Nhân viên kinh doanh chưa từng có quyền đó (chỉnh tay 'ngủ')", () => {
  const problem = roleAssignmentProblem({
    actorIsSuper: false,
    currentRoles: ["SALES_STAFF"],
    currentPermissions: ["SALES"],
    currentAdjustments: { adds: [], removes: [] },
    next: assignment(["SALES_STAFF"], { removes: ["ADMIN"], reason: "x" }),
  });
  assert.deepEqual(problem, { forbidden: true, message: "Chỉ người phụ trách hệ thống mới cấp hoặc gỡ quyền Quản trị." });
});

test("roleAssignmentProblem (I-1, kiểm độc lập vòng 1): giữ nguyên một dòng chỉnh tay Quản trị/Toàn quyền đã có (không đổi) vẫn được phép", () => {
  const problem = roleAssignmentProblem({
    actorIsSuper: false,
    currentRoles: ["OPERATIONS_MANAGER", "SALES_STAFF"],
    currentPermissions: ["SALES"],
    currentAdjustments: { adds: [], removes: ["ADMIN"] },
    next: assignment(["OPERATIONS_MANAGER", "SALES_STAFF"], { removes: ["ADMIN"], reason: "x" }),
  });
  assert.equal(problem, null);
});

test("roleAssignmentProblem (I-2, kiểm độc lập vòng 1): bỏ vai chỉ-Toàn-quyền-mới-được-gán bằng cách không chọn lại — vẫn phải chặn (ghim luật cũ)", () => {
  const problem = roleAssignmentProblem({
    actorIsSuper: false,
    currentRoles: ["OPERATIONS_MANAGER"],
    currentPermissions: ["ADMIN"],
    currentAdjustments: { adds: [], removes: [] },
    next: assignment(["SALES_STAFF"]),
  });
  assert.deepEqual(problem, { forbidden: true, message: "Chỉ người phụ trách hệ thống mới gán hoặc gỡ vai Giám đốc, Điều hành chung." });
});

test("highPermissionProblem (I-2, kiểm độc lập vòng 1): chặn cả chiều gỡ Quản trị/Toàn quyền, không chỉ chiều cấp (ghim luật cũ)", () => {
  assert.deepEqual(highPermissionProblem(false, ["SALES", "ADMIN"], ["SALES"]), {
    forbidden: true,
    message: "Chỉ người phụ trách hệ thống mới cấp hoặc gỡ quyền Quản trị.",
  });
});

test("roleAssignmentProblem (I-1 vòng 2, kiểm độc lập): chặn BỎ dòng cộng tay Toàn quyền đã có dù Giám đốc mặc định vẫn giữ nguyên quyền đó", () => {
  const problem = roleAssignmentProblem({
    actorIsSuper: false,
    currentRoles: ["DIRECTOR"],
    currentPermissions: ["ADMIN", "SUPER_ADMIN"],
    currentAdjustments: { adds: ["SUPER_ADMIN"], removes: [] },
    next: assignment(["DIRECTOR"]),
  });
  assert.deepEqual(problem, { forbidden: true, message: "Chỉ người phụ trách hệ thống mới cấp hoặc gỡ quyền Quản trị." });
});

test("roleAssignmentProblem (I-1 vòng 2, kiểm độc lập): chặn BỎ dòng bớt tay Quản trị đã có dù Nhân viên kinh doanh mặc định vẫn chưa từng có quyền đó", () => {
  const problem = roleAssignmentProblem({
    actorIsSuper: false,
    currentRoles: ["SALES_STAFF"],
    currentPermissions: ["SALES"],
    currentAdjustments: { adds: [], removes: ["ADMIN"] },
    next: assignment(["SALES_STAFF"]),
  });
  assert.deepEqual(problem, { forbidden: true, message: "Chỉ người phụ trách hệ thống mới cấp hoặc gỡ quyền Quản trị." });
});

// ADR-0048 B2.2 (LC-1b, Q4 = (a)): MỘT hàm thuần cho mọi đường ghi quyền — tài khoản giữ DRIVER_PARTNER không giữ quyền nào khác.
test("taiKhoanLaiProblem (LC-1b): DRIVER_PARTNER đứng một mình; kèm bất kỳ quyền nào khác → 400", () => {
  assert.equal(taiKhoanLaiProblem(["DRIVER_PARTNER"]), null);
  for (const lai of [["DRIVER_PARTNER", "PARTNER"], ["DRIVER_PARTNER", "SALES"], ["DRIVER", "DRIVER_PARTNER"]] as const) {
    assert.deepEqual(taiKhoanLaiProblem(lai), { forbidden: false, message: "Tài khoản Tài xế đối tác không giữ thêm quyền nào khác." }, lai.join("+"));
  }
  assert.equal(taiKhoanLaiProblem(["PARTNER"]), null);
  assert.equal(taiKhoanLaiProblem(["SALES", "ADMIN"]), null);
  assert.equal(taiKhoanLaiProblem([]), null, "không quyền nào — việc của lời kiểm 'còn ít nhất một quyền'");
});

test("roleAssignmentProblem (ADR-0048 B2.2): vai Tài xế đối tác không đi cùng vai bên ngoài khác; tài khoản lai qua cộng tay → 400 trước khi dựng câu", () => {
  const base = { actorIsSuper: false, currentRoles: [] as const, currentPermissions: [] as const, currentAdjustments: { adds: [], removes: [] } as const };
  const haiVai = roleAssignmentProblem({ ...base, next: assignment(["TAXI_DRIVER", "DRIVER_EXTERNAL"]) });
  assert.equal(haiVai?.forbidden, false);
  assert.equal(haiVai?.message, "Vai Tài xế đối tác không đi cùng vai bên ngoài khác — một người chọn một: đối tác đặt đơn hoặc tài xế đối tác.");
  const LAI = "Tài khoản Tài xế đối tác không giữ thêm quyền nào khác.";
  assert.deepEqual(roleAssignmentProblem({ ...base, next: assignment(["DRIVER_EXTERNAL"], { adds: ["PARTNER"], reason: "x" }) }), { forbidden: false, message: LAI });
  assert.deepEqual(roleAssignmentProblem({ ...base, next: assignment(["TAXI_DRIVER"], { adds: ["DRIVER_PARTNER"], reason: "x" }) }), { forbidden: false, message: LAI });
  assert.deepEqual(roleAssignmentProblem({ ...base, next: assignment(["SALES_STAFF"], { adds: ["DRIVER_PARTNER"], reason: "x" }) }), { forbidden: false, message: LAI });
  assert.equal(roleAssignmentProblem({ ...base, next: assignment(["DRIVER_EXTERNAL"]) }), null);
  assert.match(roleAssignmentProblem({ ...base, next: assignment(["COLLABORATOR"], { adds: ["SALES"], reason: "x" }) })!.message, /quyền bên ngoài/);
  // Nội bộ bớt HẾT quyền nội bộ rồi cộng tay DRIVER_PARTNER: đứng một mình nên LC-1b cho qua (kế hoạch mục 14.2 điểm 3 — ADR không cấm; không thêm luật).
  assert.equal(roleAssignmentProblem({ ...base, next: assignment(["SALES_STAFF"], { adds: ["DRIVER_PARTNER"], removes: ["SALES"], reason: "x" }) }), null);
});

test("nhãn lời thường", () => {
  assert.equal(rolesLabel(["SALES_STAFF", "ACCOUNTANT"]), "Nhân viên kinh doanh, Kế toán");
  assert.equal(rolesLabel([]), "chưa gán vai");
  assert.equal(permissionsLabel(["SUPER_ADMIN", "INTERN"]), "Toàn quyền, Thực tập");
  assert.equal(permissionsLabel([]), "không có quyền");
});
