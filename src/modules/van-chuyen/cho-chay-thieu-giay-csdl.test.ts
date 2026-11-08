// Kiểm migration *_cho_chay_thieu_giay.sql (ADR-0184, việc 1/7) — LỚP CSDL: chèn THẲNG SQL trên schema thật dựng từ MỌI migrations/*.sql bằng node:sqlite.
// Phạm vi: bảng dòng cho phép vc_trip_departure_waiver (chỉ thêm; năm mã lỗi lúc chèn), cột waiver_id của dòng con bản chụp, ba mã lỗi ở dòng con
// (waiver_item_kind, lc05_thieu_giay_chua_cho_phep, waiver_da_dung), gieo nhóm lý do CHO_CHAY_THIEU_GIAY. Lớp máy chủ: việc 2, 3.
// P16: biến môi trường CHO_CHAY_SQL trỏ bản sao đã sửa cố ý của migration này (năm phép phá ghi ở báo cáo việc 1, 2026-11-07).
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../../../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const MATCHES = files.filter((f) => f.endsWith("_cho_chay_thieu_giay.sql"));
const SQL_SUA = process.env.CHO_CHAY_SQL ? readFileSync(process.env.CHO_CHAY_SQL, "utf8") : null;
const sqlOf = (f: string) => (MATCHES.includes(f) && SQL_SUA !== null ? SQL_SUA : readFileSync(new URL(f, DIR), "utf8"));

const AT = "2026-11-07T03:00:00.000Z";
const POLICY = "d53b6dd9-60e2-4644-8e63-9ca7dcff35d0"; // dòng chính sách gieo của 0041
const RULE_KIEM_DINH = "1a6f3c52-4d0e-4b8a-9c21-7e5d0b3a9f11"; // gieo 0041: xe từ 1 chỗ cần Kiểm định
const RULE_BAO_HIEM = "2b7e4d63-5e1f-4c9b-8d32-8f6e1c4b0a22"; // gieo 0041: xe từ 1 chỗ cần Bảo hiểm trách nhiệm dân sự
const DAY = "2026-11-10";
const ms = (hhmm: string) => Date.parse(`${DAY}T${hhmm}:00.000+07:00`);
type Db = DatabaseSync;
let n = 0;
const nid = (p: string) => `${p}-${++n}`;
function openDb(): Db {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of files) db.exec(sqlOf(f));
  return db;
}
const loi = (fn: () => unknown, re: RegExp, msg?: string) => assert.throws(fn, re, msg);
const run = (db: Db, sql: string, ...a: (string | number | null)[]) => db.prepare(sql).run(...a);
const one = <T>(db: Db, sql: string, ...a: (string | number | null)[]) => db.prepare(sql).get(...a) as T;

