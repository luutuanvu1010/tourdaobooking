// Kiểm migration *_tai_xe_doi_tac.sql (ADR-0048 D2, accepted 2026-09-28): quyền app "Tài xế đối tác" (DRIVER_PARTNER), vai tài khoản bên ngoài
// "Tài xế đối tác" (DRIVER_EXTERNAL), LC-1 TẠO LẠI (tài khoản có vai bên ngoài chỉ giữ quyền BÊN NGOÀI = EXTERNAL_PERMISSIONS) và LC-1b (tài khoản giữ
// DRIVER_PARTNER không giữ quyền nào khác — Q4 = (a)). Dựng schema THẬT từ migrations/*.sql bằng node:sqlite, chèn thẳng SQL (không qua mã ứng dụng):
// chứng minh chặn nằm ở CSDL — lớp cuối nếu mã ứng dụng có lỗ. Tệp tìm theo ĐUÔI tên (số có thể phải đổi khi nhiều nhánh cùng xếp hàng — CHANGE-GUIDE d).
// Tiêu chí 4 dòng cuối của kế hoạch: mỗi ca (d)–(g) dùng tài khoản MỚI, CHƯA có quyền nào đang mở — một dòng vi phạm cả LC-1 lẫn LC-1b thì thông báo nào
// hiện ra tuỳ thứ tự SQLite chạy trigger.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { EXTERNAL_PERMISSIONS, PERMISSION_CODES, PERMISSION_LABEL } from "./shared/permissions.ts";
import { ROLES } from "./shared/roles.ts";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const MATCHES = files.filter((f) => f.endsWith("_tai_xe_doi_tac.sql"));
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
const row = (db: DatabaseSync, sql: string, ...a: string[]): Row => ({ ...(db.prepare(sql).get(...a) as Row) });
const triggers = (db: DatabaseSync): string[] => (db.prepare("SELECT name FROM sqlite_master WHERE type = 'trigger' ORDER BY name").all() as { name: string }[]).map((r) => r.name);

const AT = "2026-09-29T03:00:00.000Z";
let n = 0;
/** Hồ sơ cá nhân + tài khoản trỏ vào nó; `role` (tuỳ chọn) = mã vai mở ngay. Tài khoản CHƯA có quyền nào. */
function account(db: DatabaseSync, role?: string): { party: string; staff: string } {
  const i = ++n;
  const party = `p-${i}`;
  const staff = `s-${i}`;
  db.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'PERSON', ?, 1, ?, ?)").run(party, `Người${i}`, AT, AT);
  db.prepare("INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES (?, ?, ?, ?)").run(party, `Người${i}`, AT, AT);
  db.prepare("INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at, party_id) VALUES (?, '', ?, 'x', 'sales', 1, ?, ?)").run(staff, `09${String(i).padStart(8, "0")}`, AT, party);
  if (role) {
    db.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, location_id, valid_from_date, created_at, updated_at) VALUES (?, ?, ?, NULL, '2026-09-20', ?, ?)")
      .run(`r-${++n}`, party, role, AT, AT);
  }
  return { party, staff };
}
// Cùng DẠNG câu với insert_permission của src/modules/staff/repository.ts (INSERT OR IGNORE … SELECT … WHERE): RAISE(ABORT) của trigger phải chặn dù có OR IGNORE.
const grant = (db: DatabaseSync, staff: string, code: string) =>
  db.prepare(`INSERT OR IGNORE INTO stf_permission (id, staff_id, permission_type_code, valid_from_at, created_at, created_by, updated_at, updated_by)
              SELECT ?, ?, ?, ?, ?, NULL, ?, NULL WHERE 1`).run(`g-${++n}`, staff, code, AT, AT, AT);
// Cùng DẠNG câu đóng của close_permission (src/modules/staff/repository.ts): chỉ đặt valid_to_at của dòng đang mở.
const revoke = (db: DatabaseSync, staff: string, code: string) =>
  db.prepare("UPDATE stf_permission SET valid_to_at = ?, updated_at = ? WHERE staff_id = ? AND permission_type_code = ? AND valid_to_at IS NULL").run(AT, AT, staff, code);
const openCodes = (db: DatabaseSync, staff: string): string[] =>
  (db.prepare("SELECT permission_type_code AS c FROM stf_permission WHERE staff_id = ? AND valid_to_at IS NULL ORDER BY c").all(staff) as { c: string }[]).map((r) => r.c);

