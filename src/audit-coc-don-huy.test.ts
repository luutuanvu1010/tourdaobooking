// Kiểm định kỳ đơn huỷ và cọc (scripts/audit-checks.mjs: R-ORD-H1, R-BIL-C1…C6 — ADR-0089; kế hoạch Đợt 1 Task 12, NT-B4). Mỗi mã: dữ liệu ĐÚNG luồng → 0;
// gỡ trigger rồi chèn vi phạm bằng SQL thẳng → ≥ 1 (quan sát chặn thật của lưới thứ hai). Khoá ngoại TẮT (không dựng hồ sơ người); tên ở đây là GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

type Check = { code: string; sql: string; level: string; mode?: string };
const { CHECKS } = (await import(new URL("../scripts/audit-checks.mjs", import.meta.url).href)) as { CHECKS: Check[] };
const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const AT = "2026-10-05T03:00:00.000Z";
const SAU = "2026-10-05T05:00:00.000Z";
type V = string | number | null;
const MA = ["R-ORD-H1", "R-BIL-C1", "R-BIL-C2", "R-BIL-C3", "R-BIL-C4", "R-BIL-C5", "R-BIL-C6"];

function check(code: string): Check {
  const f = CHECKS.filter((c) => c.code === code);
  assert.equal(f.length, 1, code);
  return f[0]!;
}
const dem = (db: DatabaseSync, code: string): number => Number(Object.values((db.prepare(check(code).sql.replace(/\s+/g, " ").trim()).get() ?? { n: 0 }) as object)[0]);
const run = (db: DatabaseSync, sql: string, ...a: V[]) => db.prepare(sql).run(...a);
function moi(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = OFF");
  for (const f of files) db.exec(readFileSync(new URL(f, DIR), "utf8"));
  return db;
}
function don(db: DatabaseSync, id: string, huy?: { nhom: string; legacy?: number; at?: string }, depart = "2026-11-10") {
  run(db, `INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, created_at, updated_at)
    VALUES (?, ?, 's1', 'draft', 'Khách Giả', '0900000009', 2000000, 2000000, 2000000, ?, ?)`, id, `TD-${id}`, AT, AT);
  run(db, "INSERT INTO order_service (id, order_id, name, unit, pax_adult, depart_date) VALUES (?, ?, 'Tour', 'perPax', 1, ?)", `${id}-s`, id, depart);
  run(db, "UPDATE orders SET status = 'confirmed', confirmed_at = ? WHERE id = ?", AT, id);
  if (huy) {
    run(db, `INSERT INTO ord_cancel_reason (id, order_id, reason_code, group_code, note, cancelled_date, reclassifies_id, legacy, created_at, created_by, updated_at, updated_by)
      VALUES (?, ?, 'X', ?, NULL, '2026-10-20', NULL, ?, ?, 's1', ?, 's1')`, `lydo-${id}`, id, huy.nhom, huy.legacy ?? 0, huy.at ?? AT, huy.at ?? AT);
    run(db, "UPDATE orders SET status = 'cancelled' WHERE id = ?", id);
  }
}
let n = 0;
function thu(db: DatabaseSync, o: { order: string; amount: number; kind?: string; by?: string; approval?: string | null; transferOf?: string | null; collector?: string; at?: string }): string {
  const id = `r${++n}`;
  run(db, `INSERT INTO bil_payment_receipt (id, order_id, kind_code, amount, collector_party_id, collector_role_code, method_code, collected_for_party_id, stage_code,
      occurred_date, reverses_id, note, created_at, created_by, updated_at, updated_by, approval_id, transfer_of_id)
    VALUES (?, ?, ?, ?, ?, 'COMPANY', 'CASH', 'ct', 'PREPAID', '2026-10-05', NULL, NULL, ?, ?, ?, ?, ?, ?)`,
    id, o.order, o.kind ?? "CUSTOMER_PAYMENT", o.amount, o.collector ?? "ct", o.at ?? AT, o.by ?? "kt", o.at ?? AT, o.by ?? "kt", o.approval ?? null, o.transferOf ?? null);
  return id;
}
function duyet(db: DatabaseSync, o: { order: string; amount: number; kind?: string; target?: string | null; by?: string; date?: string }): string {
  const id = `d${++n}`;
  run(db, `INSERT INTO bil_deposit_approval (id, order_id, kind_code, amount, target_order_id, reason, approved_date, voids_id, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, ?, ?, ?, 'lý do', ?, NULL, ?, ?, ?, ?)`, id, o.order, o.kind ?? "REFUND", o.amount, o.target ?? null, o.date ?? "2026-10-25", AT, o.by ?? "qt", AT, o.by ?? "qt");
  return id;
}
function ngoai(db: DatabaseSync, o: { order: string; kind: string; amount?: number | null; target?: string | null; by: string }): string {
  const id = `h${++n}`;
  run(db, `INSERT INTO bil_outside_refund (id, order_id, kind_code, amount, reason, target_id, occurred_date, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, ?, ?, ?, ?, '2026-10-05', ?, ?, ?, ?)`, id, o.order, o.kind, o.amount ?? null, o.kind === "CONFIRM" ? null : "lý do", o.target ?? null, AT, o.by, AT, o.by);
  return id;
}
const go = (db: DatabaseSync, ...triggers: string[]) => { for (const t of triggers) db.exec(`DROP TRIGGER ${t}`); };

