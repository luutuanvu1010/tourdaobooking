// Phí đưa đón do VĂN PHÒNG CHỌN trên ĐƠN NHÁP (ADR-0214, Task 3; sổ vàng golden/phi-dua-don-chon.json SV-PC-01, 03, 04, 06, 07, 14) trên API THẬT (wrangler dev, D1 local tạm):
//   (1) SV-PC-14: ngày bắt đầu áp là NGÀY MAI ⇒ lập đơn kèm mức: không dòng phí, tạm tính như hôm nay, `phiDuaDon = null` (mức vẫn được kiểm);
//   (2) SV-PC-01 (kiểu): áp từ HÔM NAY ⇒ chiều đi chọn 30.000 cho 2 người lớn ⇒ 60.000, một dòng «trong danh sách», dự kiến; [Điểm 2] lưu nháp đổi 2 → 3 người lớn,
//       KHÔNG gửi lại mức (khoá vắng = giữ mức đã lưu) ⇒ 30.000 × 3;
//   (3) SV-PC-03 số khác 70.000 × 3; SV-PC-04 số khác 6.000.000 ⇒ 400 «Mức phí tối đa 5.000.000 đ.»; SV-PC-06 xe riêng 500.000 × 1;
//   (4) SV-PC-07 đi 20.000 × 3 + về 20.000 × 1 (chiều về 1 người); sửa số người chiều về trên nháp ⇒ dòng chiều về tính lại theo mức đã lưu;
//   (5) tài khoản Đối tác gửi kèm mức ⇒ 400 `transfer_fee_not_allowed`; không gửi mức ⇒ lập được, lượt đón «chưa chọn».
// Bảng phí theo khu vực KHÔNG cần (ADR-0214: không còn dùng cho đơn; đặt ngày bắt đầu áp không đòi mức chung). Ngày xét luôn là HÔM NAY theo giờ Việt Nam. Ở `finally`: TẮT phí
// (ngày bắt đầu áp = trống) để kịch bản sau trên D1 chung không thấy phí đang áp. Đơn nháp thử để lại (nháp, không ảnh hưởng sổ).
import assert from "node:assert/strict";
import { ACCOUNTS, call, catalogService, ensureFakeCatalog, gieoTaiKhoanLai, orderInput, session, sqlRows, vnDate } from "./lib.mjs";

const SALES = await session(ACCOUNTS.salesA);
const ADMIN = await session(ACCOUNTS.admin);
await ensureFakeCatalog();

const BEN = "a941dd7d-faab-4098-9ab9-1df7fa6dd551"; // Bến tàu du lịch Nha Trang (migration 0010)
const HOM_NAY = vnDate(0);
const NGAY_MAI = vnDate(1);
const DS = (soTien) => ({ donGia: soTien, lyDo: "Văn phòng đổi" });
const SK = (soTien) => ({ donGia: soTien, lyDo: "Văn phòng đổi" });
const DON = (extra = {}) => ({ direction: "OUT", pickupDate: "", pickupTime: "06:30", pickupLocationId: null, pickupPlace: "Khách sạn thử phí", dropoffLocationId: BEN, dropoffPlace: "", ...extra });
const VE = (extra = {}) => ({ direction: "RETURN", pickupDate: vnDate(8), pickupTime: "16:00", pickupLocationId: BEN, pickupPlace: "", dropoffLocationId: null, dropoffPlace: "Khách sạn thử phí", ...extra });

const datBatDau = async (ngay) => {
  const tuLuc = (await call(ADMIN, "GET", "/api/pricing/phi-don")).body.batDauAp.tuLuc;
  const r = await call(ADMIN, "POST", "/api/pricing/phi-don/bat-dau-ap", { ngay, tuLucDaDoc: tuLuc });
  assert.equal(r.status, 200, `đặt ngày bắt đầu áp ${ngay}: ${r.status} ${JSON.stringify(r.body)}`);
};
const dongPhiDb = async (id) => sqlRows(`SELECT i.transfer_leg_id, l.direction, i.fee_calc_source, i.fee_rule_id, i.fee_zone_code, i.fee_kind, i.fee_return_pax, i.quantity, i.unit_price, i.line_total
  FROM order_item i JOIN ord_transfer_leg l ON l.id = i.transfer_leg_id WHERE i.order_id = '${id}' AND i.line_kind = 'TRANSFER_FEE' ORDER BY i.sort_order`);
