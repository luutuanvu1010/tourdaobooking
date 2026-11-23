// Phí đưa đón do MÁY TÍNH từ giá gốc Sheet (ADR-0218 Đ1, Đ2; kế hoạch Đợt 2) trên API THẬT (wrangler dev, D1 local tạm):
//   (1) GG-02: dịch vụ ZE1 có giá gốc 50.000 mỗi khách (gieo thẳng bảng `ctl_service_transfer_price` — Sheet thật không có cột này), khách lẻ, 2 người lớn ⇒ GIA_GOC 100.000, chụp giá gốc; xác nhận giữ nguyên;
//   (2) ô giá gốc xe riêng TRỐNG ⇒ lượt xe riêng không tính được: nháp báo `thieu` O_TRONG, /status 409 `transfer_fee_missing`; «Đổi phí» có lý do ⇒ xác nhận được, dòng DOI_TAY mang lý do và người đổi;
//   (3) chương trình miễn phí «tất cả dịch vụ» tạo TRƯỚC xác nhận ⇒ đơn nháp tính lại lúc xác nhận: CHUONG_TRINH 0 đ, chụp mã + tên; chương trình tạo SAU xác nhận không đổi đơn đã xác nhận;
//   (4) thân cũ có khoá `phiDon` ⇒ 400 `client_outdated` «Nền tảng vừa cập nhật. Tải lại trang rồi thử lại.».
// Ngày xét = HÔM NAY giờ Việt Nam. Ở `finally`: TẮT phí, kết thúc chương trình, ghi dòng giá gốc rỗng mới (bảng chỉ thêm — dòng mới nhất thắng) để D1 chung không còn giá gốc cho ZE1.
import assert from "node:assert/strict";
import { ACCOUNTS, call, catalogService, ensureFakeCatalog, orderInput, session, sql, sqlRows, vnDate } from "./lib.mjs";

const SALES = await session(ACCOUNTS.salesA);
const ADMIN = await session(ACCOUNTS.admin);
await ensureFakeCatalog();

const BEN = "a941dd7d-faab-4098-9ab9-1df7fa6dd551"; // Bến tàu du lịch Nha Trang (migration 0010)
const HOM_NAY = vnDate(0);
const phai = (r, status, nhan) => { assert.equal(r.status, status, `${nhan}: ${r.status} ${JSON.stringify(r.body)}`); return r.body; };
const DON = (extra = {}) => ({ direction: "OUT", pickupDate: "", pickupTime: "06:30", pickupLocationId: null, pickupPlace: "Khách sạn Thử Giá Gốc", dropoffLocationId: BEN, dropoffPlace: "", ...extra });
const lap = async (pax, legs) => phai(await call(SALES, "POST", "/api/orders", orderInput({ services: [catalogService({ pax, legs })] })), 201, "lập đơn").order;
const xacNhan = (id) => call(SALES, "POST", `/api/orders/${id}/status`, { status: "confirmed" });
const dongDb = async (id) => sqlRows(`SELECT fee_calc_source AS nguon, fee_base_price AS goc, fee_tier_discount AS giam, fee_program_name AS tenCt, fee_override_reason AS lyDo, fee_kind AS kind, quantity AS sl, unit_price AS gia, line_total AS tien, fee_source, fee_choice
  FROM order_item WHERE order_id = '${id}' AND line_kind = 'TRANSFER_FEE' ORDER BY sort_order`);
