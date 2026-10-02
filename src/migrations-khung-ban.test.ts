// Kiểm migration *_khung_ban_gio_lai.sql (ADR-0055 VK2-A A1–A2, VK2-B B1; ADR-0053 D9.1 hình bảng dùng chung) — lớp CSDL, chèn/sửa THẲNG SQL.
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const MATCHES = files.filter((f) => f.endsWith("_khung_ban_gio_lai.sql"));
const SQL_SUA = process.env.KHUNG_BAN_SQL ? readFileSync(process.env.KHUNG_BAN_SQL, "utf8") : null; // P16: bản sao đã sửa cố ý
const sqlOf = (f: string) => (MATCHES.includes(f) && SQL_SUA !== null ? SQL_SUA : readFileSync(new URL(f, DIR), "utf8"));
const AT = "2026-10-01T03:00:00.000Z";
const DAY = "2026-10-05";
const H = 3_600_000;
const ms = (hhmm: string, d = 0) => Date.parse(`${DAY}T${hhmm}:00.000+07:00`) + d * 86_400_000;
const iso = (m: number) => new Date(m).toISOString();
let n = 0;
const nid = (p: string) => `${p}-${++n}`;
type Db = DatabaseSync;
function openDb(): Db {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of files) db.exec(sqlOf(f));
  return db;
}
const run = (db: Db, sql: string, ...a: (string | number | null)[]) => db.prepare(sql).run(...a);
const one = <T>(db: Db, sql: string, ...a: (string | number | null)[]) => db.prepare(sql).get(...a) as T;
const congTyChu = (db: Db) => one<{ party_id: string }>(db, "SELECT party_id FROM v_pty_owner_company").party_id;
function xe(db: Db): string {
  const id = nid("xe");
  const bien = `79B${String(n).padStart(5, "0")}`;
  run(db, `INSERT INTO vc_vehicle (id, plate_number, plate_key, chassis_number, chassis_key, name, model_year, passenger_capacity, owner_party_id, status, valid_from_date,
     created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'Xe thử', 2020, 15, ?, 'active', '2026-09-01', ?, ?)`, id, bien, bien, `KHUNG${n}`, `KHUNG${n}`, congTyChu(db), AT, AT);
  return id;
}
/** Chuyến PLANNED (ADR-0057: fixture chèn PLANNED rồi UPDATE nếu cần trạng thái khác). */
function chuyen(db: Db, x: string, tu: number, den: number): string {
  const id = nid("tr");
  const ngay = new Date(tu + 7 * H).toISOString().slice(0, 10);
  run(db, `INSERT INTO vc_trip (id, code, vehicle_id, carrier_party_id, service_date, planned_start_ms, planned_end_ms, earliest_start_ms, rest_minutes_snapshot, last_cmd_id,
     created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 30, ?, ?, ?)`, id, `CX-${id}`, x, congTyChu(db), ngay, tu, den, tu, randomUUID(), AT, AT);
  return id;
}
const huy = (db: Db, t: string) => run(db, "UPDATE vc_trip SET status = 'CANCELLED', cancel_reason_code = 'HUY_KHAC' WHERE id = ?", t);
/** Chèn khung bận; trả id. `o.subject` mặc định VEHICLE. */
function khung(db: Db, o: { xe?: string | null; taiXe?: string | null; tu: number; den: number; lyDo?: string; subject?: string }): string {
  const id = nid("kb");
  run(db, `INSERT INTO vc_unavailability (id, subject, vehicle_id, driver_party_id, start_ms, end_ms, start_at, end_at, reason_code, created_at, created_by, updated_at, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 's1', ?, 's1')`,
    id, o.subject ?? "VEHICLE", o.xe ?? null, o.taiXe ?? null, o.tu, o.den, iso(o.tu), iso(o.den), o.lyDo ?? "BAN_XE_BAO_DUONG", AT, AT);
  return id;
}
const rut = (db: Db, id: string, v = 1) =>
  run(db, "UPDATE vc_unavailability SET withdrawn_at = ?, withdrawn_by = 's1', version = ?, updated_at = ?, updated_by = 's1' WHERE id = ?", AT, v + 1, AT, id);

