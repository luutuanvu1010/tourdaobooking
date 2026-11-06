// Kiểm migration 0143 (ADR-0172, ADR-0173) trên SQLite thật: chèn/sửa THẲNG bằng SQL để chứng minh khoá nằm ở CSDL. Tên, SĐT ở đây là GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../../../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const FILE = files.find((f) => f.endsWith("_tra_sau_theo_gio.sql"))!;
const AT = "2026-11-06T03:00:00.000Z";
type Arg = string | number | null;
const run = (db: DatabaseSync, sql: string, ...a: Arg[]) => db.prepare(sql).run(...a);
const get = (db: DatabaseSync, sql: string, ...a: Arg[]) => db.prepare(sql).get(...a) as Record<string, unknown> | undefined;
const fails = (db: DatabaseSync, sql: string, re: RegExp, ...a: Arg[]) => assert.throws(() => run(db, sql, ...a), re, sql);

function open(list: string[]): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of list) db.exec(readFileSync(new URL(f, DIR), "utf8"));
  return db;
}
function gieo(db: DatabaseSync) {
  run(db, "INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('pty-s1', 'PERSON', 'Nhân Viên', 1, ?, ?)", AT, AT);
  run(db, "INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES ('pty-s1', 'Nhân Viên', ?, ?)", AT, AT);
  run(db, "INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at, party_id) VALUES ('s1', '', '0900000001', 'x', 'sales', 1, ?, 'pty-s1')", AT);
  run(db, "INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('dl-1', 'ORGANIZATION', 'Đại lý A', 1, ?, ?)", AT, AT);
  run(db, "INSERT INTO pty_organization (party_id, created_at, updated_at) VALUES ('dl-1', ?, ?)", AT, AT);
  run(db, "INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES ('vai-1', 'dl-1', 'TRAVEL_AGENCY', '2026-01-01', ?, ?)", AT, AT);
}
function don(db: DatabaseSync, id: string) {
  run(db, `INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, created_at, updated_at, booker_party_id)
    VALUES (?, ?, 's1', 'draft', 'Khách Giả', '0900000009', 100000, 100000, 100000, ?, ?, 'dl-1')`, id, `TD-${id}`, AT, AT);
  run(db, "UPDATE orders SET payment_term = 'CREDIT' WHERE id = ?", id);
}

test("0143: dòng hạn mức cũ đổi sang giờ (ngày × 24, ân hạn 0); dòng mới bắt buộc có giờ; giờ vượt 365 ngày bị chặn", () => {
  const db = open(files.filter((f) => f < FILE));
  gieo(db);
  run(db, "INSERT INTO bil_credit_limit (id, party_id, limit_amount, term_days, valid_from_date, created_at, updated_at) VALUES ('h0', 'dl-1', 1000, 7, '2026-11-01', ?, ?)", AT, AT);
  db.exec(readFileSync(new URL(FILE, DIR), "utf8"));
  assert.deepEqual({ ...get(db, "SELECT term_hours, grace_hours FROM bil_credit_limit WHERE id = 'h0'") }, { term_hours: 168, grace_hours: 0 });
  run(db, "UPDATE bil_credit_limit SET valid_to_date = '2026-11-05', updated_at = ? WHERE id = 'h0'", AT);
  fails(db, "INSERT INTO bil_credit_limit (id, party_id, limit_amount, term_days, valid_from_date, created_at, updated_at) VALUES ('h1', 'dl-1', 1000, 2, '2026-11-06', ?, ?)", /bil_credit_hours_required/, AT, AT);
  fails(db, "INSERT INTO bil_credit_limit (id, party_id, limit_amount, term_days, term_hours, valid_from_date, created_at, updated_at) VALUES ('h2', 'dl-1', 1000, 2, 8761, '2026-11-06', ?, ?)", /CHECK/, AT, AT);
  fails(db, "INSERT INTO bil_credit_limit (id, party_id, limit_amount, term_days, term_hours, grace_hours, valid_from_date, created_at, updated_at) VALUES ('h3', 'dl-1', 1000, 2, 36, -1, '2026-11-06', ?, ?)", /CHECK/, AT, AT);
  run(db, "INSERT INTO bil_credit_limit (id, party_id, limit_amount, term_days, term_hours, grace_hours, valid_from_date, created_at, updated_at) VALUES ('h4', 'dl-1', 50000000, 2, 36, 12, '2026-11-06', ?, ?)", AT, AT);
  // Chỉ đóng được một lần, và giờ không sửa tại chỗ.
  fails(db, "UPDATE bil_credit_limit SET term_hours = 48, valid_to_date = '2026-11-07' WHERE id = 'h4'", /bil_append_only/);
  fails(db, "UPDATE bil_credit_limit SET grace_hours = 0, valid_to_date = '2026-11-07' WHERE id = 'h4'", /bil_append_only/);
});

