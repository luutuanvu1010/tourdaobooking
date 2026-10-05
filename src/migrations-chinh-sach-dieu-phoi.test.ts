// Kiểm migration CHÍNH SÁCH ĐIỀU PHỐI (ADR-0049 D2, lát 1.1; module van-chuyen, tiền tố vc_): chính sách điều phối (mốc tối thiểu, cảnh báo sát mốc, khoảng
// nghỉ, bắt đủ danh sách, hợp đồng KHOÁ Ở 0 — ĐP7), điều kiện xuất bến theo cỡ xe, bảng hạng bằng → số khách, danh mục lý do. Bất biến sát dữ liệu (TC-1):
// chính sách và bảng hạng bằng CHỈ THÊM; điều kiện xuất bến chỉ ĐÓNG hiệu lực một lần (không sửa nội dung, không mở lại); không xoá; nhóm lý do không đổi.
// Chèn/sửa THẲNG bằng SQL (không qua mã ứng dụng). Dựng schema bằng node:sqlite từ migrations/*.sql. Tệp tìm theo ĐUÔI tên (khuôn migrations-van-chuyen-xe).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const MATCHES = files.filter((f) => f.endsWith("_chinh_sach_dieu_phoi.sql"));
const FILE = MATCHES[0] ?? "";
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
let n = 0;
const uid = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
let k = 0;
/** Mốc hiệu lực độc nhất trong một lần chạy (mỗi lần gọi cách nhau 1 giây) — không đụng khoá duy nhất vc_dispatch_policy.valid_from_at ngoài ý muốn. */
const moc = () => new Date(Date.parse("2026-10-01T00:00:00.000Z") + ++k * 1000).toISOString();

function chinhSach(db: DatabaseSync, v: { min?: number; warn?: number; rest?: number; manifest?: number; contract?: number; kep?: number | null; tu?: string } = {}): string {
  const id = uid();
  db.prepare(
    `INSERT INTO vc_dispatch_policy (id, min_lead_minutes, warn_lead_minutes, rest_minutes, require_manifest, require_contract, proxy_backdate_max_minutes, valid_from_at, created_at,
       created_by, updated_at, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'nv-1', ?, 'nv-1')`,
  ).run(id, v.min ?? 360, v.warn ?? 120, v.rest ?? 30, v.manifest ?? 1, v.contract ?? 0, v.kep === undefined ? 180 : v.kep, v.tu ?? moc(), AT, AT);
  return id;
}
function dieuKien(db: DatabaseSync, v: { cho?: number; subject?: string; xe?: string | null; nguoi?: string | null }): string {
  const id = uid();
  db.prepare(
    `INSERT INTO vc_departure_rule (id, min_capacity, subject, vehicle_document_type_code, person_document_type_code, valid_from_at, valid_to_at, closed_by, created_at, created_by, updated_at, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, ?, 'nv-1', ?, 'nv-1')`,
  ).run(id, v.cho ?? 16, v.subject ?? "VEHICLE", v.xe === undefined ? "CONTRACT_BADGE" : v.xe, v.nguoi === undefined ? null : v.nguoi, AT, AT, AT);
  return id;
}
const dong = (db: DatabaseSync, id: string, at = "2026-09-30T00:00:00.000Z") =>
  db.prepare("UPDATE vc_departure_rule SET valid_to_at = ?, closed_by = 'nv-2', updated_at = ?, updated_by = 'nv-2' WHERE id = ?").run(at, at, id);
function hangBang(db: DatabaseSync, cls: string, max: number | null, tu = "2026-10-01T00:00:00.000Z"): string {
  const id = uid();
  db.prepare(
    `INSERT INTO vc_license_capacity (id, license_class_code, max_passengers, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, 'nv-1', ?, 'nv-1')`,
  ).run(id, cls, max, tu, AT, AT);
  return id;
}
function lyDo(db: DatabaseSync, code: string, group = "PHA_LE", label = "Lý do thử"): void {
  db.prepare(`INSERT INTO vc_reason (code, reason_group, label, active, sort_order, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, 1, 9, ?, 'nv-1', ?, 'nv-1')`)
    .run(code, group, label, AT, AT);
}

