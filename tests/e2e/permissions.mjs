// Bản đồ quyền ADR-0007 trên route thật: FIELD chỉ dùng việc được giao (không đơn/tiền/hồ sơ), ACCOUNTING xem nhưng không lập đơn,
// SALES chỉ nhật ký đơn của mình, ADMIN mọi thứ; quyền đổi có hiệu lực ngay; tài khoản nhiều quyền hợp các ô.
import assert from "node:assert/strict";
import { ACCOUNTS, call, ensureFakeCatalog, login, orderInput, randomPhone, session } from "./lib.mjs";

await ensureFakeCatalog(); // orderInput() dùng dịch vụ danh mục giả ZE1 (API không nhận dịch vụ nhập tay mới — 2026-09-26)

const SALES = await session(ACCOUNTS.salesA);
const SALES_B = await session(ACCOUNTS.salesB);
const ADMIN = await session(ACCOUNTS.admin);
const ACC = await session(ACCOUNTS.accountant);
const FIELD = await session(ACCOUNTS.field);

// một đơn của salesA để thử xem/sửa
let r = await call(SALES, "POST", "/api/orders", orderInput());
assert.equal(r.status, 201, JSON.stringify(r.body));
const order = r.body.order;

// --- /me trả quyền và hồ sơ
for (const [cookie, perms] of [[SALES, ["SALES"]], [ADMIN, ["ADMIN"]], [ACC, ["ACCOUNTING"]], [FIELD, ["FIELD"]]]) {
  r = await call(cookie, "GET", "/api/auth/me");
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.staff.permissions, perms);
  assert.ok(r.body.staff.partyId, "tài khoản seed phải có hồ sơ");
}
console.log("✓ /me trả quyền + hồ sơ");

// --- FIELD: chặn mặc định mọi bề mặt đơn/tiền/hồ sơ/quản trị (R-N1-15); vẫn đọc được địa điểm
const fieldDenied = [
  ["GET", "/api/orders"], ["GET", `/api/orders/${order.id}`], ["POST", "/api/orders", orderInput()], ["PUT", `/api/orders/${order.id}`, orderInput()],
  ["PUT", `/api/orders/${order.id}/trip`, {}], ["POST", `/api/orders/${order.id}/status`, { status: "cancelled" }], ["GET", "/api/catalog"],
  ["GET", "/api/parties"], ["GET", "/api/parties/meta"], ["GET", "/api/parties/lookup?phone=0901234567"], ["POST", "/api/parties", { kind: "PERSON", fullName: "A" }],
  ["GET", "/api/staff"], ["GET", "/api/audit"], ["POST", "/api/locations", {}],
];
for (const [method, path, body] of fieldDenied) {
  r = await call(FIELD, method, path, body);
  assert.equal(r.status, 403, `FIELD ${method} ${path} → ${r.status}`);
}
assert.equal((await call(FIELD, "GET", "/api/locations")).status, 200);
assert.equal((await call(null, "GET", "/api/orders")).status, 401);
console.log("✓ FIELD bị chặn mọi bề mặt đơn/tiền/hồ sơ/quản trị (mặc định từ chối)");

// --- Trang chủ (dashboard) là số toàn công ty: cổng "orders" chỉ lọc thô, phải có can(order.view/money.view/contact.view) trong thân (ADR-0019 B4, 2026-09-26).
// Đối tác và Thực tập chỉ thấy đơn của mình ⇒ 403 (không phải 200 với số toàn công ty); Bán hàng vẫn 200.
for (const [perm, nhan] of [["PARTNER", "Đối tác"], ["INTERN", "Thực tập"]]) {
  const p = randomPhone();
  r = await call(ADMIN, "POST", "/api/staff", { fullName: `${nhan} Trang Chủ Thử`, phone: p, permissions: [perm] });
  assert.equal(r.status, 201, `${nhan}: ${JSON.stringify(r.body)}`);
  const cookie = (await login(p, r.body.pin)).cookie;
  r = await call(cookie, "GET", "/api/orders/dashboard");
  assert.equal(r.status, 403, `${nhan} GET /api/orders/dashboard → ${r.status} (phải 403: không xem được số toàn công ty)`);
  assert.equal(r.body.error.code, "forbidden");
}
assert.equal((await call(SALES, "GET", "/api/orders/dashboard")).status, 200, "Bán hàng vẫn xem Trang chủ");
console.log("✓ Đối tác, Thực tập: Trang chủ (dashboard) 403; Bán hàng 200");

