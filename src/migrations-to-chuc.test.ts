// Kiểm migration *_dang_ky_quan_ly_to_chuc.sql (ADR-0213 Đ2, Đ3.5–Đ3.6, Đ9 — mốc B1 đợt 2 đăng ký, Task 9): hai loại liên kết người → tổ chức «Người quản lý của»
// (MANAGER_OF) và «Thành viên của» (MEMBER_OF), đúng một người quản lý đang mở, bốn trigger giữ liên kết, view công bố v_pty_org_link, bảng yêu cầu chuyển quyền
// (pty_org_transfer_request), LC-1c tạo lại nhận vế liên kết, trigger anh em lc1d, hai cột tư cách của đơn (orders.acting_*), view v_ord_order_acting, cột
// audit_log.acting_party_id. Dựng schema THẬT từ migrations/*.sql bằng node:sqlite, chèn thẳng SQL (chặn nằm ở CSDL). Tệp tìm theo ĐUÔI tên.
// Lô «chuyển» (Đ2.4) chạy trong BEGIN … COMMIT, ROLLBACK khi một câu hỏng — đúng tính chất một lô D1 (một câu hỏng thì cả lô hỏng).
// Cuối tệp: route quan hệ chung của Danh bạ từ chối hai mã mới (Đ2.7) — chạy cả ứng dụng qua khung tests/audit/harness.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../tests/audit/harness.mjs";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const MATCHES = files.filter((f) => f.endsWith("_dang_ky_quan_ly_to_chuc.sql"));
const FILE = MATCHES[0];
const sqlOf = (f: string) => readFileSync(new URL(f, DIR), "utf8");
const open = (list: string[]) => {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of list) db.exec(sqlOf(f));
  return db;
};
/** MỘT bản dựng dùng chung (mỗi ca dùng hồ sơ MỚI nên không ảnh hưởng nhau). */
let chung: DatabaseSync | null = null;
const db0 = (): DatabaseSync => (chung ??= open(files));

const AT = "2026-11-16T03:00:00.000Z";
const D0 = "2026-11-01";
const D1 = "2026-11-16";
let n = 0;
const rows = (db: DatabaseSync, sql: string, ...p: (string | number | null)[]) => (db.prepare(sql).all(...p) as Record<string, unknown>[]).map((r) => ({ ...r }));

function hoSo(db: DatabaseSync, kind: "PERSON" | "ORGANIZATION", vai: string[] = []): string {
  const id = `p-tc-${++n}`;
  db.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)").run(id, kind, id, AT, AT);
  if (kind === "PERSON") db.prepare("INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES (?, ?, ?, ?)").run(id, id, AT, AT);
  vai.forEach((v, i) =>
    db.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, location_id, valid_from_date, created_at, updated_at) VALUES (?, ?, ?, NULL, '2026-09-20', ?, ?)")
      .run(`r-${id}-${i}`, id, v, AT, AT));
  return id;
}
const nguoi = (db: DatabaseSync, vai: string[] = []) => hoSo(db, "PERSON", vai);
/** Tổ chức đối tác được hưởng (vai nhóm bên ngoài Công ty lữ hành). */
const toChuc = (db: DatabaseSync, vai: string[] = ["TRAVEL_AGENCY"]) => hoSo(db, "ORGANIZATION", vai);
let nr = 0;
function lienKet(db: DatabaseSync, from: string, to: string, loai: "MANAGER_OF" | "MEMBER_OF", tu = D0, id = `rel-${++nr}`): string {
  db.prepare("INSERT INTO pty_party_relationship (id, from_party_id, to_party_id, relationship_type_code, valid_from_date, valid_to_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NULL, ?, ?)")
    .run(id, from, to, loai, tu, AT, AT);
  return id;
}
const dong = (db: DatabaseSync, id: string, ngay = D1, thay: string | null = null) =>
  db.prepare("UPDATE pty_party_relationship SET valid_to_date = ?, replaced_by_id = ?, updated_at = ? WHERE id = ?").run(ngay, thay, AT, id);
/** Liên kết đang mở của một tổ chức, đọc qua view công bố: [người, kind] đã xếp. */
const lienKetMo = (db: DatabaseSync, org: string) =>
  rows(db, "SELECT person_party_id AS nguoi, kind FROM v_pty_org_link WHERE org_party_id = ? ORDER BY kind, person_party_id", org).map((r) => [r.nguoi, r.kind]);
