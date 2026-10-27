// Kiểm view hộp thư `v_aud_order_event` SAU MỌI migration (ADR-0034 đ1; ADR-0136 Đ10) trên SQLite thật (node:sqlite). Tệp tìm theo ĐUÔI tên (số migration
// đổi được lúc gộp — CHANGE-GUIDE công thức d). Gốc lỗi bản 2.36: hằng `HANH_DONG_TIN_DON` (mã) có `order_confirm_requested` mà `IN (…)` của view (SQL) không
// có ⇒ hai danh sách trôi khỏi nhau, không bài nào bắt. Bài so tập dưới đây buộc hai danh sách bằng nhau — kể cả K7: `order_handler_refused` không có trong hằng
// nên cũng không được có trong view.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { HANH_DONG_TIN_DON } from "./shared/thong-bao.ts";
import { THAY_DOI } from "./shared/bang-tin.ts";
import { hanhDongCuaThayDoi } from "./shared/web-push.ts";

const DIR = join(import.meta.dirname, "..", "migrations");
const TEP = readdirSync(DIR).filter((f) => f.endsWith("_tin_cho_xac_nhan.sql"));
function moi(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort()) db.exec(readFileSync(join(DIR, f), "utf8"));
  return db;
}
const T = "2026-10-27T01:00:00.000Z";

test("có đúng MỘT tệp migration *_tin_cho_xac_nhan.sql", () => {
  assert.equal(TEP.length, 1, JSON.stringify(TEP));
});

test("view v_aud_order_event: vẫn đúng 5 cột (id, order_id, staff_id, action, created_at) — dựng lại không đổi hợp đồng cột", () => {
  const db = moi();
  const cot = (db.prepare("SELECT name FROM pragma_table_info('v_aud_order_event')").all() as { name: string }[]).map((r) => r.name);
  assert.deepEqual(cot, ["id", "order_id", "staff_id", "action", "created_at"]);
});

test("IN (…) của view (định nghĩa CUỐI trong CSDL) = ĐÚNG HANH_DONG_TIN_DON (so tập — thêm vào hằng mà quên view, hay ngược lại → đỏ)", () => {
  const db = moi();
  const sql = (db.prepare("SELECT sql FROM sqlite_master WHERE type = 'view' AND name = 'v_aud_order_event'").get() as { sql: string }).sql.replace(/--.*$/gm, "");
  const m = /\baction\s+IN\s*\(([^)]*)\)/i.exec(sql);
  assert.ok(m, "không thấy action IN (…) trong view");
  const trongView = [...m[1]!.matchAll(/'([a-z_]+)'/g)].map((x) => x[1]).sort();
  assert.deepEqual(trongView, [...HANH_DONG_TIN_DON].sort());
  assert.ok(!trongView.includes("order_handler_refused"), "K7 (CHANGE-GUIDE công thức w): HDV «Từ chối» chưa lên chuông");
  assert.ok(!trongView.includes("order_confirm_withdrawn"), "rút lại không thành tin (loaiTinDon không có nhánh) — không đưa vào view");
});

// Danh sách THỨ BA của cùng lớp lỗi (phiếu kiểm độc lập M-1, 27/10): cú gõ cửa màn hình khoá dựng tin từ hanhDongCuaThayDoi (web-push.ts) rồi service
// worker đọc chữ từ HỘP THƯ — hành động gõ cửa không nằm trong HANH_DONG_TIN_DON (= view) thì máy rung mà chữ là của tin khác (đúng lỗi 2.36).
test("mọi hành động gõ cửa màn hình khoá (hanhDongCuaThayDoi khác null) đều nằm trong HANH_DONG_TIN_DON", () => {
  const thieu = THAY_DOI.map((t) => [t, hanhDongCuaThayDoi(t)] as const).filter(([, a]) => a !== null && !(HANH_DONG_TIN_DON as readonly string[]).includes(a));
  assert.deepEqual(thieu, []);
});

test("lọc theo hành vi: mỗi hành động của HANH_DONG_TIN_DON gắn đơn đều lọt; hành động ngoài tập và dòng không đơn thì không", () => {
  const db = moi();
  db.exec(`INSERT INTO staff (id, full_name, phone, pin_hash, role, created_at) VALUES ('s1', 'NV', '0900000001', 'x', 'sales', '${T}')`);
  db.exec(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, created_at, updated_at) VALUES ('o1', 'TD-1', 's1', 'draft', 'K', '0900000009', '${T}', '${T}')`);
  const ghi = db.prepare("INSERT INTO audit_log (id, order_id, staff_id, action, created_at) VALUES (?, ?, 's1', ?, ?)");
  HANH_DONG_TIN_DON.forEach((a, i) => ghi.run(`in${i}`, "o1", a, T));
  ["order_handler_refused", "order_confirm_withdrawn", "updated", "trip_updated"].forEach((a, i) => ghi.run(`out${i}`, "o1", a, T));
  ghi.run("out-khong-don", null, "order_confirm_requested", T);
  const r = (db.prepare("SELECT action FROM v_aud_order_event ORDER BY action").all() as { action: string }[]).map((x) => x.action);
  assert.deepEqual(r, [...HANH_DONG_TIN_DON].sort());
});
