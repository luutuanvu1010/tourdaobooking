// Kiểm migration *_loai_doi_tac_la_du_lieu.sql (ADR-0117 lần 1: loại đối tác là dữ liệu; nhân viên nội bộ không mang loại được hưởng hoa hồng).
// Chèn THẲNG bằng SQL — mỗi trigger / CHECK có một ca đỏ và một ca xanh. Áp toàn bộ migration lên SQLite bộ nhớ (khuôn src/migrations-so-dai-ly.test.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const FILE = files.find((f) => f.endsWith("_loai_doi_tac_la_du_lieu.sql"));
const AT = "2026-10-14T03:00:00.000Z";
type V = string | number | null;
const run = (db: DatabaseSync, sql: string, ...a: V[]) => db.prepare(sql).run(...a);
const one = <T>(db: DatabaseSync, sql: string, ...a: V[]) => db.prepare(sql).get(...a) as T;
const all = <T>(db: DatabaseSync, sql: string, ...a: V[]) => db.prepare(sql).all(...a) as T[];

let n = 0;
const id = (p: string) => `${p}${++n}`;
function moi(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = OFF");
  for (const f of files) db.exec(readFileSync(new URL(f, DIR), "utf8"));
  db.exec("PRAGMA foreign_keys = ON");
  return db;
}
/** Loại đối tác (nhãn): nhóm OTHER, cờ bật — do người dùng thêm sau này, nên bài tự dựng. */
function loaiNhan(db: DatabaseSync, code: string, group = "OTHER"): void {
  run(db, "INSERT INTO pty_role_type (code, name, sort_order, role_group, is_partner_label) VALUES (?, ?, 40, ?, 1)", code, `Loại ${code}`, group);
}
function party(db: DatabaseSync, ten: string): string {
  const p = id("p");
  run(db, "INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'PERSON', ?, 1, ?, ?)", p, ten, AT, AT);
  return p;
}
function vai(db: DatabaseSync, p: string, code: string): string {
  const r = id("r");
  run(db, "INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES (?, ?, ?, '2026-01-01', ?, ?)", r, p, code, AT, AT);
  return r;
}
function dong(db: DatabaseSync, r: string): void {
  run(db, "UPDATE pty_party_role SET valid_to_date = '2026-06-01', updated_at = ? WHERE id = ?", AT, r);
}
function nhanVien(db: DatabaseSync, p: string): string {
  const s = id("s");
  run(db, "INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at, party_id) VALUES (?, '', ?, 'x', 'sales', 1, ?, ?)", s, `09${String(n).padStart(8, "0")}`, AT, p);
  return s;
}
function quyen(db: DatabaseSync, staff: string, code: string): void {
  run(db, `INSERT INTO stf_permission (id, staff_id, permission_type_code, valid_from_at, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, ?, ?, ?, 'kt', ?, 'kt')`, id("q"), staff, code, AT, AT, AT);
}
function loi(f: () => unknown): string {
  try {
    f();
  } catch (e) {
    return String((e as Error).message);
  }
  return "";
}
const CHAN = (m: string, ma: string) => assert.ok(m.includes(ma), `đáng lẽ bị chặn với «${ma}», nhận: «${m}»`);
const DUOC = (m: string) => assert.equal(m, "", `đáng lẽ được, nhận lỗi: «${m}»`);

