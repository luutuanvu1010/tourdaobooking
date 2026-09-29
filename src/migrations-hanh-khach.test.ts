// Kiểm migration DANH SÁCH HÀNH KHÁCH (ADR-0047 A2, A3; module orders — kế hoạch Task A5): bảng `ord_passenger` (dòng nhẹ của đơn, KHÔNG phải hồ sơ
// Bên), bất biến "chỉ-thêm sau xác nhận" (sửa tên = dòng mới trỏ dòng trước, nhập nhầm = huỷ dòng, không sửa đè, không xoá), chuỗi theo `person_key`,
// và ba view công bố CHỈ khoá + cờ (`v_ord_order_flag`, `v_ord_leg_key`, `v_ord_passenger_key`). Chèn/sửa THẲNG bằng SQL: chứng minh chặn nằm ở CSDL.
// Tệp tìm theo ĐUÔI tên. Tên người ở đây là tên GIẢ có đánh dấu, năm sinh hiếm (1911, 1922) để dò nhật ký.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const MATCHES = files.filter((f) => f.endsWith("_hanh_khach.sql"));
const FILE = MATCHES[0]!;
const sqlOf = (f: string) => readFileSync(new URL(f, DIR), "utf8");
const open = (list: string[]) => {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of list) db.exec(sqlOf(f));
  return db;
};
const all = () => open(files);
const before = () => open(files.filter((f) => f < FILE));
const AT = "2026-09-29T03:00:00.000Z";
type Row = Record<string, unknown>;
const rows = (db: DatabaseSync, sql: string, ...a: (string | number | null)[]): Row[] => db.prepare(sql).all(...a).map((r) => ({ ...(r as Row) }));
const triggers = (db: DatabaseSync): string[] => rows(db, "SELECT name FROM sqlite_master WHERE type = 'trigger' ORDER BY name").map((r) => String(r.name));
const fails = (db: DatabaseSync, sql: string, re: RegExp, ...a: (string | number | null)[]) => assert.throws(() => db.prepare(sql).run(...a), re, sql);

