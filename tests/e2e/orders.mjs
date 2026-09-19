import assert from "node:assert/strict";
const B = "http://localhost:8787";
async function login(phone, pin) {
  const r = await fetch(`${B}/api/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phone, pin }) });
  assert.equal(r.status, 200);
  return r.headers.get("set-cookie").split(";")[0];
}
const call = async (cookie, method, path, body) => {
  const r = await fetch(B + path, { method, headers: { cookie: cookie ?? "", "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: await r.json().catch(() => null) };
};
const A = await login("0900000002", "246810");
const Bc = await login("0900000003", "135790");
const ADMIN = await login("0900000004", "112233");

// chưa đăng nhập
assert.equal((await call(null, "GET", "/api/orders")).status, 401);

const input = {
  customerName: "Nguyễn Văn A", customerPhone: "0901 234 567", customerEmail: "a@example.com",
  items: [{ description: "Tour Hòn Mun", detail: "20/09, 3 khách", quantity: 3, unitPrice: 450000 }, { description: "Áo phao", quantity: 1, unitPrice: 50000 }],
  discount: 100000, depositAmount: 500000, depositMethod: "cash",
  // client cố gian lận số dẫn xuất:
  total: 1, subtotal: 1, remainingAmount: 0,
};
let r = await call(A, "POST", "/api/orders", input);
assert.equal(r.status, 201, JSON.stringify(r.body));
const o = r.body.order;
console.log("tạo:", o.orderCode, o.subtotal, o.total, o.remainingAmount, o.status);
assert.match(o.orderCode, /^TD-\d{8}-\d{4}$/);
assert.equal(o.subtotal, 1400000); assert.equal(o.total, 1300000); assert.equal(o.remainingAmount, 800000);
assert.deepEqual(o.items.map((i) => i.lineTotal), [1350000, 50000]);

// nhân viên B xem được đơn của A
r = await call(Bc, "GET", `/api/orders/${o.id}`);
assert.equal(r.status, 200); assert.equal(r.body.order.staffName, "NV Bán A (test)");
assert.equal(r.body.history.length, 1);
r = await call(Bc, "GET", "/api/orders?q=Hòn"); // tìm theo tên khách không khớp dịch vụ → 0
r = await call(Bc, "GET", "/api/orders?q=" + encodeURIComponent("Nguyễn"));
assert.ok(r.body.orders.some((x) => x.id === o.id));
r = await call(Bc, "GET", "/api/orders?q=" + o.orderCode);
assert.equal(r.body.orders.length, 1);
r = await call(Bc, "GET", "/api/orders?q=%25"); // ký tự LIKE được escape
assert.equal(r.body.orders.length, 0);

// bất biến: giảm giá / cọc quá mức, số âm, chuỗi
for (const bad of [{ discount: 1400001 }, { depositAmount: 1300001 }, { discount: -1 }, { items: [{ description: "x", quantity: 1, unitPrice: "5" }] }, { items: [] }]) {
  r = await call(A, "POST", "/api/orders", { ...input, ...bad });
  assert.equal(r.status, 400, JSON.stringify(bad));
}

// PHÂN QUYỀN: B (sales, không phải người lập) xem được nhưng KHÔNG sửa/đổi trạng thái đơn của A
r = await call(Bc, "GET", `/api/orders/${o.id}`);
assert.equal(r.body.canModify, false);
r = await call(A, "GET", `/api/orders/${o.id}`);
assert.equal(r.body.canModify, true);
assert.equal((await call(Bc, "PUT", `/api/orders/${o.id}`, input)).status, 403);
assert.equal((await call(Bc, "POST", `/api/orders/${o.id}/status`, { status: "confirmed" })).status, 403);
assert.equal((await call(Bc, "POST", `/api/orders/${o.id}/status`, { status: "cancelled" })).status, 403);
assert.equal((await call(null, "PUT", `/api/orders/${o.id}`, input)).status, 401);
r = await call(A, "GET", `/api/orders/${o.id}`);
assert.equal(r.body.order.status, "draft"); assert.equal(r.body.history.length, 1); // bị từ chối → không đổi gì, không ghi log

// người lập đơn sửa draft
r = await call(A, "PUT", `/api/orders/${o.id}`, { ...input, items: [{ description: "Tour Bãi Tranh", quantity: 2, unitPrice: 300000 }], discount: 0, depositAmount: 0 });
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.order.total, 600000); assert.equal(r.body.order.remainingAmount, 600000); assert.equal(r.body.order.items.length, 1);
assert.equal(r.body.order.depositMethod, null);

// admin (không phải người lập) sửa được
r = await call(ADMIN, "PUT", `/api/orders/${o.id}`, { ...input, items: [{ description: "Tour Bãi Tranh", quantity: 2, unitPrice: 300000 }], discount: 0, depositAmount: 0, customerNote: "admin sửa" });
assert.equal(r.status, 200);

// xác nhận (người lập)
r = await call(A, "POST", `/api/orders/${o.id}/status`, { status: "confirmed" });
assert.equal(r.status, 200); assert.equal(r.body.order.status, "confirmed"); assert.ok(r.body.order.confirmedAt);
// không sửa được, không quay về draft, không xác nhận lại
assert.equal((await call(A, "PUT", `/api/orders/${o.id}`, input)).status, 409);
assert.equal((await call(A, "POST", `/api/orders/${o.id}/status`, { status: "draft" })).status, 400);
assert.equal((await call(A, "POST", `/api/orders/${o.id}/status`, { status: "confirmed" })).status, 409);
// B vẫn không huỷ được; admin huỷ được
assert.equal((await call(Bc, "POST", `/api/orders/${o.id}/status`, { status: "cancelled" })).status, 403);
r = await call(ADMIN, "POST", `/api/orders/${o.id}/status`, { status: "cancelled" });
assert.equal(r.body.order.status, "cancelled");
assert.equal((await call(A, "POST", `/api/orders/${o.id}/status`, { status: "cancelled" })).status, 409);
r = await call(A, "GET", `/api/orders/${o.id}`);
console.log("lịch sử:", r.body.history.map((h) => `${h.action}/${h.staffName}`).join(", "));
assert.deepEqual(r.body.history.map((h) => h.action), ["created", "updated", "updated", "confirmed", "cancelled"]);
assert.equal(r.body.history.at(-1).staffName, "QTV Test");

// NHẬT KÝ TOÀN HỆ THỐNG: chỉ admin
assert.equal((await call(A, "GET", "/api/audit")).status, 403);
assert.equal((await call(Bc, "GET", "/api/audit")).status, 403);
assert.equal((await call(null, "GET", "/api/audit")).status, 401);
r = await call(ADMIN, "GET", "/api/audit?limit=100");
assert.equal(r.status, 200);
assert.ok(r.body.entries.length >= 5);
assert.ok(r.body.entries.some((e) => e.targetLabel === o.orderCode && e.action === "cancelled" && e.staffName === "QTV Test"));
r = await call(ADMIN, "GET", "/api/audit?action=cancelled&q=" + o.orderCode);
assert.equal(r.body.entries.length, 1);
r = await call(ADMIN, "GET", "/api/audit?action=hack");
assert.equal(r.status, 400);
r = await call(ADMIN, "GET", "/api/audit?q=%25");
assert.equal(r.body.entries.length, 0);
r = await call(ADMIN, "GET", "/api/audit?limit=2");
assert.equal(r.body.entries.length, 2); assert.equal(r.body.hasMore, true);

// 404 / id rác
assert.equal((await call(A, "GET", "/api/orders/00000000-0000-0000-0000-000000000000")).status, 404);
assert.equal((await call(A, "GET", "/api/orders/abc")).status, 404);

// đồng thời: 10 đơn cùng lúc → mã duy nhất
const many = await Promise.all(Array.from({ length: 30 }, (_, i) => call(i % 2 ? A : Bc, "POST", "/api/orders", { ...input, customerName: `Song song ${i}` })));
assert.ok(many.every((m) => m.status === 201), JSON.stringify(many.filter((m) => m.status !== 201)));
const codes = many.map((m) => m.body.order.orderCode);
assert.equal(new Set(codes).size, 30);
console.log("song song:", codes.sort().join(" "));

// phân trang
r = await call(A, "GET", "/api/orders?limit=3");
assert.equal(r.body.orders.length, 3); assert.equal(r.body.hasMore, true);
console.log("E2E OK");
