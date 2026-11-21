// ADR-0225 Đ2 (Việc 5 (b2), kế hoạch 16 việc 21/11/2026; migration 0184): «đơn đối tác chỉ thu hộ tiền mặt».
// Chạy CẢ ứng dụng trên khung thử thật (tests/audit/harness.mjs: SQLite đủ migration; lô db.batch() là một giao dịch như D1). Tên, SĐT là GIẢ.
// Dấu chụp ở CÂU XÁC NHẬN: đơn do tài khoản giữ quyền Đối tác lập, hoặc bên đặt mang vai được hưởng hoa hồng ⇒ 1; còn lại ⇒ 0; đơn đã xác nhận trước ngày áp giữ NULL.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const HDV = "22222222-2222-4222-8222-222222222222";
const SUPER = "33333333-3333-4333-8333-333333333333";
const KT = "44444444-4444-4444-8444-444444444444";
const PT = "66666666-6666-4666-8666-666666666666"; // tài khoản Đối tác — hồ sơ pty-<id> mang vai TRAVEL_AGENCY (được hưởng)
const AT = "2026-10-01T00:00:00.000Z";
const vnHomNay = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
let seq = 0;
const uuid = () => `95959595-9595-4959-8959-${String(++seq).padStart(12, "0")}`;
type W = ReturnType<typeof world>;

function setup(): W {
  const w = world({});
  for (const [id, phone, name, perms] of [
    [SALES, "0900000001", "An Bán", ["SALES"]], [HDV, "0900000002", "Nam HDV", ["FIELD"]], [SUPER, "0900000003", "Chủ", ["SUPER_ADMIN"]],
    [KT, "0900000005", "Lan Kế Toán", ["ACCOUNTING"]], [PT, "0900000008", "Đại Lý A", ["PARTNER"]],
  ] as const) seedStaff(w.sqlite, { id, phone, name, perms: [...perms] });
  w.sqlite.exec(`INSERT INTO catalog_item (code, name, unit, price_adult, sheet_row, in_sheet, first_seen_at, updated_at) VALUES ('IRESORT', 'Vé tắm bùn i-resort', 'perPax', 1000000, 1, 1, '${AT}', '${AT}')`);
  return w;
}

