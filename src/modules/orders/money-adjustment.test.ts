import { test } from "node:test";
import assert from "node:assert/strict";
import { PHONE_IN_TEXT_MESSAGE } from "../../shared/text-guards.ts";
import type { OrderDetailDto } from "../../shared/contracts.ts";
import {
  applyAdjustmentToOrder, editablePaxCodesOf, effectiveMoney, effectiveService, effectiveSubtotal, isAdjustmentSeqCollision, parseAdjustmentAfter, parseMoneyEditInput, recomputeService,
  type SubtotalServiceInput,
} from "./money-adjustment.ts";
import type { StoredService } from "./service-rules.ts";

const ZERO = { adult: 0, child: 0, senior: 0, infant: 0 };
const catalogService = (over: Partial<StoredService> = {}): StoredService => ({
  id: "svc-1", catalogCode: "TOUR-1", name: "Tour đảo", unit: "perPax",
  pax: { ...ZERO, adult: 2 },
  items: [{ paxCode: "adult", detail: null, catalogPrice: 300000, unitPrice: 300000 }],
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

test("parseMoneyEditInput: lý do chứa số điện thoại (mọi cách viết) → từ chối, đúng câu của lý do huỷ (chủ duyệt 2026-09-30)", () => {
  for (const reason of ["gọi 0905 123 456", "0905123456", "+84 905 123 456", "(0258) 3521 234", "0905.123.456", "0905-123-456"]) {
    const r = parseMoneyEditInput({ reason, services: [{ id: "svc-1", pax: PAX }] }, ["svc-1"]);
    assert.ok(!r.ok, reason);
    assert.equal(r.message, PHONE_IN_TEXT_MESSAGE, reason);
  }
});

test("parseMoneyEditInput: lý do có số ngắn (số phòng, số khách, giờ) → vẫn hợp lệ", () => {
  const r = parseMoneyEditInput({ reason: "Khách thêm 2 trẻ em, phòng 1203, đón 6:30", services: [{ id: "svc-1", pax: PAX }] }, ["svc-1"]);
  assert.ok(r.ok);
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
  subtotal: 600000, discount: 0, total: 600000,
  paymentNote: null, createdAt: "t", updatedAt: "t", confirmedAt: "t", deliveredAt: null, completedAt: null,
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

test("applyAdjustmentToOrder: cộng dồn điều chỉnh — subtotal/total và pax/items của dịch vụ đổi theo (không còn 'còn lại' — sổ tiền lượt 1)", () => {
  const out = applyAdjustmentToOrder(baseOrder(), [{ serviceId: "svc-1", pax: { adult: 3, child: 0, senior: 0, infant: 0 } }]);
  assert.equal(out.subtotal, 900000);
  assert.equal(out.total, 900000, "discount = 0 nên total = subtotal");
  assert.ok(!("remainingAmount" in out), "đơn không còn mang 'còn lại' (ADR-0026 đ9)");
  assert.deepEqual(out.services[0]!.pax, { adult: 3, child: 0, senior: 0, infant: 0 });
  assert.equal(out.services[0]!.items[0]!.quantity, 3);
});

test("applyAdjustmentToOrder: không đổi discount/status/mốc", () => {
  const out = applyAdjustmentToOrder(baseOrder(), [{ serviceId: "svc-1", pax: { adult: 3, child: 0, senior: 0, infant: 0 } }]);
  assert.equal(out.discount, 0);
  assert.equal(out.status, "confirmed");
  assert.equal(out.deliveredAt, null);
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
test("effectiveMoney: total = subtotal - discount (sổ tiền lượt 1: bỏ tham số cọc — 'còn lại' là số của billing)", () => {
  assert.deepEqual(effectiveMoney(900000, 0), { total: 900000 });
  assert.deepEqual(effectiveMoney(900000, 50000), { total: 850000 });
});

// --- effectiveService / effectiveSubtotal (Đợt E task 7 — NGUỒN DUY NHẤT cho tiền hiệu lực; tái phát lần 4 của "hai nơi tính cùng một số theo hai
// luật khác nhau", lần này ở tiền chứ không phải số khách). LỖI GỐC đã đo: đơn có dịch vụ NHẬP TAY + có điều chỉnh → nơi ghi cũ (vòng lặp chỉ duyệt
// dịch vụ TỪ DANH MỤC) lưu `subtotal_after` THIẾU đúng tiền dịch vụ nhập tay; nơi đọc cũ (`/api/orders`/Trang chủ) tin thẳng cột đó nên hiện THIẾU,
// trong khi trang chi tiết đơn (tự tính lại) hiện ĐÚNG. Các test dưới đây kiểm ĐÚNG hai hàm sơ cấp làm việc đó — không cần D1 thật. -----------------
const catalogInput = (over: Partial<SubtotalServiceInput> = {}): SubtotalServiceInput => ({
  id: "svc-cat", catalogCode: "TOUR-1", name: "Tour đảo", unit: "perPax",
  items: [{ paxCode: "adult", catalogPrice: 300000, unitPrice: 300000, lineTotal: 600000 }], // 2 khách × 300.000 đã lưu
  ...over,
});
const manualInput = (over: Partial<SubtotalServiceInput> = {}): SubtotalServiceInput => ({
  id: "svc-manual", catalogCode: null, name: "Phí phát sinh (nhập tay)", unit: "manual",
  items: [{ paxCode: null, catalogPrice: null, unitPrice: 200000, lineTotal: 200000 }],
  ...over,
});

test("effectiveService: dịch vụ KHÔNG có trong after (newPax=undefined) → subtotal = 'own' (tổng lineTotal đã lưu), không có recomputed", () => {
  const r = effectiveService(catalogInput(), undefined);
  assert.equal(r.subtotal, 600000);
  assert.equal(r.recomputed, undefined);
});

test("effectiveService: dịch vụ DANH MỤC có trong after → subtotal TÍNH LẠI theo pax mới (giá đã chụp), có recomputed", () => {
  const r = effectiveService(catalogInput(), { adult: 3, child: 0, senior: 0, infant: 0 });
  assert.equal(r.subtotal, 900000, "3 khách × 300.000, không phải 2 khách đã lưu (600.000)");
  assert.ok(r.recomputed);
  assert.deepEqual(r.recomputed!.pax, { adult: 3, child: 0, senior: 0, infant: 0 });
});

test("effectiveService: dịch vụ NHẬP TAY (catalogCode null) dù CÓ mặt trong after (dữ liệu hỏng ngoài tầm kiểm — parseMoneyEditInput chặn khi ghi) → recompute LUÔN lỗi, lùi về 'own', không có recomputed", () => {
  const r = effectiveService(manualInput(), { adult: 3, child: 0, senior: 0, infant: 0 });
  assert.equal(r.subtotal, 200000, "vẫn là tiền đã lưu của dịch vụ nhập tay, không bịa ra số theo pax");
  assert.equal(r.recomputed, undefined);
});

test("effectiveSubtotal: đơn CHỈ có dịch vụ nhập tay, after=[] → tổng = tiền đã lưu (ca lỗi cũ: nơi ghi quên cộng, giờ nơi đọc tự tính đúng dù nơi ghi có quên hay không)", () => {
  assert.equal(effectiveSubtotal([manualInput()], []), 200000);
});

test("effectiveSubtotal: đơn TRỘN danh mục + nhập tay, CHỈ dịch vụ danh mục có điều chỉnh → tổng = (danh mục TÍNH LẠI) + (nhập tay GIỮ NGUYÊN) — CA LỖI GỐC đã đo (thiếu 200.000₫)", () => {
  const services = [catalogInput(), manualInput()];
  // Trước sửa: nơi ghi cũ tính subtotal_after = 900000 (chỉ danh mục, BỎ SÓT 200000 nhập tay) — nơi đọc cũ tin thẳng số đó nên hiện 900000, THIẾU
  // đúng 200000 so với thực tế. Sau sửa: effectiveSubtotal (nguồn duy nhất, dùng CẢ nơi ghi lẫn nơi đọc) LUÔN cộng đủ, không phụ thuộc nơi ghi.
  const total = effectiveSubtotal(services, [{ serviceId: "svc-cat", pax: { adult: 3, child: 0, senior: 0, infant: 0 } }]);
  assert.equal(total, 900000 + 200000, "900.000 (3×300.000 danh mục, tính lại) + 200.000 (nhập tay, giữ nguyên) = 1.100.000, KHÔNG PHẢI 900.000");
});

test("effectiveSubtotal: after tham chiếu MỘT serviceId không còn tồn tại trong `services` (dữ liệu hỏng ngoài tầm kiểm) → bị bỏ qua lặng lẽ, không cộng thừa, không lỗi", () => {
  const total = effectiveSubtotal([catalogInput()], [{ serviceId: "svc-khong-ton-tai", pax: { adult: 99, child: 0, senior: 0, infant: 0 } }]);
  assert.equal(total, 600000, "svc-cat không có trong after (khoá khác) nên giữ 'own'; entry lạ trong after không tạo ra dịch vụ ảo nào");
});

test("applyAdjustmentToOrder: đơn TRỘN danh mục + nhập tay — subtotal cộng CẢ HAI, dịch vụ nhập tay giữ nguyên pax/items dù đơn có điều chỉnh dịch vụ danh mục khác", () => {
  const manualService = {
    id: "svc-manual", kind: "manual" as const, catalogCode: null, name: "Phí phát sinh", unit: "manual",
    pax: { adult: 1, child: 0, senior: 0, infant: 0 },
    departDate: null, departTime: null, pickupTime: null, pickupPlace: null, checkinDate: null, checkinTime: null, checkinPlace: null, note: null,
    items: [{ id: "it-manual", catalogCode: null, paxCode: null, description: "Phí phát sinh", detail: null, quantity: 1, unitPrice: 200000, catalogPrice: null, lineTotal: 200000 }],
    catalogStatus: null,
  };
  const order: OrderDetailDto = { ...baseOrder(), services: [...baseOrder().services, manualService], subtotal: 800000, total: 800000, remainingAmount: 700000 };
  const out = applyAdjustmentToOrder(order, [{ serviceId: "svc-1", pax: { adult: 3, child: 0, senior: 0, infant: 0 } }]);
  assert.equal(out.subtotal, 900000 + 200000, "900.000 (dịch vụ danh mục, 3×300.000) + 200.000 (nhập tay, không đổi) = 1.100.000");
  assert.deepEqual(out.services[1], manualService, "dịch vụ nhập tay giữ NGUYÊN (không có trong after) dù đơn có điều chỉnh dịch vụ khác");
});

// --- parseAdjustmentAfter (Lỗi 1 + Lỗi 2, kiểm độc lập Đợt E vòng 2: MỘT hàm phân tích after_json duy nhất, KHÔNG BAO GIỜ ném lỗi) --------------
// Mỗi ca đúng MỘT kiểu hỏng liệt kê trong báo cáo kiểm độc lập — kiểm TỪNG kiểu riêng, không gộp, để một ca hỏng không che khuất ca khác.
const VALID = { serviceId: "svc-1", pax: { adult: 2, child: 0, senior: 0, infant: 0 } };

test("parseAdjustmentAfter: after_json hợp lệ, đủ trường → giữ nguyên, không lọc gì", () => {
  assert.deepEqual(parseAdjustmentAfter(JSON.stringify([VALID])), [VALID]);
});

test("parseAdjustmentAfter: KHÔNG PHẢI JSON hợp lệ (cú pháp hỏng) → mảng rỗng, KHÔNG ném lỗi", () => {
  assert.deepEqual(parseAdjustmentAfter("{không phải json"), []);
  assert.deepEqual(parseAdjustmentAfter(""), []);
});

test("parseAdjustmentAfter: JSON hợp lệ nhưng KHÔNG PHẢI mảng (object) → mảng rỗng", () => {
  assert.deepEqual(parseAdjustmentAfter(JSON.stringify({ serviceId: "svc-1", pax: VALID.pax })), []);
});

test("parseAdjustmentAfter: after_json là 'null' (JSON hợp lệ, giá trị null) → mảng rỗng", () => {
  assert.deepEqual(parseAdjustmentAfter("null"), []);
});

test("parseAdjustmentAfter: after_json là mảng RỖNG → mảng rỗng (đơn chưa có điều chỉnh nào của dịch vụ nào, hợp lệ)", () => {
  assert.deepEqual(parseAdjustmentAfter("[]"), []);
});

test("parseAdjustmentAfter: một PHẦN TỬ không phải object (null, số, chuỗi, mảng con) → BỎ QUA riêng phần tử đó, không ném lỗi, các phần tử khác vẫn giữ", () => {
  for (const bad of [null, 5, "chuỗi", [1, 2], true]) {
    assert.deepEqual(parseAdjustmentAfter(JSON.stringify([VALID, bad])), [VALID], JSON.stringify(bad));
  }
});

test("parseAdjustmentAfter: phần tử THIẾU trường serviceId (hoặc serviceId không phải chuỗi) → bỏ qua riêng phần tử đó", () => {
  assert.deepEqual(parseAdjustmentAfter(JSON.stringify([{ pax: VALID.pax }])), []);
  assert.deepEqual(parseAdjustmentAfter(JSON.stringify([{ serviceId: 123, pax: VALID.pax }])), []);
});

test("parseAdjustmentAfter: pax THIẾU một/nhiều trường (adult/child/senior/infant) → bỏ qua riêng phần tử đó", () => {
  assert.deepEqual(parseAdjustmentAfter(JSON.stringify([{ serviceId: "svc-1", pax: { adult: 5 } }])), []);
  assert.deepEqual(parseAdjustmentAfter(JSON.stringify([{ serviceId: "svc-1", pax: {} }])), []);
});

test("parseAdjustmentAfter: pax có giá trị KHÔNG PHẢI số nguyên ≥ 0 (chuỗi, số âm, số thập phân, null) → bỏ qua riêng phần tử đó", () => {
  for (const pax of [
    { adult: "2", child: 0, senior: 0, infant: 0 },
    { adult: -1, child: 0, senior: 0, infant: 0 },
    { adult: 1.5, child: 0, senior: 0, infant: 0 },
    { adult: null, child: 0, senior: 0, infant: 0 },
  ]) {
    assert.deepEqual(parseAdjustmentAfter(JSON.stringify([{ serviceId: "svc-1", pax }])), [], JSON.stringify(pax));
  }
});

test("parseAdjustmentAfter: pax là null (thay vì object) → bỏ qua riêng phần tử đó", () => {
  assert.deepEqual(parseAdjustmentAfter(JSON.stringify([{ serviceId: "svc-1", pax: null }])), []);
});

test("parseAdjustmentAfter: serviceId KHÔNG khớp dịch vụ nào của đơn (id lạ) → vẫn GIỮ (đây là dữ liệu THIẾU KHỚP, không phải dữ liệu SAI DẠNG — nơi gọi tự không tìm thấy id đó, không lỗi; R-ORD-5 ở tầng dữ liệu mới xét việc khớp dịch vụ)", () => {
  const strange = { serviceId: "svc-la-hoac-khong-ton-tai", pax: VALID.pax };
  assert.deepEqual(parseAdjustmentAfter(JSON.stringify([strange])), [strange]);
});

test("parseAdjustmentAfter: nhiều phần tử hỏng KIỂU KHÁC NHAU trong CÙNG một mảng → mỗi phần tử tự xét riêng, phần hợp lệ vẫn giữ, không ném lỗi", () => {
  const mixed = [VALID, null, { serviceId: "x" }, { serviceId: "y", pax: { adult: "z", child: 0, senior: 0, infant: 0 } }, "chuỗi lạ", { serviceId: "svc-2", pax: { adult: 1, child: 0, senior: 0, infant: 0 } }];
  assert.deepEqual(parseAdjustmentAfter(JSON.stringify(mixed)), [VALID, { serviceId: "svc-2", pax: { adult: 1, child: 0, senior: 0, infant: 0 } }]);
});

// TRÙNG serviceId (kiểm độc lập, sau khi báo cáo task 6 ban đầu đã "hoàn tất" — phát hiện thêm ở vòng kiểm thứ hai): parseMoneyEditInput chặn
// khi GHI, chỉ tới được đây qua dữ liệu hỏng ngoài tầm kiểm. Nếu KHÔNG gom, applyAdjustmentToOrder (dựng Map từ mảng, đứng SAU thắng) và
// applyAdjustedPax (Array.find, đứng TRƯỚC thắng) sẽ lại chọn khác nhau — ĐÚNG kiểu "hai luật khác nhau ở hai nơi" mà hàm này phải xoá bỏ.
test("parseAdjustmentAfter: HAI phần tử TRÙNG serviceId, cả hai hợp lệ → gom về MỘT, phần tử ĐỨNG SAU thắng", () => {
  const first = { serviceId: "sv1", pax: { adult: 3, child: 0, senior: 0, infant: 0 } };
  const second = { serviceId: "sv1", pax: { adult: 7, child: 0, senior: 0, infant: 0 } };
  assert.deepEqual(parseAdjustmentAfter(JSON.stringify([first, second])), [second], "đứng sau (7) thắng, không phải đứng trước (3)");
});

test("parseAdjustmentAfter: TRÙNG serviceId, một bên hỏng dạng mềm (pax thiếu trường) → chỉ bên HỢP LỆ được giữ, bất kể đứng trước hay sau (phần tử hỏng bị lọc TRƯỚC khi xét 'đứng sau thắng', không bao giờ ghi đè bản hợp lệ)", () => {
  const good = { serviceId: "sv1", pax: { adult: 4, child: 0, senior: 0, infant: 0 } };
  const bad = { serviceId: "sv1", pax: { adult: 9 } }; // thiếu child/senior/infant
  assert.deepEqual(parseAdjustmentAfter(JSON.stringify([bad, good])), [good], "hỏng đứng trước, hợp lệ đứng sau → hợp lệ thắng");
  assert.deepEqual(parseAdjustmentAfter(JSON.stringify([good, bad])), [good], "hợp lệ đứng trước, hỏng đứng sau → phần tử hỏng bị LỌC (isPaxCounts sai) TRƯỚC khi được xét ghi đè, nên bản hợp lệ vẫn còn nguyên");
});

// --- isAdjustmentSeqCollision --------------------------------------------------------------------------------------
test("isAdjustmentSeqCollision: nhận đúng lỗi UNIQUE order_id+seq (kể cả tiền tố D1_ERROR); lỗi khác thì không", () => {
  assert.ok(isAdjustmentSeqCollision(new Error("UNIQUE constraint failed: order_money_adjustment.order_id, order_money_adjustment.seq")));
  assert.ok(isAdjustmentSeqCollision(new Error("D1_ERROR: UNIQUE constraint failed: order_money_adjustment.order_id, order_money_adjustment.seq: SQLITE_CONSTRAINT")));
  assert.ok(!isAdjustmentSeqCollision(new Error("UNIQUE constraint failed: orders.order_code")));
  assert.ok(!isAdjustmentSeqCollision(new Error("FOREIGN KEY constraint failed")));
  assert.ok(!isAdjustmentSeqCollision("UNIQUE constraint failed: order_money_adjustment.order_id, order_money_adjustment.seq"), "chỉ nhận Error");
});