test("(a) đúng một tệp *_tai_xe_doi_tac.sql; không phải migration siết B5; trigger mới không mang tên staff_%/stf_%", () => {
  assert.equal(MATCHES.length, 1, `phải có đúng một tệp *_tai_xe_doi_tac.sql, thấy: ${JSON.stringify(MATCHES)}`);
  assert.doesNotMatch(FILE, /staff_party_required/, "src/migrations-n1.test.ts nhận migration siết B5 theo tên tệp");
  const db = before();
  const truoc = triggers(db);
  db.exec(sqlOf(FILE));
  const moi = triggers(db).filter((t) => !truoc.includes(t));
  assert.deepEqual(moi, ["lc1b_stf_permission_driver_partner_alone"], "chỉ thêm trigger LC-1b (LC-1 là tạo lại cùng tên)");
  for (const t of triggers(db)) assert.doesNotMatch(t, /^(staff_|stf_)/, `trigger ${t}: tên staff_%/stf_% dành cho migration siết B5`);
});

test("(b) quyền app DRIVER_PARTNER: nhãn = PERMISSION_LABEL.DRIVER_PARTNER ('Tài xế đối tác'), đang dùng, đứng thứ chín", () => {
  const r = row(all(), "SELECT name, active, sort_order FROM stf_permission_type WHERE code = 'DRIVER_PARTNER'");
  assert.deepEqual(r, { name: PERMISSION_LABEL.DRIVER_PARTNER, active: 1, sort_order: 9 });
  assert.equal(PERMISSION_LABEL.DRIVER_PARTNER, "Tài xế đối tác");
});

test("(c) vai tài khoản DRIVER_EXTERNAL: 'Tài xế đối tác' (= ROLES.DRIVER_EXTERNAL.name), nhóm Bên ngoài, đang dùng, thứ tự 25", () => {
  const r = row(all(), "SELECT name, role_group, active, sort_order FROM pty_role_type WHERE code = 'DRIVER_EXTERNAL'");
  assert.deepEqual(r, { name: ROLES.DRIVER_EXTERNAL.name, role_group: "EXTERNAL", active: 1, sort_order: 25 });
  assert.equal(ROLES.DRIVER_EXTERNAL.name, "Tài xế đối tác");
});

test("4(a) LC-1b: tài khoản đang giữ PARTNER (vai Tài xế taxi) chèn DRIVER_PARTNER → ABORT lc1b (kể cả INSERT OR IGNORE)", () => {
  const db = all();
  const a = account(db, "TAXI_DRIVER");
  grant(db, a.staff, "PARTNER");
  assert.throws(() => grant(db, a.staff, "DRIVER_PARTNER"), /lc1b_driver_partner_alone/);
  assert.deepEqual(openCodes(db, a.staff), ["PARTNER"]);
});

test("4(b) LC-1b chiều ngược: tài khoản đang giữ DRIVER_PARTNER (vai Tài xế đối tác) chèn PARTNER → ABORT lc1b", () => {
  const db = all();
  const a = account(db, "DRIVER_EXTERNAL");
  grant(db, a.staff, "DRIVER_PARTNER");
  assert.throws(() => grant(db, a.staff, "PARTNER"), /lc1b_driver_partner_alone/);
  assert.deepEqual(openCodes(db, a.staff), ["DRIVER_PARTNER"]);
});

test("4(c) LC-1b: DRIVER_PARTNER + SALES → ABORT lc1b cả hai chiều (tài khoản không vai bên ngoài — LC-1 không chạm)", () => {
  const db = all();
  const a = account(db, "SALES_STAFF");
  grant(db, a.staff, "SALES");
  assert.throws(() => grant(db, a.staff, "DRIVER_PARTNER"), /lc1b_driver_partner_alone/, "SALES có trước, chèn DRIVER_PARTNER");
  const b = account(db); // chưa gán vai mô hình mới (đường cũ POST /api/staff không vai)
  grant(db, b.staff, "DRIVER_PARTNER");
  assert.throws(() => grant(db, b.staff, "SALES"), /lc1b_driver_partner_alone/, "DRIVER_PARTNER có trước, chèn SALES");
  assert.deepEqual(openCodes(db, a.staff), ["SALES"]);
  assert.deepEqual(openCodes(db, b.staff), ["DRIVER_PARTNER"]);
});

