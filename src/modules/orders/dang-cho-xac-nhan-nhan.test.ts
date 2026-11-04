// ADR-0166 câu 5 — cờ `dangChoXacNhan` của danh sách đơn (`GET /api/orders`): đơn NHÁP đã gửi đi kiểm vé và chưa ai quyết thì có cờ (thẻ ghi «Chờ xác nhận»); đơn nháp
// chưa gửi, đơn đã Rút lại, và mọi đơn đã quyết (Còn vé, Hết vé, Huỷ) thì VẮNG khoá (không gửi false). Chạy CẢ ứng dụng trên SQLite thật (tests/audit/harness.mjs).
// Phạm vi xem không đổi: đơn nháp vẫn chỉ người lập thấy trong danh sách (ADR-0135).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { A, ACC, B, datCo, inDays, lap, leg, setup, svc } from "../../../tests/audit/xac-nhan-khung.mjs";

const gui = (w: any, id: string, as: string) => w.call("POST", `/api/orders/${id}/gui-xac-nhan`, { as, body: {} });
const rut = (w: any, id: string, as: string) => w.call("POST", `/api/orders/${id}/rut-xac-nhan`, { as, body: {} });
function quyet(w: any, id: string, as: string, extra: Record<string, unknown>) {
  const moc = w.q("SELECT updated_at u FROM orders WHERE id = ?", id)[0].u;
  const y = w.q("SELECT id FROM ord_confirm_request WHERE order_id = ? AND decided_at IS NULL", id)[0];
  return w.call("POST", `/api/orders/${id}/quyet-dinh`, { as, body: { yeuCauId: y?.id, updatedAt: moc, ...extra } });
}
/** Dòng của đơn trong danh sách của `as`: undefined nếu người đó không thấy đơn. */
async function dong(w: any, id: string, as: string): Promise<any> {
  const r = await w.call("GET", "/api/orders", { as });
  assert.equal(r.status, 200, r.text);
  return r.json.orders.find((o: any) => o.id === id);
}
async function donCoCo(w: any) {
  const ngay = inDays(3);
  return lap(w, A, [svc("ZA1", ngay, [leg(ngay, "07:00")])]);
}

test("cờ dangChoXacNhan: chưa gửi → vắng khoá; gửi → true; Rút lại → vắng khoá; gửi lại rồi Còn vé → vắng khoá", async () => {
  const w = setup();
  datCo(w, "SERVICE", "ZA1", true);
  const o = await donCoCo(w);
  const truoc = await dong(w, o.id, A);
  assert.equal(truoc.status, "draft");
  assert.equal("dangChoXacNhan" in truoc, false, "đơn nháp chưa gửi: không có khoá (không gửi false)");

  assert.equal((await gui(w, o.id, A)).status, 201);
  assert.equal((await dong(w, o.id, A)).dangChoXacNhan, true, "sau Gửi xác nhận có cờ");

  assert.equal((await rut(w, o.id, A)).status, 200);
  const sauRut = await dong(w, o.id, A);
  assert.equal(sauRut.status, "draft");
  assert.equal("dangChoXacNhan" in sauRut, false, "sau Rút lại hết cờ");

  assert.equal((await gui(w, o.id, A)).status, 201);
  assert.equal((await dong(w, o.id, A)).dangChoXacNhan, true, "gửi lại có cờ lại");
  const qd = await quyet(w, o.id, ACC, { ketQua: "CON_VE" });
  assert.equal(qd.status, 200, qd.text);
  const sauConVe = await dong(w, o.id, A);
  assert.equal(sauConVe.status, "confirmed");
  assert.equal("dangChoXacNhan" in sauConVe, false, "sau Còn vé (đơn đã xác nhận) không cờ");
});

test("cờ dangChoXacNhan hết sau Hết vé và sau Huỷ; đơn khác còn chờ vẫn giữ cờ; đơn thường không bao giờ có cờ", async () => {
  const w = setup();
  datCo(w, "SERVICE", "ZA1", true);
  const hetVe = await donCoCo(w);
  const huy = await donCoCo(w);
  const conCho = await donCoCo(w);
  const thuong = await lap(w, A, [svc("ZB1", inDays(3))]);
  for (const o of [hetVe, huy, conCho]) assert.equal((await gui(w, o.id, A)).status, 201);
  assert.equal((await quyet(w, hetVe.id, ACC, { ketQua: "HET_VE" })).status, 200);
  assert.equal((await quyet(w, huy.id, ACC, { ketQua: "HUY", lyDo: "KHACH_DOI_Y" })).status, 200);
  const r = await w.call("GET", "/api/orders", { as: A });
  const theo = (id: string) => r.json.orders.find((o: any) => o.id === id);
  assert.deepEqual([theo(hetVe.id).status, "dangChoXacNhan" in theo(hetVe.id)], ["cancelled", false]);
  assert.deepEqual([theo(huy.id).status, "dangChoXacNhan" in theo(huy.id)], ["cancelled", false]);
  assert.equal(theo(conCho.id).dangChoXacNhan, true);
  assert.equal("dangChoXacNhan" in theo(thuong.id), false);
});

test("cờ dangChoXacNhan không mở rộng phạm vi xem: người khác vẫn không thấy đơn nháp đang chờ trong danh sách (ADR-0135)", async () => {
  const w = setup();
  datCo(w, "SERVICE", "ZA1", true);
  const o = await donCoCo(w);
  assert.equal((await gui(w, o.id, A)).status, 201);
  for (const as of [B, ACC]) assert.equal(await dong(w, o.id, as), undefined, as);
  assert.equal((await dong(w, o.id, A)).dangChoXacNhan, true);
});
