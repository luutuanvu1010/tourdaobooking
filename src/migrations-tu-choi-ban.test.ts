// Kiểm migration *_tai_xe_doi_tac_tu_choi_bao_ban.sql (ADR-0053 D8, D9; kế hoạch A4 T2 — NT-5 phần SQL, NT-6, NT-8 phần SQL) — lớp CSDL, chèn / sửa THẲNG SQL.
// LUẬT ĐỒNG HỒ (kế hoạch A4 §2): trigger B8.3 so với GIỜ THẬT của CSDL — mọi giờ chuyến ở đây gieo TƯƠNG ĐỐI giờ thật (`BAY_GIO`), không dùng ngày cố định.
// P16: `TU_CHOI_BAN_SQL=<tệp>` thay nội dung migration bằng bản sao đã sửa cố ý (bỏ từng trigger) để thấy bài đỏ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const MATCHES = files.filter((f) => f.endsWith("_tai_xe_doi_tac_tu_choi_bao_ban.sql"));
const SQL_SUA = process.env.TU_CHOI_BAN_SQL ? readFileSync(process.env.TU_CHOI_BAN_SQL, "utf8") : null;
const sqlOf = (f: string) => (MATCHES.includes(f) && SQL_SUA !== null ? SQL_SUA : readFileSync(new URL(f, DIR), "utf8"));
const H = 3_600_000;
const PHUT = 60_000;
/** Giờ thật, tròn phút — gốc của mọi giờ chuyến (B8.3 so giờ CSDL thật). */
const BAY_GIO = Math.floor(Date.now() / PHUT) * PHUT;
const AT = new Date(BAY_GIO).toISOString();
const MO_LAI = new Date(BAY_GIO - H).toISOString();
let n = 0;
const nid = (p: string) => `${p}-${++n}`;
type Db = DatabaseSync;
function openDb(o: { truocMigration?: boolean } = {}): Db {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of files) if (!(o.truocMigration && MATCHES.includes(f))) db.exec(sqlOf(f));
  return db;
}
const run = (db: Db, sql: string, ...a: (string | number | null)[]) => db.prepare(sql).run(...a);
const one = <T>(db: Db, sql: string, ...a: (string | number | null)[]) => db.prepare(sql).get(...a) as T;
const congTyChu = (db: Db) => one<{ party_id: string }>(db, "SELECT party_id FROM v_pty_owner_company").party_id;
function nguoi(db: Db): string {
  const id = nid("p");
  run(db, "INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'PERSON', 'Tài xế thử', 1, ?, ?)", id, AT, AT);
  run(db, "INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES (?, 'Tài xế thử', ?, ?)", id, AT, AT);
  return id;
}
function xe(db: Db): string {
  const id = nid("xe");
  const bien = `79B${String(n).padStart(5, "0")}`;
  run(db, `INSERT INTO vc_vehicle (id, plate_number, plate_key, chassis_number, chassis_key, name, model_year, passenger_capacity, owner_party_id, status, valid_from_date,
     created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'Xe thử', 2020, 15, ?, 'active', '2026-09-01', ?, ?)`, id, bien, bien, `KHUNG${n}`, `KHUNG${n}`, congTyChu(db), AT, AT);
  return id;
}
/** Chuyến PLANNED của xe mới, bắt đầu `tu`, dài 2 giờ. */
function chuyen(db: Db, tu: number, den = tu + 2 * H): string {
  const id = nid("tr");
  const ngay = new Date(tu + 7 * H).toISOString().slice(0, 10);
  run(db, `INSERT INTO vc_trip (id, code, vehicle_id, carrier_party_id, service_date, planned_start_ms, planned_end_ms, earliest_start_ms, rest_minutes_snapshot, last_cmd_id,
     created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 30, ?, ?, ?)`, id, `CX-${id}`, xe(db), congTyChu(db), ngay, tu, den, tu, randomUUID(), AT, AT);
  return id;
}
function lai(db: Db, trip: string, taiXe: string, tu = MO_LAI): string {
  const id = nid("dr");
  run(db, "INSERT INTO vc_trip_driver (id, trip_id, driver_party_id, valid_from_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)", id, trip, taiXe, tu, tu, tu);
  return id;
}
const han = (db: Db, trip: string, taiXe: string) =>
  one<{ deadline_ms: number; lead_minutes: number } | undefined>(db, "SELECT deadline_ms, lead_minutes FROM vc_refuse_deadline WHERE trip_id = ? AND driver_party_id = ?", trip, taiXe);
