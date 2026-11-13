// KHOẢN NỘP CỦA ĐẠI LÝ (ADR-0182 phần B, accepted 13/11) trên API THẬT (wrangler dev, D1 local tạm, kho R2 cục bộ BIEN_LAI): tài khoản Đối tác dùng một lần, mức hoa hồng RIÊNG
// của hồ sơ đó 20% (không đụng mức theo vai) → đơn Thanh toán ngay 2 × 500.000 = 1.000.000, giá đại lý 800.000 → gửi đơn (đã xác nhận) → phiếu: trần 800.000, «Khách đã trả bạn 1.000.000 ₫»
// → «Đã chuyển tiền» thiếu ảnh 400, kèm PNG 201 (khoản chờ + khoản thu BOOKER 1.000.000 + ảnh đã lưu) → bấm lần hai 409 → quyết toán «nộp» của Kế toán 409 → Đối tác «Công ty thu» 409
// → Kế toán xác nhận ⇒ phiếu SETTLEMENT 800.000, Công nợ còn lại 0 → xác nhận lần hai 409 → Bán hàng không xem ảnh → nhật ký không chép khoá kho.
// D1 chung với kịch bản khác: mã danh mục riêng ZKN1 (cờ «cần xác nhận» tắt, trả về cuối kịch bản); chỉ đọc tài khoản dùng chung.
import assert from "node:assert/strict";
import { ACCOUNTS, call, catalogService, ensureFakeCatalog, gieoTaiKhoanLai, orderInput, session, sql, sqlRows, vnDate } from "./lib.mjs";

await ensureFakeCatalog();
const AT = "'2026-01-01T00:00:00.000Z'";
await sql(`INSERT INTO catalog_item (code,name,unit,price_adult,price_child,price_senior,price_infant,note_child,note_senior,note_infant,sheet_row,in_sheet,first_seen_at,updated_at) VALUES
  ('ZKN1','Dịch vụ khoản nộp thử','perPax',500000,NULL,NULL,NULL,NULL,NULL,NULL,98,1,${AT},${AT})
  ON CONFLICT(code) DO UPDATE SET name = excluded.name, price_adult = excluded.price_adult, in_sheet = 1`);

const SUPER = await session(ACCOUNTS.superAdmin);
const ACC = await session(ACCOUNTS.accountant);
const SALES = await session(ACCOUNTS.salesA);
const tag = Date.now().toString(36);
const tk = await gieoTaiKhoanLai(`Đối tác khoản nộp ${tag}`, ["PARTNER"]);
const DT = tk.cookie;
const BEN = tk.partyId;
const URL_CD = "/api/cai-dat/xac-nhan-don";
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52, 7, 7, 7]);
const anh = () => ({ noiDung: PNG.toString("base64") });
const phieu = async (c, id) => {
  const r = await call(c, "GET", `/api/orders/${id}/cong-no-dai-ly`);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  return r.body.phieu;
};

