// ADR-0136 Đ13 — Task 3.4 (lần giao L5): «Gửi đơn» của Đối tác (nhánh A mở yêu cầu / nhánh B xác nhận ngay), 409 `partner_submit_required` chỉ chặn NGƯỜI LẬP giữ quyền Đối tác,
// ô `order.submit` là cổng của quyền, khoản thu chặn nhánh A. Chạy CẢ ứng dụng trên SQLite thật (tests/audit/harness.mjs). Bài không phụ thuộc giờ thật: ngày đi cách ≥ 3 ngày.
import { test } from "node:test";
import assert from "node:assert/strict";
import { CAU_BAO_GUI_DON } from "../../shared/gui-don-cau-bao.ts";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { A, B, ACC, INTERN, LAI, PARTNER, SUP, datCo, inDays, lap, leg, setup, svc, vnSau } from "../../../tests/audit/xac-nhan-khung.mjs";

const mo = (w: any, orderId: string) => w.q("SELECT * FROM ord_confirm_request WHERE order_id = ? ORDER BY submitted_at, rowid", orderId);
const nhatKy = (w: any, orderId: string, action: string) => w.q("SELECT * FROM audit_log WHERE order_id = ? AND action = ?", orderId, action);
const guiDon = (w: any, id: string, as: string) => w.call("POST", `/api/orders/${id}/gui-don`, { as, body: {} });
const guiXN = (w: any, id: string, as: string) => w.call("POST", `/api/orders/${id}/gui-xac-nhan`, { as, body: {} });
const trangThai = (w: any, id: string) => w.q("SELECT status FROM orders WHERE id = ?", id)[0].status;
const THUONG = () => [svc("ZB1", inDays(3))];

test("(1) Đối tác gửi đơn có dịch vụ «cần xác nhận» → 201, nhánh A, câu A nguyên văn, đơn vẫn nháp, một yêu cầu mở; Đối tác rút lại được", async () => {
  const w = setup();
  datCo(w, "SERVICE", "ZA1", true);
  const o = await lap(w, PARTNER);
  const r = await guiDon(w, o.id, PARTNER);
  assert.equal(r.status, 201, r.text);
  assert.equal(r.json.nhanh, "A");
  assert.equal(r.json.thongBao, CAU_BAO_GUI_DON.A);
  assert.deepEqual(r.json.yeuCau.vi, ["DICH_VU"]);
  assert.equal(trangThai(w, o.id), "draft");
  const y = mo(w, o.id);
  assert.equal(y.length, 1);
  assert.equal(y[0].decided_at, null);
  assert.equal(y[0].submitted_by, PARTNER);
  assert.equal(nhatKy(w, o.id, "order_confirm_requested").length, 1);
  const rut = await w.call("POST", `/api/orders/${o.id}/rut-xac-nhan`, { as: PARTNER, body: {} });
  assert.equal(rut.status, 200, rut.text);
  assert.equal(mo(w, o.id)[0].outcome, "RUT_LAI");
});

test("(2) Đối tác gửi đơn không dịch vụ cần, không chặng dưới mốc → 200, nhánh B, câu B nguyên văn, đơn đã xác nhận, vào hàng chờ nhận, nhật ký có ghi chú, người gửi không nhận tin «đã xác nhận»", async () => {
  const w = setup();
  datCo(w, "SERVICE", "ZA1", true);
  const o = await lap(w, PARTNER, THUONG());
  const r = await guiDon(w, o.id, PARTNER);
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.nhanh, "B");
  assert.equal(r.json.thongBao, CAU_BAO_GUI_DON.B);
  assert.equal(trangThai(w, o.id), "confirmed");
  assert.equal(mo(w, o.id).length, 0, "nhánh B không mở yêu cầu");
  const nk = nhatKy(w, o.id, "confirmed");
  assert.equal(nk.length, 1);
  assert.ok(String(nk[0].detail).includes("tự xác nhận khi Đối tác gửi đơn"), String(nk[0].detail));
  const pool = await w.call("GET", "/api/orders/pool", { as: SUP });
  assert.equal(pool.status, 200, pool.text);
  assert.ok(JSON.stringify(pool.json).includes(o.orderCode), "đơn có trong hàng chờ nhận");
  const tin = await w.call("GET", "/api/thong-bao?ngan=cua-toi", { as: PARTNER });
  assert.equal(tin.status, 200, tin.text);
  assert.ok(!(tin.json.tin as any[]).some((t) => t.maDon === o.orderCode && (t.loai === "xac_nhan" || t.loai === "cho_nhan")), "người gửi không nhận tin về việc chính mình vừa làm");
});

