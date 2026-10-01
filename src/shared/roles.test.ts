import { test } from "node:test";
import assert from "node:assert/strict";
import { EXTERNAL_PERMISSIONS, PERMISSION_CODES, type PermissionCode } from "./permissions.ts";
import {
  ROLES, ROLE_CODES, SUPER_ADMIN_GRANTED, canManageAccount, defaultPermissions, effectivePermissions, groupOf, highPermissionProblem, isRoleCode, laiNoiBoBenNgoaiProblem, parseRoleAssignment,
  permissionsLabel, roleAssignmentProblem, rolesLabel, taiKhoanLaiProblem, tuDoiQuyenCuaMinh, vaiTaiXeDoiTacXungDot, type RoleAssignment, type RoleCode,
} from "./roles.ts";

const VAI_QUAN_LY = "Chỉ người phụ trách hệ thống mới gán hoặc gỡ vai Giám đốc, Điều hành chung, IT, Hành chính nhân sự.";
const assignment = (roles: RoleAssignment["roles"], extra: Partial<RoleAssignment> = {}): RoleAssignment => ({ roles, adds: [], removes: [], reason: null, ...extra });

test("danh mục: đủ 15 vai, 9 nội bộ + 6 bên ngoài (ADR-0044 thêm vai IT; ADR-0040 D3 thêm vai Tài xế công ty; ADR-0048 D2 thêm vai Tài xế đối tác; ADR-0071 thêm vai Hành chính nhân sự), bộ mặc định là mã quyền hợp lệ", () => {
  assert.equal(ROLE_CODES.length, 15);
  assert.deepEqual(Object.keys(ROLES).sort(), [...ROLE_CODES].sort());
  assert.equal(ROLE_CODES.filter((r) => ROLES[r].group === "INTERNAL").length, 9);
  assert.equal(ROLE_CODES.filter((r) => ROLES[r].group === "EXTERNAL").length, 6);
  for (const r of ROLE_CODES) for (const p of ROLES[r].defaults) assert.ok((PERMISSION_CODES as readonly string[]).includes(p), `${r} → ${p}`);
  // Mọi vai bên ngoài sinh ĐÚNG MỘT quyền bên ngoài: Đối tác, trừ ngoại lệ có tên "Tài xế đối tác" sinh Tài xế đối tác (ADR-0048 D2 — người lái chuyến,
  // không phải bên đặt; ADR-0018 điều 9 sửa bởi ADR-0048).
  for (const r of ROLE_CODES.filter((x) => ROLES[x].group === "EXTERNAL")) {
    assert.deepEqual([...ROLES[r].defaults], r === "DRIVER_EXTERNAL" ? ["DRIVER_PARTNER"] : ["PARTNER"], r);
    for (const p of ROLES[r].defaults) assert.ok((EXTERNAL_PERMISSIONS as readonly string[]).includes(p), `${r}: mặc định ${p} phải là quyền bên ngoài (LC-1)`);
  }
  assert.deepEqual(ROLE_CODES.filter((r) => ROLES[r].superAdminOnly), ["DIRECTOR", "OPERATIONS_MANAGER", "IT", "HR_STAFF"]);
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
  assert.equal(ROLE_CODES.indexOf("DRIVER_INTERNAL"), ROLE_CODES.indexOf("IT") + 1, "đứng ngay sau IT — không xê dịch vai nội bộ nào đang có");
});

