// Kiểm migration *_bil_so_khong_am.sql (ADR-0092 Đ1, Đ3, Đ4, Đ5c, đ8 — TNV-G4). SQL chạy THẲNG (không qua máy chủ): chứng minh lớp CSDL chặn được lần ghi chen
// giữa và SQL chạy tay; trước migration thì lọt. Kèm kiểm định kỳ R-BIL-8 / R-BIL-8w (mốc 0082). Khoá ngoại TẮT (không dựng hồ sơ người); tên ở đây là GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { chenPhieuDieuChinh } from "../tests/audit/dieu-chinh-lib.mjs";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const FILE = files.find((f) => f.endsWith("_bil_so_khong_am.sql"));
const AT = "2026-10-05T03:00:00.000Z";
type V = string | number | null;
const run = (db: DatabaseSync, sql: string, ...a: V[]) => db.prepare(sql).run(...a);
function moi(list = files): { db: DatabaseSync; ct: string } {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = OFF");
  for (const f of list) db.exec(readFileSync(new URL(f, DIR), "utf8"));
  const ct = String((db.prepare("SELECT party_id FROM v_pty_owner_company").get() as { party_id: string }).party_id);
  run(db, `INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, created_at, updated_at)
    VALUES ('o', 'TD-o', 's1', 'confirmed', 'Khách Giả', '0900000009', 1000000, 1000000, 1000000, ?, ?)`, AT, AT);
  return { db, ct };
}
let n = 0;
function thu(db: DatabaseSync, ct: string, o: { amount: number; kind?: string; collector?: string; reverses?: string | null; at?: string }): string {
  const id = `r${++n}`;
  const nguoi = o.collector ?? ct;
  run(db, `INSERT INTO bil_payment_receipt (id, order_id, kind_code, amount, collector_party_id, collector_role_code, method_code, collected_for_party_id, stage_code,
      occurred_date, reverses_id, note, created_at, created_by, updated_at, updated_by) VALUES (?, 'o', ?, ?, ?, ?, 'CASH', ?, 'PREPAID', '2026-10-05', ?, NULL, ?, 'kt', ?, 'kt')`,
    id, o.kind ?? "CUSTOMER_PAYMENT", o.amount, nguoi, nguoi === ct ? "COMPANY" : "STAFF", ct, o.reverses ?? null, o.at ?? AT, o.at ?? AT);
  return id;
}
function phieu(db: DatabaseSync, kind: string, reason: string | null = null): string {
  const id = `p${++n}`;
  run(db, "INSERT INTO bil_posting (id, kind_code, order_id, reason, occurred_date, created_at, updated_at) VALUES (?, ?, 'o', ?, '2026-10-05', ?, ?)", id, kind, reason, AT, AT);
  return id;
}
function dong(db: DatabaseSync, o: { posting: string; debtor: string; creditor: string; amount: number; kind: string; receipt?: string | null; reverses?: string | null }): string {
  const id = `l${++n}`;
  run(db, `INSERT INTO bil_debt_line (id, posting_id, debtor_party_id, creditor_party_id, amount, kind_code, order_id, receipt_id, reverses_line_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'o', ?, ?, ?, ?)`, id, o.posting, o.debtor, o.creditor, o.amount, o.kind, o.receipt ?? null, o.reverses ?? null, AT, AT);
  return id;
}

test("migration sổ không âm tồn tại đúng một tệp", () => assert.ok(FILE, "thiếu migrations/*_bil_so_khong_am.sql"));

test("Đ1 (KT06): thu 300.000, hoàn 200.000 → đảo lần thu gốc bị chặn (net_paid_negative); đảo lần hoàn trước rồi đảo lần thu → qua; trước migration thì lọt", () => {
  const truoc = moi(files.filter((f) => f < FILE!));
  const t1 = thu(truoc.db, truoc.ct, { amount: 300_000 });
  thu(truoc.db, truoc.ct, { amount: 200_000, kind: "CUSTOMER_REFUND" });
  thu(truoc.db, truoc.ct, { amount: 300_000, reverses: t1 }); // lỗ cũ: đã thu ròng −200.000
  const { db, ct } = moi();
  const r1 = thu(db, ct, { amount: 300_000 });
  const h = thu(db, ct, { amount: 200_000, kind: "CUSTOMER_REFUND" });
  assert.throws(() => thu(db, ct, { amount: 300_000, reverses: r1 }), /net_paid_negative:/);
  thu(db, ct, { amount: 200_000, kind: "CUSTOMER_REFUND", reverses: h });
  const d1 = thu(db, ct, { amount: 300_000, reverses: r1 });
  assert.throws(() => thu(db, ct, { amount: 300_000, reverses: r1 }), /UNIQUE constraint failed/, "đảo lần hai: UNIQUE báo, không phải net_paid");
  assert.throws(() => thu(db, ct, { amount: 300_000, reverses: d1 }), /bil_reversal:/, "đảo dòng đảo: bil_reversal báo");
});