/** Đơn NHÁP bằng SQL rồi xác nhận qua route; HDV phụ trách. `dau` = dấu kênh thu (ADR-0178; null = đơn không do tài khoản Đối tác lập). */
async function don(w: W, o: { owner?: string; booker?: string | null; dau?: 0 | 1 | null; xacNhan?: boolean } = {}): Promise<string> {
  const id = uuid();
  const owner = o.owner ?? PT;
  const tong = 1_000_000;
  w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, booker_party_id, company_collects_snapshot, created_at, updated_at)
    VALUES (?, ?, ?, 'draft', 'Khách Giả', '0900000099', ?, ?, ?, ?, ?, ?, ?)`).run(id, `TD-TM-${seq}`, owner, tong, tong, tong, o.booker === undefined ? `pty-${PT}` : o.booker, o.dau === undefined ? 1 : o.dau, AT, AT);
  w.sqlite.prepare(`INSERT INTO order_service (pickup_choice, id, order_id, sort_order, catalog_code, name, unit, pax_adult, depart_date) VALUES ('KHONG_DON', ?, ?, 0, 'IRESORT', 'Vé tắm bùn', 'perPax', 1, ?)`).run(`${id}-s`, id, vnHomNay());
  w.sqlite.prepare(`INSERT INTO order_item (id, order_id, service_id, catalog_code, pax_code, description, quantity, unit_price, catalog_price, line_total) VALUES (?, ?, ?, 'IRESORT', 'adult', 'Người lớn', 1, ?, ?, ?)`)
    .run(`${id}-i`, id, `${id}-s`, tong, tong, tong);
  if (o.xacNhan !== false) {
    const xn = o.booker === null && owner === PT ? await w.xacNhanDonCu(id, owner, SALES) : await w.xacNhanDon(id, owner);
    assert.equal(xn.status, 200, xn.text);
  }
  w.sqlite.prepare(`INSERT INTO dsp_assignment (id, order_id, task_kind_code, party_id, status_code, valid_from_at, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, 'HANDLE', ?, 'PENDING', ?, ?, NULL, ?, NULL)`).run(uuid(), id, `pty-${HDV}`, AT, AT, AT);
  return id;
}
const dau = (w: W, id: string) => w.q("SELECT partner_cash_only AS d FROM orders WHERE id = ?", id)[0].d;
const thu = (w: W, as: string, orderId: string, nguoiThu: unknown, hinhThuc: string, soTien = 100_000) =>
  w.call("POST", `/api/orders/${orderId}/payments`, { as, body: { soTien, hinhThuc, nguoiThu } });
const ma = (r: { json: any }) => r.json?.error?.code;
const soKhoan = (w: W, id: string) => Number(w.q("SELECT count(*) AS n FROM bil_payment_receipt WHERE order_id = ?", id)[0].n);
function chan(r: { status: number; text: string; json: any }) {
  assert.deepEqual([r.status, ma(r)], [409, "don_doi_tac_chi_tien_mat"], r.text);
  assert.equal(r.json.error.message, "Đơn của đối tác chỉ nhận khoản thu hộ bằng tiền mặt. Công ty không nhận chuyển khoản cho đơn này.");
}

test("chụp dấu lúc xác nhận: đơn Đối tác lập ⇒ 1; văn phòng lập «Qua đối tác» (bên đặt được hưởng) ⇒ 1; văn phòng khách lẻ ⇒ 0; nháp ⇒ NULL", async () => {
  const w = setup();
  assert.equal(dau(w, await don(w)), 1, "Đối tác tự lập");
  assert.equal(dau(w, await don(w, { owner: SALES, dau: null })), 1, "văn phòng lập Qua đối tác");
  assert.equal(dau(w, await don(w, { owner: SALES, dau: null, booker: null })), 0, "văn phòng lập khách lẻ");
  assert.equal(dau(w, await don(w, { xacNhan: false })), null, "nháp chưa chụp");
});

test("đơn mang dấu: Công ty / HDV ghi chuyển khoản hoặc «Khác» ⇒ 409, không khoản nào lọt; tiền mặt ⇒ 201; Đối tác «Tôi thu» chuyển khoản (khách trả thẳng đối tác) ⇒ 201", async () => {
  const w = setup();
  for (const id of [await don(w), await don(w, { owner: SALES, dau: null })]) {
    const truoc = soKhoan(w, id);
    chan(await thu(w, KT, id, "cong_ty", "BANK_TRANSFER"));
    chan(await thu(w, KT, id, "cong_ty", "OTHER"));
    chan(await thu(w, HDV, id, "toi", "BANK_TRANSFER"));
    chan(await thu(w, KT, id, { partyId: `pty-${HDV}` }, "OTHER"));
    assert.equal(soKhoan(w, id), truoc, "không khoản nào lọt");
    const hdv = await thu(w, HDV, id, "toi", "CASH");
    assert.equal(hdv.status, 201, hdv.text);
  }
  const id = await don(w);
  const pt = await thu(w, PT, id, "toi", "BANK_TRANSFER");
  assert.equal(pt.status, 201, pt.text);
  assert.equal(w.q("SELECT collector_role_code AS v FROM bil_payment_receipt WHERE order_id = ? ORDER BY rowid DESC LIMIT 1", id)[0].v, "BOOKER");
});

test("/delivered kèm khoản thu chuyển khoản của HDV ⇒ 409, đơn không sang «Khách đã trả đủ»", async () => {
  const w = setup();
  const id = await don(w);
  const g = await w.call("POST", `/api/orders/${id}/delivered`, { as: HDV, body: { lanThu: { soTien: 1_000_000, hinhThuc: "BANK_TRANSFER", nguoiThu: "toi" } } });
  chan(g);
  assert.equal(w.q("SELECT delivered_at AS d FROM orders WHERE id = ?", id)[0].d, null);
});

test("đơn khách lẻ (dấu 0) và đơn trước ngày áp (NULL): chuyển khoản vẫn ghi như hôm nay", async () => {
  const w = setup();
  const le = await don(w, { owner: SALES, dau: null, booker: null });
  const r = await thu(w, HDV, le, "toi", "BANK_TRANSFER");
  assert.equal(r.status, 201, r.text);
  const cu = await don(w, { owner: SALES, dau: null });
  w.sqlite.exec("DROP TRIGGER orders_partner_cash_only_guard");
  w.sqlite.prepare("UPDATE orders SET partner_cash_only = NULL WHERE id = ?").run(cu); // giả lập đơn xác nhận trước ngày áp
  const r2 = await thu(w, HDV, cu, "toi", "BANK_TRANSFER");
  assert.equal(r2.status, 201, r2.text);
});

test("QR thanh toán: đơn mang dấu ⇒ { coQr: false } (kể cả với văn phòng); đơn khách lẻ giữ như hôm nay", async () => {
  const w = setup();
  for (const id of [await don(w, { dau: 1 }), await don(w, { owner: SALES, dau: null })]) {
    const r = await w.call("GET", `/api/orders/${id}/qr-thanh-toan`, { as: KT });
    assert.equal(r.status, 200, r.text);
    assert.deepEqual(r.json, { coQr: false });
  }
  const le = await don(w, { owner: SALES, dau: null, booker: null });
  const q = await w.call("GET", `/api/orders/${le}/qr-thanh-toan`, { as: KT });
  assert.deepEqual([q.status, ma(q)], [409, "bank_account_missing"], q.text); // chưa cài tài khoản nhận tiền: như hôm nay
});

test("«Đổi khách» sau xác nhận chụp lại dấu theo bên đặt mới; đơn văn phòng khách lẻ → Qua đối tác ⇒ 1 rồi bị chặn chuyển khoản", async () => {
  const w = setup();
  const id = await don(w, { owner: SALES, dau: null, booker: null });
  assert.equal(dau(w, id), 0);
  const doi = async (bookerPartyId: string | null) => {
    const d = (await w.call("GET", `/api/orders/${id}`, { as: SUPER })).json.order;
    const r = await w.call("PUT", `/api/orders/${id}/booker`, { as: SUPER, body: { customerName: "Khách Giả", customerPhone: "0900000099", bookerPartyId, expectedUpdatedAt: d.updatedAt } });
    assert.equal(r.status, 200, r.text);
  };
  await doi(`pty-${PT}`);
  assert.equal(dau(w, id), 1);
  chan(await thu(w, HDV, id, "toi", "BANK_TRANSFER"));
  await doi(null);
  assert.equal(dau(w, id), 0);
});

test("lớp CSDL: chèn thẳng khoản chuyển khoản phía Tour Đảo vào đơn mang dấu bị chặn; dấu không gắn được cho đơn đã xác nhận, không gỡ được", async () => {
  const w = setup();
  const id = await don(w);
  const chen = (role: string, method: string) => w.sqlite.prepare(`INSERT INTO bil_payment_receipt (id, order_id, kind_code, amount, collector_party_id, collector_role_code, method_code, collected_for_party_id, stage_code, occurred_date,
    reverses_id, note, created_at, created_by, updated_at, updated_by) VALUES (?, ?, 'CUSTOMER_PAYMENT', 1000, ?, ?, ?, (SELECT party_id FROM v_pty_owner_company LIMIT 1), 'PREPAID', ?, NULL, NULL, ?, ?, ?, ?)`)
    .run(uuid(), id, `pty-${HDV}`, role, method, vnHomNay(), AT, KT, AT, KT);
  assert.throws(() => chen("STAFF", "BANK_TRANSFER"), /partner_cash_only:/);
  assert.throws(() => chen("COMPANY", "OTHER"), /partner_cash_only:/);
  assert.throws(() => w.sqlite.prepare("UPDATE orders SET partner_cash_only = NULL WHERE id = ?").run(id), /partner_cash_only_locked:/);
  const le = await don(w, { owner: SALES, dau: null, booker: null });
  w.sqlite.prepare("UPDATE orders SET partner_cash_only = 1 WHERE id = ?").run(le); // 0 → 1 được (đổi bên đặt)
  const cu = await don(w, { owner: SALES, dau: null, xacNhan: false });
  w.sqlite.prepare("UPDATE orders SET status = 'confirmed' WHERE id = ?").run(cu); // giả lập đơn xác nhận trước ngày áp (không qua câu xác nhận mới)
  assert.throws(() => w.sqlite.prepare("UPDATE orders SET partner_cash_only = 1 WHERE id = ?").run(cu), /partner_cash_only_locked:/);
});

test("Đối tác KHÔNG hưởng hoa hồng (vai STAFF) tự ghi «Tôi thu» chuyển khoản ở đơn mình lập ⇒ 201 (tiền vào tay đối tác); nhân viên khác vai STAFF vẫn bị chặn", async () => {
  const w = setup();
  w.sqlite.prepare("UPDATE pty_party_role SET valid_to_date = '2026-01-02' WHERE party_id = ?").run(`pty-${PT}`); // bỏ vai được hưởng
  const id = await don(w, { booker: null, dau: 1, xacNhan: false });
  w.sqlite.exec("DROP TRIGGER orders_partner_cash_only_guard");
  w.sqlite.prepare("UPDATE orders SET status = 'confirmed', confirmed_at = ?, partner_cash_only = 1 WHERE id = ?").run(AT, id);
  const r = await thu(w, PT, id, "toi", "BANK_TRANSFER");
  assert.equal(r.status, 201, r.text);
  assert.equal(w.q("SELECT collector_role_code AS v FROM bil_payment_receipt WHERE order_id = ? ORDER BY rowid DESC LIMIT 1", id)[0].v, "STAFF");
});