const dongLai = (db: Db, id: string, o: { ly?: string; lyDo?: string | null; nguoiDong?: string | null } = {}) =>
  run(db, `UPDATE vc_trip_driver SET valid_to_at = ?, close_reason = ?, refuse_reason_code = ?, closed_by_party_id = ?, closed_by = 's1', updated_at = ? WHERE id = ?`,
    new Date(BAY_GIO).toISOString(), o.ly ?? "REFUSED", o.lyDo === undefined ? "TCC_KHAC" : o.lyDo, o.nguoiDong ?? null, new Date(BAY_GIO).toISOString(), id);
const doiGio = (db: Db, trip: string, tu: number) =>
  run(db, "UPDATE vc_trip SET service_date = ?, planned_start_ms = ?, planned_end_ms = ?, earliest_start_ms = ?, updated_at = ? WHERE id = ?", new Date(tu + 7 * H).toISOString().slice(0, 10), tu, tu + 2 * H, tu, AT, trip);
function khungTaiXe(db: Db, taiXe: string, tu: number, den: number, lyDo = "BTX_OM"): string {
  const id = nid("kb");
  run(db, `INSERT INTO vc_unavailability (id, subject, driver_party_id, start_ms, end_ms, start_at, end_at, reason_code, created_at, created_by, updated_at, updated_by)
     VALUES (?, 'DRIVER', ?, ?, ?, ?, ?, ?, ?, 's1', ?, 's1')`, id, taiXe, tu, den, new Date(tu).toISOString(), new Date(den).toISOString(), lyDo, AT, AT);
  return id;
}

test("đúng MỘT tệp 0092_tai_xe_doi_tac_tu_choi_bao_ban.sql; DROP duy nhất là trigger chặn khung DRIVER của 0071 (đã hẹn); có chú thích hoàn tác + ngoại lệ giờ CSDL", () => {
  assert.equal(MATCHES.length, 1, `cần đúng một tệp, có ${MATCHES.length}`);
  assert.equal(MATCHES[0], "0092_tai_xe_doi_tac_tu_choi_bao_ban.sql");
  const sql = readFileSync(new URL(MATCHES[0]!, DIR), "utf8");
  const drop = [...sql.replace(/--[^\n]*/g, "").matchAll(/DROP\s+(TABLE|TRIGGER|INDEX|VIEW)\s+(\w+)/gi)].map((m) => m[2]);
  assert.deepEqual(drop, ["vc_unavailability_driver_closed"]);
  assert.match(sql, /HOÀN TÁC/);
  assert.match(sql, /NGOẠI LỆ CÓ TÊN "GIỜ CSDL"/);
});

test("gieo: hạn cho mọi dòng lái ĐANG MỞ lúc áp = giờ chạy − 720 phút; dòng đã đóng không gieo; lý do hai nhóm mới; chính sách gieo 720 phút, chưa có SĐT văn phòng", () => {
  const db = openDb({ truocMigration: true });
  const t1 = chuyen(db, BAY_GIO + 30 * H);
  const a = nguoi(db);
  lai(db, t1, a);
  const t2 = chuyen(db, BAY_GIO + 60 * H);
  const b = nguoi(db);
  const d2 = lai(db, t2, b);
  run(db, "UPDATE vc_trip_driver SET valid_to_at = ?, close_reason = 'REASSIGNED', updated_at = ? WHERE id = ?", AT, AT, d2);
  db.exec(sqlOf(MATCHES[0]!));
  assert.deepEqual({ ...han(db, t1, a) }, { deadline_ms: BAY_GIO + 30 * H - 720 * PHUT, lead_minutes: 720 });
  assert.equal(han(db, t2, b), undefined, "dòng lái đã đóng: không gieo");
  const lyDo = db.prepare("SELECT reason_group g, count(*) c FROM vc_reason WHERE reason_group IN ('TU_CHOI_CHUYEN', 'BAN_TAI_XE') GROUP BY reason_group ORDER BY g").all();
  assert.deepEqual(lyDo.map((r) => ({ ...r })), [{ g: "BAN_TAI_XE", c: 3 }, { g: "TU_CHOI_CHUYEN", c: 4 }]);
  assert.deepEqual({ ...one(db, "SELECT refuse_lead_minutes r, office_phone p FROM vc_dispatch_policy") }, { r: 720, p: null });
});