test("(a) đúng một tệp *_chinh_sach_dieu_phoi.sql; không phải B5; mọi trigger mới tên vc_*; không dãy ≥ 8 chữ số (bỏ chú thích, ngày giờ, UUID), không '@'", () => {
  assert.equal(MATCHES.length, 1, `phải có đúng một tệp *_chinh_sach_dieu_phoi.sql, thấy: ${JSON.stringify(MATCHES)}`);
  assert.doesNotMatch(FILE, /staff_party_required/);
  const db = before();
  const truoc = new Set(triggers(db));
  db.exec(sqlOf(FILE));
  const moi = triggers(db).filter((t) => !truoc.has(t));
  assert.ok(moi.length >= 7, `phải có các trigger mới, thấy ${JSON.stringify(moi)}`);
  for (const t of moi) assert.match(t, /^vc_/, `trigger ${t}: tên phải bắt đầu vc_`);
  const code = sqlOf(FILE).split("\n").map((l) => l.replace(/--.*$/, "")).join("\n")
    .replace(/'2026-[0-9T:.\-Z]+'/g, "''").replace(/'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'/g, "''");
  assert.doesNotMatch(code, /\d{8,}/);
  assert.doesNotMatch(code, /@/);
});

test("(c) dữ liệu gieo: đúng một dòng chính sách 360/120/30/1/0 + kẹp lùi 180 (ADR-0050 VK1-A, G-A1) hiệu lực từ 01/09; tám dòng hạng bằng đúng mã của 0032; danh mục lý do theo nhóm (G4), mỗi nhóm có 'Khác'", () => {
  const db = all();
  assert.deepEqual(
    rows(db, "SELECT min_lead_minutes, warn_lead_minutes, rest_minutes, require_manifest, require_contract, proxy_backdate_max_minutes, valid_from_at, created_by FROM vc_dispatch_policy"),
    [{
      min_lead_minutes: 360, warn_lead_minutes: 120, rest_minutes: 30, require_manifest: 1, require_contract: 0, proxy_backdate_max_minutes: 180,
      valid_from_at: "2026-09-01T00:00:00.000Z", created_by: null,
    }],
  );
  assert.deepEqual(rows(db, "SELECT license_class_code AS c, max_passengers AS m, valid_from_at AS tu FROM vc_license_capacity ORDER BY license_class_code"), [
    { c: "B", m: 8, tu: "2026-09-01T00:00:00.000Z" },
    { c: "B2_OLD", m: 8, tu: "2026-09-01T00:00:00.000Z" },
    { c: "C_OLD", m: 8, tu: "2026-09-01T00:00:00.000Z" },
    { c: "D", m: null, tu: "2026-09-01T00:00:00.000Z" },
    { c: "D1", m: 16, tu: "2026-09-01T00:00:00.000Z" },
    { c: "D2", m: 29, tu: "2026-09-01T00:00:00.000Z" },
    { c: "D_OLD", m: 29, tu: "2026-09-01T00:00:00.000Z" },
    { c: "E_OLD", m: null, tu: "2026-09-01T00:00:00.000Z" },
  ]);
  // Mọi hạng của danh mục 0032 đều có một dòng (không hạng nào "lạ" lúc gieo).
  assert.deepEqual(
    rows(db, "SELECT code FROM pty_license_class WHERE code NOT IN (SELECT license_class_code FROM vc_license_capacity)"),
    [],
  );
  // ADR-0050 VK1-C (chủ Q-L1-3 = "Kiểm định + Bảo hiểm", thay G3 "không gieo"): ĐÚNG HAI điều kiện gieo, đang hiệu lực, cho MỌI xe (từ 1 người).
  assert.deepEqual(
    rows(db, `SELECT min_capacity, subject, vehicle_document_type_code AS xe, person_document_type_code AS nguoi, valid_from_at, valid_to_at, closed_by, created_by
              FROM vc_departure_rule ORDER BY vehicle_document_type_code`),
    [
      { min_capacity: 1, subject: "VEHICLE", xe: "INSPECTION", nguoi: null, valid_from_at: "2026-09-01T00:00:00.000Z", valid_to_at: null, closed_by: null, created_by: null },
      { min_capacity: 1, subject: "VEHICLE", xe: "TPL_INSURANCE", nguoi: null, valid_from_at: "2026-09-01T00:00:00.000Z", valid_to_at: null, closed_by: null, created_by: null },
    ],
    "VK1-C: hai điều kiện giấy tờ xe gieo sẵn (Kiểm định, Bảo hiểm trách nhiệm dân sự)",
  );
  const lyDoGieo = rows(db, "SELECT code, reason_group, active, created_by FROM vc_reason ORDER BY reason_group, sort_order, code");
  assert.deepEqual(lyDoGieo.map((r) => `${r.reason_group}:${r.code}`), [
    // 0071 (ADR-0055 VK2-A): nhóm lý do xe bận
    "BAN_XE:BAN_XE_BAO_DUONG",
    "BAN_XE:BAN_XE_DANG_KIEM",
    "BAN_XE:BAN_XE_SUA_CHUA",
    "BAN_XE:BAN_XE_KHAC",
    // 0076 (ADR-0052 D5.2, Đợt 5): nhóm lý do văn phòng báo huỷ khi xe đang chạy
    "BAO_HUY_DIEM:BAO_HUY_KHONG_DI",
    "BAO_HUY_DIEM:BAO_HUY_DOI_LICH",
    "BAO_HUY_DIEM:BAO_HUY_KHONG_LIEN_LAC",
    "BAO_HUY_DIEM:BAO_HUY_KHAC",
    "BO_QUA_DIEM:BO_QUA_KHONG_CON_KHACH",
    "BO_QUA_DIEM:BO_QUA_KHAC",
    // + nhóm CHI_PHI_XE gieo ở migration *_vc_chi_phi_chuyen (ADR-0057 T2 — kế hoạch Đợt 4 TC-6, TC-7).
    "CHI_PHI_XE:CPX_PHU_THU_CHO",
    "CHI_PHI_XE:CPX_CAU_DUONG",
    "CHI_PHI_XE:CPX_HUY_MUON",
    "CHI_PHI_XE:CPX_NHAP_SAI",
    "CHI_PHI_XE:CPX_GIA_THOA_THUAN",
    "CHI_PHI_XE:CPX_XE_HONG", // ADR-0095 Q8 (vòng sửa 2, V10)
    "CHI_PHI_XE:CPX_DOI_CHUYEN",
    "CHI_PHI_XE:CPX_HUY_CHUYEN",
    "CHI_PHI_XE:CPX_KHAC",
    "DOI_GIO_XE:DOI_GIO_XE_TOI_SOM",
    "DOI_GIO_XE:DOI_GIO_XE_KHAC",
    "HUY_CHUYEN:HUY_GOP_CHUYEN",
    "HUY_CHUYEN:HUY_KHONG_CON_KHACH",
    "HUY_CHUYEN:HUY_KHAC",
    "KET_THUC_GIAN_DOAN:GIAN_DOAN_XE_HONG",
    "KET_THUC_GIAN_DOAN:GIAN_DOAN_TAI_NAN",
    "KET_THUC_GIAN_DOAN:GIAN_DOAN_KHAC",
    "PHA_LE:PHA_LE_SU_CO",
    "PHA_LE:PHA_LE_DON_GAP",
    "PHA_LE:PHA_LE_KHAC",
  ]);
  for (const r of lyDoGieo) assert.equal(r.active, 1);
  for (const g of new Set(lyDoGieo.map((r) => r.reason_group))) {
    assert.ok(rows(db, "SELECT 1 FROM vc_reason WHERE reason_group = ? AND label = 'Khác'", String(g)).length === 1, `nhóm ${g} phải có đúng một lý do "Khác"`);
  }
});