// --- ACCOUNTING: xem đơn/nhật ký/bảng giá/hồ sơ; KHÔNG lập/sửa/huỷ đơn; không quản trị
assert.equal((await call(ACC, "GET", "/api/orders")).status, 200);
assert.equal((await call(ACC, "GET", "/api/catalog")).status, 200);
r = await call(ACC, "GET", `/api/orders/${order.id}`);
assert.equal(r.status, 200); assert.ok(r.body.history.length >= 1, "kế toán xem nhật ký mọi đơn (đối chiếu tiền)"); assert.equal(r.body.canModify, false);
assert.equal((await call(ACC, "POST", "/api/orders", orderInput())).status, 403, "kế toán không lập đơn");
assert.equal((await call(ACC, "PUT", `/api/orders/${order.id}`, orderInput())).status, 403);
assert.equal((await call(ACC, "POST", `/api/orders/${order.id}/status`, { status: "cancelled" })).status, 403);
assert.equal((await call(ACC, "POST", "/api/parties", { kind: "PERSON", fullName: "Khách Kế Toán Tạo" })).status, 201, "kế toán tạo hồ sơ khách");
for (const [method, path, body] of [["GET", "/api/staff"], ["GET", "/api/audit"], ["POST", "/api/locations", {}], ["GET", "/api/catalog/admin"]]) {
  assert.equal((await call(ACC, method, path, body)).status, 403, `ACCOUNTING ${method} ${path}`);
}
console.log("✓ ACCOUNTING xem, không lập/sửa đơn, không quản trị");

// --- SALES: nhật ký chỉ của mình; ADMIN xem và sửa mọi đơn
assert.equal((await call(SALES_B, "GET", `/api/orders/${order.id}`)).body.history.length, 0);
assert.ok((await call(SALES, "GET", `/api/orders/${order.id}`)).body.history.length >= 1);
r = await call(ADMIN, "GET", `/api/orders/${order.id}`);
assert.ok(r.body.history.length >= 1); assert.equal(r.body.canModify, true);
assert.equal((await call(SALES_B, "PUT", `/api/orders/${order.id}`, orderInput())).status, 403);
console.log("✓ SALES nhật ký của mình, ADMIN mọi đơn");

// --- người phụ trách (ADR-0009): quyền theo người phụ trách HIỆN TẠI của đơn — đủ sáu vai trên route thật (đơn của A, người phụ trách là B)
// Dò không phá dữ liệu: PUT /handler sang CHÍNH người đang phụ trách → người có quyền nhận 409 no_change, người không có quyền nhận 403.
const meA = (await call(SALES, "GET", "/api/auth/me")).body.staff;
const meB = (await call(SALES_B, "GET", "/api/auth/me")).body.staff;
const meAdmin = (await call(ADMIN, "GET", "/api/auth/me")).body.staff;
// Từ ADR-0030 S20-4 đơn mới không tự gắn người lập: người lập Nhận tường minh để đơn "đã có người phụ trách" (điều các dòng dưới cần).
assert.equal((await call(SALES, "PUT", `/api/orders/${order.id}/handler`, { staffId: meA.id })).status, 200, "người lập Nhận đơn của mình");
r = await call(SALES_B, "PUT", `/api/orders/${order.id}/handler`, { staffId: meB.id });
assert.equal(r.status, 409, "B (SALES) chưa phải người phụ trách và đơn đã có người phụ trách → không tự nhận được: thua đua, 409 stale");
assert.equal(r.body.error.code, "stale");
assert.equal((await call(SALES, "PUT", `/api/orders/${order.id}/handler`, { staffId: meB.id })).status, 200, "người lập giao cho B");
const probe = async (cookie) => (await call(cookie, "PUT", `/api/orders/${order.id}/handler`, { staffId: meB.id })).status;
assert.deepEqual(
  [await probe(SALES_B), await probe(SALES), await probe(ADMIN), await probe(ACC), await probe(FIELD)],
  [409, 409, 409, 403, 403],
  "quyền đổi người phụ trách: người phụ trách hiện tại, người lập (đã giao lại), quản trị được; kế toán, FIELD không",
);
const seen = async (cookie) => {
  const d = (await call(cookie, "GET", `/api/orders/${order.id}`)).body;
  return [d.canModify, d.history.length > 0];
};
assert.deepEqual(
  [await seen(SALES_B), await seen(SALES), await seen(ADMIN), await seen(ACC)],
  [[true, true], [true, true], [true, true], [false, true]],
  "canModify + nhật ký: người phụ trách, người lập, quản trị đủ quyền; kế toán chỉ xem nhật ký",
);
assert.equal((await call(ACC, "PUT", `/api/orders/${order.id}/handler`, { staffId: meB.id })).status, 403);
assert.equal((await call(SALES_B, "PUT", `/api/orders/${order.id}/handler`, { staffId: (await call(ACC, "GET", "/api/auth/me")).body.staff.id })).status, 400, "không giao cho kế toán (không sửa được đơn)");
assert.equal((await call(SALES_B, "PUT", `/api/orders/${order.id}/handler`, { staffId: (await call(FIELD, "GET", "/api/auth/me")).body.staff.id })).status, 200, "FIELD nay giao được (ADR-0014 điều 6, cấp hẹp)");
console.log("✓ người phụ trách: đủ sáu vai (canModify, nhật ký, đổi người phụ trách) trên route thật");