test("trigger hạn: dòng lái mới → hạn theo chính sách hiệu lực lúc mở dòng; mở trước mọi dòng chính sách → 720 (G-A4-27); chính sách CHECK 60–2880, SĐT dạng 0xxxxxxxxx", () => {
  const db = openDb();
  run(db, `INSERT INTO vc_dispatch_policy (id, min_lead_minutes, warn_lead_minutes, rest_minutes, require_manifest, require_contract, proxy_backdate_max_minutes, refuse_lead_minutes,
     office_phone, valid_from_at, created_at, updated_at) VALUES ('pol-2', 360, 120, 30, 1, 0, 180, 600, '0901234567', '2026-10-08T00:00:00.000Z', ?, ?)`, AT, AT);
  const t = chuyen(db, BAY_GIO + 30 * H);
  const a = nguoi(db);
  lai(db, t, a, "2026-10-09T00:00:00.000Z");
  assert.deepEqual({ ...han(db, t, a) }, { deadline_ms: BAY_GIO + 30 * H - 600 * PHUT, lead_minutes: 600 });
  const t2 = chuyen(db, BAY_GIO + 40 * H);
  const b = nguoi(db);
  lai(db, t2, b, "2020-01-01T00:00:00.000Z");
  assert.deepEqual({ ...han(db, t2, b) }, { deadline_ms: BAY_GIO + 40 * H - 720 * PHUT, lead_minutes: 720 }, "không dòng chính sách nào khớp → 720, không bỏ qua cặp");
  for (const [cot, gt] of [["refuse_lead_minutes", 59], ["refuse_lead_minutes", 2881], ["office_phone", "1900123456"], ["office_phone", "090123456"]] as const) {
    assert.throws(() => run(db, `INSERT INTO vc_dispatch_policy (id, min_lead_minutes, warn_lead_minutes, rest_minutes, require_manifest, require_contract, proxy_backdate_max_minutes,
       ${cot}, valid_from_at, created_at, updated_at) VALUES (?, 360, 120, 30, 1, 0, 180, ?, ?, ?, ?)`, nid("pol"), gt, `2026-10-1${n % 9}T00:00:00.000Z`, AT, AT), /CHECK constraint failed/, `${cot}=${gt}`);
  }
});

test("NT-5 khoá dính: đổi người rồi xếp lại đúng tài xế → dùng hạn cũ; dời muộn → 200, hạn không đổi; dời sớm → hạn giảm; dời lại giờ cũ → giữ mốc sớm", () => {
  const db = openDb();
  const tu = BAY_GIO + 30 * H;
  const t = chuyen(db, tu);
  const a = nguoi(db);
  const d1 = lai(db, t, a);
  const goc = han(db, t, a)!.deadline_ms;
  run(db, "UPDATE vc_trip_driver SET valid_to_at = ?, close_reason = 'REASSIGNED', updated_at = ? WHERE id = ?", AT, AT, d1);
  const b = nguoi(db);
  const d2 = lai(db, t, b);
  run(db, "UPDATE vc_trip_driver SET valid_to_at = ?, close_reason = 'REASSIGNED', updated_at = ? WHERE id = ?", AT, AT, d2);
  lai(db, t, a);
  assert.equal(han(db, t, a)!.deadline_ms, goc, "xếp lại đúng tài xế: hạn cũ của cặp");
  assert.equal(one<{ c: number }>(db, "SELECT count(*) c FROM vc_refuse_deadline WHERE trip_id = ?", t).c, 2, "một dòng mỗi cặp");
  doiGio(db, t, tu + 24 * H);
  assert.equal(han(db, t, a)!.deadline_ms, goc, "dời muộn: hạn không tăng, lệnh dời không lỗi");
  doiGio(db, t, tu - 3 * H);
  assert.equal(han(db, t, a)!.deadline_ms, goc - 3 * H, "dời sớm: hạn giảm theo");
  doiGio(db, t, tu);
  assert.equal(han(db, t, a)!.deadline_ms, goc - 3 * H, "dời lại giờ cũ: giữ mốc sớm");
});

