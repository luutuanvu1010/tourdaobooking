import { test } from "node:test";
import assert from "node:assert/strict";
import type { OrderDetailDto } from "../../shared/contracts.ts";
import { applyAdjustmentToOrder, editablePaxCodesOf, effectiveMoney, isAdjustmentSeqCollision, parseMoneyEditInput, recomputeService } from "./money-adjustment.ts";
import type { StoredService } from "./service-rules.ts";

const ZERO = { adult: 0, child: 0, senior: 0, infant: 0 };
const catalogService = (over: Partial<StoredService> = {}): StoredService => ({
  id: "svc-1", catalogCode: "TOUR-1", name: "Tour đảo", unit: "perPax",
  pax: { ...ZERO, adult: 2 },
  items: [{ paxCode: "adult", detail: null, catalogPrice: 300000 }],
  ...over,
});

// --- recomputeService --------------------------------------------------------------------------------------------
test("recomputeService: đổi số khách, giá lấy từ bản chụp (catalogPrice đã lưu), không tra danh mục hiện tại", () => {
  const r = recomputeService(catalogService(), { ...ZERO, adult: 3 });
  assert.ok(r.ok, JSON.stringify(r));
  if (r.ok) {
    assert.equal(r.subtotal, 900000, "3 khách × 300,000");
    assert.equal(r.lines.length, 1);
    assert.equal(r.lines[0]!.unitPrice, 300000);
  }
});

test("recomputeService: dịch vụ nhập tay (catalogCode null) → không tính lại được", () => {
  const r = recomputeService(catalogService({ catalogCode: null }), { ...ZERO, adult: 3 });
  assert.ok(!r.ok);
});

test("recomputeService: thiếu giá đã chụp cho loại khách yêu cầu → lỗi tiếng Việt", () => {
  const r = recomputeService(catalogService(), { ...ZERO, adult: 1, child: 1 }); // không có catalogPrice cho child
  assert.ok(!r.ok && r.message.length > 0);
});

test("recomputeService: 0 khách mọi loại → lỗi (buildLines không cho — chưa hỗ trợ bỏ hẳn dịch vụ, xem đặc tả mục 2)", () => {
  const r = recomputeService(catalogService(), ZERO);
  assert.ok(!r.ok);
});

// --- parseMoneyEditInput ------------------------------------------------------------------------------------------
const PAX = { adult: 3, child: 0, senior: 0, infant: 0 };
test("parseMoneyEditInput: đúng dạng, đủ tập id dịch vụ từ danh mục của đơn → hợp lệ", () => {
  const r = parseMoneyEditInput({ reason: "Khách báo thêm người", services: [{ id: "svc-1", pax: PAX }] }, ["svc-1"]);
  assert.deepEqual(r, { ok: true, reason: "Khách báo thêm người", services: [{ id: "svc-1", pax: PAX }] });
});

test("parseMoneyEditInput: thiếu lý do, lý do rỗng/toàn khoảng trắng → từ chối", () => {
  for (const body of [{ services: [{ id: "svc-1", pax: PAX }] }, { reason: "", services: [{ id: "svc-1", pax: PAX }] }, { reason: "   ", services: [{ id: "svc-1", pax: PAX }] }]) {
    const r = parseMoneyEditInput(body as Record<string, unknown>, ["svc-1"]);
    assert.ok(!r.ok && /lý do/i.test(r.message), JSON.stringify(body));
  }
});

test("parseMoneyEditInput: thiếu một dịch vụ từ danh mục của đơn → từ chối", () => {
  const r = parseMoneyEditInput({ reason: "x", services: [] }, ["svc-1", "svc-2"]);
  assert.ok(!r.ok);
});

test("parseMoneyEditInput: kèm dịch vụ không thuộc đơn → từ chối", () => {
  const r = parseMoneyEditInput({ reason: "x", services: [{ id: "svc-1", pax: PAX }, { id: "svc-la", pax: PAX }] }, ["svc-1"]);
  assert.ok(!r.ok);
});

test("parseMoneyEditInput: một dịch vụ bị liệt kê hai lần → từ chối", () => {
  const r = parseMoneyEditInput({ reason: "x", services: [{ id: "svc-1", pax: PAX }, { id: "svc-1", pax: PAX }] }, ["svc-1"]);
  assert.ok(!r.ok);
});