test("ADR-0071 điều 1a, 1d: vai 'Hành chính nhân sự' — nội bộ, bộ quyền mặc định chỉ Nhân sự (HR), không nhận đơn, CHỈ Toàn quyền gán; HR thuộc nhóm quyền chỉ Toàn quyền cấp/gỡ", () => {
  assert.deepEqual(defaultPermissions(["HR_STAFF"]), ["HR"]);
  assert.equal(ROLES.HR_STAFF.name, "Hành chính nhân sự");
  assert.equal(ROLES.HR_STAFF.group, "INTERNAL");
  assert.equal(ROLES.HR_STAFF.handles, "never");
  assert.equal(ROLES.HR_STAFF.superAdminOnly, true);
  assert.equal(ROLE_CODES.indexOf("HR_STAFF"), ROLE_CODES.indexOf("DRIVER_INTERNAL") + 1, "đứng ngay sau Tài xế công ty, cuối nhóm nội bộ");
  assert.deepEqual([...SUPER_ADMIN_GRANTED], ["ADMIN", "SUPER_ADMIN", "HR"]);
  // Không phải Toàn quyền: cấp HR (đường cũ) / gỡ HR → 403; Toàn quyền → được.
  assert.deepEqual(highPermissionProblem(false, ["SALES"], ["SALES", "HR"]), { forbidden: true, message: "Chỉ người phụ trách hệ thống mới cấp hoặc gỡ quyền Nhân sự." });
  assert.equal(highPermissionProblem(false, ["HR"], ["SALES"])?.forbidden, true);
  assert.equal(highPermissionProblem(true, ["SALES"], ["SALES", "HR"]), null);
  // Gán vai HCNS / Giám đốc / Điều hành chung khi không phải Toàn quyền → 403 (người gán là Quản trị hay HCNS đều vậy — luật không xét quyền người gán ngoài "là Toàn quyền").
  const base = { actorIsSuper: false, currentRoles: [], currentPermissions: [], currentAdjustments: { adds: [], removes: [] } } as const;
  for (const r of ["HR_STAFF", "DIRECTOR", "OPERATIONS_MANAGER", "IT"] as const) {
    assert.deepEqual(roleAssignmentProblem({ ...base, next: assignment([r]) }), { forbidden: true, message: VAI_QUAN_LY }, r);
  }
  assert.equal(roleAssignmentProblem({ ...base, next: assignment(["SALES_STAFF"], { adds: ["HR"], reason: "x" }) })?.forbidden, true, "cộng tay Nhân sự");
  assert.equal(roleAssignmentProblem({ ...base, next: assignment(["SALES_STAFF"]) }), null, "vai thường: được");
  assert.equal(roleAssignmentProblem({ ...base, actorIsSuper: true, next: assignment(["HR_STAFF"]) }), null, "Toàn quyền gán vai HCNS được");
});

test("ADR-0048 D2: vai 'Tài xế đối tác' — bên ngoài, bộ quyền mặc định chỉ Tài xế đối tác (DRIVER_PARTNER), không nhận đơn, Quản trị gán được, đứng CUỐI", () => {
  assert.deepEqual(defaultPermissions(["DRIVER_EXTERNAL"]), ["DRIVER_PARTNER"]);
  assert.equal(ROLES.DRIVER_EXTERNAL.name, "Tài xế đối tác");
  assert.equal(ROLES.DRIVER_EXTERNAL.group, "EXTERNAL");
  assert.equal(ROLES.DRIVER_EXTERNAL.handles, "never");
  assert.equal(ROLES.DRIVER_EXTERNAL.superAdminOnly, false);
  assert.equal(ROLE_CODES[ROLE_CODES.length - 1], "DRIVER_EXTERNAL", "thêm CUỐI — không xê dịch vai nào đang có");
});

test("bộ mặc định đúng đặc tả §4 + ADR-0072 điều 1 (Giám đốc = Quản trị, KHÔNG Toàn quyền; Điều hành = Quản trị; IT = Quản trị + Toàn quyền)", () => {
  assert.deepEqual(defaultPermissions(["DIRECTOR"]), ["ADMIN"], "ADR-0072 điều 1: Giám đốc làm việc kinh doanh, không việc kỹ thuật");
  assert.equal(ROLES.DIRECTOR.superAdminOnly, true, "ADR-0072 điều 1: vẫn chỉ Toàn quyền gán / gỡ vai Giám đốc");
  assert.deepEqual(defaultPermissions(["OPERATIONS_MANAGER"]), ["ADMIN"]);
  assert.deepEqual(defaultPermissions(["IT"]), ["ADMIN", "SUPER_ADMIN"], "ADR-0044 + ADR-0072 điều 2: vai IT giữ nguyên Quản trị + Toàn quyền");
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
  assert.deepEqual(effectivePermissions(["IT"], { adds: [], removes: ["ADMIN"] }), { permissions: ["SUPER_ADMIN"], dropped: [] });
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
    message: VAI_QUAN_LY,
  });
  assert.equal(roleAssignmentProblem({ ...base, next: assignment(["SALES_STAFF"], { adds: ["ADMIN"], reason: "x" }) })?.forbidden, true, "cộng tay Quản trị");
  assert.equal(roleAssignmentProblem({ ...base, actorIsSuper: true, next: assignment(["OPERATIONS_MANAGER"]) }), null);
  assert.match(roleAssignmentProblem({ ...base, next: assignment(["INTERN"], { removes: ["INTERN"], reason: "x" }) })!.message, /ít nhất một quyền/);
  assert.equal(roleAssignmentProblem({ ...base, next: assignment(["ACCOUNTANT"]) }), null);
});

