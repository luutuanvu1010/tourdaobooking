// Kiểm migration *_lc1c_doi_tac_can_vai_tro.sql (ADR-0185 Đ2 (a) mục 3, chủ duyệt 2026-11-08): trigger lc1c — mở dòng quyền Đối tác (PARTNER) mà hồ sơ của
// tài khoản KHÔNG mở vai nhóm bên ngoài và KHÔNG mang vai trò do Kế toán thêm thì CSDL từ chối. Dựng schema THẬT từ migrations/*.sql bằng node:sqlite, chèn
// thẳng SQL (không qua mã ứng dụng): chặn nằm ở CSDL — lớp cuối cho SQL gõ tay. Tệp tìm theo ĐUÔI tên (số có thể đổi khi nhiều nhánh cùng xếp hàng —
// CHANGE-GUIDE d). Hàng rào H3 (docs/SO-HANG-RAO.md): đổi tạm tên tệp migration → ca «hồ sơ chỉ mang vai STAFF» ĐỎ.
// Mỗi ca dùng tài khoản MỚI chưa có quyền nào (một dòng vi phạm hai trigger thì câu nào hiện ra tuỳ thứ tự SQLite chạy trigger).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { ROLES } from "./shared/roles.ts";
import { seedStaff, VAI_DOI_TAC_MAC_DINH } from "../tests/audit/harness.mjs";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const MATCHES = files.filter((f) => f.endsWith("_lc1c_doi_tac_can_vai_tro.sql"));
const FILE = MATCHES[0];
const sqlOf = (f: string) => readFileSync(new URL(f, DIR), "utf8");
const open = (list: string[]) => {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of list) db.exec(sqlOf(f));
  return db;
};
const all = () => open(files);
/** MỘT bản dựng dùng chung cho các ca (mỗi ca tài khoản MỚI nên không ảnh hưởng nhau) — dựng ~150 migration mỗi ca làm bài chậm vô ích. */
let chung: DatabaseSync | null = null;
const db0 = (): DatabaseSync => (chung ??= all());
const TEN = "lc1c_stf_permission_partner_needs_role";
const LOI = /lc1c_partner_needs_role/;

