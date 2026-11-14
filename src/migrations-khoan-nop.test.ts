// Migration 0159 (ADR-0182 phần B): khoản nộp của đại lý + ảnh biên lai của khoản nộp — luật CSDL, chèn thẳng bằng SQL (độc lập với route, hai lớp — Hiến chương 5.1).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { TEP_MOI_GIO } from "./shared/tep-dinh-kem.ts";

const DIR = new URL("../migrations/", import.meta.url);
const T = "2026-11-13T01:00:00.000Z";
const HASH = "b".repeat(64);
const DT = "nguoi-dai-ly";
const KT = "nguoi-ke-toan";
let n = 0;
const khoa = (tien = "nop") => `${tien}/${(++n).toString(16).padStart(32, "0")}`;

function moi(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = OFF");
  for (const f of readdirSync(DIR).filter((x) => x.endsWith(".sql")).sort()) db.exec(readFileSync(new URL(f, DIR), "utf8"));
  return db;
}
const nop = (db: DatabaseSync, o: Partial<{ id: string; order: string; by: string; status: string; amount: number }> = {}) =>
  db.prepare(`INSERT INTO bil_agent_remittance (id, order_id, agent_party_id, amount, transfer_date, status_code, created_at, created_by, updated_at, updated_by)
    VALUES (?1, ?2, 'dl', ?3, '2026-11-13', ?4, ?5, ?6, ?5, ?6)`).run(o.id ?? crypto.randomUUID(), o.order ?? "o1", o.amount ?? 800_000, o.status ?? "PENDING", T, o.by ?? DT);
const anh = (db: DatabaseSync, o: Partial<{ id: string; rem: string; key: string; by: string; at: string }> = {}) =>
  db.prepare(`INSERT INTO bil_remittance_proof (id, remittance_id, storage_key, content_kind, byte_size, content_hash, created_at, created_by, updated_at, updated_by)
    VALUES (?1, ?2, ?3, 'png', 100, ?4, ?5, ?6, ?5, ?6)`).run(o.id ?? crypto.randomUUID(), o.rem ?? "n1", o.key ?? khoa(), HASH, o.at ?? T, o.by ?? DT);
const phieu = (db: DatabaseSync, id: string, kind = "SETTLEMENT", order = "o1") =>
  db.prepare(`INSERT INTO bil_posting (id, kind_code, order_id, reason, reverses_posting_id, occurred_date, due_snapshot, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, ?, NULL, NULL, '2026-11-13', NULL, ?, ?, ?, ?)`).run(id, kind, order, T, KT, T, KT);
const thu = (db: DatabaseSync, by: string, role = "COMPANY", order = "o1") =>
  db.prepare(`INSERT INTO bil_payment_receipt (id, order_id, kind_code, amount, collector_party_id, collector_role_code, method_code, collected_for_party_id, stage_code,
      occurred_date, reverses_id, note, created_at, created_by, updated_at, updated_by) VALUES (?, ?, 'CUSTOMER_PAYMENT', 1000, 'ct', ?, 'BANK_TRANSFER', 'ct', 'PREPAID', '2026-11-13', NULL, NULL, ?, ?, ?, ?)`)
    .run(crypto.randomUUID(), order, role, T, by, T, by);

test("khoản nộp: chèn chờ được; chèn thẳng đã xác nhận / từ chối bị chặn; số tiền ≤ 0, ngày sai dạng bị CHECK", () => {
  const db = moi();
  nop(db, { id: "n1" });
  assert.throws(() => nop(db, { order: "o2", status: "CONFIRMED" }), /CHECK|remittance_insert_pending/);
  assert.throws(() => nop(db, { order: "o3", status: "REJECTED" }), /CHECK|remittance_insert_pending/);
  assert.throws(() => nop(db, { order: "o4", amount: 0 }), /CHECK/);
  assert.throws(() => db.prepare(`INSERT INTO bil_agent_remittance (id, order_id, agent_party_id, amount, transfer_date, status_code, created_at, created_by, updated_at)
    VALUES ('x', 'o5', 'dl', 1, '13/11/2026', 'PENDING', ?, ?, ?)`).run(T, DT, T), /CHECK/);
});