test("NT-5 lớp CSDL của dòng hạn: UPDATE không giảm / tăng / đổi cặp / đổi số phút → rd_; DELETE → rd_", () => {
  const db = openDb();
  const t = chuyen(db, BAY_GIO + 30 * H);
  const a = nguoi(db);
  lai(db, t, a);
  const k = [t, a] as const;
  for (const sql of [
    "UPDATE vc_refuse_deadline SET updated_at = 'x' WHERE trip_id = ? AND driver_party_id = ?",
    "UPDATE vc_refuse_deadline SET deadline_ms = deadline_ms WHERE trip_id = ? AND driver_party_id = ?",
    "UPDATE vc_refuse_deadline SET deadline_ms = deadline_ms + 1 WHERE trip_id = ? AND driver_party_id = ?",
    "UPDATE vc_refuse_deadline SET deadline_ms = deadline_ms - 1, lead_minutes = 60 WHERE trip_id = ? AND driver_party_id = ?",
    `UPDATE vc_refuse_deadline SET deadline_ms = deadline_ms - 1, driver_party_id = '${nguoi(db)}' WHERE trip_id = ? AND driver_party_id = ?`,
    "DELETE FROM vc_refuse_deadline WHERE trip_id = ? AND driver_party_id = ?",
  ]) assert.throws(() => run(db, sql, ...k), /\brd_/, sql);
  run(db, "UPDATE vc_refuse_deadline SET deadline_ms = deadline_ms - 1 WHERE trip_id = ? AND driver_party_id = ?", ...k); // giảm nghiêm: được
});

