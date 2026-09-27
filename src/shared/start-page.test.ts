import assert from "node:assert/strict";
import { test } from "node:test";
import { homeRedirect } from "./start-page.ts";
import type { PermissionCode } from "./permissions.ts";

// `id` thật (không rỗng): seesAllOrders() của PARTNER sai là vì ô "own" không có `ownerId` để so — test ghim đúng điều đó,
// không dựa vào id rỗng tình cờ khớp.
const who = (...permissions: PermissionCode[]) => ({ id: "staff-1", permissions });

test("homeRedirect: tài khoản CHỈ Đối tác (PARTNER) tới \"/\" → đưa sang \"/orders\" (không có Trang chủ văn phòng)", () => {
  assert.equal(homeRedirect(who("PARTNER")), "/orders");
});

test("homeRedirect: vừa văn phòng vừa Đối tác → ở lại Trang chủ", () => {
  for (const office of ["SALES", "ACCOUNTING", "ADMIN", "SUPER_ADMIN"] as const) {
    assert.equal(homeRedirect(who(office, "PARTNER")), null, `${office}+PARTNER`);
  }
});

test("homeRedirect: nhân sự văn phòng → ở lại Trang chủ", () => {
  for (const office of ["SALES", "ACCOUNTING", "ADMIN", "SUPER_ADMIN"] as const) {
    assert.equal(homeRedirect(who(office)), null, office);
  }
});

test("homeRedirect: chỉ FIELD → giữ nguyên hành vi (không chuyển; Trang chủ hiện banner lỗi đã thiết kế)", () => {
  assert.equal(homeRedirect(who("FIELD")), null);
});

test("homeRedirect: FIELD + PARTNER → \"/orders\" (không phải văn phòng nhưng dùng được Đơn hàng)", () => {
  assert.equal(homeRedirect(who("FIELD", "PARTNER")), "/orders");
});

test("homeRedirect: không có quyền nào → không chuyển", () => {
  assert.equal(homeRedirect(who()), null);
});

test("homeRedirect: chỉ INTERN (Thực tập) → \"/orders\" (không có Trang chủ văn phòng)", () => {
  assert.equal(homeRedirect(who("INTERN")), "/orders");
});
