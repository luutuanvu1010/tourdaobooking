// Migration 0166 (kiểm toán 14/11): mã giao dịch ngân hàng của khoản nộp + khoản nộp đã xác nhận không lệch sổ — luật CSDL, chèn thẳng bằng SQL (độc lập với route; Hiến chương 5.1).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const T = "2099-01-01T00:00:00.000Z";
const DT = "nguoi-dai-ly";
const KT = "nguoi-ke-toan";
let n = 0;
const id = () => `i${++n}`;

function moi(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = OFF");
  for (const f of readdirSync(DIR).filter((x) => x.endsWith(".sql")).sort()) db.exec(readFileSync(new URL(f, DIR), "utf8"));
  return db;
}
const nop = (db: DatabaseSync, order: string, amount = 800_000): string => {
  const i = id();
  db.prepare(`INSERT INTO bil_agent_remittance (id, order_id, agent_party_id, amount, transfer_date, status_code, created_at, created_by, updated_at, updated_by)
    VALUES (?1, ?2, 'dl', ?3, '2026-11-14', 'PENDING', ?4, ?5, ?4, ?5)`).run(i, order, amount, T, DT);
  return i;
};
const phieu = (db: DatabaseSync, order: string): string => {
  const i = id();
  db.prepare(`INSERT INTO bil_posting (id, kind_code, order_id, reason, reverses_posting_id, occurred_date, due_snapshot, created_at, created_by, updated_at, updated_by)
    VALUES (?, 'SETTLEMENT', ?, NULL, NULL, '2026-11-14', NULL, ?, ?, ?, ?)`).run(i, order, T, KT, T, KT);
  return i;
};
const dong = (db: DatabaseSync, posting: string, order: string, o: { reverses?: string | null; amount?: number } = {}): string => {
  const i = id();
  db.prepare(`INSERT INTO bil_debt_line (id, posting_id, debtor_party_id, creditor_party_id, amount, kind_code, order_id, receipt_id, reverses_line_id, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, ?, ?, ?, 'SETTLEMENT', ?, NULL, ?, ?, ?, ?, ?)`).run(i, posting, o.reverses ? "ct" : "dl", o.reverses ? "dl" : "ct", o.amount ?? 800_000, order, o.reverses ?? null, T, KT, T, KT);
  return i;
};
const gan = (db: DatabaseSync, rem: string, ma: string, so: number) =>
  db.prepare(`INSERT INTO bil_remittance_bank_txn (id, remittance_id, txn_code, transferred_amount, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(id(), rem, ma, so, T, KT, T, KT);
const xacNhan = (db: DatabaseSync, rem: string, posting: string) =>
  db.prepare("UPDATE bil_agent_remittance SET status_code = 'CONFIRMED', posting_id = ?, decided_at = ?, decided_by = ? WHERE id = ?").run(posting, T, KT, rem);
const huy = (db: DatabaseSync, rem: string) =>
  db.prepare("UPDATE bil_agent_remittance SET status_code = 'REJECTED', reject_reason = 'Không thấy tiền về', decided_at = ?, decided_by = ? WHERE id = ?").run(T, KT, rem);
const lanThu = (db: DatabaseSync, order: string, amount: number, by = "kt"): string => {
  const i = id();
  db.prepare(`INSERT INTO bil_payment_receipt (id, order_id, kind_code, amount, collector_party_id, collector_role_code, method_code, collected_for_party_id, stage_code,
      occurred_date, reverses_id, note, created_at, created_by, updated_at, updated_by) VALUES (?, ?, 'CUSTOMER_PAYMENT', ?, 'ct', 'COMPANY', 'BANK_TRANSFER', 'ct', 'PREPAID', '2026-11-14', NULL, NULL, ?, ?, ?, ?)`)
    .run(i, order, amount, T, by, T, by);
  return i;
};
const ganThu = (db: DatabaseSync, receipt: string, ma: string, so: number) =>
  db.prepare(`INSERT INTO bil_receipt_bank_txn (id, receipt_id, txn_code, transferred_amount, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, 'kt', ?, 'kt')`).run(id(), receipt, ma, so, T, T);

test("dòng mã: chỉ gắn khoản nộp ĐANG CHỜ; mã 4–40 ký tự A–Z0–9; số thực chuyển > 0; mỗi khoản một mã; không sửa / xoá / REPLACE", () => {
  const db = moi();
  const a = nop(db, "o1");
  assert.throws(() => gan(db, a, "ab", 800_000), /CHECK/);
  assert.throws(() => gan(db, a, "ma-thuong", 800_000), /CHECK/);
  assert.throws(() => gan(db, a, "MA0001", 0), /CHECK|bank_txn_over/, "trigger BEFORE chạy trước CHECK nên số 0 có thể bị trigger tổng bắt trước");
  assert.throws(() => gan(db, "khong-co", "MA0001", 800_000), /bank_txn_remittance_invalid/);
  gan(db, a, "MA0001", 800_000);
  assert.throws(() => gan(db, a, "MA0002", 800_000), /bank_txn_no_replace|UNIQUE/);
  assert.throws(() => db.prepare("UPDATE bil_remittance_bank_txn SET txn_code = 'MA0009'").run(), /bil_append_only/);
  assert.throws(() => db.prepare("DELETE FROM bil_remittance_bank_txn").run(), /bil_append_only/);
  xacNhan(db, a, phieu(db, "o1"));
  assert.throws(() => gan(db, a, "MA0004", 1_000_000), /bank_txn_remittance_invalid|bank_txn_no_replace/, "khoản đã quyết không nhận mã nữa");
});

test("bank_txn_required: khoản chờ sang CONFIRMED mà chưa có dòng mã ⇒ chặn; có dòng mã ⇒ qua; từ chối không cần mã", () => {
  const db = moi();
  const a = nop(db, "o1");
  assert.throws(() => xacNhan(db, a, phieu(db, "o1")), /bank_txn_required/);
  gan(db, a, "MA0001", 800_000);
  xacNhan(db, a, phieu(db, "o1"));
  const b = nop(db, "o2");
  huy(db, b);
});

test("bank_txn_over (khoản nộp): hai khoản cùng mã, tổng > số thực chuyển ⇒ chặn; ≤ ⇒ qua; khoản bị từ chối không tính", () => {
  const db = moi();
  const a = nop(db, "o1");
  gan(db, a, "MA0001", 1_000_000);
  xacNhan(db, a, phieu(db, "o1"));
  const b = nop(db, "o2");
  assert.throws(() => gan(db, b, "MA0001", 1_000_000), /bank_txn_over/, "800.000 + 800.000 > 1.000.000");
  const c = nop(db, "o3", 200_000);
  gan(db, c, "MA0001", 1_000_000); // 800.000 + 200.000 = 1.000.000, không vượt
  huy(db, c); // bị từ chối ⇒ rơi khỏi tổng (khoản chờ có dòng mã chỉ tồn tại trong lô; dựng tay để thử vị từ)
  const d = nop(db, "o4", 200_000);
  gan(db, d, "MA0001", 1_000_000);
});

test("bank_txn_over (hai chiều): khoản nộp + lần thu «Công ty thu» cùng mã, tổng > số thực chuyển ⇒ chặn ở cả hai bảng", () => {
  const db = moi();
  // lần thu 300.000 gắn mã trước ⇒ khoản nộp 800.000 vượt 1.000.000
  const r = lanThu(db, "o9", 300_000);
  ganThu(db, r, "MA0002", 1_000_000);
  const a = nop(db, "o1");
  assert.throws(() => gan(db, a, "MA0002", 1_000_000), /bank_txn_over/);
  // khoản nộp gắn mã trước ⇒ lần thu 300.000 vượt
  const b = nop(db, "o2");
  gan(db, b, "MA0003", 1_000_000);
  xacNhan(db, b, phieu(db, "o2"));
  const r2 = lanThu(db, "o8", 300_000);
  assert.throws(() => ganThu(db, r2, "MA0003", 1_000_000), /bank_txn_over/);
  const r3 = lanThu(db, "o7", 200_000);
  ganThu(db, r3, "MA0003", 1_000_000); // vừa đủ
});

test("bank_txn_amount_mismatch ở cả hai bảng: cùng mã khác số thực chuyển ⇒ chặn", () => {
  const db = moi();
  const a = nop(db, "o1");
  gan(db, a, "MA0004", 1_000_000);
  xacNhan(db, a, phieu(db, "o1"));
  assert.throws(() => gan(db, nop(db, "o2", 100_000), "MA0004", 1_100_000), /bank_txn_amount_mismatch/);
  assert.throws(() => ganThu(db, lanThu(db, "o3", 100_000), "MA0004", 1_100_000), /bank_txn_amount_mismatch/);
  const r = lanThu(db, "o4", 100_000);
  ganThu(db, r, "MA0005", 500_000);
  assert.throws(() => gan(db, nop(db, "o5", 100_000), "MA0005", 600_000), /bank_txn_amount_mismatch/);
});

test("remittance_line_no_reversal: dòng đảo trỏ vào dòng của phiếu khoản nộp ĐÃ XÁC NHẬN ⇒ chặn; dòng của phiếu khác, khoản chờ / từ chối ⇒ đảo được", () => {
  const db = moi();
  const a = nop(db, "o1");
  gan(db, a, "MA0001", 800_000);
  const p = phieu(db, "o1");
  const d = dong(db, p, "o1");
  assert.equal(dong(db, phieu(db, "o1"), "o1", { reverses: d }) !== "", true, "khoản còn chờ chưa trỏ phiếu ⇒ chưa khoá");
  const a2 = nop(db, "o2");
  gan(db, a2, "MA0002", 800_000);
  const p2 = phieu(db, "o2");
  const d2 = dong(db, p2, "o2");
  xacNhan(db, a2, p2);
  assert.throws(() => dong(db, phieu(db, "o2"), "o2", { reverses: d2 }), /remittance_line_no_reversal/);
  const d3 = dong(db, phieu(db, "o3"), "o3");
  dong(db, phieu(db, "o3"), "o3", { reverses: d3 }); // phiếu không thuộc khoản nộp nào ⇒ đảo được
});