/** Một lô như D1: mọi câu hoặc không câu nào. */
function lo(db: DatabaseSync, cau: (() => unknown)[]) {
  db.exec("BEGIN");
  try {
    for (const c of cau) c();
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}
/** Lô «chuyển» Đ2.4: (1) đóng MANAGER_OF cũ kèm replaced_by_id = mã sinh sẵn → (2) đóng MEMBER_OF của người mới nếu có → (3) chèn MANAGER_OF mới đúng mã đó
 * → (4) chèn MEMBER_OF cho người cũ (mặc định). `hong` = chèn một câu hỏng giữa (3) và (4) để giả lỗi. */
function chuyen(db: DatabaseSync, org: string, cu: { id: string; nguoi: string }, moi: string, thanhVienMoi: string | null, hong = false): string {
  const maMoi = `rel-${++nr}`;
  lo(db, [
    () => dong(db, cu.id, D1, maMoi),
    ...(thanhVienMoi ? [() => dong(db, thanhVienMoi, D1)] : []),
    () => lienKet(db, moi, org, "MANAGER_OF", D1, maMoi),
    ...(hong ? [() => db.exec("INSERT INTO khong_co_bang VALUES (1)")] : []),
    () => lienKet(db, cu.nguoi, org, "MEMBER_OF", D1),
  ]);
  return maMoi;
}

test("đúng MỘT tệp *_dang_ky_quan_ly_to_chuc.sql; hai loại quan hệ có tên đã duyệt, đúng thứ tự; hai cột mới của pty_party_relationship", () => {
  assert.equal(MATCHES.length, 1, `tệp khớp: ${MATCHES.join(", ")}`);
  const db = db0();
  assert.deepEqual(rows(db, "SELECT code, name, sort_order, active FROM pty_relationship_type WHERE code IN ('MANAGER_OF', 'MEMBER_OF') ORDER BY sort_order"), [
    { code: "MANAGER_OF", name: "Người quản lý của", sort_order: 4, active: 1 },
    { code: "MEMBER_OF", name: "Thành viên của", sort_order: 5, active: 1 },
  ]);
  const cot = rows(db, "SELECT name FROM pragma_table_info('pty_party_relationship')").map((r) => r.name);
  assert.ok(cot.includes("replaced_by_id") && cot.includes("notice_state"));
  assert.equal(rows(open(files.filter((f) => f < FILE!)), "SELECT 1 FROM pty_relationship_type WHERE code = 'MANAGER_OF'").length, 0, "trước tệp chưa có");
  const org = toChuc(db);
  const a = nguoi(db);
  const id = lienKet(db, a, org, "MANAGER_OF");
  for (const v of ["CHO", "DA_GUI", "KHONG_EMAIL"]) db.prepare("UPDATE pty_party_relationship SET notice_state = ? WHERE id = ?").run(v, id);
  assert.throws(() => db.prepare("UPDATE pty_party_relationship SET notice_state = 'XYZ' WHERE id = ?").run(id), /CHECK/);
});

test("Đ2.2: MANAGER_OF thứ hai đang mở cho cùng tổ chức → hỏng (chỉ mục duy nhất); đã đóng dòng cũ thì mở được", () => {
  const db = db0();
  const org = toChuc(db);
  const [a, b] = [nguoi(db), nguoi(db)];
  const ra = lienKet(db, a, org, "MANAGER_OF");
  assert.throws(() => lienKet(db, b, org, "MANAGER_OF", D1), /UNIQUE constraint failed: pty_party_relationship\.to_party_id/);
  assert.deepEqual(lienKetMo(db, org), [[a, "MANAGER"]]);
  dong(db, ra); // không còn thành viên ⇒ không cần replaced_by_id (Đ2.5)
  lienKet(db, b, org, "MANAGER_OF", D1);
  assert.deepEqual(lienKetMo(db, org), [[b, "MANAGER"]]);
});

test("Đ2.4: đóng người quản lý khi tổ chức còn thành viên đang mở mà thiếu replaced_by_id → hỏng; có replaced_by_id → được; không còn thành viên → được", () => {
  const db = db0();
  const org = toChuc(db);
  const [a, b] = [nguoi(db), nguoi(db)];
  const ra = lienKet(db, a, org, "MANAGER_OF");
  const rb = lienKet(db, b, org, "MEMBER_OF");
  assert.throws(() => dong(db, ra), /pty_relationship_manager_close_needs_replacement/);
  assert.deepEqual(lienKetMo(db, org), [[a, "MANAGER"], [b, "MEMBER"]], "không gì đổi");
  dong(db, rb); // thành viên rời
  dong(db, ra);
  assert.deepEqual(lienKetMo(db, org), []);
  // Thành viên ĐÃ ĐÓNG không tính (PF16: chỉ dòng đang mở).
  const org2 = toChuc(db);
  const r2 = lienKet(db, a, org2, "MANAGER_OF");
  dong(db, lienKet(db, b, org2, "MEMBER_OF"));
  dong(db, r2);
});

test("Đ2.4: lô chuyển đúng thứ tự (người mới đang là thành viên) → một người quản lý mới, người cũ thành thành viên; replaced_by_id trỏ dòng mới", () => {
  const db = db0();
  const org = toChuc(db);
  const [a, b, c] = [nguoi(db), nguoi(db), nguoi(db)];
  const ra = lienKet(db, a, org, "MANAGER_OF");
  const rb = lienKet(db, b, org, "MEMBER_OF");
  lienKet(db, c, org, "MEMBER_OF");
  const maMoi = chuyen(db, org, { id: ra, nguoi: a }, b, rb);
  assert.deepEqual(lienKetMo(db, org), [[b, "MANAGER"], ...[[a, "MEMBER"], [c, "MEMBER"]].sort((x, y) => String(x[0]).localeCompare(String(y[0])))]);
  assert.deepEqual(rows(db, "SELECT replaced_by_id, valid_to_date FROM pty_party_relationship WHERE id = ?", ra), [{ replaced_by_id: maMoi, valid_to_date: D1 }]);
  assert.deepEqual(rows(db, "SELECT relationship_type_code AS t, valid_from_date AS f FROM pty_party_relationship WHERE id = ?", maMoi), [{ t: "MANAGER_OF", f: D1 }]);
});

test("Đ2.4: giả lỗi ở một câu trong lô chuyển → không gì đổi (cả lô hoàn tác)", () => {
  const db = db0();
  const org = toChuc(db);
  const [a, b] = [nguoi(db), nguoi(db)];
  const ra = lienKet(db, a, org, "MANAGER_OF");
  const rb = lienKet(db, b, org, "MEMBER_OF");
  const truoc = rows(db, "SELECT * FROM pty_party_relationship WHERE to_party_id = ? ORDER BY id", org);
  assert.throws(() => chuyen(db, org, { id: ra, nguoi: a }, b, rb, true), /khong_co_bang/);
  assert.deepEqual(rows(db, "SELECT * FROM pty_party_relationship WHERE to_party_id = ? ORDER BY id", org), truoc);
});

test("Đ2.9: chuyển A → B rồi trả lại A trong cùng ngày → hỏng (chống chồng lấn sẵn có), không gì đổi ở lần trả", () => {
  const db = db0();
  const org = toChuc(db);
  const [a, b] = [nguoi(db), nguoi(db)];
  const ra = lienKet(db, a, org, "MANAGER_OF");
  const rb = lienKet(db, b, org, "MEMBER_OF");
  const maB = chuyen(db, org, { id: ra, nguoi: a }, b, rb);
  const thanhVienA = rows(db, "SELECT relationship_id AS id FROM v_pty_org_link WHERE org_party_id = ? AND person_party_id = ?", org, a)[0]!.id as string;
  const truoc = rows(db, "SELECT * FROM pty_party_relationship WHERE to_party_id = ? ORDER BY id", org);
  assert.throws(() => chuyen(db, org, { id: maB, nguoi: b }, a, thanhVienA), /party_relationship_overlap/);
  assert.deepEqual(rows(db, "SELECT * FROM pty_party_relationship WHERE to_party_id = ? ORDER BY id", org), truoc);
});

test("Đ2.3 hai đầu: đầu từ là tổ chức → hỏng (*_person); đầu tới không mang vai được hưởng, là hồ sơ cá nhân, hay vai đã kết thúc → hỏng (*_org); loại đối tác do Kế toán thêm → được", () => {
  const db = db0();
  const org = toChuc(db);
  for (const loai of ["MANAGER_OF", "MEMBER_OF"] as const) {
    assert.throws(() => lienKet(db, toChuc(db), org, loai), /pty_relationship_org_link_person/, `${loai}: từ tổ chức`);
    assert.throws(() => lienKet(db, nguoi(db), toChuc(db, []), loai), /pty_relationship_org_link_org/, `${loai}: tổ chức không vai`);
    assert.throws(() => lienKet(db, nguoi(db), toChuc(db, ["SUPPLIER"]), loai), /pty_relationship_org_link_org/, `${loai}: vai nhóm OTHER không phải loại đối tác`);
    assert.throws(() => lienKet(db, nguoi(db), nguoi(db, ["TRAVEL_AGENCY"]), loai), /pty_relationship_org_link_org/, `${loai}: đầu tới là hồ sơ cá nhân`);
    const daDong = toChuc(db);
    db.prepare("UPDATE pty_party_role SET valid_to_date = '2026-10-01' WHERE party_id = ?").run(daDong);
    assert.throws(() => lienKet(db, nguoi(db), daDong, loai), /pty_relationship_org_link_org/, `${loai}: vai đã kết thúc`);
  }
  db.prepare("INSERT OR IGNORE INTO pty_role_type (code, name, sort_order, role_group, is_partner_label) VALUES ('NHAN_TC', 'Loại thử tổ chức', 91, 'OTHER', 1)").run();
  const nhan = toChuc(db, ["NHAN_TC"]);
  lienKet(db, nguoi(db), nhan, "MANAGER_OF");
  // CONTACT_OF không bị chạm: vẫn trỏ được tới tổ chức không vai.
  db.prepare("INSERT INTO pty_party_relationship (id, from_party_id, to_party_id, relationship_type_code, valid_from_date, created_at, updated_at) VALUES (?, ?, ?, 'CONTACT_OF', ?, ?, ?)")
    .run(`rel-${++nr}`, nguoi(db), toChuc(db, []), D0, AT, AT);
});

test("Đ2.3: một người không vừa là người quản lý vừa là thành viên của cùng tổ chức (cả hai chiều); dòng đã đóng không tính (PF16); tổ chức khác không tính", () => {
  const db = db0();
  const org = toChuc(db);
  const a = nguoi(db);
  const ra = lienKet(db, a, org, "MANAGER_OF");
  assert.throws(() => lienKet(db, a, org, "MEMBER_OF", D1), /pty_relationship_org_link_not_both/);
  const org2 = toChuc(db);
  const b = nguoi(db);
  lienKet(db, b, org2, "MEMBER_OF");
  assert.throws(() => lienKet(db, b, org2, "MANAGER_OF", D1), /pty_relationship_org_link_not_both/);
  lienKet(db, a, org2, "MEMBER_OF"); // người quản lý của org là thành viên của org2: được
  dong(db, ra); // không còn thành viên mở ⇒ đóng được
  lienKet(db, a, org, "MEMBER_OF", D1); // dòng quản lý đã đóng không tính
});

test("v_pty_org_link: đúng năm cột, chỉ dòng đang mở, kind MANAGER/MEMBER; không lộ CONTACT_OF", () => {
  const db = db0();
  assert.deepEqual(rows(db, "SELECT name FROM pragma_table_info('v_pty_org_link')").map((r) => r.name), ["relationship_id", "person_party_id", "org_party_id", "kind", "valid_from_date"]);
  const org = toChuc(db);
  const [a, b, c] = [nguoi(db), nguoi(db), nguoi(db)];
  const ra = lienKet(db, a, org, "MANAGER_OF");
  dong(db, lienKet(db, b, org, "MEMBER_OF"));
  lienKet(db, c, org, "MEMBER_OF");
  db.prepare("INSERT INTO pty_party_relationship (id, from_party_id, to_party_id, relationship_type_code, valid_from_date, created_at, updated_at) VALUES (?, ?, ?, 'CONTACT_OF', ?, ?, ?)")
    .run(`rel-${++nr}`, b, org, D0, AT, AT);
  assert.deepEqual(rows(db, "SELECT * FROM v_pty_org_link WHERE org_party_id = ? ORDER BY kind", org), [
    { relationship_id: ra, person_party_id: a, org_party_id: org, kind: "MANAGER", valid_from_date: D0 },
    { relationship_id: rows(db, "SELECT id FROM pty_party_relationship WHERE from_party_id = ? AND to_party_id = ?", c, org)[0]!.id, person_party_id: c, org_party_id: org, kind: "MEMBER", valid_from_date: D0 },
  ]);
});

// ---- LC-1c tạo lại + lc1d (Đ9) ----------------------------------------------------------------------------------------------------------------------------
let ns = 0;
function taiKhoan(db: DatabaseSync, party: string): string {
  const id = `s-tc-${++ns}`;
  db.prepare("INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at, party_id) VALUES (?, '', ?, 'x', 'sales', 1, ?, ?)").run(id, `08${String(ns).padStart(8, "0")}`, AT, party);
  return id;
}
const moQuyen = (db: DatabaseSync, staff: string, ma: string) =>
  db.prepare("INSERT INTO stf_permission (id, staff_id, permission_type_code, valid_from_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)").run(`q-${staff}-${ma}`, staff, ma, AT, AT, AT);
const quyenMo = (db: DatabaseSync, staff: string) => rows(db, "SELECT permission_type_code AS ma FROM stf_permission WHERE staff_id = ? AND valid_to_at IS NULL ORDER BY ma", staff).map((r) => r.ma);

test("LC-1c tạo lại (giữ tên): cấp Đối tác cho hồ sơ chỉ có liên kết (quản lý hoặc thành viên) tới tổ chức được hưởng → được; liên kết đã đóng, hay tổ chức đã thôi vai → từ chối", () => {
  const db = db0();
  assert.equal(rows(db, "SELECT 1 FROM sqlite_master WHERE type = 'trigger' AND name = 'lc1c_stf_permission_partner_needs_role'").length, 1);
  const org = toChuc(db);
  const [a, b] = [nguoi(db), nguoi(db)];
  lienKet(db, a, org, "MANAGER_OF");
  lienKet(db, b, org, "MEMBER_OF");
  for (const p of [a, b]) {
    const s = taiKhoan(db, p);
    moQuyen(db, s, "PARTNER");
    assert.deepEqual(quyenMo(db, s), ["PARTNER"]);
  }
  const org2 = toChuc(db);
  const c = nguoi(db);
  dong(db, lienKet(db, c, org2, "MEMBER_OF"));
  assert.throws(() => moQuyen(db, taiKhoan(db, c), "PARTNER"), /lc1c_partner_needs_role/, "liên kết đã đóng");
  const org3 = toChuc(db);
  const d = nguoi(db);
  lienKet(db, d, org3, "MEMBER_OF");
  db.prepare("UPDATE pty_party_role SET valid_to_date = '2026-11-02' WHERE party_id = ?").run(org3);
  assert.throws(() => moQuyen(db, taiKhoan(db, d), "PARTNER"), /lc1c_partner_needs_role/, "tổ chức thôi vai được hưởng sau khi gắn");
  assert.throws(() => moQuyen(db, taiKhoan(db, nguoi(db)), "PARTNER"), /lc1c_partner_needs_role/, "không vai, không liên kết: như cũ");
});

test("lc1d: cấp quyền khác Đối tác (Bán hàng, Tài xế đối tác) cho tài khoản mà hồ sơ chỉ có liên kết → hỏng; hồ sơ không liên kết cấp Bán hàng như cũ", () => {
  const db = db0();
  const org = toChuc(db);
  const a = nguoi(db);
  lienKet(db, a, org, "MEMBER_OF");
  const s = taiKhoan(db, a);
  assert.throws(() => moQuyen(db, s, "SALES"), /lc1d_link_only_partner/);
  assert.throws(() => moQuyen(db, taiKhoan(db, nguoiLienKet(db, org)), "DRIVER_PARTNER"), /lc1d_link_only_partner/);
  moQuyen(db, s, "PARTNER");
  assert.throws(() => moQuyen(db, s, "ACCOUNTING"), /lc1d_link_only_partner/, "đã giữ Đối tác vẫn không thêm quyền nội bộ");
  assert.deepEqual(quyenMo(db, s), ["PARTNER"]);
  const thuong = taiKhoan(db, nguoi(db));
  moQuyen(db, thuong, "SALES");
  assert.deepEqual(quyenMo(db, thuong), ["SALES"]);
});
function nguoiLienKet(db: DatabaseSync, org: string): string {
  const p = nguoi(db);
  lienKet(db, p, org, "MEMBER_OF");
  return p;
}

// ---- Bảng yêu cầu chuyển quyền (Đ6): chỉ thêm, trạng thái một chiều MO → DA_XU_LY | DA_HUY ----------------------------------------------------------------
test("pty_org_transfer_request: chèn ở trạng thái MO; đóng một lần sang DA_XU_LY hoặc DA_HUY kèm closed_at, closed_by; không mở lại, không sửa cột khác, không xoá", () => {
  const db = db0();
  const org = toChuc(db);
  const a = nguoi(db);
  const s = taiKhoan(db, a);
  const chen = (id: string, status = "MO") =>
    db.prepare("INSERT INTO pty_org_transfer_request (id, org_party_id, requested_by_staff_id, proposed_person_party_id, status, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .run(id, org, s, a, status, AT, s, AT, s);
  chen("tr-1");
  chen("tr-2");
  assert.throws(() => chen("tr-3", "DA_XU_LY"), /pty_org_transfer_request_insert_open/);
  db.prepare("UPDATE pty_org_transfer_request SET status = 'DA_XU_LY', closed_at = ?, closed_by = ? WHERE id = 'tr-1'").run(AT, s);
  db.prepare("UPDATE pty_org_transfer_request SET status = 'DA_HUY', closed_at = ?, closed_by = ? WHERE id = 'tr-2'").run(AT, s);
  for (const cau of [
    "UPDATE pty_org_transfer_request SET status = 'MO', closed_at = NULL, closed_by = NULL WHERE id = 'tr-1'",
    "UPDATE pty_org_transfer_request SET status = 'DA_HUY' WHERE id = 'tr-1'",
    "UPDATE pty_org_transfer_request SET proposed_person_party_id = org_party_id WHERE id = 'tr-2'",
    "DELETE FROM pty_org_transfer_request WHERE id = 'tr-2'",
  ]) assert.throws(() => db.exec(cau), /pty_org_transfer_request_/, cau);
  chen("tr-4");
  assert.throws(() => db.exec("UPDATE pty_org_transfer_request SET status = 'DA_XU_LY' WHERE id = 'tr-4'"), /pty_org_transfer_request_close_shape/, "đóng thiếu closed_at, closed_by");
  assert.throws(() => db.exec("UPDATE pty_org_transfer_request SET status = 'XYZ', closed_at = 'x', closed_by = 'y' WHERE id = 'tr-4'"), /pty_org_transfer_request_close_shape|CHECK/);
});

// ---- orders.acting_* (Đ3.6, PF10), v_ord_order_acting (PF8), audit_log.acting_party_id (Đ3.5) -----------------------------------------------------------
function don(db: DatabaseSync, id: string, acting: string | null, kind: string | null) {
  if (rows(db, "SELECT 1 FROM staff WHERE id = 's-don'").length === 0) taiKhoanCoDinh(db);
  db.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, created_at, updated_at, acting_party_id, acting_link_kind)
    VALUES (?, ?, 's-don', 'draft', 'Khách Giả', '0900000009', 100000, 100000, 100000, ?, ?, ?, ?)`).run(id, `TD-${id}`, AT, AT, acting, kind);
}
function taiKhoanCoDinh(db: DatabaseSync) {
  db.prepare("INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at) VALUES ('s-don', '', '0890000000', 'x', 'sales', 1, ?)").run(AT);
}

test("orders.acting_party_id, acting_link_kind: ghi lúc chèn; tập đóng CA_NHAN / MANAGER / MEMBER; không đổi sang giá trị khác; chỉ được về NULL CẢ HAI cùng câu (PF10 «Đổi khách»)", () => {
  const db = db0();
  const org = toChuc(db);
  don(db, "o-tc-1", org, "MANAGER");
  don(db, "o-tc-2", null, null);
  don(db, "o-tc-3", org, "MEMBER");
  assert.throws(() => don(db, "o-tc-x", org, "XYZ"), /CHECK/);
  for (const cau of [
    "UPDATE orders SET acting_party_id = 'khac' WHERE id = 'o-tc-1'",
    "UPDATE orders SET acting_link_kind = 'MEMBER' WHERE id = 'o-tc-1'",
    "UPDATE orders SET acting_party_id = NULL WHERE id = 'o-tc-1'",
    "UPDATE orders SET acting_link_kind = NULL WHERE id = 'o-tc-1'",
    "UPDATE orders SET acting_party_id = 'p', acting_link_kind = 'CA_NHAN' WHERE id = 'o-tc-2'",
  ]) assert.throws(() => db.exec(cau), /orders_acting_immutable/, cau);
  db.exec("UPDATE orders SET customer_note = 'sửa nháp' WHERE id = 'o-tc-1'"); // cột khác: không chạm
  db.exec("UPDATE orders SET acting_party_id = NULL, acting_link_kind = NULL WHERE id = 'o-tc-3'");
  assert.deepEqual(rows(db, "SELECT order_id, acting_party_id FROM v_ord_order_acting WHERE order_id IN ('o-tc-1', 'o-tc-2', 'o-tc-3') ORDER BY order_id"), [
    { order_id: "o-tc-1", acting_party_id: org },
    { order_id: "o-tc-2", acting_party_id: null },
    { order_id: "o-tc-3", acting_party_id: null },
  ]);
  assert.deepEqual(rows(db, "SELECT name FROM pragma_table_info('v_ord_order_acting')").map((r) => r.name), ["order_id", "acting_party_id"]);
});

test("audit_log có cột acting_party_id (rỗng mặc định); không trigger chặn chèn có giá trị", () => {
  const db = db0();
  assert.ok(rows(db, "SELECT name FROM pragma_table_info('audit_log')").some((r) => r.name === "acting_party_id"));
  db.prepare("INSERT INTO audit_log (id, action, created_at, acting_party_id) VALUES ('al-tc-1', 'party_relationship_changed', ?, 'p-x')").run(AT);
  assert.deepEqual(rows(db, "SELECT acting_party_id FROM audit_log WHERE id = 'al-tc-1'"), [{ acting_party_id: "p-x" }]);
});

// ---- Route quan hệ chung của Danh bạ (Đ2.7): từ chối hai mã mới ở cả thêm lẫn kết thúc; danh sách loại quan hệ của Danh bạ không chào hai mã đó -------------
const ADM = "33333333-3333-4333-8333-333333333333";
const CAU = "Người quản lý và thành viên của tổ chức chỉ đổi ở màn tổ chức";

test("Đ2.7 route: POST …/relationships với MANAGER_OF, MEMBER_OF → 400 câu chỉ tới màn tổ chức, không ghi gì; …/end trên dòng hai loại đó → 400; meta không chào hai mã", async () => {
  const w = world();
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản trị", perms: ["ADMIN"] });
  const tao = async (body: Record<string, unknown>) => {
    const r = await w.call("POST", "/api/parties", { as: ADM, body });
    assert.equal(r.status, 201, r.text);
    return r.json.party.id as string;
  };
  const org = await tao({ kind: "ORGANIZATION", displayName: "Khách sạn Sunrise" });
  assert.equal((await w.call("POST", `/api/parties/${org}/roles`, { as: ADM, body: { roleTypeCode: "TRAVEL_AGENCY" } })).status, 201);
  const p = await tao({ kind: "PERSON", fullName: "Nguyễn Văn Nam", contacts: [] });
  const dem = () => w.q("SELECT count(*) n FROM pty_party_relationship")[0].n;
  const truoc = dem();
  for (const code of ["MANAGER_OF", "MEMBER_OF"]) {
    const r = await w.call("POST", `/api/parties/${org}/relationships`, { as: ADM, body: { fromPartyId: p, toPartyId: org, relationshipTypeCode: code } });
    assert.equal(r.status, 400, r.text);
    assert.equal(r.json.error.message, `${CAU}.`);
  }
  assert.equal(dem(), truoc);
  // Dòng có sẵn (do đường riêng ghi) không kết thúc được qua lối chung.
  w.sqlite.prepare("INSERT INTO pty_party_relationship (id, from_party_id, to_party_id, relationship_type_code, valid_from_date, created_at, updated_at) VALUES ('44444444-4444-4444-8444-444444444444', ?, ?, 'MEMBER_OF', '2026-11-01', ?, ?)")
    .run(p, org, AT, AT);
  const r = await w.call("POST", `/api/parties/${org}/relationships/44444444-4444-4444-8444-444444444444/end`, { as: ADM, body: {} });
  assert.equal(r.status, 400, r.text);
  assert.equal(r.json.error.message, `${CAU}.`);
  assert.equal(w.q("SELECT valid_to_date FROM pty_party_relationship WHERE id = '44444444-4444-4444-8444-444444444444'")[0].valid_to_date, null);
  const meta = await w.call("GET", "/api/parties/meta", { as: ADM });
  assert.equal(meta.status, 200, meta.text);
  assert.deepEqual(meta.json.relationshipTypes.map((t: { code: string }) => t.code), ["CONTACT_OF", "DRIVES_FOR", "REFERRED_BY"]);
});
