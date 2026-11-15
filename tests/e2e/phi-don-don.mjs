// Phí đưa đón trên ĐƠN NHÁP (Đợt C, Task 3; ADR-0147 Đ1–Đ3, ADR-0203; sổ vàng SV-PD-02, SV-PD-28) trên API THẬT (wrangler dev, D1 local tạm):
//   (1) SV-PD-28: ngày bắt đầu áp là NGÀY MAI ⇒ lập đơn nháp có đón ở khu vực thử: không dòng phí, tạm tính như hôm nay, `phiDuaDon = null`;
//   (2) SV-PD-02 (kiểu): ngày bắt đầu áp = HÔM NAY ⇒ đơn 2 người lớn + 1 trẻ em đón ở khu vực thử (mức 100.000₫/khách): LƯU NHÁP ⇒ tạm tính tăng đúng 300.000₫,
//       một dòng phí, `duKien = true`; đơn của (1) lưu lại sau khi áp ⇒ có dòng phí;
//   (3) sửa số người chiều về trên nháp (PUT …/legs/:legId) ⇒ phí dự kiến của chiều về đổi theo, tạm tính đổi theo.
// Ngày xét luôn là HÔM NAY theo giờ Việt Nam (đơn nháp tính theo hôm nay — không dùng ngày của sổ vàng). Dữ liệu dùng một lần: khu vực + địa điểm mang hậu tố
// theo Date.now(). Ở `finally`: TẮT phí (đặt ngày bắt đầu áp = trống), kết thúc mọi mức đã thêm (bảng chỉ thêm), đưa địa điểm ra khỏi khu vực rồi ngưng khu vực —
// như `phi-don.mjs`, để kịch bản sau trên D1 chung không thấy phí đang áp. Đơn nháp thử để lại (nháp, không ảnh hưởng sổ).
import assert from "node:assert/strict";
import { ACCOUNTS, call, catalogService, ensureFakeCatalog, orderInput, session, sqlRows, vnDate } from "./lib.mjs";

const SALES = await session(ACCOUNTS.salesA);
const ADMIN = await session(ACCOUNTS.admin);
await ensureFakeCatalog();

const S = String(Date.now()).slice(-6);
const ZONE = `E2E_PDD${S}`;
const BEN = "a941dd7d-faab-4098-9ab9-1df7fa6dd551"; // Bến tàu du lịch Nha Trang (migration 0010)
const HOM_NAY = vnDate(0);
const NGAY_MAI = vnDate(1);
const HOM_QUA = vnDate(-1);
const MUC = 100_000; // phí khu vực thử, mỗi khách

const bang = async () => (await call(ADMIN, "GET", "/api/pricing/phi-don?ngay=0001-01-01")).body;
const datBatDau = async (ngay) => {
  const tuLuc = (await call(ADMIN, "GET", "/api/pricing/phi-don")).body.batDauAp.tuLuc;
  const r = await call(ADMIN, "POST", "/api/pricing/phi-don/bat-dau-ap", { ngay, tuLucDaDoc: tuLuc });
  assert.equal(r.status, 200, `đặt ngày bắt đầu áp ${ngay}: ${r.status} ${JSON.stringify(r.body)}`);
};
const dongPhiDb = async (id) => sqlRows(`SELECT transfer_leg_id, fee_zone_code, fee_return_pax, quantity, unit_price, line_total FROM order_item WHERE order_id = '${id}' AND line_kind = 'TRANSFER_FEE' ORDER BY sort_order`);
const tongDongDb = async (id) => (await sqlRows(`SELECT COALESCE(SUM(line_total), 0) AS n FROM order_item WHERE order_id = '${id}'`))[0].n;
const xem = async (id) => (await call(SALES, "GET", `/api/orders/${id}`)).body.order;

