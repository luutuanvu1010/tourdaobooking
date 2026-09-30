import assert from "node:assert/strict";
import { test } from "node:test";
import { TRANG_CUOC, TRANG_DAU_TAI_XE, chiTaiXe, coCuocCuaToi, coMucDonHang, coPhanTaiXe, homeRedirect } from "./start-page.ts";
import { MATRIX, PERMISSION_CODES, can, canAccessOrders, seesAllOrders, type PermissionCode } from "./permissions.ts";
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
// ADR-0049 Q5 (điều phối vòng 3, 29/9): tài xế CÔNG TY (DRIVER) mở app vào "Cuốc của tôi" (/cuoc — bản vẽ Bảng điều phối 04, tab mở đầu); "/tai-xe" giữ
// giấy tờ ("Trang chủ" của tài xế). Tài xế đối tác (DRIVER_PARTNER) chưa dùng chuyến (ADR-0049 D3 × ADR-0048 D2) — vẫn /tai-xe.
test("homeRedirect: chỉ Tài xế (DRIVER) → \"Cuốc của tôi\" /cuoc (Q5) — trang có thật (không 404), không phải Trang chủ (không vòng, không gọi dashboard đơn)", () => {
  assert.equal(TRANG_DAU_TAI_XE, "/tai-xe", "màn giấy tờ của tài xế (bản vẽ Vận chuyển 07) — nay là tab \"Trang chủ\" của tài xế");
  assert.equal(TRANG_CUOC, "/cuoc");
  for (const t of [TRANG_DAU_TAI_XE, TRANG_CUOC]) assert.ok(PAGES.includes(t), `${t} phải là trang có thật của app (PAGES — src/shared/sw-policy.test.ts đối chiếu public/*.html)`);
  assert.notEqual(TRANG_CUOC, "/", "không vòng về Trang chủ");
  assert.equal(homeRedirect(who("DRIVER")), TRANG_CUOC);
  assert.equal(homeRedirect(who("DRIVER", "DRIVER")), TRANG_CUOC);
  assert.equal(coCuocCuaToi(who("DRIVER")), true);
  assert.equal(coCuocCuaToi(who("DRIVER_PARTNER")), false, "tài xế đối tác chưa có Cuốc của tôi");
  assert.equal(coCuocCuaToi(who("SALES")), false);
  assert.deepEqual([chiTaiXe(who("DRIVER")), chiTaiXe(who("DRIVER_PARTNER")), chiTaiXe(who("DRIVER", "SALES")), chiTaiXe(who("SALES"))], [true, true, false, false]);
  for (const office of ["SALES", "ACCOUNTING", "ADMIN", "SUPER_ADMIN"] as const) assert.equal(homeRedirect(who("DRIVER", office)), null, `DRIVER+${office}`);
  for (const p of ["FIELD", "PARTNER", "INTERN"] as const) assert.equal(homeRedirect(who(p, "DRIVER")), "/orders", `${p}+DRIVER`);
});

// ADR-0048 D2 (giả định I2/G1 của kế hoạch — đã được điều phối chấp nhận): tài khoản chỉ Tài xế đối tác cũng không qua cổng orders; ở lại Trang chủ thì gọi
// dashboard đơn và nhận 403 — đưa tới CÙNG trang đầu tài xế /tai-xe (trang chỉ gọi GET /api/parties/documents/mine).
test("homeRedirect: chỉ Tài xế đối tác (DRIVER_PARTNER) → /tai-xe; kèm văn phòng → Trang chủ; kèm FIELD → /orders (hai tổ hợp sau bất hợp lệ theo LC-1b, hàm thuần vẫn đúng công thức)", () => {
  assert.equal(homeRedirect(who("DRIVER_PARTNER")), TRANG_DAU_TAI_XE);
  assert.equal(homeRedirect(who("DRIVER_PARTNER", "SALES")), null);
  assert.equal(homeRedirect(who("DRIVER_PARTNER", "FIELD")), "/orders");
  assert.equal(coPhanTaiXe(who("DRIVER")), true);
  assert.equal(coPhanTaiXe(who("DRIVER_PARTNER")), true);
  assert.equal(coPhanTaiXe(who("PARTNER")), false);
  assert.equal(coPhanTaiXe(who("SALES", "FIELD")), false);
});

test("homeRedirect: 512 tập con quyền — tập KHÔNG có phần tài xế (DRIVER hoặc DRIVER_PARTNER) cho đúng kết quả cũ; trang đầu tài xế chỉ khi có phần tài xế và không xem đơn nào", () => {
  const cu = (w: { id: string; permissions: PermissionCode[] }) => (!seesAllOrders(w) && canAccessOrders(w) ? "/orders" : null); // công thức trước ADR-0040, chép nguyên
  let n = 0;
  for (let mask = 0; mask < 1 << PERMISSION_CODES.length; mask++, n++) {
    const w = who(...PERMISSION_CODES.filter((_, i) => mask & (1 << i)));
    const coTaiXe = coPhanTaiXe(w);
    const kyVong = !coTaiXe || seesAllOrders(w) || canAccessOrders(w) ? cu(w) : w.permissions.includes("DRIVER") ? TRANG_CUOC : TRANG_DAU_TAI_XE;
    assert.equal(homeRedirect(w), kyVong, w.permissions.join("+") || "(không quyền)");
  }
  assert.equal(n, 512);
});

// L3 (lỗi báo 30/9): Đối tác, Thực tập trên điện thoại không có đường về danh sách đơn của mình (thanh tab chỉ "Tạo đơn" + "Tôi").
const coMuc = (...permissions: PermissionCode[]) => {
  const w = who(...permissions);
  return coMucDonHang({ seesAll: seesAllOrders(w), canCreate: can(w, "order.create") });
};
test("coMucDonHang: văn phòng xem mọi đơn, Đối tác, Thực tập (lập đơn → xem đơn mình) có mục \"Đơn hàng\"; HDV chỉ-FIELD, tài xế thì không", () => {
  for (const c of ["SALES", "ACCOUNTING", "ADMIN", "SUPER_ADMIN", "PARTNER", "INTERN"] as const) assert.equal(coMuc(c), true, c);
  assert.equal(coMuc("FIELD", "INTERN"), true, "lai HDV + Thực tập");
  for (const c of ["FIELD", "DRIVER", "DRIVER_PARTNER"] as const) assert.equal(coMuc(c), false, c);
});

// Mục "Đơn hàng" suy từ hai cờ của bản nhớ khung (ADR-0035 — không thêm trường). Chỉ an toàn khi "lập được đơn" kéo theo "mở được danh sách đơn của mình":
// GET /api/orders nhánh (2) "mình lập" hỏi order.view + money.view + contact.view với { ownerId: chính mình } (orders/index.ts). Bản đồ đổi làm lệch → đỏ.
test("coMucDonHang an toàn: mọi mã quyền lập được đơn đều mở được danh sách đơn mình lập (order.view, money.view, contact.view)", () => {
  for (const c of PERMISSION_CODES) {
    if (MATRIX["order.create"][c] === "none") continue;
    const w = { id: "toi", permissions: [c] };
    for (const op of ["order.view", "money.view", "contact.view"] as const) assert.equal(can(w, op, { ownerId: "toi" }), true, `${c} ${op}`);
  }
});
