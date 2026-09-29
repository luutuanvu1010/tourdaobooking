// Kiểm migration ĐẶT GẤP (ADR-0049 D2, lát 1.4, Task A9; bổ sung ADR-0047 A1): năm cột `short_notice_*` trên `ord_transfer_leg` (module orders). Bất biến
// sát dữ liệu: "có lý do thì có người + lúc + số phút" — một `CHECK` trên cột thêm SAU CÙNG tham chiếu bốn cột trước (cách 1 — đã thử THẬT trên node:sqlite
// VÀ D1 local ở A0 bước 12, nhật ký ADR-0049 mục 2.1). Bẫy đã thấy khi thử: NULL trong CHECK là "không sai" ⇒ vế sau phải có `IS NOT NULL` TƯỜNG MINH —
// mỗi ca "thiếu" chạy cho CẢ `INSERT` lẫn `UPDATE` (đặt gấp thật là một UPDATE lên chặng có sẵn). Chèn/sửa THẲNG bằng SQL. Tên, SĐT ở đây là GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const MATCHES = files.filter((f) => f.endsWith("_dat_gap_chang.sql"));
const FILE = MATCHES[0] ?? "";
const sqlOf = (f: string) => readFileSync(new URL(f, DIR), "utf8");
const open = (list: string[]) => {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of list) db.exec(sqlOf(f));
  return db;
};
const AT = "2026-09-29T03:00:00.000Z";
type Row = Record<string, unknown>;
const rows = (db: DatabaseSync, sql: string, ...a: (string | number | null)[]): Row[] => db.prepare(sql).all(...a).map((r) => ({ ...(r as Row) }));
const triggers = (db: DatabaseSync): string[] => rows(db, "SELECT name FROM sqlite_master WHERE type = 'trigger' ORDER BY name").map((r) => String(r.name));

