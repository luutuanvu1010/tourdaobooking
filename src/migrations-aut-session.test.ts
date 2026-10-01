// Kiểm migration *_aut_session.sql (ADR-0075 điều 1–4): sổ phiên đăng nhập + liên kết máy nhận thông báo với phiên. Tệp tìm theo ĐUÔI tên.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const MATCHES = files.filter((f) => f.endsWith("_aut_session.sql"));
const sqlOf = (f: string) => readFileSync(new URL(f, DIR), "utf8");
const all = () => {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of files) db.exec(sqlOf(f));
  return db;
};
const NOW = "2026-10-02T01:00:00.000Z";
const LATER = "2026-10-09T01:00:00.000Z";
function staffId(db: DatabaseSync): string {
  const r = db.prepare("SELECT id FROM staff LIMIT 1").get() as { id: string } | undefined;
  if (r) return r.id;
  // Các cột NOT NULL không mặc định của staff (cột chết full_name/role vẫn bắt buộc): full_name, phone, pin_hash, role, created_at.
  db.exec("INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at) VALUES ('s1', '', '0900000001', 'x', 'sales', 1, '2026-10-01T00:00:00.000Z')");
  return "s1";
}
const ins = (db: DatabaseSync, id: string, sid: string, single: number, ended: string | null = null, reason: string | null = null) =>
  db.prepare(
    "INSERT INTO aut_session (id, staff_id, method, single, device_label, user_agent, ip, created_at, updated_at, last_seen_at, expires_at, ended_at, end_reason) " +
      "VALUES (?, ?, 'PIN', ?, 'iPhone · Safari', 'ua', '1.2.3.4', ?, ?, ?, ?, ?, ?)",
  ).run(id, sid, single, NOW, NOW, NOW, LATER, ended, reason);

test("(a) đúng một tệp *_aut_session.sql, không phải migration siết B5", () => {
  assert.equal(MATCHES.length, 1, JSON.stringify(MATCHES));
  assert.doesNotMatch(MATCHES[0]!, /staff_party_required/);
});

test("(b) tài khoản một máy: hai phiên sống cùng lúc bị CSDL chặn; phiên đã kết thúc không tính", () => {
  const db = all();
  const s = staffId(db);
  ins(db, "p1", s, 1);
  assert.throws(() => ins(db, "p2", s, 1), /UNIQUE/);
  db.prepare("UPDATE aut_session SET ended_at = ?, end_reason = 'bi_thay' WHERE id = 'p1'").run(NOW);
  ins(db, "p2", s, 1);
});

test("(c) tài khoản được miễn (single = 0) mở nhiều phiên được", () => {
  const db = all();
  const s = staffId(db);
  ins(db, "p1", s, 0);
  ins(db, "p2", s, 0);
});

test("(d) end_reason chỉ nhận danh sách cố định; ended_at và end_reason đi cặp", () => {
  const db = all();
  const s = staffId(db);
  assert.throws(() => ins(db, "p1", s, 1, NOW, "replaced"), /CHECK/);
  assert.throws(() => ins(db, "p2", s, 1, NOW, null), /CHECK/);
  assert.throws(() => ins(db, "p3", s, 1, null, "dang_xuat"), /CHECK/);
  for (const [i, r] of ["dang_xuat", "bi_thay", "bi_go", "doi_pin", "dat_lai_pin", "tat_hai_lop", "ngung", "het_han", "mat_mien", "doi_face_id"].entries()) {
    ins(db, `ok${i}`, s, 1, NOW, r);
  }
});

test("(e) ntf_push_sub có cột session_id, mặc định NULL cho dòng cũ", () => {
  const db = all();
  const cols = (db.prepare("PRAGMA table_info(ntf_push_sub)").all() as { name: string; dflt_value: unknown }[]).map((c) => c.name);
  assert.ok(cols.includes("session_id"));
});