const tongDongDb = async (id) => (await sqlRows(`SELECT COALESCE(SUM(line_total), 0) AS n FROM order_item WHERE order_id = '${id}'`))[0].n;
const lap = async (pax, legs, ai = SALES) => {
  const r = await call(ai, "POST", "/api/orders", orderInput({ services: [catalogService({ pax, legs })] }));
  assert.equal(r.status, 201, JSON.stringify(r.body));
  return r.body.order;
};

try {
  assert.equal((await call(ADMIN, "GET", "/api/pricing/phi-don")).body.batDauAp.ngay, null, "đầu kịch bản: phí đang tắt (kịch bản trước đã dọn)");

  // ---- (1) SV-PC-14: trước ngày bắt đầu áp
  await datBatDau(NGAY_MAI);
  const truocAp = await lap({ adult: 2 }, [DON({ doiPhi: DS(30_000) })]);
  assert.equal(truocAp.services[0].legs.length, 1, "đơn thử thật sự có chặng đưa đón");
  assert.deepEqual(await dongPhiDb(truocAp.id), [], "trước ngày áp: không dòng phí");
  assert.equal(truocAp.subtotal, 200_000);
  assert.equal(truocAp.phiDuaDon, null);
  const r1 = await call(SALES, "POST", "/api/orders", orderInput({ services: [catalogService({ pax: { adult: 2 }, legs: [DON({ doiPhi: SK(5_000_001) })] })] }));
  assert.equal(r1.status, 400, "trước ngày áp vẫn kiểm mức");
  console.log("✓ (1) SV-PC-14: trước ngày bắt đầu áp — không dòng phí dù có mức, tạm tính như hôm nay, phiDuaDon = null");

  // ---- (2) SV-PC-01 kiểu + [Điểm 2]
  await datBatDau(HOM_NAY);
  const o = await lap({ adult: 2 }, [DON({ doiPhi: DS(30_000) })]);
  const leg = o.services[0].legs[0];
  assert.equal(o.subtotal, 200_000 + 60_000);
  assert.equal(o.total, o.subtotal);
  assert.deepEqual(await dongPhiDb(o.id), [{
    transfer_leg_id: leg.id, direction: "OUT", fee_calc_source: "DOI_TAY", fee_rule_id: null, fee_zone_code: null, fee_kind: "PER_PAX", fee_return_pax: null,
    quantity: 2, unit_price: 30_000, line_total: 60_000,
  }]);
  assert.equal(o.phiDuaDon.duKien, true, "đơn nháp: phí «dự kiến»");
  assert.deepEqual(o.phiDuaDon.thieu, []);
  assert.deepEqual(o.phiDuaDon.dong.map((d) => [d.nguon, d.quantity, d.unitPrice, d.lineTotal]), [["DOI_TAY", 2, 30_000, 60_000]]);
  assert.equal(await tongDongDb(o.id), o.subtotal, "tạm tính = Σ mọi dòng");
  const giuChang = (l) => ({ id: l.id, direction: l.direction, pickupDate: l.pickupDate, pickupTime: l.pickupTime, pickupLocationId: l.pickupLocationId, pickupPlace: l.pickupPlace ?? "",
    dropoffLocationId: l.dropoffLocationId, dropoffPlace: l.dropoffLocationId ? "" : (l.dropoffPlace ?? "") });
  let r = await call(SALES, "PUT", `/api/orders/${o.id}`, { ...orderInput({ services: [catalogService({ id: o.services[0].id, pax: { adult: 3 }, legs: [giuChang(leg)] })] }), expectedUpdatedAt: o.updatedAt });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.order.subtotal, 300_000 + 90_000, "khoá phiDon vắng ⇒ giữ 30.000, tính lại 3 khách");
  assert.equal((await dongPhiDb(o.id)).length, 1, "lưu lại không nhân đôi dòng phí");
  assert.equal(await tongDongDb(o.id), r.body.order.subtotal);
  console.log("✓ (2) SV-PC-01 kiểu: 30.000 × 2 = 60.000, dự kiến; lưu nháp 3 người lớn không gửi lại mức ⇒ 30.000 × 3");

  // ---- (3) SV-PC-03, SV-PC-04, SV-PC-06
  const a = await lap({ adult: 3 }, [DON({ doiPhi: SK(70_000) })]);
  assert.deepEqual((await dongPhiDb(a.id)).map((d) => [d.fee_calc_source, d.quantity, d.unit_price, d.line_total]), [["DOI_TAY", 3, 70_000, 210_000]]);
  assert.equal(a.subtotal, 300_000 + 210_000);
  r = await call(SALES, "POST", "/api/orders", orderInput({ services: [catalogService({ pax: { adult: 2 }, legs: [DON({ doiPhi: SK(5_000_001) })] })] }));
  assert.equal(r.status, 400, JSON.stringify(r.body));
  assert.equal(r.body.error.message, "Đơn giá phí đưa đón phải là số nguyên từ 0 đến 5.000.000 đ.");
  const x = await lap({ adult: 4 }, [DON({ exclusiveVehicle: true, doiPhi: SK(500_000) })]);
  assert.deepEqual((await dongPhiDb(x.id)).map((d) => [d.fee_kind, d.quantity, d.line_total]), [["PER_TRIP", 1, 500_000]]);
  assert.equal(x.subtotal, 400_000 + 500_000);
  console.log("✓ (3) SV-PC-03 số khác 70.000 × 3; SV-PC-04 6.000.000 ⇒ 400 đúng câu; SV-PC-06 xe riêng 500.000 × 1");

  // ---- (4) SV-PC-07 + sửa số người chiều về trên nháp
  const k = await lap({ adult: 3 }, [DON({ doiPhi: DS(20_000) }), VE({ paxOverride: 1, doiPhi: DS(20_000) })]);
  assert.equal(k.subtotal, 300_000 + 60_000 + 20_000);
  assert.deepEqual((await dongPhiDb(k.id)).map((d) => [d.direction, d.quantity, d.line_total, d.fee_return_pax]).sort(), [["OUT", 3, 60_000, null], ["RETURN", 1, 20_000, 1]]);
  const ve = k.services[0].legs.find((l) => l.direction === "RETURN");
  r = await call(SALES, "PUT", `/api/orders/${k.id}/legs/${ve.id}`, { paxOverride: 2, expectedUpdatedAt: ve.updatedAt });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const k2 = (await call(SALES, "GET", `/api/orders/${k.id}`)).body.order;
  assert.equal(k2.subtotal, 300_000 + 60_000 + 40_000, "chiều về 2 người × 20.000 (mức đã lưu)");
  assert.equal(await tongDongDb(k.id), k2.subtotal);
  console.log("✓ (4) SV-PC-07: đi 60.000 + về 20.000; sửa số người chiều về ⇒ tính lại theo mức đã lưu");

  // ---- (5) tài khoản Đối tác
  const DOI_TAC = (await gieoTaiKhoanLai(`Đối tác phí đón ${String(Date.now()).slice(-6).replace(/\d/g, (d) => "ABCDEGHKLM"[d])}`, ["PARTNER"])).cookie;
  r = await call(DOI_TAC, "POST", "/api/orders", orderInput({ services: [catalogService({ pax: { adult: 2 }, legs: [DON({ doiPhi: DS(30_000) })] })] }));
  assert.equal(r.status, 400, JSON.stringify(r.body));
  assert.equal(r.body.error.code, "transfer_fee_not_allowed");
  const p = await lap({ adult: 2 }, [DON()], DOI_TAC);
  assert.deepEqual(await dongPhiDb(p.id), []);
  assert.deepEqual(p.phiDuaDon.thieu.map((t) => [t.direction, t.lyDo]), [["OUT", "O_TRONG"]]);
  console.log("✓ (5) Đối tác gửi mức ⇒ 400 transfer_fee_not_allowed; không gửi ⇒ lập được, lượt đón «chưa chọn»");
} finally {
  try {
    const ap = (await call(ADMIN, "GET", "/api/pricing/phi-don")).body.batDauAp;
    if (ap.ngay !== null) {
      const r = await call(ADMIN, "POST", "/api/pricing/phi-don/bat-dau-ap", { ngay: null, tuLucDaDoc: ap.tuLuc });
      assert.equal(r.status, 200, JSON.stringify(r.body));
    }
    assert.equal((await call(ADMIN, "GET", "/api/pricing/phi-don")).body.batDauAp.ngay, null, "cuối kịch bản: ngày bắt đầu áp = tắt");
  } catch (e) {
    console.error(`dọn «tắt ngày bắt đầu áp» lỗi: ${e?.message ?? e}`);
  }
}
console.log("E2E PHI-DON-DON OK");
