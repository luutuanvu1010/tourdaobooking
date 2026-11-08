// ADR-0169: vai «Quản lý bán hàng». Đ1 (hai ô mới), Đ2 (Bán hàng không bị rút), Đ3 (Nhân sự không gán, không gỡ; Quản trị, Giám đốc, Toàn quyền được).
import { test } from "node:test";
import assert from "node:assert/strict";
import { MATRIX, can, type PermissionCode } from "./permissions.ts";
import { ROLES, canManageAccount, defaultPermissions, highPermissionProblem, roleAssignmentProblem, type RoleAssignment, type RoleCode } from "./roles.ts";
import { GOI_CHINH } from "./muc-giao-dien-goi.ts";
import { TRANG } from "./muc-giao-dien.ts";

const nguoi = (...permissions: PermissionCode[]) => ({ id: "a", permissions });
const VAI_MOI = ["SALES", "SALES_MANAGER"] as PermissionCode[];
const gan = (roles: RoleCode[], adds: PermissionCode[] = [], removes: PermissionCode[] = []): RoleAssignment => ({ roles, adds, removes, reason: adds.length || removes.length ? "thử" : null });
const xet = (nguoiLam: "HR" | "ADMIN" | "SUPER", tu: { roles: RoleCode[]; adds?: PermissionCode[] }, toi: RoleAssignment) =>
  roleAssignmentProblem({
    actorIsSuper: nguoiLam === "SUPER",
    actorLaQuanTri: nguoiLam !== "HR",
    currentRoles: tu.roles,
    currentPermissions: [...new Set([...defaultPermissions(tu.roles), ...(tu.adds ?? [])])],
    currentAdjustments: { adds: tu.adds ?? [], removes: [] },
    next: toi,
  });

test("Đ1: vai sinh Bán hàng + Quản lý bán hàng; nội bộ; không quyền tiền", () => {
  assert.deepEqual([...ROLES.SALES_MANAGER.defaults], VAI_MOI);
  assert.equal(ROLES.SALES_MANAGER.group, "INTERNAL");
  assert.equal(ROLES.SALES_MANAGER.superAdminOnly, false);
  for (const o of ["ledger.write", "payment.refund", "order.complete", "accounting.entry.mark"] as const) assert.equal(MATRIX[o].SALES_MANAGER, "none", o);
});

// ADR-0186 (chủ duyệt 8/11): thêm ô thứ ba `catalog.sync` — «Đồng bộ ngay từ Google Sheet» chỉ lấy giá đang có ở Sheet về, không sửa giá trong Nền tảng.
test("Đ1 + ADR-0186: cột mới chỉ có ba ô nghiệp vụ và các ô tự phục vụ; không ô đơn, tiền, tài khoản, sửa giá nào", () => {
  const co = Object.entries(MATRIX).filter(([, r]) => r.SALES_MANAGER !== "none").map(([o]) => o).sort();
  assert.deepEqual(co, [
    "assistant.ask", "catalog.confirm_flag.write", "catalog.hidden.write", "catalog.sync", "feedback.submit", "feedback.view", "me.favorites.write", "party.document.view", "party.erasure.request",
    "party.self.submit",
    "party.self.view",
  ]);
});

test("Đ1, Đ2: Bán hàng thường không có hai ô mới nhưng giữ nguyên việc cũ; Quản trị, Toàn quyền có", () => {
  for (const o of ["catalog.confirm_flag.write", "catalog.hidden.write"] as const) {
    assert.equal(can(nguoi("SALES"), o), false, `Bán hàng ${o}`);
    assert.equal(can(nguoi(...VAI_MOI), o), true, `Quản lý ${o}`);
    assert.equal(can(nguoi("ADMIN"), o), true, `Quản trị ${o}`);
    assert.equal(can(nguoi("SUPER_ADMIN"), o), true, `Toàn quyền ${o}`);
    assert.equal(can(nguoi("HR"), o), false, `Nhân sự ${o}`);
    assert.equal(can(nguoi("ACCOUNTING"), o), false, `Kế toán ${o}`);
  }
  for (const o of ["sales.block.write", "catalog.attribute.assign", "ve.kho.manage", "order.leg.short_notice", "trip.dispatch"] as const) assert.equal(can(nguoi("SALES"), o), true, o);
});

test("Đ1: vai mới không đổi được công tắc tự kiểm vé, không vào màn sửa giá", () => {
  assert.equal(can(nguoi(...VAI_MOI), "settings.ops"), false);
  assert.equal(can(nguoi(...VAI_MOI), "admin.manage"), false);
});

