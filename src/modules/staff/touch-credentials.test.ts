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