test("NT-6 lớp CSDL Từ chối: người đóng ≠ tài xế → tc82_; sau hạn → tc83_; chuyến không còn PLANNED → tc83_; lý do khi không REFUSED → CHECK; nhóm khác → tc84_; mở lại → lc04; chèn REFUSED → tc82_", () => {
  const db = openDb();
  const a = nguoi(db);
  const t = chuyen(db, BAY_GIO + 30 * H); // hạn = +18 giờ: còn hạn
  const d = lai(db, t, a);
  assert.throws(() => dongLai(db, d, { nguoiDong: nguoi(db) }), /tc82_/, "người đóng là người khác");
  assert.throws(() => dongLai(db, d, { nguoiDong: null }), /tc82_/, "thiếu người đóng");
  assert.throws(() => dongLai(db, d, { ly: "REASSIGNED", lyDo: "TCC_KHAC" }), /CHECK constraint failed/, "lý do Từ chối mà không REFUSED");
  assert.throws(() => dongLai(db, d, { nguoiDong: a, lyDo: null }), /CHECK constraint failed/, "REFUSED thiếu lý do");
  assert.throws(() => dongLai(db, d, { nguoiDong: a, lyDo: "BTX_OM" }), /tc84_/, "lý do nhóm Báo bận");
  // sau hạn: chuyến 6 giờ nữa, hạn 12 giờ → hạn đã qua 6 giờ
  const t2 = chuyen(db, BAY_GIO + 6 * H);
  const d2 = lai(db, t2, a);
  assert.throws(() => dongLai(db, d2, { nguoiDong: a }), /tc83_/, "sau hạn");
  // biên: hạn = giờ thật + 1 phút → còn hạn (được); hạn đã lùi về giờ thật − 1 phút → tc83_
  const t3 = chuyen(db, BAY_GIO + 12 * H + PHUT);
  const d3 = lai(db, t3, a);
  dongLai(db, d3, { nguoiDong: a });
  assert.deepEqual({ ...one(db, "SELECT close_reason c, refuse_reason_code r, closed_by_party_id p FROM vc_trip_driver WHERE id = ?", d3) }, { c: "REFUSED", r: "TCC_KHAC", p: a });
  assert.throws(() => run(db, "UPDATE vc_trip_driver SET valid_to_at = NULL, close_reason = NULL, refuse_reason_code = NULL, closed_by_party_id = NULL WHERE id = ?", d3), /lc04_close_once/, "mở lại dòng đã đóng");
  // chuyến không còn PLANNED (đã huỷ) — cô lập: bỏ trigger LC-06 của dòng lái (thứ tự trigger không bảo đảm) để chỉ B8.3 được phép chặn
  const t4 = chuyen(db, BAY_GIO + 40 * H);
  const d4 = lai(db, t4, a);
  run(db, "UPDATE vc_trip SET status = 'CANCELLED', cancel_reason_code = 'HUY_KHAC' WHERE id = ?", t4);
  db.exec("DROP TRIGGER vc_trip_driver_trip_final_upd");
  assert.throws(() => dongLai(db, d4, { nguoiDong: a }), /tc83_/, "chuyến đã huỷ");
  assert.throws(() => run(db, `INSERT INTO vc_trip_driver (id, trip_id, driver_party_id, valid_from_at, valid_to_at, close_reason, refuse_reason_code, closed_by_party_id, created_at, updated_at)
     VALUES ('dr-chen', ?, ?, ?, ?, 'REFUSED', 'TCC_KHAC', ?, ?, ?)`, t, a, AT, AT, a, AT, AT), /tc82_/, "chèn thẳng dòng REFUSED");
});

test("NT-8 lớp CSDL Báo bận: khung DRIVER không chồng chuyến → ghi được (bỏ driver_closed); chồng chuyến đang xếp → RAISE; xếp tài xế / dời giờ vào khung → lc03_driver_unavailable; khung đã rút không chặn; lý do nhóm xe → chặn", () => {
  const db = openDb();
  const a = nguoi(db);
  const tu = BAY_GIO + 30 * H;
  const t = chuyen(db, tu);
  lai(db, t, a);
  const k = khungTaiXe(db, a, tu + 4 * H, tu + 8 * H); // sau chuyến: được
  assert.throws(() => khungTaiXe(db, a, tu + H, tu + 3 * H), /unavailability_overlaps_driver_trip/, "chồng chuyến đang xếp");
  assert.throws(() => khungTaiXe(db, a, tu + 10 * H, tu + 11 * H, "BAN_XE_KHAC"), /unavailability_reason_group/, "lý do nhóm xe bận");
  const t2 = chuyen(db, tu + 5 * H);
  assert.throws(() => lai(db, t2, a), /lc03_driver_unavailable/, "xếp tài xế vào chuyến chồng khung bận");
  assert.throws(() => doiGio(db, t, tu + 3 * H), /lc03_driver_unavailable/, "dời giờ chuyến (tài xế đang mở) vào khung bận");
  for (const sql of ["UPDATE vc_unavailability SET start_ms = start_ms + 60000 WHERE id = ?", "DELETE FROM vc_unavailability WHERE id = ?"]) {
    assert.throws(() => run(db, sql, k), /vc_unavailability_append_only/, sql);
  }
  run(db, "UPDATE vc_unavailability SET withdrawn_at = ?, withdrawn_by = 's1', version = 2, updated_at = ?, updated_by = 's1' WHERE id = ?", AT, AT, k);
  lai(db, t2, a); // khung đã rút: không chặn
  doiGio(db, chuyen(db, tu + 50 * H), tu + 51 * H); // chuyến khác không tài xế: không liên quan
});
