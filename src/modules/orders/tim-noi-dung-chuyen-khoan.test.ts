// Đặc tả QR §4.3, §8.9: gõ nội dung chuyển khoản (không gạch, hoa/thường, lẫn trong nội dung ngân hàng in) vào ô tìm ⇒ ra đúng đơn.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const AT = "2026-10-08T01:00:00.000Z";

test("tìm 'td202610080012' / nội dung sao kê ⇒ đơn TD-20261008-0012, không lẫn đơn 0013", async () => {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An Bán", perms: ["SALES"] });
  const don = (id: string, ma: string) => w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, created_at, updated_at)
    VALUES (?, ?, ?, 'draft', 'Khách Giả', '0900000099', 0, 0, 0, ?, ?)`).run(id, ma, SALES, AT, AT);
  don("99999999-9999-4999-8999-000000000012", "TD-20261008-0012");
  don("99999999-9999-4999-8999-000000000013", "TD-20261008-0013");
  for (const q of ["td202610080012", "TD202610080012", "TD-20261008-0012", "MBVCB.123.TD202610080012.CT"]) {
    const r = await w.call("GET", `/api/orders?limit=100&q=${encodeURIComponent(q)}`, { as: SALES });
    assert.equal(r.status, 200, r.text);
    assert.deepEqual(r.json.orders.map((o: { id: string }) => o.id), ["99999999-9999-4999-8999-000000000012"], q);
  }
  // Chữ không phải mã đơn: hành vi cũ (tìm theo tên khách vẫn ra cả hai).
  const ten = await w.call("GET", `/api/orders?limit=100&q=${encodeURIComponent("Khách Giả")}`, { as: SALES });
  assert.equal(ten.json.orders.length, 2);
});
