// Kiểm migration *_gop_ho_so.sql (ADR-0068 Đ3, tiêu chí G14): hai cột gộp trên pty_party + bốn trigger bất biến — đặt MỘT lần, không đổi / xoá, không trỏ
// chính mình, đích là hồ sơ cá nhân đang dùng chưa gộp và chưa ai trỏ vào nguồn (không chuỗi), đặt kèm active = 0 và mốc gộp, không mở lại. Dựng schema THẬT
// từ migrations/*.sql bằng node:sqlite; tệp tìm theo ĐUÔI tên (đổi số chỉ đổi tên tệp).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const MATCHES = files.filter((f) => f.endsWith("_gop_ho_so.sql"));
const FILE = MATCHES[0]!;
const sqlOf = (f: string) => readFileSync(new URL(f, DIR), "utf8");
const open = (list: string[]) => {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of list) db.exec(sqlOf(f));
  return db;
};
const all = () => open(files);
const triggers = (db: DatabaseSync): string[] => (db.prepare("SELECT name FROM sqlite_master WHERE type = 'trigger' ORDER BY name").all() as { name: string }[]).map((r) => r.name);

const AT = "2026-09-30T03:00:00.000Z";
function nguoi(db: DatabaseSync, id: string, kind: "PERSON" | "ORGANIZATION" = "PERSON"): string {
  db.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)").run(id, kind, `Hồ sơ ${id}`, AT, AT);
  return id;
}
const gop = (db: DatabaseSync, a: string, b: string, at: string | null = AT, active = 0) =>
  db.prepare("UPDATE pty_party SET active = ?, merged_into_id = ?, merged_at = ?, updated_at = ? WHERE id = ?").run(active, b, at, AT, a);
const dong = (db: DatabaseSync, id: string) => db.prepare("SELECT active, merged_into_id AS m, merged_at AS t FROM pty_party WHERE id = ?").get(id) as { active: number; m: string | null; t: string | null };

test("(a) đúng một tệp *_gop_ho_so.sql; thêm đúng hai cột và bốn trigger pty_party_merge_*", () => {
  assert.equal(MATCHES.length, 1, `phải có đúng một tệp *_gop_ho_so.sql, thấy: ${JSON.stringify(MATCHES)}`);
  const db = open(files.filter((f) => f < FILE));
  const truoc = triggers(db);
  db.exec(sqlOf(FILE));
  assert.deepEqual(triggers(db).filter((t) => !truoc.includes(t)), ["pty_party_merge_no_insert", "pty_party_merge_no_reopen", "pty_party_merge_set_once", "pty_party_merge_target"]);
  const cot = (db.prepare("PRAGMA table_info(pty_party)").all() as { name: string }[]).map((c) => c.name);
  assert.ok(cot.includes("merged_into_id") && cot.includes("merged_at"));
});

test("(b) gộp hợp lệ: A (cá nhân, đang dùng) vào B (cá nhân, đang dùng, chưa gộp) — active = 0 + mốc cùng câu", () => {
  const db = all();
  nguoi(db, "a"); nguoi(db, "b");
  gop(db, "a", "b");
  assert.deepEqual({ ...dong(db, "a") }, { active: 0, m: "b", t: AT });
});

test("(c) G14: không đổi / xoá merged_into_id đã đặt, không đổi mốc gộp", () => {
  const db = all();
  nguoi(db, "a"); nguoi(db, "b"); nguoi(db, "c");
  gop(db, "a", "b");
  assert.throws(() => db.prepare("UPDATE pty_party SET merged_into_id = 'c' WHERE id = 'a'").run(), /party_merge_set_once/);
  assert.throws(() => db.prepare("UPDATE pty_party SET merged_into_id = NULL, merged_at = NULL WHERE id = 'a'").run(), /party_merge_set_once/);
  assert.throws(() => db.prepare("UPDATE pty_party SET merged_at = '2026-10-01T00:00:00.000Z' WHERE id = 'a'").run(), /party_merge_set_once/);
});

test("(d) G14: không trỏ chính mình; đích đã gộp (chuỗi) / đã ngưng / là tổ chức / không có → chặn; nguồn đang là đích của hồ sơ khác → chặn", () => {
  const db = all();
  for (const id of ["a", "b", "c", "d", "e"]) nguoi(db, id);
  nguoi(db, "o", "ORGANIZATION");
  assert.throws(() => gop(db, "a", "a"), /party_merge_target/);
  gop(db, "b", "c");
  assert.throws(() => gop(db, "a", "b"), /party_merge_target/, "đích b đã gộp → chuỗi");
  db.prepare("UPDATE pty_party SET active = 0 WHERE id = 'd'").run();
  assert.throws(() => gop(db, "a", "d"), /party_merge_target/, "đích đang ngưng");
  assert.throws(() => gop(db, "a", "o"), /party_merge_target/, "đích là tổ chức");
  assert.throws(() => gop(db, "o", "a"), /party_merge_target/, "nguồn là tổ chức");
  assert.throws(() => gop(db, "c", "e"), /party_merge_target/, "c đang là đích của b → c không gộp tiếp được");
  assert.equal(dong(db, "a").m, null);
});

test("(e) G14: đặt merged_into_id mà active còn 1, hoặc thiếu mốc gộp → chặn", () => {
  const db = all();
  nguoi(db, "a"); nguoi(db, "b");
  assert.throws(() => gop(db, "a", "b", AT, 1), /party_merge_target/);
  assert.throws(() => gop(db, "a", "b", null), /party_merge_target/);
  assert.throws(() => db.prepare("UPDATE pty_party SET merged_at = ? WHERE id = 'a'").run(AT), /party_merge_target/, "mốc mà không đích");
});

test("(f) G14: không mở lại hồ sơ đã gộp (active về 1); hồ sơ mới không mang sẵn dấu gộp", () => {
  const db = all();
  nguoi(db, "a"); nguoi(db, "b");
  gop(db, "a", "b");
  assert.throws(() => db.prepare("UPDATE pty_party SET active = 1 WHERE id = 'a'").run(), /party_merge_no_reopen/);
  assert.throws(
    () => db.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at, merged_into_id, merged_at) VALUES ('x', 'PERSON', 'X', 0, ?, ?, 'b', ?)").run(AT, AT, AT),
    /party_merge_insert/,
  );
  // Hồ sơ CHƯA gộp vẫn ngưng / mở lại bình thường (không bị trigger vướng).
  db.prepare("UPDATE pty_party SET active = 0 WHERE id = 'b'").run();
  db.prepare("UPDATE pty_party SET active = 1 WHERE id = 'b'").run();
});
