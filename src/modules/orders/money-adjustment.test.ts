import { test } from "node:test";
import assert from "node:assert/strict";
import { parseMoneyEditInput, recomputeService } from "./money-adjustment.ts";
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

test("parseMoneyEditInput: thân không phải object, services không phải mảng/dòng sai dạng → từ chối", () => {
  for (const body of [null, {}, { reason: "x" }, { reason: "x", services: "x" }, { reason: "x", services: [{}] }, { reason: "x", services: [{ id: "svc-1" }] }]) {
    const r = parseMoneyEditInput(body as Record<string, unknown> | null, ["svc-1"]);
    assert.ok(!r.ok, JSON.stringify(body));
  }
});
