// T3 (kiểm toán 14/11) — «nháp cũ, giá mới». Bài MÔ TẢ HIỆN TRẠNG, không phải hành vi mong muốn: lưu nháp ở giá danh mục cũ, danh mục tăng giá, rồi xác nhận ở CẢ BA đường
// (`POST /status`, «Gửi đơn» nhánh B của Đối tác, «Còn vé» của người xét) ⇒ đơn chốt theo đơn giá ĐÃ LƯU. Cổng xác nhận (`kiemCongXacNhan`) chỉ so đơn giá với `catalog_price` ĐÃ LƯU trong nháp
// (`viPhamGiaDanhMuc`), không đọc lại giá hiện hành; kiểm `catalog_changed` chỉ có lúc LƯU (service-rules.ts, `catalogPriceSeen`). Nếu chủ duyệt sửa (409 `catalog_changed` hay chỉ cảnh báo),
// bài này phải đổi cùng lúc — đừng sửa cho khớp mà không có quyết định của chủ (chạm tiền).
// Chạy CẢ ứng dụng trên SQLite thật (tests/audit/harness.mjs). Ngày đi cách 3 ngày nên không vướng mốc 6 giờ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { A, B, PARTNER, datCo, inDays, lap, setup, svc } from "../../../tests/audit/xac-nhan-khung.mjs";

const doiGia = (w: any, ma: string, gia: number) => w.sqlite.prepare("UPDATE catalog_item SET price_adult = ? WHERE code = ?").run(gia, ma);
const don = async (w: any, id: string, as = A) => (await w.call("GET", `/api/orders/${id}`, { as })).json.order;
const trangThai = (w: any, id: string) => w.q("SELECT status FROM orders WHERE id = ?", id)[0].status;
const dongTien = (w: any, id: string) => w.q("SELECT unit_price, catalog_price, line_total FROM order_item WHERE order_id = ?", id).map((r: any) => ({ ...r }));

test("hiện trạng: nháp cũ chốt giá cũ — /status của Bán hàng: giá danh mục đã đổi (nháp báo price_changed) mà xác nhận vẫn qua, đơn chốt 600.000 thay vì 720.000", async () => {
  const w = setup();
  const o = await lap(w, A, [svc("ZB1", inDays(3))]); // 2 người lớn × 300.000
  assert.equal(o.total, 600_000);
  doiGia(w, "ZB1", 360_000);
  assert.equal((await don(w, o.id)).services[0].catalogStatus, "price_changed", "màn đơn biết giá đã đổi");
  const r = await w.call("POST", `/api/orders/${o.id}/status`, { as: A, body: { status: "confirmed" } });
  assert.equal(r.status, 200, r.text); // HIỆN TRẠNG: không có 409 catalog_changed ở cổng xác nhận
  assert.equal(trangThai(w, o.id), "confirmed");
  assert.equal((await don(w, o.id)).total, 600_000);
  assert.deepEqual(dongTien(w, o.id), [{ unit_price: 300_000, catalog_price: 300_000, line_total: 600_000 }]);
});

test("hiện trạng: nháp cũ chốt giá cũ — «Gửi đơn» nhánh B của Đối tác (luật R2 chỉ so giá ĐÃ LƯU): xác nhận ngay ở giá cũ", async () => {
  const w = setup();
  const o = await lap(w, PARTNER, [svc("ZB1", inDays(3))]);
  doiGia(w, "ZB1", 360_000);
  const r = await w.call("POST", `/api/orders/${o.id}/gui-don`, { as: PARTNER, body: {} });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.nhanh, "B");
  assert.equal(trangThai(w, o.id), "confirmed");
  assert.equal((await don(w, o.id, PARTNER)).total, 600_000);
});

test("hiện trạng: nháp cũ chốt giá cũ — «Còn vé» của người xét: đơn Đối tác chờ xét chốt theo giá lưu lúc lập", async () => {
  const w = setup();
  datCo(w, "SERVICE", "ZA1", true);
  const o = await lap(w, PARTNER, [svc("ZA1", inDays(3))]); // 2 × 500.000
  assert.equal((await w.call("POST", `/api/orders/${o.id}/gui-don`, { as: PARTNER, body: {} })).json.nhanh, "A");
  doiGia(w, "ZA1", 600_000);
  const moc = w.q("SELECT updated_at u FROM orders WHERE id = ?", o.id)[0];
  const y = w.q("SELECT id FROM ord_confirm_request WHERE order_id = ? AND decided_at IS NULL", o.id)[0];
  const r = await w.call("POST", `/api/orders/${o.id}/quyet-dinh`, { as: B, body: { yeuCauId: y.id, updatedAt: moc.u, ketQua: "CON_VE" } });
  assert.equal(r.status, 200, r.text);
  assert.equal(trangThai(w, o.id), "confirmed");
  assert.equal((await don(w, o.id, B)).total, 1_000_000);
});