test("(b) TC-1 chính sách điều phối CHỈ THÊM: UPDATE → RAISE, DELETE → RAISE; thêm dòng mới được; require_contract = 1 → CHECK (ĐP7 — khoá ở CSDL)", () => {
  const db = all();
  const goc = String(rows(db, "SELECT id FROM vc_dispatch_policy")[0]!.id);
  assert.throws(() => db.prepare("UPDATE vc_dispatch_policy SET min_lead_minutes = 0 WHERE id = ?").run(goc), /vc_policy_append_only/);
  assert.throws(() => db.prepare("UPDATE vc_dispatch_policy SET updated_at = ? WHERE id = ?").run(AT, goc), /vc_policy_append_only/);
  assert.throws(() => db.prepare("DELETE FROM vc_dispatch_policy WHERE id = ?").run(goc), /vc_policy_append_only/);
  chinhSach(db, { min: 240 });
  assert.equal(rows(db, "SELECT count(*) AS n FROM vc_dispatch_policy")[0]!.n, 2);
  assert.throws(() => chinhSach(db, { contract: 1 }), /CHECK constraint failed/);
  assert.throws(() => chinhSach(db, { manifest: 2 }), /CHECK constraint failed/);
  // Hai dòng cùng mốc hiệu lực → khoá duy nhất (route đổi thành 409 stale — Ruling R19).
  chinhSach(db, { tu: "2026-11-01T00:00:00.000Z" });
  assert.throws(() => chinhSach(db, { tu: "2026-11-01T00:00:00.000Z" }), /UNIQUE constraint failed: vc_dispatch_policy\.valid_from_at/);
});

