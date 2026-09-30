// Kiểm migration *_billing_so_cong_no.sql (sổ tiền lượt 1 — ADR-0026 điều 2–6, 9; ADR-0025 điều 3d/3e/7; ADR-0057 T3; kế hoạch Task 3: NT-D2, NT-D5, NT-D6
// + trigger kiểm tiền trong lô C1/V1). Chèn/sửa THẲNG bằng SQL (không qua mã ứng dụng): chứng minh chặn nằm ở CSDL. Dựng schema bằng node:sqlite từ
// migrations/*.sql; tệp tìm theo ĐUÔI tên. Tên, SĐT ở đây là GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const MATCHES = files.filter((f) => f.endsWith("_billing_so_cong_no.sql"));
const FILE = MATCHES[0]!;
const sqlOf = (f: string) => readFileSync(new URL(f, DIR), "utf8");
const openWith = (list: string[], override?: (f: string, sql: string) => string) => {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of list) db.exec(override ? override(f, sqlOf(f)) : sqlOf(f));
  return db;
};
const all = () => openWith(files);
const before = () => openWith(files.filter((f) => f < FILE));
const AT = "2026-09-30T03:00:00.000Z";
type Row = Record<string, unknown>;
const rows = (db: DatabaseSync, sql: string, ...a: (string | number | null)[]): Row[] => db.prepare(sql).all(...a).map((r) => ({ ...(r as Row) }));
const run = (db: DatabaseSync, sql: string, ...a: (string | number | null)[]) => db.prepare(sql).run(...a);
const fails = (db: DatabaseSync, sql: string, re: RegExp, ...a: (string | number | null)[]) => assert.throws(() => run(db, sql, ...a), re, sql);
/** Hồ sơ công ty chủ (gieo ở migration hồ sơ công ty chủ) — đọc qua view công bố, không viết cứng id (bài "không id cứng", ADR-0024 điều 6). */
const OWNER = String(rows(all(), "SELECT party_id FROM v_pty_owner_company")[0]!.party_id);

function seedStaff(db: DatabaseSync) {
  db.exec(`INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('pty-s1', 'PERSON', 'Nhân Viên', 1, '${AT}', '${AT}')`);
  db.exec(`INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('pty-h1', 'PERSON', 'HDV Một', 1, '${AT}', '${AT}')`);
  db.exec(`INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at, party_id) VALUES ('s1', '', '0900000001', 'x', 'sales', 1, '${AT}', 'pty-s1')`);
}
/** Đơn thẳng bằng SQL, trạng thái đặt ngay lúc chèn (không dịch vụ — đủ cho sổ; trigger xác nhận chỉ canh UPDATE). `created` = created_at UTC. */
function seedOrder(db: DatabaseSync, id: string, o: { status?: string; total?: number; deposit?: number; method?: string | null; created?: string } = {}) {
  const total = o.total ?? 1_000_000;
  const dep = o.deposit ?? 0;
  run(db, `INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, deposit_amount, deposit_method, remaining_amount, created_at, updated_at)
    VALUES (?, ?, 's1', ?, 'Khách Giả', '0900000009', ?, ?, ?, ?, ?, ?, ?)`, id, `TD-${id}`, o.status ?? "draft", total, total, dep, dep > 0 ? (o.method === undefined ? "cash" : o.method) : null, total - dep, o.created ?? AT, AT);
}
let n = 0;
const nid = (p: string) => `${p}-${++n}`;
function receipt(db: DatabaseSync, r: { order: string; amount: number; kind?: string; role?: string; collector?: string | null; method?: string; reverses?: string | null; date?: string }): string {
  const id = nid("r");
  const role = r.role ?? "STAFF";
  run(db, `INSERT INTO bil_payment_receipt (id, order_id, kind_code, amount, collector_party_id, collector_role_code, method_code, collected_for_party_id, stage_code,
    occurred_date, reverses_id, note, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PREPAID', ?, ?, NULL, ?, 's1', ?, 's1')`,
    id, r.order, r.kind ?? "CUSTOMER_PAYMENT", r.amount, r.collector === undefined ? (role === "UNKNOWN" ? null : "pty-h1") : r.collector, role, r.method ?? "CASH", OWNER,
    r.date ?? "2026-09-30", r.reverses ?? null, AT, AT);
  return id;
}
function posting(db: DatabaseSync, p: { kind: string; order?: string | null; due?: number | null; reason?: string | null; reverses?: string | null }): string {
  const id = nid("p");
  run(db, `INSERT INTO bil_posting (id, kind_code, order_id, reason, reverses_posting_id, occurred_date, due_snapshot, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, ?, ?, ?, '2026-09-30', ?, ?, 's1', ?, 's1')`, id, p.kind, p.order === undefined ? "o1" : p.order, p.reason ?? null, p.reverses ?? null, p.due ?? null, AT, AT);
  return id;
}
function line(db: DatabaseSync, l: { posting: string; debtor: string; creditor: string; amount: number; kind?: string; order?: string | null; trip?: string | null; svc?: string | null; receipt?: string | null; reverses?: string | null }): string {
  const id = nid("l");
  run(db, `INSERT INTO bil_debt_line (id, posting_id, debtor_party_id, creditor_party_id, amount, kind_code, order_id, trip_id, order_service_id, receipt_id, reverses_line_id,
    created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 's1', ?, 's1')`,
    id, l.posting, l.debtor, l.creditor, l.amount, l.kind ?? "HELD", l.order === undefined ? "o1" : l.order, l.trip ?? null, l.svc ?? null, l.receipt ?? null, l.reverses ?? null, AT, AT);
  return id;
}
function fresh(): DatabaseSync {
  const db = all();
  seedStaff(db);
  seedOrder(db, "o1", { status: "confirmed" });
  return db;
}

