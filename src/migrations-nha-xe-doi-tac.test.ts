// Kiểm migration *_nha_xe_doi_tac.sql (ADR-0048 D1, accepted 2026-09-28): vai hồ sơ "Nhà xe đối tác" (CARRIER, nhóm OTHER — không sinh quyền, Q5 = (a)),
// loại quan hệ "Tài xế của" (DRIVES_FOR, người → nhà xe), ba view công bố CHỈ KHOÁ của parties (v_pty_owner_company, v_pty_carrier, v_pty_carrier_driver
// — luật "tài xế T thuộc nhà xe X" công bố MỘT lần), hai trigger giữ đầu quan hệ (B1.2). Dựng schema THẬT từ migrations/*.sql bằng node:sqlite, chèn thẳng
// SQL (không qua mã ứng dụng). Tệp tìm theo ĐUÔI tên (số có thể phải đổi khi nhiều nhánh cùng xếp hàng — CHANGE-GUIDE d).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const MATCHES = files.filter((f) => f.endsWith("_nha_xe_doi_tac.sql"));
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
type Row = Record<string, unknown>;
const rows = (db: DatabaseSync, sql: string, ...a: string[]): Row[] => (db.prepare(sql).all(...a) as Row[]).map((r) => ({ ...r }));
const triggers = (db: DatabaseSync): string[] => (db.prepare("SELECT name FROM sqlite_master WHERE type = 'trigger' ORDER BY name").all() as { name: string }[]).map((r) => r.name);

const AT = "2026-09-29T03:00:00.000Z";
let n = 0;
function party(db: DatabaseSync, kind: "PERSON" | "ORGANIZATION", name: string): string {
  const id = `p-${++n}`;
  db.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)").run(id, kind, name, AT, AT);
  if (kind === "PERSON") db.prepare("INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES (?, ?, ?, ?)").run(id, name, AT, AT);
  else db.prepare("INSERT INTO pty_organization (party_id, created_at, updated_at) VALUES (?, ?, ?)").run(id, AT, AT);
  return id;
}
const openRole = (db: DatabaseSync, partyId: string, code: string, locationId: string | null = null) =>
  db.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, location_id, valid_from_date, created_at, updated_at) VALUES (?, ?, ?, ?, '2026-09-20', ?, ?)")
    .run(`r-${++n}`, partyId, code, locationId, AT, AT);
const closeRole = (db: DatabaseSync, partyId: string, code: string) =>
  db.prepare("UPDATE pty_party_role SET valid_to_date = '2026-09-28' WHERE party_id = ? AND role_type_code = ? AND valid_to_date IS NULL").run(partyId, code);
const relate = (db: DatabaseSync, from: string, to: string, code = "DRIVES_FOR") =>
  db.prepare("INSERT INTO pty_party_relationship (id, from_party_id, to_party_id, relationship_type_code, valid_from_date, created_at, updated_at) VALUES (?, ?, ?, ?, '2026-09-20', ?, ?)")
    .run(`q-${++n}`, from, to, code, AT, AT);
const unrelate = (db: DatabaseSync, from: string, to: string) =>
  db.prepare("UPDATE pty_party_relationship SET valid_to_date = '2026-09-28' WHERE from_party_id = ? AND to_party_id = ? AND valid_to_date IS NULL").run(from, to);
const carrierDriver = (db: DatabaseSync): string[] =>
  (db.prepare("SELECT carrier_party_id AS c, driver_party_id AS d FROM v_pty_carrier_driver ORDER BY c, d").all() as { c: string; d: string }[]).map((r) => `${r.c}>${r.d}`);

