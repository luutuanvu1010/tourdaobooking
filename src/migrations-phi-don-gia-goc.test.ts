// Kiểm migration PHÍ ĐƯA ĐÓN TỪ GIÁ GỐC SHEET (ADR-0218 Đợt 1; kế hoạch 2026-11-18 Task 1): năm bảng chỉ-thêm + một view.
// SQLite thật (node:sqlite). Tệp tìm theo ĐUÔI tên — đổi số lúc gộp chỉ đổi tên tệp.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const MATCHES = files.filter((f) => f.endsWith("_phi_don_gia_goc.sql"));
const FILE = MATCHES[0] ?? "";
const sqlOf = (f: string) => readFileSync(new URL(f, DIR), "utf8");

function open(): DatabaseSync {
  const d = new DatabaseSync(":memory:");
  d.exec("PRAGMA foreign_keys = ON");
  for (const f of files) d.exec(sqlOf(f));
  return d;
}
type Row = Record<string, unknown>;
const rows = (d: DatabaseSync, sql: string): Row[] => d.prepare(sql).all().map((r) => ({ ...(r as Row) }));
const AT = "2026-11-18T00:00:00.000Z";

test("đúng MỘT tệp `*_phi_don_gia_goc.sql`, sau 0177; chỉ-thêm (không DROP, không ALTER bảng cũ)", () => {
  assert.equal(MATCHES.length, 1, `cần đúng một tệp, có ${JSON.stringify(MATCHES)}`);
  assert.ok(FILE > "0177", FILE);
  const khongChuThich = sqlOf(FILE).replace(/--.*$/gm, "");
  assert.doesNotMatch(khongChuThich, /DROP\s|ALTER\s/i);
});

function giaGoc(d: DatabaseSync, id: string, ma: string, moiKhach: string, xeRieng: string, at: string) {
  d.exec(`INSERT INTO ctl_service_transfer_price (id, catalog_code, per_pax_price, private_price, valid_from_at, created_at) VALUES ('${id}', '${ma}', ${moiKhach}, ${xeRieng}, '${at}', '${at}')`);
}

test("giá gốc: trần 500.000 đi chung, 5.000.000 xe riêng, NULL được, âm bị chặn; không sửa, không xoá", () => {
  const d = open();
  assert.throws(() => giaGoc(d, "a1", "T1", "600000", "NULL", AT), /CHECK/);
  assert.throws(() => giaGoc(d, "a2", "T1", "NULL", "5000001", AT), /CHECK/);
  assert.throws(() => giaGoc(d, "a3", "T1", "-1", "NULL", AT), /CHECK/);
  giaGoc(d, "a4", "T1", "500000", "5000000", AT);
  giaGoc(d, "a5", "T2", "NULL", "NULL", AT);
  giaGoc(d, "a6", "T3", "0", "0", AT);
  assert.throws(() => giaGoc(d, "a7", "T1", "1", "NULL", AT), /UNIQUE/);
  assert.throws(() => d.exec("UPDATE ctl_service_transfer_price SET per_pax_price = 1"), /ctl_service_transfer_price_append_only/);
  assert.throws(() => d.exec("DELETE FROM ctl_service_transfer_price"), /ctl_service_transfer_price_append_only/);
  const r = rows(d, "SELECT per_pax_price AS p FROM ctl_service_transfer_price WHERE catalog_code = 'T2'");
  assert.equal(r[0]!.p, null, "ô trống là NULL, không bao giờ thành 0");
});

test("view giá gốc trả dòng mới nhất của từng dịch vụ", () => {
  const d = open();
  giaGoc(d, "b1", "T1", "100000", "NULL", "2026-11-18T00:00:00.000Z");
  giaGoc(d, "b2", "T1", "120000", "900000", "2026-11-19T00:00:00.000Z");
  giaGoc(d, "b3", "T2", "50000", "NULL", "2026-11-18T00:00:00.000Z");
  const r = rows(d, "SELECT catalog_code, per_pax_price, private_price FROM v_ctl_service_transfer_price ORDER BY catalog_code");
  assert.deepEqual(r, [
    { catalog_code: "T1", per_pax_price: 120000, private_price: 900000 },
    { catalog_code: "T2", per_pax_price: 50000, private_price: null },
  ]);
});

function cap(d: DatabaseSync, code: string, active = 1) {
  d.exec(`INSERT INTO prc_rate_tier (code, name, name_key, active, created_at, updated_at) VALUES ('${code}', '${code}', '${code}', ${active}, '${AT}', '${AT}')`);
}
function giam(d: DatabaseSync, id: string, tier: string, amount: number, tu: string, den: string | null) {
  d.exec(`INSERT INTO prc_transfer_fee_tier_discount (id, tier_code, amount, valid_from_date, valid_to_date, created_at, created_by, updated_at, updated_by) VALUES ('${id}', '${tier}', ${amount}, '${tu}', ${den ? `'${den}'` : "NULL"}, '${AT}', 's1', '${AT}', 's1')`);
}

