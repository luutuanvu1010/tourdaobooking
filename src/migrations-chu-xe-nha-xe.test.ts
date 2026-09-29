// Kiểm migration *_chu_xe_nha_xe.sql (ADR-0048 D1, B1.1, accepted 2026-09-28): chủ xe ∈ {công ty chủ đang hiệu lực, hồ sơ đang mở vai Nhà xe đối tác} lúc
// THÊM xe và lúc ĐỔI chủ xe — hai trigger của van-chuyen chỉ đọc VIEW công bố của parties (v_pty_owner_company, v_pty_carrier). Xe cũ không bị chạm: đổi công
// ty chủ hay nhà xe thôi hợp tác KHÔNG làm xe cũ "sai" (chỉ canh lúc ghi) — ca "công ty chủ CŨ" bắt buộc vì "UPDATE OF" chạy cả khi câu SET nhắc cột mà
// không đổi giá trị (kế hoạch mục 4 điểm 4). Dựng schema THẬT từ migrations/*.sql bằng node:sqlite, chèn/sửa thẳng SQL. Tệp tìm theo ĐUÔI tên.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const MATCHES = files.filter((f) => f.endsWith("_chu_xe_nha_xe.sql"));
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
const triggers = (db: DatabaseSync): string[] => (db.prepare("SELECT name FROM sqlite_master WHERE type = 'trigger' ORDER BY name").all() as { name: string }[]).map((r) => r.name);

const AT = "2026-09-29T03:00:00.000Z";
let n = 0;
function toChuc(db: DatabaseSync, ten: string): string {
  const id = `o-${++n}`;
  db.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'ORGANIZATION', ?, 1, ?, ?)").run(id, ten, AT, AT);
  return id;
}
const moVai = (db: DatabaseSync, party: string, code: string) =>
  db.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, location_id, valid_from_date, created_at, updated_at) VALUES (?, ?, ?, NULL, '2026-09-20', ?, ?)")
    .run(`r-${++n}`, party, code, AT, AT);
const dongVai = (db: DatabaseSync, party: string, code: string) =>
  db.prepare("UPDATE pty_party_role SET valid_to_date = '2026-09-28' WHERE party_id = ? AND role_type_code = ? AND valid_to_date IS NULL").run(party, code);
const congTyChu = (db: DatabaseSync): string => (db.prepare("SELECT party_id FROM v_pty_owner_company").get() as { party_id: string }).party_id;
/** Đổi công ty chủ sang hồ sơ tổ chức MỚI (cơ chế sẵn có của 0030: một câu chèn dòng OWNER_COMPANY hôm nay — trigger đóng dòng cũ). */
function doiCongTyChu(db: DatabaseSync): string {
  const moi = toChuc(db, "Công ty chủ mới");
  db.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, location_id, valid_from_date, created_at, updated_at) VALUES (?, ?, 'OWNER_COMPANY', NULL, date(?, '+7 hours'), ?, ?)")
    .run(`r-${++n}`, moi, AT, AT, AT);
  return moi;
}
function xe(db: DatabaseSync, chu: string): string {
  const id = `xe-${++n}`;
  const bien = `79B${String(n).padStart(5, "0")}`;
  db.prepare(
    `INSERT INTO vc_vehicle (id, plate_number, plate_key, chassis_number, chassis_key, name, model_year, passenger_capacity, owner_party_id, status, valid_from_date,
       valid_to_date, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, 'Xe thử', 2020, 15, ?, 'active', '2026-09-01', NULL, ?, NULL, ?, NULL)`,
  ).run(id, bien, bien, `KHUNG${n}`, `KHUNG${n}`, chu, AT, AT);
  return id;
}
const doiChu = (db: DatabaseSync, id: string, chu: string) => db.prepare("UPDATE vc_vehicle SET owner_party_id = ?, updated_at = ? WHERE id = ?").run(chu, AT, id);
const chuCua = (db: DatabaseSync, id: string): string => (db.prepare("SELECT owner_party_id AS c FROM vc_vehicle WHERE id = ?").get(id) as { c: string }).c;

