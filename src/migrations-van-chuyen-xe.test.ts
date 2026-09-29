// Kiểm migration phân hệ Vận chuyển lượt 1a (ADR-0040 D1; module van-chuyen, tiền tố vc_): xe, giấy tờ xe, danh mục loại giấy tờ xe, chính sách ngưỡng
// "sắp hết hạn". Bất biến sát dữ liệu: biển số duy nhất trong xe CHƯA NGỪNG (kể cả khi DÙNG LẠI xe đã ngừng — R15 điểm 1, lớp CSDL), số khung duy nhất,
// ngừng ⇔ có ngày ngừng, trạng thái tập đóng, không xoá, gia hạn giấy tờ xe là dòng mới (không sửa đè, không tách nhánh), chính sách chỉ-thêm.
// Chèn/sửa THẲNG bằng SQL (không qua mã ứng dụng). Dựng schema bằng node:sqlite từ migrations/*.sql. Tệp tìm theo ĐUÔI tên.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { TRANG_THAI_XE } from "./shared/giay-to.ts";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const MATCHES = files.filter((f) => f.endsWith("_van_chuyen_xe.sql"));
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
const AT = "2026-09-28T03:00:00.000Z";
type Row = Record<string, unknown>;
const rows = (db: DatabaseSync, sql: string, ...a: string[]): Row[] => db.prepare(sql).all(...a).map((r) => ({ ...(r as Row) }));
const triggers = (db: DatabaseSync): string[] => rows(db, "SELECT name FROM sqlite_master WHERE type = 'trigger' ORDER BY name").map((r) => String(r.name));

// Từ migration *_chu_xe_nha_xe (ADR-0048 B1.1) chủ xe phải là công ty chủ hoặc hồ sơ đang mở vai Nhà xe đối tác (trigger): chủ xe thử mở vai CARRIER.
// `before()` (dựng tới trước tệp 0033) chưa có mã vai đó — hàm này chỉ dùng với `all()`.
function chuXe(db: DatabaseSync, id = "o-chu"): string {
  db.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'ORGANIZATION', 'Chủ xe thử', 1, ?, ?)").run(id, AT, AT);
  db.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, location_id, valid_from_date, created_at, updated_at) VALUES (?, ?, 'CARRIER', NULL, '2026-09-01', ?, ?)")
    .run(`r-${id}`, id, AT, AT);
  return id;
}
let n = 0;
const bienKey = (b: string) => b.toUpperCase().replace(/[\s.\-]/g, "");
interface Xe { id?: string; bien: string; khung?: string | null; cho?: number; trangThai?: string; tu?: string; den?: string | null; chu?: string }
function xe(db: DatabaseSync, v: Xe): string {
  const id = v.id ?? `xe-${++n}`;
  const khung = v.khung === undefined ? `KHUNGTHU${++n}` : v.khung;
  db.prepare(
    `INSERT INTO vc_vehicle (id, plate_number, plate_key, chassis_number, chassis_key, name, model_year, passenger_capacity, owner_party_id, status, valid_from_date,
       valid_to_date, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, 'Xe thử', 2020, ?, ?, ?, ?, ?, ?, NULL, ?, NULL)`,
  ).run(id, v.bien, bienKey(v.bien), khung, khung === null ? null : khung.toUpperCase(), v.cho ?? 15, v.chu ?? "o-chu", v.trangThai ?? "active", v.tu ?? "2026-09-01", v.den ?? null, AT, AT);
  return id;
}
const ngung = (db: DatabaseSync, id: string) => db.prepare("UPDATE vc_vehicle SET status = 'retired', valid_to_date = '2026-09-28', updated_at = ? WHERE id = ?").run("2026-09-28T04:00:00.000Z", id);
const dungLai = (db: DatabaseSync, id: string) => db.prepare("UPDATE vc_vehicle SET status = 'active', valid_to_date = NULL, updated_at = ? WHERE id = ?").run("2026-09-28T05:00:00.000Z", id);
interface Gt { id?: string; xe: string; type?: string; so?: string | null; het?: string | null; truoc?: string; huy?: boolean }
function giayTo(db: DatabaseSync, g: Gt): string {
  const id = g.id ?? `gt-${++n}`;
  db.prepare(
    `INSERT INTO vc_vehicle_document (id, vehicle_id, document_type_code, document_number, issued_date, expiry_date, previous_id, voided_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?)`,
  ).run(id, g.xe, g.type ?? "INSPECTION", g.so ?? null, g.het ?? null, g.truoc ?? null, g.huy ? AT : null, AT, AT);
  return id;
}