test("0143: đơn Trả sau cũ có hạn ngày ⇒ hai mốc = 23:59:59.999 giờ VN của ngày hạn", () => {
  const db = open(files.filter((f) => f < FILE));
  gieo(db);
  don(db, "o1");
  run(db, "UPDATE orders SET credit_due_date = '2026-11-10' WHERE id = 'o1'");
  db.exec(readFileSync(new URL(FILE, DIR), "utf8"));
  assert.deepEqual({ ...get(db, "SELECT credit_due_at, credit_grace_until FROM v_ord_don_tra_sau WHERE id = 'o1'") }, { credit_due_at: "2026-11-10T16:59:59.999Z", credit_grace_until: "2026-11-10T16:59:59.999Z" });
});

test("ADR-0173 Đ1 mục 3 (lớp CSDL): hạn trả chỉ lùi về sau, khoảng ân hạn giữ nguyên; lần chụp đầu tự do", () => {
  const db = open(files);
  gieo(db);
  don(db, "o1");
  run(db, "UPDATE orders SET credit_due_at = '2026-11-07T15:00:00.000Z', credit_grace_until = '2026-11-08T03:00:00.000Z' WHERE id = 'o1'");
  fails(db, "UPDATE orders SET credit_due_at = '2026-11-07T14:00:00.000Z', credit_grace_until = '2026-11-08T02:00:00.000Z' WHERE id = 'o1'", /credit_due_forward_only/);
  fails(db, "UPDATE orders SET credit_due_at = '2026-11-07T15:00:00.000Z' WHERE id = 'o1'", /credit_due_forward_only/); // bằng hạn cũ
  fails(db, "UPDATE orders SET credit_due_at = '2026-11-09T15:00:00.000Z' WHERE id = 'o1'", /credit_due_forward_only/); // ân hạn bị kéo ngắn lại
  fails(db, "UPDATE orders SET credit_grace_until = '2026-11-09T03:00:00.000Z' WHERE id = 'o1'", /credit_due_forward_only/); // nới riêng ân hạn
  fails(db, "UPDATE orders SET credit_due_at = NULL, credit_grace_until = NULL WHERE id = 'o1'", /credit_due_forward_only/);
  run(db, "UPDATE orders SET credit_due_at = '2026-11-09T15:00:00.000Z', credit_grace_until = '2026-11-10T03:00:00.000Z' WHERE id = 'o1'");
  assert.equal(get(db, "SELECT credit_grace_until AS g FROM orders WHERE id = 'o1'")!.g, "2026-11-10T03:00:00.000Z");
});

test("ADR-0173 Đ1 mục 1: mức tối đa Quản trị được cấp chỉ thêm, không sửa, không xoá", () => {
  const db = open(files);
  run(db, "INSERT INTO bil_credit_setting (id, admin_limit_ceiling, created_at, updated_at) VALUES ('c1', 100000000, ?, ?)", AT, AT);
  fails(db, "UPDATE bil_credit_setting SET admin_limit_ceiling = 1 WHERE id = 'c1'", /bil_append_only/);
  fails(db, "DELETE FROM bil_credit_setting", /bil_append_only/);
  fails(db, "INSERT INTO bil_credit_setting (id, admin_limit_ceiling, created_at, updated_at) VALUES ('c2', 0, ?, ?)", /CHECK/, AT, AT);
});

test("ADR-0172 Đ2: số gợi ý theo cấp gắn đúng cấp có thật, sửa được, không xoá", () => {
  const db = open(files);
  run(db, "INSERT INTO prc_rate_tier (code, name, name_key, created_at, updated_at) VALUES ('TA1', 'TA1', 'ta1', ?, ?)", AT, AT);
  run(db, "INSERT INTO bil_credit_tier_default (tier_code, limit_amount, term_hours, grace_hours, created_at, updated_at) VALUES ('TA1', 50000000, 36, 0, ?, ?)", AT, AT);
  run(db, "UPDATE bil_credit_tier_default SET term_hours = 48 WHERE tier_code = 'TA1'");
  fails(db, "INSERT INTO bil_credit_tier_default (tier_code, limit_amount, term_hours, grace_hours, created_at, updated_at) VALUES ('KHONG', 1, 1, 0, ?, ?)", /FOREIGN KEY/, AT, AT);
  fails(db, "DELETE FROM bil_credit_tier_default", /bil_append_only/);
});

test("ADR-0173 Đ3 mục 2: mỗi đơn, mỗi loại, mỗi mốc chỉ một tin nhắc; mốc mới (sau nới hạn) nhắc lại được", () => {
  const db = open(files);
  gieo(db);
  const them = (due: string) => run(db, "INSERT INTO bil_credit_reminder (order_id, kind, due_at, party_id, created_at, updated_at) VALUES ('o1', 'QUA_HAN', ?, 'dl-1', ?, ?)", due, AT, AT);
  them("2026-11-07T15:00:00.000Z");
  assert.throws(() => them("2026-11-07T15:00:00.000Z"), /UNIQUE|PRIMARY KEY/);
  them("2026-11-09T15:00:00.000Z");
  fails(db, "DELETE FROM bil_credit_reminder", /bil_append_only/);
});