test("(a) đúng một tệp *_billing_so_cong_no.sql, số 0045 (Task 0), đứng sau *_orders_da_giao.sql", () => {
  assert.equal(MATCHES.length, 1, JSON.stringify(MATCHES));
  assert.equal(FILE, "0045_billing_so_cong_no.sql");
  assert.ok(files.indexOf("0044_orders_da_giao.sql") < files.indexOf(FILE));
});

test("NT-D2: chuyển cọc cũ — mỗi đơn cọc > 0 (kể cả huỷ) đúng MỘT lần thu chưa rõ; tổng khớp; hình thức = cọc cũ, trống → OTHER; ngày = ngày tạo giờ VN; thu cho = công ty chủ", () => {
  const db = before();
  seedStaff(db);
  seedOrder(db, "c1", { status: "confirmed", deposit: 300_000, method: "bank_transfer", created: "2026-09-22T17:30:00.000Z" }); // 00:30 ngày 23 giờ VN
  seedOrder(db, "c2", { status: "cancelled", deposit: 200_000, method: "cash", created: "2026-09-22T16:59:59.000Z" }); // 23:59:59 ngày 22 giờ VN
  seedOrder(db, "c3", { status: "draft", deposit: 50_000, method: "other" });
  seedOrder(db, "c4", { status: "confirmed", deposit: 0 });
  // Đơn có cọc mà hình thức NULL: trigger 0007 hôm nay chặn tạo mới — dữ liệu cũ (nếu có) dựng bằng cách tắt trigger tạm trong CSDL thử.
  db.exec("DROP TRIGGER orders_money_insert");
  seedOrder(db, "c5", { status: "confirmed", deposit: 70_000, method: null });
  const tongCu = rows(db, "SELECT SUM(deposit_amount) AS s, COUNT(*) AS n FROM orders WHERE deposit_amount > 0")[0]!;
  db.exec(sqlOf(FILE));
  const r = rows(db, `SELECT order_id, kind_code, amount, collector_party_id, collector_role_code, method_code, collected_for_party_id, stage_code, occurred_date, reverses_id, created_by
    FROM bil_payment_receipt ORDER BY order_id`);
  assert.equal(r.length, tongCu.n, "mỗi đơn có cọc đúng một lần thu");
  assert.equal(r.reduce((s, x) => s + Number(x.amount), 0), tongCu.s, "tổng lần thu chưa rõ = tổng cọc cũ");
  const by = new Map(r.map((x) => [x.order_id, x]));
  assert.equal(by.get("c1")!.method_code, "BANK_TRANSFER");
  assert.equal(by.get("c1")!.occurred_date, "2026-09-23", "17:30Z = 00:30 ngày hôm sau giờ VN");
  assert.equal(by.get("c2")!.occurred_date, "2026-09-22", "16:59:59Z = 23:59:59 cùng ngày giờ VN");
  assert.equal(by.get("c2")!.method_code, "CASH", "đơn huỷ có cọc vẫn chuyển");
  assert.equal(by.get("c3")!.method_code, "OTHER");
  assert.equal(by.get("c5")!.method_code, "OTHER", "cọc không ghi hình thức → Khác (Q3)");
  assert.ok(!by.has("c4"));
  for (const x of r) {
    assert.deepEqual([x.kind_code, x.collector_party_id, x.collector_role_code, x.stage_code, x.reverses_id, x.created_by, x.collected_for_party_id],
      ["CUSTOMER_PAYMENT", null, "UNKNOWN", "PREPAID", null, "he-thong", OWNER]);
  }
  assert.equal(rows(db, "SELECT count(*) AS n FROM bil_debt_line")[0]!.n, 0, "không dòng nợ (người thu chưa rõ)");
  assert.equal(rows(db, "SELECT count(*) AS n FROM bil_posting")[0]!.n, 0);
  assert.deepEqual(rows(db, "SELECT paid_net, unknown_count FROM v_bil_order_paid WHERE order_id = 'c1'")[0], { paid_net: 300_000, unknown_count: 1 });
});