const AT = "2026-11-08T03:00:00.000Z";
let n = 0;
/** Hồ sơ cá nhân + tài khoản trỏ vào nó (`coHoSo: false` ⇒ tài khoản chưa gắn hồ sơ); `vai` = các mã vai mở ngay. Tài khoản CHƯA có quyền nào. */
function taiKhoan(db: DatabaseSync, vai: string[] = [], coHoSo = true): { party: string; staff: string } {
  const i = ++n;
  const party = `p-${i}`;
  const staff = `s-${i}`;
  db.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'PERSON', ?, 1, ?, ?)").run(party, `Người${i}`, AT, AT);
  db.prepare("INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES (?, ?, ?, ?)").run(party, `Người${i}`, AT, AT);
  db.prepare("INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at, party_id) VALUES (?, '', ?, 'x', 'sales', 1, ?, ?)")
    .run(staff, `09${String(i).padStart(8, "0")}`, AT, coHoSo ? party : null);
  for (const v of vai) {
    db.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, location_id, valid_from_date, created_at, updated_at) VALUES (?, ?, ?, NULL, '2026-09-20', ?, ?)")
      .run(`r-${i}-${v}`, party, v, AT, AT);
  }
  return { party, staff };
}
const moQuyen = (db: DatabaseSync, staff: string, ma: string, dong: string | null = null) =>
  db.prepare("INSERT INTO stf_permission (id, staff_id, permission_type_code, valid_from_at, valid_to_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(`q-${staff}-${ma}`, staff, ma, AT, dong, AT, AT);
const quyenMo = (db: DatabaseSync, staff: string): string[] =>
  (db.prepare("SELECT permission_type_code AS ma FROM stf_permission WHERE staff_id = ? AND valid_to_at IS NULL ORDER BY ma").all(staff) as { ma: string }[]).map((r) => r.ma);
const vaiMo = (db: DatabaseSync, party: string): { ma: string; nhom: string }[] =>
  (db.prepare("SELECT r.role_type_code AS ma, t.role_group AS nhom FROM pty_party_role r JOIN pty_role_type t ON t.code = r.role_type_code WHERE r.party_id = ? AND r.valid_to_date IS NULL ORDER BY ma")
    .all(party) as { ma: string; nhom: string }[]).map((r) => ({ ...r }));

test("đúng MỘT tệp *_lc1c_doi_tac_can_vai_tro.sql; trigger có sau tệp đó, không có trước", () => {
  assert.equal(MATCHES.length, 1, `tệp khớp: ${MATCHES.join(", ")}`);
  const ten = (db: DatabaseSync) => (db.prepare("SELECT name FROM sqlite_master WHERE type = 'trigger' AND name = ?").all(TEN) as unknown[]).length;
  assert.equal(ten(open(files.filter((f) => f < FILE!))), 0);
  assert.equal(ten(db0()), 1);
});

test("mở PARTNER cho tài khoản mà hồ sơ chỉ mang vai STAFF (tài khoản kiểu cũ) → CSDL từ chối; không dòng quyền nào được ghi", () => {
  const db = db0();
  const a = taiKhoan(db, ["STAFF"]);
  assert.throws(() => moQuyen(db, a.staff, "PARTNER"), LOI);
  assert.deepEqual(quyenMo(db, a.staff), []);
});

test("tài khoản chưa gắn hồ sơ, hoặc hồ sơ không vai nào → từ chối", () => {
  const db = db0();
  assert.throws(() => moQuyen(db, taiKhoan(db, [], false).staff, "PARTNER"), LOI, "chưa gắn hồ sơ");
  assert.throws(() => moQuyen(db, taiKhoan(db, []).staff, "PARTNER"), LOI, "hồ sơ không vai");
});

test("hồ sơ mở MỌI vai nhóm bên ngoài (năm vai trò đối tác «Có sẵn» và Tài xế đối tác — ca lọt có ghi, K5) → được", () => {
  const ngoai = (Object.keys(ROLES) as (keyof typeof ROLES)[]).filter((c) => ROLES[c].group === "EXTERNAL");
  assert.ok(ngoai.includes("TRAVEL_AGENCY") && ngoai.includes("DRIVER_EXTERNAL"));
  const db = db0();
  for (const v of ngoai) {
    const a = taiKhoan(db, [v]);
    moQuyen(db, a.staff, "PARTNER");
    assert.deepEqual(quyenMo(db, a.staff), ["PARTNER"], v);
  }
});

test("hồ sơ mang vai trò do Kế toán thêm (nhóm OTHER, cờ nhãn đối tác) → được", () => {
  const db = db0();
  db.prepare("INSERT INTO pty_role_type (code, name, sort_order, role_group, is_partner_label) VALUES ('NHAN_LC1C', 'Loại thử LC-1c', 90, 'OTHER', 1)").run();
  const a = taiKhoan(db, ["NHAN_LC1C"]);
  moQuyen(db, a.staff, "PARTNER");
  assert.deepEqual(quyenMo(db, a.staff), ["PARTNER"]);
});

test("vai trò đối tác ĐÃ KẾT THÚC không tính → từ chối", () => {
  const db = db0();
  const a = taiKhoan(db, ["TRAVEL_AGENCY"]);
  db.prepare("UPDATE pty_party_role SET valid_to_date = '2026-10-01' WHERE party_id = ?").run(a.party);
  assert.throws(() => moQuyen(db, a.staff, "PARTNER"), LOI);
});

test("trigger chỉ canh dòng PARTNER ĐANG MỞ: dòng chèn sẵn đã đóng, và quyền nội bộ trên hồ sơ không vai → được", () => {
  const db = db0();
  const a = taiKhoan(db, ["STAFF"]);
  moQuyen(db, a.staff, "PARTNER", AT);
  moQuyen(db, a.staff, "SALES");
  assert.deepEqual(quyenMo(db, a.staff), ["SALES"]);
});

test("seedStaff (khung thử): Đối tác mặc định mang vai Công ty lữ hành; kiểu cũ và tài khoản lai giữ PARTNER mà không mở vai bên ngoài, có vai STAFF", () => {
  const db = db0();
  seedStaff(db, { id: "dt", phone: "0900000101", name: "Đối Tác", perms: ["PARTNER"] });
  assert.deepEqual(vaiMo(db, "pty-dt"), [{ ma: VAI_DOI_TAC_MAC_DINH, nhom: "EXTERNAL" }]);
  seedStaff(db, { id: "cu", phone: "0900000102", name: "Kiểu Cũ", perms: ["PARTNER"], kieuCu: true });
  seedStaff(db, { id: "lai", phone: "0900000103", name: "Lai", perms: ["SALES", "PARTNER"] });
  for (const id of ["cu", "lai"]) {
    assert.ok(quyenMo(db, id).includes("PARTNER"), id);
    assert.deepEqual(vaiMo(db, `pty-${id}`), [{ ma: "STAFF", nhom: "OTHER" }], id);
  }
  assert.deepEqual(quyenMo(db, "lai"), ["PARTNER", "SALES"]);
  assert.throws(() => seedStaff(db, { id: "x", phone: "0900000104", name: "X", perms: ["SALES", "PARTNER"], vai: "TRAVEL_AGENCY" }), /lai/);
});