test("parseMoneyEditInput: số khách âm, không nguyên, hoặc không phải số → từ chối", () => {
  for (const pax of [{ ...PAX, adult: -1 }, { ...PAX, adult: 1.5 }, { ...PAX, adult: "3" as unknown as number }]) {
    const r = parseMoneyEditInput({ reason: "x", services: [{ id: "svc-1", pax }] }, ["svc-1"]);
    assert.ok(!r.ok, JSON.stringify(pax));
  }
});

test("parseMoneyEditInput: pax thiếu hẳn một trong bốn trường (adult/child/senior/infant) → từ chối", () => {
  const { child, ...missingChild } = PAX;
  void child;
  const r = parseMoneyEditInput({ reason: "x", services: [{ id: "svc-1", pax: missingChild }] }, ["svc-1"]);
  assert.ok(!r.ok, JSON.stringify(missingChild));
});

test("parseMoneyEditInput: thân không phải object, services không phải mảng/dòng sai dạng → từ chối", () => {
  for (const body of [null, {}, { reason: "x" }, { reason: "x", services: "x" }, { reason: "x", services: [{}] }, { reason: "x", services: [{ id: "svc-1" }] }]) {
    const r = parseMoneyEditInput(body as Record<string, unknown> | null, ["svc-1"]);
    assert.ok(!r.ok, JSON.stringify(body));
  }
});

// --- applyAdjustmentToOrder ----------------------------------------------------------------------------------------
const baseOrder = (): OrderDetailDto => ({
  id: "o1", orderCode: "TD-1", staffId: "s1", staffName: "A", bookerPartyId: null, bookerName: null,
  status: "confirmed", customerName: "K", customerPhone: "090", customerEmail: null, customerNote: null,
  subtotal: 600000, discount: 0, total: 600000, depositAmount: 100000, depositMethod: "cash", remainingAmount: 500000,
  paymentNote: null, createdAt: "t", updatedAt: "t", confirmedAt: "t",
  services: [
    {
      id: "svc-1", kind: "catalog", catalogCode: "TOUR-1", name: "Tour đảo", unit: "perPax",
      pax: { adult: 2, child: 0, senior: 0, infant: 0 },
      departDate: "2026-10-01", departTime: null, pickupTime: null, pickupPlace: null, checkinDate: null, checkinTime: null, checkinPlace: null, note: null,
      items: [{ id: "it-1", catalogCode: "TOUR-1", paxCode: "adult", description: "Tour đảo — Người lớn", detail: "", quantity: 2, unitPrice: 300000, catalogPrice: 300000, lineTotal: 600000 }],
      catalogStatus: null,
    },
  ],
});

test("applyAdjustmentToOrder: cộng dồn điều chỉnh — subtotal/total/remainingAmount và pax/items của dịch vụ đổi theo", () => {
  const out = applyAdjustmentToOrder(baseOrder(), [{ serviceId: "svc-1", pax: { adult: 3, child: 0, senior: 0, infant: 0 } }]);
  assert.equal(out.subtotal, 900000);
  assert.equal(out.total, 900000, "discount = 0 nên total = subtotal");
  assert.equal(out.remainingAmount, 800000, "900000 - 100000 cọc (không đổi)");
  assert.deepEqual(out.services[0]!.pax, { adult: 3, child: 0, senior: 0, infant: 0 });
  assert.equal(out.services[0]!.items[0]!.quantity, 3);
});

test("applyAdjustmentToOrder: không đổi discount/depositAmount/depositMethod/status", () => {
  const out = applyAdjustmentToOrder(baseOrder(), [{ serviceId: "svc-1", pax: { adult: 3, child: 0, senior: 0, infant: 0 } }]);
  assert.equal(out.discount, 0);
  assert.equal(out.depositAmount, 100000);
  assert.equal(out.depositMethod, "cash");
  assert.equal(out.status, "confirmed");
});

test("applyAdjustmentToOrder: dịch vụ KHÔNG có trong after (đơn chưa có điều chỉnh nào, after=[]) → giữ nguyên như lưu", () => {
  const out = applyAdjustmentToOrder(baseOrder(), []);
  assert.deepEqual(out.services[0]!.pax, { adult: 2, child: 0, senior: 0, infant: 0 });
  assert.equal(out.subtotal, 600000);
});

