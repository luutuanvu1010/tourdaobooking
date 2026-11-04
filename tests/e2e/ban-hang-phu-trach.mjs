// BÁN HÀNG PHỤ TRÁCH ĐƠN (ADR-0142, Task 5) trên API THẬT (wrangler dev, D1 local tạm). Khuôn tests/e2e/xac-nhan-don.mjs. Các ca theo thiết kế B.10 (14 ca) + bốn ca của ADR + Review Focus:
//   B.10 1 (mời, Nhận trong ưu tiên)  2 (X từ chối)  3 (đơn cần kiểm, Còn vé + ô trong một lô)  4 (Kế toán, HDV quyết định 403)  6 (đua)  7 (đơn cũ)  8 (sửa chuyến được, KHÔNG huỷ)
//   9 (danh sách mời: mã + tên)  11 (HDV mở đơn chờ 404, nằm ở xac-nhan-don.mjs)  13 (lai)  14 (Rút lại rồi gửi lại)   ADR: Quản trị nhận thay · Bán hàng khác 409 · huỷ 403 · Đối tác thấy tên, handlers 403
//   Review Focus: R1 (X mất quyền)  R2 (huỷ trong ưu tiên)  R4 (tài khoản lai)  lô nguyên khối  Đổi (nháp 409, lời mời khép NGUOI_KHAC)  cài đặt giờ hành chính
// KHÔNG phủ ở đây (cần thời gian trôi, e2e không giả đồng hồ được; phủ bằng bài Node có đồng hồ tiêm — xem báo cáo Task 5): ca 5 đồng hồ, ca 10 hộp thư (Task 6), ca 12 thẻ cảnh báo đủ 15 phút,
// Nhận SAU hạn ưu tiên. Ca 6 «sau hạn» dùng đơn KHÔNG có lời lời mời (trạng thái tương đương: không ai có ưu tiên).
// D1 chung với kịch bản khác: mã danh mục giả ZXN1 (đánh cờ rồi TRẢ cờ về) / ZXN2; tài khoản Bán hàng / Đối tác / lai dùng một lần. Không đổi công ty chủ; chính sách giờ hành chính thêm hai dòng rồi trả về giá trị cũ.
import assert from "node:assert/strict";
import { ACCOUNTS, call, catalogService, ensureFakeCatalog, gieoTaiKhoanLai, orderInput, session, sql, sqlRows, vnDate } from "./lib.mjs";

await ensureFakeCatalog();
const AT = "'2026-01-01T00:00:00.000Z'";
await sql(`INSERT INTO catalog_item (code,name,unit,price_adult,price_child,price_senior,price_infant,note_child,note_senior,note_infant,sheet_row,in_sheet,first_seen_at,updated_at) VALUES
  ('ZXN1','Dịch vụ xác nhận thử','perPax',100000,NULL,NULL,NULL,NULL,NULL,NULL,95,1,${AT},${AT}),('ZXN2','Dịch vụ thường thử','perPax',100000,NULL,NULL,NULL,NULL,NULL,NULL,96,1,${AT},${AT})
  ON CONFLICT(code) DO UPDATE SET name = excluded.name, price_adult = excluded.price_adult, in_sheet = 1`);

const tag = Date.now().toString(36);
const SALES = await session(ACCOUNTS.salesA); // người lập
const SALES_B = await session(ACCOUNTS.salesB); // X — người được mời
const ADMIN = await session(ACCOUNTS.admin);
const ACC = await session(ACCOUNTS.accountant);
const FIELD = await session(ACCOUNTS.field);
const SUPER = await session(ACCOUNTS.superAdmin);
const Y = await gieoTaiKhoanLai(`Bán hàng Y ${tag}`, ["SALES"]); // Bán hàng khác (không được mời)
const X2 = await gieoTaiKhoanLai(`Bán hàng X2 ${tag}`, ["SALES"]); // sẽ MẤT quyền (R1)
const LAI = await gieoTaiKhoanLai(`Lai Bán hàng Đối tác ${tag}`, ["SALES", "PARTNER"]);
const DOI_TAC = await gieoTaiKhoanLai(`Đối tác ${tag}`, ["PARTNER"]);
const idCua = async (phone) => (await sqlRows(`SELECT id FROM staff WHERE phone = '${phone}'`))[0].id;
const ID_B = await idCua(ACCOUNTS.salesB.phone);

