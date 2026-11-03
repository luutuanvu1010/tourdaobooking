// «KHÁCH ĐẶT CỌC TRƯỚC» (ADR-0159) trên API THẬT (wrangler dev, D1 local tạm): nháp không có dòng sổ; Gửi đơn nhánh B và Còn vé mỗi đường đúng một khoản thu + một dòng giữ hộ trên người lập, không dấu chờ;
// vượt tổng 409; người không giữ quyền Đối tác 403; Hết vé không sinh gì; người xét thấy số, nhật ký ghi người bấm. Đua, thua khoá, /status ở bài khung thử src/modules/billing/dat-coc-route.test.ts.
// D1 chung với kịch bản khác: dùng RIÊNG hai mã danh mục giả ZDC1 (đánh cờ) / ZDC2 và cuối kịch bản trả cờ về. Tên, SĐT là GIẢ.
import assert from "node:assert/strict";
import { ACCOUNTS, call, catalogService, ensureFakeCatalog, gieoTaiKhoanLai, orderInput, session, sql, sqlRows, vnDate } from "./lib.mjs";

await ensureFakeCatalog();
const AT = "'2026-01-01T00:00:00.000Z'";
await sql(`INSERT INTO catalog_item (code,name,unit,price_adult,price_child,price_senior,price_infant,note_child,note_senior,note_infant,sheet_row,in_sheet,first_seen_at,updated_at) VALUES
  ('ZDC1','Dịch vụ đặt cọc thử','perPax',100000,NULL,NULL,NULL,NULL,NULL,NULL,95,1,${AT},${AT}),('ZDC2','Dịch vụ thường đặt cọc','perPax',100000,NULL,NULL,NULL,NULL,NULL,NULL,94,1,${AT},${AT})
  ON CONFLICT(code) DO UPDATE SET name = excluded.name, price_adult = excluded.price_adult, in_sheet = 1`);

const SALES = await session(ACCOUNTS.salesA);
const SUPER = await session(ACCOUNTS.superAdmin);
const tag = Date.now().toString(36);
const DOI_TAC = await gieoTaiKhoanLai(`Đối tác đặt cọc ${tag}`, ["PARTNER"]);
const dt = DOI_TAC.cookie;
const URL_CD = "/api/cai-dat/xac-nhan-don";
const ngay = vnDate(3);
const dichVu = (ma) => catalogService({ catalogCode: ma, catalogPriceSeen: { adult: 100000 }, pax: { adult: 2 }, departDate: ngay });
const than = (ma, coc) => orderInput({ customerName: `Khách Đặt Cọc E2E ${tag}`, customerPhone: "0913571358", services: [dichVu(ma)], ...(coc === undefined ? {} : { declaredDeposit: coc }) });
const lap = async (ma, coc) => {
  const r = await call(dt, "POST", "/api/orders", than(ma, coc));
  assert.equal(r.status, 201, JSON.stringify(r.body));
  return r.body.order;
};
const soKhoan = async (id) => (await sqlRows(`SELECT id, amount, collector_role_code, method_code, stage_code, created_by, collector_party_id FROM bil_payment_receipt WHERE order_id = '${id}'`));
const soDong = async (id) => (await sqlRows(`SELECT kind_code, amount, debtor_party_id FROM bil_debt_line WHERE order_id = '${id}'`));
const soDau = async (id) => (await sqlRows(`SELECT count(*) AS n FROM bil_receipt_recon d JOIN bil_payment_receipt r ON r.id = d.receipt_id WHERE r.order_id = '${id}'`))[0].n;
const dungMot = async (id, soTien, viec) => {
  const k = await soKhoan(id);
  assert.equal(k.length, 1, `${viec}: đúng một khoản thu`);
  assert.equal(k[0].amount, soTien);
  assert.equal(k[0].method_code, "CASH");
  assert.equal(k[0].stage_code, "PREPAID");
  const d = await soDong(id);
  assert.equal(d.length, 1, `${viec}: đúng một dòng giữ hộ`);
  assert.equal(d[0].kind_code, "HELD");
  assert.equal(d[0].debtor_party_id, k[0].collector_party_id, `${viec}: người giữ hộ là người thu`);
  assert.equal(await soDau(id), 0, `${viec}: không dấu chờ đối chiếu`);
};

