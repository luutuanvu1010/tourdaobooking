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

test("homeRedirect: chỉ FIELD → \"/orders\" (ADR-0030 S23-4/S23-5: qua cổng orders, danh sách = đơn mình phụ trách; không xem được Trang chủ toàn công ty)", () => {
  assert.equal(homeRedirect(who("FIELD")), "/orders");
});

test("homeRedirect: FIELD kèm văn phòng → ở lại Trang chủ (xem được mọi đơn qua quyền văn phòng)", () => {
  for (const office of ["SALES", "ACCOUNTING", "ADMIN", "SUPER_ADMIN"] as const) assert.equal(homeRedirect(who("FIELD", office)), null, `FIELD+${office}`);
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
