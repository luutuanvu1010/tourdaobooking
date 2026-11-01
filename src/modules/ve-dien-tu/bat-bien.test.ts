// Ba bất biến dữ liệu của kho vé (R-VDT-1..3 ở scripts/audit-checks.mjs; ADR-0153): bài dựng dữ liệu SAI cố ý rồi đòi mỗi kiểm bắt được đúng một vi phạm.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { CHECKS } from "../../../scripts/audit-checks.mjs";
import { AT, taoCsdl, themLo, themVe } from "../../khung-thu-ve.test.ts";

const kiem = (d: ReturnType<typeof taoCsdl>, ma: string): number => {
  const c = CHECKS.find((x: { code: string }) => x.code === ma)!;
  return Number(Object.values(d.prepare(c.sql).get() as Record<string, unknown>)[0]);
};

test("R-VDT-1..3: dữ liệu sạch ⇒ 0; vé ALLOCATED không phân bổ ⇒ R-VDT-1 bắt; phân bổ mở trỏ vé AVAILABLE ⇒ R-VDT-2 bắt; vé đã lộ về kho ⇒ R-VDT-3 bắt", () => {
  const d = taoCsdl();
  const lo = themLo(d);
  const v1 = themVe(d, lo);
  for (const m of ["R-VDT-1", "R-VDT-2", "R-VDT-3"]) assert.equal(kiem(d, m), 0, `${m} sạch`);
  d.prepare("UPDATE vdt_ticket SET status = 'ALLOCATED', updated_at = ? WHERE id = ?").run(AT, v1);
  assert.equal(kiem(d, "R-VDT-1"), 1, "ALLOCATED không có phân bổ mở");
  d.prepare("INSERT INTO vdt_allocation (id, ticket_id, order_id, order_service_id, pax_group, slot_no, allocated_at, created_at, updated_at) VALUES ('a1', ?, 'o', 's', 'ADULT', 1, ?, ?, ?)").run(v1, AT, AT, AT);
  assert.equal(kiem(d, "R-VDT-1"), 0);
  d.prepare("UPDATE vdt_allocation SET revealed_at = ?, updated_at = ? WHERE id = 'a1'").run(AT, AT);
  // đưa vé về AVAILABLE bằng SQL thô: trigger một chiều chặn đường này, nên chỉ kiểm khi tắt tạm trigger (mô phỏng SQL chạy tay)
  d.exec("DROP TRIGGER vdt_ticket_one_way");
  d.prepare("UPDATE vdt_ticket SET status = 'AVAILABLE', updated_at = ? WHERE id = ?").run(AT, v1);
  assert.equal(kiem(d, "R-VDT-2"), 1, "phân bổ mở trỏ vé AVAILABLE");
  assert.equal(kiem(d, "R-VDT-3"), 1, "vé đã lộ nằm AVAILABLE");
});
