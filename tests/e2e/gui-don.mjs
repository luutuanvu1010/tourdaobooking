// «GỬI ĐƠN» của Đối tác (ADR-0136 Đ13, Task 3.4) trên API THẬT (wrangler dev, D1 local tạm). Các ca theo kế hoạch docs/superpowers/plans/2026-10-19-xac-nhan-don.md (Task 3.4, Step 1):
//   (1) dịch vụ cờ → nhánh A 201, đơn vẫn nháp, Rút lại được   (2) đơn thường → nhánh B 200, đơn đã xác nhận   (4) /status và gui-xac-nhan của NGƯỜI LẬP giữ quyền Đối tác → 409 partner_submit_required
//   (tài khoản lai cũng vậy; Bán hàng thuần thì không)   (6) Bán hàng thuần gọi gui-don 403, Toàn quyền gửi nháp của người khác 404, gửi lần hai 409.
// Ca (3) chặng dưới mốc và (7) khoản thu nằm ở bài khung thử `src/modules/orders/gui-don-route.test.ts` (đo giờ thật / nháp không ghi thu được qua API).
// D1 chung với kịch bản khác: dùng RIÊNG hai mã danh mục giả ZGD1 (đánh cờ) / ZGD2 và CUỐI KỊCH BẢN trả cờ về như lúc đầu. Ngày đi ≥ 3 ngày.
import assert from "node:assert/strict";
import { ACCOUNTS, call, catalogService, ensureFakeCatalog, gieoTaiKhoanLai, orderInput, session, sql, sqlRows, vnDate } from "./lib.mjs";

await ensureFakeCatalog();
const AT = "'2026-01-01T00:00:00.000Z'";
await sql(`INSERT INTO catalog_item (code,name,unit,price_adult,price_child,price_senior,price_infant,note_child,note_senior,note_infant,sheet_row,in_sheet,first_seen_at,updated_at) VALUES
  ('ZGD1','Dịch vụ gửi đơn thử','perPax',100000,NULL,NULL,NULL,NULL,NULL,NULL,97,1,${AT},${AT}),('ZGD2','Dịch vụ thường gửi đơn','perPax',100000,NULL,NULL,NULL,NULL,NULL,NULL,98,1,${AT},${AT})
  ON CONFLICT(code) DO UPDATE SET name = excluded.name, price_adult = excluded.price_adult, in_sheet = 1`);

const SALES = await session(ACCOUNTS.salesA);
const SUPER = await session(ACCOUNTS.superAdmin);
const tag = Date.now().toString(36);
const DOI_TAC = (await gieoTaiKhoanLai(`Đối tác gửi đơn ${tag}`, ["PARTNER"])).cookie;
const LAI = (await gieoTaiKhoanLai(`Lai Bán hàng Đối tác gửi đơn ${tag}`, ["SALES", "PARTNER"])).cookie;

const URL_CD = "/api/cai-dat/xac-nhan-don";
const ngay = vnDate(3);
const dichVu = (ma) => catalogService({ catalogCode: ma, catalogPriceSeen: { adult: 100000 }, pax: { adult: 2 }, departDate: ngay });
const lap = async (who, ma) => {
  const r = await call(who, "POST", "/api/orders", orderInput({ customerName: `Khách Gửi Đơn E2E ${tag}`, customerPhone: "0913571357", services: [dichVu(ma)] }));
  assert.equal(r.status, 201, JSON.stringify(r.body));
  return r.body.order;
};
const guiDon = (who, id) => call(who, "POST", `/api/orders/${id}/gui-don`, {});
const trangThai = async (id) => (await sqlRows(`SELECT status FROM orders WHERE id = '${id}'`))[0].status;
const yeuCauMo = async (id) => (await sqlRows(`SELECT count(*) AS n FROM ord_confirm_request WHERE order_id = '${id}' AND decided_at IS NULL`))[0].n;
const datCo = (can) => call(SUPER, "POST", URL_CD, { pham: "SERVICE", ma: "ZGD1", canXacNhan: can });