test("NT-D2: không có hồ sơ công ty chủ mà có đơn cọc → migration hỏng NGAY (không chèn thiếu lặng lẽ)", () => {
  const db = before();
  seedStaff(db);
  seedOrder(db, "c1", { status: "confirmed", deposit: 100_000 });
  for (const t of rows(db, "SELECT name FROM sqlite_master WHERE type = 'trigger' AND tbl_name = 'pty_party_role'")) db.exec(`DROP TRIGGER ${t.name}`);
  db.exec("DELETE FROM pty_party_role WHERE role_type_code = 'OWNER_COMPANY'");
  assert.throws(() => db.exec(sqlOf(FILE)), /NOT NULL constraint failed: bil_payment_receipt.collected_for_party_id/);
});

test("NT-D5: chỉ-thêm — UPDATE/DELETE trên bil_payment_receipt, bil_posting, bil_debt_line bị chặn (gỡ trigger thì qua: chính trigger chặn)", () => {
  const db = fresh();
  const r = receipt(db, { order: "o1", amount: 100_000 });
  const p = posting(db, { kind: "RECEIPT" });
  line(db, { posting: p, debtor: "pty-h1", creditor: OWNER, amount: 100_000, receipt: r });
  fails(db, "UPDATE bil_payment_receipt SET note = 'x'", /bil_append_only:/);
  fails(db, "DELETE FROM bil_payment_receipt", /bil_append_only:/);
  fails(db, "UPDATE bil_posting SET reason = 'x'", /bil_append_only:/);
  fails(db, "DELETE FROM bil_posting", /bil_append_only:/);
  fails(db, "UPDATE bil_debt_line SET amount = 1", /bil_append_only:/);
  fails(db, "DELETE FROM bil_debt_line", /bil_append_only:/);
  db.exec("DROP TRIGGER bil_debt_line_no_update");
  run(db, "UPDATE bil_debt_line SET amount = 1");
});