let r = await call(ACC, "POST", "/api/pricing/hoa-hong", { doiTuong: { loai: "DOI_TAC", partyId: BEN }, phamVi: "ALL", kieu: "RATE", tyLeBp: 2000, tuNgay: vnDate(0) });
assert.equal(r.status, 201, JSON.stringify(r.body));
assert.equal((await call(SUPER, "POST", URL_CD, { pham: "SERVICE", ma: "ZKN1", canXacNhan: false })).status, 200);
try {
  const lap = await call(DT, "POST", "/api/orders", orderInput({
    customerName: `Khách Khoản Nộp E2E ${tag}`, customerPhone: "0913579137", paymentTerm: "PREPAID",
    services: [catalogService({ catalogCode: "ZKN1", catalogPriceSeen: { adult: 500000 }, pax: { adult: 2 }, departDate: vnDate(4) })],
  }));
  assert.equal(lap.status, 201, JSON.stringify(lap.body));
  const id = lap.body.order.id;
  assert.equal((await call(DT, "POST", `/api/orders/${id}/gui-don`, {})).status, 200);
  const p0 = await phieu(DT, id);
  assert.deepEqual([p0.tong, p0.conLai, p0.nop.tran, p0.nop.khachDaTra, p0.nop.ghiDuoc], [800000, 800000, 800000, 1000000, true], JSON.stringify(p0));
  console.log("✓ gửi đơn ⇒ phiếu: giá đại lý 800.000, trần 800.000, «Khách đã trả bạn 1.000.000 ₫», nút «Đã chuyển tiền»");

  const nop = (than) => call(DT, "POST", `/api/orders/${id}/khoan-nop`, { soTien: 800000, ngayChuyen: vnDate(0), khachDaTra: 1000000, ...than });
  r = await nop({});
  assert.deepEqual([r.status, r.body.error?.code], [400, "bien_lai_required"], JSON.stringify(r.body));
  r = await nop({ bienLai: anh() });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal(r.body.bienLaiChuaTaiXong, undefined, "kho cục bộ nhận ảnh");
  const nopId = r.body.id;
  const thu = await sqlRows(`SELECT amount, collector_role_code AS vai FROM bil_payment_receipt WHERE order_id = '${id}'`);
  assert.deepEqual(thu.map((t) => [t.amount, t.vai]), [[1000000, "BOOKER"]]);
  const dongAnh = (await sqlRows(`SELECT storage_key, stored_at FROM bil_remittance_proof WHERE remittance_id = '${nopId}'`))[0];
  assert.ok(dongAnh && /^nop\/[0-9a-f]{32}$/.test(dongAnh.storage_key) && dongAnh.stored_at, JSON.stringify(dongAnh));
  const p1 = await phieu(DT, id);
  assert.deepEqual([p1.conLai, p1.qr, p1.nop.khoan[0].trangThai], [800000, null, "PENDING"]);
  console.log("✓ thiếu ảnh 400; kèm PNG 201 — khoản chờ + «Khách đã trả bạn» (BOOKER) + ảnh tiền tố nop/; phiếu ẩn QR khi có khoản chờ");

  assert.equal((await nop({ bienLai: anh(), khachDaTra: 0 })).status, 409, "bấm lần hai");
  r = await call(ACC, "POST", "/api/ledger/settlements", { chieu: "nop", partyId: BEN, phanBo: [{ orderId: id, soTien: 800000 }] });
  assert.deepEqual([r.status, r.body.error?.code], [409, "nop_dang_cho"], JSON.stringify(r.body));
  r = await call(DT, "POST", `/api/orders/${id}/payments`, { soTien: 10000, hinhThuc: "CASH", nguoiThu: "cong_ty" });
  assert.deepEqual([r.status, r.body.error?.code], [409, "nop_dang_cho"], JSON.stringify(r.body));
  console.log("✓ bấm lần hai 409; quyết toán «nộp» trùng 409; Đối tác «Công ty thu» khi có khoản chờ 409");

  assert.equal((await call(SALES, "GET", `/api/orders/${id}/khoan-nop/${nopId}/bien-lai`)).status, 403);
  for (const [ten, c] of [["Kế toán", ACC], ["Đối tác chủ khoản", DT]]) {
    const x = await call(c, "GET", `/api/orders/${id}/khoan-nop/${nopId}/bien-lai`);
    assert.equal(x.status, 200, `${ten}: ${x.status}`);
    assert.equal(x.headers.get("content-type"), "image/png", ten);
  }
  r = await call(ACC, "POST", `/api/orders/${id}/khoan-nop/${nopId}/xac-nhan`, {});
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const qt = await sqlRows(`SELECT l.amount FROM bil_debt_line l JOIN bil_posting p ON p.id = l.posting_id WHERE l.order_id = '${id}' AND p.kind_code = 'SETTLEMENT'`);
  assert.deepEqual(qt.map((x) => x.amount), [800000]);
  const p2 = await phieu(DT, id);
  assert.deepEqual([p2.conLai, p2.nop.khoan[0].trangThai], [0, "CONFIRMED"]);
  assert.equal((await call(ACC, "POST", `/api/orders/${id}/khoan-nop/${nopId}/xac-nhan`, {})).status, 409);
  console.log("✓ Kế toán xác nhận ⇒ SETTLEMENT 800.000, Công nợ còn lại 0; xác nhận lần hai 409; Bán hàng không xem ảnh; Kế toán, đại lý chủ khoản xem được (image/png)");

  const nk = await sqlRows(`SELECT count(*) AS n FROM audit_log WHERE detail LIKE '%nop/%' OR detail LIKE '%${dongAnh.storage_key.slice(4, 16)}%'`);
  assert.equal(nk[0].n, 0, "nhật ký không chép khoá kho");
  console.log("✓ nhật ký không chép khoá kho ảnh");
} finally {
  await call(SUPER, "POST", URL_CD, { pham: "SERVICE", ma: "ZKN1", canXacNhan: false });
}
