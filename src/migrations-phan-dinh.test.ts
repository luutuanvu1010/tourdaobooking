// Lớp CSDL của migration 0135 (ADR-0116): SQL chạy THẲNG, không qua máy chủ — trigger phải tự chặn. Đơn và chuỗi dựng qua route thật của khung thử, rồi gõ tay từng câu đi vòng.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../tests/audit/harness.mjs";
import { gieoBanChup } from "../tests/audit/gieo-ban-chup.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const HDV = "22222222-2222-4222-8222-222222222222";
const QT = "33333333-3333-4333-8333-333333333333";
const KT = "44444444-4444-4444-8444-444444444444";
const AT = "2026-09-01T00:00:00.000Z";
const NOW = "2026-11-02T00:00:00.000Z";
const hom = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
let seq = 0;
const uuid = () => `99999999-9999-4999-8999-${String(++seq).padStart(12, "0")}`;
type W = ReturnType<typeof world>;

async function dung(): Promise<{ w: W; id: string; q: string; r: string; ct: string }> {
  const w = world();
  for (const [i, p, n, q] of [[SALES, "0900000001", "An", "SALES"], [HDV, "0900000002", "Nam", "FIELD"], [QT, "0900000003", "Quản", "ADMIN"], [KT, "0900000005", "Lan", "ACCOUNTING"]] as const) seedStaff(w.sqlite, { id: i, phone: p, name: n, perms: [q] });
  const id = uuid();
  w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, created_at, updated_at) VALUES (?, ?, ?, 'draft', 'Khách Giả', '0900000099', 1000000, 1000000, 1000000, ?, ?)`).run(id, `TD-${seq}`, SALES, AT, AT);
  w.sqlite.prepare(`INSERT INTO order_service (id, order_id, name, unit, pax_adult, depart_date) VALUES (?, ?, 'Vé', 'perPax', 1, ?)`).run(`${id}-s`, id, hom());
  w.sqlite.prepare(`INSERT INTO order_item (id, order_id, service_id, description, quantity, unit_price, line_total) VALUES (?, ?, ?, 'Người lớn', 1, 1000000, 1000000)`).run(`${id}-i`, id, `${id}-s`);
  w.sqlite.prepare(`UPDATE orders SET status = 'confirmed', confirmed_at = ?, updated_at = ? WHERE id = ?`).run(AT, AT, id);
  gieoBanChup(w.sqlite, id);
  w.sqlite.prepare(`INSERT INTO dsp_assignment (id, order_id, task_kind_code, party_id, status_code, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES (?, ?, 'HANDLE', ?, 'PENDING', ?, ?, NULL, ?, NULL)`).run(uuid(), id, `pty-${HDV}`, AT, AT, AT);
  assert.equal((await w.call("POST", `/api/orders/${id}/payments`, { as: KT, body: { soTien: 1_000_000, hinhThuc: "CASH", nguoiThu: "cong_ty" } })).status, 201);
  assert.equal((await w.call("POST", `/api/orders/${id}/delivered`, { as: HDV, body: {} })).status, 200);
  const q = (await w.call("POST", "/api/ledger/phan-dinh", { as: KT, body: { orderId: id, soTien: 200_000, lyDo: "Khách phản ánh quên đón" } })).json.id;
  const r = (await w.call("POST", `/api/ledger/phan-dinh/${q}/quyet`, { as: QT, body: { soTien: 200_000, truongHop: "T6", benChiuPartyId: `pty-${HDV}`, coTienRa: true, lyDo: "Đã nghe hai bên trình bày" } })).json.id;
  return { w, id, q, r, ct: String(w.q("SELECT party_id FROM v_pty_owner_company")[0].party_id) };
}
const chen = (w: W, o: { id?: string; order: string; buoc: string; target?: string | null; root?: string | null; ca?: string | null; ben?: string | null; so?: number | null; ra?: number | null; ly?: string | null; phieu?: string | null; by: string }) =>
  w.sqlite.prepare(`INSERT INTO bil_attribution (id, order_id, step_code, target_id, root_id, case_code, liable_party_id, amount, money_out, reason, posting_id, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(o.id ?? uuid(), o.order, o.buoc, o.target ?? null, o.root ?? null, o.ca ?? null, o.ben ?? null, o.so ?? null, o.ra ?? null, o.ly ?? "Lý do đủ dài để qua", o.phieu ?? null, NOW, o.by, NOW, o.by);
const posted = (w: W, ctx: { id: string; r: string }, by: string, so = 200_000) => chen(w, { order: ctx.id, buoc: "POSTED", target: ctx.r, ca: "T6", ben: `pty-${HDV}`, so, ra: 1, phieu: uuid(), by });

test("migration chỉ thêm, không đụng tệp cũ: có đủ trigger chính; mở lại 0083 thì trigger đã dựng lại", () => {
  const sql = readFileSync(new URL("../migrations/0135_bil_phan_dinh_trach_nhiem.sql", import.meta.url), "utf8");
  for (const t of ["bil_receipt_after_delivered", "bil_posting_replacement_check", "bil_posting_completed_due", "bil_posting_completed_settled", "bil_refund_within_held"]) assert.match(sql, new RegExp(`DROP TRIGGER[^;]*${t}`), t);
});

test("TC3 trigger: người ghi = người phân định ⇒ chặn khi chèn thẳng", async () => {
  const { w, id, r } = await dung();
  assert.throws(() => posted(w, { id, r }, QT), /attribution_same_person/);
});

test("Chuỗi chỉ-thêm: UPDATE, DELETE đều bị chặn; bước POSTED sai số so với phân định ⇒ chặn", async () => {
  const { w, id, r, q } = await dung();
  assert.throws(() => w.sqlite.prepare("UPDATE bil_attribution SET amount = 1 WHERE id = ?").run(q));
  assert.throws(() => w.sqlite.prepare("DELETE FROM bil_attribution WHERE id = ?").run(q));
  assert.throws(() => posted(w, { id, r }, KT, 150_000), /attribution_post_invalid/);
  assert.equal(Number(w.q("SELECT count(*) AS n FROM bil_attribution WHERE order_id = ? AND step_code = 'POSTED'", id)[0].n), 0);
});

test("TC6 trigger: bên chịu là khách thuần, hồ sơ không có ⇒ chặn; một đề nghị đúng một phân định", async () => {
  const { w, id, q } = await dung();
  w.sqlite.exec(`INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('pty-kh', 'PERSON', 'Khách', 1, '${AT}', '${AT}')`);
  w.sqlite.exec(`INSERT INTO pty_party_role (id, party_id, role_type_code, location_id, valid_from_date, created_at, updated_at) VALUES ('r-kh', 'pty-kh', 'CUSTOMER', NULL, '2026-01-01', '${AT}', '${AT}')`);
  const q2 = (await w.call("POST", "/api/ledger/phan-dinh", { as: KT, body: { orderId: id, soTien: 100_000, lyDo: "Đề nghị thứ hai của đơn" } })).json.id;
  assert.throws(() => chen(w, { order: id, buoc: "RULING", target: q2, ca: "T6", ben: "pty-kh", so: 100_000, ra: 1, by: QT }), /attribution_ruling_invalid/);
  assert.throws(() => chen(w, { order: id, buoc: "RULING", target: q2, ca: "T6", ben: "pty-khong-co", so: 100_000, ra: 1, by: QT }), /attribution_ruling_invalid/);
  assert.throws(() => chen(w, { order: id, buoc: "RULING", target: q, ca: "T6", ben: `pty-${HDV}`, so: 100_000, ra: 1, by: QT }), /UNIQUE/);
});

test("I1 trigger: giảm trừ POSTED mà không có lần trả khách / sửa khoản thu trong lô ⇒ phiếu ATTRIBUTION bị chặn; lần trả khách sai số ⇒ chặn", async () => {
  const { w, id, r, ct } = await dung();
  const phieu = uuid();
  chen(w, { order: id, buoc: "POSTED", target: r, ca: "T6", ben: `pty-${HDV}`, so: 200_000, ra: 1, phieu, by: KT });
  assert.throws(() => w.sqlite.prepare(`INSERT INTO bil_posting (id, kind_code, order_id, reason, occurred_date, created_at, created_by, updated_at, updated_by) VALUES (?, 'ATTRIBUTION', ?, 'x', ?, ?, ?, ?, ?)`).run(phieu, id, hom(), NOW, KT, NOW, KT), /attribution_i1/);
  const goc = String(w.q("SELECT id FROM bil_attribution WHERE order_id = ? AND step_code = 'POSTED'", id)[0].id);
  assert.throws(() => w.sqlite.prepare(`INSERT INTO bil_payment_receipt (id, order_id, kind_code, amount, collector_party_id, collector_role_code, method_code, collected_for_party_id, stage_code, occurred_date, created_at, created_by, updated_at, updated_by, attribution_id)
    VALUES (?, ?, 'CUSTOMER_REFUND', 150000, ?, 'COMPANY', 'CASH', ?, 'AT_DELIVERY', ?, ?, ?, ?, ?, ?)`).run(uuid(), id, ct, ct, hom(), NOW, KT, NOW, KT, goc), /attribution_refund_invalid/);
});

test("Dòng nợ ATTRIBUTION chỉ đi trên phiếu ATTRIBUTION có chuỗi: chèn thẳng trên phiếu khác ⇒ chặn", async () => {
  const { w, id, ct } = await dung();
  const p = String(w.q("SELECT id FROM bil_posting WHERE order_id = ? AND kind_code = 'DELIVERED'", id)[0].id);
  assert.throws(() => w.sqlite.prepare(`INSERT INTO bil_debt_line (id, posting_id, debtor_party_id, creditor_party_id, amount, kind_code, order_id, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, ?, 1000, 'ATTRIBUTION', ?, ?, ?, ?, ?)`).run(uuid(), p, `pty-${HDV}`, ct, id, NOW, KT, NOW, KT), /attribution_line_invalid/);
});