test("4(d) LC-1 mới: tài khoản vai bên ngoài CHƯA có quyền nào chèn DRIVER_PARTNER → được", () => {
  const db = all();
  const a = account(db, "DRIVER_EXTERNAL");
  grant(db, a.staff, "DRIVER_PARTNER");
  assert.deepEqual(openCodes(db, a.staff), ["DRIVER_PARTNER"]);
  const b = account(db, "TAXI_DRIVER"); // vai bên ngoài khác — LC-1 chỉ xét QUYỀN (vai sinh quyền nào là việc của mã, roles.ts)
  grant(db, b.staff, "DRIVER_PARTNER");
  assert.deepEqual(openCodes(db, b.staff), ["DRIVER_PARTNER"]);
});

test("4(e) LC-1 mới: tài khoản vai bên ngoài CHƯA có quyền nào chèn SALES → ABORT lc1", () => {
  const db = all();
  const a = account(db, "DRIVER_EXTERNAL");
  assert.throws(() => grant(db, a.staff, "SALES"), /lc1_external_account_permission/);
  assert.deepEqual(openCodes(db, a.staff), []);
});

test("4(f) LC-1 mới: tài khoản vai bên ngoài CHƯA có quyền nào chèn DRIVER (tài xế CÔNG TY) → ABORT lc1", () => {
  const db = all();
  const a = account(db, "DRIVER_EXTERNAL");
  assert.throws(() => grant(db, a.staff, "DRIVER"), /lc1_external_account_permission/);
  assert.deepEqual(openCodes(db, a.staff), []);
});

test("4(g) một nguồn: với MỖI mã của PERMISSION_CODES, tài khoản vai bên ngoài mới chèn được ⇔ mã ∈ EXTERNAL_PERMISSIONS (hằng của mã = tập của trigger)", () => {
  const db = all();
  for (const code of PERMISSION_CODES) {
    const a = account(db, "COLLABORATOR");
    const allowed = (EXTERNAL_PERMISSIONS as readonly string[]).includes(code);
    if (allowed) {
      grant(db, a.staff, code);
      assert.deepEqual(openCodes(db, a.staff), [code], `${code} thuộc EXTERNAL_PERMISSIONS nhưng CSDL chặn`);
    } else {
      assert.throws(() => grant(db, a.staff, code), /lc1_external_account_permission/, `${code} ngoài EXTERNAL_PERMISSIONS nhưng CSDL cho qua`);
    }
  }
  // Tài khoản KHÔNG có vai bên ngoài: LC-1 không chạm (LC-1b vẫn canh DRIVER_PARTNER — ca 4(c)).
  const internal = account(db, "SALES_STAFF");
  grant(db, internal.staff, "SALES");
  assert.deepEqual(openCodes(db, internal.staff), ["SALES"]);
});

test("(e) 5b lớp CSDL: đổi Đối tác → Tài xế đối tác — ĐÓNG PARTNER trước rồi chèn DRIVER_PARTNER → được; chèn TRƯỚC khi đóng → ABORT (chỉ đếm dòng đang mở)", () => {
  const db = all();
  const a = account(db, "TAXI_DRIVER");
  grant(db, a.staff, "PARTNER");
  revoke(db, a.staff, "PARTNER");
  grant(db, a.staff, "DRIVER_PARTNER");
  assert.deepEqual(openCodes(db, a.staff), ["DRIVER_PARTNER"]);
  // chiều ngược (Tài xế đối tác → Tài xế taxi) cùng thứ tự đóng → mở
  revoke(db, a.staff, "DRIVER_PARTNER");
  grant(db, a.staff, "PARTNER");
  assert.deepEqual(openCodes(db, a.staff), ["PARTNER"]);
  const b = account(db, "TAXI_DRIVER");
  grant(db, b.staff, "PARTNER");
  assert.throws(() => grant(db, b.staff, "DRIVER_PARTNER"), /lc1b_driver_partner_alone/, "chèn trước, đóng sau → ABORT");
});

test("(f) chỉ còn MỘT trigger lc1_stf_permission_external_partner_only (tạo lại cùng tên — I3), thân có DRIVER_PARTNER, thông báo giữ tiền tố cũ", () => {
  const db = all();
  const rows = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'trigger' AND name = 'lc1_stf_permission_external_partner_only'").all() as { sql: string }[];
  assert.equal(rows.length, 1);
  assert.match(rows[0]!.sql, /DRIVER_PARTNER/);
  assert.match(rows[0]!.sql, /lc1_external_account_permission/);
});

test("(g) văn bản migration (bỏ chú thích --) không có dãy ≥ 8 chữ số (SĐT/số giấy tờ), không có '@'", () => {
  const code = sqlOf(FILE).split("\n").map((l) => l.replace(/--.*$/, "")).join("\n");
  assert.doesNotMatch(code, /\d{8,}/);
  assert.doesNotMatch(code, /@/);
});
