// «GỬI ĐƠN» của Đối tác (ADR-0136 Đ13, Task 3.4) trên API THẬT (wrangler dev, D1 local tạm). Các ca theo kế hoạch docs/superpowers/plans/2026-10-19-xac-nhan-don.md (Task 3.4, Step 1):
//   (1) dịch vụ cờ → nhánh A 201, đơn vẫn nháp, Rút lại được   (2) đơn thường → nhánh B 200, đơn đã xác nhận   (4) /status và gui-xac-nhan của NGƯỜI LẬP giữ quyền Đối tác → 409 partner_submit_required
//   (tài khoản lai cũng vậy; Bán hàng thuần thì không)   (6) Bán hàng thuần gọi gui-don 403, Toàn quyền gửi nháp của người khác 404, gửi lần hai 409.
//   (9) ADR-0221 «Đối tác không nhập nơi đón»: công tắc Tắt ⇒ lượt không nơi đón 400; Bật ⇒ Đối tác lưu và gửi được, đơn chờ; Còn vé thiếu noiDon 409 `pickup_place_required`, kèm noiDon 200;
//   Bán hàng gửi lượt không nơi đón lúc Bật vẫn 400. Cuối ca trả công tắc về Tắt.
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
const ADMIN = await session(ACCOUNTS.admin);
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
let phiDaBat = false;
const URL_ND = "/api/cai-dat/noi-don-doi-tac";
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

  // (9) ADR-0221: Đối tác không nhập nơi đón — đứng TRƯỚC ca (8) vì ca (8) bật phí đưa đón (Còn vé ở đây không kèm mức phí).
  {
    const luotKhongNoi = { direction: "OUT", pickupDate: "", pickupTime: "", pickupLocationId: null, pickupPlace: "", dropoffLocationId: "a941dd7d-faab-4098-9ab9-1df7fa6dd551", dropoffPlace: "" };
    const thanKhongNoi = () => orderInput({ customerName: `Khách Gửi Đơn E2E ${tag}`, customerPhone: "0913571357", services: [{ ...dichVu("ZGD2"), pickupChoice: "DON", legs: [luotKhongNoi] }] });
    assert.deepEqual((await call(DOI_TAC, "GET", URL_ND)).body, { bat: false, apChoToi: false, doiDuoc: false }, "(9) đầu ca: công tắc đang Tắt");
    r = await call(DOI_TAC, "POST", "/api/orders", thanKhongNoi());
    assert.equal(r.status, 400, `(9) Tắt: ${JSON.stringify(r.body)}`);
    assert.match(r.body.error.message, /cần nơi đón/);
    assert.equal((await call(ADMIN, "POST", URL_ND, { bat: true })).status, 403, "(9) Quản trị không đổi được công tắc");
    assert.equal((await call(SUPER, "POST", URL_ND, { bat: true })).status, 200);
    assert.deepEqual((await call(DOI_TAC, "GET", URL_ND)).body, { bat: true, apChoToi: true, doiDuoc: false });
    assert.deepEqual((await call(SALES, "GET", URL_ND)).body, { bat: true, apChoToi: false, doiDuoc: false });
    r = await call(SALES, "POST", "/api/orders", thanKhongNoi());
    assert.equal(r.status, 400, `(9) Bật, Bán hàng: ${JSON.stringify(r.body)}`);
    assert.match(r.body.error.message, /cần nơi đón/);
    r = await call(DOI_TAC, "POST", "/api/orders", thanKhongNoi());
    assert.equal(r.status, 201, `(9) Bật, Đối tác: ${JSON.stringify(r.body)}`);
    const n = r.body.order;
    const legN = n.services[0].legs[0].id;
    assert.deepEqual(await sqlRows(`SELECT pickup_location_id, pickup_place FROM ord_transfer_leg WHERE id = '${legN}'`), [{ pickup_location_id: null, pickup_place: "(chưa ghi nơi đón)" }]);
    r = await guiDon(DOI_TAC, n.id);
    assert.equal(r.status, 201, JSON.stringify(r.body));
    assert.equal(r.body.nhanh, "A");
    assert.equal(await trangThai(n.id), "draft");
    const xem = (await call(ADMIN, "GET", `/api/orders/${n.id}`)).body;
    const quyet = (them) => call(ADMIN, "POST", `/api/orders/${n.id}/quyet-dinh`, { ketQua: "CON_VE", yeuCauId: xem.xacNhan.yeuCau.id, updatedAt: xem.order.updatedAt, gioDon: [{ legId: legN, pickupTime: "09:00" }], ...them });
    r = await quyet({});
    assert.deepEqual([r.status, r.body?.error?.code], [409, "pickup_place_required"], JSON.stringify(r.body));
    assert.deepEqual(r.body.error.legs, [{ legId: legN }]);
    assert.equal(await trangThai(n.id), "draft");
    const noiThat = `Khách sạn Nơi Đón E2E ${tag}`;
    r = await quyet({ noiDon: [{ legId: legN, pickupPlace: noiThat }] });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(await trangThai(n.id), "confirmed");
    assert.deepEqual(await sqlRows(`SELECT pickup_location_id, pickup_place, pickup_time FROM ord_transfer_leg WHERE id = '${legN}'`), [{ pickup_location_id: null, pickup_place: noiThat, pickup_time: "09:00" }]);
    assert.deepEqual(await sqlRows(`SELECT pickup_place FROM order_service WHERE order_id = '${n.id}'`), [{ pickup_place: noiThat }]);
    assert.equal((await call(SUPER, "POST", URL_ND, { bat: false })).status, 200);
    console.log("✓ (9) Đối tác không nhập nơi đón: Tắt 400; Bật ⇒ lưu, gửi được, đơn chờ; Còn vé thiếu nơi đón 409, kèm nơi đón 200 và cột cũ khớp; Bán hàng vẫn 400");
  }

  // (8) phí đưa đón do văn phòng chọn (ADR-0214, Task 4): Đối tác gửi kèm mức 400; đơn thường có lượt đón chưa chọn phí ⇒ nhánh A (PHI_DON); Quản trị Còn vé kèm mức ⇒ xác nhận có phí.
  const apDau = (await call(ADMIN, "GET", "/api/pricing/phi-don")).body.batDauAp;
  assert.equal(apDau.ngay, null, "(8) đầu ca: phí đưa đón đang tắt");
  assert.equal((await call(ADMIN, "POST", "/api/pricing/phi-don/bat-dau-ap", { ngay: vnDate(0), tuLucDaDoc: apDau.tuLuc })).status, 200);
  phiDaBat = true;
  const luot = { direction: "OUT", pickupDate: "", pickupTime: "06:30", pickupLocationId: null, pickupPlace: `Khách sạn Gửi Đơn E2E ${tag}`, dropoffLocationId: "a941dd7d-faab-4098-9ab9-1df7fa6dd551", dropoffPlace: "" };
  r = await call(DOI_TAC, "POST", "/api/orders", orderInput({ customerName: `Khách Gửi Đơn E2E ${tag}`, customerPhone: "0913571357", services: [{ ...dichVu("ZGD2"), pickupChoice: "DON", legs: [luot] }] }));
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const p = r.body.order;
  const legId = p.services[0].legs[0].id;
  r = await call(DOI_TAC, "POST", `/api/orders/${p.id}/gui-don`, { doiPhi: [{ legId, donGia: 30_000, lyDo: "Báo giá riêng" }] });
  assert.deepEqual([r.status, r.body?.error?.code], [400, "transfer_fee_not_allowed"], JSON.stringify(r.body));
  r = await guiDon(DOI_TAC, p.id);
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.deepEqual([r.body.nhanh, r.body.yeuCau.vi], ["A", ["PHI_DON"]]);
  const v = (await call(ADMIN, "GET", `/api/orders/${p.id}`)).body;
  r = await call(ADMIN, "POST", `/api/orders/${p.id}/quyet-dinh`, { ketQua: "CON_VE", yeuCauId: v.xacNhan.yeuCau.id, updatedAt: v.order.updatedAt, doiPhi: [{ legId, donGia: 30_000, lyDo: "Báo giá riêng" }] });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(await trangThai(p.id), "confirmed");
  assert.deepEqual(await sqlRows(`SELECT fee_calc_source, quantity, unit_price, line_total FROM order_item WHERE order_id = '${p.id}' AND line_kind = 'TRANSFER_FEE'`), [{ fee_calc_source: "DOI_TAY", quantity: 2, unit_price: 30_000, line_total: 60_000 }]);
  console.log("✓ (8) phí đưa đón: Đối tác gửi kèm mức 400; lượt đón chưa chọn ⇒ nhánh A (PHI_DON); Quản trị Còn vé kèm 30.000 ⇒ xác nhận, phí 60.000");
} finally {
  if (phiDaBat) {
    const ap = (await call(ADMIN, "GET", "/api/pricing/phi-don")).body.batDauAp;
    if (ap.ngay !== null) await call(ADMIN, "POST", "/api/pricing/phi-don/bat-dau-ap", { ngay: null, tuLucDaDoc: ap.tuLuc });
  }
  await datCo(false);
  // (9): trả công tắc «Đối tác không nhập nơi đón» về Tắt dù ca hỏng giữa chừng (gửi đúng trạng thái đang có thì máy chủ không ghi).
  await call(SUPER, "POST", URL_ND, { bat: false });
}
