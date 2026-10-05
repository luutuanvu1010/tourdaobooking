// Kiểm migration *_bil_thay_lan_thu.sql (ADR-0088 đ2, đ3, đ4 (iv), đ5, đ6 spike, đ7 — TNV-G3). SQL chạy THẲNG (không qua máy chủ): sau phiếu Đã giao không ghi /
// đảo lần thu đơn lẻ; lô Thay (lần thu mới → đảo → phiếu đánh dấu) qua khi giữ I1; Hoàn thành chặn khi I1 lệch; trước migration thì lọt. Kèm R-BIL-1 mọi lúc.
// Khoá ngoại TẮT (không dựng hồ sơ người); tên ở đây là GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const FILE = files.find((f) => f.endsWith("_bil_thay_lan_thu.sql"));
const AT = "2026-10-05T03:00:00.000Z";
type V = string | number | null;
const run = (db: DatabaseSync, sql: string, ...a: V[]) => db.prepare(sql).run(...a);
let n = 0;
function moi(list = files): { db: DatabaseSync; ct: string } {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = OFF");
  for (const f of list) db.exec(readFileSync(new URL(f, DIR), "utf8"));
  const ct = String((db.prepare("SELECT party_id FROM v_pty_owner_company").get() as { party_id: string }).party_id);
  run(db, `INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, created_at, updated_at)
    VALUES ('o', 'TD-o', 's1', 'confirmed', 'Khách Giả', '0900000009', 1000000, 1000000, 1000000, ?, ?)`, AT, AT);
  return { db, ct };
}
const coCot = (db: DatabaseSync) => (db.prepare("SELECT count(*) AS n FROM pragma_table_info('bil_payment_receipt') WHERE name = 'replacement_id'").get() as { n: number }).n === 1;
function thu(db: DatabaseSync, ct: string, o: { amount: number; kind?: string; reverses?: string | null; thay?: string | null; at?: string }): string {
  const id = `r${++n}`;
  if (coCot(db)) {
    run(db, `INSERT INTO bil_payment_receipt (id, order_id, kind_code, amount, collector_party_id, collector_role_code, method_code, collected_for_party_id, stage_code,
        occurred_date, reverses_id, note, created_at, created_by, updated_at, updated_by, replacement_id) VALUES (?, 'o', ?, ?, ?, 'COMPANY', 'CASH', ?, 'PREPAID', '2026-10-05', ?, NULL, ?, 'kt', ?, 'kt', ?)`,
      id, o.kind ?? "CUSTOMER_PAYMENT", o.amount, ct, ct, o.reverses ?? null, o.at ?? AT, o.at ?? AT, o.thay ?? null);
  } else {
    run(db, `INSERT INTO bil_payment_receipt (id, order_id, kind_code, amount, collector_party_id, collector_role_code, method_code, collected_for_party_id, stage_code,
        occurred_date, reverses_id, note, created_at, created_by, updated_at, updated_by) VALUES (?, 'o', ?, ?, ?, 'COMPANY', 'CASH', ?, 'PREPAID', '2026-10-05', ?, NULL, ?, 'kt', ?, 'kt')`,
      id, o.kind ?? "CUSTOMER_PAYMENT", o.amount, ct, ct, o.reverses ?? null, o.at ?? AT, o.at ?? AT);
  }
  return id;
}
function phieu(db: DatabaseSync, o: { id?: string; kind: string; reason?: string | null; due?: number | null; at?: string }): string {
  const id = o.id ?? `p${++n}`;
  run(db, "INSERT INTO bil_posting (id, kind_code, order_id, reason, occurred_date, due_snapshot, created_at, updated_at) VALUES (?, ?, 'o', ?, '2026-10-05', ?, ?, ?)",
    id, o.kind, o.reason ?? null, o.due ?? null, o.at ?? AT, o.at ?? AT);
  return id;
}
/** Đơn 1.000.000 đã thu đủ (600.000 + 400.000) rồi Đã giao (phiếu DELIVERED). */
function daGiao(db: DatabaseSync, ct: string): { r600: string; r400: string } {
  const r600 = thu(db, ct, { amount: 600_000 });
  const r400 = thu(db, ct, { amount: 400_000 });
  run(db, "UPDATE orders SET delivered_at = ?, delivered_by = 's1' WHERE id = 'o'", AT);
  phieu(db, { kind: "DELIVERED", due: 1_000_000 });
  return { r600, r400 };
}

test("migration Thay lần thu tồn tại đúng một tệp", () => assert.ok(FILE, "thiếu migrations/*_bil_thay_lan_thu.sql"));