test("(d) khoảng giá trị ở CSDL: mốc 1…2880 (KHÔNG cho tắt — chủ trả lời lần 9, GA-5), cảnh báo 0…1440, nghỉ 0…480, kẹp lùi 1…1440 phút (TC-52); số khách tối đa 1…100 hoặc NULL", () => {
  const db = all();
  chinhSach(db, { min: 1, warn: 0, rest: 0 });
  chinhSach(db, { min: 2880, warn: 1440, rest: 480 });
  assert.throws(() => chinhSach(db, { min: 0 }), /CHECK constraint failed/, "mốc 0 (tắt mốc) bị CSDL chặn");
  assert.throws(() => chinhSach(db, { min: 2881 }), /CHECK constraint failed/);
  assert.throws(() => chinhSach(db, { min: -1 }), /CHECK constraint failed/);
  assert.throws(() => chinhSach(db, { warn: 1441 }), /CHECK constraint failed/);
  assert.throws(() => chinhSach(db, { rest: 481 }), /CHECK constraint failed/);
  // ADR-0050 VK1-A: kẹp lùi giờ khai 1…1440 phút; KHÔNG có giá trị mặc định (mỗi dòng là một bản đầy đủ — I43): thiếu → NOT NULL.
  chinhSach(db, { kep: 1 });
  chinhSach(db, { kep: 1440 });
  assert.throws(() => chinhSach(db, { kep: 0 }), /CHECK constraint failed/, "kẹp lùi 0");
  assert.throws(() => chinhSach(db, { kep: 1441 }), /CHECK constraint failed/, "kẹp lùi 1441");
  assert.throws(() => chinhSach(db, { kep: null }), /NOT NULL constraint failed: vc_dispatch_policy\.proxy_backdate_max_minutes/, "thiếu kẹp lùi");
  assert.throws(
    () => db.prepare(`INSERT INTO vc_dispatch_policy (id, min_lead_minutes, warn_lead_minutes, rest_minutes, require_manifest, valid_from_at, created_at, updated_at)
                      VALUES (?, 360, 120, 30, 1, ?, ?, ?)`).run(uid(), moc(), AT, AT),
    /NOT NULL constraint failed: vc_dispatch_policy\.proxy_backdate_max_minutes/,
    "câu chèn không nêu cột kẹp lùi → CSDL không tự điền (không DEFAULT)",
  );
  hangBang(db, "D2", 30);
  hangBang(db, "D", null, "2026-10-02T00:00:00.000Z");
  assert.throws(() => hangBang(db, "B", 0, "2026-10-03T00:00:00.000Z"), /CHECK constraint failed/);
  assert.throws(() => hangBang(db, "B", 101, "2026-10-04T00:00:00.000Z"), /CHECK constraint failed/);
  assert.throws(() => hangBang(db, "HANG_LA", 8, "2026-10-05T00:00:00.000Z"), /FOREIGN KEY constraint failed/);
  assert.throws(() => hangBang(db, "D2", 31), /UNIQUE constraint failed/, "một hạng, một mốc hiệu lực: một dòng");
});