test("NT-D5: amount ≤ 0 bị chặn; debtor = creditor bị chặn; người thu NULL ⇔ vai UNKNOWN", () => {
  const db = fresh();
  assert.throws(() => receipt(db, { order: "o1", amount: 0 }), /CHECK constraint failed: amount > 0/);
  assert.throws(() => receipt(db, { order: "o1", amount: -5 }), /CHECK constraint failed/);
  assert.throws(() => receipt(db, { order: "o1", amount: 5, role: "STAFF", collector: null }), /CHECK constraint failed/);
  assert.throws(() => receipt(db, { order: "o1", amount: 5, role: "UNKNOWN", collector: "pty-h1" }), /CHECK constraint failed/);
  const p = posting(db, { kind: "RECEIPT" });
  assert.throws(() => line(db, { posting: p, debtor: OWNER, creditor: OWNER, amount: 5 }), /CHECK constraint failed: debtor_party_id <> creditor_party_id/);
  assert.throws(() => line(db, { posting: p, debtor: "pty-h1", creditor: OWNER, amount: 0 }), /CHECK constraint failed: amount > 0/);
});

test("NT-D5: dòng đảo — khớp gốc (lần thu: cùng đơn, loại, số; dòng nợ: cùng số, đổi chỗ, cùng loại, cùng nguồn); gốc đảo lần hai bị chặn; đảo của dòng đảo bị chặn", () => {
  const db = fresh();
  const r = receipt(db, { order: "o1", amount: 100_000 });
  assert.throws(() => receipt(db, { order: "o1", amount: 90_000, reverses: r }), /bil_reversal:/);
  const rd = receipt(db, { order: "o1", amount: 100_000, reverses: r });
  assert.throws(() => receipt(db, { order: "o1", amount: 100_000, reverses: r }), /UNIQUE constraint failed: bil_payment_receipt.reverses_id/);
  assert.throws(() => receipt(db, { order: "o1", amount: 100_000, reverses: rd }), /bil_reversal:/);
  const p = posting(db, { kind: "RECEIPT" });
  const l = line(db, { posting: p, debtor: "pty-h1", creditor: OWNER, amount: 100_000 });
  const pd = posting(db, { kind: "REVERSAL", reason: "ghi nhầm người thu", reverses: p });
  assert.throws(() => line(db, { posting: pd, debtor: "pty-h1", creditor: OWNER, amount: 100_000, reverses: l }), /bil_reversal:/, "không đổi chỗ");
  assert.throws(() => line(db, { posting: pd, debtor: OWNER, creditor: "pty-h1", amount: 1, reverses: l }), /bil_reversal:/, "khác số");
  const ld = line(db, { posting: pd, debtor: OWNER, creditor: "pty-h1", amount: 100_000, reverses: l });
  assert.throws(() => line(db, { posting: pd, debtor: OWNER, creditor: "pty-h1", amount: 100_000, reverses: l }), /UNIQUE constraint failed: bil_debt_line.reverses_line_id/);
  assert.throws(() => line(db, { posting: pd, debtor: "pty-h1", creditor: OWNER, amount: 100_000, reverses: ld }), /bil_reversal:/);
  assert.deepEqual(rows(db, "SELECT balance FROM v_bil_party_balance WHERE party_id = 'pty-h1' AND counterparty_id = ?", OWNER)[0], { balance: 0 });
  assert.equal(rows(db, "SELECT count(*) AS n FROM v_bil_order_paid WHERE order_id = 'o1'")[0]!.n, 0, "cặp gốc/đảo bỏ khỏi đã thu");
});

test("NT-D6: ngày phát sinh bắt buộc, đúng dạng YYYY-MM-DD (lần thu và phiếu)", () => {
  const db = fresh();
  assert.throws(() => receipt(db, { order: "o1", amount: 5, date: "30/09/2026" }), /CHECK constraint failed/);
  assert.throws(() => receipt(db, { order: "o1", amount: 5, date: "2026-09-31" }), /CHECK constraint failed/);
  fails(db, `INSERT INTO bil_payment_receipt (id, order_id, kind_code, amount, collector_party_id, collector_role_code, method_code, collected_for_party_id, stage_code,
    occurred_date, created_at, updated_at) VALUES ('x', 'o1', 'CUSTOMER_PAYMENT', 5, 'pty-h1', 'STAFF', 'CASH', ?, 'PREPAID', NULL, ?, ?)`, /NOT NULL constraint failed: bil_payment_receipt.occurred_date/, OWNER, AT, AT);
  fails(db, `INSERT INTO bil_posting (id, kind_code, order_id, occurred_date, created_at, updated_at) VALUES ('x', 'RECEIPT', 'o1', '2026-9-30', ?, ?)`, /CHECK constraint failed/, AT, AT);
});

