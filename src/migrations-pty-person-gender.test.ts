// Migration *_pty_person_gender.sql (ADR-0084 Đ1, Đ3, Đ5) trên SQLite thật (node:sqlite), dựng từ migrations/*.sql; tìm tệp theo ĐUÔI tên (số 0064 là TẠM —
// đổi số chỉ đổi tên tệp, docs/CHANGE-GUIDE.md công thức d).
// (a) cột `pty_person.gender` NULL, KHÔNG CHECK liệt kê (giá trị kiểm ở mã — Hiến chương); không thêm / đổi trigger nào; trigger gộp hồ sơ (ADR-0068) vẫn chặn.
// (b) hai view công bố: v_pty_person_xung_ho (parties) và v_stf_staff_xung_ho (staff — để `tro-ly` đọc qua cạnh tro-ly → staff sẵn có, không thêm cạnh).
// (c) câu chào Mai: chỉ thêm bản mới khi lời dặn hiện hành vẫn là bản GIEO của 0054 (bản Toàn quyền đã lưu không tự đổi — Đ3).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { CAU_CHAO_MAC_DINH } from "./shared/xung-ho.ts";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const MATCHES = files.filter((f) => f.endsWith("_pty_person_gender.sql"));
const FILE = MATCHES[0]!;
const sqlOf = (f: string) => readFileSync(new URL(f, DIR), "utf8");
const open = (list: string[]) => {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of list) db.exec(sqlOf(f));
  return db;
};
const truoc = () => open(files.filter((f) => f < FILE));
const names = (db: DatabaseSync, type: string): string[] =>
  (db.prepare("SELECT name FROM sqlite_master WHERE type = ? ORDER BY name").all(type) as { name: string }[]).map((r) => r.name);
const AT = "2026-10-01T03:00:00.000Z";
const nguoi = (db: DatabaseSync, id: string, given = "Vũ", gender: string | null = null) => {
  db.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'PERSON', ?, 1, ?, ?)").run(id, `Lưu Tuấn ${given}`, AT, AT);
  db.prepare("INSERT INTO pty_person (party_id, family_name, middle_name, given_name, gender, created_at, updated_at) VALUES (?, 'Lưu', 'Tuấn', ?, ?, ?, ?)").run(id, given, gender, AT, AT);
};
const LOI_DAN_HH = "SELECT cau_chao, giong, loi_dan_them, cau_hoi_mau, created_by FROM tl_loi_dan ORDER BY valid_from_at DESC, created_at DESC, id DESC LIMIT 1";

