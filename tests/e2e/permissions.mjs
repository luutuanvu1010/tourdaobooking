// Bản đồ quyền ADR-0007 trên route thật: FIELD chỉ dùng việc được giao (không đơn/tiền/hồ sơ), ACCOUNTING xem nhưng không lập đơn,
// SALES chỉ nhật ký đơn của mình, ADMIN mọi thứ; quyền đổi có hiệu lực ngay; tài khoản nhiều quyền hợp các ô.
import assert from "node:assert/strict";
import { ACCOUNTS, call, orderInput, randomPhone, session } from "./lib.mjs";

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

// --- tài khoản nhiều quyền hợp các ô; quyền đổi có hiệu lực NGAY với phiên đang mở
const phone = randomPhone();
r = await call(ADMIN, "POST", "/api/staff", { fullName: "Nhiều Quyền Thử", phone, permissions: ["FIELD", "ACCOUNTING"] });
assert.equal(r.status, 201, JSON.stringify(r.body));
assert.deepEqual(r.body.staff.permissions, ["ACCOUNTING", "FIELD"], "thứ tự chuẩn hoá");
const M = { id: r.body.staff.id };
const MC = (await call(null, "POST", "/api/auth/login", { phone, pin: r.body.pin })).cookie;
assert.equal((await call(MC, "GET", "/api/orders")).status, 200, "FIELD + ACCOUNTING = văn phòng");
assert.equal((await call(MC, "POST", "/api/orders", orderInput())).status, 403);
assert.equal((await call(ADMIN, "PUT", `/api/staff/${M.id}/permissions`, { permissions: ["FIELD"] })).status, 200);
assert.equal((await call(MC, "GET", "/api/orders")).status, 403, "bỏ ACCOUNTING → mất quyền xem đơn ngay");
assert.equal((await call(ADMIN, "PUT", `/api/staff/${M.id}/permissions`, { permissions: ["SALES", "FIELD"] })).status, 200);
assert.equal((await call(MC, "POST", "/api/orders", orderInput())).status, 201, "thêm SALES → lập đơn được ngay");
assert.equal((await call(ADMIN, "PATCH", `/api/staff/${M.id}`, { active: false })).status, 200);
console.log("✓ nhiều quyền + hiệu lực ngay");
console.log("E2E PERMISSIONS OK");