test("R-ORD-H1, R-BIL-C1…C6: có đủ, mức fail", () => {
  for (const c of MA) assert.equal(check(c).level, "fail", c);
});

test("dữ liệu ĐÚNG luồng (huỷ có lý do, duyệt, chi, chuyển đủ hai nửa, hoàn ngoài đơn cũ có xác nhận, hoàn trước huỷ) → mọi kiểm 0", () => {
  const db = moi();
  don(db, "a");
  thu(db, { order: "a", amount: 1_200_000 });
  thu(db, { order: "a", amount: 200_000, kind: "CUSTOMER_REFUND" }); // hoàn dư TRƯỚC khi huỷ
  run(db, `INSERT INTO ord_cancel_reason (id, order_id, reason_code, group_code, note, cancelled_date, reclassifies_id, legacy, created_at, created_by, updated_at, updated_by)
    VALUES ('lydo-a', 'a', 'X', 'CONG_TY_HUY', NULL, '2026-10-20', NULL, 0, ?, 's1', ?, 's1')`, SAU, SAU);
  run(db, "UPDATE orders SET status = 'cancelled' WHERE id = 'a'");
  don(db, "b");
  const d1 = duyet(db, { order: "a", amount: 300_000 });
  thu(db, { order: "a", amount: 300_000, kind: "CUSTOMER_REFUND", approval: d1 });
  const d2 = duyet(db, { order: "a", amount: 200_000, kind: "TRANSFER", target: "b" });
  const ra = thu(db, { order: "a", amount: 200_000, kind: "CUSTOMER_REFUND", approval: d2 });
  thu(db, { order: "b", amount: 200_000, transferOf: ra });
  don(db, "cu", { nhom: "CHUA_KET_LUAN", legacy: 1 });
  thu(db, { order: "cu", amount: 100_000 });
  const g = ngoai(db, { order: "cu", kind: "RECORD", amount: 100_000, by: "sa" });
  ngoai(db, { order: "cu", kind: "CONFIRM", target: g, by: "qt" });
  assert.deepEqual(MA.map((c) => [c, dem(db, c)]).filter((x) => x[1] !== 0), []);
});

test("R-ORD-H1: gỡ trigger lý do → đơn huỷ thiếu lý do = 1; dòng lý do của đơn chưa huỷ = 1", () => {
  const db = moi();
  go(db, "orders_cancel_requires_reason");
  don(db, "x");
  run(db, "UPDATE orders SET status = 'cancelled' WHERE id = 'x'");
  assert.equal(dem(db, "R-ORD-H1"), 1);
  don(db, "y");
  run(db, `INSERT INTO ord_cancel_reason (id, order_id, reason_code, group_code, note, cancelled_date, reclassifies_id, legacy, created_at, created_by, updated_at, updated_by)
    VALUES ('lydo-y', 'y', 'X', 'KHACH_HUY', NULL, '2026-10-20', NULL, 0, ?, 's1', ?, 's1')`, AT, AT);
  assert.equal(dem(db, "R-ORD-H1"), 2);
});

test("R-BIL-C1: gỡ trigger trần duyệt → duyệt vượt tiền còn giữ = 1; gỡ trigger phần còn lại → chi vượt duyệt = vẫn 1 đơn", () => {
  const db = moi();
  go(db, "bil_deposit_approval_within_kept");
  don(db, "a", { nhom: "CONG_TY_HUY" });
  thu(db, { order: "a", amount: 500_000 });
  duyet(db, { order: "a", amount: 600_000 });
  assert.equal(dem(db, "R-BIL-C1"), 1);
  const db2 = moi();
  go(db2, "bil_payment_receipt_coc_within_approved");
  don(db2, "b", { nhom: "CONG_TY_HUY" });
  thu(db2, { order: "b", amount: 500_000 });
  const d = duyet(db2, { order: "b", amount: 100_000 });
  thu(db2, { order: "b", amount: 200_000, kind: "CUSTOMER_REFUND", approval: d });
  assert.equal(dem(db2, "R-BIL-C1"), 1);
});

