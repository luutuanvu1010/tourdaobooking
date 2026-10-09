// Kiểm migration *_chuyen_khach_giua_xe.sql (ADR-0111 Đ1–Đ5; ADR-0052 D4, D5c — việc 8, A5) — LỚP CSDL: chèn / sửa THẲNG SQL trên schema thật dựng từ MỌI
// migrations/*.sql bằng node:sqlite. Danh mục điều kiện, LC-14 (cả vế Đ4), đồ thị trạng thái đề nghị, bảng đặt cột quyết định Đ3 (b), người nhận là tài xế
// đang lái xe nhận, hạn chờ, mọi lần đóng nằm trong lô của nguồn / đích, máy tự xác nhận / leo thang có bằng chứng, ESCALATED → CONFIRMED đọc MỌI dòng kiểm,
// dòng kiểm (tầng, điều kiện đang dùng, chính sách, trong lô), suất mở / đóng theo đề nghị (kể cả người đi kèm), LC-15 đường thứ tư, Đ5 thu hồi xuất bến.
// Ba bước SQL_TAY của tệp tình huống golden/dieu-phoi-luot-2 (TH03-3B, TH08-4D, TH10 — câu nguyên văn) chạy ở đây. Mỗi bài có vế "bỏ trigger thì đi qua".
// P16: biến môi trường CHUYEN_KHACH_SQL trỏ bản sao đã sửa cố ý của migration (rỗng → "no such table: vc_transfer_rule").
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { gieoMocXep } from "../../../tests/audit/gieo-vc.mjs";

