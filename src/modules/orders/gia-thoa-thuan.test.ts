// DK-T2-01 (kiểm toán điểm khuất 2026-09-24, CRITICAL): tính lại dịch vụ ĐÃ LƯU sau điều chỉnh số khách phải dùng ĐƠN GIÁ ĐÃ THOẢ THUẬN
// (`order_item.unit_price`), không phải giá niêm yết (`catalog_price`). Trước bản vá, `recomputeService` gọi `buildLines(snap, newPax)` không truyền
// đơn giá → mọi đơn có giá thoả thuận bị tính lại theo giá niêm yết ngay lần đầu HDV lưu (kể cả gửi lại y nguyên số khách).
// Fixture CỐ Ý có `unitPrice ≠ catalogPrice` — mọi fixture cũ đặt hai giá bằng nhau nên không bao giờ lộ lỗi này.
import { test } from "node:test";
import assert from "node:assert/strict";
import type { CompanyDto, OrderDetailDto } from "../../shared/contracts.ts";
import { buildConfirmation } from "../../shared/order-confirmation.ts";
import { dungBienNhan } from "../receipt/rules.ts";
import { applyAdjustmentToOrder, effectiveService, effectiveSubtotal, recomputeService, type SubtotalServiceInput } from "./money-adjustment.ts";
import type { StoredService } from "./service-rules.ts";

const ZERO = { adult: 0, child: 0, senior: 0, infant: 0 };
const LIST = 1_350_000; // giá niêm yết (danh mục lúc lập)
const DEAL = 1_000_000; // giá đã thoả thuận với khách

const stored = (over: Partial<StoredService> = {}): StoredService =>
  ({
    id: "svc-1", catalogCode: "TD101", name: "Tour 4 đảo", unit: "perPax", pax: { ...ZERO, adult: 2 },
    items: [{ paxCode: "adult", detail: null, catalogPrice: LIST, unitPrice: DEAL }],
    ...over,
  }) as StoredService;

const subtotalInput = (over: Partial<SubtotalServiceInput> = {}): SubtotalServiceInput =>
  ({
    id: "svc-1", catalogCode: "TD101", name: "Tour 4 đảo", unit: "perPax",
    items: [{ paxCode: "adult", catalogPrice: LIST, unitPrice: DEAL, lineTotal: 2 * DEAL }],
    ...over,
  }) as SubtotalServiceInput;

test("DK-T2-01 recomputeService: 2→3 người lớn dùng GIÁ THOẢ THUẬN (3 × 1.000.000), không phải giá niêm yết", () => {
  const r = recomputeService(stored(), { ...ZERO, adult: 3 });
  assert.ok(r.ok, JSON.stringify(r));
  if (!r.ok) return;
  assert.equal(r.subtotal, 3 * DEAL);
  assert.equal(r.lines[0]!.unitPrice, DEAL);
  assert.equal(r.lines[0]!.catalogPrice, LIST, "giá niêm yết vẫn được giữ để truy vết lệch giá");
});

test("DK-T2-01 recomputeService: gửi lại Y NGUYÊN số khách → tiền không đổi (2 × 1.000.000)", () => {
  const r = recomputeService(stored(), { ...ZERO, adult: 2 });
  assert.ok(r.ok && r.subtotal === 2 * DEAL, JSON.stringify(r));
});

test("DK-T2-01 recomputeService: dịch vụ theo NHÓM (per5Pax) có giá thoả thuận — 5→7 khách = 2 lượt × giá thoả thuận", () => {
  const r = recomputeService(stored({ unit: "per5Pax", pax: { ...ZERO, adult: 5 }, items: [{ paxCode: "adult", detail: null, catalogPrice: 5_000_000, unitPrice: 4_200_000 } as never] }), { ...ZERO, adult: 7 });
  assert.ok(r.ok, JSON.stringify(r));
  if (r.ok) assert.equal(r.subtotal, 2 * 4_200_000);
});

test("DK-T2-01 recomputeService: người lớn giá thoả thuận, trẻ em giá niêm yết — mỗi loại giữ đúng đơn giá của mình", () => {
  const r = recomputeService(
    stored({ pax: { ...ZERO, adult: 2, child: 1 }, items: [{ paxCode: "adult", detail: null, catalogPrice: LIST, unitPrice: DEAL }, { paxCode: "child", detail: null, catalogPrice: 700_000, unitPrice: 700_000 }] as never }),
    { ...ZERO, adult: 3, child: 2 },
  );
  assert.ok(r.ok, JSON.stringify(r));
  if (r.ok) assert.equal(r.subtotal, 3 * DEAL + 2 * 700_000);
});

