// ADR-0176: Quản trị gán được mọi vai trừ vai sinh Toàn quyền (IT). Nhân sự giữ các chặn cũ.
import { test } from "node:test";
import assert from "node:assert/strict";
import type { PermissionCode } from "./permissions.ts";
import { ROLE_CODES, ROLES, defaultPermissions, highPermissionProblem, roleAssignmentProblem, vaiQuanTriGanDuoc, type RoleAssignment, type RoleCode } from "./roles.ts";

const gan = (roles: RoleCode[], adds: PermissionCode[] = []): RoleAssignment => ({ roles, adds, removes: [], reason: adds.length ? "thử" : null });
const xet = (nguoiLam: "HR" | "ADMIN" | "SUPER", tu: RoleCode[], toi: RoleAssignment) =>
  roleAssignmentProblem({
    actorIsSuper: nguoiLam === "SUPER",
    actorLaQuanTri: nguoiLam !== "HR",
    currentRoles: tu,
    currentPermissions: defaultPermissions(tu),
    currentAdjustments: { adds: [], removes: [] },
    next: toi,
  });

test("Quản trị gán được mọi vai nội bộ trừ IT", () => {
  for (const r of ["ACCOUNTANT", "DIRECTOR", "OPERATIONS_MANAGER", "HR_STAFF", "SALES_STAFF", "SALES_MANAGER"] as RoleCode[]) {
    assert.equal(xet("ADMIN", ["SALES_STAFF"], gan(["SALES_STAFF", r])), null, r);
  }
  assert.equal(xet("ADMIN", ["SALES_STAFF"], gan(["SALES_STAFF", "IT"]))?.forbidden, true, "IT sinh Toàn quyền");
});

test("Quản trị gỡ được vai Kế toán khỏi tài khoản", () => {
  assert.equal(xet("ADMIN", ["SALES_STAFF", "ACCOUNTANT"], gan(["SALES_STAFF"])), null);
});

test("Quản trị không cộng tay Toàn quyền, nhưng cộng tay Kế toán được", () => {
  assert.equal(xet("ADMIN", ["SALES_STAFF"], gan(["SALES_STAFF"], ["SUPER_ADMIN"]))?.forbidden, true);
  assert.equal(xet("ADMIN", ["SALES_STAFF"], gan(["SALES_STAFF"], ["ACCOUNTING"])), null);
});

test("Nhân sự (không giữ Quản trị) vẫn bị chặn như cũ", () => {
  for (const r of ["ACCOUNTANT", "DIRECTOR", "OPERATIONS_MANAGER", "HR_STAFF", "IT"] as RoleCode[]) {
    assert.equal(xet("HR", ["SALES_STAFF"], gan(["SALES_STAFF", r]))?.forbidden, true, r);
  }
});

test("Toàn quyền vẫn gán được mọi vai", () => {
  for (const r of ROLE_CODES.filter((x) => ROLES[x].group === "INTERNAL")) assert.equal(xet("SUPER", ["SALES_STAFF"], gan([r])), null, r);
});

test("highPermissionProblem: Quản trị cấp Kế toán, Quản trị, Nhân sự được; Toàn quyền thì không", () => {
  for (const p of ["ACCOUNTING", "ADMIN", "HR"] as PermissionCode[]) assert.equal(highPermissionProblem(false, ["SALES"], ["SALES", p], true), null, p);
  assert.equal(highPermissionProblem(false, ["SALES"], ["SALES", "SUPER_ADMIN"], true)?.forbidden, true);
  assert.equal(highPermissionProblem(false, ["SALES"], ["SALES", "ACCOUNTING"], false)?.forbidden, true, "Nhân sự vẫn bị chặn");
});

test("vaiQuanTriGanDuoc: một nguồn cho giao diện, chỉ IT bị loại", () => {
  assert.deepEqual(ROLE_CODES.filter((r) => !vaiQuanTriGanDuoc(r)), ["IT"]);
});