test("đ3 + đ4 (iv): sau phiếu Đã giao — lần thu mới, lần hoàn mới, đảo đơn lẻ đều bị chặn (receipt_after_delivered); trước migration thì lọt", () => {
  const truoc = moi(files.filter((f) => f < FILE!));
  const t = daGiao(truoc.db, truoc.ct);
  thu(truoc.db, truoc.ct, { amount: 600_000, reverses: t.r600 }); // lỗ cũ: đảo xong, đơn lệch 600.000
  const { db, ct } = moi();
  const { r600 } = daGiao(db, ct);
  const re = /receipt_after_delivered:/;
  assert.throws(() => thu(db, ct, { amount: 100_000 }), re, "lần thu mới");
  assert.throws(() => thu(db, ct, { amount: 100_000, kind: "CUSTOMER_REFUND" }), re, "hoàn sau Đã giao (chờ đ9)");
  assert.throws(() => thu(db, ct, { amount: 600_000, reverses: r600 }), re, "đảo đơn lẻ");
  assert.throws(() => thu(db, ct, { amount: 600_000, reverses: r600, thay: "m-x" }), re, "đảo có dấu nối nhưng lô chưa có lần thu mới");
  assert.throws(() => thu(db, ct, { amount: 100_000, kind: "CUSTOMER_REFUND", thay: "m-x" }), re, "lô Thay chỉ ghi LẦN THU mới");
});

test("đ2: lô Thay đúng thứ tự (lần thu mới → đảo → phiếu đánh dấu) giữ I1 ⇒ qua; lệch I1 / lý do < 10 ký tự / thiếu lần thu mới hoặc thiếu dòng đảo ⇒ replacement_i1", () => {
  const { db, ct } = moi();
  const { r600, r400 } = daGiao(db, ct);
  db.exec("SAVEPOINT a");
  thu(db, ct, { amount: 500_000, thay: "m1" });
  thu(db, ct, { amount: 600_000, reverses: r600, thay: "m1" });
  assert.throws(() => phieu(db, { id: "m1", kind: "REPLACEMENT", reason: "ghi nhầm số tiền thu" }), /replacement_i1:/, "lệch I1: 900.000 ≠ 1.000.000");
  db.exec("ROLLBACK TO a");
  thu(db, ct, { amount: 600_000, thay: "m2" });
  thu(db, ct, { amount: 600_000, reverses: r600, thay: "m2" });
  assert.throws(() => phieu(db, { id: "m2", kind: "REPLACEMENT", reason: "nhầm" }), /replacement_i1:/, "lý do ngắn");
  phieu(db, { id: "m2", kind: "REPLACEMENT", reason: "ghi nhầm người thu tiền" });
  assert.throws(() => phieu(db, { id: "m3", kind: "REPLACEMENT", reason: "phiếu không có lô nào" }), /replacement_i1:/, "thiếu lần thu mới");
  // Kiểm độc lập vòng 3 (TRUNG BÌNH): dùng lại dấu nối của một lô ĐÃ khép (phiếu m2 đã có) để đảo đơn lẻ lần thu còn lại bằng SQL tay → chặn.
  assert.throws(() => thu(db, ct, { amount: 400_000, reverses: r400, thay: "m2" }), /receipt_after_delivered:/, "dấu nối của lô đã khép");
  assert.throws(() => thu(db, ct, { amount: 1, thay: "m2" }), /receipt_after_delivered:/, "lần thu mới gắn lô đã khép");
});

test("kiểm độc lập vòng 3 (THẤP 3): đơn Đã giao đã lệch từ trước (mọi lần thu đã bị đảo) — lô Thay KHÔNG có lần thu cũ (N = 0) ghi bù đúng số → qua; ghi thừa → replacement_i1", () => {
  const { db, ct } = moi();
  const { r600, r400 } = daGiao(db, ct);
  db.exec("DROP TRIGGER bil_receipt_after_delivered");
  thu(db, ct, { amount: 600_000, reverses: r600 }); // dữ liệu cũ (trước 0083): đảo đơn lẻ sau Đã giao
  thu(db, ct, { amount: 400_000, reverses: r400 });
  db.exec(readFileSync(new URL(FILE!, DIR), "utf8").split("CREATE TRIGGER bil_receipt_after_delivered")[1]!.split("END;")[0]!.replace(/^/, "CREATE TRIGGER bil_receipt_after_delivered") + "END;");
  db.exec("SAVEPOINT a");
  thu(db, ct, { amount: 1_100_000, thay: "b1" });
  assert.throws(() => phieu(db, { id: "b1", kind: "REPLACEMENT", reason: "ghi bù lần thu bị đảo nhầm" }), /replacement_i1:/, "thừa 100.000");
  db.exec("ROLLBACK TO a");
  thu(db, ct, { amount: 1_000_000, thay: "b2" });
  phieu(db, { id: "b2", kind: "REPLACEMENT", reason: "ghi bù lần thu bị đảo nhầm" });
  phieu(db, { kind: "COMPLETED" });
});

