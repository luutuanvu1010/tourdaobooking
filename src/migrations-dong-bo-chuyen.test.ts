// Kiểm migration hai view của ADR-0104 Đ2 (đồng bộ chuyến theo đơn) trên SQLite thật (node:sqlite). Tệp tìm theo ĐUÔI tên (số migration đổi được lúc gộp —
// CHANGE-GUIDE công thức d). `v_aud_order_cmd` lọc ĐÚNG tập HANH_DONG_CONG_DON (câu cổng chuyến của máy đồng bộ hỏi view này — Đ2.2); `v_ord_leg_commit` chỉ
// bốn cột cam kết của chặng (phán quyết G10). Phần hoàn tác (Down) viết ở ĐẦU tệp, trong chú thích: D1 chạy cả tệp nên câu DROP không được là câu thật.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { HANH_DONG_CONG_DON } from "./shared/dong-bo-chuyen.ts";
import { TRIP_GATE_THEO_DON } from "./modules/van-chuyen/chuyen-repo.ts";

const DIR = join(import.meta.dirname, "..", "migrations");
const TEP = readdirSync(DIR).filter((f) => f.endsWith("_aud_order_cmd.sql"));
function moi(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort()) db.exec(readFileSync(join(DIR, f), "utf8"));
  return db;
}
const T = "2026-10-08T01:00:00.000Z";
const cotCua = (db: DatabaseSync, view: string) => (db.prepare(`SELECT name FROM pragma_table_info('${view}')`).all() as { name: string }[]).map((r) => r.name);

test("có đúng MỘT tệp migration *_aud_order_cmd.sql", () => {
  assert.equal(TEP.length, 1, JSON.stringify(TEP));
});

test("view v_aud_order_cmd: đúng 3 cột (id, order_id, action) — không detail, không người, không giờ (ADR-0104 Đ2.2)", () => {
  assert.deepEqual(cotCua(moi(), "v_aud_order_cmd"), ["id", "order_id", "action"]);
});

test("view v_ord_leg_commit: đúng 4 cột (id, order_id, exclusive_vehicle, min_vehicle_seats) — phán quyết G10", () => {
  assert.deepEqual(cotCua(moi(), "v_ord_leg_commit"), ["id", "order_id", "exclusive_vehicle", "min_vehicle_seats"]);
});

test("IN (…) của v_aud_order_cmd = ĐÚNG HANH_DONG_CONG_DON (so tập — bỏ một hành động khỏi view hoặc hằng → đỏ)", () => {
  const sql = readFileSync(join(DIR, TEP[0]!), "utf8").replace(/--.*$/gm, "");
  const m = /CREATE VIEW v_aud_order_cmd[\s\S]*?\baction\s+IN\s*\(([^)]*)\)/i.exec(sql);
  assert.ok(m, "không thấy CREATE VIEW v_aud_order_cmd … action IN (…)");
  const trongView = [...m[1]!.matchAll(/'([a-z_]+)'/g)].map((x) => x[1]).sort();
  assert.deepEqual(trongView, [...HANH_DONG_CONG_DON].sort());
});