function nen(db: DatabaseSync) {
  db.exec(`INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('pty-s1', 'PERSON', 'Nhân Viên', 1, '${AT}', '${AT}')`);
  db.exec(`INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES ('pty-s1', 'Nhân Viên', '${AT}', '${AT}')`);
  db.exec(`INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at, party_id) VALUES ('s1', '', '0900000001', 'x', 'sales', 1, '${AT}', 'pty-s1')`);
  db.exec(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, created_at, updated_at) VALUES ('o1', 'TD-o1', 's1', 'draft', 'Khách Giả', '0900000009', '${AT}', '${AT}')`);
  db.exec(`INSERT INTO order_service (id, order_id, name, unit, pax_adult, depart_date) VALUES ('sv1', 'o1', 'Tour', 'perPax', 2, '2026-10-10')`);
}
let n = 0;
const legCu = (db: DatabaseSync, id = `leg-${++n}`) => {
  db.prepare(
    `INSERT INTO ord_transfer_leg (id, order_id, order_service_id, direction, pickup_date, pickup_time, pickup_place, created_at, updated_at)
     VALUES (?, 'o1', 'sv1', 'OUT', '2026-10-10', '06:30', 'Khách sạn A', ?, ?)`,
  ).run(id, AT, AT);
  return id;
};
interface Gap { reason?: string | null; note?: string | null; by?: string | null; at?: string | null; lead?: number | null }
const DU: Required<Gap> = { reason: "KHACH_DOAN_GOI_GAP", note: "Khách gọi lúc 5 giờ", by: "s1", at: AT, lead: 360 };
const chen = (db: DatabaseSync, g: Gap) =>
  db.prepare(
    `INSERT INTO ord_transfer_leg (id, order_id, order_service_id, direction, pickup_date, pickup_time, pickup_place, created_at, updated_at,
       short_notice_reason, short_notice_note, short_notice_by, short_notice_at, short_notice_lead_minutes)
     VALUES (?, 'o1', 'sv1', 'OUT', '2026-10-10', '06:30', 'Khách sạn A', ?, ?, ?, ?, ?, ?, ?)`,
  ).run(`leg-${++n}`, AT, AT, g.reason ?? null, g.note ?? null, g.by ?? null, g.at ?? null, g.lead ?? null);
const dong = (db: DatabaseSync, id: string, g: Gap) =>
  db.prepare(
    `UPDATE ord_transfer_leg SET short_notice_reason = ?, short_notice_note = ?, short_notice_by = ?, short_notice_at = ?, short_notice_lead_minutes = ? WHERE id = ?`,
  ).run(g.reason ?? null, g.note ?? null, g.by ?? null, g.at ?? null, g.lead ?? null, id);

test("(a) đúng một tệp 0040_dat_gap_chang.sql; chỉ ALTER TABLE … ADD COLUMN; KHÔNG trigger mới (đóng dấu lại là hợp lệ — I14); không dãy ≥ 8 chữ số, không '@'", () => {
  assert.deepEqual(MATCHES, ["0040_dat_gap_chang.sql"], `phải có đúng một tệp 0040_dat_gap_chang.sql, thấy: ${JSON.stringify(MATCHES)}`);
  const code = sqlOf(FILE).split("\n").map((l) => l.replace(/--.*$/, "")).join("\n");
  const cau = code.split(";").map((c) => c.trim()).filter((c) => c !== "");
  assert.equal(cau.length, 5, "năm câu");
  for (const c of cau) assert.match(c, /^ALTER TABLE ord_transfer_leg ADD COLUMN short_notice_[a-z_]+ /, c);
  const db = open(files.filter((f) => f < FILE));
  const truoc = triggers(db);
  db.exec(sqlOf(FILE));
  assert.deepEqual(triggers(db), truoc, "không trigger mới (không tên staff_/stf_)");
  assert.doesNotMatch(code, /\d{8,}/);
  assert.doesNotMatch(code, /@/);
});

test("(b) năm cột có đủ, cho phép NULL (chặng thường không đặt gấp); chặng CŨ (có trước migration) giữ năm cột NULL", () => {
  const db = open(files.filter((f) => f < FILE));
  nen(db);
  const cu = legCu(db, "leg-cu");
  db.exec(sqlOf(FILE));
  for (const f of files.filter((x) => x > FILE)) db.exec(sqlOf(f));
  const cot = rows(db, "SELECT name, type, \"notnull\" AS nn FROM pragma_table_info('ord_transfer_leg') WHERE name LIKE 'short_notice_%' ORDER BY cid");
  assert.deepEqual(cot, [
    { name: "short_notice_reason", type: "TEXT", nn: 0 },
    { name: "short_notice_note", type: "TEXT", nn: 0 },
    { name: "short_notice_by", type: "TEXT", nn: 0 },
    { name: "short_notice_at", type: "TEXT", nn: 0 },
    { name: "short_notice_lead_minutes", type: "INTEGER", nn: 0 },
  ]);
  assert.deepEqual(
    rows(db, "SELECT short_notice_reason AS r, short_notice_note AS g, short_notice_by AS b, short_notice_at AS a, short_notice_lead_minutes AS m FROM ord_transfer_leg WHERE id = ?", cu),
    [{ r: null, g: null, b: null, a: null, m: null }],
  );
  // cột WHO: không khoá ngoại (Phần II; bài ADR-0003)
  assert.deepEqual(rows(db, "SELECT \"from\" AS c FROM pragma_foreign_key_list('ord_transfer_leg') WHERE \"from\" LIKE 'short_notice_%'"), []);
});

test("(c) 'có lý do thì có người + lúc + số phút' — thiếu MỘT trong ba → CHECK, cho CẢ INSERT lẫn UPDATE; chỉ ghi chú mà không lý do → CHECK; đủ → được (ghi chú tuỳ chọn)", () => {
  const db = open(files);
  nen(db);
  const ca: [string, Gap][] = [
    ["có lý do, thiếu người", { ...DU, by: null }],
    ["có lý do, thiếu lúc", { ...DU, at: null }],
    ["có lý do, thiếu số phút", { ...DU, lead: null }],
    ["chỉ ghi chú, không lý do", { note: "khách gọi muộn" }],
    ["chỉ người + lúc, không lý do", { by: "s1", at: AT }],
    ["số phút 0 (mốc không tắt được)", { ...DU, lead: 0 }],
    ["số phút 2881", { ...DU, lead: 2881 }],
  ];
  for (const [ten, g] of ca) {
    assert.throws(() => chen(db, g), /CHECK constraint failed/, `INSERT — ${ten}`);
    const id = legCu(db);
    assert.throws(() => dong(db, id, g), /CHECK constraint failed/, `UPDATE — ${ten}`);
  }
  chen(db, DU);
  chen(db, { ...DU, note: null });
  const id = legCu(db);
  dong(db, id, { ...DU, lead: 1 });
  dong(db, id, { ...DU, lead: 2880, reason: "CHUYEN_BAY_DOI_GIO" });
  dong(db, id, {}); // bỏ dấu (cả năm NULL) — hợp lệ ở CSDL; máy chủ không có đường này ở lượt 1
  assert.equal(rows(db, "SELECT count(*) AS c FROM ord_transfer_leg WHERE short_notice_reason IS NOT NULL")[0]!.c, 2);
});

test("(d) khuôn từng cột: mã lý do chữ HOA + gạch dưới 1–40 ký tự (danh sách LY_DO_DAT_GAP kiểm ở MÃ — I7); ghi chú ≤ 120 ký tự", () => {
  const db = open(files);
  nen(db);
  for (const reason of ["khach_dat", "KHÁCH", "A B", "", "X".repeat(41)]) assert.throws(() => chen(db, { ...DU, reason }), /CHECK constraint failed/, reason);
  chen(db, { ...DU, reason: "KHAC" });
  chen(db, { ...DU, reason: "X".repeat(40) });
  chen(db, { ...DU, note: "g".repeat(120) });
  assert.throws(() => chen(db, { ...DU, note: "g".repeat(121) }), /CHECK constraint failed/, "ghi chú 121 ký tự");
  const id = legCu(db);
  assert.throws(() => dong(db, id, { ...DU, note: "g".repeat(121) }), /CHECK constraint failed/, "UPDATE ghi chú 121 ký tự");
});

test("(e) đơn đã xác nhận: đóng dấu đặt gấp lên chặng còn mở KHÔNG vướng trigger danh tính / đóng của 0034; chặng đã đóng thì không (leg_closed)", () => {
  const db = open(files);
  nen(db);
  const mo = legCu(db, "leg-mo");
  const dongLeg = legCu(db, "leg-dong");
  db.exec(`UPDATE ord_transfer_leg SET closed_at = '${AT}', close_reason_code = 'NOT_NEEDED' WHERE id = 'leg-dong'`);
  db.exec(`UPDATE orders SET status = 'confirmed', updated_at = '${AT}' WHERE id = 'o1'`);
  dong(db, mo, DU);
  assert.throws(() => dong(db, dongLeg, DU), /leg_closed/);
});