const URL_CD = "/api/cai-dat/xac-nhan-don";
const URL_BH = "/api/cai-dat/ban-hang-phu-trach";
const ngay = vnDate(3);
const dichVu = (ma) => catalogService({ catalogCode: ma, catalogPriceSeen: { adult: 100000 }, pax: { adult: 2 }, departDate: ngay });
const lap = async (who, ma, extra = {}) => {
  const r = await call(who, "POST", "/api/orders", orderInput({ customerName: `Khách Bán Hàng E2E ${tag}`, customerPhone: "0913571357", services: [dichVu(ma)], ...extra }));
  assert.equal(r.status, 201, JSON.stringify(r.body));
  return r.body.order;
};
const status = (who, id, s, extra = {}) => call(who, "POST", `/api/orders/${id}/status`, { status: s, ...extra });
const gui = (who, id) => call(who, "POST", `/api/orders/${id}/gui-xac-nhan`, {});
const nhan = (who, id) => call(who, "POST", `/api/orders/${id}/ban-hang/nhan`, {});
const tuChoi = (who, id) => call(who, "POST", `/api/orders/${id}/ban-hang/tu-choi`, {});
const doi = (who, id, staffId) => call(who, "PUT", `/api/orders/${id}/ban-hang`, { staffId });
const loiMoi = async (id) => sqlRows(`SELECT outcome, closed_at FROM dsp_sales_invite WHERE order_id = '${id}' ORDER BY recorded_at, rowid`);
const oMo = async (id) => (await sqlRows(`SELECT count(*) AS n FROM dsp_sales_owner WHERE order_id = '${id}' AND valid_to_at IS NULL`))[0].n;
const chuO = async (id) => (await sqlRows(`SELECT party_id FROM dsp_sales_owner WHERE order_id = '${id}' AND valid_to_at IS NULL`))[0]?.party_id ?? null;
const nhatKy = async (id, action) => (await sqlRows(`SELECT detail FROM audit_log WHERE order_id = '${id}' AND action = '${action}'`)).length;
const trangThai = async (id) => (await sqlRows(`SELECT status FROM orders WHERE id = '${id}'`))[0].status;
const sqlMoc = async (id) => (await sqlRows(`SELECT updated_at AS u FROM orders WHERE id = '${id}'`))[0].u;
const yeuCauMo = async (id) => (await sqlRows(`SELECT id FROM ord_confirm_request WHERE order_id = '${id}' AND decided_at IS NULL`))[0]?.id;
const quyet = async (who, id, ketQua, extra = {}) => call(who, "POST", `/api/orders/${id}/quyet-dinh`, { ketQua, yeuCauId: await yeuCauMo(id), updatedAt: await sqlMoc(id), ...extra });
const partyCua = async (staffId) => (await sqlRows(`SELECT party_id FROM staff WHERE id = '${staffId}'`))[0].party_id;
let r;

const dauChinhSach = (await call(SUPER, "GET", URL_BH)).body;
assert.ok(dauChinhSach.phutUuTien >= 1, JSON.stringify(dauChinhSach));
assert.equal((await call(SUPER, "POST", URL_CD, { pham: "SERVICE", ma: "ZXN1", canXacNhan: true })).status, 200);
assert.equal((await call(SUPER, "POST", URL_CD, { pham: "SERVICE", ma: "ZXN2", canXacNhan: false })).status, 200);
assert.equal((await call(SUPER, "POST", URL_CD, { tuXacNhanNoiBo: false })).status, 200);

