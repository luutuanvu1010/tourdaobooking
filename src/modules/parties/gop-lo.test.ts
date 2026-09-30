// Bộ dựng lô gộp (ADR-0068 Đ1) chạy trên SQLite THẬT (schema từ migrations): G13 tất định (hai lô từ CÙNG một kế hoạch chạy lần lượt — lô sau không đổi gì),
// G8 chuỗi CCCD (không vướng trigger *_superseded / *_cccd_one_person_ins), Review Focus 5 (vai Nhà xe có ở B TRƯỚC quan hệ "Tài xế của" → B),
// Review Focus 1 (B vừa có liên hệ chính sau khi tính kế hoạch → cả lô huỷ, không đổi gì).
import { test } from "node:test";
import assert from "node:assert/strict";
import type { DatabaseSync } from "node:sqlite";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { fakeD1, openDb } from "../../../tests/audit/harness.mjs";
import { keHoachGop, type HoSoGop, type NgoaiGop } from "./gop.ts";
import { loGop } from "./gop-lo.ts";
import { docsForMerge } from "./repository.ts";

const AT = "2026-09-01T00:00:00.000Z";
const AT2 = "2026-10-01T03:00:00.000Z";
const HOM_NAY = "2026-10-01";
const RANH: NgoaiGop = { phuTrachDon: 0, laiChuyen: 0, toLaiChuyen: 0, chuXeChuyen: 0, soXe: 0, donLechTien: [] };
const hs = (id: string, x: Partial<HoSoGop> = {}): HoSoGop => ({
  id, kind: "PERSON", displayName: id, active: true, mergedIntoId: null, laCongTyChu: false, coTaiKhoan: false, coHoSoTroVao: false, lienHe: [], congViec: [], quanHe: [], giayTo: [], ...x,
});
function nguoi(db: DatabaseSync, id: string) {
  db.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'PERSON', ?, 1, ?, ?)").run(id, id, AT, AT);
  db.prepare("INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES (?, ?, ?, ?)").run(id, id, AT, AT);
}
const lienHe = (db: DatabaseSync, id: string, party: string, so: string, chinh: 0 | 1) =>
  db.prepare(`INSERT INTO pty_contact_point (id, party_id, contact_kind_code, value, value_normalized, label, is_primary, valid_from_date, created_at, updated_at)
    VALUES (?, ?, 'PHONE', ?, ?, NULL, ?, '2026-09-01', ?, ?)`).run(id, party, so, so, chinh, AT, AT);
const vai = (db: DatabaseSync, id: string, party: string, code: string) =>
  db.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, location_id, valid_from_date, created_at, updated_at) VALUES (?, ?, ?, NULL, '2026-09-01', ?, ?)").run(id, party, code, AT, AT);
const quanHe = (db: DatabaseSync, id: string, from: string, to: string, type: string) =>
  db.prepare("INSERT INTO pty_party_relationship (id, from_party_id, to_party_id, relationship_type_code, valid_from_date, created_at, updated_at) VALUES (?, ?, ?, ?, '2026-09-01', ?, ?)")
    .run(id, from, to, type, AT, AT);
const lh = (id: string, so: string, chinh: boolean) => ({ id, kind: "PHONE", value: so, valueNormalized: so, label: null, isPrimary: chinh, validFrom: "2026-09-01", validTo: null });
const cv = (id: string, code: string) => ({ id, code, name: code, group: "OTHER" as const, locationId: null, locationName: null, validFrom: "2026-09-01", validTo: null });
const q = (db: DatabaseSync, sql: string, ...a: unknown[]) => db.prepare(sql).all(...(a as never[])) as Record<string, unknown>[];
const lo = (D: unknown, a: HoSoGop, b: HoSoGop, giayToDu = new Map()) => {
  const l = loGop(D as D1Database, { a: a.id, b: b.id, ke: keHoachGop(a, b, RANH, HOM_NAY), giayToDu, homNay: HOM_NAY, at: AT2, actorId: "s-test" });
  return [...l.truocDon, l.lat];
};
const dem = (db: DatabaseSync) => q(db, `SELECT
  (SELECT count(*) FROM pty_contact_point WHERE party_id = 'pb' AND valid_to_date IS NULL) AS lh_b,
  (SELECT count(*) FROM pty_party_role WHERE party_id = 'pb' AND valid_to_date IS NULL) AS vai_b,
  (SELECT count(*) FROM pty_contact_point) AS lh, (SELECT count(*) FROM pty_party_role) AS vai`)[0];