test("DK-T2-01 recomputeService: dòng đã lưu THIẾU đơn giá (không phải số) → TỪ CHỐI, không bao giờ lùi về giá niêm yết", () => {
  const r = recomputeService(stored({ items: [{ paxCode: "adult", detail: null, catalogPrice: LIST } as never] }), { ...ZERO, adult: 3 });
  assert.ok(!r.ok, "thiếu đơn giá thoả thuận phải là lỗi, không phải tính theo giá niêm yết");
});

test("DK-T2-01 effectiveService/effectiveSubtotal (danh sách, Trang chủ, nơi ghi): tính lại theo giá thoả thuận", () => {
  assert.equal(effectiveService(subtotalInput(), { ...ZERO, adult: 3 }).subtotal, 3 * DEAL);
  assert.equal(effectiveSubtotal([subtotalInput()], [{ serviceId: "svc-1", pax: { ...ZERO, adult: 2 } }]), 2 * DEAL, "y nguyên số khách → y nguyên tiền");
});

test("DK-T2-01 effectiveService: dòng đọc lên thiếu đơn giá → lùi về tiền ĐÃ LƯU (own), không phải giá niêm yết", () => {
  const eff = effectiveService(subtotalInput({ items: [{ paxCode: "adult", catalogPrice: LIST, lineTotal: 2 * DEAL } as never] }), { ...ZERO, adult: 3 });
  assert.equal(eff.subtotal, 2 * DEAL);
  assert.equal(eff.recomputed, undefined);
});

const order = (): OrderDetailDto => ({
  id: "o1", orderCode: "TD-1", staffId: "s1", staffName: "A", bookerPartyId: null, bookerName: null,
  status: "confirmed", customerName: "K", customerPhone: "090", customerEmail: null, customerNote: null,
  subtotal: 2 * DEAL, discount: 0, total: 2 * DEAL,
  paymentNote: null, createdAt: "t", updatedAt: "t", confirmedAt: "t", deliveredAt: null, completedAt: null,
  services: [
    {
      id: "svc-1", kind: "catalog", catalogCode: "TD101", name: "Tour 4 đảo", unit: "perPax", pax: { ...ZERO, adult: 2 },
      departDate: "2026-10-01", departTime: null, pickupTime: null, pickupPlace: null, checkinDate: null, checkinTime: null, checkinPlace: null, note: null,
      items: [{ id: "it-1", catalogCode: "TD101", paxCode: "adult", description: "Tour 4 đảo — Người lớn", detail: "", quantity: 2, unitPrice: DEAL, catalogPrice: LIST, lineTotal: 2 * DEAL }],
      catalogStatus: null,
    },
  ],
});

test("DK-T2-01 applyAdjustmentToOrder (chi tiết đơn): sau điều chỉnh 2→3 → tạm tính 3.000.000 (còn lại: billing — sổ tiền lượt 1)", () => {
  const out = applyAdjustmentToOrder(order(), [{ serviceId: "svc-1", pax: { ...ZERO, adult: 3 } }]);
  assert.equal(out.subtotal, 3 * DEAL);
  assert.equal(out.total, 3 * DEAL);
  assert.equal(out.services[0]!.items[0]!.unitPrice, DEAL);
});

test("DK-T2-01 applyAdjustmentToOrder: gửi lại y nguyên → số hiển thị không đổi (tổng 2.000.000, không phải 2.700.000)", () => {
  const out = applyAdjustmentToOrder(order(), [{ serviceId: "svc-1", pax: { ...ZERO, adult: 2 } }]);
  assert.equal(out.total, 2 * DEAL);
});

test("DK-T2-01 phiếu xác nhận gửi khách (dựng từ đơn đã áp điều chỉnh): in đơn giá thoả thuận và tổng đúng", () => {
  const company = { name: "CÔNG TY TNHH TOUR ĐẢO", taxCode: "0", address: "", hotline: "", email: "", website: "" } as unknown as CompanyDto;
  // Sổ tiền lượt 1 (Task 8): phiếu dựng từ BIÊN NHẬN máy chủ (`dungBienNhan` — danh sách trắng), không từ cả đơn.
  const receipt = dungBienNhan(applyAdjustmentToOrder(order(), [{ serviceId: "svc-1", pax: { ...ZERO, adult: 3 } }]), company, { daTra: 1_000_000, conLai: 2_000_000 });
  const model = buildConfirmation(receipt, null);
  const text = JSON.stringify(model);
  assert.match(text, /1\.000\.000/, "đơn giá thoả thuận phải có trên phiếu");
  assert.doesNotMatch(text, /1\.350\.000/, "giá niêm yết KHÔNG được in lên phiếu");
  assert.match(text, /3\.000\.000/, "tổng cộng 3 × 1.000.000");
});
