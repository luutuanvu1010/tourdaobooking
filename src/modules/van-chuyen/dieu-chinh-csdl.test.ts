// Kiểm migration *_dieu_chinh_chuyen.sql (ADR-0097 Đ1–Đ4 — gói A1, V3-B) — LỚP CSDL: chèn / sửa THẲNG SQL trên schema thật dựng từ MỌI migrations/*.sql bằng
// node:sqlite. Phạm vi sự kiện điều chỉnh, cạnh LC-07 RUNNING → PLANNED (thu hồi xuất bến), chặn thu hồi khi đã có tiến độ, LC-15 ngoại lệ CORRECTION (bảng
// Đ2.4 + "điểm chưa DONE"), câu chốt cân lô điều chỉnh, câu chốt D5.3a chỉ cho lô cập nhật điểm, cột corrects_allocation_id bất biến, gieo nhóm DIEU_CHINH.
// Lớp máy chủ: bài route (dieu-chinh-route.test.ts). Bài nào cũng có vế "bỏ trigger thì đi qua" để chứng minh đúng trigger đó chặn.
// P16: biến môi trường DIEU_CHINH_SQL trỏ bản sao đã sửa cố ý của migration này. Quan sát chặn thật 2026-10-08: chín bản sao (bỏ phạm vi sự kiện; cạnh
// RUNNING → PLANNED không điều kiện; bỏ chặn thu hồi khi có tiến độ; nới bảng Đ2.4; bỏ điều kiện điểm chưa DONE; bỏ đường đóng của lô điều chỉnh; bỏ câu
// chốt cân; giữ d53a cũ không phạm vi; bỏ bất biến corrects_allocation_id) → mỗi bản đỏ đúng bài của nó; tệp thật → xanh.
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { gieoMocXep } from "../../../tests/audit/gieo-vc.mjs";