test("có đúng một tệp migration loại đối tác; cột is_partner_label mặc định 0, CHECK 0/1; năm vai EXTERNAL gieo sẵn còn nguyên", () => {
  assert.ok(FILE, "thiếu migrations/*_loai_doi_tac_la_du_lieu.sql");
  assert.equal(files.filter((f) => f.endsWith("_loai_doi_tac_la_du_lieu.sql")).length, 1);
  const db = moi();
  const cot = all<{ name: string; notnull: number; dflt_value: string }>(db, "PRAGMA table_info(pty_role_type)").find((c) => c.name === "is_partner_label");
  assert.ok(cot, "thiếu cột is_partner_label");
  assert.equal(cot.notnull, 1);
  assert.equal(String(cot.dflt_value), "0");
  assert.equal(one<{ c: number }>(db, "SELECT count(*) AS c FROM pty_role_type WHERE is_partner_label <> 0").c, 0, "mọi loại có sẵn mặc định không phải nhãn");
  assert.match(loi(() => run(db, "UPDATE pty_role_type SET is_partner_label = 2 WHERE code = 'CUSTOMER'")), /CHECK/);
  const vaiHuong = all<{ role_type_code: string }>(db, "SELECT role_type_code FROM prc_beneficiary_role ORDER BY 1").map((r) => r.role_type_code);
  assert.deepEqual(vaiHuong, ["COLLABORATOR", "GUIDE_FREELANCE", "HOTEL_RECEPTION", "TAXI_DRIVER", "TRAVEL_AGENCY"]);
});

test("hai view công bố: v_pty_role_type chỉ bốn cột; v_pty_party_partner_label chỉ hồ sơ đang mở vai nhãn", () => {
  const db = moi();
  loaiNhan(db, "NHAN_A");
  const cot = (v: string) => all<{ name: string }>(db, `PRAGMA table_info(${v})`).map((c) => c.name);
  assert.deepEqual(cot("v_pty_role_type"), ["code", "role_group", "is_partner_label", "active"]);
  assert.deepEqual(cot("v_pty_party_partner_label"), ["party_id"]);
  const a = party(db, "Có nhãn");
  const b = party(db, "Hai vai nhãn");
  const c = party(db, "Nhãn đã đóng");
  const d = party(db, "Không nhãn");
  vai(db, a, "NHAN_A");
  loaiNhan(db, "NHAN_B");
  vai(db, b, "NHAN_A");
  vai(db, b, "NHAN_B");
  dong(db, vai(db, c, "NHAN_A"));
  vai(db, d, "HOTEL_RECEPTION");
  const ids = all<{ party_id: string }>(db, "SELECT party_id FROM v_pty_party_partner_label ORDER BY 1").map((r) => r.party_id);
  assert.deepEqual(ids, [a, b].sort(), "mỗi hồ sơ một dòng (DISTINCT); vai đã đóng và hồ sơ không nhãn không có mặt");
});

test("(c) pty_party_role: hồ sơ nội bộ không mang loại nhãn — vai SALES_STAFF / STAFF / SALES cũ chặn, GUIDE cũ và HOTEL_RECEPTION không tính", () => {
  const db = moi();
  loaiNhan(db, "NHAN_A");
  for (const noiBo of ["SALES_STAFF", "STAFF", "SALES"]) {
    const p = party(db, noiBo);
    vai(db, p, noiBo);
    CHAN(loi(() => vai(db, p, "NHAN_A")), "partner_label_conflict");
  }
  const guide = party(db, "HDV cũ");
  vai(db, guide, "GUIDE");
  DUOC(loi(() => vai(db, guide, "NHAN_A")));
  const le = party(db, "Lễ tân");
  vai(db, le, "HOTEL_RECEPTION");
  DUOC(loi(() => vai(db, le, "NHAN_A")));
  const trong = party(db, "Chưa có vai");
  DUOC(loi(() => vai(db, trong, "NHAN_A")));
});

