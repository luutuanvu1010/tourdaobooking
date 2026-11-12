// CÔNG NỢ ĐẠI LÝ + HAI PHIẾU (ADR-0182 phần A, accepted 12/11) trên API THẬT (wrangler dev, D1 local tạm): tài khoản Đối tác dùng một lần, mức hoa hồng RIÊNG của hồ sơ đó 10%
// (không đụng mức theo vai dùng chung) → đơn nháp: phiếu 409 câu tiếng Việt → gửi đơn (đã xác nhận) → phiếu = giá đại lý 270.000, QR (nếu công ty đã cài tài khoản) đúng số
// đó, tiền tố DL, không đọc ?soTien → Đối tác gọi QR giá bán lẻ ⇒ «không có QR» → Kế toán, Quản trị, Toàn quyền xem được, Bán hàng 403 → khách trả thẳng công ty
// 300.000 ⇒ còn lại −30.000, không QR → biên nhận khách mẫu đối tác không mang QR / tài khoản.
// D1 chung với kịch bản khác: mã danh mục riêng ZCN1 (cờ «cần xác nhận» tắt, trả về cuối kịch bản); chỉ đọc tài khoản dùng chung.
import assert from "node:assert/strict";
import { ACCOUNTS, call, catalogService, ensureFakeCatalog, gieoTaiKhoanLai, orderInput, session, sql, sqlRows, vnDate } from "./lib.mjs";

await ensureFakeCatalog();
const AT = "'2026-01-01T00:00:00.000Z'";
await sql(`INSERT INTO catalog_item (code,name,unit,price_adult,price_child,price_senior,price_infant,note_child,note_senior,note_infant,sheet_row,in_sheet,first_seen_at,updated_at) VALUES
  ('ZCN1','Dịch vụ công nợ thử','perPax',100000,NULL,NULL,NULL,NULL,NULL,NULL,97,1,${AT},${AT})
  ON CONFLICT(code) DO UPDATE SET name = excluded.name, price_adult = excluded.price_adult, in_sheet = 1`);

const SUPER = await session(ACCOUNTS.superAdmin);
const ACC = await session(ACCOUNTS.accountant);
const ADM = await session(ACCOUNTS.admin);
const SALES = await session(ACCOUNTS.salesA);
const tag = Date.now().toString(36);
const tk = await gieoTaiKhoanLai(`Đối tác công nợ ${tag}`, ["PARTNER"]);
const DT = tk.cookie;
const URL_CD = "/api/cai-dat/xac-nhan-don";
const phieu = (c, id, duoi = "") => call(c, "GET", `/api/orders/${id}/cong-no-dai-ly${duoi}`);

const BEN = tk.partyId;
let r = await call(ACC, "POST", "/api/pricing/hoa-hong", { doiTuong: { loai: "DOI_TAC", partyId: BEN }, phamVi: "ALL", kieu: "RATE", tyLeBp: 1000, tuNgay: vnDate(0) });
assert.equal(r.status, 201, JSON.stringify(r.body));
assert.equal((await call(SUPER, "POST", URL_CD, { pham: "SERVICE", ma: "ZCN1", canXacNhan: false })).status, 200);
try {
  const lap = await call(DT, "POST", "/api/orders", orderInput({
    customerName: `Khách Công Nợ E2E ${tag}`, customerPhone: "0913579136",
    services: [catalogService({ catalogCode: "ZCN1", catalogPriceSeen: { adult: 100000 }, pax: { adult: 3 }, departDate: vnDate(4) })],
  }));
  assert.equal(lap.status, 201, JSON.stringify(lap.body));
  const id = lap.body.order.id;
  r = await phieu(DT, id);
  assert.deepEqual([r.status, r.body.error?.code, r.body.error?.message], [409, "phieu_requires_confirmed", "Phiếu công nợ có sau khi đơn được xác nhận."]);
  assert.equal((await call(DT, "POST", `/api/orders/${id}/gui-don`, {})).status, 200);
  console.log("✓ đơn nháp: phiếu 409 câu tiếng Việt; gửi đơn ⇒ đã xác nhận");

  r = await phieu(DT, id, "?soTien=1000&conLai=1");
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const p = r.body.phieu;
  assert.deepEqual([p.tong, p.daThu, p.conLai], [270000, 0, 270000], JSON.stringify(p));
  assert.deepEqual(Object.keys(p.dong[0]).sort(), ["giaDaiLy", "ten", "thieuMuc"], "dòng phiếu chỉ giá đại lý");
  if (p.qr) {
    assert.equal(p.qr.soTien, 270000, "QR = Công nợ còn lại, không đọc ?soTien");
    assert.match(p.qr.noiDung, /^DL/);
  } else assert.match(p.ghiChuQr, /chưa cài tài khoản/);
  console.log(`✓ phiếu theo giá đại lý 270.000; ${p.qr ? "QR đúng số, tiền tố DL" : "công ty chưa cài tài khoản ⇒ ghi chú thay QR"}`);

  r = await call(DT, "GET", `/api/orders/${id}/qr-thanh-toan`);
  assert.deepEqual([r.status, r.body], [200, { coQr: false }], "Đối tác không còn QR giá bán lẻ");
  for (const [ten, c] of [["Kế toán", ACC], ["Quản trị", ADM], ["Toàn quyền", SUPER]]) assert.equal((await phieu(c, id)).status, 200, ten);
  assert.equal((await phieu(SALES, id)).status, 403, "Bán hàng không xem phiếu");
  console.log("✓ QR giá lẻ của Đối tác: «không có QR»; phiếu: Kế toán, Quản trị, Toàn quyền 200, Bán hàng 403");

  assert.equal((await call(ACC, "POST", `/api/orders/${id}/payments`, { soTien: 300000, hinhThuc: "CASH", nguoiThu: "cong_ty" })).status, 201);
  const du = (await phieu(DT, id)).body.phieu;
  assert.deepEqual([du.daThu, du.conLai, du.qr], [300000, -30000, null], JSON.stringify(du));
  console.log("✓ khách trả thẳng công ty 300.000 ⇒ còn lại −30.000 (Tour Đảo nợ đại lý), không QR");

  const bn = await call(DT, "GET", `/api/orders/${id}/receipt`);
  assert.equal(bn.status, 200, JSON.stringify(bn.body));
  assert.equal(bn.body.receipt.mau, "doi_tac");
  assert.doesNotMatch(JSON.stringify(bn.body), /payload|soTaiKhoan|nganHang|chuTaiKhoan|noiDung/, "biên nhận khách không mang QR / tài khoản");
  console.log("✓ biên nhận khách mẫu đối tác: không QR, không tài khoản");
} finally {
  await call(SUPER, "POST", URL_CD, { pham: "SERVICE", ma: "ZCN1", canXacNhan: false });
}