assert.equal((await datCo(true)).status, 200);
assert.equal((await call(SUPER, "POST", URL_CD, { pham: "SERVICE", ma: "ZGD2", canXacNhan: false })).status, 200);
try {
  // (1) nhánh A
  const a = await lap(DOI_TAC, "ZGD1");
  let r = await guiDon(DOI_TAC, a.id);
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal(r.body.nhanh, "A");
  assert.equal(r.body.thongBao, "Đơn của bạn đã được gửi và chờ xác nhận");
  assert.equal(await trangThai(a.id), "draft");
  assert.equal(await yeuCauMo(a.id), 1);
  r = await call(DOI_TAC, "POST", `/api/orders/${a.id}/rut-xac-nhan`, {});
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(await yeuCauMo(a.id), 0);
  console.log("✓ (1) Đối tác gửi đơn dịch vụ cờ → 201 nhánh A, đơn vẫn nháp, một yêu cầu mở; Rút lại → 200");

  // (2) nhánh B
  const b = await lap(DOI_TAC, "ZGD2");
  r = await guiDon(DOI_TAC, b.id);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.nhanh, "B");
  assert.equal(r.body.thongBao, "Đơn của bạn đã được chuyển đến chuyên viên phụ trách & chờ hướng dẫn viên");
  assert.equal(await trangThai(b.id), "confirmed");
  assert.equal(await yeuCauMo(b.id), 0);
  console.log("✓ (2) Đối tác gửi đơn thường → 200 nhánh B, đơn đã xác nhận, không mở yêu cầu");

  // (4) đường cũ đóng cho NGƯỜI LẬP giữ quyền Đối tác; Bán hàng thuần không bị chặn
  for (const [ten, who] of [["Đối tác", DOI_TAC], ["lai Bán hàng + Đối tác", LAI]]) {
    const o = await lap(who, "ZGD2");
    r = await call(who, "POST", `/api/orders/${o.id}/status`, { status: "confirmed" });
    assert.equal(r.status, 409, `${ten}: ${JSON.stringify(r.body)}`);
    assert.equal(r.body.error.code, "partner_submit_required", ten);
    r = await call(who, "POST", `/api/orders/${o.id}/gui-xac-nhan`, {});
    assert.equal(r.status, 409, `${ten}: ${JSON.stringify(r.body)}`);
    assert.equal(r.body.error.code, "partner_submit_required", ten);
    assert.equal(await trangThai(o.id), "draft", ten);
  }
  const t = await lap(SALES, "ZGD2");
  assert.equal((await call(SALES, "POST", `/api/orders/${t.id}/status`, { status: "confirmed" })).status, 200);
  console.log("✓ (4) /status và gui-xac-nhan của người lập giữ quyền Đối tác (cả tài khoản lai) → 409 partner_submit_required; Bán hàng thuần xác nhận như cũ");

  // (6) cổng quyền và lần hai
  const c = await lap(SALES, "ZGD2");
  assert.equal((await guiDon(SALES, c.id)).status, 403, "Bán hàng thuần không có order.submit");
  const d = await lap(DOI_TAC, "ZGD1");
  assert.equal((await guiDon(SUPER, d.id)).status, 404, "Toàn quyền gửi nháp của người khác → 404");
  assert.equal((await guiDon(DOI_TAC, d.id)).status, 201);
  r = await guiDon(DOI_TAC, d.id);
  assert.equal(r.status, 409, JSON.stringify(r.body));
  assert.equal(r.body.error.code, "confirm_already_open");
  assert.equal(await yeuCauMo(d.id), 1);
  console.log("✓ (6) Bán hàng thuần gọi gui-don 403; Toàn quyền gửi nháp người khác 404; gửi lần hai 409, vẫn một yêu cầu");
} finally {
  await datCo(false);
}
