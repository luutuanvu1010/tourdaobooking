import assert from "node:assert/strict";
import { ACCOUNTS, call, session, sql } from "./lib.mjs";

const A = await session(ACCOUNTS.salesA);
const Bc = await session(ACCOUNTS.salesB);
const ADMIN = await session(ACCOUNTS.admin);

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

// DỊCH VỤ NGUỒN (0007): dòng chọn từ danh mục giữ catalog_code, dòng nhập tay là null; mã sai bị từ chối
r = await call(A, "POST", "/api/orders", { ...input, items: [{ catalogCode: "TD101", description: "Tour 3 đảo — Người lớn", quantity: 2, unitPrice: 850000 }, { description: "Nhập tay", quantity: 1, unitPrice: 1 }], discount: 0, depositAmount: 0 });
assert.equal(r.status, 201, JSON.stringify(r.body));
assert.deepEqual(r.body.order.items.map((i) => i.catalogCode), ["TD101", null]);
const traced = r.body.order;
assert.equal((await call(A, "POST", "/api/orders", { ...input, items: [{ catalogCode: "x y", description: "d", quantity: 1, unitPrice: 1 }] })).status, 400);
console.log("✓ order_item.catalog_code lưu và đọc lại");

// BẤT BIẾN TIỀN TRONG SQL (0007): ghi thẳng số sai vào D1 bị TRIGGER chặn; sửa đúng luật qua API vẫn chạy
for (const bad of [
  `UPDATE orders SET total = total + 1 WHERE id = '${traced.id}'`,
  `UPDATE orders SET remaining_amount = -1, deposit_amount = total + 1 WHERE id = '${traced.id}'`,
  `UPDATE order_item SET line_total = line_total + 1 WHERE order_id = '${traced.id}'`,
  `UPDATE orders SET deposit_amount = 1, remaining_amount = total - 1, deposit_method = NULL WHERE id = '${traced.id}'`,
]) await assert.rejects(sql(bad), /money_invariant/, `TRIGGER phải chặn: ${bad}`);
await sql(`UPDATE orders SET customer_note = 'sửa hợp lệ' WHERE id = '${traced.id}'`); // cập nhật không đụng tiền vẫn qua
r = await call(A, "GET", `/api/orders/${traced.id}`);
assert.equal(r.body.order.total, 1700001); assert.deepEqual(r.body.order.items.map((i) => i.lineTotal), [1700000, 1]);
r = await call(A, "PUT", `/api/orders/${traced.id}`, { ...input, discount: 1000, depositAmount: 200000 });
assert.equal(r.status, 200, JSON.stringify(r.body));
console.log("✓ TRIGGER chặn số tiền sai ghi thẳng vào D1, API vẫn sửa được");

// TRANH CHẤP: thao tác thua cuộc (điều kiện SQL không còn đúng) KHÔNG được để lại dòng nhật ký (idiom changes() > 0)
for (let round = 0; round < 3; round++) {
  const d = (await call(A, "POST", "/api/orders", { ...input, customerName: `Tranh chấp ${round}` })).body.order;
  const [c1, c2] = await Promise.all([
    call(A, "POST", `/api/orders/${d.id}/status`, { status: "confirmed" }),
    call(ADMIN, "POST", `/api/orders/${d.id}/status`, { status: "cancelled" }),
  ]);
  const wins = [c1, c2].filter((x) => x.status === 200).length;
  const hist = (await call(A, "GET", `/api/orders/${d.id}`)).body.history.map((h) => h.action);
  // Nếu hai request chạy nối tiếp thì cả hai có thể thắng (draft→confirmed→cancelled); nếu đan xen thì kẻ thua nhận 409.
  // Dù thế nào, số dòng nhật ký phải đúng bằng số thao tác thắng.
  assert.ok(wins >= 1);
  assert.equal(hist.length, 1 + wins, `nhật ký phải khớp số thao tác thắng: ${hist} / ${c1.status},${c2.status}`);
}
console.log("✓ thao tác thua khi tranh chấp không ghi nhật ký");
console.log("E2E OK");
