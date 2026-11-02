// ADR-0158 — phần xoá một lần dữ liệu thử, nằm ngoài `migrations/`. Bài này chạy tệp THẬT, canh bốn điều:
// lược đồ trước và sau giống hệt; có dữ liệu thì xoá đúng phần và giữ đúng phần; không bảng nào trỏ về phần bị xoá mà bị sót; chốt chặn dừng trước câu xoá đầu tiên.
import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readdirSync, readFileSync } from "node:fs";

const thuMuc = new URL("../migrations/", import.meta.url);
const sqlXoa = readFileSync(new URL("../scripts/don-du-lieu-thu/migrations/0001_xoa_du_lieu_thu_adr_0158.sql", import.meta.url), "utf8");
const xoa = [...sqlXoa.matchAll(/^DELETE FROM (\w+)/gm)].map((m) => m[1]!);

function dbTruoc(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  for (const t of readdirSync(thuMuc).filter((t) => t.endsWith(".sql") && t < "0135").sort()) db.exec(readFileSync(new URL(t, thuMuc), "utf8"));
  return db;
}
const luocDo = (db: DatabaseSync): string[] =>
  (db.prepare("SELECT type, name, tbl_name, sql FROM sqlite_master WHERE sql IS NOT NULL ORDER BY type, name").all() as Record<string, string>[])
    .map((r) => `${r.type}|${r.name}|${r.tbl_name}|${r.sql}`);
const NOW = "2026-11-02T00:00:00.000Z";
const gieoCap = (db: DatabaseSync): void => {
  db.exec(`INSERT INTO prc_rate_tier (code, name, name_key, created_at, updated_at) VALUES ('MT_THU', 'Cấp thử', 'cap thu', '${NOW}', '${NOW}')`);
};
const dem = (db: DatabaseSync, bang: string): number => (db.prepare(`SELECT count(*) AS n FROM ${bang}`).get() as { n: number }).n;

test("chỉ nằm ngoài migrations/: không tệp nào trong chuỗi thường có câu xoá này", () => {
  assert.ok(!readdirSync(thuMuc).some((t) => t.includes("xoa_du_lieu_thu") || t.includes("don_du_lieu_thu")));
});

test("lược đồ sau khi chạy giống hệt lược đồ trước: mọi trigger được đặt lại nguyên văn", () => {
  const db = dbTruoc();
  const truoc = luocDo(db);
  db.exec(sqlXoa);
  assert.deepEqual(luocDo(db), truoc);
});

test("có dữ liệu thì xoá được qua trigger chặn xoá, và sau đó trigger lại chặn", () => {
  const db = dbTruoc();
  gieoCap(db);
  assert.throws(() => db.exec("DELETE FROM prc_rate_tier"), /prc_append_only/);
  db.exec(sqlXoa.replace(/(SELECT 'cap', count\(\*\), )\d+/, "$11"));
  assert.equal(dem(db, "prc_rate_tier"), 0);
  gieoCap(db);
  assert.throws(() => db.exec("DELETE FROM prc_rate_tier"), /prc_append_only/);
});

test("chốt chặn: nhiều dòng hơn số đã đếm thì dừng trước câu xoá đầu tiên", () => {
  const db = dbTruoc();
  gieoCap(db);
  assert.throws(() => db.exec(sqlXoa.replace(/(SELECT 'cap', count\(\*\), )\d+/, "$10")), /CHECK/);
  assert.equal(dem(db, "prc_rate_tier"), 1, "chưa được xoá gì");
  for (const loai of ["don", "phieu_thu", "chuyen", "ve_da_cap", "muc_hoa_hong", "cap"]) assert.ok(sqlXoa.includes(`SELECT '${loai}', count(*), `), `thiếu chốt ${loai}`);
  assert.ok(sqlXoa.indexOf("tmp_chot_chan_xoa_thu;") < sqlXoa.indexOf("DROP TRIGGER"), "chốt đứng trước mọi câu gỡ trigger");
});

test("mọi bảng có khoá ngoại trỏ về bảng bị xoá đều nằm trong danh sách, và xoá con trước cha", () => {
  const db = dbTruoc();
  const bang = (db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '%cf_%'").all() as { name: string }[]).map((r) => r.name);
  for (const b of bang) {
    for (const f of db.prepare(`PRAGMA foreign_key_list("${b}")`).all() as { table: string }[]) {
      if (!xoa.includes(f.table)) continue;
      assert.ok(xoa.includes(b), `${b} trỏ về ${f.table} nhưng không được xoá`);
      if (b !== f.table) assert.ok(xoa.indexOf(b) < xoa.indexOf(f.table), `${b} phải xoá trước ${f.table}`);
    }
  }
  for (const b of ["orders", "vc_trip", "vc_leg_appt_ack", "vdt_allocation", "vdt_guest_link", "prc_commission_rule", "prc_rate_tier", "prc_role_tier", "prc_party_tier", "bil_payment_receipt", "bil_posting"]) {
    assert.ok(xoa.includes(b), `thiếu ${b}`);
  }
});

test("phần phải giữ không có trong danh sách; nhật ký chỉ xoá dòng gắn đơn hoặc chuyến", () => {
  for (const b of ["staff", "stf_permission", "pty_party", "pty_party_role", "prc_beneficiary_role", "prc_supply_term", "prc_sales_block", "catalog_item", "catalog_override", "vc_rental_rate", "vc_vehicle", "fbk_ticket", "vdt_ticket", "vdt_batch", "ky_period_close"]) {
    assert.ok(!xoa.includes(b), `${b} phải được giữ`);
  }
  assert.match(sqlXoa, /^DELETE FROM audit_log WHERE order_id IS NOT NULL OR id IN \(SELECT id FROM vc_trip_event\);$/m);
  assert.ok(sqlXoa.indexOf("DELETE FROM audit_log") < sqlXoa.indexOf("DELETE FROM vc_trip_event"), "nhật ký chuyến phải xoá trước sự kiện chuyến");
});

test("vé đã mở ảnh giữ dấu mở trước khi xoá phân bổ, nên không nhập lại được", () => {
  assert.ok(sqlXoa.indexOf("SET opened_at =") < sqlXoa.indexOf("DELETE FROM vdt_allocation"), "ghi dấu trước khi xoá phân bổ");
  assert.ok(sqlXoa.indexOf("DROP TRIGGER vdt_ticket_opened_guard") < sqlXoa.indexOf("SET opened_at ="));
});
