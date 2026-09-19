import { test } from "node:test";
import assert from "node:assert/strict";
import { canModify, canTransition, orderCodePrefix, validateOrder } from "./rules.ts";

const base = {
  customerName: " Nguyễn Văn A ",
  customerPhone: "0901 234 567",
  items: [
    { description: "Tour Hòn Mun", quantity: 3, unitPrice: 450000 },
    { description: "Thuê áo phao", quantity: 1, unitPrice: 50000, detail: "3 cái" },
  ],
  discount: 100000,
  depositAmount: 500000,
  depositMethod: "cash",
};

function ok(input: unknown) {
  const r = validateOrder(input);
  assert.ok(r.ok, r.ok ? "" : r.message);
  return r.value;
}
const message = (input: unknown) => {
  const r = validateOrder(input);
  assert.ok(!r.ok);
  return r.message;
};

test("server tự tính line_total, subtotal, total, remaining", () => {
  const v = ok(base);
  assert.deepEqual(v.items.map((i) => i.lineTotal), [1350000, 50000]);
  assert.equal(v.subtotal, 1400000);
  assert.equal(v.total, 1300000);
  assert.equal(v.remainingAmount, 800000);
  assert.equal(v.customerName, "Nguyễn Văn A");
});

test("bỏ qua số dẫn xuất do client gửi (chống gian lận giá)", () => {
  const v = ok({ ...base, total: 1, subtotal: 1, remainingAmount: 0, items: [{ description: "X", quantity: 2, unitPrice: 10, lineTotal: 1 }], discount: 0, depositAmount: 0 });
  assert.equal(v.total, 20);
  assert.equal(v.items[0]!.lineTotal, 20);
  assert.equal(v.remainingAmount, 20);
});

test("số tiền phải là số nguyên không âm, không nhận chuỗi/thập phân", () => {
  assert.match(message({ ...base, items: [{ description: "X", quantity: 1, unitPrice: "100" }] }), /đơn giá/);
  assert.match(message({ ...base, items: [{ description: "X", quantity: 1, unitPrice: 10.5 }] }), /đơn giá/);
  assert.match(message({ ...base, items: [{ description: "X", quantity: 1, unitPrice: -1 }] }), /đơn giá/);
  assert.match(message({ ...base, items: [{ description: "X", quantity: 0, unitPrice: 1 }] }), /số lượng/);
  assert.match(message({ ...base, discount: -5 }), /Giảm giá/);
});

test("giảm giá ≤ tạm tính, cọc ≤ tổng cộng", () => {
  assert.match(message({ ...base, discount: 1400001 }), /Giảm giá/);
  assert.equal(ok({ ...base, discount: 1400000, depositAmount: 0 }).total, 0);
  assert.match(message({ ...base, depositAmount: 1300001 }), /cọc/);
  assert.equal(ok({ ...base, depositAmount: 1300000 }).remainingAmount, 0);
});

test("có cọc thì cần hình thức cọc; không cọc thì bỏ hình thức", () => {
  assert.match(message({ ...base, depositMethod: undefined }), /hình thức/);
  assert.equal(ok({ ...base, depositAmount: 0, depositMethod: "cash" }).depositMethod, null);
});

test("bắt buộc có khách, SĐT hợp lệ, ít nhất một dòng", () => {
  assert.match(message({ ...base, customerName: "  " }), /Tên khách/);
  assert.match(message({ ...base, customerPhone: "abc" }), /Số điện thoại/);
  assert.match(message({ ...base, customerEmail: "sai" }), /Email/);
  assert.match(message({ ...base, items: [] }), /ít nhất một dòng/);
  assert.match(message(null), /không hợp lệ/);
});

test("chặn số vượt giới hạn", () => {
  assert.match(message({ ...base, items: [{ description: "X", quantity: 100000, unitPrice: 100000000000 }] }), /vượt giới hạn/);
});

test("chuyển trạng thái một chiều", () => {
  assert.ok(canTransition("draft", "confirmed"));
  assert.ok(canTransition("draft", "cancelled"));
  assert.ok(canTransition("confirmed", "cancelled"));
  assert.ok(!canTransition("confirmed", "draft"));
  assert.ok(!canTransition("cancelled", "draft"));
  assert.ok(!canTransition("cancelled", "confirmed"));
  assert.ok(!canTransition("draft", "draft"));
});

test("mã đơn theo ngày giờ Việt Nam", () => {
  // 2026-09-16 18:30 UTC = 01:30 ngày 17 giờ VN
  assert.equal(orderCodePrefix(new Date("2026-09-16T18:30:00Z")), "TD-20260917-");
  assert.equal(orderCodePrefix(new Date("2026-09-16T16:59:00Z")), "TD-20260916-");
});

test("chỉ người lập đơn hoặc admin được sửa/đổi trạng thái", () => {
  const order = { staffId: "a" };
  assert.ok(canModify({ id: "a", role: "sales" }, order));
  assert.ok(canModify({ id: "z", role: "admin" }, order));
  assert.ok(!canModify({ id: "b", role: "sales" }, order));
});