test("G13 tất định: lô thứ nhất lật A; lô thứ hai (cùng kế hoạch) — câu lật changes = 0 và KHÔNG dòng nào đổi", async () => {
  const db = openDb();
  const D = fakeD1(db);
  nguoi(db, "pa"); nguoi(db, "pb");
  lienHe(db, "c1", "pa", "0912000111", 1);
  vai(db, "r1", "pa", "BOAT_CAPTAIN");
  const a = hs("pa", { lienHe: [lh("c1", "0912000111", true)], congViec: [cv("r1", "BOAT_CAPTAIN")] });
  const r1 = await D.batch(lo(D, a, hs("pb")));
  assert.equal(r1.at(-1).meta.changes, 1);
  assert.deepEqual({ ...q(db, "SELECT active, merged_into_id m FROM pty_party WHERE id = 'pa'")[0] }, { active: 0, m: "pb" });
  const truoc = { ...dem(db) };
  assert.deepEqual(truoc.lh_b, 1);
  const r2 = await D.batch(lo(D, a, hs("pb")));
  assert.equal(r2.at(-1).meta.changes, 0);
  assert.deepEqual({ ...dem(db) }, truoc, "lô thua không chuyển thêm dòng nào");
});

// F3: chỉ liên hệ PHỤ (không chính) — lô thua mà thiếu lính gác sẽ chèn thêm dòng cho B (không bị chỉ mục liên hệ chính duy nhất chặn hộ), nên bài này đỏ
// ĐÚNG vì lính gác trạng thái. G13 ở trên dùng liên hệ chính: gỡ lính gác thì chỉ mục duy nhất làm lô thứ hai hỏng thay, che mất lỗi.
test("G13 lô thua với liên hệ phụ: lính gác trạng thái (không phải chỉ mục duy nhất) giữ lô thứ hai không chèn thêm dòng", async () => {
  const db = openDb();
  const D = fakeD1(db);
  nguoi(db, "pa"); nguoi(db, "pb");
  lienHe(db, "c1", "pa", "0912000111", 0);
  const a = hs("pa", { lienHe: [lh("c1", "0912000111", false)] });
  const r1 = await D.batch(lo(D, a, hs("pb")));
  assert.equal(r1.at(-1).meta.changes, 1);
  const truoc = { ...dem(db) };
  assert.equal(truoc.lh_b, 1);
  const r2 = await D.batch(lo(D, a, hs("pb")));
  assert.equal(r2.at(-1).meta.changes, 0);
  assert.deepEqual({ ...dem(db) }, truoc, "lô thua không chuyển thêm dòng nào");
});

test("G8 chuỗi CCCD: huỷ dòng gia hạn TRƯỚC rồi dòng gốc; B nhận một dòng mới cùng khoá số, không dòng trước; không trigger nào chặn", async () => {
  const db = openDb();
  const D = fakeD1(db);
  nguoi(db, "pa"); nguoi(db, "pb");
  db.prepare(`INSERT INTO pty_person_document (id, party_id, document_type_code, document_number, number_key, previous_id, created_at, updated_at)
    VALUES ('g1', 'pa', 'CCCD', '079111222333', '079111222333', NULL, ?, ?)`).run(AT, AT);
  db.prepare(`INSERT INTO pty_person_document (id, party_id, document_type_code, document_number, number_key, expiry_date, previous_id, created_at, updated_at)
    VALUES ('g2', 'pa', 'CCCD', '079111222333', '079111222333', '2040-01-01', 'g1', ?, ?)`).run(AT2, AT2);
  const du = await docsForMerge(D, "pa");
  const a = hs("pa", { giayTo: du.map((d) => ({ id: d.id, typeCode: d.document_type_code, typeName: d.type_name, className: d.class_name, previousId: d.previous_id, voided: d.voided_at !== null, current: d.is_current === 1 })) });
  await D.batch(lo(D, a, hs("pb"), new Map(du.map((d) => [d.id, d]))));
  assert.deepEqual(q(db, "SELECT id FROM pty_person_document WHERE party_id = 'pa' AND voided_at IS NULL"), []);
  const moi = q(db, "SELECT number_key k, previous_id p, expiry_date h FROM pty_person_document WHERE party_id = 'pb'");
  assert.deepEqual(moi.map((r) => ({ ...r })), [{ k: "079111222333", p: null, h: "2040-01-01" }]);
});