test("(a) đúng một tệp *_nha_xe_doi_tac.sql; trigger mới mang tiền tố pty_; văn bản (bỏ chú thích) không dãy ≥ 8 chữ số, không '@'", () => {
  assert.equal(MATCHES.length, 1, `phải có đúng một tệp *_nha_xe_doi_tac.sql, thấy: ${JSON.stringify(MATCHES)}`);
  assert.doesNotMatch(FILE, /staff_party_required/);
  const db = before();
  const truoc = triggers(db);
  db.exec(sqlOf(FILE));
  assert.deepEqual(triggers(db).filter((t) => !truoc.includes(t)), ["pty_relationship_drives_for_carrier", "pty_relationship_drives_for_person"]);
  const code = sqlOf(FILE).split("\n").map((l) => l.replace(/--.*$/, "")).join("\n");
  assert.doesNotMatch(code, /\d{8,}/);
  assert.doesNotMatch(code, /@/);
});

test("(b) danh mục: vai CARRIER 'Nhà xe đối tác' (nhóm OTHER, đang dùng, thứ tự 31); quan hệ DRIVES_FOR 'Tài xế của' (thứ tự 2)", () => {
  const db = all();
  assert.deepEqual(rows(db, "SELECT name, role_group, active, sort_order FROM pty_role_type WHERE code = 'CARRIER'"), [{ name: "Nhà xe đối tác", role_group: "OTHER", active: 1, sort_order: 31 }]);
  assert.deepEqual(rows(db, "SELECT name, sort_order, active FROM pty_relationship_type WHERE code = 'DRIVES_FOR'"), [{ name: "Tài xế của", sort_order: 2, active: 1 }]);
});

test("(c) v_pty_owner_company = đúng hồ sơ công ty chủ đang hiệu lực (gieo ở 0030); đổi công ty chủ → view theo hồ sơ mới", () => {
  const db = all();
  // Hồ sơ Tour Đảo gieo ở migration *_ho_so_cong_ty_chu — tra theo tên (không viết cứng id gieo: bài "không id cứng" của ADR-0024 điều 6).
  const gieo = rows(db, "SELECT id FROM pty_party WHERE party_kind = 'ORGANIZATION' AND display_name = 'Công ty TNHH Tour Đảo'");
  assert.equal(gieo.length, 1);
  assert.deepEqual(rows(db, "SELECT party_id FROM v_pty_owner_company"), [{ party_id: gieo[0]!.id }]);
  const moi = party(db, "ORGANIZATION", "Công ty mới");
  db.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, location_id, valid_from_date, created_at, updated_at) VALUES ('r-oc', ?, 'OWNER_COMPANY', NULL, date(?, '+7 hours'), ?, ?)")
    .run(moi, AT, AT, AT);
  assert.deepEqual(rows(db, "SELECT party_id FROM v_pty_owner_company"), [{ party_id: moi }]);
});

test("(d) v_pty_carrier: vai mở → có; đóng → mất; hai dòng vai ở hai nơi → MỘT dòng (DISTINCT)", () => {
  const db = all();
  const [l1, l2] = (db.prepare("SELECT id FROM loc_location ORDER BY id LIMIT 2").all() as { id: string }[]).map((r) => r.id);
  assert.ok(l1 && l2, "cần hai địa điểm gieo sẵn");
  const x = party(db, "ORGANIZATION", "Nhà xe X");
  openRole(db, x, "CARRIER");
  assert.deepEqual(rows(db, "SELECT party_id FROM v_pty_carrier"), [{ party_id: x }]);
  const y = party(db, "ORGANIZATION", "Nhà xe Y");
  openRole(db, y, "CARRIER", l1!);
  openRole(db, y, "CARRIER", l2!);
  assert.deepEqual(rows(db, "SELECT party_id FROM v_pty_carrier WHERE party_id = ?", y), [{ party_id: y }], "hai dòng vai ở hai nơi → một dòng");
  closeRole(db, x, "CARRIER");
  assert.deepEqual(rows(db, "SELECT party_id FROM v_pty_carrier ORDER BY party_id"), [{ party_id: y }]);
});