// --- tài khoản nhiều quyền hợp các ô; quyền đổi có hiệu lực NGAY với phiên đang mở
const phone = randomPhone();
r = await call(ADMIN, "POST", "/api/staff", { fullName: "Nhiều Quyền Thử", phone, permissions: ["FIELD", "ACCOUNTING"] });
assert.equal(r.status, 201, JSON.stringify(r.body));
assert.deepEqual(r.body.staff.permissions, ["ACCOUNTING", "FIELD"], "thứ tự chuẩn hoá");
const M = { id: r.body.staff.id };
const MC = (await login(phone, r.body.pin)).cookie;
assert.equal((await call(MC, "GET", "/api/orders")).status, 200, "FIELD + ACCOUNTING = văn phòng");
assert.equal((await call(MC, "POST", "/api/orders", orderInput())).status, 403);
assert.equal((await call(ADMIN, "PUT", `/api/staff/${M.id}/permissions`, { permissions: ["FIELD"] })).status, 200);
assert.equal((await call(MC, "GET", "/api/orders")).status, 403, "bỏ ACCOUNTING → mất quyền xem đơn ngay");
assert.equal((await call(ADMIN, "PUT", `/api/staff/${M.id}/permissions`, { permissions: ["SALES", "FIELD"] })).status, 200);
// Lập kèm CHÍNH MÌNH làm người phụ trách (ADR-0030 S20-4 — đơn mới không tự gắn người lập) để ca "người phụ trách đã nghỉ" ở dưới giữ đúng nghĩa.
r = await call(MC, "POST", "/api/orders", orderInput({ handlerStaffId: M.id }));
assert.equal(r.status, 201, `thêm SALES → lập đơn được ngay: ${JSON.stringify(r.body)}`);
const mOrder = r.body.order;
assert.equal((await call(MC, "PUT", `/api/orders/${order.id}/handler`, { staffId: M.id })).status, 409, "SALES không liên quan không tự nhận được đơn đã có người phụ trách (409 stale, không phải 403)");
assert.equal((await call(MC, "PUT", `/api/orders/${order.id}/handler`, { staffId: meB.id })).status, 403, "còn GIAO HỘ người khác khi không phải người lập/người phụ trách thì vẫn là vượt quyền");
assert.equal((await call(MC, "PUT", `/api/orders/${order.id}`, orderInput({ expectedUpdatedAt: order.updatedAt }))).status, 403, "và không sửa được đơn đó");
assert.equal((await call(ADMIN, "PATCH", `/api/staff/${M.id}`, { active: false })).status, 200);
// người phụ trách đã nghỉ: quản trị giao lại đơn của họ (nếu không giao lại thì R-DSP-2b cảnh báo ở cuối e2e — chỉ cảnh báo, không làm đỏ --strict)
assert.equal((await call(ADMIN, "PUT", `/api/orders/${mOrder.id}/handler`, { staffId: meAdmin.id })).status, 200, "giao lại đơn của người đã nghỉ");
assert.deepEqual((await call(ADMIN, "GET", `/api/dispatch/handlers?orderIds=${mOrder.id}`)).body.handlers[mOrder.id].staffId, meAdmin.id);
console.log("✓ nhiều quyền + hiệu lực ngay");
console.log("E2E PERMISSIONS OK");