function hoSo(db: Db, ten: string): string {
  const id = nid("p");
  run(db, "INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'PERSON', ?, 1, ?, ?)", id, ten, AT, AT);
  run(db, "INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES (?, ?, ?, ?)", id, ten, AT, AT);
  return id;
}
/** Tài khoản nhân viên; `toanQuyen` = giữ quyền SUPER_ADMIN đang hiệu lực (có trong v_stf_toan_quyen). */
function nhanVien(db: Db, toanQuyen: boolean): string {
  const sid = nid("s");
  run(db, "INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at, party_id) VALUES (?, '', ?, 'x', 'sales', 1, ?, ?)", sid, `09${String(++n).padStart(8, "0")}`, AT, hoSo(db, "NV"));
  run(db, "INSERT INTO stf_permission (id, staff_id, permission_type_code, valid_from_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)", nid("perm"), sid, toanQuyen ? "SUPER_ADMIN" : "ADMIN", AT, AT, AT);
  return sid;
}
function xe(db: Db): string {
  const chu = one<{ party_id: string }>(db, "SELECT party_id FROM v_pty_owner_company").party_id;
  const id = nid("xe");
  run(db, `INSERT INTO vc_vehicle (id, plate_number, plate_key, chassis_number, chassis_key, name, model_year, passenger_capacity, owner_party_id, status, valid_from_date,
     created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'Xe thử', 2020, 15, ?, 'active', '2026-09-01', ?, ?)`, id, `79B${String(n).padStart(5, "0")}`, `79B${String(n).padStart(5, "0")}`, `KHUNG${n}`, `KHUNG${n}`, chu, AT, AT);
  return id;
}
function chuyen(db: Db, vehicleId?: string, gio: [string, string] = ["07:00", "09:00"]): { id: string; xe: string } {
  const chu = one<{ party_id: string }>(db, "SELECT party_id FROM v_pty_owner_company").party_id;
  const v = vehicleId ?? xe(db);
  const id = nid("tr");
  run(db, `INSERT INTO vc_trip (id, code, vehicle_id, carrier_party_id, service_date, planned_start_ms, planned_end_ms, earliest_start_ms, rest_minutes_snapshot, last_cmd_id,
     created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 30, ?, ?, ?)`, id, `CX-${id}`, v, chu, DAY, ms(gio[0]), ms(gio[1]), ms(gio[0]), randomUUID(), AT, AT);
  run(db, "INSERT INTO vc_trip_driver (id, trip_id, driver_party_id, valid_from_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)", nid("dr"), id, hoSo(db, "Tài xế"), AT, AT, AT);
  return { id, xe: v };
}
interface MoCho { loai?: string; ly?: string | null; ghiChu?: string | null; nguoi?: string; xe?: string; het?: string | null }
function cho(db: Db, t: { id: string; xe: string }, o: MoCho = {}): string {
  const id = nid("wv");
  run(db, `INSERT INTO vc_trip_departure_waiver (id, trip_id, cmd_id, vehicle_id, document_type_code, expiry_date, reason_code, note, created_at, created_by, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, id, t.id, randomUUID(), o.xe ?? t.xe, o.loai ?? "REGISTRATION", o.het ?? null, o.ly === undefined ? "THIEU_GIAY_GIA_HAN" : o.ly,
    o.ghiChu ?? null, AT, o.nguoi ?? nhanVien(db, false), AT);
  return id;
}
/** Bản chụp điều kiện xuất bến (một dòng). `ketQua` mặc định ĐẠT. */
function chup(db: Db, t: { id: string; xe: string }, ketQua: "DAT" | "KHONG_DAT" = "DAT", xeId?: string): string {
  const chu = one<{ party_id: string }>(db, "SELECT party_id FROM v_pty_owner_company").party_id;
  const id = nid("ck");
  run(db, `INSERT INTO vc_trip_departure_check (id, trip_id, cmd_id, policy_id, ket_qua, vehicle_id, plate_number, passenger_capacity, owner_party_id, driver_party_id,
     rest_minutes_used, checked_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, '79B-000.00', 15, ?, ?, 30, ?, ?, ?)`, id, t.id, randomUUID(), POLICY, ketQua, xeId ?? t.xe, chu, chu, AT, AT, AT);
  return id;
}
function dongDieuKien(db: Db, checkId: string, rule: string, loai: string | null, waiver: string | null): void {
  run(db, `INSERT INTO vc_trip_departure_check_item (id, check_id, item_kind, document_type_code, rule_id, waiver_id, created_at, updated_at) VALUES (?, ?, 'DIEU_KIEN', ?, ?, ?, ?, ?)`,
    nid("it"), checkId, loai, rule, waiver, AT, AT);
}
function luatTaiXe(db: Db): string {
  const id = nid("rule");
  const loai = one<{ code: string }>(db, "SELECT code FROM pty_person_document_type LIMIT 1").code;
  run(db, `INSERT INTO vc_departure_rule (id, min_capacity, subject, vehicle_document_type_code, person_document_type_code, valid_from_at, created_at, updated_at)
     VALUES (?, 1, 'DRIVER', NULL, ?, ?, ?, ?)`, id, loai, AT, AT, AT);
  return id;
}

test("đúng MỘT tệp 0147_cho_chay_thieu_giay.sql", () => {
  assert.equal(MATCHES.length, 1);
  assert.equal(MATCHES[0], "0147_cho_chay_thieu_giay.sql");
});

test("gieo: nhóm CHO_CHAY_THIEU_GIAY có ba lý do theo thứ tự, «Khác» cuối", () => {
  const db = openDb();
  const r = db.prepare("SELECT code, label FROM vc_reason WHERE reason_group = 'CHO_CHAY_THIEU_GIAY' AND active = 1 ORDER BY sort_order").all() as { code: string; label: string }[];
  assert.deepEqual(r.map((x) => [x.code, x.label]), [["THIEU_GIAY_GIA_HAN", "Giấy đang gia hạn"], ["THIEU_GIAY_XE_THAY", "Xe thay thế khẩn cấp"], ["THIEU_GIAY_KHAC", "Khác"]]);
});

test("dòng cho phép chỉ thêm: sửa và xoá đều bị chặn (vc_trip_append_only)", () => {
  const db = openDb();
  const w = cho(db, chuyen(db));
  loi(() => run(db, "UPDATE vc_trip_departure_waiver SET note = NULL WHERE id = ?", w), /vc_trip_append_only/);
  loi(() => run(db, "DELETE FROM vc_trip_departure_waiver WHERE id = ?", w), /vc_trip_append_only/);
});

test("waiver_trip_not_planned: chuyến đã chạy thì không cấp dòng cho phép", () => {
  const db = openDb();
  const t = chuyen(db);
  run(db, "UPDATE vc_trip SET status = 'CANCELLED', cancel_reason_code = 'HUY_KHAC' WHERE id = ?", t.id);
  loi(() => cho(db, t), /waiver_trip_not_planned/);
});

test("waiver_vehicle_mismatch: dòng cho phép phải đúng xe HIỆN TẠI của chuyến", () => {
  const db = openDb();
  const t = chuyen(db);
  loi(() => cho(db, t, { xe: xe(db) }), /waiver_vehicle_mismatch/);
  cho(db, t); // đúng xe → qua
});

test("waiver_reason_group: lý do có mà khác nhóm CHO_CHAY_THIEU_GIAY → chặn", () => {
  const db = openDb();
  loi(() => cho(db, chuyen(db), { ly: "PHA_LE_KHAC" }), /waiver_reason_group/);
});

test("waiver_reason_required: Quản trị không lý do → chặn; Toàn quyền không lý do → qua", () => {
  const db = openDb();
  const t = chuyen(db);
  loi(() => cho(db, t, { ly: null, nguoi: nhanVien(db, false) }), /waiver_reason_required/);
  cho(db, t, { ly: null, nguoi: nhanVien(db, true) });
  // người ghi trống (hệ thống) không phải Toàn quyền → vẫn bắt lý do (NOT IN với NULL sẽ lọt, nên trigger dùng NOT EXISTS)
  loi(() => run(db, "INSERT INTO vc_trip_departure_waiver (id, trip_id, cmd_id, vehicle_id, document_type_code, created_at, created_by, updated_at) VALUES (?, ?, ?, ?, 'REGISTRATION', ?, NULL, ?)",
    nid("wv"), t.id, randomUUID(), t.xe, AT, AT), /waiver_reason_required/);
});

test("waiver_toan_quyen_only: Kiểm định / Bảo hiểm chỉ Toàn quyền; Quản trị có lý do cho Đăng ký xe → qua", () => {
  const db = openDb();
  const t = chuyen(db);
  const qt = nhanVien(db, false);
  const tq = nhanVien(db, true);
  loi(() => cho(db, t, { loai: "INSPECTION", nguoi: qt }), /waiver_toan_quyen_only/);
  loi(() => cho(db, t, { loai: "TPL_INSURANCE", nguoi: qt }), /waiver_toan_quyen_only/);
  cho(db, t, { loai: "REGISTRATION", nguoi: qt });
  cho(db, t, { loai: "INSPECTION", ly: null, nguoi: tq }); // Toàn quyền không lý do cho Kiểm định
});

test("ghi chú: ngắn hơn 10 ký tự (sau cắt trắng) bị CHECK chặn; NULL và 10 ký tự qua", () => {
  const db = openDb();
  const t = chuyen(db);
  loi(() => cho(db, t, { ghiChu: "ngắn quá" }), /CHECK/i);
  loi(() => cho(db, t, { ghiChu: "          " }), /CHECK/i);
  cho(db, t, { ghiChu: "đủ mười ký" });
});

test("dòng con: bản chụp ĐẠT có DIEU_KIEN trỏ dòng cho phép đúng (chuyến, xe, loại giấy, điều kiện của xe) → qua", () => {
  const db = openDb();
  const t = chuyen(db);
  const w = cho(db, t, { loai: "INSPECTION", ly: null, nguoi: nhanVien(db, true) });
  dongDieuKien(db, chup(db, t), RULE_KIEM_DINH, "INSPECTION", w);
});

test("lc05_thieu_giay_chua_cho_phep: DIEU_KIEN dưới bản chụp ĐẠT không có dòng cho phép / sai loại / sai chuyến / sai xe → chặn; bản chụp KHÔNG_ĐẠT vẫn ghi được", () => {
  const db = openDb();
  const t = chuyen(db);
  const tq = nhanVien(db, true);
  loi(() => dongDieuKien(db, chup(db, t), RULE_KIEM_DINH, "INSPECTION", null), /lc05_thieu_giay_chua_cho_phep/, "không trỏ dòng cho phép");
  const wBaoHiem = cho(db, t, { loai: "TPL_INSURANCE", ly: null, nguoi: tq });
  loi(() => dongDieuKien(db, chup(db, t), RULE_KIEM_DINH, "INSPECTION", wBaoHiem), /lc05_thieu_giay_chua_cho_phep/, "sai loại giấy");
  const khac = chuyen(db);
  const wKhac = cho(db, khac, { loai: "INSPECTION", ly: null, nguoi: tq });
  loi(() => dongDieuKien(db, chup(db, t), RULE_KIEM_DINH, "INSPECTION", wKhac), /lc05_thieu_giay_chua_cho_phep/, "dòng cho phép của chuyến khác");
  const w = cho(db, t, { loai: "INSPECTION", ly: null, nguoi: tq });
  loi(() => dongDieuKien(db, chup(db, t, "DAT", xe(db)), RULE_KIEM_DINH, "INSPECTION", w), /lc05_thieu_giay_chua_cho_phep/, "bản chụp ghi xe khác với dòng cho phép");
  dongDieuKien(db, chup(db, t, "KHONG_DAT"), RULE_KIEM_DINH, "INSPECTION", null); // không đạt: dòng giữ như cũ
});

test("lc05 (T1, đợt sửa 1): hai chuyến CÙNG MỘT XE — bản chụp ĐẠT của chuyến 2 trỏ dòng cho phép của chuyến 1 → chặn (vế khớp chuyến)", () => {
  const db = openDb();
  const t1 = chuyen(db);
  const t2 = chuyen(db, t1.xe, ["12:00", "14:00"]);
  const w1 = cho(db, t1, { loai: "INSPECTION", ly: null, nguoi: nhanVien(db, true) });
  loi(() => dongDieuKien(db, chup(db, t2), RULE_KIEM_DINH, "INSPECTION", w1), /lc05_thieu_giay_chua_cho_phep/);
  dongDieuKien(db, chup(db, t1), RULE_KIEM_DINH, "INSPECTION", w1); // đúng chuyến → qua
});

test("lc05 (P11, đợt sửa 1): dòng con ghi loại giấy khác loại của ĐIỀU KIỆN (Đăng ký xe cho điều kiện Kiểm định) → chặn", () => {
  const db = openDb();
  const t = chuyen(db);
  const w = cho(db, t, { loai: "REGISTRATION", nguoi: nhanVien(db, false) });
  loi(() => dongDieuKien(db, chup(db, t), RULE_KIEM_DINH, "REGISTRATION", w), /lc05_thieu_giay_chua_cho_phep/);
});

test("lc05: DIEU_KIEN của điều kiện TÀI XẾ dưới bản chụp ĐẠT → chặn dù trỏ dòng cho phép hợp lệ (giấy tài xế không cho qua)", () => {
  const db = openDb();
  const t = chuyen(db);
  const w = cho(db, t, { loai: "INSPECTION", ly: null, nguoi: nhanVien(db, true) });
  // loại giấy ghi trùng loại của dòng cho phép để chỉ còn vế «điều kiện của tài xế» quyết định
  loi(() => dongDieuKien(db, chup(db, t), luatTaiXe(db), "INSPECTION", w), /lc05_thieu_giay_chua_cho_phep/);
});

test("waiver_item_kind: waiver_id ở dòng không phải DIEU_KIEN → chặn", () => {
  const db = openDb();
  const t = chuyen(db);
  const w = cho(db, t);
  const doc = nid("doc");
  run(db, "INSERT INTO vc_vehicle_document (id, vehicle_id, document_type_code, expiry_date, created_at, updated_at) VALUES (?, ?, 'REGISTRATION', NULL, ?, ?)", doc, t.xe, AT, AT);
  loi(() => run(db, `INSERT INTO vc_trip_departure_check_item (id, check_id, item_kind, vehicle_document_id, document_type_code, waiver_id, created_at, updated_at)
     VALUES (?, ?, 'GIAY_TO_XE', ?, 'REGISTRATION', ?, ?, ?)`, nid("it"), chup(db, t), doc, w, AT, AT), /waiver_item_kind/);
});

test("Trọng tâm 1: hai dòng DIEU_KIEN cùng một bản chụp cùng trỏ MỘT dòng cho phép → qua", () => {
  const db = openDb();
  const t = chuyen(db);
  const w = cho(db, t, { loai: "INSPECTION", ly: null, nguoi: nhanVien(db, true) });
  // điều kiện thứ hai của cùng loại giấy (vd. luật từ 16 chỗ)
  const rule2 = nid("rule");
  run(db, `INSERT INTO vc_departure_rule (id, min_capacity, subject, vehicle_document_type_code, valid_from_at, created_at, updated_at) VALUES (?, 16, 'VEHICLE', 'INSPECTION', ?, ?, ?)`, rule2, AT, AT, AT);
  const c = chup(db, t);
  dongDieuKien(db, c, RULE_KIEM_DINH, "INSPECTION", w);
  dongDieuKien(db, c, rule2, "INSPECTION", w);
});

test("waiver_da_dung: dòng cho phép đã dùng ở bản chụp khác thì bản chụp thứ hai trỏ lại → chặn", () => {
  const db = openDb();
  const t = chuyen(db);
  const w = cho(db, t, { loai: "INSPECTION", ly: null, nguoi: nhanVien(db, true) });
  dongDieuKien(db, chup(db, t), RULE_KIEM_DINH, "INSPECTION", w);
  loi(() => dongDieuKien(db, chup(db, t), RULE_KIEM_DINH, "INSPECTION", w), /waiver_da_dung/);
});
