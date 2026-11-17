// Phí đưa đón LÚC XÁC NHẬN (Đợt C, Task 4; ĐỔI CÓ CHỦ ĐÍCH 16/11 theo ADR-0214, Task 4: mức do VĂN PHÒNG CHỌN, không tra bảng theo khu vực / cấp; sổ vàng golden/phi-dua-don-chon.json
// SV-PC-09, SV-PC-10) trên API THẬT (wrangler dev, D1 local tạm):
//   (1) xác nhận THÀNH CÔNG đơn văn phòng đã chọn mức (`/status`): dòng phí chụp trong CÙNG lô với câu đổi trạng thái, số lượng theo số khách hiện tại; câu chốt `ord_xac_nhan_phi_gac`
//       bị trigger bỏ qua trên D1 thật (RAISE(IGNORE) trong `db.batch`) — đơn đã xác nhận, nhật ký `confirmed` và `order_terms_captured` vẫn ghi, bảng chốt rỗng;
//   (2) [Điểm 4] lưu nháp khi phí CHƯA áp (mức trong thân bị bỏ qua), rồi bật phí ⇒ `/status` 409 «Chọn phí đưa đón cho lượt đón …» (không tự 0 đồng), ở lại nháp;
//   (3) SV-PC-09: lượt đón chưa chọn ⇒ `/status` 409 cùng câu; văn phòng «Gửi kiểm vé» ⇒ 409 cùng câu, không mở yêu cầu;
//   (4) SV-PC-10 [Điểm 3]: Đối tác gửi kèm mức ⇒ 400 `transfer_fee_not_allowed`; «Gửi đơn» ⇒ 201 nhánh A, cờ thiếu phí (lý do PHI_DON); Còn vé thiếu mức ⇒ 409; mức sai ⇒ 400;
//       Quản trị Còn vé kèm 30.000 ⇒ xác nhận, phí 30.000 × 2 = 60.000 trong cùng lô; nhật ký ghi lượt đón, mức, kiểu chọn.
// Ngày xét = HÔM NAY giờ Việt Nam. Dữ liệu dùng một lần: một mã danh mục ZPX1 (cờ «cần xác nhận»), một tài khoản Đối tác. Ở `finally`: TẮT phí.
import assert from "node:assert/strict";
import { ACCOUNTS, call, catalogService, ensureFakeCatalog, gieoTaiKhoanLai, orderInput, session, sql, sqlRows, vnDate } from "./lib.mjs";

const SALES = await session(ACCOUNTS.salesA);
const ADMIN = await session(ACCOUNTS.admin);
const SUPER = await session(ACCOUNTS.superAdmin);
await ensureFakeCatalog();

const S = String(Date.now()).slice(-6);
const CHU = S.replace(/\d/g, (d) => "ABCDEGHKLM"[d]); // tên không được chứa dãy số dài
const BEN = "a941dd7d-faab-4098-9ab9-1df7fa6dd551"; // Bến tàu du lịch Nha Trang (migration 0010)
const HOM_NAY = vnDate(0);
const DS = (soTien) => ({ loai: "DANH_SACH", soTien });

const phai = (r, status, nhan) => {
  assert.equal(r.status, status, `${nhan}: ${r.status} ${JSON.stringify(r.body)}`);
  return r.body;
};
const datBatDau = async (ngay) => {
  const tuLuc = (await call(ADMIN, "GET", "/api/pricing/phi-don")).body.batDauAp.tuLuc;
  phai(await call(ADMIN, "POST", "/api/pricing/phi-don/bat-dau-ap", { ngay, tuLucDaDoc: tuLuc }), 200, `đặt ngày bắt đầu áp ${ngay}`);
};
const dongPhiDb = async (id) => sqlRows(`SELECT fee_source, fee_choice, fee_zone_code, quantity, unit_price, line_total FROM order_item WHERE order_id = '${id}' AND line_kind = 'TRANSFER_FEE' ORDER BY sort_order`);
const tienDb = async (id) => (await sqlRows(`SELECT status, subtotal, total, remaining_amount FROM orders WHERE id = '${id}'`))[0];
const soNhatKy = async (id, action) => (await sqlRows(`SELECT count(*) AS n FROM audit_log WHERE order_id = '${id}' AND action = '${action}'`))[0].n;
const xacNhan = (id) => call(SALES, "POST", `/api/orders/${id}/status`, { status: "confirmed" });
const DON = (phiDon) => ({ direction: "OUT", pickupDate: "", pickupTime: "06:30", pickupLocationId: null, pickupPlace: `Khách sạn Thử ${CHU}`, dropoffLocationId: BEN, dropoffPlace: "", ...(phiDon ? { phiDon } : {}) });
const lap = async (phien, phiDon, ma = "ZE1") => phai(await call(phien, "POST", "/api/orders", orderInput({
  services: [catalogService({ catalogCode: ma, catalogPriceSeen: { adult: 100_000 }, pax: { adult: 2 }, legs: [DON(phiDon)] })],
})), 201, "lập đơn").order;
const cauThieu = (o) => `Chọn phí đưa đón cho lượt đón chiều đi của dịch vụ ${o.services[0].name} trước khi xác nhận.`;
const laThieuPhi = (r, o) => assert.deepEqual([r.status, r.body?.error?.code, r.body?.error?.message], [409, "transfer_fee_missing", cauThieu(o)], JSON.stringify(r.body));

