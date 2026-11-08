// Migration ô «Có vé» (ADR-0174 Đ1, Đ5): bảng chỉ thêm và giá trị ban đầu. Chạy thật trên SQLite, tách đúng trước/sau migration để thấy phần gieo.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const tatCa = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const TEP = tatCa.find((f) => f.endsWith("_o_co_ve.sql"))!;
const AT = "2026-10-31T03:00:00.000Z";

function truocVaSau() {
  assert.ok(TEP, "phải có migration _o_co_ve.sql");
  const d = new DatabaseSync(":memory:");
  d.exec("PRAGMA foreign_keys = ON");
  for (const f of tatCa.filter((x) => x < TEP)) d.exec(readFileSync(new URL(f, DIR), "utf8"));
  const lo = d.prepare("INSERT INTO vdt_batch (id, catalog_code, pax_group, printed_name, status, created_at, updated_at) VALUES (?, ?, 'ADULT', 'Vé', ?, ?, ?)");
  lo.run("l1", "HOATDONG", "ACTIVE", AT, AT);
  lo.run("l2", "HOATDONG", "ACTIVE", AT, AT);
  lo.run("l3", "CHONHAP", "PENDING", AT, AT);
  lo.run("l4", "DACHUY", "VOID", AT, AT);
  d.exec(readFileSync(new URL(TEP, DIR), "utf8"));
  return d;
}

test("giaTriBanDau: mã có lô PENDING hoặc ACTIVE được ghi Có vé đúng một dòng; lô VOID và mã không có lô không có dòng", () => {
  const d = truocVaSau();
  const rows = d.prepare("SELECT scope, code, has_ticket FROM ctl_service_ticket_flag ORDER BY code").all();
  assert.deepEqual(rows.map((r) => ({ ...r })), [
    { scope: "SERVICE", code: "CHONHAP", has_ticket: 1 },
    { scope: "SERVICE", code: "HOATDONG", has_ticket: 1 },
  ]);
});

test("chiThem: bảng ô Có vé không sửa, không xoá; view chỉ trả dòng mới nhất của từng ô", () => {
  const d = truocVaSau();
  assert.throws(() => d.exec("UPDATE ctl_service_ticket_flag SET has_ticket = 0"), /ctl_service_ticket_flag_append_only/);
  assert.throws(() => d.exec("DELETE FROM ctl_service_ticket_flag"), /ctl_service_ticket_flag_append_only/);
  d.prepare("INSERT INTO ctl_service_ticket_flag (id, scope, code, has_ticket, valid_from_at, created_at, updated_at) VALUES ('m', 'SERVICE', 'HOATDONG', 0, '2099-01-01T00:00:00.000Z', ?, ?)").run(AT, AT);
  assert.deepEqual(d.prepare("SELECT has_ticket FROM v_ctl_service_ticket_flag WHERE code = 'HOATDONG'").all().map((r) => ({ ...r })), [{ has_ticket: 0 }]);
  assert.throws(() => d.exec("INSERT INTO ctl_service_ticket_flag (id, scope, code, has_ticket, valid_from_at, created_at, updated_at) VALUES ('x', 'SERVICE', 'A', 2, 'z', 'z', 'z')"), /CHECK/);
  assert.throws(() => d.exec("INSERT INTO ctl_service_ticket_flag (id, scope, code, has_ticket, valid_from_at, created_at, updated_at) VALUES ('y', 'LA', 'A', 1, 'z', 'z', 'z')"), /CHECK/);
});
