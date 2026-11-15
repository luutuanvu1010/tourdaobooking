// T3 (kiểm toán 14/11) — «nháp cũ, giá mới». Chủ dự án chọn «Chặn Đối tác, Thực tập» (15/11/2026), sau khi biết Q11 của đặc tả 2026-09-19 («nháp cũ … đổi giá: giữ bản chụp đã lưu,
// chỉ cảnh báo»): tài khoản chỉ được bán đúng giá danh mục thì «đúng giá» là giá HÔM NAY ⇒ 409 `gia_danh_muc_da_doi` khi NGƯỜI BẤM là Đối tác / Thực tập, hoặc NGƯỜI LẬP giữ quyền đó
// (người xét bấm Còn vé). Nhân viên nội bộ lập và xác nhận: GIỮ Q11 — đơn chốt theo giá đã lưu, chỉ có câu nhắc ở giao diện (`canhBaoXacNhan`, bài cạnh src/shared/canh-bao-xac-nhan.ts).
// Cổng: `congGiaDanhMucDoi` trong `kiemCongXacNhan` (xac-nhan-chung.ts), dùng lại `catalogStatusOf`. Dịch vụ đã ẩn khỏi danh mục KHÔNG thuộc cổng này.
// Chạy CẢ ứng dụng trên SQLite thật (tests/audit/harness.mjs). Ngày đi cách 3 ngày nên không vướng mốc 6 giờ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { A, B, INTERN, PARTNER, datCo, inDays, lap, setup, svc } from "../../../tests/audit/xac-nhan-khung.mjs";

const doiGia = (w: any, ma: string, gia: number) => w.sqlite.prepare("UPDATE catalog_item SET price_adult = ? WHERE code = ?").run(gia, ma);
const don = async (w: any, id: string, as = A) => (await w.call("GET", `/api/orders/${id}`, { as })).json.order;
const trangThai = (w: any, id: string) => w.q("SELECT status FROM orders WHERE id = ?", id)[0].status;
const dongTien = (w: any, id: string) => w.q("SELECT unit_price, catalog_price, line_total FROM order_item WHERE order_id = ?", id).map((r: any) => ({ ...r }));
const laChan = (r: any, canCo: RegExp) => {
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "gia_danh_muc_da_doi");
  assert.match(r.json.error.message, canCo);
  assert.doesNotMatch(r.json.error.message, /catalog|price|draft|confirmed/, "câu lỗi không lộ mã thô");
};

test("Q11 giữ cho nhân viên nội bộ: Bán hàng lập và xác nhận, giá danh mục đã đổi ⇒ vẫn 200, đơn chốt theo giá ĐÃ LƯU (600.000); màn đơn có dấu price_changed để nhắc", async () => {
  const w = setup();
  const o = await lap(w, A, [svc("ZB1", inDays(3))]); // 2 người lớn × 300.000
  doiGia(w, "ZB1", 360_000);
  assert.equal((await don(w, o.id)).services[0].catalogStatus, "price_changed");
  const r = await w.call("POST", `/api/orders/${o.id}/status`, { as: A, body: { status: "confirmed" } });
  assert.equal(r.status, 200, r.text);
  assert.equal(trangThai(w, o.id), "confirmed");
  assert.deepEqual(dongTien(w, o.id), [{ unit_price: 300_000, catalog_price: 300_000, line_total: 600_000 }]);
});

test("Đối tác «Gửi đơn» (nhánh xác nhận thẳng): giá đổi ⇒ 409, đơn vẫn nháp, tiền không đổi; câu nêu giá cũ → giá mới và cách sửa", async () => {
  const w = setup();
  const o = await lap(w, PARTNER, [svc("ZB1", inDays(3))]);
  doiGia(w, "ZB1", 360_000);
  const r = await w.call("POST", `/api/orders/${o.id}/gui-don`, { as: PARTNER, body: {} });
  laChan(r, /300\.000 ₫ → 360\.000 ₫/);
  assert.match(r.json.error.message, /chọn lại từ danh mục/);
  assert.equal(trangThai(w, o.id), "draft");
  assert.deepEqual(dongTien(w, o.id), [{ unit_price: 300_000, catalog_price: 300_000, line_total: 600_000 }]);
});

