// Kiểm migration 0046 — Nhóm dịch vụ (ADR-0058): ctl_group + ctl_service_group (lịch sử gán chỉ-thêm), gieo 14 nhóm / 110 dịch vụ — trên SQLite thật (node:sqlite).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

const DIR = join(import.meta.dirname, "..", "migrations");
const TEN_0046 = "0046_nhom_dich_vu.sql";
const T = "2026-09-30T01:00:00.000Z";

/** Nạp mọi migration có tên nhỏ hơn `ten` (hoặc tới hết nếu bỏ trống), theo thứ tự — để chèn catalog_item TRƯỚC khi 0046 gieo. */
function moiToi(ten?: string): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort()) {
    if (ten !== undefined && f >= ten) break;
    db.exec(readFileSync(join(DIR, f), "utf8"));
  }
  return db;
}
function napMigration(db: DatabaseSync, ten: string): void {
  db.exec(readFileSync(join(DIR, ten), "utf8"));
}
function chenDichVu(db: DatabaseSync, ma: string): void {
  db.prepare(`INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES (?, ?, 'perPax', 100000, 1, ?, ?)`).run(ma, `Dịch vụ ${ma}`, T, T);
}

// Chép TAY từ ADR-0058 mục "Bảng gieo — 14 nhóm, 110 dịch vụ" (đối chiếu ảnh chụp CSV 2026-09-30 sha256 6a06864f…f713). KHÔNG đọc từ tệp migration.
// ATV: CSV ghi mã nhóm TBA (lỗi), ADR sửa thành KON.
const BANG_GIEO: Record<string, string[]> = {
  TDA: ["TDMCT1", "TDMCM", "TDMCT2", "TD1", "TD2", "TDTCT", "TDTCSH", "TDSNO", "TDMCS", "TDTCS", "TDSCT"],
  LPH: ["LPCBT", "LPCB", "LPDK", "LPHL", "LPDKHL"],
  HTA: ["SM3", "SD3", "SD1", "SM1"],
  VHB: ["VHB", "VHBT", "VHBTB"],
  VIN: ["V2D", "V3D", "V16", "VB16", "VTC", "VB350", "VB500"],
  DTH: ["DTE1", "DTE2", "DTMSC", "DTMTY", "DTVYDT", "DTVYST"],
  TTB: ["TTBSNO", "TTBPC", "TTBDD2", "TTBFLY", "TTBL215", "TTBSW", "TTBSD", "TTBDD1", "TTBL230", "TTBL260", "TTBL115", "TTBL130", "TTBL160", "TTBPP5", "TTBPR5", "TTBPR8", "TTBPB", "TTBLV", "TTBS30", "TTBS60", "TTBS90", "TTBTD30", "TTBTD60"],
  IRS: ["IRTK", "IRTKA", "IRTD1", "IRTD4", "IRTB1", "IRTB4", "IRTBTD1", "IRTBTD4", "IRTBTDA1", "IRTBTDA4"],
  KON: ["ZIP", "ZA1", "ZA2", "ATV"],
  TTR: ["TTKP", "TTTG", "TTTT", "TTKPA", "TTTGA", "TTTHA"],
  NHD: ["NHDRMD", "NHDRMT", "NHDRMZ", "NHDCSD", "NHDCST", "NHDCSZ"],
  TBA: ["TBTK", "TBTD1", "TBTD3", "TBTD6", "TBTB1", "TBTB3", "TBTB6", "TBTBTD1", "TBTBTD3", "TBTBTD6", "TBNS1", "TBNS2", "TBNS3"],
  TXE: ["SB16D", "SB7D", "SB4D", "SB16T", "SB4T", "SB7T"],
  BUS: ["BCT1", "BCT4", "BCT24", "BFN1", "BFN4", "BFNP"],
};
const TEN_NHOM: [string, string][] = [
  ["TDA", "Tour đảo"],
  ["LPH", "Long Phú"],
  ["HTA", "Hòn Tằm"],
  ["VHB", "Harbour"],
  ["VIN", "Vinwonders"],
  ["DTH", "Du thuyền"],
  ["TTB", "Thể thao biển"],
  ["IRS", "I Resort"],
  ["KON", "Kong Forest"],
  ["TTR", "Trăm trứng"],
  ["NHD", "Nhà hát Đó"],
  ["TBA", "Tháp Bà"],
  ["TXE", "Thuê xe"],
  ["BUS", "Buýt City Tour"],
];
const TAT_CA_MA = Object.values(BANG_GIEO).flat();
const THEO_MA = Object.fromEntries(Object.entries(BANG_GIEO).flatMap(([g, ms]) => ms.map((m) => [m, g])));

