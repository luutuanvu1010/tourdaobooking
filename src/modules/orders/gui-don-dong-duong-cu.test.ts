// ADR-0136 Đ13.5 — Task 3.4 commit 2: đóng đường cũ. Người LẬP đơn giữ quyền Đối tác (kể cả tài khoản lai) nhận 409 `partner_submit_required` ở `/status` (confirmed) và `gui-xac-nhan`.
// Chạy CẢ ứng dụng trên SQLite thật. Ca 4b (tài khoản lai chỉ bị chặn khi chính họ lập) ở gui-don-route.test.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { LAI, PARTNER, datCo, lap, setup, svc, inDays } from "../../../tests/audit/xac-nhan-khung.mjs";

const mo = (w: any, orderId: string) => w.q("SELECT * FROM ord_confirm_request WHERE order_id = ?", orderId);
const guiXN = (w: any, id: string, as: string) => w.call("POST", `/api/orders/${id}/gui-xac-nhan`, { as, body: {} });
const trangThai = (w: any, id: string) => w.q("SELECT status FROM orders WHERE id = ?", id)[0].status;
const THUONG = () => [svc("ZB1", inDays(3))];

test("đường cũ đóng: người lập giữ quyền Đối tác — /status confirmed và gui-xac-nhan đều 409 partner_submit_required (đơn cần xác nhận lẫn đơn thường); huỷ đơn mình vẫn được", async () => {
  const w = setup();
  datCo(w, "SERVICE", "ZA1", true);
  for (const as of [PARTNER, LAI]) {
    for (const dv of [undefined, THUONG()]) {
      const o = await lap(w, as, dv);
      const s = await w.call("POST", `/api/orders/${o.id}/status`, { as, body: { status: "confirmed" } });
      assert.equal(s.status, 409, `${as}: ${s.text}`);
      assert.equal(s.json.error.code, "partner_submit_required");
      const g = await guiXN(w, o.id, as);
      assert.equal(g.status, 409, `${as}: ${g.text}`);
      assert.equal(g.json.error.code, "partner_submit_required");
      assert.equal(trangThai(w, o.id), "draft");
      assert.equal(mo(w, o.id).length, 0);
    }
    const h = await lap(w, as, THUONG());
    const huy = await w.call("POST", `/api/orders/${h.id}/status`, { as, body: { status: "cancelled", lyDo: "KHACH_DOI_Y" } });
    assert.equal(huy.status, 200, `${as}: ${huy.text}`);
  }
});