test("(3) Đối tác, không dịch vụ cờ, chặng đón dưới mốc 6 giờ chưa đặt gấp → 201 nhánh A (DAT_GAP), KHÔNG short_notice_required lúc gửi", async () => {
  const w = setup();
  const gio = vnSau(60);
  const o = await lap(w, PARTNER, [svc("ZB1", gio.date, [leg(gio.date, gio.time)])]);
  const r = await guiDon(w, o.id, PARTNER);
  assert.equal(r.status, 201, r.text);
  assert.equal(r.json.nhanh, "A");
  assert.deepEqual(r.json.yeuCau.vi, ["DAT_GAP"]);
  assert.equal(trangThai(w, o.id), "draft");
});

test("(4b) tài khoản lai chỉ bị chặn khi CHÍNH họ là người lập: đơn chờ của người khác quyết định được, đơn chờ của chính mình thì không, nháp thường của người khác 404; Bán hàng thuần không bị chặn", async () => {
  const w = setup();
  datCo(w, "SERVICE", "ZA1", true);
  const cua = await lap(w, A);
  assert.equal((await guiXN(w, cua.id, A)).status, 201);
  const thuong = await lap(w, A, THUONG());
  const q404 = await w.call("POST", `/api/orders/${thuong.id}/quyet-dinh`, { as: LAI, body: { ketQua: "CON_VE", yeuCauId: crypto.randomUUID(), updatedAt: thuong.updatedAt } });
  assert.equal(q404.status, 404, q404.text);
  const y = mo(w, cua.id)[0];
  const ok = await w.call("POST", `/api/orders/${cua.id}/quyet-dinh`, { as: LAI, body: { ketQua: "CON_VE", yeuCauId: y.id, updatedAt: w.q("SELECT updated_at FROM orders WHERE id = ?", cua.id)[0].updated_at } });
  assert.equal(ok.status, 200, ok.text);
  assert.equal(trangThai(w, cua.id), "confirmed");
  // đơn chờ của chính LAI (gửi bằng Gửi đơn) → LAI không tự quyết
  const rieng = await lap(w, LAI);
  assert.equal((await guiDon(w, rieng.id, LAI)).status, 201);
  const yr = mo(w, rieng.id)[0];
  const tu = await w.call("POST", `/api/orders/${rieng.id}/quyet-dinh`, { as: LAI, body: { ketQua: "CON_VE", yeuCauId: yr.id, updatedAt: w.q("SELECT updated_at FROM orders WHERE id = ?", rieng.id)[0].updated_at } });
  assert.equal(tu.status, 403, tu.text);
  // Bán hàng thuần không bị cổng này
  const t = await lap(w, A, THUONG());
  assert.equal((await w.call("POST", `/api/orders/${t.id}/status`, { as: A, body: { status: "confirmed" } })).status, 200);
});

test("(5) một cổng hỏng khi gửi → đúng lỗi cổng đó, đơn ở lại nháp, không mở yêu cầu (thiếu chọn Đón, dòng khác giá danh mục)", async () => {
  const w = setup();
  datCo(w, "SERVICE", "ZA1", true);
  const s = svc("ZA1", inDays(3)) as any;
  delete s.pickupChoice;
  const thieu = await lap(w, PARTNER, [s]);
  const r1 = await guiDon(w, thieu.id, PARTNER);
  assert.equal(r1.status, 409, r1.text);
  assert.equal(r1.json.error.code, "pickup_choice_required");
  const gia = await lap(w, PARTNER, THUONG());
  // nháp cũ có một dòng khác giá danh mục (cách dựng của thuc-tap-gia-route.test.ts)
  w.sqlite.prepare("UPDATE order_item SET unit_price = 250000, line_total = quantity * 250000 WHERE order_id = ?").run(gia.id);
  w.sqlite.prepare("UPDATE orders SET subtotal = 500000, total = 500000 - discount, remaining_amount = 500000 - discount - deposit_amount WHERE id = ?").run(gia.id);
  const r2 = await guiDon(w, gia.id, PARTNER);
  assert.equal(r2.status, 403, r2.text);
  for (const id of [thieu.id, gia.id]) {
    assert.equal(trangThai(w, id), "draft");
    assert.equal(mo(w, id).length, 0);
  }
});