const DIR = new URL("../../../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const MATCHES = files.filter((f) => f.endsWith("_chuyen_khach_giua_xe.sql"));
const SQL_SUA = process.env.CHUYEN_KHACH_SQL !== undefined ? readFileSync(process.env.CHUYEN_KHACH_SQL, "utf8") : null;
const sqlOf = (f: string) => (MATCHES.includes(f) && SQL_SUA !== null ? SQL_SUA : readFileSync(new URL(f, DIR), "utf8"));
const GOLDEN = JSON.parse(readFileSync(new URL("../../../golden/dieu-phoi-luot-2/xe-a-b-luot-2-chuyen-khach.json", import.meta.url), "utf8")) as {
  cac_tinh_huong: { ma: string; cac_buoc: { ma: string; lenh: string; dau_vao: { cau?: string } }[] }[];
};
const cauTay = (ma: string): string => {
  for (const t of GOLDEN.cac_tinh_huong) for (const b of t.cac_buoc) if (b.ma === ma && b.lenh === "SQL_TAY") return b.dau_vao.cau!;
  throw new Error(`không thấy bước SQL_TAY ${ma}`);
};

const AT = "2026-09-29T03:00:00.000Z";
const POLICY = "d53b6dd9-60e2-4644-8e63-9ca7dcff35d0"; // dòng chính sách gieo của 0041
const LOC = "a941dd7d-faab-4098-9ab9-1df7fa6dd551";
const LOC2 = "ec67ff94-bb00-4546-842a-aedb5f916b0a";
const HEX = "b".repeat(64);
const DAY = "2026-10-05";
const ms = (hhmm: string) => Date.parse(`${DAY}T${hhmm}:00.000+07:00`);
const iso = (m: number) => new Date(m).toISOString();
const GUI = iso(ms("07:30"));
const NHAN = iso(ms("07:32"));
const TRE = iso(ms("07:45")); // quá hạn 10 phút
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

// ---- dữ liệu nền (khuôn dieu-chinh-csdl.test.ts) ----------------------------------------------------------------------------------------------------
function hoSo(db: Db, ten: string): string {
  const id = nid("p");
  run(db, "INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'PERSON', ?, 1, ?, ?)", id, ten, AT, AT);
  run(db, "INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES (?, ?, ?, ?)", id, ten, AT, AT);
  return id;
}
function don(db: Db, soKhach = 3): { leg: string; khach: string[] } {
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
  return { leg, khach };
}
interface Chuyen { id: string; tx: string; di: string; tra: string }
function chuyen(db: Db, o: { cho?: number; ngay?: string } = {}): Chuyen {
  const chu = one<{ party_id: string }>(db, "SELECT party_id FROM v_pty_owner_company").party_id;
  const xe = nid("xe");
  run(db, `INSERT INTO vc_vehicle (id, plate_number, plate_key, chassis_number, chassis_key, name, model_year, passenger_capacity, owner_party_id, status, valid_from_date,
     created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'Xe thử', 2020, ?, ?, 'active', '2026-09-01', ?, ?)`, xe, `79B${String(n).padStart(5, "0")}`, `79B${String(n).padStart(5, "0")}`, `KHUNG${n}`, `KHUNG${n}`, o.cho ?? 15, chu, AT, AT);
  const id = nid("tr");
  const day = o.ngay ?? DAY;
  const st = Date.parse(`${day}T07:00:00.000+07:00`);
  run(db, `INSERT INTO vc_trip (id, code, vehicle_id, carrier_party_id, service_date, planned_start_ms, planned_end_ms, earliest_start_ms, rest_minutes_snapshot, last_cmd_id,
     created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 30, ?, ?, ?)`, id, `CX-${id}`, xe, chu, day, st, st + 7_200_000, st, randomUUID(), AT, AT);
  const tx = hoSo(db, "Tài xế");
  run(db, "INSERT INTO vc_trip_driver (id, trip_id, driver_party_id, valid_from_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)", nid("dr"), id, tx, AT, AT, AT);
  return { id, tx, di: diem(db, id, "PICKUP", { text: true }), tra: diem(db, id, "DROPOFF", { seq: 2 }) };
}
function diem(db: Db, trip: string, kind: "PICKUP" | "DROPOFF", o: { loc?: string; text?: boolean; seq?: number; chay?: 0 | 1 } = {}): string {
  const id = nid("st");
  const loc = o.text ? null : (o.loc ?? LOC);
  run(db, `INSERT INTO vc_trip_stop (id, trip_id, seq, kind, location_id, place_text, place_key, added_while_running, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id, trip, o.seq ?? 1, kind, loc, o.text ? "Khách sạn A" : null, loc ? `L:${loc}` : `T:${HEX}`, o.chay ?? 0, AT, AT);
  return id;
}
interface MoSuat { key?: string | null; tra?: string | null; trangThai?: string; sau?: 0 | 1; cmd?: string | null; luc?: string; transfer?: string | null; crew?: string }
function suat(db: Db, trip: string, board: string | null, leg: string | null, o: MoSuat = {}): string {
  const id = nid("al");
  run(db, `INSERT INTO vc_trip_allocation (id, trip_id, kind, leg_id, passenger_key, crew_party_id, board_stop_id, alight_stop_id, status, valid_from_at, added_after_departure,
     opened_cmd_id, transfer_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id, trip, o.crew ? "CREW" : "PASSENGER", leg, o.key ?? null, o.crew ?? null, board, o.tra ?? null, o.trangThai ?? "WAITING", o.luc ?? AT, o.sau ?? 0, o.cmd ?? null,
    o.transfer ?? null, AT, AT);
  return id;
}
function suKien(db: Db, trip: string, kind: string, id: string, o: { luc?: string; lienQuan?: string | null; rq?: string; mode?: string } = {}): void {
  const luc = o.luc ?? GUI;
  run(db, `INSERT INTO vc_trip_event (id, trip_id, related_trip_id, kind, request_id, decided_mode, occurred_at, occurred_ms, occurred_source, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'MAY_CHU', ?, ?)`, id, trip, o.lienQuan ?? null, kind, o.rq ?? randomUUID(), o.mode ?? "NGUOI", luc, Date.parse(luc), luc, luc);
}
/** Câu cổng (khuôn máy chủ): tăng phiên bản, đặt dấu lệnh. `cmd` cho trước = cổng thứ hai của lô cổng đôi. */
function cong(db: Db, trip: string, cmd = randomUUID()): string {
  run(db, "UPDATE vc_trip SET version = version + 1, last_cmd_id = ?, updated_at = ? WHERE id = ?", cmd, AT, trip);
  return cmd;
}
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

/** Nền: xe A đang chạy có điểm đón chưa tới với `soKhach` khách đang chờ (+ tuỳ chọn khách đã lên, người đi kèm); xe B (đang chạy hoặc chưa chạy). */
function nen(db: Db, o: { bChay?: boolean; soKhach?: number; daLen?: number; crew?: boolean; choB?: number } = {}) {
  const a = chuyen(db);
  const b = chuyen(db, { cho: o.choB ?? 29 });
  const d = don(db, (o.soKhach ?? 3) + (o.daLen ?? 0));
  const cho = Array.from({ length: o.soKhach ?? 3 }, (_, i) => suat(db, a.id, a.di, d.leg, { key: d.khach[i]!, tra: a.tra }));
  const dDaLen = o.daLen ? don(db, o.daLen) : null;
  const diemDaLen = o.daLen ? diem(db, a.id, "PICKUP", { loc: LOC2, seq: 1 }) : null;
  const len = Array.from({ length: o.daLen ?? 0 }, (_, i) => suat(db, a.id, diemDaLen!, dDaLen!.leg, { key: dDaLen!.khach[i]!, tra: a.tra }));
  const crew = o.crew ? suat(db, a.id, null, null, { crew: hoSo(db, "HDV") }) : null;
  xuatBen(db, a.id);
  for (const x of len) run(db, "UPDATE vc_trip_allocation SET status = 'BOARDED' WHERE id = ?", x);
  if (crew) run(db, "UPDATE vc_trip_allocation SET status = 'BOARDED' WHERE id = ?", crew);
  if (diemDaLen) run(db, "UPDATE vc_trip_stop SET status = 'ARRIVED', arrived_at = ? WHERE id = ?", AT, diemDaLen);
  if (o.bChay !== false) xuatBen(db, b.id);
  return { a, b, d, cho, len, crew };
}
type Nen = ReturnType<typeof nen>;
interface Gui { scope?: "STOP" | "ONBOARD"; pax?: number; party?: string; luc?: string; policy?: string; noiGap?: string | null; stop?: string | null }
/** Lô gửi (khuôn máy chủ): cổng đích → sự kiện TRANSFER_SENT (đích, nguồn ở related) → dòng đề nghị (id = dấu lệnh). */
function gui(db: Db, x: Nen, o: Gui = {}): string {
  return lo(db, () => {
    const cmd = cong(db, x.b.id);
    const rq = randomUUID();
    suKien(db, x.b.id, "TRANSFER_SENT", cmd, { lienQuan: x.a.id, rq, luc: o.luc ?? GUI });
    const onb = o.scope === "ONBOARD";
    run(db, `INSERT INTO vc_transfer_request (id, from_trip_id, to_trip_id, scope, from_stop_id, meet_place_text, pax_count, proposed_by_party_id, proposed_by_staff_id,
       proposed_at, policy_id, request_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 's-tx-a', ?, ?, ?, ?, ?)`,
      cmd, x.a.id, x.b.id, onb ? "ONBOARD" : "STOP", onb ? null : (o.stop === undefined ? x.a.di : o.stop), onb ? (o.noiGap === undefined ? "Cây xăng Phước Đồng" : o.noiGap) : null,
      o.pax ?? (onb ? x.cho.length + x.len.length + (x.crew ? 1 : 0) : x.cho.length), o.party ?? x.a.tx, o.luc ?? GUI, o.policy ?? POLICY, rq, o.luc ?? GUI, o.luc ?? GUI);
    return cmd;
  });
}
type KetQua = "DAT" | "KHONG_DAT" | "CANH_BAO";
/** Đủ dòng kiểm cho mọi điều kiện đang dùng (ghi đè kết quả theo mã). */
function kiem(db: Db, rid: string, cmd: string, khac: Record<string, KetQua> = {}, luc = NHAN, bo: string[] = []): void {
  const rules = db.prepare("SELECT code, tier FROM vc_transfer_rule WHERE active = 1").all() as { code: string; tier: string }[];
  for (const r of rules) {
    if (bo.includes(r.code)) continue;
    run(db, `INSERT INTO vc_transfer_check (id, transfer_id, cmd_id, rule_code, rule_tier, ket_qua, policy_row_id, checked_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      nid("kc"), rid, cmd, r.code, r.tier, khac[r.code] ?? "DAT", POLICY, luc, luc, luc);
  }
}
const datQuyetDinh = (db: Db, rid: string, trangThai: string, cmd: string, o: { party?: string; mode?: string | null; dong?: string | null; luc?: string; lyDo?: Record<string, string> } = {}) => {
  const ly = o.lyDo ?? {};
  run(db, `UPDATE vc_transfer_request SET status = ?, decided_mode = ?, decided_by = 's-tx-b', decided_at = ?, decided_cmd_id = ?, decided_by_party_id = ?, closed_cmd_id = ?,
     decline_reason_code = ?, override_reason_code = ?, reject_reason_code = ?, updated_at = ? WHERE id = ?`,
    trangThai, o.mode === undefined ? (trangThai === "CONFIRMED" ? "MAY" : null) : o.mode, o.luc ?? NHAN, cmd, o.party ?? null, o.dong === undefined ? (trangThai === "ESCALATED" ? null : cmd) : o.dong,
    ly.decline ?? null, ly.override ?? null, ly.reject ?? null, o.luc ?? NHAN, rid);
};
/** Lô Nhận (máy): cổng nguồn → cổng đích (cùng dấu lệnh) → sự kiện ở đích → dòng kiểm → trạng thái đề nghị → (xác nhận) điểm ở đích → đóng nguồn rồi mở đích
 *  từng suất → điểm nguồn MOVED (STOP). */
function nhan(db: Db, x: Nen, rid: string, o: { khac?: Record<string, KetQua>; party?: string; luc?: string; scope?: "STOP" | "ONBOARD" } = {}): { cmd: string; kq: string } {
  return lo(db, () => {
    const cmd = cong(db, x.a.id);
    cong(db, x.b.id, cmd);
    const coLoi = Object.values(o.khac ?? {}).includes("KHONG_DAT");
    suKien(db, x.b.id, coLoi ? "TRANSFER_ESCALATED" : "TRANSFER_CONFIRMED", cmd, { lienQuan: x.a.id, luc: o.luc ?? NHAN, mode: "MAY" });
    kiem(db, rid, cmd, o.khac, o.luc ?? NHAN);
    datQuyetDinh(db, rid, coLoi ? "ESCALATED" : "CONFIRMED", cmd, { party: o.party ?? x.b.tx, luc: o.luc ?? NHAN });
    if (!coLoi) doiSuat(db, x, rid, cmd, o.scope ?? "STOP", o.luc ?? NHAN);
    return { cmd, kq: coLoi ? "ESCALATED" : "CONFIRMED" };
  });
}
function doiSuat(db: Db, x: Nen, rid: string, cmd: string, scope: "STOP" | "ONBOARD", luc: string): void {
  const chay = one<{ s: string }>(db, "SELECT status s FROM vc_trip WHERE id = ?", x.b.id).s === "RUNNING" ? 1 : 0;
  const len = diem(db, x.b.id, "PICKUP", { seq: 3, chay, text: true });
  const tra = diem(db, x.b.id, "DROPOFF", { seq: 4, chay });
  const nguon = scope === "STOP" ? x.cho : [...x.cho, ...x.len, ...(x.crew ? [x.crew] : [])];
  for (const id of nguon) {
    const s = one<{ kind: string; leg_id: string | null; passenger_key: string | null; crew_party_id: string | null; status: string }>(db,
      "SELECT kind, leg_id, passenger_key, crew_party_id, status FROM vc_trip_allocation WHERE id = ?", id);
    run(db, "UPDATE vc_trip_allocation SET valid_to_at = ?, close_reason = 'TRANSFERRED', closed_by = 's', closed_cmd_id = ?, closed_transfer_id = ? WHERE id = ?", luc, cmd, rid, id);
    const crew = s.kind === "CREW";
    suat(db, x.b.id, crew ? null : len, s.leg_id, { key: s.passenger_key, tra: crew ? null : tra, trangThai: s.status, sau: chay as 0 | 1, cmd, luc, transfer: rid, crew: s.crew_party_id ?? undefined });
  }
  if (scope === "STOP") run(db, "UPDATE vc_trip_stop SET status = 'MOVED' WHERE id = ?", x.a.di);
}
const trangThai = (db: Db, rid: string) => one<{ s: string }>(db, "SELECT status s FROM vc_transfer_request WHERE id = ?", rid).s;
const moCua = (db: Db, trip: string) =>
  db.prepare("SELECT kind, status, transfer_id t, added_after_departure sau FROM vc_trip_allocation WHERE trip_id = ? AND valid_to_at IS NULL ORDER BY kind, status").all(trip) as {
    kind: string; status: string; t: string | null; sau: number }[];

// ---- (1) Danh mục, chính sách, lý do ------------------------------------------------------------------------------------------------------------------
test("đúng MỘT tệp 0093_chuyen_khach_giua_xe.sql; đầu tệp có khối HOÀN TÁC; không dựng lại bảng cũ", () => {
  assert.deepEqual(MATCHES, ["0093_chuyen_khach_giua_xe.sql"]);
  const sql = sqlOf(MATCHES[0]!);
  assert.match(sql.slice(0, 1500), /HOÀN TÁC/);
  assert.doesNotMatch(sql, /DROP\s+TABLE/i);
  assert.deepEqual([...sql.matchAll(/CREATE TABLE (\w+)/g)].map((m) => m[1]), ["vc_transfer_rule", "vc_transfer_request", "vc_transfer_check"]);
});

test("Đ1: danh mục 11 điều kiện đúng tầng; không xoá; mã / tầng không đổi; tắt được (active); chính sách gieo hai cột mặc định; bốn lý do TU_CHOI_NHAN", () => {
  const db = openDb();
  const r = db.prepare("SELECT code, tier, active FROM vc_transfer_rule ORDER BY sort_order").all() as { code: string; tier: string; active: number }[];
  assert.deepEqual(r.map((x) => `${x.code}:${x.tier}:${x.active}`), [
    "SUC_CHUA_DICH:LOI:1", "SUC_CHUA_NGUON:LOI:1", "TRUNG_GIO_DICH:LOI:1", "KHOANG_NGHI_DICH:CAU_HINH:1", "MOC_TOI_THIEU:CAU_HINH:1", "HANG_BANG_DICH:LOI:1",
    "GIAY_TO_DICH:LOI:1", "KHONG_CHEO:LOI:1", "DIEM_CHUA_TOI:LOI:1", "CAM_KET_DICH:CAU_HINH:1", "CHANG_KHACH_HIEU_LUC:LOI:1",
  ]);
  loi(() => run(db, "DELETE FROM vc_transfer_rule WHERE code = 'SUC_CHUA_DICH'"), /ck_rule_append_only/);
  loi(() => run(db, "UPDATE vc_transfer_rule SET tier = 'CAU_HINH' WHERE code = 'SUC_CHUA_DICH'"), /ck_rule_identity/);
  loi(() => run(db, "UPDATE vc_transfer_rule SET code = 'KHAC' WHERE code = 'SUC_CHUA_DICH'"), /ck_rule_identity|FOREIGN KEY/);
  run(db, "UPDATE vc_transfer_rule SET active = 0, label = 'Đổi nhãn' WHERE code = 'KHOANG_NGHI_DICH'");
  const p = one<{ w: number; a: number }>(db, "SELECT accept_wait_minutes w, auto_confirm_transfer a FROM vc_dispatch_policy WHERE id = ?", POLICY);
  assert.deepEqual({ ...p }, { w: 10, a: 1 });
  const ly = db.prepare("SELECT label FROM vc_reason WHERE reason_group = 'TU_CHOI_NHAN' AND active = 1 ORDER BY sort_order").all() as { label: string }[];
  assert.deepEqual(ly.map((x) => x.label), ["Xe đã đầy chỗ", "Không kịp giờ", "Đang xử lý sự cố", "Khác"]);
  db.exec("DROP TRIGGER vc_transfer_rule_no_delete");
  run(db, "DELETE FROM vc_transfer_rule WHERE code = 'KHOANG_NGHI_DICH'");
});

// ---- (2) LC-14 ----------------------------------------------------------------------------------------------------------------------------------------
test("LC-14: gửi đúng → Chờ; sai điều kiện gửi (nguồn chưa chạy, khác ngày, người gửi không lái nguồn, cùng tài xế, sai số khách, điểm có khách đã lên / người đi kèm, điểm đã tới, ngoài lô gửi, chèn sẵn trạng thái khác, sai chính sách) → RAISE; bỏ trigger thì qua", () => {
  const db = openDb();
  const x = nen(db);
  const rid = gui(db, x);
  assert.equal(trangThai(db, rid), "PENDING");
  loi(() => gui(db, x, { pax: 2 }), /lc14_transfer/, "sai số khách");
  loi(() => gui(db, x, { party: x.b.tx }), /lc14_transfer/, "người gửi không lái nguồn");
  // nguồn chưa chạy
  const p = nen(db, { bChay: true });
  const chuaChay = { ...p, a: chuyen(db) };
  const dP = don(db, 1);
  chuaChay.cho = [suat(db, chuaChay.a.id, chuaChay.a.di, dP.leg, { key: dP.khach[0]! })];
  loi(() => gui(db, chuaChay), /lc14_transfer/, "nguồn chưa chạy");
  // khác ngày
  const khacNgay = { ...x, b: chuyen(db, { ngay: "2026-10-06" }) };
  loi(() => gui(db, khacNgay), /lc14_transfer/, "khác ngày chạy");
  // cùng tài xế: đích do chính tài xế nguồn lái (giả lập — chèn dòng lái thẳng sau khi đóng dòng cũ)
  const cung = chuyen(db, { ngay: "2026-10-07" });
  run(db, "UPDATE vc_trip_driver SET valid_to_at = ?, close_reason = 'REASSIGNED' WHERE trip_id = ?", AT, cung.id);
  run(db, "INSERT INTO vc_trip_driver (id, trip_id, driver_party_id, valid_from_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)", nid("dr"), cung.id, x.a.tx, AT, AT, AT);
  loi(() => gui(db, { ...x, b: { ...cung } }), /lc14_transfer/, "hai tài xế trùng / khác ngày");
  // điểm có khách đã lên
  const y = nen(db);
  run(db, "UPDATE vc_trip_allocation SET status = 'BOARDED' WHERE id = ?", y.cho[0]!);
  loi(() => gui(db, y), /lc14_transfer/, "điểm có khách đã lên");
  // điểm đã tới
  const z = nen(db);
  run(db, "UPDATE vc_trip_stop SET status = 'ARRIVED', arrived_at = ? WHERE id = ?", AT, z.a.di);
  loi(() => gui(db, z), /lc14_transfer/, "điểm đã tới");
  // ngoài lô gửi: không có sự kiện TRANSFER_SENT mang dấu lệnh hiện hành
  loi(() => run(db, `INSERT INTO vc_transfer_request (id, from_trip_id, to_trip_id, scope, from_stop_id, pax_count, proposed_by_party_id, proposed_by_staff_id, proposed_at,
       policy_id, request_id, created_at, updated_at) VALUES (?, ?, ?, 'STOP', ?, 3, ?, 's', ?, ?, ?, ?, ?)`, randomUUID(), x.a.id, x.b.id, x.a.di, x.a.tx, GUI, POLICY, randomUUID(), GUI, GUI),
    /lc14_transfer/, "ngoài lô gửi");
  // chèn sẵn trạng thái khác Chờ
  loi(() => lo(db, () => {
    const cmd = cong(db, x.b.id);
    const rq = randomUUID();
    suKien(db, x.b.id, "TRANSFER_SENT", cmd, { lienQuan: x.a.id, rq });
    run(db, `INSERT INTO vc_transfer_request (id, from_trip_id, to_trip_id, scope, from_stop_id, pax_count, proposed_by_party_id, proposed_by_staff_id, proposed_at, status,
       policy_id, request_id, closed_cmd_id, created_at, updated_at) VALUES (?, ?, ?, 'STOP', ?, 3, ?, 's', ?, 'WITHDRAWN', ?, ?, ?, ?, ?)`, cmd, x.a.id, x.b.id, x.a.di, x.a.tx, GUI, POLICY, rq, cmd, GUI, GUI);
  }), /lc14_transfer/, "chèn sẵn trạng thái cuối");
  // chính sách không hiện hành lúc gửi: có dòng mới hiệu lực trước giờ gửi mà đề nghị chụp dòng cũ
  run(db, `INSERT INTO vc_dispatch_policy (id, min_lead_minutes, warn_lead_minutes, rest_minutes, require_manifest, require_contract, proxy_backdate_max_minutes, valid_from_at,
     created_at, updated_at, departure_window_minutes, duty_day_max_minutes, trip_no_break_max_minutes, accept_wait_minutes, auto_confirm_transfer)
     VALUES ('cs-moi', 360, 120, 30, 1, 0, 180, ?, ?, ?, 720, 480, 240, 10, 1)`, iso(ms("07:20")), AT, AT);
  loi(() => gui(db, x, { policy: POLICY }), /lc14_transfer/, "chính sách không hiện hành lúc gửi");
  gui(db, x, { policy: "cs-moi" });
  db.exec("DROP TRIGGER vc_transfer_request_lc14");
  gui(db, x, { pax: 2, policy: "cs-moi" });
  gui(db, z, { policy: "cs-moi" });
});

test("LC-14 vế Đ4 (TH07-5): cứu hộ ONBOARD chỉ sang xe ĐANG CHẠY; ONBOARD đếm cả khách đã lên và người đi kèm; STOP từ điểm có người đi kèm → RAISE; bỏ trigger thì qua", () => {
  const db = openDb();
  const x = nen(db, { bChay: false, daLen: 2, crew: true });
  loi(() => gui(db, x, { scope: "ONBOARD" }), /lc14_transfer/, "xe nhận chưa chạy");
  const y = nen(db, { daLen: 2, crew: true });
  loi(() => gui(db, y, { scope: "ONBOARD", pax: 5 }), /lc14_transfer/, "thiếu người đi kèm trong số khách");
  loi(() => gui(db, y, { scope: "ONBOARD", noiGap: null }), /CHECK constraint failed/, "ONBOARD không nơi gặp");
  const rid = gui(db, y, { scope: "ONBOARD" });
  assert.equal(one<{ p: number }>(db, "SELECT pax_count p FROM vc_transfer_request WHERE id = ?", rid).p, 6);
  db.exec("DROP TRIGGER vc_transfer_request_lc14");
  gui(db, x, { scope: "ONBOARD" });
});

// ---- (3) Máy tự xác nhận, leo thang, duyệt ------------------------------------------------------------------------------------------------------------
test("Nhận (MAY): đủ dòng kiểm, mọi điều kiện đạt, công tắc bật → CONFIRMED; khách sang xe nhận giữ trạng thái, mang transfer_id; suất nguồn đóng TRANSFERRED + closed_transfer_id; điểm nguồn MOVED; cột quyết định theo Đ3 (b)", () => {
  const db = openDb();
  const x = nen(db);
  const rid = gui(db, x);
  const { cmd } = nhan(db, x, rid);
  const r = one<Record<string, string | null>>(db, `SELECT status, decided_mode, decided_by_party_id, decided_cmd_id, closed_cmd_id FROM vc_transfer_request WHERE id = ?`, rid);
  assert.deepEqual({ ...r }, { status: "CONFIRMED", decided_mode: "MAY", decided_by_party_id: x.b.tx, decided_cmd_id: cmd, closed_cmd_id: cmd });
  assert.deepEqual(moCua(db, x.b.id).filter((s) => s.t === rid).map((s) => `${s.kind}:${s.status}:${s.sau}`), ["PASSENGER:WAITING:1", "PASSENGER:WAITING:1", "PASSENGER:WAITING:1"]);
  const dong = db.prepare("SELECT close_reason c, closed_transfer_id t FROM vc_trip_allocation WHERE trip_id = ? AND valid_to_at IS NOT NULL").all(x.a.id) as { c: string; t: string }[];
  assert.deepEqual(dong.map((d) => `${d.c}:${d.t === rid}`), ["TRANSFERRED:true", "TRANSFERRED:true", "TRANSFERRED:true"]);
  assert.equal(one<{ s: string }>(db, "SELECT status s FROM vc_trip_stop WHERE id = ?", x.a.di).s, "MOVED");
  loi(() => run(db, "UPDATE vc_transfer_request SET status = 'VOID', closed_cmd_id = ? WHERE id = ?", cmd, rid), /ck_forward/, "trạng thái cuối không đổi");
});

test("Đ4: ONBOARD sang xe đang chạy — khách đã lên giữ ĐÃ LÊN, người đi kèm (CREW) sang cùng, giữ điểm trống, tính vào số chỗ (LC-02)", () => {
  const db = openDb();
  const x = nen(db, { daLen: 2, crew: true });
  const rid = gui(db, x, { scope: "ONBOARD" });
  nhan(db, x, rid, { scope: "ONBOARD" });
  assert.deepEqual(moCua(db, x.b.id).filter((s) => s.t === rid).map((s) => `${s.kind}:${s.status}`), ["CREW:BOARDED", "PASSENGER:BOARDED", "PASSENGER:BOARDED", "PASSENGER:WAITING", "PASSENGER:WAITING", "PASSENGER:WAITING"]);
  assert.equal(moCua(db, x.a.id).length, 0);
  // LC-02 vẫn đếm người đi kèm: xe nhận 5 chỗ không nhận được 6 người
  const y = nen(db, { daLen: 2, crew: true, choB: 5 });
  const r2 = gui(db, y, { scope: "ONBOARD" });
  loi(() => nhan(db, y, r2, { scope: "ONBOARD" }), /lc02_capacity/);
});

test("ck_confirm_may: thiếu dòng kiểm / có dòng KHONG_DAT (kể cả tầng cấu hình) / công tắc tự đồng ý lúc QUYẾT đang tắt → RAISE; bỏ trigger thì qua", () => {
  const db = openDb();
  const x = nen(db);
  const rid = gui(db, x);
  const thu = (fn: (cmd: string) => void) => () => lo(db, () => {
    const cmd = cong(db, x.a.id);
    cong(db, x.b.id, cmd);
    suKien(db, x.b.id, "TRANSFER_CONFIRMED", cmd, { lienQuan: x.a.id, luc: NHAN, mode: "MAY" });
    fn(cmd);
    datQuyetDinh(db, rid, "CONFIRMED", cmd, { party: x.b.tx });
  });
  loi(thu((cmd) => kiem(db, rid, cmd, {}, NHAN, ["GIAY_TO_DICH"])), /ck_confirm_may/, "thiếu một dòng kiểm");
  loi(thu((cmd) => kiem(db, rid, cmd, { KHOANG_NGHI_DICH: "KHONG_DAT" })), /ck_confirm_may/, "dòng cấu hình không đạt");
  // Công tắc tắt bằng dòng chính sách MỚI (sau lúc gửi, trước lúc quyết) — đọc theo lúc quyết (Đ3 (c)), không theo policy_id lúc gửi.
  run(db, `INSERT INTO vc_dispatch_policy (id, min_lead_minutes, warn_lead_minutes, rest_minutes, require_manifest, require_contract, proxy_backdate_max_minutes, valid_from_at,
     created_at, updated_at, departure_window_minutes, duty_day_max_minutes, trip_no_break_max_minutes, accept_wait_minutes, auto_confirm_transfer)
     VALUES ('cs-tat', 360, 120, 30, 1, 0, 180, ?, ?, ?, 720, 480, 240, 10, 0)`, iso(ms("07:31")), AT, AT);
  loi(thu((cmd) => {
    for (const r of db.prepare("SELECT code, tier FROM vc_transfer_rule").all() as { code: string; tier: string }[]) {
      run(db, `INSERT INTO vc_transfer_check (id, transfer_id, cmd_id, rule_code, rule_tier, ket_qua, policy_row_id, checked_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'DAT', 'cs-tat', ?, ?, ?)`, nid("kc"), rid, cmd, r.code, r.tier, NHAN, NHAN, NHAN);
    }
  }), /ck_confirm_may/, "công tắc tắt lúc quyết");
  // Công tắc tắt + đủ dòng đạt ⇒ leo thang hợp lệ.
  lo(db, () => {
    const cmd = cong(db, x.a.id);
    cong(db, x.b.id, cmd);
    suKien(db, x.b.id, "TRANSFER_ESCALATED", cmd, { lienQuan: x.a.id, luc: NHAN, mode: "MAY" });
    for (const r of db.prepare("SELECT code, tier FROM vc_transfer_rule").all() as { code: string; tier: string }[]) {
      run(db, `INSERT INTO vc_transfer_check (id, transfer_id, cmd_id, rule_code, rule_tier, ket_qua, policy_row_id, checked_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'DAT', 'cs-tat', ?, ?, ?)`, nid("kc"), rid, cmd, r.code, r.tier, NHAN, NHAN, NHAN);
    }
    datQuyetDinh(db, rid, "ESCALATED", cmd, { party: x.b.tx });
  });
  assert.equal(trangThai(db, rid), "ESCALATED");
  const y = nen(db);
  const r2 = gui(db, y);
  db.exec("DROP TRIGGER vc_transfer_request_confirm_may");
  lo(db, () => {
    const cmd = cong(db, y.a.id);
    cong(db, y.b.id, cmd);
    suKien(db, y.b.id, "TRANSFER_CONFIRMED", cmd, { lienQuan: y.a.id, luc: NHAN, mode: "MAY" });
    datQuyetDinh(db, r2, "CONFIRMED", cmd, { party: y.b.tx });
  });
});

test("ck_escalate: leo thang thiếu bằng chứng (đủ dòng mà đều đạt, công tắc bật) → RAISE; bỏ trigger thì qua", () => {
  const db = openDb();
  const x = nen(db);
  const rid = gui(db, x);
  const leo = () => lo(db, () => {
    const cmd = cong(db, x.a.id);
    cong(db, x.b.id, cmd);
    suKien(db, x.b.id, "TRANSFER_ESCALATED", cmd, { lienQuan: x.a.id, luc: NHAN, mode: "MAY" });
    kiem(db, rid, cmd);
    datQuyetDinh(db, rid, "ESCALATED", cmd, { party: x.b.tx });
  });
  loi(leo, /ck_escalate/);
  db.exec("DROP TRIGGER vc_transfer_request_escalate_has_evidence");
  leo();
});

test("ck_confirm_core (TH03-3B, TH10-10B): ESCALATED → CONFIRMED khi có dòng KHONG_DAT tầng LOI ở BẤT KỲ lần kiểm nào → RAISE, kể cả khi lần duyệt kiểm lại đều đạt; chỉ tầng cấu hình → duyệt được; câu SQL tay nguyên văn của tệp tình huống cũng RAISE; bỏ trigger thì qua", () => {
  const db = openDb();
  const duyet = (x: Nen, rid: string, khac: Record<string, KetQua> = {}) => lo(db, () => {
    const cmd = cong(db, x.a.id);
    cong(db, x.b.id, cmd);
    suKien(db, x.b.id, "TRANSFER_CONFIRMED", cmd, { lienQuan: x.a.id, luc: NHAN, mode: "NGUOI" });
    kiem(db, rid, cmd, khac);
    run(db, `UPDATE vc_transfer_request SET status = 'CONFIRMED', decided_mode = 'NGUOI', decided_by = 's-qt', decided_at = ?, decided_cmd_id = ?, closed_cmd_id = ?,
       override_reason_code = 'PHA_LE_SU_CO', updated_at = ? WHERE id = ?`, NHAN, cmd, cmd, NHAN, rid);
    doiSuat(db, x, rid, cmd, "STOP", NHAN);
  });
  // TH03: leo thang vì SUC_CHUA_DICH (LOI).
  const x = nen(db);
  const rid = gui(db, x);
  assert.equal(nhan(db, x, rid, { khac: { SUC_CHUA_DICH: "KHONG_DAT" }, luc: iso(ms("07:31")) }).kq, "ESCALATED");
  loi(() => duyet(x, rid), /ck_confirm_core/, "lần kiểm của Nhận có LOI không đạt — lần duyệt đều đạt cũng chặn (ADR-0052:80)");
  loi(() => run(db, cauTay("TH03-3B-SQL-TAY").replace("'r-th03'", `'${rid}'`)), /ck_|CHECK constraint failed/, "câu nguyên văn TH03-3B");
  // TH02: leo thang chỉ vì MOC_TOI_THIEU (CAU_HINH) ⇒ duyệt được.
  const y = nen(db);
  const r2 = gui(db, y);
  nhan(db, y, r2, { khac: { MOC_TOI_THIEU: "KHONG_DAT" }, luc: iso(ms("07:31")) });
  duyet(y, r2, { MOC_TOI_THIEU: "KHONG_DAT" });
  const q = one<Record<string, string | null>>(db, "SELECT status, decided_mode, decided_by_party_id, override_reason_code FROM vc_transfer_request WHERE id = ?", r2);
  assert.deepEqual({ ...q }, { status: "CONFIRMED", decided_mode: "NGUOI", decided_by_party_id: y.b.tx, override_reason_code: "PHA_LE_SU_CO" });
  db.exec("DROP TRIGGER vc_transfer_request_confirm_core");
  duyet(x, rid);
});

test("ck_decided (Đ3 b): giữ hồ sơ người bấm Nhận, ghi lại người / giờ / dấu lệnh đúng một lần ở lần quyết thứ hai; chế độ sai cạnh → RAISE; Bác (TH10-10B-6) giữ decided_by_party_id; bỏ trigger thì qua", () => {
  const db = openDb();
  const x = nen(db);
  const rid = gui(db, x);
  const { cmd: c1 } = nhan(db, x, rid, { khac: { SUC_CHUA_DICH: "KHONG_DAT" }, luc: iso(ms("07:31")) });
  const bac = (o: { party?: string; cmdCu?: boolean }) => () => lo(db, () => {
    const cmd = cong(db, x.b.id);
    suKien(db, x.b.id, "TRANSFER_REJECTED", cmd, { lienQuan: x.a.id, luc: NHAN });
    const c = o.cmdCu ? c1 : cmd;
    run(db, `UPDATE vc_transfer_request SET status = 'REJECTED', decided_by = 's-qt', decided_at = ?, decided_cmd_id = ?, closed_cmd_id = ?, decided_by_party_id = ?,
       reject_reason_code = 'TU_CHOI_DAY_CHO', updated_at = ? WHERE id = ?`, NHAN, c, c, o.party ?? x.b.tx, NHAN, rid);
  });
  loi(bac({ party: x.a.tx }), /ck_decided/, "đổi hồ sơ người đã bấm Nhận");
  loi(bac({ cmdCu: true }), /ck_decided|ck_trong_lo/, "không ghi lại dấu lệnh");
  bac({})();
  const r = one<Record<string, string | null>>(db, "SELECT status, decided_by, decided_by_party_id, reject_reason_code FROM vc_transfer_request WHERE id = ?", rid);
  assert.deepEqual({ ...r }, { status: "REJECTED", decided_by: "s-qt", decided_by_party_id: x.b.tx, reject_reason_code: "TU_CHOI_DAY_CHO" });
  // Rút từ Chờ không đặt cột quyết định
  const r2 = gui(db, x, { stop: x.a.di });
  loi(() => lo(db, () => {
    const cmd = cong(db, x.b.id);
    suKien(db, x.b.id, "TRANSFER_WITHDRAWN", cmd, { lienQuan: x.a.id, luc: NHAN });
    run(db, "UPDATE vc_transfer_request SET status = 'WITHDRAWN', closed_cmd_id = ?, decided_mode = 'MAY', updated_at = ? WHERE id = ?", cmd, NHAN, r2);
  }), /ck_decided|CHECK constraint failed/, "rút mà đặt chế độ quyết");
  db.exec("DROP TRIGGER vc_transfer_request_cot_quyet_dinh");
  const x2 = nen(db);
  const r3 = gui(db, x2);
  nhan(db, x2, r3, { khac: { SUC_CHUA_DICH: "KHONG_DAT" }, luc: iso(ms("07:31")) });
  lo(db, () => {
    const cmd = cong(db, x2.b.id);
    suKien(db, x2.b.id, "TRANSFER_REJECTED", cmd, { lienQuan: x2.a.id, luc: NHAN });
    run(db, `UPDATE vc_transfer_request SET status = 'REJECTED', decided_by = 's-qt', decided_at = ?, decided_cmd_id = ?, closed_cmd_id = ?, decided_by_party_id = ?,
       reject_reason_code = 'TU_CHOI_DAY_CHO', updated_at = ? WHERE id = ?`, NHAN, cmd, cmd, x2.a.tx, NHAN, r3);
  });
});

test("ck_nguoi_nhan (TH08-4D): người quyết lần thứ nhất không phải tài xế đang lái xe nhận → RAISE; câu SQL tay nguyên văn cũng RAISE; bỏ trigger thì qua", () => {
  const db = openDb();
  const x = nen(db);
  const rid = gui(db, x);
  const la = hoSo(db, "Không lái");
  loi(() => nhan(db, x, rid, { party: la }), /ck_nguoi_nhan/);
  loi(() => run(db, cauTay("TH08-4D-SQL-TAY-NHAN-THAY").replace("'<hồ sơ không lái CX-3009-05>'", `'${la}'`).replace("'r-th08'", `'${rid}'`)), /ck_|CHECK constraint failed/);
  db.exec("DROP TRIGGER vc_transfer_request_nguoi_nhan");
  nhan(db, x, rid, { party: la });
});

test("ck_han_cho (MQ-08): trả lời sau hạn (giờ gửi + 10 phút của chính sách lúc gửi) → RAISE; ghi Hết hạn trước hạn → RAISE; Hết hạn từ hạn trở đi → qua; bỏ trigger thì qua", () => {
  const db = openDb();
  const x = nen(db);
  const rid = gui(db, x);
  loi(() => nhan(db, x, rid, { luc: TRE }), /ck_han_cho/, "Nhận muộn");
  const hetHan = (luc: string) => () => lo(db, () => {
    const cmd = cong(db, x.b.id);
    suKien(db, x.b.id, "TRANSFER_EXPIRED", cmd, { lienQuan: x.a.id, luc, mode: "MAY" });
    run(db, "UPDATE vc_transfer_request SET status = 'EXPIRED', closed_cmd_id = ?, updated_at = ? WHERE id = ?", cmd, luc, rid);
  });
  loi(hetHan(NHAN), /ck_han_cho/, "chưa tới hạn");
  hetHan(iso(ms("07:40")))();
  assert.equal(trangThai(db, rid), "EXPIRED");
  const y = nen(db);
  const r2 = gui(db, y);
  db.exec("DROP TRIGGER vc_transfer_request_han_cho");
  nhan(db, y, r2, { luc: TRE });
});

test("ck_trong_lo: đóng đề nghị bằng dấu lệnh không phải dấu lệnh hiện hành của nguồn hay đích → RAISE; tự huỷ trong lô của nguồn (MQ-09) → qua; bỏ trigger thì qua", () => {
  const db = openDb();
  const x = nen(db);
  const rid = gui(db, x);
  loi(() => run(db, "UPDATE vc_transfer_request SET status = 'VOID', closed_cmd_id = ?, updated_at = ? WHERE id = ?", randomUUID(), NHAN, rid), /ck_trong_lo/);
  lo(db, () => {
    const cmd = cong(db, x.a.id);
    suKien(db, x.a.id, "STOP_ARRIVED", cmd, { luc: NHAN });
    run(db, "UPDATE vc_transfer_request SET status = 'VOID', closed_cmd_id = ?, updated_at = ? WHERE id = ? AND status IN ('PENDING', 'ESCALATED')", cmd, NHAN, rid);
  });
  assert.equal(trangThai(db, rid), "VOID");
  const r2 = gui(db, x, { stop: x.a.tra === "" ? null : x.a.di });
  db.exec("DROP TRIGGER vc_transfer_request_dong_trong_lo");
  run(db, "UPDATE vc_transfer_request SET status = 'VOID', closed_cmd_id = ?, updated_at = ? WHERE id = ?", randomUUID(), NHAN, r2);
});

test("ck_ly_do: Không nhận / Bác lý do ngoài nhóm TU_CHOI_NHAN, Duyệt lý do ngoài nhóm PHA_LE → RAISE; Không nhận thiếu lý do → CHECK; bỏ trigger thì qua", () => {
  const db = openDb();
  const x = nen(db);
  const rid = gui(db, x);
  const khongNhan = (lyDo: string | null) => () => lo(db, () => {
    const cmd = cong(db, x.b.id);
    suKien(db, x.b.id, "TRANSFER_DECLINED", cmd, { lienQuan: x.a.id, luc: NHAN });
    datQuyetDinh(db, rid, "DECLINED", cmd, { party: x.b.tx, lyDo: lyDo ? { decline: lyDo } : {} });
  });
  loi(khongNhan(null), /CHECK constraint failed/, "thiếu lý do");
  loi(khongNhan("PHA_LE_SU_CO"), /ck_ly_do/, "lý do nhóm khác");
  khongNhan("TU_CHOI_KHONG_KIP")();
  assert.equal(trangThai(db, rid), "DECLINED");
  const r2 = gui(db, x);
  db.exec("DROP TRIGGER vc_transfer_request_ly_do");
  lo(db, () => {
    const cmd = cong(db, x.b.id);
    suKien(db, x.b.id, "TRANSFER_DECLINED", cmd, { lienQuan: x.a.id, luc: NHAN });
    datQuyetDinh(db, r2, "DECLINED", cmd, { party: x.b.tx, lyDo: { decline: "PHA_LE_SU_CO" } });
  });
});

test("ck_identity / ck_append_only: nội dung đề nghị không đổi, không xoá; dòng kiểm không sửa, không xoá", () => {
  const db = openDb();
  const x = nen(db);
  const rid = gui(db, x);
  loi(() => run(db, "UPDATE vc_transfer_request SET pax_count = 2 WHERE id = ?", rid), /ck_identity|ck_forward/);
  // giữ trạng thái mà đổi nội dung kèm một cạnh hợp lệ: vẫn chặn (ck_identity)
  loi(() => run(db, "UPDATE vc_transfer_request SET pax_count = 2, status = 'VOID', closed_cmd_id = ? WHERE id = ?", one<{ c: string }>(db, "SELECT last_cmd_id c FROM vc_trip WHERE id = ?", x.b.id).c, rid), /ck_identity/);
  loi(() => run(db, "UPDATE vc_transfer_request SET to_trip_id = ? WHERE id = ?", x.a.id, rid), /ck_identity|ck_forward|CHECK/);
  loi(() => run(db, "DELETE FROM vc_transfer_request WHERE id = ?", rid), /ck_append_only/);
  nhan(db, x, rid, { khac: { SUC_CHUA_DICH: "KHONG_DAT" }, luc: iso(ms("07:31")) });
  loi(() => run(db, "UPDATE vc_transfer_check SET ket_qua = 'DAT' WHERE transfer_id = ?", rid), /ck_append_only/);
  loi(() => run(db, "DELETE FROM vc_transfer_check WHERE transfer_id = ?", rid), /ck_append_only/);
});

test("ck_check: dòng kiểm sai tầng / điều kiện đã tắt / chính sách không hiện hành / ngoài lô của xe nhận / đề nghị đã đóng → RAISE; bỏ trigger thì qua", () => {
  const db = openDb();
  const x = nen(db);
  const rid = gui(db, x);
  const ghi = (o: { tier?: string; rule?: string; cmd?: string; policy?: string }) => () =>
    run(db, `INSERT INTO vc_transfer_check (id, transfer_id, cmd_id, rule_code, rule_tier, ket_qua, policy_row_id, checked_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'DAT', ?, ?, ?, ?)`,
      nid("kc"), rid, o.cmd ?? one<{ c: string }>(db, "SELECT last_cmd_id c FROM vc_trip WHERE id = ?", x.b.id).c, o.rule ?? "SUC_CHUA_DICH", o.tier ?? "LOI", o.policy ?? POLICY, NHAN, NHAN, NHAN);
  loi(ghi({ tier: "CAU_HINH" }), /ck_check/, "sai tầng");
  loi(ghi({ cmd: randomUUID() }), /ck_check/, "ngoài lô của xe nhận");
  run(db, "UPDATE vc_transfer_rule SET active = 0 WHERE code = 'GIAY_TO_DICH'");
  loi(ghi({ rule: "GIAY_TO_DICH" }), /ck_check/, "điều kiện đã tắt");
  ghi({})();
  db.exec("DROP TRIGGER vc_transfer_check_rule");
  ghi({ rule: "KHONG_CHEO", tier: "CAU_HINH", cmd: randomUUID() })();
});

// ---- (4)(5) Suất và LC-15 ------------------------------------------------------------------------------------------------------------------------------
test("lc15_transfer: mở suất mang transfer_id ngoài lô xác nhận / không chép suất nguồn / sai cờ thêm sau xuất bến / chèn sẵn closed_transfer_id → RAISE; đóng TRANSFERRED ngoài lô xác nhận → RAISE; transfer_id bất biến; closed_transfer_id chỉ trong câu đóng; bỏ trigger thì qua", () => {
  const db = openDb();
  const x = nen(db);
  const rid = gui(db, x);
  const { cmd } = nhan(db, x, rid);
  loi(() => suat(db, x.b.id, x.b.di, x.d.leg, { key: x.d.khach[0]!, sau: 1, cmd, luc: NHAN, transfer: rid }), /lc15_|UNIQUE/, "ngoài lô xác nhận");
  loi(() => run(db, `INSERT INTO vc_trip_allocation (id, trip_id, kind, leg_id, board_stop_id, status, valid_from_at, closed_transfer_id, created_at, updated_at)
     VALUES (?, ?, 'PASSENGER', ?, ?, 'WAITING', ?, ?, ?, ?)`, nid("al"), x.b.id, x.d.leg, x.b.di, NHAN, rid, NHAN, NHAN), /lc15_/, "chèn sẵn closed_transfer_id");
  // Xe nhận chưa chạy (không vướng LC-15): suất mang transfer_id không chép đúng suất nguồn / sai cờ / khác lô → chỉ trigger mới chặn.
  const p = nen(db, { bChay: false });
  const rp = gui(db, p);
  const { cmd: cp } = nhan(db, p, rp);
  loi(() => suat(db, p.b.id, p.b.di, p.d.leg, { key: null, cmd: cp, luc: NHAN, transfer: rp }), /lc15_transfer/, "không chép suất nguồn (khác người)");
  loi(() => suat(db, p.b.id, p.b.di, p.d.leg, { key: null, cmd: randomUUID(), luc: NHAN, transfer: rp }), /lc15_transfer/, "khác lô");
  loi(() => suat(db, p.b.id, p.b.di, p.d.leg, { key: null, trangThai: "BOARDED", cmd: cp, luc: NHAN, transfer: rp }), /lc15_transfer/, "STOP mà trạng thái đã lên");
  const daMo = one<{ id: string }>(db, "SELECT id FROM vc_trip_allocation WHERE transfer_id = ? LIMIT 1", rid).id;
  loi(() => run(db, "UPDATE vc_trip_allocation SET transfer_id = NULL WHERE id = ?", daMo), /lc04_identity/, "transfer_id bất biến");
  loi(() => run(db, "UPDATE vc_trip_allocation SET closed_transfer_id = ? WHERE id = ?", rid, daMo), /lc15_transfer|CHECK/, "closed_transfer_id ngoài câu đóng");
  // Đóng TRANSFERRED ngoài lô xác nhận (xe nguồn chưa chạy — không vướng LC-15 cũ, chỉ trigger mới chặn).
  const y = nen(db);
  const r2 = gui(db, y);
  const c2 = cong(db, y.a.id);
  loi(() => run(db, "UPDATE vc_trip_allocation SET valid_to_at = ?, close_reason = 'TRANSFERRED', closed_by = 's', closed_cmd_id = ?, closed_transfer_id = ? WHERE id = ?", NHAN, c2, r2, y.cho[0]!),
    /lc15_/, "đề nghị chưa xác nhận");
  db.exec("DROP TRIGGER vc_trip_allocation_transfer_close");
  db.exec("DROP TRIGGER vc_trip_running_locked_alloc_close");
  db.exec("DROP TRIGGER vc_trip_allocation_transfer_ins");
  suat(db, p.b.id, p.b.di, p.d.leg, { key: null, cmd: randomUUID(), luc: NHAN, transfer: rp });
  run(db, "UPDATE vc_trip_allocation SET valid_to_at = ?, close_reason = 'TRANSFERRED', closed_by = 's', closed_cmd_id = ?, closed_transfer_id = ? WHERE id = ?", NHAN, c2, r2, y.cho[0]!);
});

test("LC-15 đường thứ tư: chèn thẳng suất ĐÃ LÊN vào xe đang chạy tại điểm chưa tới dưới sự kiện TRANSFER_CONFIRMED (khớp đề nghị) → qua; không có sự kiện đó → lc15_running; thêm điểm dưới TRANSFER_CONFIRMED → qua, dưới TRANSFER_SENT → RAISE; xe nhận chưa chạy: suất chuyển sang mang cờ 0", () => {
  const db = openDb();
  const x = nen(db, { daLen: 2 });
  const rid = gui(db, x, { scope: "ONBOARD" });
  nhan(db, x, rid, { scope: "ONBOARD" }); // đi qua: BOARDED chèn thẳng tại điểm PENDING (nơi gặp) dưới TRANSFER_CONFIRMED
  const coLen = db.prepare(`SELECT 1 FROM vc_trip_allocation a JOIN vc_trip_stop s ON s.id = a.board_stop_id WHERE a.trip_id = ? AND a.status = 'BOARDED' AND s.status = 'PENDING'`).all(x.b.id);
  assert.equal(coLen.length, 2);
  // Không có sự kiện chuyển khách: chèn BOARDED vào xe đang chạy bị LC-15 chặn.
  const c = cong(db, x.b.id);
  loi(() => suat(db, x.b.id, x.b.di, x.d.leg, { trangThai: "BOARDED", sau: 1, cmd: c, luc: NHAN }), /lc15_running/);
  // Điểm: dưới TRANSFER_SENT → chặn
  const y = nen(db);
  gui(db, y);
  loi(() => diem(db, y.b.id, "PICKUP", { seq: 5, chay: 1, loc: LOC2 }), /lc15_running/);
  // Xe nhận chưa chạy: suất chuyển sang mang added_after_departure = 0, điểm added_while_running = 0
  const z = nen(db, { bChay: false });
  const r3 = gui(db, z);
  nhan(db, z, r3);
  assert.deepEqual(moCua(db, z.b.id).map((s) => s.sau), [0, 0, 0]);
});

// ---- (6) Đ5 — thu hồi xuất bến ------------------------------------------------------------------------------------------------------------------------
function thuHoi(db: Db, trip: string): void {
  lo(db, () => {
    const cmd = cong(db, trip);
    run(db, `INSERT INTO vc_trip_event (id, trip_id, kind, request_id, decided_mode, occurred_at, occurred_ms, occurred_source, reason_code, created_at, updated_at)
       VALUES (?, ?, 'DEPARTURE_REVOKED', ?, 'NGUOI', ?, ?, 'MAY_CHU', 'DIEU_CHINH_BAM_NHAM', ?, ?)`, cmd, trip, randomUUID(), iso(ms("07:50")), ms("07:50"), iso(ms("07:50")), iso(ms("07:50")));
    run(db, "UPDATE vc_trip SET status = 'PLANNED', departed_at = NULL, departed_ms = NULL WHERE id = ? AND last_cmd_id = ?", trip, cmd);
  });
}
test("Đ5: xe nguồn đã giao khách (TRANSFER_CONFIRMED mang related = nó) → không thu hồi xuất bến; xe nhận chỉ có đề nghị chưa thành (gửi / không nhận / leo thang / bác / rút / hết hạn) → thu hồi được; xe nhận đã nhận khách → không; bỏ trigger thì qua", () => {
  const db = openDb();
  const x = nen(db);
  const rid = gui(db, x);
  nhan(db, x, rid);
  loi(() => thuHoi(db, x.a.id), /dc_revoke_progress/, "nguồn đã giao khách");
  loi(() => thuHoi(db, x.b.id), /dc_revoke_progress/, "đích đã nhận khách");
  const y = nen(db);
  const r2 = gui(db, y);
  lo(db, () => {
    const cmd = cong(db, y.b.id);
    suKien(db, y.b.id, "TRANSFER_DECLINED", cmd, { lienQuan: y.a.id, luc: NHAN });
    datQuyetDinh(db, r2, "DECLINED", cmd, { party: y.b.tx, lyDo: { decline: "TU_CHOI_KHONG_KIP" } });
  });
  gui(db, y); // đề nghị Chờ còn lại — lô thu hồi của máy chủ sẽ huỷ nó (ở đây chỉ kiểm trigger chặn)
  thuHoi(db, y.b.id);
  assert.equal(one<{ s: string }>(db, "SELECT status s FROM vc_trip WHERE id = ?", y.b.id).s, "PLANNED");
  db.exec("DROP TRIGGER vc_trip_revoke_no_progress");
  thuHoi(db, x.a.id);
});
