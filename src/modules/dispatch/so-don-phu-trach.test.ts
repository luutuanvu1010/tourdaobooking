// ADR-0068 Đ2: "hồ sơ phụ đang là người phụ trách đơn chưa xong" — đếm dòng HANDLE đang mở trên đơn chưa huỷ, chưa giao.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
import { soDonDangPhuTrach } from "./repository.ts";
import { gieoLyDoHuy } from "../../../tests/audit/huy-don.mjs";

const SA = "77777777-7777-4777-8777-777777777777";
const AT = "2026-09-01T00:00:00.000Z";
test("đếm HANDLE mở của hồ sơ trên đơn chưa huỷ, chưa giao; dòng đã đóng, đơn đã huỷ, đơn đã giao, việc PICKUP không tính", async () => {
  const w = world();
  seedStaff(w.sqlite, { id: SA, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  const P = `pty-${SA}`;
  for (const [id, st] of [["o1", "draft"], ["o2", "confirmed"], ["o3", "cancelled"], ["o4", "delivered"]] as const) {
    w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, created_at, updated_at)
      VALUES (?, ?, ?, 'draft', 'K', '0900000099', 1, 1, 1, ?, ?)`).run(id, `TD-${id}`, SA, AT, AT);
    w.sqlite.prepare("INSERT INTO order_service (id, order_id, name, unit, pax_adult, depart_date) VALUES (?, ?, 'Vé', 'perPax', 1, '2026-10-10')").run(`sv-${id}`, id);
    w.sqlite.prepare(`INSERT INTO dsp_assignment (id, order_id, task_kind_code, party_id, status_code, valid_from_at, created_at, updated_at) VALUES (?, ?, 'HANDLE', ?, 'PENDING', ?, ?, ?)`)
      .run(`h-${id}`, id, P, AT, AT, AT);
    if (st === "cancelled") { gieoLyDoHuy(w.sqlite, id); w.sqlite.prepare("UPDATE orders SET status = 'cancelled' WHERE id = ?").run(id); }
    if (st === "confirmed" || st === "delivered") w.sqlite.prepare("UPDATE orders SET status = 'confirmed', confirmed_at = ? WHERE id = ?").run(AT, id);
    if (st === "delivered") w.sqlite.prepare("UPDATE orders SET delivered_at = ?, delivered_by = ? WHERE id = ?").run(AT, SA, id);
  }
  // việc PICKUP (hạt đơn) đang mở trên đơn o1 / o2: KHÔNG được tính là "phụ trách"
  for (const o of ["o1", "o2"]) {
    w.sqlite.prepare(`INSERT INTO dsp_assignment (id, order_id, task_kind_code, party_id, status_code, valid_from_at, created_at, updated_at) VALUES (?, ?, 'PICKUP', ?, 'PENDING', ?, ?, ?)`)
      .run(`p-${o}`, o, P, AT, AT, AT);
  }
  assert.equal(await soDonDangPhuTrach(w.env.DB, P), 2);
  w.sqlite.prepare("UPDATE dsp_assignment SET valid_to_at = ? WHERE id = 'h-o1'").run("2026-09-02T00:00:00.000Z");
  assert.equal(await soDonDangPhuTrach(w.env.DB, P), 1);
  assert.equal(await soDonDangPhuTrach(w.env.DB, "pty-khong-co"), 0);
});
