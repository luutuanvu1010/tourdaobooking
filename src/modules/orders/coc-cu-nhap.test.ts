// Q2 (sổ tiền lượt 1 — chủ trả lời 2026-09-30 "Đưa cọc cũ về 0, ghi nhật ký"; kế hoạch Task 7, rủi ro R10): đơn NHÁP CŨ còn cọc ghi trên đơn. Lưu nháp làm
// tổng < cọc cũ → trước đây trigger 0007 (`remaining ≥ 0`) báo lỗi thô; nay câu lưu nháp đưa cột cọc về 0 và dòng nhật ký `updated` ghi số cọc cũ. Lưu
// nháp mà tổng ≥ cọc cũ → GIỮ cột cọc (chỉ tính lại phần dư để thoả 0007). Đơn MỚI: cọc 0 / NULL / total. Chạy trên khung thử (ứng dụng thật + SQLite).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const inDays = (n: number) => new Date(Date.now() + 7 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);
const body = (adult: number, extra: Record<string, unknown> = {}) => ({
  customerName: "Khách Thử", customerPhone: "0912345678",
  services: [{ kind: "catalog", catalogCode: "ZA1", pax: { adult, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 500000 }, departDate: inDays(3) }],
  ...extra,
});
function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  w.sqlite.exec("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('ZA1', 'Tour đảo', 'perPax', 500000, 1, '2026-01-01', '2026-01-01')");
  return w;
}
const cot = (w: any, id: string) => ({ ...w.q("SELECT total, deposit_amount, deposit_method, remaining_amount FROM orders WHERE id = ?", id)[0] });

test("đơn MỚI: ba cột cọc = 0 / NULL / total (ADR-0026 đ9) — thân còn khoản trả trước > 0 (trang cũ) → 409 client_outdated, không tạo đơn", async () => {
  const w = setup();
  const r = await w.call("POST", "/api/orders", { as: SALES, body: body(2) });
  assert.equal(r.status, 201, r.text);
  assert.deepEqual(cot(w, r.json.order.id), { total: 1_000_000, deposit_amount: 0, deposit_method: null, remaining_amount: 1_000_000 });
  const cu = await w.call("POST", "/api/orders", { as: SALES, body: body(2, { depositAmount: 200000, depositMethod: "cash" }) });
  assert.equal(cu.status, 409, cu.text);
  assert.equal(cu.json.error.code, "client_outdated");
  assert.equal(w.q("SELECT count(*) AS n FROM orders")[0].n, 1);
});

test("Q2: nháp cũ cọc 800.000 — lưu nháp tổng 500.000 (< cọc) → cọc về 0, nhật ký ghi số cọc cũ; lưu nháp tổng 1.000.000 (≥ cọc) → giữ cọc", async () => {
  const w = setup();
  const r = await w.call("POST", "/api/orders", { as: SALES, body: body(2) });
  const id = r.json.order.id;
  // Mô phỏng nháp CŨ (trước sổ tiền): cọc 800.000 ghi thẳng trên đơn.
  w.sqlite.prepare("UPDATE orders SET deposit_amount = 800000, deposit_method = 'cash', remaining_amount = 200000 WHERE id = ?").run(id);
  const giu = await w.call("PUT", `/api/orders/${id}`, { as: SALES, body: { ...body(2), expectedUpdatedAt: r.json.order.updatedAt } });
  assert.equal(giu.status, 200, giu.text);
  assert.deepEqual(cot(w, id), { total: 1_000_000, deposit_amount: 800_000, deposit_method: "cash", remaining_amount: 200_000 }, "tổng ≥ cọc cũ → giữ cột cọc");
  const ha = await w.call("PUT", `/api/orders/${id}`, { as: SALES, body: { ...body(1), expectedUpdatedAt: giu.json.order.updatedAt } });
  assert.equal(ha.status, 200, ha.text);
  assert.deepEqual(cot(w, id), { total: 500_000, deposit_amount: 0, deposit_method: null, remaining_amount: 500_000 }, "tổng < cọc cũ → cọc về 0 (Q2)");
  const nk = w.q("SELECT detail FROM audit_log WHERE order_id = ? AND action = 'updated' ORDER BY rowid DESC LIMIT 1", id)[0].detail as string;
  assert.match(nk, /đưa tiền thu trước cũ 800\.000 ₫ ghi trên đơn về 0/);
  assert.doesNotMatch(nk, /0912345678/, "không SĐT trong nhật ký");
});