test("Đ3 (KT09): người KHÔNG phải công ty trả lại khách ≤ số đang giữ trên đơn (mọi dòng của cặp); công ty trả không xét", () => {
  const { db, ct } = moi();
  const r = thu(db, ct, { amount: 500_000, collector: "hdv" });
  dong(db, { posting: phieu(db, "RECEIPT"), debtor: "hdv", creditor: ct, amount: 500_000, kind: "HELD", receipt: r });
  assert.throws(() => thu(db, ct, { amount: 500_001, kind: "CUSTOMER_REFUND", collector: "hdv" }), /refund_exceeds_held:/);
  assert.throws(() => thu(db, ct, { amount: 1, kind: "CUSTOMER_REFUND", collector: "nguoi-khac" }), /refund_exceeds_held:/, "người không giữ đồng nào");
  const s = phieu(db, "SETTLEMENT");
  dong(db, { posting: s, debtor: ct, creditor: "hdv", amount: 300_000, kind: "SETTLEMENT" }); // đã nộp 300.000 → còn giữ 200.000
  assert.throws(() => thu(db, ct, { amount: 200_001, kind: "CUSTOMER_REFUND", collector: "hdv" }), /refund_exceeds_held:/);
  thu(db, ct, { amount: 200_000, kind: "CUSTOMER_REFUND", collector: "hdv" });
  thu(db, ct, { amount: 300_000, kind: "CUSTOMER_REFUND" }); // công ty trả — chỉ ràng đã thu (0045)
});

test("Đ4: đảo riêng dòng giữ hộ khi lần thu còn hiệu lực → chặn (held_single_reversal); phiếu 'Công ty đã nhận' → qua; lần thu đã đảo → qua", () => {
  const { db, ct } = moi();
  const r = thu(db, ct, { amount: 400_000, collector: "hdv" });
  const g = dong(db, { posting: phieu(db, "RECEIPT"), debtor: "hdv", creditor: ct, amount: 400_000, kind: "HELD", receipt: r });
  assert.throws(() => dong(db, { posting: phieu(db, "REVERSAL", "đảo thử giữ hộ"), debtor: ct, creditor: "hdv", amount: 400_000, kind: "HELD", receipt: r, reverses: g }), /held_single_reversal:/);
  assert.throws(() => dong(db, { posting: phieu(db, "SETTLEMENT", "thử đảo giữ hộ bằng phiếu nộp"), debtor: ct, creditor: "hdv", amount: 400_000, kind: "HELD", receipt: r, reverses: g }), /held_single_reversal:/);
  dong(db, { posting: phieu(db, "COMPANY_RECEIVED"), debtor: ct, creditor: "hdv", amount: 400_000, kind: "HELD", receipt: r, reverses: g });
  // Lần thu thứ hai: đảo lần thu TRƯỚC (như lô dao_lan_thu) rồi dòng giữ hộ đảo theo.
  const r2 = thu(db, ct, { amount: 100_000, collector: "hdv" });
  const g2 = dong(db, { posting: phieu(db, "RECEIPT"), debtor: "hdv", creditor: ct, amount: 100_000, kind: "HELD", receipt: r2 });
  thu(db, ct, { amount: 100_000, collector: "hdv", reverses: r2 });
  dong(db, { posting: phieu(db, "REVERSAL", "đảo lần thu ghi nhầm"), debtor: ct, creditor: "hdv", amount: 100_000, kind: "HELD", receipt: r2, reverses: g2 });
});