test("(6) Thực tập, Bán hàng thuần, Kế toán gọi gui-don → 403; Toàn quyền gửi nháp của người khác → 404; gửi lần hai → 409, không thêm dòng yêu cầu", async () => {
  const w = setup();
  datCo(w, "SERVICE", "ZA1", true);
  const o = await lap(w, PARTNER);
  assert.equal((await guiDon(w, o.id, SUP)).status, 404);
  assert.equal(mo(w, o.id).length, 0);
  const ti = await lap(w, INTERN, THUONG());
  assert.equal((await guiDon(w, ti.id, INTERN)).status, 403);
  const ba = await lap(w, A, THUONG());
  assert.equal((await guiDon(w, ba.id, A)).status, 403);
  assert.equal((await guiDon(w, ba.id, ACC)).status, 404);
  assert.equal((await guiDon(w, o.id, PARTNER)).status, 201);
  const r2 = await guiDon(w, o.id, PARTNER);
  assert.equal(r2.status, 409, r2.text);
  assert.equal(r2.json.error.code, "confirm_already_open");
  assert.equal(mo(w, o.id).length, 1);
  const b = await lap(w, PARTNER, THUONG());
  assert.equal((await guiDon(w, b.id, PARTNER)).status, 200);
  const b2 = await guiDon(w, b.id, PARTNER);
  assert.equal(b2.status, 409, b2.text);
  assert.equal(b2.json.error.code, "order_not_draft");
  assert.equal((await guiDon(w, b.id, B)).status, 403);
  // Ô `order.submit` là cổng DUY NHẤT của quyền (giả định của người soạn): Toàn quyền KHÔNG giữ PARTNER vẫn gửi được nháp của chính mình — bắt ai đó thêm kiểm `holdsPartner` vào route.
  const sup = await lap(w, SUP, THUONG());
  const rs = await guiDon(w, sup.id, SUP);
  assert.equal(rs.status, 200, rs.text);
  assert.equal(rs.json.nhanh, "B");
  assert.equal(trangThai(w, sup.id), "confirmed");
});

test("(7) khoản thu: nhánh A bị chặn 409 confirm_blocked_has_payment (đơn nháp, không yêu cầu); nhánh B vẫn xác nhận; không tiêm hàm → nhánh A 503 khoan_thu_chua_kiem", async () => {
  {
    const w = setup({ daThuGia: 1 });
    datCo(w, "SERVICE", "ZA1", true);
    const a = await lap(w, PARTNER);
    const r = await guiDon(w, a.id, PARTNER);
    assert.equal(r.status, 409, r.text);
    assert.equal(r.json.error.code, "confirm_blocked_has_payment");
    assert.equal(trangThai(w, a.id), "draft");
    assert.equal(mo(w, a.id).length, 0);
    const b = await lap(w, PARTNER, THUONG());
    const rb = await guiDon(w, b.id, PARTNER);
    assert.equal(rb.status, 200, rb.text);
    assert.equal(trangThai(w, b.id), "confirmed");
  }
  {
    const w = setup({ khongTiemDaThu: true });
    datCo(w, "SERVICE", "ZA1", true);
    const a = await lap(w, PARTNER);
    const r = await guiDon(w, a.id, PARTNER);
    assert.equal(r.status, 503, r.text);
    assert.equal(r.json.error.code, "khoan_thu_chua_kiem");
    assert.equal(mo(w, a.id).length, 0);
  }
});