assert.equal((await call(SUPER, "POST", URL_CD, { pham: "SERVICE", ma: "ZDC1", canXacNhan: true })).status, 200);
assert.equal((await call(SUPER, "POST", URL_CD, { pham: "SERVICE", ma: "ZDC2", canXacNhan: false })).status, 200);
try {
  // Nháp: chỉ là lời khai
  const b = await lap("ZDC2", 50000);
  assert.equal(b.declaredDeposit, 50000);
  assert.equal((await soKhoan(b.id)).length, 0, "nháp không có khoản thu");
  // Vượt tổng: 200.000 là tổng
  let r = await call(dt, "POST", "/api/orders", than("ZDC2", 200001));
  assert.equal(r.status, 409, JSON.stringify(r.body));
  assert.equal(r.body.error.code, "declared_deposit_exceeds_total");
  // Người không giữ quyền Đối tác
  r = await call(SALES, "POST", "/api/orders", than("ZDC2", 1000));
  assert.equal(r.status, 403, JSON.stringify(r.body));
  // Nhánh B
  r = await call(dt, "POST", `/api/orders/${b.id}/gui-don`, {});
  assert.equal(r.status, 200, JSON.stringify(r.body));
  await dungMot(b.id, 50000, "Gửi đơn nhánh B");
  const sauB = await call(dt, "GET", `/api/orders/${b.id}`);
  assert.equal(sauB.body.order.declaredDeposit, 0, "sau xác nhận DTO không đọc cột");
  // Nhánh A + Còn vé do Toàn quyền bấm
  const a = await lap("ZDC1", 70000);
  r = await call(dt, "POST", `/api/orders/${a.id}/gui-don`, {});
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal((await soKhoan(a.id)).length, 0, "đang chờ: chưa có khoản thu");
  let xem = (await call(SUPER, "GET", `/api/orders/${a.id}`)).body;
  assert.equal(xem.order.declaredDeposit, 70000, "người xét thấy số");
  assert.equal(xem.order.customerPhone, "", "SĐT khách vẫn cắt");
  r = await call(SUPER, "POST", `/api/orders/${a.id}/quyet-dinh`, { ketQua: "CON_VE", yeuCauId: xem.xacNhan.yeuCau.id, updatedAt: xem.order.updatedAt });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  await dungMot(a.id, 70000, "Còn vé");
  const nguoiThu = (await soKhoan(a.id))[0];
  assert.equal(nguoiThu.created_by, DOI_TAC.id, "người ghi là người lập");
  assert.equal(nguoiThu.collector_party_id, DOI_TAC.partyId, "người thu là người lập");
  const nk = await sqlRows(`SELECT staff_id FROM audit_log WHERE order_id = '${a.id}' AND action = 'payment_recorded'`);
  assert.equal(nk.length, 1);
  assert.notEqual(nk[0].staff_id, nguoiThu.created_by, "nhật ký ghi người bấm, khác người lập");
  // Hết vé: không sinh gì
  const h = await lap("ZDC1", 30000);
  r = await call(dt, "POST", `/api/orders/${h.id}/gui-don`, {});
  assert.equal(r.status, 201, JSON.stringify(r.body));
  xem = (await call(SUPER, "GET", `/api/orders/${h.id}`)).body;
  r = await call(SUPER, "POST", `/api/orders/${h.id}/quyet-dinh`, { ketQua: "HET_VE", yeuCauId: xem.xacNhan.yeuCau.id, updatedAt: xem.order.updatedAt });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal((await soKhoan(h.id)).length + (await soDong(h.id)).length, 0, "Hết vé: không có dòng sổ");
  // Khai 0: không sinh gì
  const k = await lap("ZDC2", 0);
  r = await call(dt, "POST", `/api/orders/${k.id}/gui-don`, {});
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal((await soKhoan(k.id)).length, 0);
} finally {
  await call(SUPER, "POST", URL_CD, { pham: "SERVICE", ma: "ZDC1", canXacNhan: false });
}
console.log("dat-coc OK");