test("(c) chiều ngược: hồ sơ đã mang nhãn thì chèn SALES_STAFF / STAFF / SALES bị chặn; vai GUIDE cũ và EXTERNAL được; nhãn đã đóng thì chèn nội bộ được", () => {
  const db = moi();
  loaiNhan(db, "NHAN_A");
  for (const noiBo of ["SALES_STAFF", "STAFF", "SALES"]) {
    const p = party(db, noiBo);
    vai(db, p, "NHAN_A");
    CHAN(loi(() => vai(db, p, noiBo)), "partner_label_conflict");
  }
  const p = party(db, "Nhãn + HDV cũ + lễ tân");
  vai(db, p, "NHAN_A");
  DUOC(loi(() => vai(db, p, "GUIDE")));
  DUOC(loi(() => vai(db, p, "HOTEL_RECEPTION")));
  const q = party(db, "Nhãn đã đóng");
  dong(db, vai(db, q, "NHAN_A"));
  DUOC(loi(() => vai(db, q, "SALES_STAFF")));
});

test("(c) UPDATE … valid_to_date = NULL mở lại vai vi phạm bị chặn (trigger _upd); đóng vai thì không", () => {
  const db = moi();
  loaiNhan(db, "NHAN_A");
  const p = party(db, "Đổi nghề");
  const nhan = vai(db, p, "NHAN_A");
  dong(db, nhan);
  vai(db, p, "SALES_STAFF"); // hợp lệ: nhãn đã đóng
  CHAN(loi(() => run(db, "UPDATE pty_party_role SET valid_to_date = NULL, updated_at = ? WHERE id = ?", AT, nhan)), "partner_label_conflict");
  // chiều ngược: mở lại vai nội bộ khi đang giữ nhãn
  const q = party(db, "Đổi nghề ngược");
  const noiBo = vai(db, q, "SALES_STAFF");
  dong(db, noiBo);
  vai(db, q, "NHAN_A");
  CHAN(loi(() => run(db, "UPDATE pty_party_role SET valid_to_date = NULL, updated_at = ? WHERE id = ?", AT, noiBo)), "partner_label_conflict");
  // xanh: đóng vai, và sửa dòng đang mở không đổi gì về ngày kết thúc
  const x = party(db, "Chỉ nhãn");
  const r = vai(db, x, "NHAN_A");
  DUOC(loi(() => run(db, "UPDATE pty_party_role SET updated_at = ? WHERE id = ?", AT, r)));
  DUOC(loi(() => dong(db, r)));
});

test("(d) prc_beneficiary_role: SALES_STAFF (INTERNAL) bị chặn; vai OTHER không cờ (CUSTOMER) bị chặn; loại nhãn và vai EXTERNAL được", () => {
  const db = moi();
  loaiNhan(db, "NHAN_A");
  const them = (code: string) => run(db, "INSERT INTO prc_beneficiary_role (role_type_code, active, created_at, created_by, updated_at, updated_by) VALUES (?, 1, ?, 'kt', ?, 'kt')", code, AT, AT);
  CHAN(loi(() => them("SALES_STAFF")), "prc_beneficiary_kind");
  CHAN(loi(() => them("CUSTOMER")), "prc_beneficiary_kind");
  CHAN(loi(() => them("SUPPLIER")), "prc_beneficiary_kind");
  DUOC(loi(() => them("NHAN_A")));
  DUOC(loi(() => them("DRIVER_EXTERNAL")));
  assert.equal(one<{ c: number }>(db, "SELECT count(*) AS c FROM prc_beneficiary_role").c, 7, "năm dòng gieo sẵn + hai dòng vừa thêm");
});

