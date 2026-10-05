// F-03 (migration 0081): xác nhận đơn NHÁP có tạm tính lệch Σ thành tiền dòng (dữ liệu cũ / SQL tay) — CSDL chặn (`order_subtotal_mismatch`); route phải
// trả 409 có câu tiếng Việt chỉ cách sửa (Lưu nháp lại: máy chủ tính lại tạm tính từ các dòng), KHÔNG 500. Chạy cả ứng dụng trên khung thử SQLite.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const inDays = (n: number) => new Date(Date.now() + 7 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  w.sqlite.exec("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('ZA1', 'Tour đảo', 'perPax', 500000, 1, '2026-01-01', '2026-01-01')");
  return w;
}

test("F-03: xác nhận đơn nháp lệch tiền (tạm tính ≠ Σ dòng) → 409 order_subtotal_mismatch, câu tiếng Việt; đơn vẫn nháp; Lưu nháp lại rồi xác nhận → 200", async () => {
  const w = setup();
  const ngay = inDays(20);
  const svc = { kind: "catalog", catalogCode: "ZA1", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 500000 }, departDate: ngay, legs: [] };
  const r = await w.call("POST", "/api/orders", { as: SALES, body: { customerName: "Khách Thử", customerPhone: "0912345678", services: [svc] } });
  assert.equal(r.status, 201, r.text);
  const o = r.json.order;
  // Dữ liệu cũ lệch tiền: tạm tính 900.000 trong khi hai dòng cộng 1.000.000 (tổng, phần còn lại khớp để qua trigger 0007).
  w.sqlite.prepare("UPDATE orders SET subtotal = 900000, total = 900000, remaining_amount = 900000 WHERE id = ?").run(o.id);
  const x = await w.call("POST", `/api/orders/${o.id}/status`, { as: SALES, body: { status: "confirmed" } });
  assert.equal(x.status, 409, x.text);
  assert.equal(x.json.error.code, "order_subtotal_mismatch");
  assert.match(x.json.error.message, /Lưu/);
  assert.equal(w.q("SELECT status FROM orders WHERE id = ?", o.id)[0].status, "draft");
  const doc = (await w.call("GET", `/api/orders/${o.id}`, { as: SALES })).json.order;
  const luu = await w.call("PUT", `/api/orders/${o.id}`, {
    as: SALES,
    body: { customerName: "Khách Thử", customerPhone: "0912345678", expectedUpdatedAt: doc.updatedAt, services: [{ ...svc, id: doc.services[0].id }] },
  });
  assert.equal(luu.status, 200, luu.text);
  assert.equal(w.q("SELECT subtotal FROM orders WHERE id = ?", o.id)[0].subtotal, 1_000_000);
  assert.equal((await w.call("POST", `/api/orders/${o.id}/status`, { as: SALES, body: { status: "confirmed" } })).status, 200);
});