const gieoGiaGoc = async (moiKhach, xeRieng) => {
  const luc = new Date().toISOString();
  await sql(`INSERT INTO ctl_service_transfer_price (id, catalog_code, per_pax_price, private_price, valid_from_at, created_at, updated_at) VALUES ('${crypto.randomUUID()}', 'ZE1', ${moiKhach ?? "NULL"}, ${xeRieng ?? "NULL"}, '${luc}', '${luc}', '${luc}')`);
};
const datBatDau = async (ngay) => {
  const tuLuc = (await call(ADMIN, "GET", "/api/pricing/phi-don")).body.batDauAp.tuLuc;
  phai(await call(ADMIN, "POST", "/api/pricing/phi-don/bat-dau-ap", { ngay, tuLucDaDoc: tuLuc }), 200, `đặt ngày bắt đầu áp ${ngay}`);
};
let maChuongTrinh = null;
try {
  assert.equal((await call(ADMIN, "GET", "/api/pricing/phi-don")).body.batDauAp.ngay, null, "đầu kịch bản: phí đang tắt (kịch bản trước đã dọn)");
  await gieoGiaGoc(50_000, null);
  await datBatDau(HOM_NAY);

  // ---- (1) GG-02
  const a = await lap({ adult: 2 }, [DON()]);
  assert.deepEqual(await dongDb(a.id), [{ nguon: "GIA_GOC", goc: 50_000, giam: 0, tenCt: null, lyDo: null, kind: "PER_PAX", sl: 2, gia: 50_000, tien: 100_000, fee_source: null, fee_choice: null }]);
  assert.equal(a.subtotal, 200_000 + 100_000);
  assert.equal(a.phiDuaDon.dong[0].nguon, "GIA_GOC");
  phai(await xacNhan(a.id), 200, "xác nhận đơn giá gốc");
  assert.deepEqual((await dongDb(a.id)).map((d) => [d.nguon, d.gia, d.tien]), [["GIA_GOC", 50_000, 100_000]]);
  console.log("✓ (1) GG-02: giá gốc 50.000 × 2 = 100.000, chụp giá gốc; xác nhận giữ nguyên");

  // ---- (2) xe riêng, ô giá gốc xe riêng trống
  const x = await lap({ adult: 2 }, [DON({ exclusiveVehicle: true })]);
  assert.deepEqual(await dongDb(x.id), [], "ô trống ⇒ không dòng, không 0 đồng");
  assert.deepEqual(x.phiDuaDon.thieu.map((t) => t.lyDo), ["O_TRONG"]);
  const r409 = await xacNhan(x.id);
  assert.deepEqual([r409.status, r409.body?.error?.code], [409, "transfer_fee_missing"], JSON.stringify(r409.body));
  const l0 = x.services[0].legs[0];
  const giuChang = { id: l0.id, direction: l0.direction, pickupDate: l0.pickupDate, pickupTime: l0.pickupTime, pickupLocationId: l0.pickupLocationId, pickupPlace: l0.pickupPlace ?? "", dropoffLocationId: l0.dropoffLocationId, dropoffPlace: l0.dropoffLocationId ? "" : (l0.dropoffPlace ?? ""), exclusiveVehicle: true };
  phai(await call(SALES, "PUT", `/api/orders/${x.id}`, { ...orderInput({ services: [catalogService({ id: x.services[0].id, pax: { adult: 2 }, legs: [{ ...giuChang, doiPhi: { donGia: 250_000, lyDo: "Thỏa thuận xe riêng với khách" } }] })] }), expectedUpdatedAt: x.updatedAt }), 200, "đổi phí");
  phai(await xacNhan(x.id), 200, "xác nhận sau đổi phí");
  const dx = await dongDb(x.id);
  assert.deepEqual(dx.map((d) => [d.nguon, d.kind, d.sl, d.gia, d.tien, d.lyDo]), [["DOI_TAY", "PER_TRIP", 1, 250_000, 250_000, "Thỏa thuận xe riêng với khách"]]);
  console.log("✓ (2) ô giá gốc xe riêng trống ⇒ O_TRONG, /status 409; «Đổi phí» có lý do ⇒ xác nhận, dòng DOI_TAY mang lý do");

  // ---- (3) chương trình miễn phí
  const truoc = await lap({ adult: 2 }, [DON()]);
  const ct = phai(await call(ADMIN, "POST", "/api/pricing/chuong-trinh-phi-don", { name: "Miễn phí đón thử e2e", scope: "ALL", tripFrom: HOM_NAY, tripTo: vnDate(20), includePrivate: false }), 201, "tạo chương trình");
  maChuongTrinh = ct.chuongTrinh?.id ?? ct.id;
  phai(await xacNhan(truoc.id), 200, "xác nhận sau khi có chương trình");
  assert.deepEqual((await dongDb(truoc.id)).map((d) => [d.nguon, d.gia, d.tien, d.tenCt]), [["CHUONG_TRINH", 0, 0, "Miễn phí đón thử e2e"]], "nháp tính lại lúc xác nhận: 0 đ");
  phai(await call(ADMIN, "POST", `/api/pricing/chuong-trinh-phi-don/${maChuongTrinh}/ket-thuc`, {}), 200, "kết thúc chương trình");
  maChuongTrinh = null;
  assert.deepEqual((await dongDb(truoc.id)).map((d) => [d.nguon, d.tien]), [["CHUONG_TRINH", 0]], "kết thúc chương trình SAU xác nhận không đổi đơn đã xác nhận");
  console.log("✓ (3) chương trình miễn phí: nháp tính lại lúc xác nhận ⇒ 0 đ, chụp tên; kết thúc sau xác nhận không đổi đơn");

  // ---- (4) thân cũ
  const cu = await call(SALES, "POST", "/api/orders", orderInput({ services: [catalogService({ pax: { adult: 2 }, legs: [DON({ phiDon: { loai: "DANH_SACH", soTien: 30_000 } })] })] }));
  assert.deepEqual([cu.status, cu.body?.error?.code, cu.body?.error?.message], [400, "client_outdated", "Nền tảng vừa cập nhật. Tải lại trang rồi thử lại."], JSON.stringify(cu.body));
  console.log("✓ (4) thân cũ có khoá phiDon ⇒ 400 client_outdated");
} finally {
  const thu = async (ten, f) => { try { await f(); } catch (e) { console.error(`dọn «${ten}» lỗi: ${e?.message ?? e}`); } };
  await thu("kết thúc chương trình", async () => { if (maChuongTrinh) await call(ADMIN, "POST", `/api/pricing/chuong-trinh-phi-don/${maChuongTrinh}/ket-thuc`, {}); });
  await thu("tắt ngày bắt đầu áp", async () => {
    const ap = (await call(ADMIN, "GET", "/api/pricing/phi-don")).body.batDauAp;
    if (ap.ngay !== null) phai(await call(ADMIN, "POST", "/api/pricing/phi-don/bat-dau-ap", { ngay: null, tuLucDaDoc: ap.tuLuc }), 200, "tắt phí");
  });
  await thu("xoá giá gốc ZE1", async () => { await new Promise((r) => setTimeout(r, 5)); await gieoGiaGoc(null, null); });
}
console.log("E2E PHI-DON-GIA-GOC OK");