try {
  // ---- B.10 ca 9: danh sách mời chỉ mã + tên; mời người không hợp lệ → 400 -----------------------------------------------------------------------------------------------
  r = await call(DOI_TAC.cookie, "GET", "/api/dispatch/ban-hang-moi");
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.ok(r.body.banHang.some((x) => x.staffId === ID_B), "có Bán hàng B");
  for (const x of r.body.banHang) assert.deepEqual(Object.keys(x).sort(), ["name", "staffId"], "chỉ mã + tên");
  assert.ok(!r.body.banHang.some((x) => x.staffId === LAI.id), "tài khoản lai không có trong danh sách mời");
  assert.ok(!r.body.banHang.some((x) => x.staffId === DOI_TAC.id), "Đối tác không có trong danh sách mời");
  r = await call(SALES, "POST", "/api/orders", orderInput({ customerName: "Khách Mời Sai", customerPhone: "0913571357", services: [dichVu("ZXN2")], banHangMoiStaffId: LAI.id }));
  assert.deepEqual([r.status, r.body.error?.code], [400, "invalid_invitee"], `mời tài khoản lai: ${JSON.stringify(r.body)}`);
  r = await call(SALES, "POST", "/api/orders", orderInput({ customerName: "Khách Mời Sai", customerPhone: "0913571357", services: [dichVu("ZXN2")], banHangMoiStaffId: "khong-phai-ma" }));
  assert.deepEqual([r.status, r.body.error?.code], [400, "invalid_invitee"], JSON.stringify(r.body));
  console.log("✓ ca 9: danh sách mời chỉ mã + tên, không lai / Đối tác; mời sai → 400 invalid_invitee");

  // ---- ca 1 + ADR (Bán hàng khác 409) + ca 8 (sửa chuyến được, KHÔNG huỷ) ----------------------------------------------------------------------------------------------
  const o1 = await lap(SALES, "ZXN2", { banHangMoiStaffId: ID_B });
  r = await call(SALES, "GET", `/api/orders/${o1.id}`);
  assert.deepEqual(r.body.banHangMoi?.staffId, ID_B, "người lập thấy người mình mời trên nháp");
  assert.equal((await loiMoi(o1.id)).length, 0, "nháp chưa có dòng lời mời");
  assert.equal((await status(SALES, o1.id, "confirmed")).status, 200);
  assert.equal(((await loiMoi(o1.id)).length), 1, "lời mời có từ lúc ghi nhận");
  assert.equal(await nhatKy(o1.id, "sales_invited"), 1);
  r = await nhan(Y.cookie, o1.id);
  assert.deepEqual([r.status, r.body.error?.code], [409, "dang_cho_nguoi_khac"], `Bán hàng khác trong ưu tiên: ${JSON.stringify(r.body)}`);
  assert.equal(await oMo(o1.id), 0);
  r = await call(Y.cookie, "GET", `/api/dispatch/ban-hang?orderIds=${o1.id}`);
  assert.equal(r.body[o1.id].loiMoi.staffId, ID_B);
  assert.ok(r.body[o1.id].loiMoi.conPhut >= 1 && r.body[o1.id].loiMoi.conPhut <= 15, JSON.stringify(r.body));
  r = await nhan(SALES_B, o1.id);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(await oMo(o1.id), 1);
  assert.equal((await loiMoi(o1.id))[0].outcome, "NHAN");
  assert.equal(await nhatKy(o1.id, "sales_owner_claimed"), 1);
  r = await call(SALES_B, "GET", `/api/orders/${o1.id}`);
  assert.deepEqual([r.body.laBanHangPhuTrach, r.body.canModify], [true, false]);
  const dv = r.body.order.services[0];
  r = await call(SALES_B, "PUT", `/api/orders/${o1.id}/trip`, { expectedUpdatedAt: r.body.order.updatedAt, services: [{ id: dv.id, departDate: dv.departDate, departTime: "", pickupTime: "07:30", pickupPlace: "Khách sạn Mới", checkinDate: "", checkinTime: "", checkinPlace: "", note: "" }] });
  assert.equal(r.status, 200, `Bán hàng phụ trách sửa chuyến: ${JSON.stringify(r.body)}`);
  r = await status(SALES_B, o1.id, "cancelled", { lyDo: "KHACH_DOI_Y" });
  assert.equal(r.status, 403, `Bán hàng phụ trách chưa huỷ được: ${JSON.stringify(r.body)}`);
  assert.equal(await trangThai(o1.id), "confirmed");
  assert.equal((await nhan(Y.cookie, o1.id)).status, 409, "đã có người → 409");
  console.log("✓ ca 1 + 8 + ADR: Bán hàng khác 409; X nhận 200; lời mời NHAN; sửa chuyến 200, huỷ 403");

  // ---- ca 2: X từ chối → Y nhận ngay --------------------------------------------------------------------------------------------------------------------------------------
  const o2 = await lap(SALES, "ZXN2", { banHangMoiStaffId: ID_B });
  assert.equal((await status(SALES, o2.id, "confirmed")).status, 200);
  assert.equal((await tuChoi(Y.cookie, o2.id)).status, 409, "chỉ X từ chối được");
  assert.equal((await tuChoi(SALES_B, o2.id)).status, 200);
  assert.equal((await loiMoi(o2.id))[0].outcome, "TU_CHOI");
  assert.equal(await nhatKy(o2.id, "sales_invite_refused"), 1);
  assert.equal((await nhan(Y.cookie, o2.id)).status, 200, "sau khi X từ chối, Bán hàng khác nhận ngay");
  assert.equal(await chuO(o2.id), await partyCua(Y.id));
  console.log("✓ ca 2: X từ chối → TU_CHOI, Y nhận 200");

  // ---- ADR: Quản trị nhận thay trong ưu tiên ----------------------------------------------------------------------------------------------------------------------------
  const o3 = await lap(SALES, "ZXN2", { banHangMoiStaffId: ID_B });
  assert.equal((await status(SALES, o3.id, "confirmed")).status, 200);
  r = await nhan(ADMIN, o3.id);
  assert.equal(r.status, 200, `Quản trị nhận thay: ${JSON.stringify(r.body)}`);
  assert.equal((await loiMoi(o3.id))[0].outcome, "NGUOI_KHAC");
  console.log("✓ ADR: Quản trị nhận thay trong 15 phút của X → 200, lời mời NGUOI_KHAC");

  // ---- ca 3 + ca 4: đơn cần kiểm, Còn vé mở ô trong cùng lô --------------------------------------------------------------------------------------------------------------
  const o4 = await lap(SALES, "ZXN1", { banHangMoiStaffId: ID_B });
  assert.equal((await gui(SALES, o4.id)).status, 201);
  assert.equal((await loiMoi(o4.id)).length, 1, "lời mời mở lúc gửi xác nhận");
  for (const [ten, who] of [["Kế toán", ACC], ["HDV", FIELD]]) assert.equal((await quyet(who, o4.id, "CON_VE")).status, 403, `${ten} quyết định 403`);
  r = await quyet(Y.cookie, o4.id, "CON_VE");
  assert.deepEqual([r.status, r.body.error?.code], [409, "dang_cho_nguoi_khac"], `Bán hàng khác chen trong ưu tiên: ${JSON.stringify(r.body)}`);
  r = await call(SALES, "POST", `/api/orders/${o4.id}/quyet-dinh`, { ketQua: "CON_VE", yeuCauId: await yeuCauMo(o4.id), updatedAt: await sqlMoc(o4.id) });
  assert.equal(r.status, 403, "người lập không tự quyết (công tắc tắt)");
  assert.equal(await trangThai(o4.id), "draft");
  assert.equal(await oMo(o4.id), 0);
  r = await nhan(Y.cookie, o4.id);
  assert.deepEqual([r.status, r.body.error?.code], [409, "can_quyet_dinh"], `đơn cần kiểm không Nhận ở đây: ${JSON.stringify(r.body)}`);
  r = await quyet(SALES_B, o4.id, "CON_VE");
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.deepEqual([await trangThai(o4.id), await oMo(o4.id), (await loiMoi(o4.id))[0].outcome], ["confirmed", 1, "NHAN"], "xác nhận + ô + khép lời mời cùng một lô");
  console.log("✓ ca 3 + 4: Kế toán, HDV 403; Bán hàng khác 409; X Còn vé → xác nhận + ô + NHAN");

  // ---- ca 14: Rút lại rồi gửi lại -------------------------------------------------------------------------------------------------------------------------------------------
  const o5 = await lap(SALES, "ZXN1", { banHangMoiStaffId: ID_B });
  assert.equal((await gui(SALES, o5.id)).status, 201);
  assert.equal((await call(SALES, "POST", `/api/orders/${o5.id}/rut-xac-nhan`, {})).status, 200);
  assert.equal((await loiMoi(o5.id))[0].outcome, "RUT_LAI");
  assert.equal((await gui(SALES, o5.id)).status, 201);
  const ds5 = await loiMoi(o5.id);
  assert.deepEqual(ds5.map((x) => x.outcome), ["RUT_LAI", null], "gửi lại là lời mời MỚI, không bao giờ hai lời mời mở");
  console.log("✓ ca 14: Rút lại khép RUT_LAI; gửi lại mở lời mời mới");

  // ---- Hết vé khép HUY_DON; R2 huỷ trong ưu tiên -------------------------------------------------------------------------------------------------------------------------
  assert.equal((await quyet(SALES_B, o5.id, "HET_VE")).status, 200);
  assert.deepEqual((await loiMoi(o5.id)).map((x) => x.outcome), ["RUT_LAI", "HUY_DON"]);
  assert.equal(await oMo(o5.id), 0, "Hết vé không mở ô");
  const o6 = await lap(SALES, "ZXN2", { banHangMoiStaffId: ID_B });
  assert.equal((await status(SALES, o6.id, "confirmed")).status, 200);
  assert.equal((await status(ADMIN, o6.id, "cancelled", { lyDo: "KHACH_DOI_Y" })).status, 200);
  assert.equal((await loiMoi(o6.id))[0].outcome, "HUY_DON");
  r = await nhan(SALES_B, o6.id);
  assert.deepEqual([r.status, r.body.error?.code], [409, "cancelled"], JSON.stringify(r.body));
  console.log("✓ R2: huỷ trong ưu tiên khép HUY_DON, X Nhận → 409 Đơn đã huỷ");

  // ---- R1: X mất quyền ------------------------------------------------------------------------------------------------------------------------------------------------------
  const o7 = await lap(SALES, "ZXN2", { banHangMoiStaffId: X2.id });
  assert.equal((await status(SALES, o7.id, "confirmed")).status, 200);
  assert.equal((await loiMoi(o7.id)).length, 1);
  await sql(`UPDATE stf_permission SET valid_to_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE staff_id = '${X2.id}' AND permission_type_code = 'SALES'`);
  r = await nhan(X2.cookie, o7.id);
  assert.equal(r.status, 403, `X mất quyền Bán hàng bấm Nhận: ${JSON.stringify(r.body)}`);
  assert.equal((await nhan(Y.cookie, o7.id)).status, 200, "người khác nhận được ngay khi X mất quyền");
  const x3 = await gieoTaiKhoanLai(`Bán hàng X3 ${tag}`, ["SALES"]);
  const o8 = await lap(SALES, "ZXN2", { banHangMoiStaffId: x3.id });
  await sql(`UPDATE stf_permission SET valid_to_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE staff_id = '${x3.id}' AND permission_type_code = 'SALES'`);
  assert.equal((await status(SALES, o8.id, "confirmed")).status, 200);
  assert.equal((await loiMoi(o8.id)).length, 0, "lúc ghi nhận X đã mất quyền ⇒ không có dòng lời mời");
  console.log("✓ R1: X mất quyền → Nhận 403, Y nhận ngay; mất quyền trước lúc ghi nhận → không mời");

  // ---- R4: tài khoản lai ------------------------------------------------------------------------------------------------------------------------------------------------------
  const o9 = await lap(SALES, "ZXN1"); // không lời mời: trong ưu tiên của người khác thì lai cũng bị chặn như mọi Bán hàng khác (409); bài Node phủ ca «lời mời đã hết ưu tiên»
  assert.equal((await gui(SALES, o9.id)).status, 201);
  r = await quyet(LAI.cookie, o9.id, "CON_VE");
  assert.equal(r.status, 200, `lai bấm Còn vé (ADR-0136 cho phép): ${JSON.stringify(r.body)}`);
  assert.deepEqual([await trangThai(o9.id), await oMo(o9.id)], ["confirmed", 0], "đơn xác nhận, KHÔNG mở ô cho người bấm");
  const o10 = await lap(SALES, "ZXN2");
  assert.equal((await status(SALES, o10.id, "confirmed")).status, 200);
  r = await nhan(LAI.cookie, o10.id);
  assert.equal(r.status, 403, `lai bấm Nhận: ${JSON.stringify(r.body)}`);
  console.log("✓ R4: lai Còn vé → xác nhận nhưng không ô; Nhận 403");

  // ---- lô nguyên khối: ô đã có người thì Còn vé hỏng cả lô -----------------------------------------------------------------------------------------------------------------
  const o11 = await lap(SALES, "ZXN1");
  assert.equal((await gui(SALES, o11.id)).status, 201);
  const yc11 = await yeuCauMo(o11.id);
  const luc = new Date().toISOString();
  await sql(`INSERT INTO dsp_sales_owner (id, order_id, party_id, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES ('so-e2e-${tag}', '${o11.id}', '${await partyCua(Y.id)}', '${luc}', '${luc}', NULL, '${luc}', NULL)`);
  r = await quyet(SALES_B, o11.id, "CON_VE");
  assert.equal(r.status, 409, `ô đã có người: ${JSON.stringify(r.body)}`);
  assert.deepEqual([await trangThai(o11.id), await yeuCauMo(o11.id), await nhatKy(o11.id, "confirmed")], ["draft", yc11, 0], "đơn vẫn nháp, yêu cầu vẫn mở, không có nhật ký confirmed");
  console.log("✓ lô nguyên khối: ô đã có người → Còn vé 409, không ghi gì");

  // ---- ca 7 + Đổi ---------------------------------------------------------------------------------------------------------------------------------------------------------------------
  const o12 = await lap(SALES, "ZXN2");
  assert.equal((await status(SALES, o12.id, "confirmed")).status, 200);
  await sql(`UPDATE orders SET confirmed_at = '2020-01-01T00:00:00.000Z' WHERE id = '${o12.id}'`);
  r = await nhan(SALES_B, o12.id);
  assert.deepEqual([r.status, r.body.error?.code], [409, "don_cu"], JSON.stringify(r.body));
  r = await doi(ADMIN, o12.id, ID_B);
  assert.equal(r.status, 200, `Quản trị đổi trên đơn cũ: ${JSON.stringify(r.body)}`);
  assert.equal(await chuO(o12.id), await partyCua(ID_B));
  assert.equal((await doi(SALES_B, o12.id, null)).status, 403, "Bán hàng không tự trả / đổi ô");
  assert.equal((await doi(ADMIN, o12.id, ID_B)).status, 409, "không đổi gì → 409");
  assert.equal((await doi(ADMIN, o12.id, null)).status, 200, "bỏ trống");
  assert.equal(await oMo(o12.id), 0);
  const nhap = await lap(SALES, "ZXN2");
  assert.equal((await doi(ADMIN, nhap.id, ID_B)).status, 404, "nháp riêng tư của người khác ⇒ 404 (ADR-0135 Đ2)");
  const cho = await lap(SALES, "ZXN1");
  assert.equal((await gui(SALES, cho.id)).status, 201);
  r = await doi(ADMIN, cho.id, ID_B);
  assert.deepEqual([r.status, r.body.error?.code], [409, "don_nhap"], `đơn nháp đang chờ xác nhận (Quản trị thấy được): ${JSON.stringify(r.body)}`);
  assert.equal((await call(SALES, "POST", `/api/orders/${cho.id}/rut-xac-nhan`, {})).status, 200);
  const o13 = await lap(SALES, "ZXN2", { banHangMoiStaffId: ID_B });
  assert.equal((await status(SALES, o13.id, "confirmed")).status, 200);
  assert.equal((await doi(ADMIN, o13.id, Y.id)).status, 200);
  assert.equal((await loiMoi(o13.id))[0].outcome, "NGUOI_KHAC", "Đổi khép lời mời đang mở");
  console.log("✓ ca 7 + Đổi: đơn cũ Nhận 409 don_cu nhưng Quản trị Đổi được; nháp 409 don_nhap; Đổi khép lời mời NGUOI_KHAC");

  // ---- ca 6: hai người Nhận cùng lúc (đơn không lời mời — trạng thái tương đương «sau hạn»), và X cùng Quản trị trong ưu tiên --------------------------------------------------
  const o14 = await lap(SALES, "ZXN2");
  assert.equal((await status(SALES, o14.id, "confirmed")).status, 200);
  const kq = await Promise.all([SALES_B, Y.cookie].map((who) => nhan(who, o14.id)));
  assert.deepEqual(kq.map((x) => x.status).sort(), [200, 409], `đua: ${JSON.stringify(kq.map((x) => x.body))}`);
  assert.equal(await oMo(o14.id), 1, "không bao giờ hai dòng mở");
  const o15 = await lap(SALES, "ZXN2", { banHangMoiStaffId: ID_B });
  assert.equal((await status(SALES, o15.id, "confirmed")).status, 200);
  const kq2 = await Promise.all([SALES_B, ADMIN].map((who) => nhan(who, o15.id)));
  assert.deepEqual(kq2.map((x) => x.status).sort(), [200, 409], `X và Quản trị: ${JSON.stringify(kq2.map((x) => x.body))}`);
  assert.equal(await oMo(o15.id), 1);
  assert.equal((await loiMoi(o15.id)).filter((x) => x.closed_at === null).length, 0, "lời mời khép đúng một lần");
  console.log("✓ ca 6: hai bên Nhận cùng lúc → đúng một 200, một 409, một dòng mở");

  // ---- ADR: Đối tác thấy tên, handlers 403 --------------------------------------------------------------------------------------------------------------------------------------
  const o16 = await lap(DOI_TAC.cookie, "ZXN2", { banHangMoiStaffId: ID_B });
  r = await call(DOI_TAC.cookie, "POST", `/api/orders/${o16.id}/gui-don`, {});
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal((await loiMoi(o16.id)).length, 1, "đơn của Đối tác nhánh B: lời mời mở");
  assert.equal((await nhan(SALES_B, o16.id)).status, 200);
  r = await call(DOI_TAC.cookie, "GET", `/api/dispatch/ban-hang?orderIds=${o16.id}`);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.deepEqual(r.body[o16.id], { banHang: { name: r.body[o16.id].banHang.name }, loiMoi: null, laBanHangPhuTrach: false }, "Đối tác chỉ nhận TÊN");
  assert.ok(!JSON.stringify(r.body).includes(ID_B), "không lộ mã tài khoản");
  r = await call(DOI_TAC.cookie, "GET", `/api/dispatch/ban-hang?orderIds=${o1.id}`);
  assert.deepEqual(r.body, {}, "đơn của người khác không trả");
  assert.equal((await call(DOI_TAC.cookie, "GET", `/api/dispatch/handlers?orderIds=${o16.id}`)).status, 403, "danh sách người phụ trách (HDV) vẫn 403");
  console.log("✓ ADR: Đối tác thấy TÊN Bán hàng phụ trách trên đơn của mình; handlers 403");

  // ---- thẻ cảnh báo + cài đặt giờ hành chính ------------------------------------------------------------------------------------------------------------------------------------------
  for (const [ten, who, ma] of [["Bán hàng", SALES, 200], ["Kế toán", ACC, 200], ["Quản trị", ADMIN, 200], ["HDV", FIELD, 403]]) {
    r = await call(who, "GET", "/api/orders/chua-co-ban-hang");
    assert.equal(r.status, ma, `${ten}: ${JSON.stringify(r.body)}`);
    if (ma === 200) assert.ok(Array.isArray(r.body.don) && typeof r.body.soDonChoXacNhanAn === "number");
  }
  assert.equal((await call(ADMIN, "GET", URL_BH)).status, 403, "chỉ Toàn quyền xem cài đặt");
  const bh = (await call(SUPER, "GET", URL_BH)).body;
  const truoc = (await sqlRows("SELECT count(*) AS n FROM dsp_sales_policy"))[0].n;
  assert.equal((await call(SUPER, "POST", URL_BH, { phutUuTien: bh.phutUuTien, tuPhut: bh.tuPhut, denPhut: bh.denPhut })).status, 200);
  assert.equal((await sqlRows("SELECT count(*) AS n FROM dsp_sales_policy"))[0].n, truoc, "gửi đúng giá trị đang hiệu lực → không ghi");
  assert.equal((await call(SUPER, "POST", URL_BH, { phutUuTien: 0, tuPhut: 420, denPhut: 1020 })).status, 400);
  assert.equal((await call(SUPER, "POST", URL_BH, { phutUuTien: 20, tuPhut: 420, denPhut: 1020 })).body.phutUuTien, 20);
  assert.equal((await call(SUPER, "POST", URL_BH, { phutUuTien: bh.phutUuTien, tuPhut: bh.tuPhut, denPhut: bh.denPhut })).body.phutUuTien, bh.phutUuTien);
  assert.equal((await nhatKyHeThong()).length >= 2, true, "đổi cài đặt có nhật ký không gắn đơn");
  console.log("✓ thẻ cảnh báo theo vai; cài đặt giờ hành chính: 403 / 200 không ghi / 400 / đổi và trả lại");
} finally {
  // Trả D1 chung về như lúc đầu: bỏ cờ ZXN1; chính sách giờ hành chính đã trả về giá trị cũ trong kịch bản (bảng chỉ-thêm).
  await call(SUPER, "POST", URL_CD, { pham: "SERVICE", ma: "ZXN1", canXacNhan: false });
}
async function nhatKyHeThong() {
  return sqlRows("SELECT id FROM audit_log WHERE action = 'sales_policy_changed' AND order_id IS NULL");
}
console.log("E2E BÁN HÀNG PHỤ TRÁCH OK");