test("R-BIL-C2: gỡ trigger coc_needs_approval → trả lại khách tự do SAU lúc huỷ trên đơn huỷ mới = 1; đơn huỷ cũ (legacy) không đếm", () => {
  const db = moi();
  go(db, "bil_payment_receipt_coc_needs_approval");
  don(db, "a", { nhom: "KHACH_HUY" });
  thu(db, { order: "a", amount: 500_000 });
  thu(db, { order: "a", amount: 100_000, kind: "CUSTOMER_REFUND", at: SAU });
  don(db, "cu", { nhom: "CHUA_KET_LUAN", legacy: 1 });
  thu(db, { order: "cu", amount: 500_000 });
  thu(db, { order: "cu", amount: 100_000, kind: "CUSTOMER_REFUND", at: SAU });
  assert.equal(dem(db, "R-BIL-C2"), 1);
});

test("R-BIL-C3: gỡ trigger tách người → người duyệt tự chi = 1; người ghi tự xác nhận hoàn ngoài = 2", () => {
  const db = moi();
  go(db, "bil_payment_receipt_coc_same_person", "bil_outside_refund_same_person");
  don(db, "a", { nhom: "CONG_TY_HUY" });
  thu(db, { order: "a", amount: 500_000 });
  const d = duyet(db, { order: "a", amount: 100_000, by: "qt" });
  thu(db, { order: "a", amount: 100_000, kind: "CUSTOMER_REFUND", approval: d, by: "qt" });
  assert.equal(dem(db, "R-BIL-C3"), 1);
  don(db, "cu", { nhom: "CHUA_KET_LUAN", legacy: 1 });
  thu(db, { order: "cu", amount: 100_000 });
  const g = ngoai(db, { order: "cu", kind: "RECORD", amount: 100_000, by: "sa" });
  ngoai(db, { order: "cu", kind: "CONFIRM", target: g, by: "sa" });
  assert.equal(dem(db, "R-BIL-C3"), 2);
});

test("R-BIL-C4: gỡ trigger một-lần + đơn-cũ → hai dòng hiệu lực = 1; dòng trên đơn huỷ mới = thêm 1", () => {
  const db = moi();
  go(db, "bil_outside_refund_once", "bil_outside_refund_legacy");
  don(db, "cu", { nhom: "CHUA_KET_LUAN", legacy: 1 });
  thu(db, { order: "cu", amount: 500_000 });
  ngoai(db, { order: "cu", kind: "RECORD", amount: 100_000, by: "sa" });
  ngoai(db, { order: "cu", kind: "RECORD", amount: 100_000, by: "sa" });
  assert.equal(dem(db, "R-BIL-C4"), 1);
  don(db, "moi", { nhom: "KHACH_HUY" });
  thu(db, { order: "moi", amount: 500_000 });
  ngoai(db, { order: "moi", kind: "RECORD", amount: 100_000, by: "sa" });
  assert.equal(dem(db, "R-BIL-C4"), 2);
});

test("R-BIL-C5: nửa chi của lệnh chuyển không có nửa thu (lô bị cắt / SQL tay) = 1", () => {
  const db = moi();
  don(db, "a", { nhom: "CONG_TY_HUY" });
  don(db, "b");
  thu(db, { order: "a", amount: 500_000 });
  const d = duyet(db, { order: "a", amount: 500_000, kind: "TRANSFER", target: "b" });
  thu(db, { order: "a", amount: 500_000, kind: "CUSTOMER_REFUND", approval: d });
  assert.equal(dem(db, "R-BIL-C5"), 1);
});

test("R-BIL-C6: gỡ trigger hạn → khoản duyệt khách huỷ sau hạn = 1; công ty huỷ sau hạn không đếm", () => {
  const db = moi();
  go(db, "bil_deposit_approval_deadline");
  don(db, "kh", { nhom: "KHACH_HUY" });
  thu(db, { order: "kh", amount: 500_000 });
  duyet(db, { order: "kh", amount: 100_000, date: "2027-01-10" });
  don(db, "ct", { nhom: "CONG_TY_HUY" });
  thu(db, { order: "ct", amount: 500_000 });
  duyet(db, { order: "ct", amount: 100_000, date: "2027-05-10" });
  assert.equal(dem(db, "R-BIL-C6"), 1);
});