test("mức giảm theo cấp: chồng ngày cùng cấp bị chặn, cấp tắt bị chặn, đóng hai lần bị chặn, trần 5.000.000, không xoá", () => {
  const d = open();
  cap(d, "C3");
  cap(d, "C9", 0);
  giam(d, "g1", "C3", 20000, "2026-11-20", null);
  assert.throws(() => giam(d, "g2", "C3", 30000, "2026-12-01", null), /prc_transfer_fee_discount_overlap/);
  assert.throws(() => giam(d, "g3", "C9", 1000, "2026-11-20", null), /prc_tier_inactive/);
  assert.throws(() => giam(d, "g4", "C3", 5000001, "2026-10-01", "2026-10-31"), /CHECK/);
  assert.throws(() => giam(d, "g5", "C3", -1, "2026-10-01", "2026-10-31"), /CHECK/);
  d.exec(`UPDATE prc_transfer_fee_tier_discount SET valid_to_date = '2026-11-30', updated_at = '${AT}' WHERE id = 'g1'`);
  assert.throws(() => d.exec(`UPDATE prc_transfer_fee_tier_discount SET valid_to_date = '2026-11-29' WHERE id = 'g1'`), /prc_append_only/);
  assert.throws(() => d.exec("UPDATE prc_transfer_fee_tier_discount SET amount = 1 WHERE id = 'g1'"), /prc_append_only/);
  giam(d, "g6", "C3", 25000, "2026-12-01", null);
  assert.throws(() => d.exec("DELETE FROM prc_transfer_fee_tier_discount"), /prc_append_only/);
});

function ct(d: DatabaseSync, id: string, scope: string, tu: string, den: string) {
  d.exec(`INSERT INTO prc_transfer_fee_program (id, name, scope, trip_from, trip_to, created_at, created_by) VALUES ('${id}', 'CT ${id}', '${scope}', '${tu}', '${den}', '${AT}', 's1')`);
}

test("chương trình miễn phí: ngày đi đến < từ bị chặn, phạm vi lạ bị chặn, tên rỗng bị chặn, kết thúc một lần, không xoá", () => {
  const d = open();
  assert.throws(() => ct(d, "p1", "ALL", "2026-12-10", "2026-12-01"), /CHECK/);
  assert.throws(() => ct(d, "p2", "NONE", "2026-12-01", "2026-12-10"), /CHECK/);
  assert.throws(() => d.exec(`INSERT INTO prc_transfer_fee_program (id, name, scope, trip_from, trip_to, created_at) VALUES ('p3', '  ', 'ALL', '2026-12-01', '2026-12-02', '${AT}')`), /CHECK/);
  ct(d, "p4", "ALL", "2026-12-01", "2026-12-10");
  assert.equal(rows(d, "SELECT include_private AS i FROM prc_transfer_fee_program")[0]!.i, 0, "mặc định không gồm xe riêng");
  d.exec(`UPDATE prc_transfer_fee_program SET ended_at = '${AT}', ended_by = 's1' WHERE id = 'p4'`);
  assert.throws(() => d.exec(`UPDATE prc_transfer_fee_program SET ended_at = '2099-01-01T00:00:00.000Z', ended_by = 's2' WHERE id = 'p4'`), /prc_append_only/);
  assert.throws(() => d.exec("UPDATE prc_transfer_fee_program SET name = 'x' WHERE id = 'p4'"), /prc_append_only/);
  assert.throws(() => d.exec("DELETE FROM prc_transfer_fee_program"), /prc_append_only/);
});

test("phạm vi chương trình: SERVICES chỉ nhận mã dịch vụ, PARTNERS chỉ nhận hồ sơ, đúng một trong hai, ALL không nhận gì, không sửa không xoá", () => {
  const d = open();
  ct(d, "s", "SERVICES", "2026-12-01", "2026-12-10");
  ct(d, "q", "PARTNERS", "2026-12-01", "2026-12-10");
  ct(d, "a", "ALL", "2026-12-01", "2026-12-10");
  const them = (p: string, ma: string | null, party: string | null) =>
    d.exec(`INSERT INTO prc_transfer_fee_program_scope (program_id, catalog_code, party_id) VALUES ('${p}', ${ma ? `'${ma}'` : "NULL"}, ${party ? `'${party}'` : "NULL"})`);
  assert.throws(() => them("s", null, "P1"), /prc_transfer_fee_scope/);
  assert.throws(() => them("q", "T1", null), /prc_transfer_fee_scope/);
  assert.throws(() => them("a", "T1", null), /prc_transfer_fee_scope/);
  assert.throws(() => them("s", "T1", "P1"), /CHECK|prc_transfer_fee_scope/);
  assert.throws(() => them("s", null, null), /CHECK|prc_transfer_fee_scope/);
  them("s", "T1", null);
  them("q", null, "P1");
  assert.throws(() => d.exec("UPDATE prc_transfer_fee_program_scope SET catalog_code = 'T9' WHERE program_id = 's'"), /prc_append_only/);
  assert.throws(() => d.exec("DELETE FROM prc_transfer_fee_program_scope"), /prc_append_only/);
});

test("công tắc biên nhận: đúng MỘT dòng gieo show_separate = 0 (gộp), không sửa không xoá, valid_from_at UNIQUE", () => {
  const d = open();
  const r = rows(d, "SELECT id, show_separate, created_by FROM ord_receipt_fee_display_policy");
  assert.equal(r.length, 1);
  assert.equal(r[0]!.show_separate, 0);
  assert.equal(r[0]!.created_by, null);
  const them = (id: string, v: string, at: string) => d.exec(`INSERT INTO ord_receipt_fee_display_policy (id, show_separate, valid_from_at, created_at, created_by) VALUES ('${id}', ${v}, '${at}', '${at}', 's1')`);
  assert.throws(() => them("x1", "2", "2099-01-01T00:00:00.000Z"), /CHECK/);
  them("x3", "1", "2099-01-01T00:00:00.002Z");
  assert.throws(() => them("x4", "0", "2099-01-01T00:00:00.002Z"), /UNIQUE/);
  assert.throws(() => d.exec("UPDATE ord_receipt_fee_display_policy SET show_separate = 1"), /ord_policy_append_only/);
  assert.throws(() => d.exec("DELETE FROM ord_receipt_fee_display_policy"), /ord_policy_append_only/);
});