test("đúng MỘT tệp 0071_khung_ban_gio_lai.sql (số đã cấp); chỉ-thêm (không DROP, không dựng lại bảng cũ)", () => {
  assert.equal(MATCHES.length, 1, `cần đúng một tệp, có ${MATCHES.length}`);
  assert.equal(MATCHES[0], "0071_khung_ban_gio_lai.sql");
  assert.doesNotMatch(sqlOf(MATCHES[0]!), /DROP\s+(TABLE|TRIGGER)|vc_dispatch_policy_new|vc_trip_new/i);
});

test("TC-K1 (ADR tiêu chí 1): ghi khung 08:00–17:00 cho xe có chuyến 09:00 chưa huỷ → trigger chặn; chuyến đó huỷ → ghi được", () => {
  const db = openDb();
  const x = xe(db);
  const t = chuyen(db, x, ms("09:00"), ms("11:00"));
  assert.throws(() => khung(db, { xe: x, tu: ms("08:00"), den: ms("17:00") }), /unavailability_overlaps_trip/);
  huy(db, t);
  assert.doesNotThrow(() => khung(db, { xe: x, tu: ms("08:00"), den: ms("17:00") }));
});

test("TC-K1b: khoảng nửa mở — khung bắt đầu đúng lúc chuyến kết thúc dự kiến → được; kết thúc đúng lúc chuyến bắt đầu → được", () => {
  const db = openDb();
  const x = xe(db);
  chuyen(db, x, ms("09:00"), ms("11:00"));
  assert.doesNotThrow(() => khung(db, { xe: x, tu: ms("11:00"), den: ms("12:00") }), "[11:00, 12:00) không chồng [09:00, 11:00)");
  assert.doesNotThrow(() => khung(db, { xe: x, tu: ms("07:00"), den: ms("09:00") }), "[07:00, 09:00) không chồng [09:00, 11:00)");
});

test("TC-K2 (ADR tiêu chí 2): tạo chuyến / dời giờ / đổi xe vào khung còn hiệu lực → trigger lc03_unavailable; khung đã rút → không chặn", () => {
  const db = openDb();
  const x = xe(db);
  const x2 = xe(db);
  const k = khung(db, { xe: x, tu: ms("08:00"), den: ms("17:00") });
  assert.throws(() => chuyen(db, x, ms("09:00"), ms("10:00")), /lc03_unavailable/, "tạo chuyến vào khung");
  const t = chuyen(db, x, ms("18:00"), ms("19:00"));
  // Cô lập: hạ cả earliest_start_ms (CHECK earliest ≤ planned_start của 0042) — để chỉ trigger khung bận còn lý do chặn.
  assert.throws(() => run(db, "UPDATE vc_trip SET planned_start_ms = ?, planned_end_ms = ?, earliest_start_ms = ?, service_date = ? WHERE id = ?", ms("16:00"), ms("17:30"), ms("16:00"), DAY, t), /lc03_unavailable/, "dời giờ");
  const t2 = chuyen(db, x2, ms("09:00"), ms("10:00"));
  assert.throws(() => run(db, "UPDATE vc_trip SET vehicle_id = ? WHERE id = ?", x, t2), /lc03_unavailable/, "đổi xe");
  rut(db, k);
  assert.doesNotThrow(() => chuyen(db, x, ms("09:00"), ms("10:00")), "khung đã rút không chặn");
});

