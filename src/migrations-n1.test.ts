// Kiểm migration N1 (0009…0012) trên SQLite thật (node:sqlite) với schema dựng từ migrations/*.sql — bản chuyển thể của
// docs/superpowers/specs/2026-09-20-n1-schema-verify.py. D1 là SQLite và bật khoá ngoại, nên đây là lưới đầu tiên; e2e xác nhận lại trên D1 local.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const upTo = (prefix: string) => files.filter((f) => f.slice(0, 4) <= prefix);

function open(list: string[] = files): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of list) db.exec(readFileSync(new URL(f, DIR), "utf8"));
  return db;
}
const NOW = "2026-09-20T00:00:00.000Z";
const rows = (db: DatabaseSync, sql: string, ...args: (string | number | null)[]) => db.prepare(sql).all(...args).map((r) => ({ ...r }));
const one = (db: DatabaseSync, sql: string, ...args: (string | number | null)[]) => Object.values(db.prepare(sql).get(...args) ?? {})[0];
const fails = (db: DatabaseSync, sql: string, re: RegExp) => assert.throws(() => db.exec(sql), re, sql);

// ---------------------------------------------------------------------------------------------------------------------
// 0009 + 0010: orders label view, locations
// ---------------------------------------------------------------------------------------------------------------------
test("0009: v_ord_order_label chỉ có (id, order_code) và trả mã đơn", () => {
  const db = open(upTo("0009"));
  db.exec(`INSERT INTO staff (id, full_name, phone, pin_hash, role, created_at) VALUES ('s1', 'NV', '0900000001', 'x', 'sales', '${NOW}')`);
  db.exec(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, created_at, updated_at) VALUES ('o1', 'TD-1', 's1', 'draft', 'K', '0900000009', '${NOW}', '${NOW}')`);
  assert.deepEqual(db.prepare("PRAGMA table_info(v_ord_order_label)").all().map((c) => c.name), ["id", "order_code"]);
  assert.deepEqual(rows(db, "SELECT id, order_code FROM v_ord_order_label"), [{ id: "o1", order_code: "TD-1" }]);
});

test("0010: 8 địa điểm gieo, id cố định giữa các lần dựng, 4 loại", () => {
  const a = open(upTo("0010"));
  const b = open(upTo("0010"));
  const codes = ["BEN_TAU_NHA_TRANG", "CANG_VINPEARL", "QUAY_VE_01", "QUAY_VE_02", "QUAY_VE_03", "QUAY_VE_04", "VP_2_THANG_4", "VP_TRAN_PHU"];
  assert.deepEqual(rows(a, "SELECT code FROM loc_location ORDER BY code").map((r) => r.code), codes);
  assert.deepEqual(rows(a, "SELECT id, code FROM loc_location ORDER BY code"), rows(b, "SELECT id, code FROM loc_location ORDER BY code"), "id gieo phải giống nhau ở mọi môi trường");
  for (const r of rows(a, "SELECT id FROM loc_location")) assert.match(String(r.id), /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/);
  assert.deepEqual(rows(a, "SELECT code FROM loc_location_type ORDER BY sort_order").map((r) => r.code), ["OFFICE", "TICKET_COUNTER", "PIER", "PORT"]);
  assert.equal(one(a, "SELECT count(*) FROM loc_location WHERE location_type_code = 'TICKET_COUNTER'"), 4);
});

test("0010: ràng buộc địa điểm (mã trùng, mã chữ thường, loại lạ, tên rỗng, cờ active)", () => {
  const db = open(upTo("0010"));
  const ins = (id: string, code: string, name: string, type: string, active = 1) =>
    `INSERT INTO loc_location (id, code, name, location_type_code, active, created_at, updated_at) VALUES ('${id}', '${code}', '${name}', '${type}', ${active}, '${NOW}', '${NOW}')`;
  db.exec(ins("x1", "QUAY_VE_05", "Quầy vé 05", "TICKET_COUNTER"));
  fails(db, ins("x2", "QUAY_VE_05", "Trùng mã", "TICKET_COUNTER"), /UNIQUE/);
  fails(db, ins("x3", "quay_ve_06", "Chữ thường", "TICKET_COUNTER"), /CHECK/);
  fails(db, ins("x4", "LOAI_LA", "Loại lạ", "KHONG_CO"), /FOREIGN KEY/);
  fails(db, ins("x5", "TEN_RONG", "   ", "OFFICE"), /CHECK/);
  fails(db, ins("x6", "CO_LA", "Cờ lạ", "OFFICE", 2), /CHECK/);
});

test("0010: v_loc_location_label chỉ có khoá + nhãn + cờ", () => {
  const db = open(upTo("0010"));
  assert.deepEqual(db.prepare("PRAGMA table_info(v_loc_location_label)").all().map((c) => c.name), ["id", "code", "name", "location_type_code", "active"]);
});

// ---------------------------------------------------------------------------------------------------------------------
// 0011: parties
// ---------------------------------------------------------------------------------------------------------------------
const party = (db: DatabaseSync, id: string, kind: "PERSON" | "ORGANIZATION", name: string) =>
  db.exec(`INSERT INTO pty_party (id, party_kind, display_name, created_at, updated_at) VALUES ('${id}', '${kind}', '${name}', '${NOW}', '${NOW}')`);
const person = (db: DatabaseSync, id: string, family: string | null, middle: string | null, given: string) => {
  const q = (v: string | null) => (v === null ? "NULL" : `'${v}'`);
  party(db, id, "PERSON", [family, middle, given].filter(Boolean).join(" "));
  db.exec(`INSERT INTO pty_person (party_id, family_name, middle_name, given_name, created_at, updated_at) VALUES ('${id}', ${q(family)}, ${q(middle)}, '${given}', '${NOW}', '${NOW}')`);
};

test("0011: gieo tra cứu (8 vai trò, 2 loại liên hệ, 1 loại quan hệ)", () => {
  const db = open(upTo("0011"));
  assert.deepEqual(rows(db, "SELECT code FROM pty_role_type ORDER BY code").map((r) => r.code), ["AGENT", "BOAT_CAPTAIN", "CUSTOMER", "DRIVER", "GUIDE", "SALES", "STAFF", "ACCOUNTANT"].sort());
  assert.deepEqual(rows(db, "SELECT code FROM pty_contact_kind ORDER BY code").map((r) => r.code), ["EMAIL", "PHONE"]);
  assert.deepEqual(rows(db, "SELECT code FROM pty_relationship_type").map((r) => r.code), ["CONTACT_OF"]);
});

test("0011: hồ sơ — loại lạ, tên rỗng, MST sai độ dài, cá nhân thiếu tên", () => {
  const db = open(upTo("0011"));
  fails(db, `INSERT INTO pty_party (id, party_kind, display_name, created_at, updated_at) VALUES ('p1', 'ROBOT', 'X', '${NOW}', '${NOW}')`, /CHECK/);
  fails(db, `INSERT INTO pty_party (id, party_kind, display_name, created_at, updated_at) VALUES ('p2', 'PERSON', '  ', '${NOW}', '${NOW}')`, /CHECK/);
  party(db, "o1", "ORGANIZATION", "Đại lý A");
  fails(db, `INSERT INTO pty_organization (party_id, legal_name, tax_code, created_at, updated_at) VALUES ('o1', 'A', '123', '${NOW}', '${NOW}')`, /CHECK/);
  db.exec(`INSERT INTO pty_organization (party_id, legal_name, tax_code, created_at, updated_at) VALUES ('o1', 'Công ty A', '0312345678', '${NOW}', '${NOW}')`);
  party(db, "p3", "PERSON", "Không tên");
  fails(db, `INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES ('p3', '', '${NOW}', '${NOW}')`, /CHECK|NOT NULL/);
});

test("0011: liên hệ — số dùng chung được, tối đa một liên hệ chính đang mở mỗi loại", () => {
  const db = open(upTo("0011"));
  person(db, "a", "Nguyễn", null, "An");
  person(db, "b", "Trần", null, "Bình");
  const contact = (id: string, party: string, value: string, primary: number, to: string | null = null) =>
    `INSERT INTO pty_contact_point (id, party_id, contact_kind_code, value, value_normalized, is_primary, valid_from_date, valid_to_date, created_at, updated_at)
     VALUES ('${id}', '${party}', 'PHONE', '${value}', '${value}', ${primary}, '2026-01-01', ${to === null ? "NULL" : `'${to}'`}, '${NOW}', '${NOW}')`;
  db.exec(contact("c1", "a", "0901234567", 1));
  db.exec(contact("c2", "b", "0901234567", 1)); // cùng số ở hồ sơ khác: hợp lệ (ADR-0001 mục 8)
  fails(db, contact("c3", "a", "0907654321", 1), /UNIQUE/);
  db.exec(contact("c4", "a", "0907654321", 0)); // liên hệ phụ thì được
  db.exec("UPDATE pty_contact_point SET valid_to_date = '2026-06-30' WHERE id = 'c1'");
  db.exec(contact("c5", "a", "0908888888", 1)); // đóng liên hệ chính cũ thì mở được chính mới
  assert.equal(rows(db, "SELECT count(*) AS n FROM pty_contact_point WHERE value_normalized = '0901234567'")[0]!.n, 2);
  fails(db, `INSERT INTO pty_contact_point (id, party_id, contact_kind_code, value, value_normalized, valid_from_date, created_at, updated_at) VALUES ('c6','a','PHONE','x','x','2026-02-30','${NOW}','${NOW}')`, /CHECK/);
});

test("0011: vai trò theo nơi — một dòng mở, không chồng lấn, ngày đúng lịch, FK nơi", () => {
  const db = open(upTo("0011"));
  person(db, "a", "Nguyễn", "Tuyên", "Phong");
  const vin = one(db, "SELECT id FROM loc_location WHERE code = 'CANG_VINPEARL'") as string;
  const pier = one(db, "SELECT id FROM loc_location WHERE code = 'BEN_TAU_NHA_TRANG'") as string;
  const role = (id: string, type: string, loc: string | null, from: string, to: string | null) =>
    `INSERT INTO pty_party_role (id, party_id, role_type_code, location_id, valid_from_date, valid_to_date, created_at, updated_at)
     VALUES ('${id}', 'a', '${type}', ${loc === null ? "NULL" : `'${loc}'`}, '${from}', ${to === null ? "NULL" : `'${to}'`}, '${NOW}', '${NOW}')`;
  db.exec(role("r1", "GUIDE", vin, "2026-01-01", "2026-03-31"));
  db.exec(role("r2", "GUIDE", vin, "2026-04-01", null)); // liền kề: hợp lệ
  fails(db, role("r3", "GUIDE", vin, "2026-05-01", null), /UNIQUE|chồng/); // trùng đang mở
  fails(db, role("r4", "GUIDE", vin, "2026-02-01", "2026-02-28"), /chồng/); // chồng khoảng đã đóng
  db.exec(role("r5", "GUIDE", pier, "2026-01-01", null)); // nơi khác: độc lập
  db.exec(role("r6", "STAFF", null, "2026-01-01", null));
  fails(db, role("r7", "STAFF", null, "2026-06-01", null), /UNIQUE|chồng/); // NULL nơi cũng không được trùng đang mở
  fails(db, role("r8", "DRIVER", vin, "2026-02-30", null), /CHECK/); // 30/02
  fails(db, role("r9", "DRIVER", vin, "2026-05-02", "2026-05-01"), /CHECK/); // đảo ngày
  fails(db, role("r10", "DRIVER", "khong-co", "2026-05-01", null), /FOREIGN KEY/);
  fails(db, role("r11", "KHONG_CO", vin, "2026-05-01", null), /FOREIGN KEY/);
});

test("0011: quan hệ hồ sơ — không tự quan hệ, một dòng mở, không chồng lấn", () => {
  const db = open(upTo("0011"));
  person(db, "a", "Nguyễn", null, "An");
  party(db, "org", "ORGANIZATION", "Đại lý A");
  const rel = (id: string, from: string, to: string, f: string, t: string | null) =>
    `INSERT INTO pty_party_relationship (id, from_party_id, to_party_id, relationship_type_code, valid_from_date, valid_to_date, created_at, updated_at)
     VALUES ('${id}', '${from}', '${to}', 'CONTACT_OF', '${f}', ${t === null ? "NULL" : `'${t}'`}, '${NOW}', '${NOW}')`;
  db.exec(rel("q1", "a", "org", "2026-01-01", "2026-06-30"));
  fails(db, rel("q2", "org", "org", "2026-01-01", null), /CHECK/);
  fails(db, rel("q3", "a", "org", "2026-03-01", "2026-04-01"), /chồng/);
  db.exec(rel("q4", "a", "org", "2026-07-01", null));
  fails(db, rel("q5", "a", "org", "2026-08-01", null), /UNIQUE|chồng/);
});

test("0011: v_pty_party_label — khoá + nhãn + loại + cờ + sort_key (tên trước họ)", () => {
  const db = open(upTo("0011"));
  assert.deepEqual(db.prepare("PRAGMA table_info(v_pty_party_label)").all().map((c) => c.name), ["id", "display_name", "party_kind", "active", "sort_key"]);
  person(db, "a", "Nguyễn", "Tuyên", "Phong");
  person(db, "b", null, null, "Hương");
  party(db, "org", "ORGANIZATION", "Đại lý Sao Biển");
  assert.equal(one(db, "SELECT sort_key FROM v_pty_party_label WHERE id = 'a'"), "Phong Nguyễn Tuyên");
  assert.equal(one(db, "SELECT sort_key FROM v_pty_party_label WHERE id = 'b'"), "Hương");
  assert.equal(one(db, "SELECT sort_key FROM v_pty_party_label WHERE id = 'org'"), "Đại lý Sao Biển");
});

test("0011: truy vấn 'ai giữ vai HDV ở Bến cảng Vinpearl hôm nay' (ADR-0001, Điều 6.2)", () => {
  const db = open(upTo("0011"));
  person(db, "a", "Nguyễn", "Tuyên", "Phong");
  db.exec(`INSERT INTO pty_party_role (id, party_id, role_type_code, location_id, valid_from_date, created_at, updated_at)
           SELECT 'r1', 'a', 'GUIDE', id, '2026-09-01', '${NOW}', '${NOW}' FROM loc_location WHERE code = 'CANG_VINPEARL'`);
  const q = `SELECT pl.display_name AS name FROM pty_party_role pr
             JOIN v_loc_location_label l ON l.id = pr.location_id JOIN v_pty_party_label pl ON pl.id = pr.party_id
             WHERE pr.role_type_code = 'GUIDE' AND l.code = 'CANG_VINPEARL' AND pr.valid_from_date <= ? AND (pr.valid_to_date IS NULL OR pr.valid_to_date >= ?)`;
  assert.deepEqual(rows(db, q, "2026-09-25", "2026-09-25"), [{ name: "Nguyễn Tuyên Phong" }]);
  assert.deepEqual(rows(db, q, "2026-08-31", "2026-08-31"), [], "trước ngày hiệu lực thì không có ai");
});