test("(a) đúng một tệp *_chu_xe_nha_xe.sql; hai trigger mới tên vc_; văn bản (bỏ chú thích) không dãy ≥ 8 chữ số, không '@'", () => {
  assert.equal(MATCHES.length, 1, `phải có đúng một tệp *_chu_xe_nha_xe.sql, thấy: ${JSON.stringify(MATCHES)}`);
  assert.doesNotMatch(FILE, /staff_party_required/);
  const db = before();
  const truoc = triggers(db);
  db.exec(sqlOf(FILE));
  assert.deepEqual(triggers(db).filter((t) => !truoc.includes(t)), ["vc_vehicle_owner_ins", "vc_vehicle_owner_upd"]);
  const code = sqlOf(FILE).split("\n").map((l) => l.replace(/--.*$/, "")).join("\n");
  assert.doesNotMatch(code, /\d{8,}/);
  assert.doesNotMatch(code, /@/);
});

test("(b) THÊM xe: chủ là công ty chủ → được; nhà xe đang mở vai → được; hồ sơ thường → vehicle_owner_not_allowed; hồ sơ không tồn tại → vehicle_owner_not_allowed (trigger đứng trước khoá ngoại)", () => {
  const db = all();
  xe(db, congTyChu(db));
  const nhaXe = toChuc(db, "Nhà xe");
  moVai(db, nhaXe, "CARRIER");
  xe(db, nhaXe);
  const thuong = toChuc(db, "Đại lý thường");
  assert.throws(() => xe(db, thuong), /vehicle_owner_not_allowed/);
  assert.throws(() => xe(db, "khong-co"), /vehicle_owner_not_allowed/);
  const thoi = toChuc(db, "Nhà xe đã thôi");
  moVai(db, thoi, "CARRIER");
  dongVai(db, thoi, "CARRIER");
  assert.throws(() => xe(db, thoi), /vehicle_owner_not_allowed/, "nhà xe đã thôi hợp tác không nhận xe mới");
});

test("(c) ĐỔI chủ xe: sang hồ sơ thường → chặn; sang nhà xe đang mở vai → được; về công ty chủ → được", () => {
  const db = all();
  const id = xe(db, congTyChu(db));
  const thuong = toChuc(db, "Đại lý thường");
  assert.throws(() => doiChu(db, id, thuong), /vehicle_owner_not_allowed/);
  const nhaXe = toChuc(db, "Nhà xe");
  moVai(db, nhaXe, "CARRIER");
  doiChu(db, id, nhaXe);
  assert.equal(chuCua(db, id), nhaXe);
  doiChu(db, id, congTyChu(db));
  assert.equal(chuCua(db, id), congTyChu(db));
});

test("(d) xe của công ty chủ CŨ (sau khi đổi công ty chủ): câu SET nhắc owner_party_id mà không đổi giá trị → được; sửa tên → được; đổi chủ sang hồ sơ thường vẫn chặn", () => {
  const db = all();
  const cu = congTyChu(db);
  const id = xe(db, cu);
  const moi = doiCongTyChu(db);
  assert.equal(congTyChu(db), moi, "điều kiện của ca: công ty chủ đã đổi");
  db.prepare("UPDATE vc_vehicle SET owner_party_id = owner_party_id, name = 'Xe đổi tên', updated_at = ? WHERE id = ?").run(AT, id);
  db.prepare("UPDATE vc_vehicle SET owner_party_id = ?, name = 'Xe đổi tên lần hai', updated_at = ? WHERE id = ?").run(cu, AT, id);
  db.prepare("UPDATE vc_vehicle SET name = 'Xe đổi tên lần ba', updated_at = ? WHERE id = ?").run(AT, id);
  assert.equal(chuCua(db, id), cu, "xe cũ giữ chủ cũ — không tự đổi");
  assert.throws(() => doiChu(db, id, toChuc(db, "Đại lý thường")), /vehicle_owner_not_allowed/);
});

test("(e) nhà xe thôi hợp tác (đóng vai) → xe cũ của họ vẫn sửa tên được (chỉ canh lúc ghi chủ)", () => {
  const db = all();
  const nhaXe = toChuc(db, "Nhà xe");
  moVai(db, nhaXe, "CARRIER");
  const id = xe(db, nhaXe);
  dongVai(db, nhaXe, "CARRIER");
  db.prepare("UPDATE vc_vehicle SET name = 'Xe cũ của nhà xe', updated_at = ? WHERE id = ?").run(AT, id);
  db.prepare("UPDATE vc_vehicle SET owner_party_id = owner_party_id, status = 'maintenance', updated_at = ? WHERE id = ?").run(AT, id);
  assert.equal(chuCua(db, id), nhaXe);
});
