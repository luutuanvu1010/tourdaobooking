// ADR-0068 G10: "số dòng công nợ còn hiệu lực của hồ sơ phụ" (giữ ở hồ sơ phụ, xem trước hiện số) — dòng đảo và dòng đã bị đảo không tính.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
import { soDongNoCuaNguoiRow } from "./repository.ts";
import { gieoDongTienKhop } from "../../../tests/audit/dong-tien.mjs";

const SA = "77777777-7777-4777-8777-777777777777";
const AT = "2026-09-30T01:00:00.000Z";
test("đếm dòng nợ còn hiệu lực theo người nợ hoặc người được nợ", async () => {
  const w = world();
  seedStaff(w.sqlite, { id: SA, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  const P = `pty-${SA}`;
  const ct = w.q("SELECT party_id FROM v_pty_owner_company")[0].party_id as string;
  w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, created_at, updated_at)
    VALUES ('o1', 'TD-o1', ?, 'draft', 'K', '0900000099', 300000, 300000, 300000, ?, ?)`).run(SA, AT, AT);
  w.sqlite.prepare("INSERT INTO order_service (id, order_id, name, unit, pax_adult, depart_date) VALUES ('sv1', 'o1', 'Vé', 'perPax', 1, '2026-10-10')").run();
  gieoDongTienKhop(w.sqlite, "o1");
  w.sqlite.prepare("UPDATE orders SET status = 'confirmed', confirmed_at = ? WHERE id = 'o1'").run(AT);
  w.sqlite.prepare(`INSERT INTO bil_posting (id, kind_code, order_id, reason, reverses_posting_id, occurred_date, due_snapshot, created_at, created_by, updated_at, updated_by)
    VALUES ('p1', 'RECEIPT', 'o1', NULL, NULL, '2026-09-30', NULL, ?, ?, ?, ?)`).run(AT, SA, AT, SA);
  const line = (id: string, reverses: string | null) =>
    w.sqlite.prepare(`INSERT INTO bil_debt_line (id, posting_id, debtor_party_id, creditor_party_id, amount, kind_code, order_id, trip_id, order_service_id, receipt_id, reverses_line_id,
      created_at, created_by, updated_at, updated_by) VALUES (?, 'p1', ?, ?, 1000, 'HELD', 'o1', NULL, NULL, NULL, ?, ?, ?, ?, ?)`).run(id, reverses ? ct : P, reverses ? P : ct, reverses, AT, SA, AT, SA);
  line("l1", null);
  line("l2", null);
  line("l2r", "l2");
  assert.equal(await soDongNoCuaNguoiRow(w.env.DB, P), 1, "l1 còn hiệu lực; l2 đã bị đảo; l2r là dòng đảo");
  assert.equal(await soDongNoCuaNguoiRow(w.env.DB, "pty-khong-co"), 0);
});