test("(a) đúng một tệp *_pty_person_gender.sql; thêm cột gender TEXT NULL, không CHECK liệt kê, không đổi trigger", () => {
  assert.equal(MATCHES.length, 1, `phải có đúng một tệp *_pty_person_gender.sql, thấy: ${JSON.stringify(MATCHES)}`);
  const db = truoc();
  const trig = names(db, "trigger");
  db.exec(sqlOf(FILE));
  assert.deepEqual(names(db, "trigger"), trig, "migration không thêm / bỏ trigger nào");
  const cot = (db.prepare("PRAGMA table_info(pty_person)").all() as { name: string; type: string; notnull: number; dflt_value: unknown }[]).find((c) => c.name === "gender");
  assert.deepEqual(cot && { type: cot.type, notnull: cot.notnull, dflt: cot.dflt_value }, { type: "TEXT", notnull: 0, dflt: null });
  assert.doesNotMatch(sqlOf(FILE), /CHECK\s*\(\s*gender/i, "không CHECK liệt kê giá trị giới tính");
  // Không CHECK: giá trị lạ lọt CSDL được — chặn là việc của mã (kiemGioiTinh).
  nguoi(db, "a", "Vũ", "KHAC");
  assert.equal((db.prepare("SELECT gender FROM pty_person WHERE party_id = 'a'").get() as { gender: string }).gender, "KHAC");
});

test("(a) dòng có sẵn giữ NULL (= chưa ghi); trigger gộp hồ sơ ADR-0068 vẫn chặn mở lại hồ sơ đã gộp", () => {
  const db = truoc();
  db.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('cu', 'PERSON', 'An', 1, ?, ?)").run(AT, AT);
  db.prepare("INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES ('cu', 'An', ?, ?)").run(AT, AT);
  db.exec(sqlOf(FILE));
  for (const f of files.filter((f) => f > FILE)) db.exec(sqlOf(f));
  assert.equal((db.prepare("SELECT gender FROM pty_person WHERE party_id = 'cu'").get() as { gender: unknown }).gender, null);
  nguoi(db, "b");
  db.prepare("UPDATE pty_party SET active = 0, merged_into_id = 'b', merged_at = ?, updated_at = ? WHERE id = 'cu'").run(AT, AT);
  assert.throws(() => db.prepare("UPDATE pty_party SET active = 1 WHERE id = 'cu'").run(), /./);
  // Sửa giới tính của hồ sơ đang dùng: không trigger nào chặn.
  db.prepare("UPDATE pty_person SET gender = 'NU', updated_at = ? WHERE party_id = 'b'").run(AT);
  assert.equal((db.prepare("SELECT gender FROM pty_person WHERE party_id = 'b'").get() as { gender: string }).gender, "NU");
});

test("(b) view công bố: v_pty_person_xung_ho (party_id, given_name, gender) và v_stf_staff_xung_ho (id, given_name, gender) — tài khoản thiếu hồ sơ vẫn có dòng", () => {
  const db = open(files);
  nguoi(db, "pty-s1", "Lan", "NU");
  db.exec(`INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at, party_id) VALUES ('s1', '', '0900000001', 'x', 'sales', 1, '${AT}', 'pty-s1')`);
  db.exec(`INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at, party_id) VALUES ('s2', '', '0900000002', 'x', 'sales', 1, '${AT}', NULL)`);
  const cot = (v: string) => (db.prepare(`PRAGMA table_info(${v})`).all() as { name: string }[]).map((c) => c.name);
  assert.deepEqual(cot("v_pty_person_xung_ho"), ["party_id", "given_name", "gender"]);
  assert.deepEqual(cot("v_stf_staff_xung_ho"), ["id", "given_name", "gender"]);
  assert.deepEqual({ ...db.prepare("SELECT * FROM v_pty_person_xung_ho WHERE party_id = 'pty-s1'").get() }, { party_id: "pty-s1", given_name: "Lan", gender: "NU" });
  assert.deepEqual({ ...db.prepare("SELECT * FROM v_stf_staff_xung_ho WHERE id = 's1'").get() }, { id: "s1", given_name: "Lan", gender: "NU" });
  assert.deepEqual({ ...db.prepare("SELECT * FROM v_stf_staff_xung_ho WHERE id = 's2'").get() }, { id: "s2", given_name: null, gender: null });
  // Đ4: view KHÔNG mang họ, tên đệm, SĐT.
  for (const v of ["v_pty_person_xung_ho", "v_stf_staff_xung_ho"]) for (const c of ["family_name", "middle_name", "phone", "display_name"]) assert.ok(!cot(v).includes(c), `${v}.${c}`);
});

test("(c) lời dặn hiện hành là bản gieo 0054 ⇒ thêm MỘT bản câu chào Mai (người tạo NULL = hệ thống), giữ giọng / lời dặn / câu hỏi mẫu", () => {
  const db = truoc();
  const n = (db.prepare("SELECT count(*) AS n FROM tl_loi_dan").get() as { n: number }).n;
  db.exec(sqlOf(FILE));
  assert.equal((db.prepare("SELECT count(*) AS n FROM tl_loi_dan").get() as { n: number }).n, n + 1);
  assert.deepEqual({ ...db.prepare(LOI_DAN_HH).get() }, { cau_chao: CAU_CHAO_MAC_DINH, giong: "", loi_dan_them: "", cau_hoi_mau: "[]", created_by: null });
  assert.equal((db.prepare("SELECT count(*) AS n FROM tl_loi_dan WHERE id = 'gieo-0054'").get() as { n: number }).n, 1, "bản gieo còn nguyên (chỉ thêm)");
});

test("(c) Toàn quyền đã lưu lời dặn ⇒ KHÔNG thêm bản nào (bản đã lưu không tự đổi — Đ3)", () => {
  const db = truoc();
  db.exec(`INSERT INTO tl_loi_dan (id, cau_chao, giong, loi_dan_them, cau_hoi_mau, valid_from_at, created_at, created_by, updated_at, updated_by)
           VALUES ('tq-1', 'Chào cả nhà!', 'vui', '', '["Đổi PIN?"]', '2099-01-01T00:00:00.000Z', '2099-01-01T00:00:00.000Z', 's-tq', '2099-01-01T00:00:00.000Z', 's-tq')`);
  const n = (db.prepare("SELECT count(*) AS n FROM tl_loi_dan").get() as { n: number }).n;
  db.exec(sqlOf(FILE));
  assert.equal((db.prepare("SELECT count(*) AS n FROM tl_loi_dan").get() as { n: number }).n, n);
  assert.equal((db.prepare(LOI_DAN_HH).get() as { cau_chao: string }).cau_chao, "Chào cả nhà!");
});