test("ADR-0057 T3: dòng nợ đúng MỘT nguồn (đơn HOẶC chuyến); dòng chuyến không mang dịch vụ / lần thu; lượt 1 dòng chỉ-có-chuyến bị trigger chặn", () => {
  const db = fresh();
  seedOrder(db, "od"); // nháp — dịch vụ chỉ chèn được vào đơn nháp (0008)
  run(db, `INSERT INTO order_service (id, order_id, name, unit, pax_adult, depart_date) VALUES ('sv1', 'od', 'Tour', 'perPax', 1, '2026-10-10')`);
  const r = receipt(db, { order: "o1", amount: 5 });
  const p = posting(db, { kind: "RECEIPT" });
  line(db, { posting: p, debtor: "pty-h1", creditor: OWNER, amount: 5 }); // chỉ đơn → qua
  assert.throws(() => line(db, { posting: p, debtor: "pty-h1", creditor: OWNER, amount: 5, order: null, trip: "t1" }), /bil_trip_not_yet:/);
  assert.throws(() => line(db, { posting: p, debtor: "pty-h1", creditor: OWNER, amount: 5, order: "o1", trip: "t1" }), /bil_trip_not_yet:|CHECK constraint failed/);
  assert.throws(() => line(db, { posting: p, debtor: "pty-h1", creditor: OWNER, amount: 5, order: null, trip: null }), /CHECK constraint failed: \(order_id IS NULL\) <> \(trip_id IS NULL\)/);
  // Gỡ trigger lượt 1 (CSDL thử) để thấy từng CHECK tự chặn:
  db.exec("DROP TRIGGER bil_debt_line_trip_not_yet");
  line(db, { posting: p, debtor: "pty-h1", creditor: OWNER, amount: 5, order: null, trip: "t1" }); // gỡ trigger → dòng chỉ-có-chuyến qua: chính trigger chặn ở trên
  assert.throws(() => line(db, { posting: p, debtor: "pty-h1", creditor: OWNER, amount: 5, order: "o1", trip: "t1" }), /CHECK constraint failed: \(order_id IS NULL\) <> \(trip_id IS NULL\)/);
  assert.throws(() => line(db, { posting: p, debtor: "pty-h1", creditor: OWNER, amount: 5, order: null, trip: "t1", svc: "sv1" }), /CHECK constraint failed: trip_id IS NULL OR/);
  assert.throws(() => line(db, { posting: p, debtor: "pty-h1", creditor: OWNER, amount: 5, order: null, trip: "t1", receipt: r }), /CHECK constraint failed: trip_id IS NULL OR/);
});

test("ADR-0057 T3: mỗi CHECK nguồn thật sự là thứ chặn — thay tạm từng CHECK bằng CHECK (1) trong tệp migration (CSDL thử) thì dòng vi phạm qua", () => {
  const cases: { needle: string; lineArgs: { order: string | null; trip: string | null; svc?: string | null } }[] = [
    { needle: "CHECK ((order_id IS NULL) <> (trip_id IS NULL))", lineArgs: { order: null, trip: null } },
    { needle: "CHECK (trip_id IS NULL OR (order_service_id IS NULL AND receipt_id IS NULL))", lineArgs: { order: null, trip: "t1", svc: "sv1" } },
  ];
  for (const c of cases) {
    assert.ok(sqlOf(FILE).includes(c.needle), `migration còn chứa: ${c.needle}`);
    const db = openWith(files, (f, sql) => (f === FILE ? sql.replace(c.needle, "CHECK (1)") : sql));
    seedStaff(db);
    seedOrder(db, "o1", { status: "confirmed" });
    seedOrder(db, "od"); // nháp — dịch vụ chỉ chèn được vào đơn nháp (0008)
    run(db, `INSERT INTO order_service (id, order_id, name, unit, pax_adult, depart_date) VALUES ('sv1', 'od', 'Tour', 'perPax', 1, '2026-10-10')`);
    db.exec("DROP TRIGGER bil_debt_line_trip_not_yet");
    const p = posting(db, { kind: "RECEIPT" });
    line(db, { posting: p, debtor: "pty-h1", creditor: OWNER, amount: 5, ...c.lineArgs }); // không throw
  }
});

