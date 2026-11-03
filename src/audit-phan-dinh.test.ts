// Bất biến phân định trách nhiệm (ADR-0116; scripts/audit-checks.mjs R-BIL-1, R-BIL-PD1–3): chạy CHÍNH câu SQL của script trên dữ liệu dựng qua route thật; gỡ trigger, phá dữ liệu thì câu kiểm phải đếm ra vi phạm.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../tests/audit/harness.mjs";
import { gieoBanChup } from "../tests/audit/gieo-ban-chup.mjs";

const { CHECKS } = (await import(new URL("../scripts/audit-checks.mjs", import.meta.url).href)) as { CHECKS: { code: string; sql: string; mode?: string; level: string }[] };
const SALES = "11111111-1111-4111-8111-111111111111";
const HDV = "22222222-2222-4222-8222-222222222222";
const QT = "33333333-3333-4333-8333-333333333333";
const KT = "44444444-4444-4444-8444-444444444444";
const AT = "2026-09-01T00:00:00.000Z";
const hom = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
type W = ReturnType<typeof world>;
const dem = (w: W, code: string): number => {
  const c = CHECKS.find((x) => x.code === code);
  assert.ok(c, code);
  return Number(Object.values(w.sqlite.prepare(c!.sql).get() as Record<string, unknown>)[0]);
};

async function dung(soTien = 200_000, ben: string | null = `pty-${HDV}`): Promise<{ w: W; id: string }> {
  const w = world();
  for (const [i, p, n, q] of [[SALES, "0900000001", "An", "SALES"], [HDV, "0900000002", "Nam", "FIELD"], [QT, "0900000003", "Quản", "ADMIN"], [KT, "0900000005", "Lan", "ACCOUNTING"]] as const) seedStaff(w.sqlite, { id: i, phone: p, name: n, perms: [q] });
  const id = "99999999-9999-4999-8999-000000000001";
  w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, created_at, updated_at) VALUES (?, 'TD-1', ?, 'draft', 'Khách Giả', '0900000099', 1000000, 1000000, 1000000, ?, ?)`).run(id, SALES, AT, AT);
  w.sqlite.prepare(`INSERT INTO order_service (id, order_id, name, unit, pax_adult, depart_date) VALUES (?, ?, 'Vé', 'perPax', 1, ?)`).run(`${id}-s`, id, hom());
  w.sqlite.prepare(`INSERT INTO order_item (id, order_id, service_id, description, quantity, unit_price, line_total) VALUES (?, ?, ?, 'Người lớn', 1, 1000000, 1000000)`).run(`${id}-i`, id, `${id}-s`);
  w.sqlite.prepare(`UPDATE orders SET status = 'confirmed', confirmed_at = ?, updated_at = ? WHERE id = ?`).run(AT, AT, id);
  gieoBanChup(w.sqlite, id);
  w.sqlite.prepare(`INSERT INTO dsp_assignment (id, order_id, task_kind_code, party_id, status_code, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES ('a1', ?, 'HANDLE', ?, 'PENDING', ?, ?, NULL, ?, NULL)`).run(id, `pty-${HDV}`, AT, AT, AT);
  assert.equal((await w.call("POST", `/api/orders/${id}/payments`, { as: KT, body: { soTien: 1_000_000, hinhThuc: "CASH", nguoiThu: "cong_ty" } })).status, 201);
  assert.equal((await w.call("POST", `/api/orders/${id}/delivered`, { as: HDV, body: {} })).status, 200);
  const q = (await w.call("POST", "/api/ledger/phan-dinh", { as: KT, body: { orderId: id, soTien, lyDo: "Khách phản ánh quên đón" } })).json.id;
  const r = await w.call("POST", `/api/ledger/phan-dinh/${q}/quyet`, { as: QT, body: { soTien, truongHop: ben ? "T6" : "T10", coTienRa: true, lyDo: "Đã nghe hai bên trình bày", ...(ben ? { benChiuPartyId: ben } : {}) } });
  assert.equal(r.status, 201, r.text);
  const g = await w.call("POST", `/api/ledger/phan-dinh/${r.json.id}/ghi`, { as: KT, body: { hinhThuc: "CASH" } });
  assert.equal(g.status, 201, g.text);
  return { w, id };
}

test("dữ liệu đi đường thật: R-BIL-1, R-BIL-PD1–3 đều 0 và đều mức fail", async () => {
  const { w } = await dung();
  for (const c of ["R-BIL-1", "R-BIL-PD1", "R-BIL-PD2", "R-BIL-PD3", "R-BIL-13"]) assert.equal(dem(w, c), 0, c);
  for (const c of ["R-BIL-PD1", "R-BIL-PD2", "R-BIL-PD3"]) assert.equal(CHECKS.find((x) => x.code === c)!.level, "fail");
});
test("công ty chịu: không dòng nợ vẫn khớp R-BIL-PD1", async () => {
  const { w } = await dung(200_000, null);
  assert.equal(dem(w, "R-BIL-PD1"), 0);
});
test("R-BIL-PD1 bắt dòng nợ lệch: chèn thêm dòng ATTRIBUTION khi gỡ trigger ⇒ 1", async () => {
  const { w, id } = await dung();
  w.sqlite.exec("DROP TRIGGER bil_debt_line_attribution_match");
  const p = String(w.q("SELECT id FROM bil_posting WHERE order_id = ? AND kind_code = 'ATTRIBUTION'", id)[0].id);
  const ct = String(w.q("SELECT party_id FROM v_pty_owner_company")[0].party_id);
  w.sqlite.prepare(`INSERT INTO bil_debt_line (id, posting_id, debtor_party_id, creditor_party_id, amount, kind_code, order_id, created_at, created_by, updated_at, updated_by) VALUES ('x1', ?, ?, ?, 1000, 'ATTRIBUTION', ?, ?, ?, ?, ?)`).run(p, `pty-${HDV}`, ct, id, AT, KT, AT, KT);
  assert.equal(dem(w, "R-BIL-PD1"), 1);
});
test("R-BIL-PD2 bắt cùng người (sửa created_by khi gỡ trigger) ⇒ 1; R-BIL-PD3 bắt thiếu lần trả khách ⇒ 1; R-BIL-1 bắt lệch I1 ⇒ 1", async () => {
  const { w, id } = await dung();
  w.sqlite.exec("DROP TRIGGER bil_attribution_no_update");
  w.sqlite.prepare("UPDATE bil_attribution SET created_by = ? WHERE order_id = ? AND step_code = 'POSTED'").run(QT, id);
  assert.equal(dem(w, "R-BIL-PD2"), 1);
  w.sqlite.prepare("UPDATE bil_attribution SET amount = 150000 WHERE order_id = ? AND step_code = 'POSTED'").run(id);
  assert.equal(dem(w, "R-BIL-PD3"), 1);
  assert.equal(dem(w, "R-BIL-1"), 1, "phải thu đổi mà đã thu không đổi");
});
