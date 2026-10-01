// Kiểm migration Ô MỚI CỦA CHẶNG (kế hoạch 2026-10-01-may-chu-o-moi-chang, Task 1; TC-F1, TC-P1): `ord_transfer_leg.flight_code` (ADR-0055 VK2-C C1) và
// `ord_transfer_leg.pax_override` (ADR-0054 D10.3). Chèn/sửa THẲNG bằng SQL (không qua mã ứng dụng): chứng minh chặn nằm ở CSDL. Tệp tìm theo ĐUÔI tên
// (CHANGE-GUIDE công thức d) — đổi số migration lúc gộp chỉ phải đổi tên tệp.
// Thi công ĐÚNG CHỮ ADR-0054 D10.3: MỘT `CHECK (pax_override IS NULL OR (pax_override >= 1 AND direction = 'RETURN'))` thêm bằng `ALTER … ADD COLUMN` — CHECK
// cột tham chiếu cột khác của dòng được (tiền lệ 0040; đã thử node:sqlite + D1 local 2026-10-01). Không cần trigger, không lệch §16 (ruling ở nhật ký thi công).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const MATCHES = files.filter((f) => f.endsWith("_chang_so_nguoi_chuyen_bay.sql"));
const sqlOf = (f: string) => readFileSync(new URL(f, DIR), "utf8");
const AT = "2026-10-01T03:00:00.000Z";

function db() {
  const d = new DatabaseSync(":memory:");
  d.exec("PRAGMA foreign_keys = ON");
  for (const f of files) d.exec(sqlOf(f));
  d.exec(`INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('pty-s1', 'PERSON', 'Nhân Viên', 1, '${AT}', '${AT}')`);
  d.exec(`INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES ('pty-s1', 'Nhân Viên', '${AT}', '${AT}')`);
  d.exec(`INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at, party_id) VALUES ('s1', '', '0900000001', 'x', 'sales', 1, '${AT}', 'pty-s1')`);
  d.exec(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, created_at, updated_at) VALUES ('o1', 'TD-1', 's1', 'draft', 'Khách Giả', '0900000009', '${AT}', '${AT}')`);
  d.exec(`INSERT INTO order_service (id, order_id, name, unit, pax_adult, depart_date) VALUES ('sv1', 'o1', 'Tour', 'perPax', 4, '2026-10-10')`);
  return d;
}
let n = 0;
const leg = (d: DatabaseSync, dir: string, flight: string | null, pax: number | null) =>
  d.prepare(
    `INSERT INTO ord_transfer_leg (id, order_id, order_service_id, direction, pickup_date, pickup_place, created_at, updated_at, flight_code, pax_override)
     VALUES (?, 'o1', 'sv1', ?, '2026-10-10', 'Khách sạn A', ?, ?, ?, ?)`,
  ).run(`leg-${++n}`, dir, AT, AT, flight, pax);

test("migration ô mới của chặng: đúng MỘT tệp `*_chang_so_nguoi_chuyen_bay.sql`, số sau 0034 và sau 0044 (cột mới đứng sau bảng + trigger Đã giao)", () => {
  assert.equal(MATCHES.length, 1, `cần đúng một tệp, có ${MATCHES.length}`);
  assert.ok(MATCHES[0]! > "0044", MATCHES[0]);
  assert.doesNotMatch(sqlOf(MATCHES[0]!), /DROP TABLE|DROP TRIGGER|ord_transfer_leg_new/i, "chỉ-thêm: không dựng lại bảng, không xoá trigger cũ");
});

test("TC-F1: flight_code — CHECK chữ HOA, dài 3..8; NULL và 'VN1553' được", () => {
  const d = db();
  for (const bad of ["vn1553", "VN", "VN15530AB"]) assert.throws(() => leg(d, "OUT", bad, null), /CHECK constraint failed/, bad);
  assert.doesNotThrow(() => leg(d, "OUT", null, null));
  assert.doesNotThrow(() => leg(d, "OUT", "VN1553", null));
  const id = `leg-${n}`;
  assert.throws(() => d.prepare("UPDATE ord_transfer_leg SET flight_code = 'vj123' WHERE id = ?").run(id), /CHECK constraint failed/);
});

test("TC-P1: pax_override — 0 → RAISE; 2 trên chặng OUT → RAISE (INSERT lẫn UPDATE, kể cả đổi chiều); NULL mọi chặng được; 2 trên RETURN được", () => {
  const d = db();
  assert.throws(() => leg(d, "RETURN", null, 0), /CHECK constraint failed/);
  assert.throws(() => leg(d, "OUT", null, 2), /CHECK constraint failed/);
  assert.doesNotThrow(() => leg(d, "OUT", null, null));
  const out = `leg-${n}`;
  assert.throws(() => d.prepare("UPDATE ord_transfer_leg SET pax_override = 2 WHERE id = ?").run(out), /CHECK constraint failed/);
  assert.doesNotThrow(() => leg(d, "RETURN", null, null));
  assert.doesNotThrow(() => leg(d, "RETURN", null, 2));
  const ret = `leg-${n}`;
  assert.doesNotThrow(() => d.prepare("UPDATE ord_transfer_leg SET pax_override = 3 WHERE id = ?").run(ret));
  // Đổi chiều (đơn nháp) sang OUT khi còn số người riêng → trigger UPDATE chặn.
  assert.throws(() => d.prepare("UPDATE ord_transfer_leg SET direction = 'OUT' WHERE id = ?").run(ret), /CHECK constraint failed/);
});