test("C1 (kế hoạch §3.3): phiếu Đã giao — đã thu ròng phải BẰNG ĐÚNG due_snapshot; thiếu / thừa / còn lần thu chưa rõ → RAISE; đảo lần thu chưa rõ rồi ghi lại → qua; một đơn một phiếu", () => {
  const db = fresh();
  assert.throws(() => posting(db, { kind: "DELIVERED", due: 1_000_000 }), /delivered_not_paid:/, "chưa thu gì");
  const u = receipt(db, { order: "o1", amount: 300_000, role: "UNKNOWN" });
  receipt(db, { order: "o1", amount: 700_000 });
  assert.throws(() => posting(db, { kind: "DELIVERED", due: 1_000_000 }), /delivered_not_paid:/, "đủ số nhưng còn lần thu chưa rõ");
  receipt(db, { order: "o1", amount: 300_000, role: "UNKNOWN", reverses: u });
  assert.throws(() => posting(db, { kind: "DELIVERED", due: 1_000_000 }), /delivered_not_paid:/, "đảo xong thì thiếu 300.000");
  receipt(db, { order: "o1", amount: 300_000, role: "STAFF" });
  const r4 = receipt(db, { order: "o1", amount: 50_000 });
  assert.throws(() => posting(db, { kind: "DELIVERED", due: 1_000_000 }), /delivered_not_paid:/, "thừa 50.000");
  receipt(db, { order: "o1", amount: 50_000, kind: "CUSTOMER_REFUND" }); // hoàn dư
  void r4;
  posting(db, { kind: "DELIVERED", due: 1_000_000 });
  assert.throws(() => posting(db, { kind: "DELIVERED", due: 1_000_000 }), /UNIQUE constraint failed: bil_posting.order_id/);
  assert.throws(() => posting(db, { kind: "RECEIPT", due: 5 }), /CHECK constraint failed/, "due_snapshot chỉ ở phiếu Đã giao");
  assert.throws(() => posting(db, { kind: "DELIVERED", order: null, due: 0 }), /bil_order_required:|delivered_not_paid:/);
  // Gỡ trigger (CSDL thử) → phiếu Đã giao với số sai qua được: chính trigger chặn ở trên.
  seedOrder(db, "o2", { status: "confirmed" });
  db.exec("DROP TRIGGER bil_posting_delivered_paid");
  posting(db, { kind: "DELIVERED", order: "o2", due: 999 });
});