test("(b) TC-1 bảng hạng bằng CHỈ THÊM: UPDATE → RAISE, DELETE → RAISE; thêm D2 30 → dòng cũ 29 còn nguyên", () => {
  const db = all();
  const d2 = String(rows(db, "SELECT id FROM vc_license_capacity WHERE license_class_code = 'D2'")[0]!.id);
  assert.throws(() => db.prepare("UPDATE vc_license_capacity SET max_passengers = 30 WHERE id = ?").run(d2), /vc_policy_append_only/);
  assert.throws(() => db.prepare("DELETE FROM vc_license_capacity WHERE id = ?").run(d2), /vc_policy_append_only/);
  hangBang(db, "D2", 30);
  assert.deepEqual(rows(db, "SELECT max_passengers AS m FROM vc_license_capacity WHERE license_class_code = 'D2' ORDER BY valid_from_at"), [{ m: 29 }, { m: 30 }]);
});

test("(e) điều kiện xuất bến: đúng MỘT mã giấy tờ theo đối tượng (xe ↔ giấy tờ xe, tài xế ↔ giấy tờ người); mã lạ → khoá ngoại; cỡ xe 1…100", () => {
  const db = all();
  dieuKien(db, { subject: "VEHICLE", xe: "CONTRACT_BADGE" });
  dieuKien(db, { subject: "DRIVER", xe: null, nguoi: "HEALTH_CHECK" });
  assert.throws(() => dieuKien(db, { subject: "VEHICLE", xe: null, nguoi: "HEALTH_CHECK" }), /CHECK constraint failed/, "xe mà mang giấy tờ người");
  assert.throws(() => dieuKien(db, { subject: "VEHICLE", xe: "CONTRACT_BADGE", nguoi: "HEALTH_CHECK" }), /CHECK constraint failed/, "hai mã cùng lúc");
  assert.throws(() => dieuKien(db, { subject: "DRIVER", xe: "CONTRACT_BADGE", nguoi: null }), /CHECK constraint failed/, "tài xế mà mang giấy tờ xe");
  assert.throws(() => dieuKien(db, { subject: "VEHICLE", xe: null, nguoi: null }), /CHECK constraint failed/, "không mã nào");
  assert.throws(() => dieuKien(db, { subject: "OTHER" }), /CHECK constraint failed/);
  assert.throws(() => dieuKien(db, { cho: 0 }), /CHECK constraint failed/);
  assert.throws(() => dieuKien(db, { cho: 101 }), /CHECK constraint failed/);
  assert.throws(() => dieuKien(db, { subject: "VEHICLE", xe: "KHONG_CO" }), /FOREIGN KEY constraint failed/);
  assert.throws(() => dieuKien(db, { subject: "DRIVER", xe: null, nguoi: "KHONG_CO" }), /FOREIGN KEY constraint failed/);
});

test("(b) TC-1 điều kiện xuất bến: đóng MỘT lần được; đóng lần hai → RAISE; mở lại → RAISE; đóng kèm sửa nội dung → RAISE; DELETE → RAISE", () => {
  const db = all();
  const a = dieuKien(db, { cho: 16 });
  dong(db, a);
  assert.deepEqual(rows(db, "SELECT valid_to_at, closed_by FROM vc_departure_rule WHERE id = ?", a), [{ valid_to_at: "2026-09-30T00:00:00.000Z", closed_by: "nv-2" }]);
  assert.throws(() => dong(db, a, "2026-10-01T00:00:00.000Z"), /vc_departure_rule_close_once/, "đóng lần hai");
  assert.throws(() => db.prepare("UPDATE vc_departure_rule SET valid_to_at = NULL, closed_by = NULL WHERE id = ?").run(a), /vc_departure_rule_close_once/, "mở lại");
  const b = dieuKien(db, { cho: 16 });
  assert.throws(
    () => db.prepare("UPDATE vc_departure_rule SET valid_to_at = ?, closed_by = 'nv-2', min_capacity = 30 WHERE id = ?").run("2026-09-30T00:00:00.000Z", b),
    /vc_departure_rule_close_once/,
    "đóng kèm đổi cỡ xe",
  );
  assert.throws(() => db.prepare("UPDATE vc_departure_rule SET min_capacity = 30 WHERE id = ?").run(b), /vc_departure_rule_close_once/, "sửa nội dung khi chưa đóng");
  assert.throws(() => db.prepare("UPDATE vc_departure_rule SET vehicle_document_type_code = 'INSPECTION' WHERE id = ?").run(b), /vc_departure_rule_close_once/);
  assert.throws(() => db.prepare("UPDATE vc_departure_rule SET valid_to_at = '2026-08-01T00:00:00.000Z', closed_by = 'nv-2' WHERE id = ?").run(b), /CHECK constraint failed/, "đóng trước ngày hiệu lực");
  assert.throws(() => db.prepare("DELETE FROM vc_departure_rule WHERE id = ?").run(a), /vc_departure_rule_no_delete/);
  assert.throws(() => db.prepare("DELETE FROM vc_departure_rule WHERE id = ?").run(b), /vc_departure_rule_no_delete/);
});