test("NT-A3: danh sách gieo trong 0046 đúng bảng ADR-0058 (110 cặp, 14 nhóm, ATV → KON)", () => {
  assert.equal(TAT_CA_MA.length, 110, "hằng chép từ ADR phải đủ 110");
  assert.equal(new Set(TAT_CA_MA).size, 110);
  assert.equal(Object.keys(BANG_GIEO).length, 14);
  const sql = readFileSync(join(DIR, TEN_0046), "utf8");
  const cap = [...sql.matchAll(/\('([A-Z0-9]+)', ?'([A-Z]{3})'\)/g)].map((m) => [m[1], m[2]] as [string, string]);
  assert.equal(cap.length, 110);
  assert.equal(new Set(cap.map((c) => c[0])).size, 110, "không trùng mã");
  assert.deepEqual(Object.fromEntries(cap), THEO_MA);
  assert.equal(Object.fromEntries(cap).ATV, "KON");
});

test("NT-A3: 14 nhóm gieo đúng tên và thứ tự sort_order 1…14 của bảng ADR", () => {
  const db = moiToi();
  const rows = db.prepare("SELECT code, name, sort_order, active FROM ctl_group ORDER BY sort_order").all() as { code: string; name: string; sort_order: number; active: number }[];
  assert.deepEqual(rows.map((r) => [r.code, r.name]), TEN_NHOM);
  assert.deepEqual(rows.map((r) => r.sort_order), Array.from({ length: 14 }, (_, i) => i + 1));
  assert.ok(rows.every((r) => r.active === 1));
});

test("NT-A2: DB có đủ 110 mã → 14 nhóm, 110 gán seq = 1, một dòng nhật ký gieo", () => {
  const db = moiToi(TEN_0046);
  for (const ma of TAT_CA_MA) chenDichVu(db, ma);
  napMigration(db, TEN_0046);
  assert.equal((db.prepare("SELECT COUNT(*) AS n FROM ctl_group").get() as { n: number }).n, 14);
  const gan = db.prepare("SELECT service_code, group_code, seq, created_by, valid_from_at FROM ctl_service_group").all() as { service_code: string; group_code: string; seq: number; created_by: string | null; valid_from_at: string }[];
  assert.equal(gan.length, 110);
  assert.ok(gan.every((g) => g.seq === 1 && g.created_by === null));
  assert.ok(gan.every((g) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(g.valid_from_at)), "mốc ISO UTC có mili-giây");
  assert.equal(new Set(gan.map((g) => g.service_code)).size, 110, "một dòng hiện hành mỗi mã");
  const theoMa = Object.fromEntries(gan.map((g) => [g.service_code, g.group_code]));
  assert.equal(theoMa.ATV, "KON");
  assert.equal(theoMa.TTBSNO, "TTB");
  assert.deepEqual(theoMa, THEO_MA);
  const nk = db.prepare("SELECT id, order_id, staff_id, action, target_type, detail FROM audit_log WHERE action = 'catalog_groups_seeded'").all() as { id: string; order_id: string | null; staff_id: string | null; target_type: string; detail: string }[];
  assert.equal(nk.length, 1);
  assert.equal(nk[0].id, "gieo-nhom-dich-vu");
  assert.equal(nk[0].order_id, null);
  assert.equal(nk[0].staff_id, null);
  assert.equal(nk[0].target_type, "catalog");
  assert.equal(nk[0].detail, "gieo 14 nhóm, 110 dịch vụ");
});

test("NT-A2: DB chưa đồng bộ Sheet → 14 nhóm, 0 gán, detail 'gieo 14 nhóm, 0 dịch vụ'", () => {
  const db = moiToi();
  assert.equal((db.prepare("SELECT COUNT(*) AS n FROM ctl_group").get() as { n: number }).n, 14);
  assert.equal((db.prepare("SELECT COUNT(*) AS n FROM ctl_service_group").get() as { n: number }).n, 0);
  const nk = db.prepare("SELECT detail FROM audit_log WHERE action = 'catalog_groups_seeded'").all() as { detail: string }[];
  assert.deepEqual(nk.map((r) => r.detail), ["gieo 14 nhóm, 0 dịch vụ"]);
});

test("NT-A2: DB thiếu một phần mã → chỉ gán mã có mặt trong bảng gieo; mã lạ (mới trên Sheet) không có dòng gán", () => {
  const db = moiToi(TEN_0046);
  for (const ma of ["TDMCT1", "ATV", "MOI1"]) chenDichVu(db, ma);
  napMigration(db, TEN_0046);
  const gan = db.prepare("SELECT service_code, group_code FROM ctl_service_group ORDER BY service_code").all().map((r) => ({ ...r }));
  assert.deepEqual(gan, [
    { service_code: "ATV", group_code: "KON" },
    { service_code: "TDMCT1", group_code: "TDA" },
  ]);
  assert.equal((db.prepare("SELECT detail FROM audit_log WHERE action = 'catalog_groups_seeded'").get() as { detail: string }).detail, "gieo 14 nhóm, 2 dịch vụ");
});

