// Kiểm migration *_pty_tai_khoan_nhan_tien.sql (ADR-0108 đ2; đặc tả QR §4.1, §6). Chèn THẲNG bằng SQL — khoá ở CSDL: (a) chỉ hồ sơ đang là công ty chủ;
// (b) tối đa một tài khoản mở mỗi hồ sơ; (c) chỉ đóng được (valid_to) một lần, không sửa số/tên, không xoá; (d) CHECK số tài khoản, tên chủ tài khoản.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const FILE = files.find((f) => f.endsWith("_pty_tai_khoan_nhan_tien.sql"));
const AT = "2026-10-08T03:00:00.000Z";
type V = string | number | null;
const run = (db: DatabaseSync, sql: string, ...a: V[]) => db.prepare(sql).run(...a);

function moi(): { db: DatabaseSync; ct: string } {
  const db = new DatabaseSync(":memory:");
  // Áp migration với khoá ngoại TẮT (khuôn các bài migration khác — có migration dựng lại bảng), rồi BẬT để kiểm khoá ngoại của dòng chèn mới.
  db.exec("PRAGMA foreign_keys = OFF");
  for (const f of files) db.exec(readFileSync(new URL(f, DIR), "utf8"));
  db.exec("PRAGMA foreign_keys = ON");
  const ct = (db.prepare("SELECT party_id FROM v_pty_owner_company LIMIT 1").get() as { party_id: string }).party_id;
  return { db, ct };
}
let n = 0;
const them = (db: DatabaseSync, party: string, o: Partial<{ bank: string; so: string; ten: string }> = {}) => {
  const id = `tk${++n}`;
  run(db, `INSERT INTO pty_bank_account (id, party_id, bank_code, account_number, account_name, valid_from, valid_to, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, ?, ?, ?, ?, NULL, ?, 'sa', ?, 'sa')`, id, party, o.bank ?? "VCB", o.so ?? "0011001234567", o.ten ?? "CONG TY TNHH TOUR DAO", AT, AT, AT);
  return id;
};

test("migration tài khoản nhận tiền có đúng một tệp; ngân hàng gieo đủ, BIN 6 số, không trùng", () => {
  assert.ok(FILE, "thiếu migrations/*_pty_tai_khoan_nhan_tien.sql");
  const { db } = moi();
  const rows = db.prepare("SELECT code, bin FROM pty_bank").all() as { code: string; bin: string }[];
  assert.ok(rows.length >= 30, `chỉ gieo ${rows.length} ngân hàng`);
  assert.equal(new Set(rows.map((r) => r.bin)).size, rows.length, "BIN trùng");
  assert.ok(rows.every((r) => /^\d{6}$/.test(r.bin)));
  // node:sqlite trả hàng KHÔNG có prototype ⇒ so trường, không deepEqual cả hàng với đối tượng thường.
  assert.equal((db.prepare("SELECT bin FROM pty_bank WHERE code = 'VCB'").get() as { bin: string }).bin, "970436");
});

test("(a) chỉ hồ sơ ĐANG là công ty chủ có tài khoản", () => {
  const { db, ct } = moi();
  run(db, "INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('khac', 'ORGANIZATION', 'Đại lý Khác', 1, ?, ?)", AT, AT);
  assert.throws(() => them(db, "khac"), /bank_account_not_owner:/);
  them(db, ct);
});

test("(b) tối đa một tài khoản mở mỗi hồ sơ; (c) đóng một lần rồi mở dòng mới được; không sửa số/tên, không mở lại, không xoá", () => {
  const { db, ct } = moi();
  const a = them(db, ct);
  assert.throws(() => them(db, ct), /UNIQUE constraint failed: pty_bank_account\.party_id/);
  assert.throws(() => run(db, "UPDATE pty_bank_account SET account_number = '999999' WHERE id = ?", a), /bank_account_append_only:/);
  assert.throws(() => run(db, "UPDATE pty_bank_account SET account_name = 'KHAC' WHERE id = ?", a), /bank_account_append_only:/);
  run(db, "UPDATE pty_bank_account SET valid_to = ?, updated_at = ?, updated_by = 'sa' WHERE id = ?", AT, AT, a);
  assert.throws(() => run(db, "UPDATE pty_bank_account SET valid_to = NULL WHERE id = ?", a), /bank_account_append_only:/, "không mở lại");
  assert.throws(() => run(db, "DELETE FROM pty_bank_account WHERE id = ?", a), /bank_account_append_only:/);
  them(db, ct, { so: "1234567890" });
});

test("(d) CHECK: số tài khoản chỉ chữ số 4–19; tên chủ tài khoản in hoa không dấu", () => {
  const { db, ct } = moi();
  for (const so of ["123", "12345678901234567890", "0011-001", "ABC12345"]) assert.throws(() => them(db, ct, { so }), /CHECK constraint failed/, so);
  for (const ten of ["Cong ty", "CÔNG TY", "X", "CONG&TY"]) assert.throws(() => them(db, ct, { ten }), /CHECK constraint failed/, ten);
  assert.throws(() => them(db, ct, { bank: "KHONGCO" }), /FOREIGN KEY constraint failed/);
});