try {
  const b0 = (await call(ADMIN, "GET", "/api/pricing/phi-don")).body;
  assert.equal(b0.batDauAp.ngay, null, "đầu kịch bản: phí đang tắt (kịch bản trước đã dọn)");
  // Mã danh mục riêng có cờ «cần xác nhận» (đi qua Gửi kiểm vé); đặt lại cờ mỗi lần chạy (idempotent).
  await sql(`INSERT INTO catalog_item (code,name,unit,price_adult,in_sheet,first_seen_at,updated_at) VALUES ('ZPX1','Dịch vụ phí xác nhận','perPax',100000,1,'2026-01-01T00:00:00.000Z','2026-01-01T00:00:00.000Z')
    ON CONFLICT(code) DO UPDATE SET in_sheet = 1, price_adult = 100000`);
  phai(await call(SUPER, "POST", "/api/cai-dat/xac-nhan-don", { pham: "SERVICE", ma: "ZPX1", canXacNhan: true }), 200, "cờ cần xác nhận ZPX1");

  // ---- (2) [Điểm 4] nháp lưu khi phí chưa áp (mức bị bỏ qua) — dựng TRƯỚC khi bật phí
  const o2 = await lap(SALES, DS(30_000));
  assert.deepEqual(await dongPhiDb(o2.id), [], "phí chưa áp: không dòng phí dù thân có mức");
  await datBatDau(HOM_NAY);
  laThieuPhi(await xacNhan(o2.id), o2);
  assert.equal((await tienDb(o2.id)).status, "draft");
  console.log("✓ (2) [Điểm 4] lưu nháp trước ngày áp, xác nhận sau ngày áp ⇒ 409 «chưa chọn», không tự 0 đồng");

  // ---- (1) xác nhận thành công đơn văn phòng đã chọn mức
  const o1 = await lap(SALES, DS(100_000));
  assert.deepEqual((await dongPhiDb(o1.id)).map((d) => d.line_total), [200_000], "nháp: phí dự kiến theo mức đã chọn");
  const r1 = phai(await xacNhan(o1.id), 200, "xác nhận có phí");
  assert.deepEqual(await dongPhiDb(o1.id), [{ fee_source: "CHON", fee_choice: "DANH_SACH", fee_zone_code: null, quantity: 2, unit_price: 100_000, line_total: 200_000 }]);
  assert.deepEqual(await tienDb(o1.id), { status: "confirmed", subtotal: 400_000, total: 400_000, remaining_amount: 400_000 });
  assert.equal(await soNhatKy(o1.id, "confirmed"), 1, "nhật ký confirmed ghi (câu chốt đứng sau chuỗi changes())");
  assert.equal(await soNhatKy(o1.id, "order_terms_captured"), 1, "nhật ký bản chụp ghi");
  assert.equal((await sqlRows("SELECT count(*) AS n FROM ord_xac_nhan_phi_gac"))[0].n, 0, "bảng chốt không giữ dòng (RAISE(IGNORE) trên D1 thật)");
  assert.equal(r1.order.phiDuaDon.duKien, false);
  console.log("✓ (1) xác nhận có phí trên D1 thật: mức đã chọn chụp trong cùng lô; câu chốt bị bỏ qua, nhật ký confirmed + bản chụp đủ");

  // ---- (3) SV-PC-09: chưa chọn ⇒ /status 409; Gửi kiểm vé 409, không mở yêu cầu
  const o3 = await lap(SALES);
  laThieuPhi(await xacNhan(o3.id), o3);
  assert.equal((await tienDb(o3.id)).status, "draft");
  assert.equal(await soNhatKy(o3.id, "confirmed"), 0);
  const o4 = await lap(SALES, undefined, "ZPX1");
  laThieuPhi(await call(SALES, "POST", `/api/orders/${o4.id}/gui-xac-nhan`, {}), o4);
  assert.equal((await sqlRows(`SELECT count(*) AS n FROM ord_confirm_request WHERE order_id = '${o4.id}'`))[0].n, 0, "không mở yêu cầu");
  console.log("✓ (3) SV-PC-09: chưa chọn ⇒ /status và Gửi kiểm vé 409 «Chọn phí đưa đón cho lượt đón …», không mở yêu cầu");

  // ---- (4) SV-PC-10: Đối tác Gửi đơn ⇒ nhánh A; văn phòng Còn vé kèm mức ⇒ xác nhận có phí trong cùng lô
  const DT = await gieoTaiKhoanLai(`Đối tác phí xác nhận ${CHU}`, ["PARTNER"]);
  const o7 = await lap(DT.cookie);
  const legId = o7.services[0].legs[0].id;
  const r400 = await call(DT.cookie, "POST", `/api/orders/${o7.id}/gui-don`, { phiDon: [{ legId, muc: DS(30_000) }] });
  assert.deepEqual([r400.status, r400.body?.error?.code], [400, "transfer_fee_not_allowed"], JSON.stringify(r400.body));
  const g = phai(await call(DT.cookie, "POST", `/api/orders/${o7.id}/gui-don`, {}), 201, "gửi đơn chưa chọn phí");
  assert.equal(g.nhanh, "A");
  assert.ok(g.yeuCau.vi.includes("PHI_DON"), JSON.stringify(g.yeuCau));
  assert.equal((await sqlRows(`SELECT transfer_fee_missing AS f FROM ord_confirm_request WHERE order_id = '${o7.id}'`))[0].f, 1, "yêu cầu mang cờ thiếu phí");
  const conVe = async (them = {}) => {
    const v = phai(await call(ADMIN, "GET", `/api/orders/${o7.id}`), 200, "Quản trị xem đơn chờ");
    assert.ok(v.xacNhan.yeuCau.vi.includes("PHI_DON"));
    return call(ADMIN, "POST", `/api/orders/${o7.id}/quyet-dinh`, { ketQua: "CON_VE", yeuCauId: v.xacNhan.yeuCau.id, updatedAt: v.order.updatedAt, ...them });
  };
  laThieuPhi(await conVe(), o7);
  const sai = await conVe({ phiDon: [{ legId, muc: DS(12_345) }] });
  assert.deepEqual([sai.status, sai.body?.error?.message], [400, "Chọn phí đưa đón trong danh sách hoặc gõ số tiền hợp lệ."], JSON.stringify(sai.body));
  assert.equal((await tienDb(o7.id)).status, "draft");
  phai(await conVe({ phiDon: [{ legId, muc: DS(30_000) }] }), 200, "Còn vé kèm mức");
  assert.deepEqual(await dongPhiDb(o7.id), [{ fee_source: "CHON", fee_choice: "DANH_SACH", fee_zone_code: null, quantity: 2, unit_price: 30_000, line_total: 60_000 }]);
  assert.deepEqual(await tienDb(o7.id), { status: "confirmed", subtotal: 260_000, total: 260_000, remaining_amount: 260_000 });
  assert.equal(await soNhatKy(o7.id, "confirmed"), 1);
  const [nk] = await sqlRows(`SELECT detail FROM audit_log WHERE order_id = '${o7.id}' AND action = 'confirmed'`);
  assert.ok(String(nk.detail).includes("phí đưa đón chiều đi · ") && String(nk.detail).includes("chưa chọn → 30.000 ₫ (trong danh sách)"), nk.detail);
  console.log("✓ (4) SV-PC-10: Đối tác gửi mức 400; Gửi đơn ⇒ nhánh A, cờ PHI_DON; Còn vé thiếu mức 409, mức sai 400; Còn vé kèm 30.000 ⇒ xác nhận, phí 60.000 cùng lô, nhật ký ghi mức");
} finally {
  // Dọn: TẮT phí (tự bắt lỗi: dọn dở cũng không che lỗi gốc).
  try {
    const ap = (await call(ADMIN, "GET", "/api/pricing/phi-don")).body.batDauAp;
    if (ap.ngay !== null) phai(await call(ADMIN, "POST", "/api/pricing/phi-don/bat-dau-ap", { ngay: null, tuLucDaDoc: ap.tuLuc }), 200, "tắt phí");
    assert.equal((await call(ADMIN, "GET", "/api/pricing/phi-don")).body.batDauAp.ngay, null, "cuối kịch bản: ngày bắt đầu áp = tắt");
  } catch (e) {
    console.error(`dọn «tắt ngày bắt đầu áp» lỗi: ${e?.message ?? e}`);
  }
}
console.log("E2E PHI-DON-XAC-NHAN OK");