test("lối thoát của Đối tác: bỏ dịch vụ rồi chọn lại từ danh mục (không gửi id cũ) ⇒ nháp nhận giá mới, Gửi đơn qua, đơn chốt 720.000", async () => {
  const w = setup();
  const o = await lap(w, PARTNER, [svc("ZB1", inDays(3))]);
  doiGia(w, "ZB1", 360_000);
  const luu = await w.call("PUT", `/api/orders/${o.id}`, { as: PARTNER, body: { customerName: "Khách Thử", customerPhone: "0912345678", expectedUpdatedAt: o.updatedAt, services: [svc("ZB1", inDays(3), [], { catalogPriceSeen: { adult: 360_000 } })] } });
  assert.equal(luu.status, 200, luu.text);
  const r = await w.call("POST", `/api/orders/${o.id}/gui-don`, { as: PARTNER, body: {} });
  assert.equal(r.status, 200, r.text);
  assert.equal(trangThai(w, o.id), "confirmed");
  assert.equal((await don(w, o.id, PARTNER)).total, 720_000);
});

test("«Còn vé» của người xét trên đơn do Đối tác lập: giá đổi sau khi gửi ⇒ 409, câu bảo người lập Rút lại; đơn chưa xác nhận, yêu cầu vẫn chờ", async () => {
  const w = setup();
  datCo(w, "SERVICE", "ZA1", true);
  const o = await lap(w, PARTNER, [svc("ZA1", inDays(3))]); // 2 × 500.000
  assert.equal((await w.call("POST", `/api/orders/${o.id}/gui-don`, { as: PARTNER, body: {} })).json.nhanh, "A");
  doiGia(w, "ZA1", 600_000);
  const moc = w.q("SELECT updated_at u FROM orders WHERE id = ?", o.id)[0];
  const y = w.q("SELECT id FROM ord_confirm_request WHERE order_id = ? AND decided_at IS NULL", o.id)[0];
  const r = await w.call("POST", `/api/orders/${o.id}/quyet-dinh`, { as: B, body: { yeuCauId: y.id, updatedAt: moc.u, ketQua: "CON_VE" } });
  laChan(r, /Rút lại/);
  assert.notEqual(trangThai(w, o.id), "confirmed");
  assert.equal(w.q("SELECT count(*) n FROM ord_confirm_request WHERE order_id = ? AND decided_at IS NULL", o.id)[0].n, 1);
});

test("Thực tập lập đơn rồi tự bấm xác nhận: giá đổi ⇒ 409 gia_danh_muc_da_doi, đơn vẫn nháp", async () => {
  const w = setup();
  const o = await lap(w, INTERN, [svc("ZB1", inDays(3))]);
  doiGia(w, "ZB1", 360_000);
  const tuBam = await w.call("POST", `/api/orders/${o.id}/status`, { as: INTERN, body: { status: "confirmed" } });
  laChan(tuBam, /360\.000 ₫/);
  assert.equal(trangThai(w, o.id), "draft");
});

test("lưới: giá danh mục đổi rồi về lại đúng giá đã lưu ⇒ Đối tác Gửi đơn qua như cũ", async () => {
  const w = setup();
  const o = await lap(w, PARTNER, [svc("ZB1", inDays(3))]);
  doiGia(w, "ZB1", 360_000);
  doiGia(w, "ZB1", 300_000);
  const r = await w.call("POST", `/api/orders/${o.id}/gui-don`, { as: PARTNER, body: {} });
  assert.equal(r.status, 200, r.text);
  assert.equal(trangThai(w, o.id), "confirmed");
});
