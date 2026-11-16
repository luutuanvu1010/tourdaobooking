// `touchCredentialsStatement(db, id, at, onlyIfPreviousChanged)`: đẩy `staff.credentials_changed_at`. Bản "if_changed" chỉ đẩy khi
// câu NGAY TRƯỚC trong cùng batch có đổi dòng (vd. gỡ passkey) — dùng cho các đường không chắc chắn có thay đổi thật; changes()
// trong WHERE nhìn thấy câu đã hoàn tất trước đó trong CÙNG kết nối, đúng cơ chế với mẫu nhật ký `onlyIf` đang dùng ở module này.
import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { registeredSql } from "../../shared/sql-registry.ts";
import "./repository.ts";

const DIR = new URL("../../../migrations/", import.meta.url);
const sqlOf = (name: string) => registeredSql().find((e) => e.module === "staff" && e.name === name)!.sql;

test("touch_credentials_if_changed: chỉ đẩy khi câu gỡ passkey ngay trước đó có đổi dòng", () => {
  const db = new DatabaseSync(":memory:");
  for (const f of readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort()) db.exec(readFileSync(new URL(f, DIR), "utf8"));
  db.exec("INSERT INTO staff (id, phone, pin_hash, role, full_name, active, created_at) VALUES ('s1', '0900000001', 'x', 'sales', '', 1, '2026-01-01T00:00:00Z')");
  const touch = db.prepare(sqlOf("touch_credentials_if_changed"));
  db.exec("UPDATE aut_passkey SET valid_to_at = 'x' WHERE staff_id = 's1'"); // 0 dòng
  touch.run("s1", 111);
  assert.equal((db.prepare("SELECT credentials_changed_at AS c FROM staff WHERE id = 's1'").get() as { c: number | null }).c, null);
  db.exec("UPDATE staff SET active = 1 WHERE id = 's1'"); // 1 dòng
  touch.run("s1", 222);
  assert.equal((db.prepare("SELECT credentials_changed_at AS c FROM staff WHERE id = 's1'").get() as { c: number }).c, 222);
  db.prepare(sqlOf("touch_credentials")).run("s1", 333);
  assert.equal((db.prepare("SELECT credentials_changed_at AS c FROM staff WHERE id = 's1'").get() as { c: number }).c, 333);
});

// ADR-0207 Đ6, Đ7 (đợt 1 Task 7): đường kích hoạt `set_pin_activate` là một đường đặt PIN → PHẢI đẩy credentials_changed_at (cookie/phiên cấp trước đó hết hiệu lực) và chỉ tác động tài khoản đang tắt.
test("set_pin_activate: đặt PIN + bật + ĐẨY credentials_changed_at; tài khoản đang bật thì không đổi gì", () => {
  const db = new DatabaseSync(":memory:");
  for (const f of readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort()) db.exec(readFileSync(new URL(f, DIR), "utf8"));
  db.exec("INSERT INTO staff (id, phone, pin_hash, role, full_name, active, created_at) VALUES ('t1', '0900000011', 'cu', 'sales', '', 0, '2026-01-01T00:00:00Z'), ('t2', '0900000012', 'cu', 'sales', '', 1, '2026-01-01T00:00:00Z')");
  const act = db.prepare(sqlOf("set_pin_activate"));
  act.run("t1", "moi", 777);
  const t1 = db.prepare("SELECT pin_hash AS p, active AS a, credentials_changed_at AS c FROM staff WHERE id = 't1'").get() as { p: string; a: number; c: number };
  assert.deepEqual({ ...t1 }, { p: "moi", a: 1, c: 777 });
  act.run("t2", "moi", 888);
  const t2 = db.prepare("SELECT pin_hash AS p, credentials_changed_at AS c FROM staff WHERE id = 't2'").get() as { p: string; c: number | null };
  assert.deepEqual({ ...t2 }, { p: "cu", c: null });
});