test("lọc v_aud_order_cmd: dòng không đơn và hành động ngoài tập cổng đơn không lọt; v_ord_leg_commit đọc đúng cột cam kết", () => {
  const db = moi();
  db.exec(`INSERT INTO staff (id, full_name, phone, pin_hash, role, created_at) VALUES ('s1', 'NV', '0900000001', 'x', 'sales', '${T}')`);
  db.exec(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, created_at, updated_at) VALUES ('o1', 'TD-1', 's1', 'confirmed', 'K', '0900000009', '${T}', '${T}')`);
  const ghi = (id: string, action: string, orderId: string | null) =>
    db.prepare("INSERT INTO audit_log (id, order_id, staff_id, action, target_type, target_id, detail, created_at) VALUES (?, ?, 's1', ?, 'order', 'o1', 'x', ?)").run(id, orderId, action, T);
  ghi("a1", "cancelled", "o1");
  ghi("a2", "order_passenger_changed", "o1");
  ghi("a3", "order_leg_added", "o1"); // thêm chặng: không cần đồng bộ (chặng mới chưa có suất)
  ghi("a4", "confirmed", "o1");
  ghi("a5", "cancelled", null);
  ghi("a6", "order_money_adjusted_by_field", "o1");
  const r = db.prepare("SELECT id, order_id, action FROM v_aud_order_cmd ORDER BY id").all() as { id: string }[];
  assert.deepEqual(r.map((x) => x.id), ["a1", "a2", "a6"]);
  // Đơn NHÁP (đơn đã xác nhận bị trigger đóng băng dịch vụ / chặng) — view không lọc theo trạng thái.
  db.exec(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, created_at, updated_at) VALUES ('o2', 'TD-2', 's1', 'draft', 'K', '0900000009', '${T}', '${T}')`);
  db.exec("INSERT INTO order_service (id, order_id, name, unit, pax_adult, depart_date) VALUES ('sv1', 'o2', 'Đưa đón', 'perPax', 2, '2027-03-11')");
  db.exec(`INSERT INTO ord_transfer_leg (id, order_id, order_service_id, direction, pickup_date, pickup_place, created_at, updated_at, exclusive_vehicle, min_vehicle_seats)
           VALUES ('l1', 'o2', 'sv1', 'OUT', '2027-03-11', 'KS', '${T}', '${T}', 1, 16)`);
  assert.deepEqual({ ...(db.prepare("SELECT * FROM v_ord_leg_commit").get() as object) }, { id: "l1", order_id: "o2", exclusive_vehicle: 1, min_vehicle_seats: 16 });
});

test("phần hoàn tác (Down) ở ĐẦU tệp: chỉ nằm trong chú thích (chạy tệp KHÔNG xoá view), có điều kiện an toàn, và chạy được — gỡ đúng hai view", () => {
  const raw = readFileSync(join(DIR, TEP[0]!), "utf8");
  const dau = raw.slice(0, raw.search(/^CREATE VIEW/m));
  assert.match(dau, /HOÀN TÁC/);
  assert.match(dau, /điều kiện/i, "phải ghi điều kiện an toàn trước khi gỡ");
  const down = [...dau.matchAll(/^--\s*(DROP VIEW [^;]+;)/gm)].map((m) => m[1]!);
  assert.deepEqual(down.sort(), ["DROP VIEW v_aud_order_cmd;", "DROP VIEW v_ord_leg_commit;"]);
  assert.ok(!/^\s*DROP\b/im.test(raw.replace(/--.*$/gm, "")), "câu DROP thật (ngoài chú thích) sẽ chạy khi áp migration");
  const db = moi();
  for (const c of down) db.exec(c);
  const conLai = (db.prepare("SELECT name FROM sqlite_master WHERE type = 'view' AND name IN ('v_aud_order_cmd', 'v_ord_leg_commit')").all() as unknown[]).length;
  assert.equal(conLai, 0);
});

test("NT-8: câu cổng chuyến của máy đồng bộ (TRIP_GATE_THEO_DON) hỏi v_aud_order_cmd theo KHOÁ CHÍNH audit_log — không quét bảng nhật ký", () => {
  assert.match(TRIP_GATE_THEO_DON, /\bv_aud_order_cmd\b/);
  assert.doesNotMatch(TRIP_GATE_THEO_DON, /\baudit_log\b/, "van-chuyen chỉ đọc nhật ký qua view công bố (bài kiến trúc 8(b) cũng chặn)");
  const plan = (moi().prepare(`EXPLAIN QUERY PLAN ${TRIP_GATE_THEO_DON}`).all() as { detail: string }[]).map((r) => r.detail);
  assert.ok(plan.some((d) => /^SEARCH audit_log USING (INDEX sqlite_autoindex_audit_log_1|PRIMARY KEY) \(id=\?\)/.test(d)), JSON.stringify(plan));
  assert.ok(!plan.some((d) => /^SCAN audit_log/.test(d)), JSON.stringify(plan));
});
