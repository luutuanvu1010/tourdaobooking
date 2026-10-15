// Kiểm migration *_aut_mfa.sql (ADR-0074): yếu tố hai lớp, mã dự phòng, máy được tin, hạn ân hạn. Tệp tìm theo ĐUÔI tên.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { isExternalPermission, type PermissionCode } from "./shared/permissions.ts";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const MATCHES = files.filter((f) => f.endsWith("_aut_mfa.sql"));
const sqlOf = (f: string) => readFileSync(new URL(f, DIR), "utf8");
const T0 = "2026-10-01T00:00:00.000Z";
const NOW = "2026-10-02T01:00:00.000Z";

/** Dựng CSDL: mọi migration TRƯỚC mfa, gieo dữ liệu qua `seed`, rồi áp migration mfa (để bài gieo ân hạn thấy dữ liệu có sẵn). */
function build(seed?: (db: DatabaseSync) => void): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of files) {
    if (f === MATCHES[0]) seed?.(db);
    db.exec(sqlOf(f));
  }
  return db;
}
const addStaff = (db: DatabaseSync, id: string, phone: string, active = 1) =>
  db.exec(`INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at) VALUES ('${id}', '', '${phone}', 'x', 'sales', ${active}, '${T0}')`);
const addPerm = (db: DatabaseSync, id: string, staff: string, code: string, to: string | null = null) =>
  db.prepare("INSERT INTO stf_permission (id, staff_id, permission_type_code, valid_from_at, valid_to_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(id, staff, code, T0, to, T0, T0);
const factor = (db: DatabaseSync, id: string, staff: string, kind: string, secret: string | null, email: string | null, validTo: string | null = null) =>
  db.prepare(
    "INSERT INTO aut_mfa_factor (id, staff_id, kind, secret_enc, email, valid_from_at, valid_to_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
  ).run(id, staff, kind, secret, email, NOW, validTo, NOW, NOW);

test("(a) đúng một tệp *_aut_mfa.sql, số 0101, không phải migration siết B5", () => {
  assert.deepEqual(MATCHES, ["0101_aut_mfa.sql"]);
  assert.doesNotMatch(MATCHES[0]!, /staff_party_required/);
});

test("(b) hai yếu tố TOTP sống cùng người bị chặn; yếu tố đã đóng không tính; người khác không vướng", () => {
  const db = build((d) => { addStaff(d, "s1", "0900000001"); addStaff(d, "s2", "0900000002"); });
  factor(db, "f1", "s1", "TOTP", "v1.a.b", null);
  assert.throws(() => factor(db, "f2", "s1", "TOTP", "v1.a.b", null), /UNIQUE/);
  factor(db, "f3", "s2", "TOTP", "v1.a.b", null);
  db.prepare("UPDATE aut_mfa_factor SET valid_to_at = ? WHERE id = 'f1'").run(NOW);
  factor(db, "f4", "s1", "TOTP", "v1.a.b", null);
  factor(db, "f5", "s1", "EMAIL", null, "a@b.vn"); // loại khác cùng người được
});

test("(c) CHECK loại/khoá/email: TOTP phải có khoá và không email; EMAIL ngược lại; loại lạ bị chặn", () => {
  const db = build((d) => addStaff(d, "s1", "0900000001"));
  assert.throws(() => factor(db, "x1", "s1", "TOTP", null, null), /CHECK/);
  assert.throws(() => factor(db, "x2", "s1", "TOTP", "v1.a.b", "a@b.vn"), /CHECK/);
  assert.throws(() => factor(db, "x3", "s1", "EMAIL", null, null), /CHECK/);
  assert.throws(() => factor(db, "x4", "s1", "EMAIL", "v1.a.b", "a@b.vn"), /CHECK/);
  assert.throws(() => factor(db, "x5", "s1", "SMS", null, "a@b.vn"), /CHECK/);
});

test("(d) mã dự phòng: băm duy nhất theo tài khoản; máy tin: token_hash duy nhất, nhãn 1–80, lý do thu hồi theo danh sách", () => {
  const db = build((d) => { addStaff(d, "s1", "0900000001"); addStaff(d, "s2", "0900000002"); });
  const rc = (id: string, s: string, h: string) => db.prepare("INSERT INTO aut_mfa_recovery_code (id, staff_id, batch_id, code_hash, created_at, updated_at) VALUES (?, ?, 'b1', ?, ?, ?)").run(id, s, h, NOW, NOW);
  rc("r1", "s1", "h1");
  assert.throws(() => rc("r2", "s1", "h1"), /UNIQUE/);
  rc("r3", "s2", "h1");
  const td = (id: string, s: string, hash: string, label: string, reason: string | null = null) =>
    db.prepare("INSERT INTO aut_trusted_device (id, staff_id, token_hash, label, created_at, updated_at, last_used_at, expires_at, revoked_at, revoke_reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .run(id, s, hash, label, NOW, NOW, NOW, "2026-11-01T00:00:00.000Z", reason ? NOW : null, reason);
  td("t1", "s1", "th1", "iPhone · Safari");
  assert.throws(() => td("t2", "s1", "th1", "iPhone"), /UNIQUE/);
  assert.throws(() => td("t3", "s1", "th3", ""), /CHECK/);
  assert.throws(() => td("t4", "s1", "th4", "x".repeat(81)), /CHECK/);
  assert.throws(() => td("t5", "s1", "th5", "iPhone", "ly_do_la"), /CHECK/);
  for (const [i, r] of ["quen_may", "quen_moi_may", "doi_pin", "dat_lai_pin", "tat_hai_lop", "bi_go", "ngung"].entries()) td(`ok${i}`, "s1", `tho${i}`, "iPhone", r);
});

test("(e) hạn ân hạn: đúng tập tài khoản nội bộ đang hoạt động, khớp isInternal(TS); sau migration tài khoản mới có cột mặc định NULL", () => {
  type Mau = { id: string; active: number; perms: [string, string | null][]; noiBo: boolean };
  const mau: Mau[] = [
    { id: "chiPartner", active: 1, perms: [["PARTNER", null]], noiBo: false },
    { id: "chiTaiXeDoiTac", active: 1, perms: [["DRIVER_PARTNER", null]], noiBo: false },
    { id: "sales", active: 1, perms: [["SALES", null]], noiBo: true },
    { id: "hr", active: 1, perms: [["HR", null]], noiBo: true },
    { id: "partnerGoConSales", active: 1, perms: [["PARTNER", T0], ["SALES", null]], noiBo: true },
    { id: "salesBiGo", active: 1, perms: [["SALES", T0]], noiBo: false },
    { id: "salesNgung", active: 0, perms: [["SALES", null]], noiBo: true },
    { id: "khongQuyen", active: 1, perms: [], noiBo: false },
  ];
  const db = build((d) => {
    mau.forEach((m, i) => {
      addStaff(d, m.id, `09000001${String(i).padStart(2, "0")}`, m.active);
      m.perms.forEach(([code, to], j) => addPerm(d, `${m.id}-${j}`, m.id, code, to));
    });
  });
  // isInternal bằng TS: có ít nhất một quyền đang hiệu lực không thuộc EXTERNAL_PERMISSIONS (và tài khoản đang hoạt động).
  const isInternal = (m: Mau) => m.active === 1 && m.perms.some(([c, to]) => to === null && !isExternalPermission(c as PermissionCode));
  const rows = db.prepare("SELECT id, mfa_grace_until AS g, mfa_enroll_until AS e FROM staff").all() as { id: string; g: string | null; e: string | null }[];
  assert.equal(rows.length, mau.length);
  for (const m of mau) {
    const r = rows.find((x) => x.id === m.id)!;
    assert.equal(r.g !== null, isInternal(m), m.id);
    assert.equal(r.e, null, m.id);
    if (r.g) {
      const days = (Date.parse(r.g) - Date.now()) / 86_400_000;
      assert.ok(days > 13.9 && days < 14.1, `${m.id} hạn ${r.g}`);
      assert.match(r.g, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    }
  }
  addStaff(db, "moi", "0911111111");
  const moi = db.prepare("SELECT mfa_grace_until AS g, mfa_enroll_until AS e FROM staff WHERE id = 'moi'").get() as { g: unknown; e: unknown };
  assert.deepEqual({ ...moi }, { g: null, e: null });
});