test("(a) đúng một tệp *_van_chuyen_xe.sql; không phải B5; mọi trigger mới tên vc_*; không dãy ≥ 8 chữ số (bỏ chú thích, ngày giờ, UUID), không '@'", () => {
  assert.equal(MATCHES.length, 1, `phải có đúng một tệp *_van_chuyen_xe.sql, thấy: ${JSON.stringify(MATCHES)}`);
  assert.doesNotMatch(FILE, /staff_party_required/);
  const db = before();
  const truoc = new Set(triggers(db));
  db.exec(sqlOf(FILE));
  const moi = triggers(db).filter((t) => !truoc.has(t));
  assert.ok(moi.length >= 8, `phải có các trigger mới, thấy ${JSON.stringify(moi)}`);
  for (const t of moi) assert.match(t, /^vc_/, `trigger ${t}: tên phải bắt đầu vc_`);
  const code = sqlOf(FILE).split("\n").map((l) => l.replace(/--.*$/, "")).join("\n")
    .replace(/'2026-[0-9T:.\-Z]+'/g, "''").replace(/'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'/g, "''");
  assert.doesNotMatch(code, /\d{8,}/);
  assert.doesNotMatch(code, /@/);
});

test("(b) dữ liệu gieo: 6 loại giấy tờ xe (đúng mã, tên, có hạn, thứ tự); chính sách ngưỡng đúng một dòng 30 ngày; người tạo NULL (hệ thống)", () => {
  const db = all();
  assert.deepEqual(rows(db, "SELECT code, name, has_expiry FROM vc_vehicle_document_type ORDER BY sort_order"), [
    { code: "REGISTRATION", name: "Đăng ký xe", has_expiry: 0 },
    { code: "INSPECTION", name: "Kiểm định", has_expiry: 1 },
    { code: "TPL_INSURANCE", name: "Bảo hiểm trách nhiệm dân sự", has_expiry: 1 },
    { code: "CONTRACT_BADGE", name: "Phù hiệu xe hợp đồng", has_expiry: 1 },
    { code: "TRIP_MONITOR", name: "Giám sát hành trình", has_expiry: 1 },
    { code: "DRIVER_CAMERA", name: "Camera người lái", has_expiry: 1 },
  ]);
  assert.deepEqual(rows(db, "SELECT count(*) AS n FROM vc_vehicle_document_type WHERE active <> 1 OR created_by IS NOT NULL"), [{ n: 0 }]);
  const p = rows(db, "SELECT warn_days, valid_from_at, created_by FROM vc_expiry_policy");
  assert.deepEqual(p, [{ warn_days: 30, valid_from_at: "2026-09-01T00:00:00.000Z", created_by: null }]);
  assert.deepEqual(rows(db, "SELECT count(*) AS n FROM vc_vehicle"), [{ n: 0 }], "không gieo xe nào");
});

test("(c) CHECK trạng thái xe = Object.keys(TRANG_THAI_XE) (tập đóng); giá trị lạ bị chặn", () => {
  const db = all();
  chuXe(db);
  for (const s of Object.keys(TRANG_THAI_XE)) xe(db, { bien: `79B-100.0${++n}`, trangThai: s, den: s === "retired" ? "2026-09-28" : null });
  assert.throws(() => xe(db, { bien: "79B-100.99", trangThai: "broken" }), /CHECK/);
});