// Câu chép giấy tờ dạng VALUES (bài ranh giới cấm dạng INSERT … SELECT trên bảng có bảng con của module khác): lô thua có giấy tờ cần chép HỎNG CẢ LÔ, không
// trả changes = 0. Hợp đồng duy nhất: huỷ nguyên khối — KHÔNG so chữ lỗi (trigger BEFORE INSERT có thể báo trước lỗi NOT NULL).
test("Lô thua có giấy tờ cần chép: cả lô huỷ, không dòng nào đổi (B không nhận bản chép thứ hai)", async () => {
  const db = openDb();
  const D = fakeD1(db);
  nguoi(db, "pa"); nguoi(db, "pb");
  db.prepare(`INSERT INTO pty_person_document (id, party_id, document_type_code, document_number, number_key, previous_id, created_at, updated_at)
    VALUES ('g1', 'pa', 'CCCD', '079111222333', '079111222333', NULL, ?, ?)`).run(AT, AT);
  const du = await docsForMerge(D, "pa");
  const a = hs("pa", { giayTo: du.map((d) => ({ id: d.id, typeCode: d.document_type_code, typeName: d.type_name, className: d.class_name, previousId: d.previous_id, voided: d.voided_at !== null, current: d.is_current === 1 })) });
  const giayToDu = new Map(du.map((d) => [d.id, d]));
  const r1 = await D.batch(lo(D, a, hs("pb"), giayToDu));
  assert.equal(r1.at(-1).meta.changes, 1);
  const anh = () => q(db, "SELECT id, party_id, voided_at, updated_at FROM pty_person_document ORDER BY id").map((r) => ({ ...r }));
  const truoc = anh();
  assert.equal(truoc.filter((r) => r.party_id === "pb").length, 1);
  await assert.rejects(D.batch(lo(D, a, hs("pb"), giayToDu)));
  assert.deepEqual(anh(), truoc);
  assert.deepEqual({ ...q(db, "SELECT active, merged_into_id m FROM pty_party WHERE id = 'pa'")[0] }, { active: 0, m: "pb" });
});

test("Review Focus 5: A là nhà xe cá nhân, D 'Tài xế của' A → sau lô B là nhà xe, D thuộc B (view v_pty_carrier_driver); không vướng trigger drives_for_carrier", async () => {
  const db = openDb();
  const D = fakeD1(db);
  nguoi(db, "pa"); nguoi(db, "pb"); nguoi(db, "pd");
  vai(db, "r1", "pa", "CARRIER");
  quanHe(db, "q1", "pd", "pa", "DRIVES_FOR");
  const a = hs("pa", {
    congViec: [cv("r1", "CARRIER")],
    quanHe: [{ id: "q1", typeCode: "DRIVES_FOR", typeName: "Tài xế của", fromId: "pd", fromName: "pd", toId: "pa", toName: "pa", validFrom: "2026-09-01", validTo: null }],
  });
  const r = await D.batch(lo(D, a, hs("pb")));
  assert.equal(r.at(-1).meta.changes, 1);
  assert.deepEqual(q(db, "SELECT driver_party_id d FROM v_pty_carrier_driver WHERE carrier_party_id = 'pb' ORDER BY d").map((x) => x.d), ["pb", "pd"]);
  assert.deepEqual(q(db, "SELECT * FROM v_pty_carrier_driver WHERE carrier_party_id = 'pa'"), []);
});

test("Review Focus 1: B có liên hệ chính SAU khi tính kế hoạch (kế hoạch mang cờ chính sang B) → chỉ mục duy nhất huỷ CẢ lô, không dòng nào đổi", async () => {
  const db = openDb();
  const D = fakeD1(db);
  nguoi(db, "pa"); nguoi(db, "pb");
  lienHe(db, "c1", "pa", "0912000111", 1);
  const stmts = lo(D, hs("pa", { lienHe: [lh("c1", "0912000111", true)] }), hs("pb"));
  lienHe(db, "c9", "pb", "0913000999", 1); // người khác vừa thêm SĐT chính cho B
  const truoc = { ...dem(db) };
  await assert.rejects(D.batch(stmts), /UNIQUE constraint failed: pty_contact_point/);
  assert.deepEqual({ ...dem(db) }, truoc);
  assert.equal(q(db, "SELECT active FROM pty_party WHERE id = 'pa'")[0]!.active, 1);
});

test("Đ7: danh sách và tra SĐT không trả hồ sơ đã gộp, kể cả khi gồm hồ sơ đã ngưng", async () => {
  const { listParties, findPartiesByPhone } = await import("./repository.ts");
  const db = openDb();
  const D = fakeD1(db);
  nguoi(db, "pa"); nguoi(db, "pb"); nguoi(db, "pc");
  lienHe(db, "c1", "pa", "0912000111", 1);
  db.prepare("UPDATE pty_party SET active = 0 WHERE id = 'pc'").run(); // ngưng thường — vẫn hiện khi includeInactive
  db.prepare("UPDATE pty_party SET active = 0, merged_into_id = 'pb', merged_at = ? WHERE id = 'pa'").run(AT2);
  const { rows } = await listParties(D, { today: HOM_NAY, kind: null, q: null, phoneLike: null, roleCode: null, locationId: null, includeInactive: true, limit: 50, offset: 0 });
  assert.ok(!rows.some((r) => r.id === "pa"));
  assert.ok(rows.some((r) => r.id === "pc"));
  assert.deepEqual(await findPartiesByPhone(D, "0912000111", HOM_NAY), []);
});