test("Đ3: Nhân sự không gán, không gỡ vai", () => {
  assert.equal(xet("HR", { roles: ["SALES_STAFF"] }, gan(["SALES_MANAGER"]))?.forbidden, true, "gán");
  assert.equal(xet("HR", { roles: ["SALES_MANAGER"] }, gan(["SALES_STAFF"]))?.forbidden, true, "gỡ");
  assert.equal(xet("HR", { roles: [] }, gan(["SALES_MANAGER"]))?.forbidden, true, "tạo tài khoản mang vai");
});

test("Đ3: Nhân sự không cộng, bớt tay mã quyền, kể cả dòng chỉnh tay chưa có hiệu lực", () => {
  assert.equal(xet("HR", { roles: ["SALES_STAFF"] }, gan(["SALES_STAFF"], ["SALES_MANAGER"]))?.forbidden, true, "cộng tay");
  assert.equal(xet("HR", { roles: ["SALES_MANAGER"] }, gan(["SALES_MANAGER"], [], ["SALES_MANAGER"]))?.forbidden, true, "bớt tay");
  assert.equal(xet("HR", { roles: ["SALES_STAFF"], adds: ["SALES_MANAGER"] }, gan(["SALES_STAFF"]))?.forbidden, true, "gỡ dòng cộng tay");
});

test("Đ3: Nhân sự vẫn gán vai thường và giữ nguyên tài khoản đang mang vai mới", () => {
  assert.equal(xet("HR", { roles: ["SALES_STAFF"] }, gan(["SALES_STAFF", "GUIDE_INTERNAL"])), null, "vai thường");
  assert.equal(xet("HR", { roles: ["SALES_MANAGER"] }, gan(["SALES_MANAGER", "GUIDE_INTERNAL"])), null, "thêm vai thường, không chạm vai mới");
});

test("Đ3: Quản trị (kể cả Giám đốc, Điều hành chung vì giữ ADMIN) và Toàn quyền được gán, gỡ, chỉnh tay", () => {
  assert.ok(ROLES.DIRECTOR.defaults.includes("ADMIN"));
  assert.ok(ROLES.OPERATIONS_MANAGER.defaults.includes("ADMIN"));
  for (const ai of ["ADMIN", "SUPER"] as const) {
    assert.equal(xet(ai, { roles: ["SALES_STAFF"] }, gan(["SALES_MANAGER"])), null, `${ai} gán`);
    assert.equal(xet(ai, { roles: ["SALES_MANAGER"] }, gan(["SALES_STAFF"])), null, `${ai} gỡ`);
    assert.equal(xet(ai, { roles: ["SALES_STAFF"] }, gan(["SALES_STAFF"], ["SALES_MANAGER"])), null, `${ai} cộng tay`);
  }
});

test("Đ3: đường quyền cũ và tạo tài khoản không vai: thiếu cờ Quản trị thì từ chối (mặc định đóng)", () => {
  assert.equal(highPermissionProblem(false, [], VAI_MOI)?.forbidden, true, "vắng cờ");
  assert.equal(highPermissionProblem(false, [], VAI_MOI, false)?.forbidden, true, "Nhân sự tạo");
  assert.equal(highPermissionProblem(false, VAI_MOI, ["SALES"], false)?.forbidden, true, "Nhân sự gỡ");
  assert.equal(highPermissionProblem(false, [], VAI_MOI, true), null, "Quản trị");
  assert.equal(highPermissionProblem(true, [], VAI_MOI), null, "Toàn quyền");
  assert.equal(highPermissionProblem(false, ["SALES"], ["SALES", "FIELD"], false), null, "quyền thường không bị ảnh hưởng");
});

test("Đ3: Quản trị và Nhân sự vẫn quản lý được tài khoản mang vai mới (không đưa vào cấp chỉ Toàn quyền)", () => {
  assert.equal(canManageAccount(["ADMIN"], VAI_MOI), true);
  assert.equal(canManageAccount(["HR"], VAI_MOI), true);
});

test("Đ4: mục Dịch vụ & giá hiện cho Quản lý bán hàng, Quản trị, Toàn quyền; không cho Bán hàng, Nhân sự, tài khoản giữ Đối tác", () => {
  const hien = TRANG.dichVu.hien;
  assert.equal(hien(nguoi(...VAI_MOI)), true);
  assert.equal(hien(nguoi("ADMIN")), true);
  assert.equal(hien(nguoi("SUPER_ADMIN")), true);
  assert.equal(hien(nguoi("SALES")), false);
  assert.equal(hien(nguoi("HR")), false);
  assert.equal(hien(nguoi("SALES", "SALES_MANAGER", "PARTNER")), false);
  assert.equal(hien(nguoi("SALES_MANAGER")), false, "bị bớt tay Bán hàng thì không qua cổng office");
  assert.equal(GOI_CHINH.dichVu, "GET /api/catalog/quan-ly-ban");
});