function world(): DatabaseSync {
  const db = all();
  db.exec(`INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('pty-s1', 'PERSON', 'Nhân Viên', 1, '${AT}', '${AT}')`);
  db.exec(`INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES ('pty-s1', 'Nhân Viên', '${AT}', '${AT}')`);
  db.exec(`INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at, party_id) VALUES ('s1', '', '0900000001', 'x', 'sales', 1, '${AT}', 'pty-s1')`);
  return db;
}
function order(db: DatabaseSync, id: string) {
  db.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, created_at, updated_at) VALUES (?, ?, 's1', 'draft', 'Khách Giả', '0900000009', ?, ?)`)
    .run(id, `TD-${id}`, AT, AT);
  db.prepare(`INSERT INTO order_service (id, order_id, name, unit, pax_adult, depart_date) VALUES (?, ?, 'Tour', 'perPax', 2, '2026-10-10')`).run(`svc-${id}`, id);
}
const setStatus = (db: DatabaseSync, id: string, status: string) => db.prepare("UPDATE orders SET status = ?, updated_at = ? WHERE id = ?").run(status, AT, id);

interface P { id: string; order?: string; name?: string; year?: number; pax?: string | null; prev?: string | null; key?: string; voided?: string | null; source?: string }
function pax(db: DatabaseSync, p: P): string {
  db.prepare(
    `INSERT INTO ord_passenger (id, order_id, full_name, birth_year, pax_code, previous_id, person_key, voided_at, source, created_at, created_by, updated_at, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, NULL)`,
  ).run(p.id, p.order ?? "o1", p.name ?? "Khách Dò Tìm Một", p.year ?? 1911, p.pax === undefined ? "adult" : p.pax, p.prev ?? null, p.key ?? p.id, p.voided ?? null, p.source ?? "OFFICE", AT, AT);
  return p.id;
}
const voidRow = (db: DatabaseSync, id: string) => db.prepare("UPDATE ord_passenger SET voided_at = ?, updated_at = ? WHERE id = ?").run(AT, AT, id);
const keyView = (db: DatabaseSync) => rows(db, "SELECT person_key, order_id, has_current_row FROM v_ord_passenger_key ORDER BY person_key");

test("(a) đúng một tệp *_hanh_khach.sql; không phải B5; trigger mới đúng tên; chỉ mục (kể cả UNIQUE một phần); ba view mới", () => {
  assert.equal(MATCHES.length, 1, `phải có đúng một tệp *_hanh_khach.sql, thấy: ${JSON.stringify(MATCHES)}`);
  assert.doesNotMatch(FILE, /staff_party_required/);
  const db = before();
  const truoc = new Set(triggers(db));
  const viewsBefore = new Set(rows(db, "SELECT name FROM sqlite_master WHERE type = 'view'").map((r) => String(r.name)));
  db.exec(sqlOf(FILE));
  assert.deepEqual(triggers(db).filter((t) => !truoc.has(t)), [
    "ord_passenger_chain_ins", "ord_passenger_frozen_update", "ord_passenger_no_delete", "ord_passenger_superseded", "ord_passenger_voided",
  ]);
  assert.deepEqual(rows(db, "SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'ord_passenger' AND name NOT LIKE 'sqlite_%' ORDER BY name").map((r) => r.name), [
    "ord_passenger_next_uq", "ord_passenger_order_ix", "ord_passenger_person_ix",
  ]);
  assert.match(String(rows(db, "SELECT sql FROM sqlite_master WHERE name = 'ord_passenger_next_uq'")[0]!.sql), /UNIQUE INDEX[\s\S]*WHERE previous_id IS NOT NULL AND voided_at IS NULL/);
  assert.deepEqual(rows(db, "SELECT name FROM sqlite_master WHERE type = 'view'").map((r) => String(r.name)).filter((v) => !viewsBefore.has(v)).sort(), [
    "v_ord_leg_key", "v_ord_order_flag", "v_ord_passenger_key",
  ]);
});

test("(b) CHECK: tên 1–100 (không chỉ khoảng trắng), năm sinh 1900–2100 bắt buộc, loại khách tập đóng hoặc trống, nguồn OFFICE/DRIVER, previous_id ≠ id", () => {
  const db = world();
  order(db, "o1");
  pax(db, { id: "p-ok", pax: null }); // loại khách trống được
  const bad: P[] = [
    { id: "b1", name: "   " }, { id: "b2", name: "x".repeat(101) }, { id: "b3", year: 1899 }, { id: "b4", year: 2101 }, { id: "b5", pax: "baby" }, { id: "b6", source: "GUIDE" },
  ];
  for (const p of bad) assert.throws(() => pax(db, p), /CHECK constraint failed/, JSON.stringify(p));
  assert.throws(() => db.prepare(`INSERT INTO ord_passenger (id, order_id, full_name, person_key, created_at, updated_at) VALUES ('b7', 'o1', 'A', 'b7', '${AT}', '${AT}')`).run(), /NOT NULL constraint failed: ord_passenger.birth_year/);
  assert.equal(rows(db, "SELECT source FROM ord_passenger WHERE id = 'p-ok'")[0]!.source, "OFFICE");
  assert.throws(() => pax(db, { id: "self", prev: "self", key: "self" }), /CHECK constraint failed|FOREIGN KEY|passenger_chain/);
});

test("(c) đơn NHÁP: xoá, sửa đè được (lưu nháp xoá–chèn lại); đơn đã xác nhận / đã huỷ: xoá → passenger_frozen; sửa tên, năm sinh, loại, chuỗi → passenger_frozen", () => {
  const db = world();
  order(db, "o1");
  pax(db, { id: "p1" });
  db.prepare("UPDATE ord_passenger SET full_name = 'Khách Dò Tìm Hai', birth_year = 1922 WHERE id = 'p1'").run(); // nháp: được
  db.prepare("DELETE FROM ord_passenger WHERE id = 'p1'").run(); // nháp: được
  pax(db, { id: "p2" });
  setStatus(db, "o1", "confirmed");
  fails(db, "DELETE FROM ord_passenger WHERE id = 'p2'", /passenger_frozen: đơn không còn nháp — nhập nhầm thì huỷ dòng/);
  for (const set of ["full_name = 'Khác'", "birth_year = 1922", "pax_code = 'child'", "person_key = 'k'", "source = 'DRIVER'", "created_by = 's1'", "created_at = '2026-01-01T00:00:00.000Z'"]) {
    fails(db, `UPDATE ord_passenger SET ${set} WHERE id = 'p2'`, /passenger_frozen: không sửa đè — sửa tên thì thêm dòng mới/);
  }
  order(db, "o2");
  pax(db, { id: "p3", order: "o2" });
  setStatus(db, "o2", "cancelled");
  fails(db, "DELETE FROM ord_passenger WHERE id = 'p3'", /passenger_frozen/);
});

test("(d) sửa tên sau xác nhận = dòng MỚI trỏ dòng hiện hành, cùng person_key; chuỗi sai (khác người, khác đơn, dòng trước đã huỷ, đầu chuỗi person_key ≠ id) → passenger_chain", () => {
  const db = world();
  order(db, "o1");
  order(db, "o2");
  pax(db, { id: "a1" });
  pax(db, { id: "b1" });
  pax(db, { id: "c1", order: "o2" });
  setStatus(db, "o1", "confirmed");
  pax(db, { id: "a2", prev: "a1", key: "a1", name: "Khách Dò Tìm Hai" }); // đúng: được
  assert.throws(() => pax(db, { id: "x1", key: "khac-id" }), /passenger_chain: dòng thay thế phải nối dòng chưa huỷ của cùng người, cùng đơn/, "đầu chuỗi person_key ≠ id");
  assert.throws(() => pax(db, { id: "x2", prev: "b1", key: "a1" }), /passenger_chain/, "khác person_key với dòng trước");
  assert.throws(() => pax(db, { id: "x3", prev: "c1", key: "c1", order: "o1" }), /passenger_chain/, "dòng trước thuộc đơn khác");
  voidRow(db, "b1");
  assert.throws(() => pax(db, { id: "x4", prev: "b1", key: "b1" }), /passenger_chain/, "dòng trước đã huỷ");
});

test("(e) UNIQUE: hai dòng thay thế CHƯA huỷ cùng trỏ một dòng → chặn; dòng đã có dòng thay thế chưa huỷ không sửa được → passenger_superseded", () => {
  const db = world();
  order(db, "o1");
  pax(db, { id: "a1" });
  setStatus(db, "o1", "confirmed");
  pax(db, { id: "a2", prev: "a1", key: "a1" });
  assert.throws(() => pax(db, { id: "a3", prev: "a1", key: "a1" }), /UNIQUE constraint failed: ord_passenger.previous_id/);
  fails(db, "UPDATE ord_passenger SET voided_at = ? WHERE id = 'a1'", /passenger_superseded: dòng đã có dòng thay thế/, AT);
});

test("(f) huỷ dòng hiện hành được; bỏ huỷ / sửa dòng đã huỷ → passenger_voided; 'huỷ người' = huỷ mọi dòng, MỚI trước CŨ sau (R8)", () => {
  const db = world();
  order(db, "o1");
  pax(db, { id: "a1" });
  setStatus(db, "o1", "confirmed");
  pax(db, { id: "a2", prev: "a1", key: "a1" });
  voidRow(db, "a2"); // mới trước
  voidRow(db, "a1"); // rồi cũ — dòng thay thế của a1 đã huỷ nên không còn "superseded"
  fails(db, "UPDATE ord_passenger SET voided_at = NULL WHERE id = 'a2'", /passenger_voided: dòng đã huỷ — không sửa, không bỏ huỷ/);
  fails(db, "UPDATE ord_passenger SET updated_at = ? WHERE id = 'a1'", /passenger_voided/, "2026-09-30T00:00:00.000Z");
});

test("(g) view v_ord_passenger_key: has_current_row qua thêm / sửa / huỷ dòng cuối (dòng trước thành hiện hành) / huỷ hết chuỗi", () => {
  const db = world();
  order(db, "o1");
  pax(db, { id: "a1" });
  pax(db, { id: "b1" });
  setStatus(db, "o1", "confirmed");
  assert.deepEqual(keyView(db), [{ person_key: "a1", order_id: "o1", has_current_row: 1 }, { person_key: "b1", order_id: "o1", has_current_row: 1 }]);
  pax(db, { id: "a2", prev: "a1", key: "a1" });
  assert.equal(keyView(db)[0]!.has_current_row, 1, "sửa: dòng mới là hiện hành");
  voidRow(db, "a2");
  assert.equal(keyView(db)[0]!.has_current_row, 1, "huỷ riêng dòng cuối: dòng trước thành hiện hành lại");
  voidRow(db, "a1");
  assert.equal(keyView(db)[0]!.has_current_row, 0, "huỷ hết chuỗi: không còn dòng hiện hành");
  assert.equal(keyView(db)[1]!.has_current_row, 1);
});

test("(h) view v_ord_order_flag và v_ord_leg_key: chỉ khoá + cờ, cột đúng thứ tự", () => {
  const db = world();
  order(db, "o1");
  order(db, "o2");
  db.prepare(`INSERT INTO ord_transfer_leg (id, order_id, order_service_id, direction, pickup_date, pickup_place, created_at, updated_at) VALUES ('l1', 'o1', 'svc-o1', 'OUT', '2026-10-10', 'A', '${AT}', '${AT}')`).run();
  db.prepare(`INSERT INTO ord_transfer_leg (id, order_id, order_service_id, direction, pickup_date, pickup_place, created_at, updated_at) VALUES ('l2', 'o1', 'svc-o1', 'RETURN', '2026-10-11', 'B', '${AT}', '${AT}')`).run();
  db.prepare("UPDATE ord_transfer_leg SET closed_at = ?, close_reason_code = 'WRONG_ENTRY' WHERE id = 'l2'").run(AT);
  setStatus(db, "o1", "confirmed");
  setStatus(db, "o2", "cancelled");
  assert.deepEqual(rows(db, "SELECT * FROM v_ord_order_flag ORDER BY id"), [
    { id: "o1", is_confirmed: 1, is_cancelled: 0 },
    { id: "o2", is_confirmed: 0, is_cancelled: 1 },
  ]);
  assert.deepEqual(rows(db, "SELECT * FROM v_ord_leg_key ORDER BY id"), [
    { id: "l1", order_id: "o1", order_service_id: "svc-o1", is_open: 1 },
    { id: "l2", order_id: "o1", order_service_id: "svc-o1", is_open: 0 },
  ]);
  assert.deepEqual(Object.keys(rows(db, "SELECT * FROM v_ord_passenger_key")[0] ?? { person_key: 0, order_id: 0, has_current_row: 0 }), ["person_key", "order_id", "has_current_row"]);
});
