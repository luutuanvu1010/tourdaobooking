import { test } from "node:test";
import assert from "node:assert/strict";
import type { EffectiveService } from "../../shared/order-lines.ts";
import { canModify, canTransition, orderCodePrefix, validateOrder, type ServiceContext } from "./rules.ts";

const tour: EffectiveService = {
  code: "TD101", name: "Tour 3 đảo", unit: "perPax", visible: true,
  prices: { adult: 850000, child: 595000, senior: 850000, infant: 0 },
  notes: { child: "Trẻ em cao từ 1 m đến 1,4 mét", senior: null, infant: null },
};
const ctx: ServiceContext = { catalog: new Map([[tour.code, tour]]), stored: [] };

/** Dịch vụ nhập tay: cách gọn nhất để có dòng tiền tự do. */
const manual = (items: unknown[], extra: Record<string, unknown> = {}) => ({ kind: "manual", name: "Dịch vụ", pax: { adult: 1 }, items, ...extra });

const base = {
  customerName: " Nguyễn Văn A ",
  customerPhone: "0901 234 567",
  services: [
    manual([{ description: "Tour Hòn Mun", quantity: 3, unitPrice: 450000 }, { description: "Thuê áo phao", quantity: 1, unitPrice: 50000, detail: "3 cái" }]),
  ],
  discount: 100000,
  depositAmount: 500000,
  depositMethod: "cash",
};

function ok(input: unknown, c: ServiceContext = ctx) {
  const r = validateOrder(input, c);
  assert.ok(r.ok, r.ok ? "" : r.message);
  return r.value;
}
const fails = (input: unknown, c: ServiceContext = ctx) => {
  const r = validateOrder(input, c);
  assert.ok(!r.ok);
  return r;
};
const message = (input: unknown) => fails(input).message;

test("server tự tính line_total, subtotal, total, remaining", () => {
  const v = ok(base);
  assert.deepEqual(v.items.map((i) => i.lineTotal), [1350000, 50000]);
  assert.equal(v.subtotal, 1400000);
  assert.equal(v.total, 1300000);
  assert.equal(v.remainingAmount, 800000);
  assert.equal(v.customerName, "Nguyễn Văn A");
});

test("bỏ qua số dẫn xuất do client gửi (chống gian lận giá)", () => {
  const v = ok({ ...base, total: 1, subtotal: 1, remainingAmount: 0, services: [manual([{ description: "X", quantity: 2, unitPrice: 10, lineTotal: 1 }])], discount: 0, depositAmount: 0 });
  assert.equal(v.total, 20);
  assert.equal(v.items[0]!.lineTotal, 20);
  assert.equal(v.remainingAmount, 20);
});