test("TC-K3 (ADR tiêu chí 3): UPDATE giờ / đối tượng / lý do, DELETE, rút lần hai → chặn; ghi khung DRIVER → chặn", () => {
  const db = openDb();
  const x = xe(db);
  const k = khung(db, { xe: x, tu: ms("08:00"), den: ms("17:00") });
  for (const sql of [
    "UPDATE vc_unavailability SET start_ms = start_ms + 60000 WHERE id = ?",
    "UPDATE vc_unavailability SET reason_code = 'BAN_XE_KHAC' WHERE id = ?",
    "UPDATE vc_unavailability SET withdrawn_at = '2026-10-01T03:00:00.000Z', withdrawn_by = 's1' WHERE id = ?", // không tăng version
  ]) assert.throws(() => run(db, sql, k), /vc_unavailability_append_only/, sql);
  assert.throws(() => run(db, "DELETE FROM vc_unavailability WHERE id = ?", k), /vc_unavailability_append_only/);
  rut(db, k);
  assert.throws(() => rut(db, k, 2), /vc_unavailability_append_only/, "rút lần hai");
  // Cô lập hàng rào: dòng DRIVER hợp lệ ở MỌI luật khác (lý do nhóm BAN_TAI_XE có thật) — chỉ driver_closed được phép chặn (thứ tự trigger không bảo đảm).
  run(db, "INSERT INTO vc_reason (code, reason_group, label, sort_order, created_at, updated_at) VALUES ('BAN_TAI_XE_THU', 'BAN_TAI_XE', 'Thử', 1, ?, ?)", AT, AT);
  const p = congTyChu(db);
  assert.throws(() => khung(db, { subject: "DRIVER", taiXe: p, tu: ms("08:00"), den: ms("17:00"), lyDo: "BAN_TAI_XE_THU" }), /unavailability_driver_closed/);
});

test("TC-K4: CHECK hình dạng — đúng một đối tượng; kết thúc > bắt đầu; phút tròn; *_at khớp *_ms; lý do đúng nhóm theo đối tượng; chèn đã rút → chặn", () => {
  const db = openDb();
  const x = xe(db);
  assert.throws(() => khung(db, { xe: x, taiXe: congTyChu(db), tu: ms("08:00"), den: ms("09:00") }), /CHECK constraint failed/, "hai đối tượng");
  assert.throws(() => khung(db, { xe: null, tu: ms("08:00"), den: ms("09:00") }), /CHECK constraint failed/, "VEHICLE thiếu xe");
  assert.throws(() => khung(db, { xe: x, tu: ms("09:00"), den: ms("09:00") }), /CHECK constraint failed/, "kết thúc = bắt đầu");
  assert.throws(() => khung(db, { xe: x, tu: ms("09:00") + 1000, den: ms("10:00") }), /CHECK constraint failed/, "không tròn phút");
  assert.throws(() => run(db, `INSERT INTO vc_unavailability (id, subject, vehicle_id, start_ms, end_ms, start_at, end_at, reason_code, created_at, updated_at)
     VALUES ('kb-lech', 'VEHICLE', ?, ?, ?, '2026-10-05T00:00:00.000Z', ?, 'BAN_XE_KHAC', ?, ?)`, x, ms("08:00"), ms("09:00"), iso(ms("09:00")), AT, AT), /CHECK constraint failed/, "start_at lệch start_ms");
  assert.throws(() => khung(db, { xe: x, tu: ms("08:00"), den: ms("09:00"), lyDo: "HUY_KHAC" }), /unavailability_reason_group/, "lý do nhóm khác");
  assert.throws(() => run(db, `INSERT INTO vc_unavailability (id, subject, vehicle_id, start_ms, end_ms, start_at, end_at, reason_code, withdrawn_at, withdrawn_by, created_at, updated_at)
     VALUES ('kb-rut', 'VEHICLE', ?, ?, ?, ?, ?, 'BAN_XE_KHAC', ?, 's1', ?, ?)`, x, ms("08:00"), ms("09:00"), iso(ms("08:00")), iso(ms("09:00")), AT, AT, AT), /vc_unavailability_append_only/, "chèn dòng đã rút");
});