test("đ5: Hoàn thành khi đã thu ròng khác phải thu lúc Đã giao ⇒ completed_due_mismatch; khớp ⇒ qua", () => {
  const { db, ct } = moi();
  const { r400 } = daGiao(db, ct);
  db.exec("DROP TRIGGER bil_receipt_after_delivered"); // dữ liệu cũ lệch (SQL tay trước 0083)
  const d = thu(db, ct, { amount: 400_000, reverses: r400 });
  assert.throws(() => phieu(db, { kind: "COMPLETED" }), /completed_due_mismatch:/);
  thu(db, ct, { amount: 400_000 }); // ghi lại đúng
  void d;
  phieu(db, { kind: "COMPLETED" });
});

test("lô 'Đã giao' chèn lần thu lúc giao TRƯỚC phiếu DELIVERED — không bị chặn; trước Đã giao lần thu tự do", () => {
  const { db, ct } = moi();
  thu(db, ct, { amount: 300_000 });
  run(db, "UPDATE orders SET delivered_at = ?, delivered_by = 's1' WHERE id = 'o'", AT);
  thu(db, ct, { amount: 700_000 });
  phieu(db, { kind: "DELIVERED", due: 1_000_000 });
});

// ---- R-BIL-1 / R-BIL-1w (scripts/audit-checks.mjs): mọi lúc; mốc 'R-BIL-1' của 0083 — từ mốc = lỗi, trước mốc = cảnh báo ----
type Check = { code: string; sql: string; level: string; mode?: string };
const { CHECKS } = (await import(new URL("../scripts/audit-checks.mjs", import.meta.url).href)) as { CHECKS: Check[] };
const check = (code: string): Check => {
  const f = CHECKS.filter((c) => c.code === code);
  assert.equal(f.length, 1, code);
  return f[0]!;
};
const SAU = "2999-01-01T00:00:00.000Z";
const CU = "2000-01-01T00:00:00.000Z";

test("R-BIL-1 (đ1, đ7): đơn Đã giao lệch tiền SAU mốc (lần thu đảo về sau) = 1 lỗi; lệch chỉ có dữ liệu cũ hơn mốc = 0 lỗi, R-BIL-1w liệt kê; mốc là một dòng", () => {
  assert.equal(check("R-BIL-1").level, "fail");
  assert.equal(check("R-BIL-1w").level, "warn");
  const dem = (db: DatabaseSync) => Number(Object.values(db.prepare(check("R-BIL-1").sql).get() as object)[0]);
  const { db, ct } = moi();
  assert.equal((db.prepare("SELECT count(*) AS n FROM bil_audit_cutoff WHERE code = 'R-BIL-1'").get() as { n: number }).n, 1);
  const r1 = thu(db, ct, { amount: 1_000_000, at: CU });
  run(db, "UPDATE orders SET delivered_at = ?, delivered_by = 's1' WHERE id = 'o'", CU);
  phieu(db, { kind: "DELIVERED", due: 1_000_000, at: CU });
  assert.equal(dem(db), 0);
  db.exec("DROP TRIGGER bil_receipt_after_delivered");
  thu(db, ct, { amount: 1_000_000, reverses: r1, at: SAU }); // đảo đơn lẻ SAU mốc (gỡ trigger) — trước đây R-BIL-1 "tại mốc" không thấy
  assert.equal(dem(db), 1);
  const cu = moi();
  const c1 = thu(cu.db, cu.ct, { amount: 1_000_000, at: CU });
  run(cu.db, "UPDATE orders SET delivered_at = ?, delivered_by = 's1' WHERE id = 'o'", CU);
  phieu(cu.db, { kind: "DELIVERED", due: 1_000_000, at: CU });
  cu.db.exec("DROP TRIGGER bil_receipt_after_delivered");
  thu(cu.db, cu.ct, { amount: 1_000_000, reverses: c1, at: CU });
  assert.equal(dem(cu.db), 0, "dữ liệu cũ hơn mốc không thành lỗi");
  assert.deepEqual(cu.db.prepare(check("R-BIL-1w").sql).all().map((r) => ({ ...(r as object) })), [{ order_id: "o", due_snapshot: 1_000_000, da_thu: 0 }]);
});