test("(e) v_pty_carrier_driver: T = X (nhà xe CÁ NHÂN tự lái); T có quan hệ mở tới X; nhà xe thôi → mất cả hai; quan hệ đóng → mất; nhà xe tổ chức không có dòng T = X", () => {
  const db = all();
  const caNhan = party(db, "PERSON", "Nhà xe cá nhân");
  openRole(db, caNhan, "CARRIER");
  const toChuc = party(db, "ORGANIZATION", "Nhà xe tổ chức");
  openRole(db, toChuc, "CARRIER");
  const t1 = party(db, "PERSON", "Tài xế Một");
  const t2 = party(db, "PERSON", "Tài xế Hai");
  relate(db, t1, toChuc);
  relate(db, t2, caNhan);
  assert.deepEqual(carrierDriver(db), [`${caNhan}>${caNhan}`, `${caNhan}>${t2}`, `${toChuc}>${t1}`].sort(), "không có dòng toChuc>toChuc");
  unrelate(db, t1, toChuc);
  assert.deepEqual(carrierDriver(db), [`${caNhan}>${caNhan}`, `${caNhan}>${t2}`].sort(), "quan hệ đóng → mất");
  closeRole(db, caNhan, "CARRIER");
  assert.deepEqual(carrierDriver(db), [], "nhà xe thôi hợp tác → không còn tài xế nào 'thuộc' (quan hệ t2 → caNhan vẫn mở nhưng không tính)");
  assert.equal(rows(db, "SELECT 1 FROM pty_party_relationship WHERE from_party_id = ? AND valid_to_date IS NULL", t2).length, 1, "quan hệ KHÔNG tự đóng");
});

test("(f) B1.2: 'Tài xế của' từ hồ sơ TỔ CHỨC → ABORT *_person; tới hồ sơ KHÔNG mở vai Nhà xe → ABORT *_carrier; người → nhà xe → được; CONTACT_OF không bị chạm", () => {
  const db = all();
  const nhaXe = party(db, "ORGANIZATION", "Nhà xe");
  openRole(db, nhaXe, "CARRIER");
  const toChucKhac = party(db, "ORGANIZATION", "Đại lý");
  const nguoi = party(db, "PERSON", "Tài xế");
  assert.throws(() => relate(db, toChucKhac, nhaXe), /party_relationship_drives_for_person/);
  assert.throws(() => relate(db, nguoi, toChucKhac), /party_relationship_drives_for_carrier/);
  const thoi = party(db, "ORGANIZATION", "Nhà xe đã thôi");
  openRole(db, thoi, "CARRIER");
  closeRole(db, thoi, "CARRIER");
  assert.throws(() => relate(db, nguoi, thoi), /party_relationship_drives_for_carrier/, "nhà xe đã thôi hợp tác không nhận tài xế mới");
  relate(db, nguoi, nhaXe);
  assert.deepEqual(carrierDriver(db), [`${nhaXe}>${nguoi}`]);
  // CONTACT_OF giữa hai tổ chức (và tới hồ sơ không phải nhà xe) vẫn được — trigger chỉ xét DRIVES_FOR.
  relate(db, toChucKhac, nhaXe, "CONTACT_OF");
  relate(db, nguoi, toChucKhac, "CONTACT_OF");
});

test("(g) sổ dữ liệu có ba view mới, module parties, cột đúng thứ tự SELECT", () => {
  const dict = JSON.parse(readFileSync(new URL("../docs/data-dictionary.json", import.meta.url), "utf8")) as { views: { name: string; module: string; columns: string[] }[] };
  const want: Record<string, string[]> = {
    v_pty_owner_company: ["party_id"],
    v_pty_carrier: ["party_id"],
    v_pty_carrier_driver: ["carrier_party_id", "driver_party_id"],
  };
  const db = all();
  for (const [name, columns] of Object.entries(want)) {
    assert.deepEqual(dict.views.find((v) => v.name === name), { name, module: "parties", columns }, name);
    assert.deepEqual((db.prepare(`PRAGMA table_info(${name})`).all() as { name: string }[]).map((c) => c.name), columns, `${name}: cột CSDL`);
  }
});