test("(d) biển số: duy nhất trong xe CHƯA NGỪNG (khác cách viết vẫn trùng; xe bảo dưỡng vẫn giữ biển); ngừng xe cũ → xe mới dùng lại biển; DÙNG LẠI xe cũ khi biển đã có chủ → chặn (R15 điểm 1)", () => {
  const db = all();
  chuXe(db);
  const cu = xe(db, { bien: "79B-012.34" });
  assert.throws(() => xe(db, { bien: "79B 01234" }), /UNIQUE constraint failed: vc_vehicle\.plate_key/);
  const bd = xe(db, { bien: "51F-111.11", trangThai: "maintenance" });
  assert.throws(() => xe(db, { bien: "51F 11111" }), /UNIQUE constraint failed: vc_vehicle\.plate_key/, "xe bảo dưỡng vẫn giữ biển");
  assert.ok(bd);
  ngung(db, cu);
  xe(db, { bien: "79B-012.34" }); // xe mới dùng lại biển của xe đã ngừng
  assert.throws(() => dungLai(db, cu), /UNIQUE constraint failed: vc_vehicle\.plate_key/, "dùng lại xe cũ khi biển đã thuộc xe khác chưa ngừng");
});

test("(e) số khung: duy nhất (định danh bền), kể cả giữa xe đã ngừng", () => {
  const db = all();
  chuXe(db);
  const a = xe(db, { bien: "79B-200.01", khung: "RL4ABC123XYZ" });
  ngung(db, a);
  assert.throws(() => xe(db, { bien: "79B-200.02", khung: "rl4abc123xyz" }), /UNIQUE constraint failed: vc_vehicle\.chassis_key/);
  xe(db, { bien: "79B-200.03", khung: null }); // cột để trống được (máy chủ mới bắt buộc — Ruling R9)
  xe(db, { bien: "79B-200.04", khung: null });
});

test("(f) ngừng ⇔ có ngày ngừng; số người được chở 1–100", () => {
  const db = all();
  chuXe(db);
  assert.throws(() => xe(db, { bien: "79B-300.01", trangThai: "retired" }), /CHECK/, "ngừng thiếu ngày");
  assert.throws(() => xe(db, { bien: "79B-300.02", den: "2026-09-28" }), /CHECK/, "có ngày ngừng mà chưa ngừng");
  assert.throws(() => xe(db, { bien: "79B-300.03", cho: 0 }), /CHECK/);
  assert.throws(() => xe(db, { bien: "79B-300.04", cho: 101 }), /CHECK/);
  const id = xe(db, { bien: "79B-300.05" });
  assert.throws(() => db.prepare("UPDATE vc_vehicle SET status = 'retired' WHERE id = ?").run(id), /CHECK/, "ngừng không kèm ngày");
});

test("(g) chủ xe là hồ sơ có thật (khoá ngoại tới pty_party)", () => {
  const db = all();
  // Từ migration *_chu_xe_nha_xe (ADR-0048 B1.1) trigger chủ xe BEFORE INSERT chạy trước khoá ngoại nên thông báo là vehicle_owner_not_allowed; khoá ngoại vẫn
  // còn (src/architecture.test.ts đọc PRAGMA foreign_key_list) — khẳng định thêm dưới đây.
  assert.throws(() => xe(db, { bien: "79B-400.01", chu: "khong-co" }), /vehicle_owner_not_allowed/);
  const fk = (db.prepare("PRAGMA foreign_key_list(vc_vehicle)").all() as { from: string; table: string }[]).map((r) => `${r.from}>${r.table}`);
  assert.ok(fk.includes("owner_party_id>pty_party"), `khoá ngoại owner_party_id → pty_party phải còn, thấy ${JSON.stringify(fk)}`);
});

test("(h) không xoá xe, không xoá giấy tờ xe (Hiến chương 5.5)", () => {
  const db = all();
  chuXe(db);
  const x = xe(db, { bien: "79B-500.01" });
  const g = giayTo(db, { xe: x, het: "2027-01-01" });
  assert.throws(() => db.prepare("DELETE FROM vc_vehicle_document WHERE id = ?").run(g), /vehicle_document_no_delete/);
  assert.throws(() => db.prepare("DELETE FROM vc_vehicle WHERE id = ?").run(x), /vehicle_no_delete/);
});