test("V1: phiếu Hoàn thành — còn người nợ công ty (giữ hộ, kể cả 'Công ty thu – CK' chưa xác nhận) → RAISE; quyết toán / xác nhận xong → qua; công ty còn phải trả không chặn", () => {
  const db = fresh();
  const r = receipt(db, { order: "o1", amount: 1_000_000 });
  const p = posting(db, { kind: "RECEIPT" });
  const held = line(db, { posting: p, debtor: "pty-h1", creditor: OWNER, amount: 1_000_000, receipt: r });
  assert.throws(() => posting(db, { kind: "COMPLETED" }), /completed_unsettled:/);
  const s = posting(db, { kind: "SETTLEMENT", order: null });
  line(db, { posting: s, debtor: OWNER, creditor: "pty-h1", amount: 600_000, kind: "SETTLEMENT" });
  assert.throws(() => posting(db, { kind: "COMPLETED" }), /completed_unsettled:/, "còn giữ 400.000");
  line(db, { posting: s, debtor: OWNER, creditor: "pty-h1", amount: 400_000, kind: "SETTLEMENT" });
  // Công ty còn nợ một bên khác (vd hoàn khách do HDV ứng) — không chặn.
  const rf = posting(db, { kind: "REFUND" });
  line(db, { posting: rf, debtor: OWNER, creditor: "pty-s1", amount: 20_000, kind: "REFUND" });
  posting(db, { kind: "COMPLETED" });
  assert.throws(() => posting(db, { kind: "COMPLETED" }), /UNIQUE constraint failed: bil_posting.order_id/);
  void held;
  // Gỡ trigger (CSDL thử) → Hoàn thành khi còn nợ qua được: chính trigger chặn ở trên.
  seedOrder(db, "o2", { status: "confirmed" });
  const p2 = posting(db, { kind: "RECEIPT", order: "o2" });
  line(db, { posting: p2, debtor: "pty-h1", creditor: OWNER, amount: 5, order: "o2" });
  db.exec("DROP TRIGGER bil_posting_completed_settled");
  posting(db, { kind: "COMPLETED", order: "o2" });
});

test("điều chỉnh / đảo phải có lý do; phiếu gắn đơn thì phải có đơn", () => {
  const db = fresh();
  assert.throws(() => posting(db, { kind: "ADJUSTMENT", reason: null }), /bil_reason_required:/);
  assert.throws(() => posting(db, { kind: "REVERSAL", reason: "   " }), /bil_reason_required:/);
  posting(db, { kind: "ADJUSTMENT", reason: "sai số khách" });
  assert.throws(() => posting(db, { kind: "RECEIPT", order: null }), /bil_order_required:/);
  posting(db, { kind: "SETTLEMENT", order: null }); // phiếu nộp nhiều đơn
});

test("mã lỗi mọi trigger mới có tiền tố mã (route dịch ra tiếng Việt)", () => {
  const moi = sqlOf(FILE).match(/RAISE\(ABORT, '([^']*)'\)/g) ?? [];
  assert.ok(moi.length >= 13, `chống bài rỗng: ${moi.length}`);
  for (const r of moi) assert.match(r, /'(bil_append_only|bil_reversal|bil_trip_not_yet|bil_reason_required|bil_order_required|delivered_not_paid|completed_unsettled|refund_exceeds_paid): /, r);
});

test("T-3 (kiểm độc lập): hoàn khách không vượt số đã thu còn hiệu lực — vượt → RAISE refund_exceeds_paid; đúng bằng → qua; đảo lần hoàn không bị chặn; lần thu bị đảo không tính", () => {
  const db = fresh();
  const r1 = receipt(db, { order: "o1", amount: 300_000 });
  receipt(db, { order: "o1", amount: 200_000 });
  assert.throws(() => receipt(db, { order: "o1", amount: 500_001, kind: "CUSTOMER_REFUND" }), /refund_exceeds_paid:/);
  const h = receipt(db, { order: "o1", amount: 200_000, kind: "CUSTOMER_REFUND" });
  assert.throws(() => receipt(db, { order: "o1", amount: 300_001, kind: "CUSTOMER_REFUND" }), /refund_exceeds_paid:/, "đã hoàn 200.000 → còn hoàn được 300.000");
  receipt(db, { order: "o1", amount: 200_000, kind: "CUSTOMER_REFUND", reverses: h });
  receipt(db, { order: "o1", amount: 300_000, reverses: r1 });
  assert.throws(() => receipt(db, { order: "o1", amount: 200_001, kind: "CUSTOMER_REFUND" }), /refund_exceeds_paid:/, "lần thu 300.000 đã đảo không tính");
  receipt(db, { order: "o1", amount: 200_000, kind: "CUSTOMER_REFUND" });
});
