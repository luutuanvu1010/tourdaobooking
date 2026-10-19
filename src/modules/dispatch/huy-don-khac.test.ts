// Vá lỗ hàng rào I-1 (ADR-0037, mục "Hàng rào bắt buộc"): người kiểm độc lập 2026-09-27 phát hiện đột biến đổi nhãn nhật ký của lý do "Khác" thành chữ
// CỐ ĐỊNH (bỏ dùng `note` nguyên văn) SỐNG SÓT qua `npm test`, `test:e2e`, kịch bản Chrome — vì chưa có bài kiểm nào ở mức route/nhật ký thật (chỉ có
// `rules.test.ts` kiểm hàm thuần `parseCancelReason`, không chạm route/`audit_log`). Tệp này gọi THẬT `POST /api/orders/:id/handler-cancel` qua khung
// `tests/audit/harness.mjs` (cùng khuôn `nhan-don.test.ts`) rồi đọc thẳng bảng `audit_log` — đúng mức route mà ADR-0037 đòi.
//
// Ruling (người thi công, việc bề mặt/đảo ngược được — CLAUDE.md §3): đặt tệp mới cạnh `nhan-don.test.ts` trong module `dispatch` (không gộp vào
// `rules.test.ts` vì đó là luật THUẦN không I/O, không gộp vào `orders/cancel-lock.test.ts` vì đó kiểm khoá lạc quan của `cancelOrder`, khác trọng tâm).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
import { CANCEL_REASON_LABEL } from "./rules.ts";

const SALES = "11111111-1111-4111-8111-111111111111";
const FIELD = "44444444-4444-4444-8444-444444444444";

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: FIELD, phone: "0900000004", name: "Hướng Dẫn", perms: ["FIELD"] });
  w.sqlite.exec("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('ZA1', 'Tour đảo', 'perPax', 500000, 1, '2026-01-01', '2026-01-01')");
  return w;
}
const inDays = (n: number) => new Date(Date.now() + 7 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);
const orderBody = () => ({
  customerName: "Khách Thử", customerPhone: "0912345678",
  services: [{ kind: "catalog", pickupChoice: "KHONG_DON", catalogCode: "ZA1", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 500000 }, departDate: inDays(3) }],
});
/** Đơn đã xác nhận, đã giao cho FIELD — trạng thái cần để `handler-cancel` nhận (không phải 403/409). */
async function confirmedForField(w: any): Promise<string> {
  const created = await w.call("POST", "/api/orders", { as: SALES, body: orderBody() });
  assert.equal(created.status, 201, created.text);
  const orderId = created.json.order.id;
  assert.equal((await w.call("POST", `/api/orders/${orderId}/status`, { as: SALES, body: { status: "confirmed" } })).status, 200);
  assert.equal((await w.call("PUT", `/api/orders/${orderId}/handler`, { as: SALES, body: { staffId: FIELD } })).status, 200);
  return orderId;
}
const cancel = (w: any, orderId: string, body: Record<string, unknown>) => w.call("POST", `/api/orders/${orderId}/handler-cancel`, { as: FIELD, body });
const auditRowsOf = (w: any, orderId: string) => w.q("SELECT action, detail FROM audit_log WHERE order_id = ? ORDER BY created_at, rowid", orderId);
const orderStatus = (w: any, orderId: string) => w.q("SELECT status FROM orders WHERE id = ?", orderId)[0].status;

test('Ca 1 — reason "other" + note hợp lệ → 200, cancelled, ĐÚNG 1 dòng order_cancelled_by_field, detail = NGUYÊN VĂN note (đây là ca lỗ hàng rào I-1 đã bắt được — mã đúng hôm nay phải xanh)', async () => {
  const w = setup();
  const orderId = await confirmedForField(w);

  const r = await cancel(w, orderId, { reason: "other", note: "Khách đổi lịch, không tiện ngày này" });
  assert.equal(r.status, 200, r.text);
  assert.equal(orderStatus(w, orderId), "cancelled");

  const rows = auditRowsOf(w, orderId);
  const cancelRows = rows.filter((x: any) => x.action === "order_cancelled_by_field");
  assert.equal(cancelRows.length, 1, "đúng một dòng order_cancelled_by_field");
  assert.equal(cancelRows[0].detail, "Khách đổi lịch, không tiện ngày này", "detail phải bằng ĐÚNG NGUYÊN VĂN note, không phải nhãn cố định 'Khác'");
});

test('Ca 2 — reason "other" + note chứa số điện thoại → 400, đơn VẪN confirmed, KHÔNG có dòng audit_log mới', async () => {
  const w = setup();
  const orderId = await confirmedForField(w);
  const before = auditRowsOf(w, orderId).length;

  const r = await cancel(w, orderId, { reason: "other", note: "gọi 0905123456 giúp" });
  assert.equal(r.status, 400, r.text);
  assert.equal(orderStatus(w, orderId), "confirmed", "400 không đổi trạng thái đơn");
  assert.equal(auditRowsOf(w, orderId).length, before, "400 không ghi thêm dòng nhật ký nào");
});

test('Ca 3 — reason "other" + note rỗng (hoặc thiếu) → 400, KHÔNG có dòng audit_log mới', async () => {
  const w = setup();
  const orderId = await confirmedForField(w);
  const before = auditRowsOf(w, orderId).length;

  const r1 = await cancel(w, orderId, { reason: "other", note: "" });
  assert.equal(r1.status, 400, r1.text);
  const r2 = await cancel(w, orderId, { reason: "other" });
  assert.equal(r2.status, 400, r2.text);

  assert.equal(orderStatus(w, orderId), "confirmed");
  assert.equal(auditRowsOf(w, orderId).length, before, "400 (cả hai lần) không ghi thêm dòng nhật ký nào");
});

test('Ca 4 — reason "customer_requested" (mã cũ, không đổi) → 200, detail = ĐÚNG nhãn cố định "Khách yêu cầu huỷ"', async () => {
  const w = setup();
  const orderId = await confirmedForField(w);

  const r = await cancel(w, orderId, { reason: "customer_requested" });
  assert.equal(r.status, 200, r.text);
  assert.equal(orderStatus(w, orderId), "cancelled");

  const rows = auditRowsOf(w, orderId).filter((x: any) => x.action === "order_cancelled_by_field");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].detail, CANCEL_REASON_LABEL.customer_requested);
  assert.equal(rows[0].detail, "Khách yêu cầu huỷ", "nhãn cố định — không rỗng, không phải 'Khác'");
});