test("applyAdjustmentToOrder: áp được cho đơn ĐÃ HUỶ (không chỉ đơn đã xác nhận) — đơn huỷ sau khi có điều chỉnh vẫn phải hiện đúng số đã sửa, không lùi lại số gốc", () => {
  const cancelled = { ...baseOrder(), status: "cancelled" as const };
  const out = applyAdjustmentToOrder(cancelled, [{ serviceId: "svc-1", pax: { adult: 3, child: 0, senior: 0, infant: 0 } }]);
  assert.equal(out.subtotal, 900000, "đơn đã huỷ vẫn phải hiện SỐ ĐÃ SỬA gần nhất, không lùi về số gốc");
  assert.equal(out.status, "cancelled", "không đổi trạng thái");
});

// --- editablePaxCodesOf ----------------------------------------------------------------------------------------------
// Lỗi tìm được lúc kiểm độc lập màn "Việc của tôi" (2026-09-22): trước đây `editablePaxCodes` tính từ `s.items` SAU KHI overlay điều chỉnh —
// dịch vụ theo người có NHIỀU loại khách, một lần sửa trước đưa một loại về 0 khiến buildLines bỏ hẳn dòng đó, loại khách "biến mất" khỏi ô nhập
// VĨNH VIỄN dù giá gốc (order_item thật) vẫn còn và máy chủ vẫn chấp nhận đặt lại > 0. Sửa: tính từ BẢN CHỤP GỐC (mọi loại khách từng có giá lúc
// xác nhận đơn — `snapshotService`/`availableCodes`), không phải từ số khách hiện hành.
test("editablePaxCodesOf: dịch vụ theo người, đủ giá adult+child ở bản chụp → cả hai loại, kể cả khi số khách HIỆN HÀNH của loại đó = 0", () => {
  const svc = { ...baseOrder().services[0]!, items: [...baseOrder().services[0]!.items, { id: "it-2", catalogCode: "TOUR-1", paxCode: "child" as const, description: "Tour đảo — Trẻ em", detail: "", quantity: 1, unitPrice: 150000, catalogPrice: 150000, lineTotal: 150000 }] };
  assert.deepEqual(editablePaxCodesOf(svc).slice().sort(), ["adult", "child"]);
});

test("editablePaxCodesOf: dịch vụ tính theo NHÓM (per5Pax) → chỉ 'adult' (ô số khách chung)", () => {
  const svc = { ...baseOrder().services[0]!, unit: "per5Pax" };
  assert.deepEqual(editablePaxCodesOf(svc), ["adult"]);
});

test("editablePaxCodesOf: dịch vụ nhập tay (catalogCode null) → rỗng", () => {
  const svc = { ...baseOrder().services[0]!, catalogCode: null };
  assert.deepEqual(editablePaxCodesOf(svc), []);
});

// --- effectiveMoney -------------------------------------------------------------------------------------------------
test("effectiveMoney: total = subtotal - discount; remainingAmount = total - depositAmount", () => {
  assert.deepEqual(effectiveMoney(900000, 0, 100000), { total: 900000, remainingAmount: 800000 });
  assert.deepEqual(effectiveMoney(900000, 50000, 100000), { total: 850000, remainingAmount: 750000 });
});

// --- isAdjustmentSeqCollision --------------------------------------------------------------------------------------
test("isAdjustmentSeqCollision: nhận đúng lỗi UNIQUE order_id+seq (kể cả tiền tố D1_ERROR); lỗi khác thì không", () => {
  assert.ok(isAdjustmentSeqCollision(new Error("UNIQUE constraint failed: order_money_adjustment.order_id, order_money_adjustment.seq")));
  assert.ok(isAdjustmentSeqCollision(new Error("D1_ERROR: UNIQUE constraint failed: order_money_adjustment.order_id, order_money_adjustment.seq: SQLITE_CONSTRAINT")));
  assert.ok(!isAdjustmentSeqCollision(new Error("UNIQUE constraint failed: orders.order_code")));
  assert.ok(!isAdjustmentSeqCollision(new Error("FOREIGN KEY constraint failed")));
  assert.ok(!isAdjustmentSeqCollision("UNIQUE constraint failed: order_money_adjustment.order_id, order_money_adjustment.seq"), "chỉ nhận Error");
});