test("(i) giấy tờ xe: không sửa đè dòng đã gia hạn; dòng huỷ không sửa; không đổi xe/loại/dòng trước/mốc tạo; gia hạn nối đúng xe, đúng loại, dòng chưa huỷ; không tách nhánh", () => {
  const db = all();
  chuXe(db);
  const x = xe(db, { bien: "79B-600.01" });
  const y = xe(db, { bien: "79B-600.02" });
  const d1 = giayTo(db, { xe: x, so: "KD-001", het: "2026-12-31" });
  assert.throws(() => giayTo(db, { xe: y, truoc: d1 }), /vehicle_document_renew_mismatch/, "nối sang xe khác");
  assert.throws(() => giayTo(db, { xe: x, type: "TPL_INSURANCE", truoc: d1 }), /vehicle_document_renew_mismatch/, "nối sang loại khác");
  const d2 = giayTo(db, { xe: x, so: "KD-002", het: "2027-12-31", truoc: d1 });
  assert.throws(() => giayTo(db, { xe: x, so: "KD-003", het: "2028-12-31", truoc: d1 }), /UNIQUE constraint failed: vc_vehicle_document\.previous_id/);
  assert.throws(() => db.prepare("UPDATE vc_vehicle_document SET expiry_date = '2027-01-31' WHERE id = ?").run(d1), /vehicle_document_superseded/);
  for (const [set, arg] of [["vehicle_id = ?", y], ["document_type_code = ?", "TPL_INSURANCE"], ["created_at = ?", "2026-01-01T00:00:00.000Z"]] as const) {
    assert.throws(() => db.prepare(`UPDATE vc_vehicle_document SET ${set} WHERE id = ?`).run(arg, d2), /vehicle_document_identity/, set);
  }
  db.prepare("UPDATE vc_vehicle_document SET voided_at = ?, updated_at = ? WHERE id = ?").run(AT, AT, d2);
  assert.throws(() => db.prepare("UPDATE vc_vehicle_document SET expiry_date = '2029-01-01' WHERE id = ?").run(d2), /vehicle_document_voided/);
  assert.throws(() => giayTo(db, { xe: x, truoc: d2 }), /vehicle_document_renew_mismatch/, "nối vào dòng đã huỷ");
  db.prepare("UPDATE vc_vehicle_document SET expiry_date = '2027-01-31' WHERE id = ?").run(d1); // huỷ dòng gia hạn nhầm → dòng trước sửa được
  giayTo(db, { xe: x, so: "KD-004", het: "2028-01-31", truoc: d1 }); // và gia hạn lại được
});

test("(j) chính sách ngưỡng: chỉ thêm (không sửa, không xoá); dòng hiệu lực = valid_from_at mới nhất ≤ bây giờ", () => {
  const db = all();
  assert.throws(() => db.prepare("UPDATE vc_expiry_policy SET warn_days = 7").run(), /expiry_policy_append_only/);
  assert.throws(() => db.prepare("DELETE FROM vc_expiry_policy").run(), /expiry_policy_append_only/);
  db.prepare("INSERT INTO vc_expiry_policy (id, warn_days, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES ('p-2', 7, ?, ?, 's1', ?, 's1')").run(AT, AT, AT);
  const hieuLuc = () => rows(db, "SELECT warn_days FROM vc_expiry_policy WHERE valid_from_at <= ? ORDER BY valid_from_at DESC LIMIT 1", "2026-09-28T09:00:00.000Z")[0]!.warn_days;
  assert.equal(hieuLuc(), 7);
  assert.throws(() => db.prepare("INSERT INTO vc_expiry_policy (id, warn_days, valid_from_at, created_at, updated_at) VALUES ('p-3', 400, ?, ?, ?)").run("2026-09-28T04:00:00.000Z", AT, AT), /CHECK/);
});

test("(k) sổ dữ liệu: module van-chuyen, bốn bảng vc_* (kind table)", () => {
  const dict = JSON.parse(readFileSync(new URL("../docs/data-dictionary.json", import.meta.url), "utf8")) as { modules: string[]; tables: { name: string; module: string; kind: string }[] };
  assert.ok(dict.modules.includes("van-chuyen"));
  for (const t of ["vc_vehicle", "vc_vehicle_document", "vc_vehicle_document_type", "vc_expiry_policy"]) {
    assert.deepEqual(dict.tables.find((x) => x.name === t), { name: t, module: "van-chuyen", kind: "table" }, t);
  }
});