// ---- R-BIL-13 (ADR-0092 Đ2, Đ2b, đ8; TNV-VP01): số dư không âm do giữ hộ / quyết toán; mốc 0080: từ mốc = lỗi, trước mốc = cảnh báo ----
const congTy = (db: DatabaseSync): string => {
  let ct = (db.prepare("SELECT party_id FROM v_pty_owner_company LIMIT 1").get() as { party_id: string } | undefined)?.party_id;
  if (!ct) {
    run(db, "INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('ct', 'ORGANIZATION', 'Tour Đảo', 1, ?, ?)", AT, AT);
    run(db, "INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_at, created_at, updated_at) VALUES ('ct-r', 'ct', 'OWNER_COMPANY', ?, ?, ?)", AT, AT, AT);
    ct = "ct";
  }
  return ct;
};
function no(db: DatabaseSync, o: { order: string; debtor: string; creditor: string; amount: number; kind: string; reverses?: string | null; at: string }): string {
  const id = `l${++n}`;
  run(db, "INSERT OR IGNORE INTO bil_posting (id, kind_code, order_id, reason, occurred_date, created_at, updated_at) VALUES (?, 'ADJUSTMENT', ?, 'khung thử', '2026-10-05', ?, ?)", `p-${o.order}`, o.order, AT, AT);
  run(db, `INSERT INTO bil_debt_line (id, posting_id, debtor_party_id, creditor_party_id, amount, kind_code, order_id, receipt_id, reverses_line_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?)`, id, `p-${o.order}`, o.debtor, o.creditor, o.amount, o.kind, o.order, o.reverses ?? null, o.at, o.at);
  return id;
}
const sauMoc = "2999-01-01T00:00:00.000Z";
const truocMoc = "2000-01-01T00:00:00.000Z";

test("R-BIL-13: đúng luồng (giữ hộ → nộp; giữ hộ → công ty đã nhận; công ty nợ người ứng tiền) → 0; có, mức fail; R-BIL-13w mức warn", () => {
  assert.equal(check("R-BIL-13").level, "fail");
  assert.equal(check("R-BIL-13w").level, "warn");
  const db = moi();
  const ct = congTy(db);
  don(db, "a");
  no(db, { order: "a", debtor: "hdv", creditor: ct, amount: 400_000, kind: "HELD", at: sauMoc });
  no(db, { order: "a", debtor: ct, creditor: "hdv", amount: 400_000, kind: "SETTLEMENT", at: sauMoc });
  const h = no(db, { order: "a", debtor: "hdv2", creditor: ct, amount: 300_000, kind: "HELD", at: sauMoc });
  no(db, { order: "a", debtor: ct, creditor: "hdv2", amount: 300_000, kind: "HELD", reverses: h, at: sauMoc });
  no(db, { order: "a", debtor: ct, creditor: "nv-ung", amount: 200_000, kind: "REFUND", at: sauMoc });
  assert.equal(dem(db, "R-BIL-13"), 0);
});

test("R-BIL-13 (VP-01): gỡ hai trigger 0080 rồi 'nộp' rồi 'Công ty đã nhận' cùng một khoản → 1 (sau mốc); dữ liệu cũ trước mốc → 0 lỗi, R-BIL-13w liệt kê 1 dòng", () => {
  const db = moi();
  const ct = congTy(db);
  go(db, "bil_debt_line_settlement_no_flip", "bil_debt_line_held_once");
  don(db, "a");
  const h = no(db, { order: "a", debtor: "hdv", creditor: ct, amount: 1_000_000, kind: "HELD", at: sauMoc });
  no(db, { order: "a", debtor: ct, creditor: "hdv", amount: 1_000_000, kind: "SETTLEMENT", at: sauMoc });
  no(db, { order: "a", debtor: ct, creditor: "hdv", amount: 1_000_000, kind: "HELD", reverses: h, at: sauMoc });
  assert.equal(dem(db, "R-BIL-13"), 1);
  don(db, "cu");
  no(db, { order: "cu", debtor: ct, creditor: "hdv3", amount: 50_000, kind: "SETTLEMENT", at: truocMoc }); // nộp cho người không giữ, trước mốc
  assert.equal(dem(db, "R-BIL-13"), 1, "dữ liệu trước mốc không thành lỗi");
  const w = db.prepare(check("R-BIL-13w").sql.replace(/\s+/g, " ").trim()).all() as { order_id: string; so: number }[];
  assert.deepEqual(w.map((x) => [x.order_id, x.so]), [["cu", -50_000]]);
});
