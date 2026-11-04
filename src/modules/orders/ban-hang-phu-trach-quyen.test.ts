// ADR-0142 Task 4 — danh sách trắng «được giao» của Bán hàng phụ trách trên API thật (SQLite thật, cả ứng dụng): sửa chuyến được, xem lịch sử được,
// cờ `laBanHangPhuTrach` ở chi tiết đơn; KHÔNG huỷ được, KHÔNG sửa đơn, người khác không có cờ. Dòng ô Bán hàng gieo thẳng SQL (route Nhận làm ở Task 5).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { A, ACC, B, setup, lap } from "../../../tests/audit/xac-nhan-khung.mjs";

const pty = (id: string) => `pty-${id}`;

test("Bán hàng phụ trách (không phải người lập, không phụ trách HDV): sửa chuyến 200, thấy lịch sử, có cờ; huỷ 403; Kế toán vẫn 403; người khác không có cờ", async () => {
  const w = setup();
  const o = await lap(w, A);
  const xn = await w.xacNhanDon(o.id, A);
  assert.equal(xn.status, 200, xn.text);
  const at = new Date().toISOString();
  w.sqlite.prepare("INSERT INTO dsp_sales_owner (id, order_id, party_id, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run("so-1", o.id, pty(B), at, at, A, at, A);

  const xemB = await w.call("GET", `/api/orders/${o.id}`, { as: B });
  assert.equal(xemB.status, 200, xemB.text);
  assert.equal(xemB.json.laBanHangPhuTrach, true);
  assert.equal(xemB.json.canModify, false, "cờ mới KHÔNG cho order.modify");
  assert.ok(xemB.json.history.length > 0, "order.history.view theo cờ: thấy lịch sử rút gọn");
  const xemA = await w.call("GET", `/api/orders/${o.id}`, { as: A });
  assert.equal(xemA.json.laBanHangPhuTrach, false, "người lập không mặc nhiên là Bán hàng phụ trách");

  const dv = xemA.json.order.services[0];
  const trip = (as: string) => w.call("PUT", `/api/orders/${o.id}/trip`, { as, body: { expectedUpdatedAt: xemA.json.order.updatedAt, services: [{ id: dv.id, departDate: dv.departDate, departTime: "", pickupTime: "07:30", pickupPlace: "Khách sạn Mới", checkinDate: "", checkinTime: "", checkinPlace: "", note: "" }] } });
  const ke = await trip(ACC);
  assert.equal(ke.status, 403, `Kế toán: ${ke.text}`);
  const ban = await trip(B);
  assert.equal(ban.status, 200, ban.text);

  const huy = await w.call("POST", `/api/orders/${o.id}/status`, { as: B, body: { status: "cancelled", lyDo: "KHACH_DOI_Y" } });
  assert.equal(huy.status, 403, `không huỷ được: ${huy.text}`);
  assert.equal(w.q("SELECT status FROM orders WHERE id = ?", o.id)[0].status, "confirmed");

});