function moiDayDu(): DatabaseSync {
  const db = moiToi(TEN_0046);
  for (const ma of ["TDMCT1", "TDMCM", "ATV"]) chenDichVu(db, ma);
  napMigration(db, TEN_0046);
  return db;
}
const ghiGan = (db: DatabaseSync, id: string, ma: string, nhom: string | null, seq: number) =>
  db.prepare("INSERT INTO ctl_service_group (id, service_code, group_code, seq, valid_from_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(id, ma, nhom, seq, T, T, T);

test("NT-A1: ctl_service_group chỉ-thêm (không sửa, không xoá)", () => {
  const db = moiDayDu();
  assert.throws(() => db.exec("UPDATE ctl_service_group SET group_code = 'LPH' WHERE service_code = 'TDMCT1'"), /ctl_append_only/);
  assert.throws(() => db.exec("DELETE FROM ctl_service_group WHERE service_code = 'TDMCT1'"), /ctl_append_only/);
  assert.throws(() => db.exec("DELETE FROM ctl_service_group"), /ctl_append_only/);
});

test("NT-A1: ctl_group không xoá được (tắt bằng active = 0), sửa tên / tắt vẫn được", () => {
  const db = moiDayDu();
  assert.throws(() => db.exec("DELETE FROM ctl_group WHERE code = 'BUS'"), /ctl_append_only/);
  assert.throws(() => db.exec("DELETE FROM ctl_group"), /ctl_append_only/);
  db.exec("UPDATE ctl_group SET name = 'Xe buýt', active = 0 WHERE code = 'BUS'");
  assert.equal((db.prepare("SELECT active FROM ctl_group WHERE code = 'BUS'").get() as { active: number }).active, 0);
});

test("NT-A1: gán vào nhóm đang tắt bị chặn; bật lại thì gán được; gán NULL (Chưa phân loại) luôn được", () => {
  const db = moiDayDu();
  db.exec("UPDATE ctl_group SET active = 0 WHERE code = 'LPH'");
  assert.throws(() => ghiGan(db, "g1", "TDMCT1", "LPH", 2), /ctl_group_inactive/);
  ghiGan(db, "g2", "TDMCT1", null, 2);
  db.exec("UPDATE ctl_group SET active = 1 WHERE code = 'LPH'");
  ghiGan(db, "g3", "TDMCT1", "LPH", 3);
  const hienHanh = db.prepare("SELECT group_code FROM ctl_service_group WHERE service_code = 'TDMCT1' ORDER BY seq DESC LIMIT 1").get() as { group_code: string };
  assert.equal(hienHanh.group_code, "LPH");
});

test("NT-A1: khoá ngoại — service_code phải có trong catalog_item; nhóm lạ bị chặn", () => {
  const db = moiDayDu();
  assert.throws(() => ghiGan(db, "g1", "KHONGCO", "TDA", 1), /FOREIGN KEY/);
  assert.throws(() => ghiGan(db, "g2", "TDMCT1", "ZZZ", 2), /ctl_group_inactive/);
});

test("NT-A1: trùng (service_code, seq) → lỗi duy nhất; seq < 1 → lỗi CHECK", () => {
  const db = moiDayDu();
  assert.throws(() => ghiGan(db, "g1", "TDMCT1", "TDA", 1), /UNIQUE/);
  assert.throws(() => ghiGan(db, "g2", "TDMCT1", "TDA", 0), /CHECK/);
});

test("NT-A1: tên trùng giữa hai nhóm ĐANG DÙNG → lỗi duy nhất; nhóm tắt thì trùng được; bật lại nhóm trùng tên → lỗi duy nhất", () => {
  const db = moiDayDu();
  const chenNhom = (code: string, ten: string, active: number) =>
    db.prepare("INSERT INTO ctl_group (code, name, sort_order, active, created_at, updated_at) VALUES (?, ?, 99, ?, ?, ?)").run(code, ten, active, T, T);
  assert.throws(() => chenNhom("XXX", "Tour đảo", 1), /UNIQUE/);
  chenNhom("YYY", "Tour đảo", 0);
  assert.throws(() => db.exec("UPDATE ctl_group SET active = 1 WHERE code = 'YYY'"), /UNIQUE/);
  assert.throws(() => db.exec("UPDATE ctl_group SET name = 'Long Phú' WHERE code = 'TDA'"), /UNIQUE/);
  assert.throws(() => chenNhom("ZZZ", "", 1), /CHECK/);
  assert.throws(() => chenNhom("ZZY", "x".repeat(41), 1), /CHECK/);
  assert.throws(() => chenNhom("ZZX", "Tên", 2), /CHECK/);
});