test("(b) TC-1 danh mục lý do: DELETE → RAISE (ngưng = active 0); không đổi mã, nhóm, mốc tạo; sửa nhãn / thứ tự / ngưng được; nhãn 1…80 ký tự", () => {
  const db = all();
  assert.throws(() => db.prepare("DELETE FROM vc_reason WHERE code = 'PHA_LE_KHAC'").run(), /vc_reason_no_delete/);
  db.prepare("UPDATE vc_reason SET label = 'Lý do khác', sort_order = 5, active = 0, updated_at = ?, updated_by = 'nv-1' WHERE code = 'PHA_LE_KHAC'").run(AT);
  assert.deepEqual(rows(db, "SELECT label, active FROM vc_reason WHERE code = 'PHA_LE_KHAC'"), [{ label: "Lý do khác", active: 0 }]);
  assert.throws(() => db.prepare("UPDATE vc_reason SET reason_group = 'HUY_CHUYEN' WHERE code = 'PHA_LE_SU_CO'").run(), /vc_reason_identity/, "đổi nhóm");
  assert.throws(() => db.prepare("UPDATE vc_reason SET code = 'PHA_LE_MOI' WHERE code = 'PHA_LE_SU_CO'").run(), /vc_reason_identity/, "đổi mã");
  assert.throws(() => db.prepare("UPDATE vc_reason SET created_at = ? WHERE code = 'PHA_LE_SU_CO'").run(AT), /vc_reason_identity/, "đổi mốc tạo");
  lyDo(db, "PHA_LE_THU");
  assert.throws(() => lyDo(db, "PHA_LE_THU"), /UNIQUE constraint failed/);
  assert.throws(() => lyDo(db, "pha_le_thuong"), /CHECK constraint failed/, "mã chữ HOA");
  assert.throws(() => lyDo(db, "PHA_LE_DAI", "PHA_LE", "x".repeat(81)), /CHECK constraint failed/);
  assert.throws(() => lyDo(db, "PHA_LE_RONG", "PHA_LE", "  "), /CHECK constraint failed/);
});

test("(f) sổ dữ liệu có bốn bảng mới của van-chuyen (vc_reason là bảng tra cứu — khoá mã)", () => {
  const dict = JSON.parse(readFileSync(new URL("../docs/data-dictionary.json", import.meta.url), "utf8")) as { tables: { name: string; module: string; kind: string }[] };
  const pick = (name: string) => dict.tables.find((t) => t.name === name);
  // 0071 thêm ghi chú hai cột giờ lái (ADR-0055 VK2-B) — so tên / module / loại.
  const { name, module, kind } = pick("vc_dispatch_policy")!;
  assert.deepEqual({ name, module, kind }, { name: "vc_dispatch_policy", module: "van-chuyen", kind: "table" });
  assert.deepEqual(pick("vc_departure_rule"), { name: "vc_departure_rule", module: "van-chuyen", kind: "table" });
  assert.deepEqual(pick("vc_license_capacity"), { name: "vc_license_capacity", module: "van-chuyen", kind: "table" });
  assert.deepEqual(pick("vc_reason"), { name: "vc_reason", module: "van-chuyen", kind: "lookup" });
});
