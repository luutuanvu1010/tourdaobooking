// Kiểm migration CHỌN ĐÓN + KHUNG GIỜ (ADR-0134 Đ1, Đ3, Đ5; kế hoạch 2026-10-19-xac-nhan-don Task 1.1): `order_service.pickup_choice`,
// `ord_transfer_leg.pickup_slot_end` (CHECK định dạng + "cuối khung sau giờ đón"), bảng chính sách `ord_pickup_slot_policy` CHỈ THÊM + dòng gieo.
// Chèn/sửa THẲNG bằng SQL (không qua mã ứng dụng): chứng minh chặn nằm ở CSDL. Tệp tìm theo ĐUÔI tên (CHANGE-GUIDE công thức d) — đổi số migration lúc gộp
// chỉ phải đổi tên tệp.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const MATCHES = files.filter((f) => f.endsWith("_chon_don_khung_gio.sql"));
const FILE = MATCHES[0] ?? "";
const sqlOf = (f: string) => readFileSync(new URL(f, DIR), "utf8");
const AT = "2026-10-19T03:00:00.000Z";

function open(list: string[]) {
  const d = new DatabaseSync(":memory:");
  d.exec("PRAGMA foreign_keys = ON");
  for (const f of list) d.exec(sqlOf(f));
  return d;
}
/** Dựng CSDL tới TRƯỚC migration này, gieo một đơn đã xác nhận + một dịch vụ (đơn cũ), rồi áp migration này và mọi migration sau. */
function db() {
  const d = open(files.filter((f) => f < FILE));
  d.exec(`INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('pty-s1', 'PERSON', 'Nhân Viên', 1, '${AT}', '${AT}')`);
  d.exec(`INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES ('pty-s1', 'Nhân Viên', '${AT}', '${AT}')`);
  d.exec(`INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at, party_id) VALUES ('s1', '', '0900000001', 'x', 'sales', 1, '${AT}', 'pty-s1')`);
  d.exec(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, created_at, updated_at) VALUES ('o1', 'TD-1', 's1', 'draft', 'Khách Giả', '0900000009', '${AT}', '${AT}')`);
  d.exec(`INSERT INTO order_service (id, order_id, name, unit, pax_adult, depart_date) VALUES ('sv-cu', 'o1', 'Tour', 'perPax', 4, '2026-10-30')`);
  for (const f of files.filter((f) => f >= FILE)) d.exec(sqlOf(f));
  return d;
}
let n = 0;
const leg = (d: DatabaseSync, time: string | null, end: string | null) =>
  d.prepare(
    `INSERT INTO ord_transfer_leg (id, order_id, order_service_id, direction, pickup_date, pickup_time, pickup_place, created_at, updated_at, pickup_slot_end)
     VALUES (?, 'o1', 'sv-cu', 'OUT', '2026-10-30', ?, 'Khách sạn A', ?, ?, ?)`,
  ).run(`leg-${++n}`, time, AT, AT, end);
type Row = Record<string, unknown>;
const rows = (d: DatabaseSync, sql: string): Row[] => d.prepare(sql).all().map((r) => ({ ...(r as Row) }));

test("đúng MỘT tệp `*_chon_don_khung_gio.sql`, sau 0111; chỉ-thêm (không dựng lại bảng, không xoá trigger)", () => {
  assert.equal(MATCHES.length, 1, `cần đúng một tệp, có ${JSON.stringify(MATCHES)}`);
  assert.ok(FILE > "0111", FILE);
  assert.doesNotMatch(sqlOf(FILE), /DROP TABLE|DROP TRIGGER|_new\b/i);
});

test("dòng gieo: đúng 5 khung mặc định + câu lưu ý nguyên văn", () => {
  const d = db();
  const r = rows(d, "SELECT slots_json, note, valid_from_at FROM ord_pickup_slot_policy");
  assert.equal(r.length, 1);
  assert.deepEqual(JSON.parse(String(r[0]!.slots_json)), [
    { tu: "07:30", den: "08:00" }, { tu: "08:00", den: "08:30" }, { tu: "08:30", den: "09:00" }, { tu: "09:00", den: "09:30" }, { tu: "09:30", den: "10:00" },
  ]);
  assert.equal(r[0]!.note, "Giờ đón thực tế có thể điều chỉnh cho phù hợp tình hình hoạt động.");
  assert.match(String(r[0]!.valid_from_at), /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
});

test("ord_pickup_slot_policy chỉ thêm: UPDATE / DELETE ném ord_policy_append_only; câu lưu ý 1–200; valid_from_at duy nhất", () => {
  const d = db();
  assert.throws(() => d.exec("UPDATE ord_pickup_slot_policy SET note = 'khác'"), /ord_policy_append_only/);
  assert.throws(() => d.exec("DELETE FROM ord_pickup_slot_policy"), /ord_policy_append_only/);
  const ins = d.prepare(
    `INSERT INTO ord_pickup_slot_policy (id, slots_json, note, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES (?, '[]', ?, ?, ?, 's1', ?, 's1')`,
  );
  assert.throws(() => ins.run("p-rong", "", "2026-11-01T00:00:00.000Z", AT, AT), /CHECK constraint failed/);
  assert.throws(() => ins.run("p-dai", "a".repeat(201), "2026-11-01T00:00:00.000Z", AT, AT), /CHECK constraint failed/);
  assert.doesNotThrow(() => ins.run("p-1", "Câu mới.", "2026-11-01T00:00:00.000Z", AT, AT));
  assert.throws(() => ins.run("p-2", "Câu khác.", "2026-11-01T00:00:00.000Z", AT, AT), /UNIQUE constraint failed/);
});

test("pickup_slot_end: định dạng HH:MM; phải SAU giờ đón và cần giờ đón; NULL được (Giờ khác / chưa chọn)", () => {
  const d = db();
  assert.throws(() => leg(d, "08:30", "08:00"), /CHECK constraint failed/);
  assert.throws(() => leg(d, "08:00", "08:00"), /CHECK constraint failed/);
  assert.throws(() => leg(d, null, "08:30"), /CHECK constraint failed/);
  assert.throws(() => leg(d, "08:00", "8:30"), /CHECK constraint failed/);
  assert.throws(() => leg(d, "08:00", "24:30"), /CHECK constraint failed/);
  assert.doesNotThrow(() => leg(d, "08:00", "08:30"));
  const id = `leg-${n}`;
  assert.doesNotThrow(() => leg(d, "14:15", null));
  assert.doesNotThrow(() => leg(d, null, null));
  // Sửa giờ đón vượt cuối khung mà không xoá cuối khung → CSDL chặn (mã sửa chặng phải xoá cuối khung khi đổi giờ).
  assert.throws(() => d.prepare("UPDATE ord_transfer_leg SET pickup_time = '09:00' WHERE id = ?").run(id), /CHECK constraint failed/);
  assert.doesNotThrow(() => d.prepare("UPDATE ord_transfer_leg SET pickup_time = '09:00', pickup_slot_end = NULL WHERE id = ?").run(id));
});

test("pickup_choice: dịch vụ cũ = NULL; cột không mặc định, không CHECK liệt kê (danh sách kiểm ở mã)", () => {
  const d = db();
  assert.equal(rows(d, "SELECT pickup_choice FROM order_service WHERE id = 'sv-cu'")[0]!.pickup_choice, null);
  const col = rows(d, "PRAGMA table_info(order_service)").find((c) => c.name === "pickup_choice");
  assert.ok(col, "thiếu cột pickup_choice");
  assert.equal(col!.dflt_value, null);
  assert.equal(col!.notnull, 0);
  const code = sqlOf(FILE).split("\n").map((l) => l.replace(/--.*$/, "")).join("\n");
  assert.doesNotMatch(code, /pickup_choice[^;]*CHECK/i);
});