test("Đ5c: phiếu điều chỉnh có lý do < 10 ký tự → chặn; rỗng vẫn do bil_reason_required báo; đủ 10 ký tự → qua; phiếu đảo không bị ràng độ dài", () => {
  const { db } = moi();
  assert.throws(() => phieu(db, "ADJUSTMENT", "sai số"), /bil_adjustment_reason_short:/);
  assert.throws(() => phieu(db, "ADJUSTMENT", "   "), /bil_reason_required:/);
  chenPhieuDieuChinh(db, { id: "p-dc-hop-le", orderId: "o", reason: "1234567890", occurredDate: "2026-10-05", at: AT }); // 0094: phiếu ADJUSTMENT hợp lệ phải có yêu cầu đã duyệt
  phieu(db, "REVERSAL", "ghi nhầm");
});

// ---- R-BIL-8 / R-BIL-8w (scripts/audit-checks.mjs): đã thu ròng ≥ 0; mốc 'R-BIL-8' của 0082 — từ mốc = lỗi, trước mốc = cảnh báo ----
type Check = { code: string; sql: string; level: string; mode?: string };
const { CHECKS } = (await import(new URL("../scripts/audit-checks.mjs", import.meta.url).href)) as { CHECKS: Check[] };
const check = (code: string): Check => {
  const f = CHECKS.filter((c) => c.code === code);
  assert.equal(f.length, 1, code);
  return f[0]!;
};
const dem = (db: DatabaseSync) => Number(Object.values(db.prepare(check("R-BIL-8").sql).get() as object)[0]);

test("R-BIL-8: đúng luồng → 0; gỡ trigger Đ1 rồi đảo lần thu sau khi hoàn (từ mốc) → 1; dữ liệu âm cũ hơn mốc → 0 lỗi, R-BIL-8w liệt kê; mốc là một dòng chỉ-thêm", () => {
  assert.equal(check("R-BIL-8").level, "fail");
  assert.equal(check("R-BIL-8w").level, "warn");
  const { db, ct } = moi();
  assert.deepEqual(db.prepare("SELECT code FROM bil_audit_cutoff WHERE code = 'R-BIL-8'").all().length, 1);
  assert.throws(() => db.exec("DELETE FROM bil_audit_cutoff WHERE code = 'R-BIL-8'"), /bil_append_only:/);
  const r1 = thu(db, ct, { amount: 300_000, at: "2999-01-01T00:00:00.000Z" });
  thu(db, ct, { amount: 100_000, kind: "CUSTOMER_REFUND", at: "2999-01-01T00:00:00.000Z" });
  assert.equal(dem(db), 0);
  db.exec("DROP TRIGGER bil_receipt_reversal_net_paid");
  thu(db, ct, { amount: 300_000, reverses: r1, at: "2999-01-01T00:00:00.000Z" });
  assert.equal(dem(db), 1);
  run(db, `INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, created_at, updated_at)
    VALUES ('cu', 'TD-cu', 's1', 'confirmed', 'Khách Giả', '0900000009', 0, 0, 0, ?, ?)`, AT, AT);
  const cu = "2000-01-01T00:00:00.000Z";
  run(db, `INSERT INTO bil_payment_receipt (id, order_id, kind_code, amount, collector_party_id, collector_role_code, method_code, collected_for_party_id, stage_code,
      occurred_date, reverses_id, note, created_at, created_by, updated_at, updated_by) VALUES ('c1', 'cu', 'CUSTOMER_PAYMENT', 50000, ?, 'COMPANY', 'CASH', ?, 'PREPAID', '2026-10-05', NULL, NULL, ?, 'kt', ?, 'kt'),
      ('c2', 'cu', 'CUSTOMER_REFUND', 50000, ?, 'COMPANY', 'CASH', ?, 'PREPAID', '2026-10-05', NULL, NULL, ?, 'kt', ?, 'kt'),
      ('c3', 'cu', 'CUSTOMER_PAYMENT', 50000, ?, 'COMPANY', 'CASH', ?, 'PREPAID', '2026-10-05', 'c1', NULL, ?, 'kt', ?, 'kt')`, ct, ct, cu, cu, ct, ct, cu, cu, ct, ct, cu, cu);
  assert.equal(dem(db), 1, "đơn âm cũ hơn mốc không thành lỗi");
  assert.deepEqual(db.prepare(check("R-BIL-8w").sql).all().map((r) => ({ ...(r as object) })), [{ order_id: "cu", rong: -50_000 }]);
});
