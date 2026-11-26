// ADR-0236 Đ1: nháp Đối tác khai cọc lúc công tắc «Ô khách đặt cọc cho đối tác» Bật, xác nhận lúc Tắt ⇒ vẫn đúng một khoản thu TIỀN MẶT (ADR-0159 Đ1 mục 3), khớp ADR-0225 Đ2
// (đơn đối tác chỉ thu hộ tiền mặt — trigger bil_receipt_partner_cash_only không chặn). Chạy CẢ ứng dụng trên SQLite thật. Tên, SĐT GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { PARTNER, SUP, inDays, setup, svc } from "../../../tests/audit/xac-nhan-khung.mjs";

test("khai lúc Bật, Toàn quyền Tắt, rồi Gửi đơn ⇒ đúng một khoản thu tiền mặt bằng số đã khai", async () => {
  const w = setup();
  const r = await w.call("POST", "/api/orders", { as: PARTNER, body: { customerName: "Khách Thử", customerPhone: "0912345678", services: [svc("ZB1", inDays(3))], declaredDeposit: 200000 } });
  assert.equal(r.status, 201, r.text);
  const id = r.json.order.id;
  assert.equal((await w.call("POST", "/api/cai-dat/o-dat-coc-doi-tac", { as: SUP, body: { hien: false } })).status, 200);
  const g = await w.call("POST", `/api/orders/${id}/gui-don`, { as: PARTNER, body: {} });
  assert.equal(g.status, 200, g.text);
  const khoan = w.q("SELECT amount, method_code FROM bil_payment_receipt WHERE order_id = ?", id);
  assert.deepEqual(khoan.map((k: { amount: number; method_code: string }) => [k.amount, k.method_code]), [[200000, "CASH"]]);
});
