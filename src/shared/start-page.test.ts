import assert from "node:assert/strict";
import { test } from "node:test";
import { TRANG_DAU_TAI_XE, homeRedirect } from "./start-page.ts";
import { PERMISSION_CODES, canAccessOrders, seesAllOrders, type PermissionCode } from "./permissions.ts";
import { PAGES } from "./sw-policy.ts";

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

// ADR-0040 D3 + Ruling R3, R10 (điều phối 2026-09-28): tài khoản chỉ có quyền Tài xế không qua cổng orders — ở lại Trang chủ thì web/home.ts sẽ gọi
// GET /api/orders/dashboard và nhận 403. Phần A tạm đưa sang trang Tài khoản (R10); Phần B dựng màn /tai-xe theo bản vẽ 07 và đổi hằng này sang "/tai-xe".
test("homeRedirect: chỉ Tài xế (DRIVER) → trang đầu của tài xế /tai-xe (màn 07 của bản vẽ, Phần B) — trang có thật (không 404), không phải Trang chủ (không vòng, không gọi dashboard đơn)", () => {
  assert.equal(TRANG_DAU_TAI_XE, "/tai-xe", "Phần B: màn /tai-xe đã dựng (bản vẽ 07) — thay trang Tài khoản tạm của Ruling R10");
  assert.ok(PAGES.includes(TRANG_DAU_TAI_XE), "trang đích phải là trang có thật của app (PAGES — src/shared/sw-policy.test.ts đối chiếu public/*.html)");
  assert.notEqual(TRANG_DAU_TAI_XE, "/", "không vòng về Trang chủ");
  assert.equal(homeRedirect(who("DRIVER")), TRANG_DAU_TAI_XE);
  assert.equal(homeRedirect(who("DRIVER", "DRIVER")), TRANG_DAU_TAI_XE);
  for (const office of ["SALES", "ACCOUNTING", "ADMIN", "SUPER_ADMIN"] as const) assert.equal(homeRedirect(who("DRIVER", office)), null, `DRIVER+${office}`);
  for (const p of ["FIELD", "PARTNER", "INTERN"] as const) assert.equal(homeRedirect(who(p, "DRIVER")), "/orders", `${p}+DRIVER`);
});

test("homeRedirect: 512 tập con quyền — tập KHÔNG có DRIVER cho đúng kết quả cũ; trang đầu tài xế chỉ khi có DRIVER và không xem đơn nào", () => {
  const cu = (w: { id: string; permissions: PermissionCode[] }) => (!seesAllOrders(w) && canAccessOrders(w) ? "/orders" : null); // công thức trước ADR-0040, chép nguyên
  let n = 0;
  for (let mask = 0; mask < 1 << PERMISSION_CODES.length; mask++, n++) {
    const w = who(...PERMISSION_CODES.filter((_, i) => mask & (1 << i)));
    const coTaiXe = w.permissions.includes("DRIVER");
    const kyVong = !coTaiXe || seesAllOrders(w) || canAccessOrders(w) ? cu(w) : TRANG_DAU_TAI_XE;
    assert.equal(homeRedirect(w), kyVong, w.permissions.join("+") || "(không quyền)");
  }
  assert.equal(n, 512);
});