test("(f) pty_role_type: loại đã có hồ sơ dùng thì không đổi cờ hay nhóm; loại chưa ai dùng đổi được; cờ bật chỉ cho nhóm OTHER", () => {
  const db = moi();
  loaiNhan(db, "NHAN_A");
  loaiNhan(db, "NHAN_B");
  vai(db, party(db, "Dùng A"), "NHAN_A");
  CHAN(loi(() => run(db, "UPDATE pty_role_type SET is_partner_label = 0 WHERE code = 'NHAN_A'")), "partner_label_immutable");
  CHAN(loi(() => run(db, "UPDATE pty_role_type SET role_group = 'EXTERNAL' WHERE code = 'NHAN_A'")), "partner_label_immutable");
  // loại chưa ai dùng: tắt cờ và bật lại được
  DUOC(loi(() => run(db, "UPDATE pty_role_type SET is_partner_label = 0 WHERE code = 'NHAN_B'")));
  DUOC(loi(() => run(db, "UPDATE pty_role_type SET is_partner_label = 1 WHERE code = 'NHAN_B'")));
  // loại có sẵn đã có hồ sơ dùng thì đổi nhóm cũng bị chặn
  vai(db, party(db, "Lễ tân"), "HOTEL_RECEPTION");
  CHAN(loi(() => run(db, "UPDATE pty_role_type SET role_group = 'OTHER' WHERE code = 'HOTEL_RECEPTION'")), "partner_label_immutable");
  // cờ bật cho nhóm khác OTHER: chặn cả lúc chèn lẫn lúc sửa, kể cả loại chưa ai dùng
  CHAN(loi(() => loaiNhan(db, "NHAN_C", "EXTERNAL")), "partner_label_group");
  CHAN(loi(() => loaiNhan(db, "NHAN_D", "INTERNAL")), "partner_label_group");
  run(db, "INSERT INTO pty_role_type (code, name, sort_order, role_group) VALUES ('CHUA_DUNG', 'Chưa dùng', 41, 'EXTERNAL')");
  CHAN(loi(() => run(db, "UPDATE pty_role_type SET is_partner_label = 1 WHERE code = 'CHUA_DUNG'")), "partner_label_immutable");
  // các cột khác (tên, active, thứ tự) vẫn sửa được kể cả khi loại đã có hồ sơ dùng
  DUOC(loi(() => run(db, "UPDATE pty_role_type SET name = 'Tên mới', active = 0 WHERE code = 'NHAN_A'")));
});

test("stf_permission: tài khoản mà hồ sơ mang nhãn chỉ nhận PARTNER / DRIVER_PARTNER; quyền nội bộ bị chặn; hồ sơ không nhãn và nhãn đã đóng không bị ảnh hưởng", () => {
  const db = moi();
  loaiNhan(db, "NHAN_A");
  const p = party(db, "Có nhãn");
  vai(db, p, "NHAN_A");
  const s = nhanVien(db, p);
  CHAN(loi(() => quyen(db, s, "SALES")), "partner_label_conflict");
  CHAN(loi(() => quyen(db, s, "ACCOUNTING")), "partner_label_conflict");
  DUOC(loi(() => quyen(db, s, "PARTNER")));
  // tài khoản riêng (chưa có PARTNER) nhận DRIVER_PARTNER được
  const p2 = party(db, "Nhãn + tài xế đối tác");
  vai(db, p2, "NHAN_A");
  const s2 = nhanVien(db, p2);
  DUOC(loi(() => quyen(db, s2, "DRIVER_PARTNER")));
  // cùng tài khoản đã giữ PARTNER: luật cũ LC-1b chặn DRIVER_PARTNER — không phải lỗi của trigger mới
  const loiLc1b = loi(() => quyen(db, s, "DRIVER_PARTNER"));
  assert.ok(loiLc1b.includes("lc1b_driver_partner_alone") && !loiLc1b.includes("partner_label_conflict"), `phải do LC-1b: «${loiLc1b}»`);
  // hồ sơ không nhãn
  const p3 = party(db, "Không nhãn");
  vai(db, p3, "HOTEL_RECEPTION");
  DUOC(loi(() => quyen(db, nhanVien(db, p3), "PARTNER")));
  const p4 = party(db, "Nhân viên thường");
  DUOC(loi(() => quyen(db, nhanVien(db, p4), "SALES")));
  // nhãn đã đóng: không còn tính
  const p5 = party(db, "Nhãn đã đóng");
  dong(db, vai(db, p5, "NHAN_A"));
  DUOC(loi(() => quyen(db, nhanVien(db, p5), "SALES")));
});