const da = { diaDiemId: null, mucDaThem: [], vungDaTao: null };
try {
  // ---- dựng: khu vực thử + địa điểm trong khu vực; mức chung cho khu vực thử và cho mọi khu vực đang bật còn thiếu mức chung (điều kiện để bật phí)
  let r = await call(ADMIN, "POST", "/api/location-zones", { code: ZONE, name: `Khu vực phí đơn ${S}`, sortOrder: 7 });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  da.vungDaTao = ZONE;
  r = await call(ADMIN, "POST", "/api/locations", { code: `PDD_${S}`, name: `Khách sạn phí đơn ${S}`, locationTypeCode: "HOTEL", address: null, sortOrder: 96 });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const ks = r.body.location;
  da.diaDiemId = ks.id;
  r = await call(ADMIN, "PUT", `/api/locations/${ks.id}`, { name: ks.name, locationTypeCode: ks.locationTypeCode, address: ks.address, sortOrder: ks.sortOrder, active: ks.active, zoneCode: ZONE, expectedUpdatedAt: ks.updatedAt });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const b0 = await bang();
  assert.equal(b0.batDauAp.ngay, null, "đầu kịch bản: phí đang tắt (kịch bản trước đã dọn)");
  const coMucChung = (vung) => b0.muc.some((m) => m.dieuKien.vung === vung && m.dieuKien.cap === null && m.dieuKien.dichVu === null && m.dieuKien.nhom === null
    && m.dieuKien.chieu === null && m.dieuKien.xeRieng === false && m.tuNgay <= HOM_NAY && (m.denNgay === null || m.denNgay >= NGAY_MAI));
  for (const v of b0.vung.map((x) => x.code)) {
    if (v !== ZONE && coMucChung(v)) continue;
    r = await call(ADMIN, "POST", "/api/pricing/phi-don", { kind: "PER_PAX", amount: v === ZONE ? MUC : 20_000, validFrom: HOM_QUA, validTo: null, note: "e2e phi-don-don", dieuKien: [{ khoa: "ZONE", giaTri: v }] });
    assert.equal(r.status, 201, `mức chung ${v}: ${r.status} ${JSON.stringify(r.body)}`);
    da.mucDaThem.push(r.body.muc.id);
  }
  const DON = { direction: "OUT", pickupDate: "", pickupTime: "06:30", pickupLocationId: ks.id, pickupPlace: "", dropoffLocationId: BEN, dropoffPlace: "" };
  const VE = { direction: "RETURN", pickupDate: vnDate(8), pickupTime: "16:00", pickupLocationId: BEN, pickupPlace: "", dropoffLocationId: ks.id, dropoffPlace: "" };

  // ---- (1) SV-PD-28: trước ngày bắt đầu áp
  await datBatDau(NGAY_MAI);
  r = await call(SALES, "POST", "/api/orders", orderInput({ services: [catalogService({ pax: { adult: 2 }, legs: [DON] })] }));
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const truocAp = r.body.order;
  assert.equal(truocAp.services[0].legs.length, 1, "đơn thử thật sự có chặng đưa đón");
  assert.deepEqual(await dongPhiDb(truocAp.id), [], "trước ngày áp: không dòng phí");
  assert.equal(truocAp.subtotal, 200_000);
  assert.equal(truocAp.phiDuaDon, null);
  console.log("✓ (1) SV-PD-28: trước ngày bắt đầu áp — không dòng phí, tạm tính như hôm nay, phiDuaDon = null");

  // ---- (2) SV-PD-02 kiểu: áp từ hôm nay, lập rồi LƯU NHÁP
  await datBatDau(HOM_NAY);
  r = await call(SALES, "POST", "/api/orders", orderInput({ services: [catalogService({ pax: { adult: 2, child: 1 }, legs: [DON] })] }));
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const o = r.body.order;
  const dv = o.services[0];
  const thanLuu = (don, legs) => ({
    ...orderInput({ services: [catalogService({ id: don.services[0].id, pax: { adult: 2, child: 1 }, legs })] }), expectedUpdatedAt: don.updatedAt,
  });
  const giuChang = (l) => ({ id: l.id, direction: l.direction, pickupDate: l.pickupDate, pickupTime: l.pickupTime, pickupLocationId: l.pickupLocationId, pickupPlace: "", dropoffLocationId: l.dropoffLocationId, dropoffPlace: "" });
  r = await call(SALES, "PUT", `/api/orders/${o.id}`, thanLuu(o, dv.legs.map(giuChang)));
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const luu = r.body.order;
  assert.equal(luu.subtotal, 250_000 + 3 * MUC, "2 × 100.000 + 1 × 50.000 dịch vụ + 3 khách × 100.000 phí");
  assert.equal(luu.total, luu.subtotal);
  assert.deepEqual(luu.phiDuaDon.dong.map((d) => [d.legId, d.zoneCode, d.direction, d.quantity, d.unitPrice, d.lineTotal]), [[dv.legs[0].id, ZONE, "OUT", 3, MUC, 3 * MUC]]);
  assert.equal(luu.phiDuaDon.duKien, true, "đơn nháp: phí «dự kiến»");
  assert.deepEqual(luu.phiDuaDon.thieu, []);
  assert.deepEqual(luu.services[0].items.map((i) => i.lineTotal), [200_000, 50_000], "dòng phí không lẫn vào dòng dịch vụ");
  assert.equal((await dongPhiDb(o.id)).length, 1, "lưu lại không nhân đôi dòng phí");
  assert.equal(await tongDongDb(o.id), luu.subtotal, "tạm tính = Σ mọi dòng (khớp trigger 0081 lúc xác nhận)");
  // đơn lập TRƯỚC ngày áp, lưu lại sau khi áp ⇒ có dòng phí
  r = await call(SALES, "PUT", `/api/orders/${truocAp.id}`, { ...orderInput({ services: [catalogService({ id: truocAp.services[0].id, pax: { adult: 2 }, legs: truocAp.services[0].legs.map(giuChang) })] }), expectedUpdatedAt: truocAp.updatedAt });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.order.subtotal, 200_000 + 2 * MUC);
  assert.equal((await dongPhiDb(truocAp.id)).length, 1);
  console.log("✓ (2) SV-PD-02 kiểu: lưu nháp ⇒ tạm tính tăng đúng phí, một dòng phí, dự kiến; nháp lập trước ngày áp lưu lại ⇒ có phí");

  // ---- (3) sửa số người chiều về trên nháp ⇒ phí dự kiến đổi
  r = await call(SALES, "POST", "/api/orders", orderInput({ services: [catalogService({ pax: { adult: 3 }, legs: [DON, VE] })] }));
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const k = r.body.order;
  assert.equal(k.subtotal, 300_000 + 6 * MUC, "chiều đi 3 × 100.000 + chiều về 3 × 100.000");
  const ve = k.services[0].legs.find((l) => l.direction === "RETURN");
  r = await call(SALES, "PUT", `/api/orders/${k.id}/legs/${ve.id}`, { paxOverride: 1, expectedUpdatedAt: ve.updatedAt });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const k2 = await xem(k.id);
  assert.equal(k2.subtotal, 300_000 + 4 * MUC, "chiều về còn 1 người");
  assert.deepEqual(k2.phiDuaDon.dong.map((d) => [d.direction, d.quantity, d.lineTotal]).sort(), [["OUT", 3, 3 * MUC], ["RETURN", 1, MUC]]);
  assert.equal(k2.phiDuaDon.duKien, true);
  assert.deepEqual((await dongPhiDb(k.id)).find((d) => d.transfer_leg_id === ve.id)?.fee_return_pax, 1, "bản chụp số người chiều về trên dòng phí");
  assert.equal(await tongDongDb(k.id), k2.subtotal);
  console.log("✓ (3) sửa số người chiều về trên nháp ⇒ phí dự kiến chiều về đổi theo, tạm tính khớp Σ dòng");
} finally {
  // Dọn theo đúng thứ tự: TẮT phí → kết thúc mọi mức đã thêm → đưa địa điểm ra khỏi khu vực → ngưng khu vực thử. Mỗi bước tự bắt lỗi: dọn dở cũng không che lỗi gốc.
  const thu = async (ten, f) => { try { await f(); } catch (e) { console.error(`dọn «${ten}» lỗi: ${e?.message ?? e}`); } };
  await thu("tắt ngày bắt đầu áp", async () => {
    const ap = (await call(ADMIN, "GET", "/api/pricing/phi-don")).body.batDauAp;
    if (ap.ngay !== null) {
      const r = await call(ADMIN, "POST", "/api/pricing/phi-don/bat-dau-ap", { ngay: null, tuLucDaDoc: ap.tuLuc });
      assert.equal(r.status, 200, JSON.stringify(r.body));
    }
    assert.equal((await call(ADMIN, "GET", "/api/pricing/phi-don")).body.batDauAp.ngay, null, "cuối kịch bản: ngày bắt đầu áp = tắt");
  });
  await thu("kết thúc mức", async () => {
    // Chỉ kết thúc mức của KHU VỰC THỬ (Đợt C, Task 5): mức chung đã thêm cho khu vực đang bật còn thiếu để MỞ — phí đã tắt nên không đổi tiền đơn nào; kết thúc nó (ngày cuối = ngày đầu
    // = hôm qua) làm kịch bản phí sau trên CÙNG D1 không thêm lại được mức từ hôm qua (409 prc_overlap — đã gặp khi chạy nối phi-don-don → phi-don-xac-nhan).
    const mo = (await bang()).muc.filter((m) => da.mucDaThem.includes(m.id) && m.denNgay === null && m.dieuKien.vung === ZONE);
    for (const m of mo) await call(ADMIN, "POST", `/api/pricing/phi-don/${m.id}/ket-thuc`, { validTo: m.tuNgay, expectedUpdatedAt: m.updatedAt });
  });
  await thu("đưa địa điểm ra khỏi khu vực", async () => {
    if (!da.diaDiemId) return;
    const l = (await call(ADMIN, "GET", "/api/locations")).body.locations.find((x) => x.id === da.diaDiemId);
    await call(ADMIN, "PUT", `/api/locations/${l.id}`, { name: l.name, locationTypeCode: l.locationTypeCode, address: l.address, sortOrder: l.sortOrder, active: false, zoneCode: null, expectedUpdatedAt: l.updatedAt });
  });
  await thu("ngưng khu vực thử", async () => {
    if (!da.vungDaTao) return;
    const z = (await call(ADMIN, "GET", "/api/locations")).body.zones.find((x) => x.code === da.vungDaTao);
    if (z && z.active) await call(ADMIN, "PUT", `/api/location-zones/${da.vungDaTao}`, { name: z.name, sortOrder: z.sortOrder, active: false, expectedUpdatedAt: z.updatedAt });
  });
}
console.log("E2E PHI-DON-DON OK");