test("TC-K5 (Review Focus 2 — hai người bấm cùng lúc): cả hai thứ tự — chuyến trước rồi khung, khung trước rồi chuyến — bên sau bị chặn, bên trước còn nguyên", () => {
  const a = openDb();
  const xa = xe(a);
  chuyen(a, xa, ms("09:00"), ms("10:00"));
  assert.throws(() => khung(a, { xe: xa, tu: ms("08:00"), den: ms("12:00") }), /unavailability_overlaps_trip/);
  assert.equal(one<{ c: number }>(a, "SELECT count(*) c FROM vc_unavailability").c, 0);
  const b = openDb();
  const xb = xe(b);
  khung(b, { xe: xb, tu: ms("08:00"), den: ms("12:00") });
  assert.throws(() => chuyen(b, xb, ms("09:00"), ms("10:00")), /lc03_unavailable/);
  assert.equal(one<{ c: number }>(b, "SELECT count(*) c FROM vc_trip WHERE vehicle_id = ?", xb).c, 0);
});

test("TC-K6 (Review Focus 1): khung 23:00 D → 07:00 D+1 chặn chuyến 06:00 D+1 (= 23:00 UTC ngày D) và chuyến 23:30 D; không chặn chuyến 07:00 D+1", () => {
  const db = openDb();
  const x = xe(db);
  khung(db, { xe: x, tu: ms("23:00"), den: ms("07:00", 1) });
  assert.throws(() => chuyen(db, x, ms("06:00", 1), ms("06:30", 1)), /lc03_unavailable/);
  assert.throws(() => chuyen(db, x, ms("23:30"), ms("01:00", 1)), /lc03_unavailable/);
  assert.doesNotThrow(() => chuyen(db, x, ms("07:00", 1), ms("08:00", 1)));
});

test("TC-K7 (VK2-B B1): hai cột chính sách — dòng gieo nhận 480 / 240; ngoài khoảng → CHECK chặn; bảng vẫn chỉ-thêm", () => {
  const db = openDb();
  const r = one<{ d: number; b: number }>(db, "SELECT duty_day_max_minutes d, trip_no_break_max_minutes b FROM vc_dispatch_policy ORDER BY valid_from_at LIMIT 1");
  assert.deepEqual({ ...r }, { d: 480, b: 240 });
  const chen = (d: number, b: number) => run(db, `INSERT INTO vc_dispatch_policy (id, min_lead_minutes, warn_lead_minutes, rest_minutes, require_manifest, require_contract,
     proxy_backdate_max_minutes, duty_day_max_minutes, trip_no_break_max_minutes, valid_from_at, created_at, updated_at) VALUES (?, 360, 120, 30, 1, 0, 180, ?, ?, ?, ?, ?)`,
    nid("cs"), d, b, `2026-10-02T00:00:0${n % 10}.000Z`, AT, AT);
  assert.throws(() => chen(59, 240), /CHECK constraint failed/);
  assert.throws(() => chen(480, 721), /CHECK constraint failed/);
  assert.doesNotThrow(() => chen(600, 300));
  assert.throws(() => run(db, "UPDATE vc_dispatch_policy SET duty_day_max_minutes = 500"), /vc_policy_append_only/);
});

test("gieo nhóm lý do BAN_XE: bốn mã, có 'Khác'", () => {
  const db = openDb();
  const rows = db.prepare("SELECT code, label FROM vc_reason WHERE reason_group = 'BAN_XE' ORDER BY sort_order").all() as { code: string; label: string }[];
  assert.deepEqual(rows.map((r) => r.code), ["BAN_XE_BAO_DUONG", "BAN_XE_DANG_KIEM", "BAN_XE_SUA_CHUA", "BAN_XE_KHAC"]);
  assert.equal(rows.at(-1)!.label, "Khác");
});
