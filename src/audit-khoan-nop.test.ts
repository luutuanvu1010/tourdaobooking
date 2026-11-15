// Kiểm định kỳ khoản nộp đại lý (kiểm toán 14/11; migration 0166): R-BIL-NP1 khoản xác nhận ⇒ dòng quyết toán còn hiệu lực đúng số; R-BIL-NP2 khoản xác nhận từ mốc ⇒ có mã giao dịch.
// Dữ liệu vi phạm dựng bằng cách GỠ trigger trong CSDL thử (giả lập "trigger bị gỡ nhầm / SQL gõ tay đi vòng").
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

interface Check { code: string; sql: string; level: string; mode?: "rows" }
const { CHECKS } = (await import(new URL("../scripts/audit-checks.mjs", import.meta.url).href)) as { CHECKS: Check[] };
const one = (code: string): Check => {
  const f = CHECKS.filter((c) => c.code === code);
  assert.equal(f.length, 1, `phải có đúng một kiểm ${code}`);
  return f[0]!;
};
const dem = (db: DatabaseSync, code: string): number => Number(Object.values(db.prepare(one(code).sql.replace(/\s+/g, " ").trim()).all()[0] ?? { n: 0 })[0]);
const DIR = new URL("../migrations/", import.meta.url);
const SAU = "2099-01-01T00:00:00.000Z";
const TRUOC = "2000-01-01T00:00:00.000Z";
let n = 0;
const id = () => `a${++n}`;
function moi(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = OFF");
  for (const f of readdirSync(DIR).filter((x) => x.endsWith(".sql")).sort()) db.exec(readFileSync(new URL(f, DIR), "utf8"));
  return db;
}
/** Khoản nộp 800.000 đã xác nhận qua đường đúng (mã, phiếu, một dòng quyết toán). `conMa` / `at` chỉnh được để dựng ca vi phạm. */
function khoanXacNhan(db: DatabaseSync, o: { order: string; conMa?: boolean; at?: string; amountDong?: number } ): { rem: string; posting: string; dong: string } {
  const rem = id(), posting = id(), dong = id();
  db.prepare(`INSERT INTO bil_agent_remittance (id, order_id, agent_party_id, amount, transfer_date, status_code, created_at, created_by, updated_at, updated_by)
    VALUES (?1, ?2, 'dl', 800000, '2026-11-14', 'PENDING', ?3, 'dai-ly', ?3, 'dai-ly')`).run(rem, o.order, TRUOC);
  db.prepare(`INSERT INTO bil_posting (id, kind_code, order_id, reason, reverses_posting_id, occurred_date, due_snapshot, created_at, created_by, updated_at, updated_by)
    VALUES (?, 'SETTLEMENT', ?, NULL, NULL, '2026-11-14', NULL, ?, 'kt', ?, 'kt')`).run(posting, o.order, TRUOC, TRUOC);
  db.prepare(`INSERT INTO bil_debt_line (id, posting_id, debtor_party_id, creditor_party_id, amount, kind_code, order_id, receipt_id, reverses_line_id, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, 'dl', 'ct', ?, 'SETTLEMENT', ?, NULL, NULL, ?, 'kt', ?, 'kt')`).run(dong, posting, o.amountDong ?? 800_000, o.order, TRUOC, TRUOC);
  if (o.conMa !== false) {
    db.prepare(`INSERT INTO bil_remittance_bank_txn (id, remittance_id, txn_code, transferred_amount, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, 800000, ?, 'kt', ?, 'kt')`)
      .run(id(), rem, `MA${n}${n}${n}`, TRUOC, TRUOC);
  }
  db.prepare("UPDATE bil_agent_remittance SET status_code = 'CONFIRMED', posting_id = ?, decided_at = ?, decided_by = 'kt' WHERE id = ?").run(posting, o.at ?? SAU, rem);
  return { rem, posting, dong };
}

test("R-BIL-NP1: sạch = 0; dòng quyết toán bị đảo hoặc lệch số ⇒ vi phạm; mức LỖI; khoản xác nhận trước mốc không tính", () => {
  assert.equal(one("R-BIL-NP1").level, "fail");
  const db = moi();
  khoanXacNhan(db, { order: "o1" });
  assert.equal(dem(db, "R-BIL-NP1"), 0);
  // dòng quyết toán lệch số (dựng khi chưa có trigger so số: bỏ phần so, chỉ khai số khác khoản)
  khoanXacNhan(db, { order: "o2", amountDong: 700_000 });
  assert.equal(dem(db, "R-BIL-NP1"), 1, "dòng quyết toán không đúng số khoản nộp");
  // đảo dòng của khoản thứ ba (gỡ trigger CHẶN để giả lập đi vòng)
  db.exec("DROP TRIGGER bil_debt_line_remittance_no_reversal");
  const c = khoanXacNhan(db, { order: "o3" });
  db.prepare(`INSERT INTO bil_posting (id, kind_code, order_id, reason, reverses_posting_id, occurred_date, due_snapshot, created_at, created_by, updated_at, updated_by)
    VALUES ('pdao', 'REVERSAL', 'o3', 'ghi nhầm', NULL, '2026-11-14', NULL, ?, 'kt', ?, 'kt')`).run(SAU, SAU);
  db.prepare(`INSERT INTO bil_debt_line (id, posting_id, debtor_party_id, creditor_party_id, amount, kind_code, order_id, receipt_id, reverses_line_id, created_at, created_by, updated_at, updated_by)
    VALUES ('ldao', 'pdao', 'ct', 'dl', 800000, 'SETTLEMENT', 'o3', NULL, ?, ?, 'kt', ?, 'kt')`).run(c.dong, SAU, SAU);
  assert.equal(dem(db, "R-BIL-NP1"), 2);
  khoanXacNhan(db, { order: "o4", amountDong: 1, at: TRUOC });
  assert.equal(dem(db, "R-BIL-NP1"), 2, "xác nhận trước mốc không tính");
});

test("R-BIL-NP2: khoản nộp xác nhận từ mốc mà không có mã ⇒ vi phạm; có mã hoặc xác nhận trước mốc ⇒ không; mức LỖI", () => {
  assert.equal(one("R-BIL-NP2").level, "fail");
  const db = moi();
  khoanXacNhan(db, { order: "o1" });
  assert.equal(dem(db, "R-BIL-NP2"), 0);
  db.exec("DROP TRIGGER bil_agent_remittance_txn_required"); // giả lập trigger bị gỡ nhầm
  khoanXacNhan(db, { order: "o2", conMa: false });
  assert.equal(dem(db, "R-BIL-NP2"), 1);
  khoanXacNhan(db, { order: "o3", conMa: false, at: TRUOC });
  assert.equal(dem(db, "R-BIL-NP2"), 1, "xác nhận trước mốc không bị đòi mã");
});