test("số tiền phải là số nguyên không âm, không nhận chuỗi/thập phân", () => {
  const line = (l: unknown) => ({ ...base, services: [manual([l])] });
  assert.match(message(line({ description: "X", quantity: 1, unitPrice: "100" })), /đơn giá/);
  assert.match(message(line({ description: "X", quantity: 1, unitPrice: 10.5 })), /đơn giá/);
  assert.match(message(line({ description: "X", quantity: 1, unitPrice: -1 })), /đơn giá/);
  assert.match(message(line({ description: "X", quantity: 0, unitPrice: 1 })), /số lượng/);
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

test("bắt buộc có khách, SĐT hợp lệ, ít nhất một dịch vụ", () => {
  assert.match(message({ ...base, customerName: "  " }), /Tên khách/);
  assert.match(message({ ...base, customerPhone: "abc" }), /Số điện thoại/);
  assert.match(message({ ...base, customerEmail: "sai" }), /Email/);
  assert.match(message({ ...base, services: [] }), /ít nhất một dịch vụ/);
  assert.match(message({ ...base, services: undefined }), /ít nhất một dịch vụ/);
  assert.match(message(null), /không hợp lệ/);
});

test("dịch vụ từ danh mục: dòng tiền do server sinh và cộng vào tạm tính cùng dịch vụ nhập tay", () => {
  const cat = { kind: "catalog", catalogCode: "TD101", pax: { adult: 2, child: 1 }, catalogPriceSeen: { adult: 850000, child: 595000 }, departDate: "2026-09-25" };
  const v = ok({ ...base, services: [cat, manual([{ description: "Áo phao", quantity: 1, unitPrice: 50000 }])], discount: 0, depositAmount: 0 });
  assert.equal(v.services.length, 2);
  assert.deepEqual(v.items.map((i) => [i.catalogCode, i.quantity, i.unitPrice]), [["TD101", 2, 850000], ["TD101", 1, 595000], [null, 1, 50000]]);
  assert.equal(v.subtotal, 2 * 850000 + 595000 + 50000);
  assert.equal(v.services[0]!.trip.departDate, "2026-09-25");
});

test("lỗi của dịch vụ được chuyển nguyên mã và chi tiết (catalog_changed, catalog_unavailable)", () => {
  const seenWrong = { kind: "catalog", catalogCode: "TD101", pax: { adult: 1 }, catalogPriceSeen: { adult: 1 } };
  const r = fails({ ...base, services: [manual([{ description: "x", quantity: 1, unitPrice: 1 }]), seenWrong] });
  assert.equal(r.code, "catalog_changed");
  assert.deepEqual(r.details, [{ serviceIndex: 1, catalogCode: "TD101", pax: "adult", seen: 1, current: 850000 }]);
  assert.match(r.message, /Dịch vụ 2/);
  assert.equal(fails({ ...base, services: [{ ...seenWrong, catalogCode: "NOPE" }] }).code, "catalog_unavailable");
});

test("giới hạn: ≤ 20 dịch vụ, ≤ 50 dòng tiền, không trùng dịch vụ đã lưu, tổng tiền có trần", () => {
  const one = manual([{ description: "x", quantity: 1, unitPrice: 1 }]);
  assert.match(message({ ...base, services: Array.from({ length: 21 }, () => one), discount: 0, depositAmount: 0 }), /tối đa 20 dịch vụ/);
  ok({ ...base, services: Array.from({ length: 20 }, () => one), discount: 0, depositAmount: 0 });
  const lines = (n: number) => Array.from({ length: n }, (_, i) => ({ description: `d${i}`, quantity: 1, unitPrice: 1 }));
  assert.match(message({ ...base, services: [manual(lines(30)), manual(lines(21))], discount: 0, depositAmount: 0 }), /tối đa 50 dòng tiền/);
  ok({ ...base, services: [manual(lines(30)), manual(lines(20))], discount: 0, depositAmount: 0 });
  const stored = { id: "sv1", catalogCode: null, name: "Dịch vụ", unit: "manual", pax: { adult: 1, child: 0, senior: 0, infant: 0 }, items: [] };
  const withStored: ServiceContext = { catalog: ctx.catalog, stored: [stored] };
  assert.match(fails({ ...base, services: [manual(lines(1), { id: "sv1" }), manual(lines(1), { id: "sv1" })], discount: 0, depositAmount: 0 }, withStored).message, /trùng/);
  const huge = { description: "X", quantity: 99999, unitPrice: 99999999 };
  assert.match(message({ ...base, services: [manual([huge]), manual([huge]), manual([huge]), manual([huge]), manual([huge])], discount: 0, depositAmount: 0 }), /vượt giới hạn/);
});

test("tab cũ gửi items phẳng kiểu cũ → client_outdated", () => {
  const r = fails({ customerName: "A", customerPhone: "0901234567", items: [{ description: "x", quantity: 1, unitPrice: 1 }] });
  assert.equal(r.code, "client_outdated");
});

test("expectedUpdatedAt chuyển tiếp cho PUT; vắng → null", () => {
  assert.equal(ok(base).expectedUpdatedAt, null);
  assert.equal(ok({ ...base, expectedUpdatedAt: "2026-09-19T01:00:00.000Z" }).expectedUpdatedAt, "2026-09-19T01:00:00.000Z");
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