test("roleAssignmentProblem (I-1, kiểm độc lập vòng 1): chặn cộng tay Toàn quyền dù vai IT đã có sẵn qua mặc định (chỉnh tay 'ngủ')", () => {
  const problem = roleAssignmentProblem({
    actorIsSuper: false,
    currentRoles: ["IT"],
    currentPermissions: ["ADMIN", "SUPER_ADMIN"],
    currentAdjustments: { adds: [], removes: [] },
    next: assignment(["IT"], { adds: ["SUPER_ADMIN"], reason: "x" }),
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
  assert.deepEqual(problem, { forbidden: true, message: VAI_QUAN_LY });
});

test("highPermissionProblem (I-2, kiểm độc lập vòng 1): chặn cả chiều gỡ Quản trị/Toàn quyền, không chỉ chiều cấp (ghim luật cũ)", () => {
  assert.deepEqual(highPermissionProblem(false, ["SALES", "ADMIN"], ["SALES"]), {
    forbidden: true,
    message: "Chỉ người phụ trách hệ thống mới cấp hoặc gỡ quyền Quản trị.",
  });
});

test("roleAssignmentProblem (I-1 vòng 2, kiểm độc lập): chặn BỎ dòng cộng tay Toàn quyền đã có dù vai IT mặc định vẫn giữ nguyên quyền đó", () => {
  const problem = roleAssignmentProblem({
    actorIsSuper: false,
    currentRoles: ["IT"],
    currentPermissions: ["ADMIN", "SUPER_ADMIN"],
    currentAdjustments: { adds: ["SUPER_ADMIN"], removes: [] },
    next: assignment(["IT"]),
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

test("ADR-0072 điều 1: Giám đốc cần việc kỹ thuật → Toàn quyền cộng tay Toàn quyền (có lý do) được; Quản trị cộng thì bị chặn", () => {
  const vao = (actorIsSuper: boolean) => ({
    actorIsSuper,
    currentRoles: ["DIRECTOR"] as RoleCode[],
    currentPermissions: ["ADMIN"] as PermissionCode[],
    currentAdjustments: { adds: [], removes: [] },
    next: assignment(["DIRECTOR"], { adds: ["SUPER_ADMIN"], reason: "Giám đốc kiêm phụ trách hệ thống" }),
  });
  assert.equal(roleAssignmentProblem(vao(true)), null);
  assert.deepEqual(effectivePermissions(["DIRECTOR"], { adds: ["SUPER_ADMIN"], removes: [] }), { permissions: ["ADMIN", "SUPER_ADMIN"], dropped: [] });
  assert.deepEqual(roleAssignmentProblem(vao(false)), { forbidden: true, message: "Chỉ người phụ trách hệ thống mới cấp hoặc gỡ quyền Quản trị." });
  // Cộng Kế toán (ADR-0072 điều 1, câu hỏi 1): quyền thường — không thuộc nhóm chỉ Toàn quyền cấp.
  assert.deepEqual(effectivePermissions(["DIRECTOR"], { adds: ["ACCOUNTING"], removes: [] }), { permissions: ["ACCOUNTING", "ADMIN"], dropped: [] });
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

// ADR-0083 điều 1b: đường ghi quyền KHÔNG qua vai (PUT /api/staff/:id/permissions, POST /api/staff không vai) — tập quyền không vừa có quyền bên ngoài
// (isExternalPermission: Đối tác, Tài xế đối tác) vừa có quyền nội bộ. LC-1b (taiKhoanLaiProblem) giữ nguyên, đứng trước.
test("laiNoiBoBenNgoaiProblem (ADR-0083 1b): quyền bên ngoài + quyền nội bộ → 400 câu dễ hiểu; thuần một phía → null", () => {
  const CAU = { forbidden: false, message: "Một tài khoản không giữ cùng lúc quyền nội bộ và quyền bên ngoài (Đối tác, Tài xế đối tác) — chọn một phía." };
  for (const lai of [["PARTNER", "SALES"], ["SALES", "PARTNER"], ["FIELD", "PARTNER"], ["ADMIN", "PARTNER"], ["DRIVER", "DRIVER_PARTNER"], ["HR", "PARTNER"], ["INTERN", "PARTNER", "SALES"]] as PermissionCode[][]) {
    assert.deepEqual(laiNoiBoBenNgoaiProblem(lai), CAU, lai.join("+"));
  }
  for (const ok of [["PARTNER"], ["DRIVER_PARTNER"], ["PARTNER", "DRIVER_PARTNER"], ["SALES"], ["SALES", "ADMIN", "SUPER_ADMIN"], []] as PermissionCode[][]) {
    assert.equal(laiNoiBoBenNgoaiProblem(ok), null, ok.join("+") || "rỗng");
  }
  // Mọi quyền nội bộ (mọi mã KHÔNG thuộc EXTERNAL_PERMISSIONS) đi cùng PARTNER đều bị chặn — không danh sách chép tay.
  for (const p of PERMISSION_CODES.filter((c) => !(EXTERNAL_PERMISSIONS as readonly PermissionCode[]).includes(c))) {
    assert.ok(laiNoiBoBenNgoaiProblem(["PARTNER", p]), `PARTNER+${p}`);
  }
});

// ADR-0048 B2.2 — MỘT hàm thuần cho máy chủ (roleAssignmentProblem) và giao diện (web/role-picker.ts khoá chéo ô vai, Task B1).
test("vaiTaiXeDoiTacXungDot: 'Tài xế đối tác' cùng một vai bên ngoài khác → true; đứng một mình, hay chỉ vai bên ngoài khác → false", () => {
  assert.equal(vaiTaiXeDoiTacXungDot(["DRIVER_EXTERNAL"]), false);
  assert.equal(vaiTaiXeDoiTacXungDot(["TAXI_DRIVER", "COLLABORATOR"]), false, "hai vai bên ngoài sinh PARTNER không xung đột nhau");
  for (const r of ["TRAVEL_AGENCY", "GUIDE_FREELANCE", "HOTEL_RECEPTION", "TAXI_DRIVER", "COLLABORATOR"] as const) {
    assert.equal(vaiTaiXeDoiTacXungDot([r, "DRIVER_EXTERNAL"]), true, r);
  }
  assert.equal(vaiTaiXeDoiTacXungDot(["SALES_STAFF", "DRIVER_EXTERNAL"]), false, "vai nội bộ + bên ngoài là việc của LC-3 (MIXED), không phải hàm này");
  assert.equal(vaiTaiXeDoiTacXungDot([]), false);
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

test("canManageAccount (ADR-0014 điều 8 + ADR-0071 điều 1c): Quản trị và HCNS quản được cấp dưới — KHÔNG ai giữ Quản trị / Toàn quyền / Nhân sự; Toàn quyền quản được mọi tài khoản", () => {
  for (const actor of [["ADMIN"], ["HR"], ["ADMIN", "HR"]] as const) {
    for (const target of [["SALES"], ["PARTNER"], ["DRIVER_PARTNER"], ["FIELD", "SALES"], []] as const) assert.equal(canManageAccount(actor, target), true, `${actor} → ${target}`);
    for (const target of [["ADMIN"], ["SUPER_ADMIN"], ["HR"], ["SALES", "HR"], ["ADMIN", "SUPER_ADMIN"]] as const) assert.equal(canManageAccount(actor, target), false, `${actor} → ${target}`);
  }
  assert.equal(canManageAccount(["SUPER_ADMIN"], ["HR"]), true);
  assert.equal(canManageAccount(["SUPER_ADMIN"], ["ADMIN", "SUPER_ADMIN"]), true);
  for (const p of PERMISSION_CODES.filter((x) => !["ADMIN", "HR", "SUPER_ADMIN"].includes(x))) assert.equal(canManageAccount([p], ["SALES"]), false, `${p} không quản ai`);
});

test("tuDoiQuyenCuaMinh (chủ dự án 2026-10-01): tự gán vai làm đổi quyền của chính mình → true (màn hình báo trước, không lưu gì); đổi vai mà quyền giữ nguyên → false", () => {
  // Toàn quyền (vai IT: ADMIN + SUPER_ADMIN) tự thêm vai Hành chính nhân sự → thêm HR → đổi quyền.
  assert.equal(tuDoiQuyenCuaMinh(["ADMIN", "SUPER_ADMIN"], assignment(["IT", "HR_STAFF"])), true);
  // Đổi từ Giám đốc + cộng tay Toàn quyền sang IT (cùng ADMIN + SUPER_ADMIN) → quyền không đổi (ADR-0044) → được.
  assert.equal(tuDoiQuyenCuaMinh(["ADMIN", "SUPER_ADMIN"], assignment(["IT"])), false);
  // Thứ tự không quan trọng.
  assert.equal(tuDoiQuyenCuaMinh(["SUPER_ADMIN", "ADMIN"], assignment(["IT"])), false);
  // Cộng/bớt tay cũng tính.
  assert.equal(tuDoiQuyenCuaMinh(["ADMIN", "SUPER_ADMIN"], assignment(["IT"], { removes: ["ADMIN"], reason: "thử" })), true);
});
