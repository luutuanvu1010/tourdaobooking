import { test } from "node:test";
import assert from "node:assert/strict";
import type { EffectiveService } from "../../shared/order-lines.ts";
import { canTransition, orderCodePrefix, validateBookerChange, validateOrder, type ServiceContext } from "./rules.ts";

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

test("giảm giá ≤ tạm tính, thanh toán trước ≤ tổng cộng", () => {
  assert.match(message({ ...base, discount: 1400001 }), /Giảm giá/);
  assert.equal(ok({ ...base, discount: 1400000, depositAmount: 0 }).total, 0);
  assert.match(message({ ...base, depositAmount: 1300001 }), /Thanh toán trước/);
  assert.equal(ok({ ...base, depositAmount: 1300000 }).remainingAmount, 0);
});

test("có thanh toán trước thì cần phương thức thanh toán; không có thì bỏ phương thức", () => {
  assert.match(message({ ...base, depositMethod: undefined }), /phương thức thanh toán/);
  assert.equal(ok({ ...base, depositAmount: 0, depositMethod: "cash" }).depositMethod, null);
});

test("một ngày cho cả đơn (ADR-0021): mọi dịch vụ cùng ngày khởi hành; 'chưa có ngày' cũng là một giá trị", () => {
  const svc = (departDate?: string) => manual([{ description: "X", quantity: 1, unitPrice: 100000 }], departDate ? { departDate } : {});
  const order = (...s: unknown[]) => ({ ...base, depositAmount: 0, discount: 0, services: s });
  assert.equal(message(order(svc("2026-10-01"), svc("2026-10-02"))), "Mọi dịch vụ trong đơn phải cùng một ngày khởi hành.");
  assert.equal(message(order(svc("2026-10-01"), svc())), "Mọi dịch vụ trong đơn phải cùng một ngày khởi hành.");
  assert.equal(ok(order(svc("2026-10-01"), svc("2026-10-01"))).services.length, 2);
  assert.equal(ok(order(svc(), svc())).services.length, 2);
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
  const v = ok({ ...base, services: [cat, manual([{ description: "Áo phao", quantity: 1, unitPrice: 50000 }], { departDate: "2026-09-25" })], discount: 0, depositAmount: 0 });
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

const PARTY = "0b1c2d3e-4f50-6172-8394-a5b6c7d8e9f0";

test("người đặt: vắng = không gắn; id đúng dạng (UUID, pty-UUID) = hồ sơ có sẵn", () => {
  assert.deepEqual(ok(base).booker, { kind: "none" });
  assert.deepEqual(ok({ ...base, bookerPartyId: null }).booker, { kind: "none" });
  assert.deepEqual(ok({ ...base, bookerPartyId: PARTY }).booker, { kind: "existing", partyId: PARTY });
  assert.deepEqual(ok({ ...base, bookerPartyId: `pty-${PARTY}` }).booker, { kind: "existing", partyId: `pty-${PARTY}` });
});

test("người đặt: id sai dạng, gửi cả hai, hồ sơ mới thiếu tên / số không phải Việt Nam → lỗi", () => {
  assert.equal(message({ ...base, bookerPartyId: "x" }), "Hồ sơ khách không hợp lệ.");
  assert.equal(message({ ...base, bookerPartyId: PARTY, newBooker: { fullName: "A", phone: "0901234567" } }), "Chỉ chọn một: dùng hồ sơ có sẵn hoặc tạo hồ sơ mới.");
  assert.equal(message({ ...base, newBooker: { fullName: " ", phone: "0901234567" } }), "Cần tên khách để tạo hồ sơ.");
  assert.match(message({ ...base, newBooker: { fullName: "A", phone: "+1 415 555 0100" } }), /số điện thoại Việt Nam 10 số/);
});

test("người đặt: hồ sơ mới — tên gọn khoảng trắng, SĐT chuẩn hoá; SĐT trên đơn vẫn giữ nguyên bản gõ", () => {
  const v = ok({ ...base, newBooker: { fullName: "  Trần   Thị B ", phone: "+84 901 234 567" } });
  assert.deepEqual(v.booker, { kind: "new", fullName: "Trần Thị B", phone: "0901234567" });
  assert.equal(v.customerPhone, "0901 234 567");
});

test("đổi khách: kiểm tên/SĐT như đơn, nhận người đặt, bắt buộc expectedUpdatedAt", () => {
  const good = { customerName: " Trần B ", customerPhone: "0909 000 111", bookerPartyId: PARTY, expectedUpdatedAt: "2026-09-21T00:00:00.000Z" };
  const r = validateBookerChange(good);
  assert.ok(r.ok, r.ok ? "" : r.message);
  assert.deepEqual(r.value, { customerName: "Trần B", customerPhone: "0909 000 111", booker: { kind: "existing", partyId: PARTY }, expectedUpdatedAt: "2026-09-21T00:00:00.000Z" });
  const bad = (input: unknown) => {
    const x = validateBookerChange(input);
    assert.ok(!x.ok);
    return x.message;
  };
  assert.equal(bad(null), "Dữ liệu đổi khách không hợp lệ.");
  assert.match(bad({ ...good, customerName: "" }), /Tên khách hàng/);
  assert.equal(bad({ ...good, customerPhone: "abc" }), "Số điện thoại khách không hợp lệ.");
  assert.equal(bad({ ...good, bookerPartyId: "x" }), "Hồ sơ khách không hợp lệ.");
  assert.equal(bad({ ...good, expectedUpdatedAt: "" }), "Thiếu expectedUpdatedAt (mốc cập nhật của đơn mà trang đã đọc).");
});
