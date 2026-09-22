// Kế hoạch truy vấn (EXPLAIN QUERY PLAN) của các câu nóng khi dữ liệu lớn — kiểm toán 2026-09-22, mục Hiệu năng & quy mô. Đặc tả hiện trạng, không phải hồi quy.
import { test } from "node:test";
import { openDb } from "./harness.mjs";

const plan = (db, sql) => db.prepare(`EXPLAIN QUERY PLAN ${sql}`).all().map((r) => r.detail).join(" | ");

test("kế hoạch truy vấn các câu nóng", () => {
  const db = openDb();
  const rows = {
    "sinh mã đơn (createOrder)": "SELECT MAX(CAST(substr(order_code, 14) AS INTEGER)) FROM orders WHERE order_code LIKE 'TD-20260922-%'",
    "tìm đơn (listOrders q)": `SELECT o.* FROM orders o JOIN v_stf_staff_label s ON s.id = o.staff_id WHERE (o.order_code LIKE '%x%' OR o.customer_name LIKE '%x%' OR o.customer_phone LIKE '%x%' OR s.label LIKE '%x%') ORDER BY o.created_at DESC, o.rowid DESC LIMIT 31 OFFSET 0`,
    "lọc đơn theo trạng thái": "SELECT o.* FROM orders o WHERE o.status = 'draft' ORDER BY o.created_at DESC LIMIT 31",
    "nhật ký một đơn": "SELECT * FROM audit_log WHERE order_id = 'x' ORDER BY created_at",
    "người phụ trách (isHandler)": "SELECT 1 FROM v_dsp_order_handler WHERE order_id = 'x' AND staff_id = 'y'",
    "đơn theo ngày đi": "SELECT DISTINCT order_id FROM order_service WHERE depart_date BETWEEN '2026-09-01' AND '2026-09-30'",
  };
  for (const [name, sql] of Object.entries(rows)) console.log(`PLAN ${name}: ${plan(db, sql)}`);
});