test("mỗi đơn chỉ MỘT khoản chờ (bấm hai lần ⇒ UNIQUE); khoản đã quyết thì đơn có khoản chờ mới được", () => {
  const db = moi();
  nop(db, { id: "n1" });
  assert.throws(() => nop(db, { id: "n2" }), /UNIQUE constraint failed: bil_agent_remittance\.order_id/);
  db.prepare("UPDATE bil_agent_remittance SET status_code = 'REJECTED', reject_reason = 'Không thấy tiền về', decided_at = ?, decided_by = ? WHERE id = 'n1'").run(T, KT);
  nop(db, { id: "n3" });
});

test("người quyết KHÁC người ghi; từ chối phải có lý do; xác nhận phải trỏ phiếu quyết toán của CHÍNH đơn", () => {
  const db = moi();
  nop(db, { id: "n1" });
  assert.throws(() => db.prepare("UPDATE bil_agent_remittance SET status_code = 'REJECTED', reject_reason = 'Không thấy tiền về', decided_at = ?, decided_by = ? WHERE id = 'n1'").run(T, DT), /CHECK/);
  assert.throws(() => db.prepare("UPDATE bil_agent_remittance SET status_code = 'REJECTED', decided_at = ?, decided_by = ? WHERE id = 'n1'").run(T, KT), /CHECK/);
  phieu(db, "p-khac", "SETTLEMENT", "o9");
  phieu(db, "p-sai-loai", "RECEIPT");
  phieu(db, "p1");
  for (const p of ["p-khac", "p-sai-loai"]) {
    assert.throws(() => db.prepare("UPDATE bil_agent_remittance SET status_code = 'CONFIRMED', posting_id = ?, decided_at = ?, decided_by = ? WHERE id = 'n1'").run(p, T, KT), /remittance_posting/);
  }
  db.prepare("UPDATE bil_agent_remittance SET status_code = 'CONFIRMED', posting_id = 'p1', decided_at = ?, decided_by = ? WHERE id = 'n1'").run(T, KT);
});

test("khoản đã quyết không sửa; không đổi số tiền / đơn; không xoá; không REPLACE", () => {
  const db = moi();
  nop(db, { id: "n1" });
  assert.throws(() => db.prepare("UPDATE bil_agent_remittance SET amount = 1 WHERE id = 'n1'").run(), /remittance_identity/);
  db.prepare("UPDATE bil_agent_remittance SET status_code = 'REJECTED', reject_reason = 'Không thấy tiền về', decided_at = ?, decided_by = ? WHERE id = 'n1'").run(T, KT);
  assert.throws(() => db.prepare("UPDATE bil_agent_remittance SET reject_reason = 'Đổi lý do khác' WHERE id = 'n1'").run(), /remittance_decided/);
  assert.throws(() => db.prepare("DELETE FROM bil_agent_remittance WHERE id = 'n1'").run(), /remittance_no_delete/);
  assert.throws(() => db.prepare(`INSERT OR REPLACE INTO bil_agent_remittance (id, order_id, agent_party_id, amount, transfer_date, status_code, created_at, created_by, updated_at)
    VALUES ('n1', 'o1', 'dl', 1, '2026-11-13', 'PENDING', ?, ?, ?)`).run(T, DT, T), /remittance_no_replace/);
});

test("Đ2 mục 13 chiều ngược: người có khoản nộp chờ không ghi thêm «Công ty thu» cho đơn đó; người khác (Kế toán), vai khác, đơn khác thì được", () => {
  const db = moi();
  nop(db, { id: "n1" });
  assert.throws(() => thu(db, DT), /remittance_pending_company/);
  thu(db, KT);
  thu(db, DT, "BOOKER");
  thu(db, DT, "COMPANY", "o2");
});

test("ảnh khoản nộp: tiền tố nop/, người tải = người ghi khoản, mỗi khoản một ảnh, không xoá dòng, trần ảnh mỗi giờ", () => {
  const db = moi();
  nop(db, { id: "n1" });
  assert.throws(() => anh(db, { key: khoa("bln") }), /CHECK/);
  assert.throws(() => anh(db, { by: KT }), /proof_author_mismatch/);
  anh(db, { id: "a1" });
  assert.throws(() => anh(db, {}), /proof_no_replace|UNIQUE/);
  assert.throws(() => db.prepare("DELETE FROM bil_remittance_proof WHERE id = 'a1'").run(), /proof_no_delete/);
  for (let i = 2; i <= TEP_MOI_GIO; i++) {
    nop(db, { id: `n${i}`, order: `o${i}` });
    anh(db, { rem: `n${i}` });
  }
  nop(db, { id: "n-tran", order: "o-tran" });
  assert.throws(() => anh(db, { rem: "n-tran" }), /proof_rate_limited/);
});
