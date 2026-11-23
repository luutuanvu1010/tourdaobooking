// Migration 0186 (ADR-0230 Đ1, Đ3): bảng «Vé do ai phát» theo nhóm và bảng dấu «Trả sau theo dịch vụ». Chạy thật trên SQLite mọi migration.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const tatCa = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const AT = "2026-11-22T03:00:00.000Z";

function moi() {
  assert.ok(tatCa.some((f) => f.endsWith("_tra_sau_dich_vu_va_nguon_ve_nhom.sql")), "phải có migration _tra_sau_dich_vu_va_nguon_ve_nhom.sql");
  const d = new DatabaseSync(":memory:");
  d.exec("PRAGMA foreign_keys = ON");
  for (const f of tatCa) d.exec(readFileSync(new URL(f, DIR), "utf8"));
  return d;
}
const nhomCo = (d: DatabaseSync): string => (d.prepare("SELECT code FROM ctl_group WHERE active = 1 LIMIT 1").get() as { code: string }).code;

test("nguồn vé theo nhóm: chỉ thêm, view trả dòng mới nhất, nhóm phải có thật", () => {
  const d = moi();
  const g = nhomCo(d);
  const them = d.prepare("INSERT INTO ctl_group_ticket_source (id, group_code, source, valid_from_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)");
  them.run("a", g, "TOUR_DAO", AT, AT, AT);
  them.run("b", g, "HANG_NGOAI", "2026-11-22T04:00:00.000Z", AT, AT);
  assert.deepEqual({ ...(d.prepare("SELECT source FROM v_ctl_group_ticket_source WHERE group_code = ?").get(g) as object) }, { source: "HANG_NGOAI" });
  assert.throws(() => d.exec("UPDATE ctl_group_ticket_source SET source = 'TOUR_DAO'"), /ctl_group_ticket_source_append_only/);
  assert.throws(() => d.exec("DELETE FROM ctl_group_ticket_source"), /ctl_group_ticket_source_append_only/);
  assert.throws(() => them.run("c", "KHONG_CO_NHOM_NAY", "TOUR_DAO", AT, AT, AT), /FOREIGN KEY/);
  assert.throws(() => them.run("d", g, "KHAC", "2026-11-22T05:00:00.000Z", AT, AT), /CHECK/);
});

test("dấu Trả sau theo dịch vụ: số giờ trong khoảng, mỗi đích một dòng mở, chỉ gỡ một lần, không xoá", () => {
  const d = moi();
  const them = d.prepare(
    "INSERT INTO bil_service_credit_rule (id, target_kind, target_code, due_hours, grace_hours, valid_from, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  );
  them.run("r1", "SERVICE", "TOUR3DAO", 24, 12, AT, AT, AT);
  assert.throws(() => them.run("r2", "SERVICE", "TOUR3DAO", 48, 0, AT, AT, AT), /UNIQUE/, "hai dòng mở cùng đích");
  assert.throws(() => them.run("r3", "SERVICE", "X", 0, 0, AT, AT, AT), /CHECK/, "giờ trả 0");
  assert.throws(() => them.run("r4", "SERVICE", "X", 8761, 0, AT, AT, AT), /CHECK/, "giờ trả quá 8760");
  assert.throws(() => them.run("r5", "SERVICE", "X", 1, -1, AT, AT, AT), /CHECK/, "ân hạn âm");
  assert.throws(() => them.run("r6", "KHAC", "X", 1, 0, AT, AT, AT), /CHECK/, "loại đích lạ");
  them.run("g1", "GROUP", "TOUR3DAO", 24, 0, AT, AT, AT); // cùng mã nhưng khác loại đích: được
  assert.throws(() => d.exec("UPDATE bil_service_credit_rule SET due_hours = 48 WHERE id = 'r1'"), /bil_append_only/);
  assert.throws(() => d.exec("DELETE FROM bil_service_credit_rule"), /bil_append_only/);
  d.exec(`UPDATE bil_service_credit_rule SET valid_to = '${AT}', updated_at = '${AT}' WHERE id = 'r1'`);
  assert.throws(() => d.exec(`UPDATE bil_service_credit_rule SET valid_to = '2026-11-23T00:00:00.000Z' WHERE id = 'r1'`), /bil_append_only/, "gỡ lần hai");
  them.run("r7", "SERVICE", "TOUR3DAO", 48, 0, "2026-11-22T05:00:00.000Z", AT, AT); // sau khi gỡ thì đặt lại được
  const mo = d.prepare("SELECT target_kind, due_hours FROM v_bil_service_credit_rule WHERE target_code = 'TOUR3DAO' ORDER BY target_kind").all().map((r) => ({ ...r }));
  assert.deepEqual(mo, [{ target_kind: "GROUP", due_hours: 24 }, { target_kind: "SERVICE", due_hours: 48 }]);
});