const DIR = new URL("../../../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const MATCHES = files.filter((f) => f.endsWith("_dieu_chinh_chuyen.sql"));
const SQL_SUA = process.env.DIEU_CHINH_SQL ? readFileSync(process.env.DIEU_CHINH_SQL, "utf8") : null;
const sqlOf = (f: string) => (MATCHES.includes(f) && SQL_SUA !== null ? SQL_SUA : readFileSync(new URL(f, DIR), "utf8"));

const AT = "2026-09-29T03:00:00.000Z";
const POLICY = "d53b6dd9-60e2-4644-8e63-9ca7dcff35d0"; // dòng chính sách gieo của 0041
const LOC = "a941dd7d-faab-4098-9ab9-1df7fa6dd551";
const LOC2 = "ec67ff94-bb00-4546-842a-aedb5f916b0a";
const HEX = "a".repeat(64);
const DAY = "2026-10-05";
const ms = (hhmm: string) => Date.parse(`${DAY}T${hhmm}:00.000+07:00`);
const iso = (m: number) => new Date(m).toISOString();
const SAU = iso(ms("07:30")); // mốc lệnh sau xuất bến (07:00)
const BAM_NHAM = "DIEU_CHINH_BAM_NHAM";
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
function lo<T>(db: Db, fn: () => T): T {
  db.exec("BEGIN");
  try {
    const r = fn();
    db.exec("COMMIT");
    return r;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}

// ---- dữ liệu nền (khuôn xe-dang-chay-csdl.test.ts) --------------------------------------------------------------------------------------------------
function hoSo(db: Db, ten: string): string {
  const id = nid("p");
  run(db, "INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'PERSON', ?, 1, ?, ?)", id, ten, AT, AT);
  run(db, "INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES (?, ?, ?, ?)", id, ten, AT, AT);
  return id;
}
function don(db: Db, soKhach = 3): { legs: string[]; khach: string[] } {
  const sid = nid("s");
  run(db, "INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at, party_id) VALUES (?, '', ?, 'x', 'sales', 1, ?, ?)", sid, `09${String(n).padStart(8, "0")}`, AT, hoSo(db, "NV"));
  const id = nid("o");
  run(db, "INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, created_at, updated_at) VALUES (?, ?, ?, 'draft', 'K', '0900000009', ?, ?)", id, `TD-${id}`, sid, AT, AT);
  const svc = nid("sv");
  run(db, "INSERT INTO order_service (id, order_id, sort_order, catalog_code, name, unit, pax_adult, depart_date) VALUES (?, ?, 0, 'ZH1', 'Tour', 'perPax', 4, ?)", svc, id, DAY);
  const leg = nid("leg");
  run(db, `INSERT INTO ord_transfer_leg (id, order_id, order_service_id, direction, pickup_date, pickup_time, pickup_location_id, pickup_place, dropoff_location_id, created_at, updated_at)
     VALUES (?, ?, ?, 'OUT', ?, '07:00', NULL, 'Khách sạn A', ?, ?, ?)`, leg, id, svc, DAY, LOC, AT, AT);
  const khach: string[] = [];
  for (let i = 0; i < soKhach; i++) {
    const k = nid("pax");
    run(db, "INSERT INTO ord_passenger (id, order_id, full_name, birth_year, person_key, created_at, updated_at) VALUES (?, ?, 'Khách Thử', 1990, ?, ?, ?)", k, id, k, AT, AT);
    khach.push(k);
  }
  run(db, "UPDATE orders SET status = 'confirmed', updated_at = ? WHERE id = ?", AT, id);
  gieoMocXep(db, leg);
  return { legs: [leg], khach };
}
interface Chuyen { id: string; di: string; tra: string }
function chuyen(db: Db, cho = 15): Chuyen {
  const chu = one<{ party_id: string }>(db, "SELECT party_id FROM v_pty_owner_company").party_id;
  const xe = nid("xe");
  run(db, `INSERT INTO vc_vehicle (id, plate_number, plate_key, chassis_number, chassis_key, name, model_year, passenger_capacity, owner_party_id, status, valid_from_date,
     created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'Xe thử', 2020, ?, ?, 'active', '2026-09-01', ?, ?)`, xe, `79B${String(n).padStart(5, "0")}`, `79B${String(n).padStart(5, "0")}`, `KHUNG${n}`, `KHUNG${n}`, cho, chu, AT, AT);
  const id = nid("tr");
  run(db, `INSERT INTO vc_trip (id, code, vehicle_id, carrier_party_id, service_date, planned_start_ms, planned_end_ms, earliest_start_ms, rest_minutes_snapshot, last_cmd_id,
     created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 30, ?, ?, ?)`, id, `CX-${id}`, xe, chu, DAY, ms("07:00"), ms("09:00"), ms("07:00"), randomUUID(), AT, AT);
  run(db, "INSERT INTO vc_trip_driver (id, trip_id, driver_party_id, valid_from_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)", nid("dr"), id, hoSo(db, "Tài xế"), AT, AT, AT);
  return { id, di: diem(db, id, "PICKUP", { text: "Khách sạn A" }), tra: diem(db, id, "DROPOFF", { seq: 2 }) };
}
function diem(db: Db, trip: string, kind: "PICKUP" | "DROPOFF", o: { loc?: string; text?: string; seq?: number; chay?: 0 | 1 } = {}): string {
  const id = nid("st");
  const loc = o.text !== undefined ? null : (o.loc ?? LOC);
  run(db, `INSERT INTO vc_trip_stop (id, trip_id, seq, kind, location_id, place_text, place_key, added_while_running, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id, trip, o.seq ?? 1, kind, loc, o.text ?? null, loc ? `L:${loc}` : `T:${HEX}`, o.chay ?? 0, AT, AT);
  return id;
}
interface MoSuat { key?: string | null; tra?: string | null; trangThai?: string; sau?: 0 | 1; cmd?: string | null; luc?: string; sua?: string | null }
function suat(db: Db, trip: string, board: string, leg: string, o: MoSuat = {}): string {
  const id = nid("al");
  run(db, `INSERT INTO vc_trip_allocation (id, trip_id, kind, leg_id, passenger_key, board_stop_id, alight_stop_id, status, valid_from_at, added_after_departure, opened_cmd_id,
     corrects_allocation_id, created_at, updated_at) VALUES (?, ?, 'PASSENGER', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id, trip, leg, o.key ?? null, board, o.tra ?? null, o.trangThai ?? "WAITING", o.luc ?? AT, o.sau ?? 0, o.cmd ?? null, o.sua ?? null, AT, AT);
  return id;
}
function suKien(db: Db, trip: string, kind: string, id: string, o: { luc?: string; alloc?: string | null; lyDo?: string | null } = {}): void {
  const luc = o.luc ?? SAU;
  run(db, `INSERT INTO vc_trip_event (id, trip_id, kind, allocation_id, request_id, decided_mode, occurred_at, occurred_ms, occurred_source, reason_code, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'NGUOI', ?, ?, 'MAY_CHU', ?, ?, ?)`, id, trip, kind, o.alloc ?? null, randomUUID(), luc, Date.parse(luc), o.lyDo ?? null, luc, luc);
}
function cong(db: Db, trip: string): string {
  const cmd = randomUUID();
  run(db, "UPDATE vc_trip SET version = version + 1, last_cmd_id = ?, updated_at = ? WHERE id = ?", cmd, AT, trip);
  return cmd;
}
const chot = (db: Db, trip: string, cmd: string) => run(db, "UPDATE vc_trip SET version = version WHERE id = ? AND last_cmd_id = ?", trip, cmd);
/** Lô xuất bến (khuôn lô máy chủ): cổng → sự kiện DEPARTED → dòng kiểm ĐẠT → trạng thái cuối. `luc` = giờ xuất bến. */
function xuatBen(db: Db, trip: string, luc = iso(ms("07:00"))): void {
  lo(db, () => {
    const cmd = cong(db, trip);
    suKien(db, trip, "DEPARTED", cmd, { luc });
    const t = one<{ vehicle_id: string; carrier_party_id: string }>(db, "SELECT vehicle_id, carrier_party_id FROM vc_trip WHERE id = ?", trip);
    run(db, `INSERT INTO vc_trip_departure_check (id, trip_id, cmd_id, policy_id, ket_qua, vehicle_id, plate_number, passenger_capacity, owner_party_id, driver_party_id,
       rest_minutes_used, checked_at, created_at, updated_at) VALUES (?, ?, ?, ?, 'DAT', ?, '79B-000.00', 15, ?, ?, 30, ?, ?, ?)`,
      nid("ck"), trip, cmd, POLICY, t.vehicle_id, t.carrier_party_id, t.carrier_party_id, AT, AT, AT);
    run(db, "UPDATE vc_trip SET status = 'RUNNING', departed_at = ?, departed_ms = ? WHERE id = ? AND last_cmd_id = ?", luc, Date.parse(luc), trip, cmd);
  });
}
/** Lô thu hồi xuất bến (ADR-0097 Đ3): cổng → sự kiện DEPARTURE_REVOKED có lý do → RUNNING → PLANNED, xoá giờ xuất bến. */
function thuHoi(db: Db, trip: string, o: { kind?: string; luc?: string; lyDo?: string | null } = {}): string {
  return lo(db, () => {
    const cmd = cong(db, trip);
    suKien(db, trip, o.kind ?? "DEPARTURE_REVOKED", cmd, { luc: o.luc, lyDo: o.lyDo === undefined ? BAM_NHAM : o.lyDo });
    run(db, "UPDATE vc_trip SET status = 'PLANNED', departed_at = NULL, departed_ms = NULL WHERE id = ? AND last_cmd_id = ?", trip, cmd);
    return cmd;
  });
}
/** Chuyến đang chạy: một suất khách (điểm lên c.di, điểm xuống c.tra) ở trạng thái `trangThai`; điểm lên / xuống ở trạng thái cho trước. */
function dangChay(db: Db, o: { trangThai?: string; len?: "PENDING" | "ARRIVED" | "DONE"; xuong?: "PENDING" | "ARRIVED" | "DONE"; coTen?: boolean } = {}) {
  const c = chuyen(db);
  const d = don(db);
  const a = suat(db, c.id, c.di, d.legs[0]!, { key: o.coTen === false ? null : d.khach[0]!, tra: c.tra });
  xuatBen(db, c.id);
  const len = o.len ?? "ARRIVED";
  if (len !== "PENDING") run(db, "UPDATE vc_trip_stop SET status = 'ARRIVED', arrived_at = ? WHERE id = ?", SAU, c.di);
  const tt = o.trangThai ?? "BOARDED";
  if (tt === "DROPPED") {
    run(db, "UPDATE vc_trip_allocation SET status = 'BOARDED' WHERE id = ?", a);
    run(db, "UPDATE vc_trip_allocation SET status = 'DROPPED' WHERE id = ?", a);
  } else if (tt !== "WAITING") run(db, "UPDATE vc_trip_allocation SET status = ? WHERE id = ?", tt, a);
  if (len === "DONE") run(db, "UPDATE vc_trip_stop SET status = 'DONE', done_at = ? WHERE id = ?", SAU, c.di);
  const xuong = o.xuong ?? "PENDING";
  if (xuong !== "PENDING") run(db, "UPDATE vc_trip_stop SET status = 'ARRIVED', arrived_at = ? WHERE id = ?", SAU, c.tra);
  if (xuong === "DONE") run(db, "UPDATE vc_trip_stop SET status = 'DONE', done_at = ? WHERE id = ?", SAU, c.tra);
  return { c, d, a };
}
type CanhDieuChinh = ReturnType<typeof dangChay>;
/** Lô điều chỉnh đúng thứ tự máy chủ: cổng → sự kiện CORRECTION (suất, lý do) → đóng suất cũ REMOVED → mở suất thay thế → câu chốt. Các tham số làm sai cố ý. */
function dieuChinh(db: Db, x: CanhDieuChinh, den: string, o: { dong?: boolean | string; lyDoDong?: string; cmdDong?: "khac"; mo?: number; sua?: string | null; len?: string; chot?: boolean } = {}) {
  return lo(db, () => {
    const cmd = cong(db, x.c.id);
    suKien(db, x.c.id, "CORRECTION", cmd, { alloc: x.a, lyDo: BAM_NHAM });
    if (o.dong !== false) {
      const dongId = typeof o.dong === "string" ? o.dong : x.a;
      run(db, "UPDATE vc_trip_allocation SET valid_to_at = ?, close_reason = ?, closed_by = 's', closed_cmd_id = ? WHERE id = ?", SAU, o.lyDoDong ?? "REMOVED", o.cmdDong ? randomUUID() : cmd, dongId);
    }
    const key = one<{ k: string | null }>(db, "SELECT passenger_key k FROM vc_trip_allocation WHERE id = ?", x.a).k;
    for (let i = 0; i < (o.mo ?? 1); i++) {
      suat(db, x.c.id, o.len ?? x.c.di, x.d.legs[0]!, { key, tra: x.c.tra, trangThai: den, sau: 1, cmd, luc: SAU, sua: o.sua === undefined ? x.a : o.sua });
    }
    if (o.chot !== false) chot(db, x.c.id, cmd);
    return cmd;
  });
}
const moDangMo = (db: Db, trip: string) => db.prepare("SELECT id, status, corrects_allocation_id sua, added_after_departure sau FROM vc_trip_allocation WHERE trip_id = ? AND valid_to_at IS NULL").all(trip) as { id: string; status: string; sua: string | null; sau: number }[];

test("đúng MỘT tệp 0085_dieu_chinh_chuyen.sql; chỉ thêm cột / dựng lại trigger / gieo lý do (không DROP TABLE, không dựng lại bảng)", () => {
  assert.equal(MATCHES.length, 1, `cần đúng một tệp, có ${MATCHES.length}`);
  assert.equal(MATCHES[0], "0085_dieu_chinh_chuyen.sql");
  assert.doesNotMatch(sqlOf(MATCHES[0]!), /DROP\s+TABLE|CREATE\s+TABLE/i);
});

test("gieo: nhóm DIEU_CHINH có đúng 3 lý do đang dùng theo thứ tự ADR-0097 Đ2.5, «Khác» cuối (luật gieo G4)", () => {
  const db = openDb();
  const r = db.prepare("SELECT code, label FROM vc_reason WHERE reason_group = 'DIEU_CHINH' AND active = 1 ORDER BY sort_order").all() as { code: string; label: string }[];
  assert.deepEqual(r.map((x) => x.label), ["Bấm nhầm", "Khách đổi ý tại điểm", "Khác"]);
});

test("dc_scope: sự kiện điều chỉnh thiếu lý do / lý do khác nhóm / chuyến chưa chạy / suất không phải suất khách đang mở của chuyến / loại khác mang lý do → RAISE; bỏ trigger thì qua", () => {
  const db = openDb();
  const x = dangChay(db);
  const khac = chuyen(db);
  const dk = don(db);
  const aKhac = suat(db, khac.id, khac.di, dk.legs[0]!, { key: dk.khach[0]! });
  // suất đã đóng TRƯỚC xuất bến (chuyến chưa chạy: rút được) — CORRECTION trỏ nó cũng bị chặn
  const p = chuyen(db);
  const dp = don(db);
  const aDong = suat(db, p.id, p.di, dp.legs[0]!, { key: dp.khach[0]! });
  suat(db, p.id, p.di, dp.legs[0]!, { key: dp.khach[1]! });
  run(db, "UPDATE vc_trip_allocation SET valid_to_at = ?, close_reason = 'REMOVED', closed_by = 's' WHERE id = ?", AT, aDong);
  xuatBen(db, p.id);
  const ev = (trip: string, kind: string, o: { alloc?: string | null; lyDo?: string | null }) => () => suKien(db, trip, kind, randomUUID(), o);
  loi(ev(x.c.id, "CORRECTION", { alloc: x.a, lyDo: null }), /dc_scope/, "thiếu lý do");
  loi(ev(x.c.id, "CORRECTION", { alloc: x.a, lyDo: "BAO_HUY_KHAC" }), /dc_scope/, "lý do nhóm khác");
  loi(ev(x.c.id, "DEPARTURE_REVOKED", { lyDo: "PHA_LE_SU_CO" }), /dc_scope/, "thu hồi với lý do nhóm khác");
  loi(ev(x.c.id, "CORRECTION", { alloc: null, lyDo: BAM_NHAM }), /dc_scope/, "không trỏ suất");
  loi(ev(x.c.id, "CORRECTION", { alloc: aKhac, lyDo: BAM_NHAM }), /dc_scope/, "suất của chuyến khác");
  loi(ev(p.id, "CORRECTION", { alloc: aDong, lyDo: BAM_NHAM }), /dc_scope/, "suất đã đóng");
  loi(ev(khac.id, "CORRECTION", { alloc: aKhac, lyDo: BAM_NHAM }), /dc_scope/, "chuyến chưa chạy");
  loi(ev(khac.id, "DEPARTURE_REVOKED", { lyDo: BAM_NHAM }), /dc_scope/, "thu hồi chuyến chưa chạy");
  loi(ev(x.c.id, "PASSENGER_BOARDED", { alloc: x.a, lyDo: BAM_NHAM }), /dc_scope/, "loại sự kiện khác mang lý do");
  ev(x.c.id, "CORRECTION", { alloc: x.a, lyDo: BAM_NHAM })(); // đúng phạm vi: qua (cân lô do câu chốt kiểm)
  ev(x.c.id, "DEPARTURE_REVOKED", { lyDo: "DIEU_CHINH_KHAC" })();
  db.exec("DROP TRIGGER vc_trip_event_dieu_chinh_scope");
  ev(x.c.id, "CORRECTION", { alloc: x.a, lyDo: null })();
  ev(khac.id, "DEPARTURE_REVOKED", { lyDo: BAM_NHAM })();
});

test("LC-07 cạnh RUNNING → PLANNED: chỉ khi sự kiện của dấu lệnh hiện hành là DEPARTURE_REVOKED của chính chuyến; giờ xuất bến xoá; xuất bến lại được", () => {
  const db = openDb();
  const c = chuyen(db);
  const d = don(db);
  suat(db, c.id, c.di, d.legs[0]!, { key: d.khach[0]! });
  xuatBen(db, c.id);
  loi(() => run(db, "UPDATE vc_trip SET status = 'PLANNED', departed_at = NULL, departed_ms = NULL WHERE id = ?", c.id), /lc07_forward/, "không có sự kiện");
  loi(() => lo(db, () => {
    const cmd = cong(db, c.id);
    suKien(db, c.id, "STOP_ARRIVED", cmd);
    run(db, "UPDATE vc_trip SET status = 'PLANNED', departed_at = NULL, departed_ms = NULL WHERE id = ? AND last_cmd_id = ?", c.id, cmd);
  }), /lc07_forward/, "sự kiện của lô là loại khác");
  loi(() => lo(db, () => {
    const cmd = cong(db, c.id);
    suKien(db, c.id, "DEPARTURE_REVOKED", randomUUID(), { lyDo: BAM_NHAM });
    run(db, "UPDATE vc_trip SET status = 'PLANNED', departed_at = NULL, departed_ms = NULL WHERE id = ? AND last_cmd_id = ?", c.id, cmd);
  }), /lc07_forward/, "sự kiện thu hồi không mang dấu lệnh hiện hành");
  thuHoi(db, c.id);
  const t = one<{ status: string; departed_at: string | null; departed_ms: number | null }>(db, "SELECT status, departed_at, departed_ms FROM vc_trip WHERE id = ?", c.id);
  assert.deepEqual({ ...t }, { status: "PLANNED", departed_at: null, departed_ms: null });
  loi(() => run(db, "UPDATE vc_trip SET status = 'ENDED' WHERE id = ?", c.id), /lc07_forward/, "PLANNED → ENDED vẫn cấm");
  xuatBen(db, c.id, iso(ms("08:00"))); // xuất bến lại (sau giờ ghi nhận của sự kiện thu hồi — VK1-A)
  assert.equal(one<{ s: string }>(db, "SELECT status s FROM vc_trip WHERE id = ?", c.id).s, "RUNNING");
});

test("dc_revoke_progress: đã có sự kiện tiến độ sau DEPARTED cuối → RAISE; sự kiện trước xuất bến, lần thu hồi trước và DEPARTED không tính; bỏ trigger thì qua", () => {
  const db = openDb();
  const c = chuyen(db);
  const d = don(db);
  suat(db, c.id, c.di, d.legs[0]!, { key: d.khach[0]! });
  suKien(db, c.id, "ALLOCATED", randomUUID(), { luc: AT }); // sự kiện kế hoạch trước xuất bến
  xuatBen(db, c.id);
  thuHoi(db, c.id); // chưa có tiến độ → qua
  xuatBen(db, c.id, iso(ms("08:00")));
  thuHoi(db, c.id, { luc: iso(ms("08:10")) }); // lần thu hồi trước + DEPARTED trước không chặn lần sau
  xuatBen(db, c.id, iso(ms("08:20")));
  suKien(db, c.id, "STOP_ARRIVED", randomUUID(), { luc: iso(ms("08:25")) }); // tiến độ sau xuất bến lần ba
  loi(() => thuHoi(db, c.id, { luc: iso(ms("08:30")) }), /dc_revoke_progress/, "đã có tiến độ");
  db.exec("DROP TRIGGER vc_trip_revoke_no_progress");
  thuHoi(db, c.id, { luc: iso(ms("08:30")) });
});

test("LC-15 ngoại lệ CORRECTION: các cặp trong bảng Đ2.4 qua (suất cũ đóng REMOVED, suất thay thế trỏ về, cờ thêm sau xuất bến); ngoài bảng → RAISE", () => {
  const db = openDb();
  const cap: [string, string, { len?: "PENDING" | "ARRIVED" | "DONE"; xuong?: "PENDING" | "ARRIVED" | "DONE" }][] = [
    ["BOARDED", "WAITING", {}], ["BOARDED", "NO_SHOW", { len: "DONE" }], ["BOARDED", "CANCELLED_AT_STOP", {}],
    ["CANCELLED_AT_STOP", "BOARDED", { len: "DONE" }], ["CANCELLED_AT_STOP", "NO_SHOW", {}], ["CANCELLED_AT_STOP", "WAITING", {}],
    ["NO_SHOW", "WAITING", {}], ["NO_SHOW", "CANCELLED_AT_STOP", { len: "DONE" }], ["DROPPED", "BOARDED", { len: "DONE", xuong: "ARRIVED" }],
  ];
  for (const [tu, den, dm] of cap) {
    const x = dangChay(db, { trangThai: tu, ...dm });
    dieuChinh(db, x, den);
    const mo = moDangMo(db, x.c.id);
    assert.equal(mo.length, 1, `${tu} → ${den}`);
    assert.deepEqual({ ...mo[0]!, id: "" }, { id: "", status: den, sua: x.a, sau: 1 }, `${tu} → ${den}`);
    assert.equal(one<{ r: string }>(db, "SELECT close_reason r FROM vc_trip_allocation WHERE id = ?", x.a).r, "REMOVED");
  }
  const ngoai: [string, string][] = [["BOARDED", "DROPPED"], ["NO_SHOW", "BOARDED"], ["WAITING", "BOARDED"], ["DROPPED", "NO_SHOW"], ["BOARDED", "BOARDED"]];
  for (const [tu, den] of ngoai) {
    const x = dangChay(db, { trangThai: tu, xuong: "ARRIVED" });
    loi(() => dieuChinh(db, x, den), /lc15_running/, `${tu} → ${den}`);
  }
});

test("LC-15 CORRECTION — điều kiện 'điểm chưa DONE': về Chưa xử lý khi điểm đón DONE / Đã trả → Còn trên xe khi điểm trả DONE → RAISE; bỏ trigger thì qua", () => {
  const db = openDb();
  loi(() => dieuChinh(db, dangChay(db, { trangThai: "BOARDED", len: "DONE" }), "WAITING"), /lc15_running/, "Đã đón → Chưa xử lý, điểm đón DONE");
  loi(() => dieuChinh(db, dangChay(db, { trangThai: "NO_SHOW", len: "DONE" }), "WAITING"), /lc15_running/, "Vắng → Chưa xử lý, điểm đón DONE");
  loi(() => dieuChinh(db, dangChay(db, { trangThai: "CANCELLED_AT_STOP", len: "DONE" }), "WAITING"), /lc15_running/, "Huỷ tại điểm → Chưa xử lý, điểm đón DONE");
  const tra = dangChay(db, { trangThai: "DROPPED", len: "DONE", xuong: "DONE" });
  loi(() => dieuChinh(db, tra, "BOARDED"), /lc15_running/, "Đã trả → Còn trên xe, điểm trả DONE");
  const ngoai = dangChay(db, { trangThai: "BOARDED" });
  loi(() => dieuChinh(db, ngoai, "DROPPED"), /lc15_running/);
  db.exec("DROP TRIGGER vc_trip_running_locked_alloc_ins");
  dieuChinh(db, tra, "BOARDED");
  dieuChinh(db, ngoai, "DROPPED");
});

test("LC-15 CORRECTION — hình lô sai → RAISE (trỏ suất khác, khác điểm lên, chưa đóng suất cũ, đóng sai lý do / sai dấu lệnh / đóng suất khác, loại sự kiện khác mang corrects)", () => {
  const db = openDb();
  // hai suất khách trên cùng chuyến (xếp trước xuất bến)
  const c = chuyen(db);
  const d = don(db);
  const a = suat(db, c.id, c.di, d.legs[0]!, { key: d.khach[0]!, tra: c.tra });
  const b = suat(db, c.id, c.di, d.legs[0]!, { key: d.khach[1]!, tra: c.tra });
  const len2 = diem(db, c.id, "PICKUP", { loc: LOC2, seq: 1 });
  xuatBen(db, c.id);
  run(db, "UPDATE vc_trip_stop SET status = 'ARRIVED', arrived_at = ? WHERE id = ?", SAU, c.di);
  run(db, "UPDATE vc_trip_allocation SET status = 'BOARDED' WHERE id IN (?, ?)", a, b);
  const x = { c, d, a };
  loi(() => dieuChinh(db, x, "NO_SHOW", { sua: b }), /lc15_running/, "suất thay thế trỏ suất khác sự kiện");
  loi(() => dieuChinh(db, x, "NO_SHOW", { sua: null }), /lc15_running/, "suất thay thế không trỏ");
  loi(() => dieuChinh(db, x, "NO_SHOW", { len: len2 }), /lc15_running/, "khác điểm lên");
  loi(() => dieuChinh(db, x, "NO_SHOW", { dong: false }), /lc15_running/, "chưa đóng suất cũ");
  loi(() => dieuChinh(db, x, "NO_SHOW", { lyDoDong: "MOVED" }), /lc15_running/, "đóng bằng lý do khác REMOVED");
  loi(() => dieuChinh(db, x, "NO_SHOW", { cmdDong: "khac" }), /lc15_running/, "đóng bằng dấu lệnh khác");
  loi(() => dieuChinh(db, x, "NO_SHOW", { dong: b }), /lc15_running/, "đóng suất khác suất của sự kiện");
  loi(() => lo(db, () => {
    const cmd = cong(db, c.id);
    suKien(db, c.id, "STOP_ADDED_RUNNING", cmd);
    suat(db, c.id, c.di, d.legs[0]!, { key: d.khach[2]!, tra: c.tra, sau: 1, cmd, luc: SAU, sua: a });
  }), /lc15_running/, "lô thêm điểm mà suất mang corrects");
  // chuyến chưa chạy: không ai chèn suất mang corrects
  const p = chuyen(db);
  const dp = don(db);
  const ap = suat(db, p.id, p.di, dp.legs[0]!, { key: dp.khach[0]! });
  loi(() => suat(db, p.id, p.di, dp.legs[0]!, { key: dp.khach[1]!, sua: ap }), /lc15_running/, "chuyến chưa chạy");
  // đường đúng vẫn qua sau mọi lần thử hỏng (các lô hỏng đã ROLLBACK)
  dieuChinh(db, x, "NO_SHOW");
  assert.equal(moDangMo(db, c.id).length, 2);
});

test("LC-15 đóng suất khi chạy: chỉ lô CORRECTION đóng ĐÚNG suất của sự kiện bằng REMOVED + dấu lệnh hiện hành; bỏ trigger thì qua", () => {
  const db = openDb();
  const x = dangChay(db);
  loi(() => run(db, "UPDATE vc_trip_allocation SET valid_to_at = ?, close_reason = 'REMOVED', closed_by = 's' WHERE id = ?", SAU, x.a), /lc15_running/, "rút không lô");
  loi(() => lo(db, () => {
    const cmd = cong(db, x.c.id);
    suKien(db, x.c.id, "STOP_ARRIVED", cmd);
    run(db, "UPDATE vc_trip_allocation SET valid_to_at = ?, close_reason = 'REMOVED', closed_by = 's', closed_cmd_id = ? WHERE id = ?", SAU, cmd, x.a);
  }), /lc15_running/, "lô loại khác");
  db.exec("DROP TRIGGER vc_trip_running_locked_alloc_close");
  run(db, "UPDATE vc_trip_allocation SET valid_to_at = ?, close_reason = 'REMOVED', closed_by = 's' WHERE id = ?", SAU, x.a);
});

test("dc_balance (câu chốt): lô CORRECTION phải đóng đúng một suất và mở đúng một suất thay thế trỏ về nó; lô không câu chốt không bị kiểm; bỏ trigger thì qua", () => {
  const db = openDb();
  loi(() => dieuChinh(db, dangChay(db), "NO_SHOW", { mo: 0 }), /dc_balance/, "đóng mà không mở");
  loi(() => dieuChinh(db, dangChay(db, { coTen: false }), "NO_SHOW", { mo: 2 }), /dc_balance/, "mở hai suất thay thế (suất chưa gắn tên — suất có tên thì chỉ mục mở-một-lần chặn trước)");
  const x = dangChay(db);
  loi(() => lo(db, () => {
    const cmd = cong(db, x.c.id);
    suKien(db, x.c.id, "CORRECTION", cmd, { alloc: x.a, lyDo: BAM_NHAM });
    chot(db, x.c.id, cmd);
  }), /dc_balance/, "không đóng không mở");
  dieuChinh(db, dangChay(db), "NO_SHOW", { mo: 0, chot: false }); // thiếu câu chốt: CSDL không bắt — bài thu-tu-lo ép lô máy chủ có câu chốt
  db.exec("DROP TRIGGER vc_trip_correction_balance");
  dieuChinh(db, dangChay(db, { coTen: false }), "NO_SHOW", { mo: 2 });
});

test("d53a_balance dựng lại chỉ cho lô ALLOCATION_STOP_CHANGED: lô cập nhật điểm lệch vẫn RAISE; lô CORRECTION không bị nó chặn", () => {
  const db = openDb();
  const c = chuyen(db);
  const d = don(db);
  const a = suat(db, c.id, c.di, d.legs[0]!, { key: d.khach[0]! });
  xuatBen(db, c.id);
  loi(() => lo(db, () => {
    const cmd = cong(db, c.id);
    suKien(db, c.id, "ALLOCATION_STOP_CHANGED", cmd);
    diem(db, c.id, "PICKUP", { loc: LOC2, seq: 3, chay: 1 });
    run(db, "UPDATE vc_trip_allocation SET valid_to_at = ?, close_reason = 'STOP_CHANGED', closed_by = 's', closed_cmd_id = ? WHERE id = ?", SAU, cmd, a);
    chot(db, c.id, cmd);
  }), /d53a_balance/, "đóng STOP_CHANGED mà không mở lại");
  const x = dangChay(db);
  dieuChinh(db, x, "CANCELLED_AT_STOP");
  assert.equal(moDangMo(db, x.c.id)[0]!.status, "CANCELLED_AT_STOP");
});

test("lc04_identity: corrects_allocation_id bất biến (không gắn / đổi sau khi mở)", () => {
  const db = openDb();
  const c = chuyen(db);
  const d = don(db);
  const a = suat(db, c.id, c.di, d.legs[0]!, { key: d.khach[0]! });
  const b = suat(db, c.id, c.di, d.legs[0]!, { key: d.khach[1]! });
  loi(() => run(db, "UPDATE vc_trip_allocation SET corrects_allocation_id = ? WHERE id = ?", a, b), /lc04_identity/);
});
