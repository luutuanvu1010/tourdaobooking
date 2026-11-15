// Phí đưa đón trên đơn NHÁP (Đợt C, Task 3; ADR-0147 Đ1–Đ3, ADR-0203; sổ vàng SV-PD-02, SV-PD-28): lập đơn, lưu nháp, sửa số người chiều về, sửa chuyến (đơn nháp)
// ghi dòng phí `order_item` loại `TRANSFER_FEE` và cộng vào tạm tính; `OrderDto.phiDuaDon`; dòng phí không lẫn vào dòng dịch vụ. Chạy CẢ ứng dụng trên SQLite thật
// (tests/audit/harness.mjs). Bảng phí gieo qua chính route của pricing, ngày bắt đầu áp = HÔM NAY (giờ Việt Nam). Tên người dùng GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const ADM = "55555555-5555-4555-8555-555555555555";
const AT = "2026-10-01T00:00:00.000Z";
const BEN = "a941dd7d-faab-4098-9ab9-1df7fa6dd551"; // Bến tàu du lịch Nha Trang (0010) — chưa xếp vùng ⇒ NGOAI_VUNG
const KS_CR = "cccccccc-0000-4000-8000-000000000001"; // khách sạn ở Bãi Dài – Cam Ranh (gieo ở setup)
const KS_BAC = "cccccccc-0000-4000-8000-000000000002"; // khách sạn ở khu vực chưa có mức
const ngayVN = (n: number) => new Date(Date.now() + 7 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);
const HOM_NAY = ngayVN(0);
type W = ReturnType<typeof world>;
type Res = { status: number; text: string; json: any };

const ok = async (p: Promise<Res>, ma: number, ten = ""): Promise<Res> => {
  const r = await p;
  assert.equal(r.status, ma, `${ten} ${r.status}: ${r.text}`);
  return r;
};

/** Bảng phí: CR 100.000 đ/khách, NGOAI_VUNG 20.000 đ/khách; bắt đầu áp `batDau` (null = chưa bật). Khu vực BAC tạo SAU khi bật — chưa có mức. */
async function setup(batDau: string | null = HOM_NAY): Promise<W> {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An Bán", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000006", name: "Quản Trị", perms: ["ADMIN"] });
  w.sqlite.prepare("INSERT INTO catalog_item (code, name, unit, price_adult, price_child, in_sheet, first_seen_at, updated_at) VALUES ('TOUR_LAN', 'Tour lặn biển', 'perPax', 500000, 300000, 1, ?, ?)").run(AT, AT);
  await ok(w.call("POST", "/api/location-zones", { as: ADM, body: { code: "CR", name: "Bãi Dài – Cam Ranh", sortOrder: 5 } }), 201, "vùng CR");
  w.sqlite.prepare("INSERT INTO loc_location (id, code, name, location_type_code, active, zone_code, created_at, updated_at) VALUES (?, 'KS_CR', 'Khách sạn Cam Ranh', 'HOTEL', 1, 'CR', ?, ?)").run(KS_CR, AT, AT);
  for (const [vung, tien] of [["CR", 100_000], ["NGOAI_VUNG", 20_000]] as const) {
    await ok(w.call("POST", "/api/pricing/phi-don", { as: ADM, body: { kind: "PER_PAX", amount: tien, validFrom: "2026-01-01", validTo: null, note: null, dieuKien: [{ khoa: "ZONE", giaTri: vung }] } }), 201, `mức ${vung}`);
  }
  if (batDau !== null) {
    const tuLuc = (await ok(w.call("GET", "/api/pricing/phi-don", { as: ADM }), 200)).json.batDauAp.tuLuc;
    await ok(w.call("POST", "/api/pricing/phi-don/bat-dau-ap", { as: ADM, body: { ngay: batDau, tuLucDaDoc: tuLuc } }), 200, "bật phí");
  }
  // Khu vực thứ hai, chưa có mức (dựng thẳng — route chặn bật phí khi khu vực đang bật thiếu mức chung, ở đây phí đã bật).
  w.sqlite.prepare("INSERT INTO loc_zone (code, name, sort_order, active, created_at, updated_at) VALUES ('BAC', 'Bắc Nha Trang', 6, 1, ?, ?)").run(AT, AT);
  w.sqlite.prepare("INSERT INTO loc_location (id, code, name, location_type_code, active, zone_code, created_at, updated_at) VALUES (?, 'KS_BAC', 'Khách sạn Bắc', 'HOTEL', 1, 'BAC', ?, ?)").run(KS_BAC, AT, AT);
  return w;
}

const D = ngayVN(5);
const OUT = (pickupLocationId: string | null, pickupPlace = "") => ({ direction: "OUT", pickupDate: "", pickupTime: "06:30", pickupLocationId, pickupPlace, dropoffLocationId: BEN, dropoffPlace: "" });
const RET = (dropoffLocationId: string | null, extra: Record<string, unknown> = {}) => ({ direction: "RETURN", pickupDate: ngayVN(6), pickupTime: "16:00", pickupLocationId: BEN, pickupPlace: "", dropoffLocationId, dropoffPlace: dropoffLocationId ? "" : "Nhà riêng", ...extra });
const svc = (pax: Record<string, number>, legs: unknown[], extra: Record<string, unknown> = {}) => ({
  kind: "catalog", pickupChoice: legs.length > 0 ? "DON" : "KHONG_DON", catalogCode: "TOUR_LAN", pax: { adult: 0, child: 0, senior: 0, infant: 0, ...pax },
  catalogPriceSeen: { adult: 500000, child: 300000 }, departDate: D, legs, ...extra,
});
const body = (services: unknown[], extra: Record<string, unknown> = {}) => ({ customerName: "Khách Thử", customerPhone: "0912345678", services, ...extra });
const lap = async (w: W, services: unknown[], extra: Record<string, unknown> = {}) => (await ok(w.call("POST", "/api/orders", { as: SALES, body: body(services, extra) }), 201, "lập đơn")).json.order;
const xem = async (w: W, id: string) => (await ok(w.call("GET", `/api/orders/${id}`, { as: SALES }), 200, "xem đơn")).json.order;
const dongPhi = (w: W, id: string) =>
  w.q("SELECT transfer_leg_id, fee_kind, fee_zone_code, fee_tier_code, fee_return_pax, quantity, unit_price, line_total, service_id, catalog_code, pax_code FROM order_item WHERE order_id = ? AND line_kind = 'TRANSFER_FEE' ORDER BY sort_order", id).map((r: any) => ({ ...r }));
const tongDong = (w: W, id: string) => Number(w.q("SELECT COALESCE(SUM(line_total), 0) AS n FROM order_item WHERE order_id = ?", id)[0].n);
const tien = (w: W, id: string) => ({ ...w.q("SELECT subtotal, discount, total, remaining_amount, deposit_amount FROM orders WHERE id = ?", id)[0] });
/** Thân lưu nháp gửi lại chặng đang lưu (giữ id), đổi số khách theo `pax`. */
const thanLuuLai = (o: any, pax: Record<string, number>, legs?: unknown[]) => body([svc(pax, legs ?? o.services[0].legs.map((l: any) => ({
  id: l.id, direction: l.direction, pickupDate: l.pickupDate, pickupTime: l.pickupTime, pickupLocationId: l.pickupLocationId, pickupPlace: l.pickupLocationId ? "" : (l.pickupPlace ?? ""),
  dropoffLocationId: l.dropoffLocationId, dropoffPlace: l.dropoffLocationId ? "" : (l.dropoffPlace ?? ""), paxOverride: l.paxOverride,
})), { id: o.services[0].id })], { expectedUpdatedAt: o.updatedAt });

test("SV-PD-02 lập đơn nháp: 2 NL + 1 TE đón ở Cam Ranh ⇒ một dòng phí 3 × 100.000 = 300.000, tạm tính tăng đúng, dự kiến; dòng phí không vào dòng dịch vụ", async () => {
  const w = await setup();
  const o = await lap(w, [svc({ adult: 2, child: 1 }, [OUT(KS_CR)])]);
  const leg = o.services[0].legs[0];
  assert.deepEqual(dongPhi(w, o.id), [{
    transfer_leg_id: leg.id, fee_kind: "PER_PAX", fee_zone_code: "CR", fee_tier_code: null, fee_return_pax: null, quantity: 3, unit_price: 100_000, line_total: 300_000,
    service_id: null, catalog_code: null, pax_code: null,
  }]);
  assert.deepEqual(tien(w, o.id), { subtotal: 1_600_000, discount: 0, total: 1_600_000, remaining_amount: 1_600_000, deposit_amount: 0 }, "1.300.000 dịch vụ + 300.000 phí");
  assert.equal(tongDong(w, o.id), 1_600_000, "tạm tính = Σ mọi dòng (khớp trigger 0081 lúc xác nhận)");
  assert.deepEqual(o.services[0].items.map((i: any) => i.lineTotal), [1_000_000, 300_000], "dòng dịch vụ không có dòng phí");
  assert.equal(o.subtotal, 1_600_000);
  assert.deepEqual(o.phiDuaDon.thieu, []);
  assert.equal(o.phiDuaDon.duKien, true);
  assert.deepEqual(o.phiDuaDon.dong.map((d: any) => [d.legId, d.serviceId, d.direction, d.zoneName, d.kind, d.quantity, d.unitPrice, d.lineTotal, d.description]), [
    [leg.id, o.services[0].id, "OUT", "Bãi Dài – Cam Ranh", "PER_PAX", 3, 100_000, 300_000, "Phí đưa đón — chiều đi, Bãi Dài – Cam Ranh"],
  ]);
  const doc = await xem(w, o.id);
  assert.deepEqual(doc.phiDuaDon, o.phiDuaDon, "GET trả cùng phí");
});

test("giảm giá chỉ so với dòng dịch vụ: tổng = tạm tính (dịch vụ + phí) − giảm giá; giảm giá lớn hơn tổng dịch vụ vẫn bị chặn dù có phí", async () => {
  const w = await setup();
  const o = await lap(w, [svc({ adult: 2 }, [OUT(KS_CR)])], { discount: 100_000 });
  assert.deepEqual(tien(w, o.id), { subtotal: 1_200_000, discount: 100_000, total: 1_100_000, remaining_amount: 1_100_000, deposit_amount: 0 });
  const r = await w.call("POST", "/api/orders", { as: SALES, body: body([svc({ adult: 2 }, [OUT(KS_CR)])], { discount: 1_100_000 }) });
  assert.equal(r.status, 400, r.text);
});

test("SV-PD-28 trước ngày bắt đầu áp ⇒ không dòng phí, tiền như hôm nay, phiDuaDon = null", async () => {
  const w = await setup(ngayVN(3));
  const o = await lap(w, [svc({ adult: 2 }, [OUT(KS_CR)])]);
  assert.deepEqual(dongPhi(w, o.id), []);
  assert.equal(tien(w, o.id).subtotal, 1_000_000);
  assert.equal(o.phiDuaDon, null);
});

test("phí chưa bật ⇒ không dòng phí; nhóm không chặng ⇒ không phí", async () => {
  const w = await setup(null);
  const o = await lap(w, [svc({ adult: 2 }, [OUT(KS_CR)])]);
  assert.deepEqual(dongPhi(w, o.id), []);
  assert.equal(o.phiDuaDon, null);
  const w2 = await setup();
  const k = await lap(w2, [svc({ adult: 2 }, [])]);
  assert.deepEqual(dongPhi(w2, k.id), []);
  assert.equal(k.phiDuaDon, null, "phí đang áp mà đơn không chặng: không dòng, không thiếu ⇒ null");
});

test("lưu nháp tính lại: đổi số khách ⇒ đúng một dòng phí mới; chặng gõ tay ⇒ NGOAI_VUNG; khu vực chưa có mức ⇒ thiếu (không phải 0 đồng)", async () => {
  const w = await setup();
  const o = await lap(w, [svc({ adult: 2, child: 1 }, [OUT(KS_CR)])]);
  const r = await ok(w.call("PUT", `/api/orders/${o.id}`, { as: SALES, body: thanLuuLai(o, { adult: 3, child: 1 }) }), 200, "lưu nháp");
  assert.deepEqual(dongPhi(w, o.id).map((d: any) => [d.transfer_leg_id, d.quantity, d.line_total]), [[o.services[0].legs[0].id, 4, 400_000]]);
  assert.equal(tien(w, o.id).subtotal, 1_800_000 + 400_000);
  assert.equal(tongDong(w, o.id), 2_200_000);
  const o2 = r.json.order;
  const r2 = await ok(w.call("PUT", `/api/orders/${o.id}`, { as: SALES, body: thanLuuLai(o2, { adult: 1 }, [OUT(null, "Nhà riêng Dò Tìm"), RET(KS_BAC)]) }), 200, "lưu nháp 2");
  assert.deepEqual(dongPhi(w, o.id).map((d: any) => [d.fee_zone_code, d.quantity, d.line_total]), [["NGOAI_VUNG", 1, 20_000]], "chiều về ở BAC chưa có mức ⇒ không dòng");
  assert.equal(tien(w, o.id).subtotal, 500_000 + 20_000);
  const ret = r2.json.order.services[0].legs.find((l: any) => l.direction === "RETURN");
  assert.deepEqual(r2.json.order.phiDuaDon.thieu, [{ legId: ret.id, zoneName: "Bắc Nha Trang", lyDo: "KHONG_CO_MUC" }]);
  assert.equal(r2.json.order.phiDuaDon.dong.length, 1);
});

test("sửa số người chiều về trên NHÁP (PUT …/legs/:legId) ⇒ phí dự kiến của chiều về đổi theo, tạm tính khớp Σ dòng; mốc cũ ⇒ 409 không đổi gì", async () => {
  const w = await setup();
  const o = await lap(w, [svc({ adult: 3 }, [OUT(KS_CR), RET(KS_CR)])]);
  assert.equal(tien(w, o.id).subtotal, 1_500_000 + 600_000);
  const ret = o.services[0].legs.find((l: any) => l.direction === "RETURN");
  const r = await ok(w.call("PUT", `/api/orders/${o.id}/legs/${ret.id}`, { as: SALES, body: { paxOverride: 1, expectedUpdatedAt: ret.updatedAt } }), 200, "sửa số người về");
  const phi = dongPhi(w, o.id);
  assert.deepEqual(phi.map((d: any) => [d.transfer_leg_id === ret.id ? "RETURN" : "OUT", d.quantity, d.line_total, d.fee_return_pax]).sort(), [["OUT", 3, 300_000, null], ["RETURN", 1, 100_000, 1]]);
  assert.deepEqual(tien(w, o.id), { subtotal: 1_900_000, discount: 0, total: 1_900_000, remaining_amount: 1_900_000, deposit_amount: 0 });
  assert.equal(tongDong(w, o.id), 1_900_000);
  assert.equal(r.json.order.subtotal, 1_900_000);
  assert.equal(r.json.order.phiDuaDon.dong.reduce((t: number, d: any) => t + d.lineTotal, 0), 400_000);
  // mốc chặng cũ ⇒ 409, dòng phí và tiền giữ nguyên
  const cu = await w.call("PUT", `/api/orders/${o.id}/legs/${ret.id}`, { as: SALES, body: { paxOverride: 2, expectedUpdatedAt: ret.updatedAt } });
  assert.equal(cu.status, 409, cu.text);
  assert.equal(tien(w, o.id).subtotal, 1_900_000);
  assert.deepEqual(dongPhi(w, o.id), phi);
});

test("sửa chuyến trên NHÁP (PUT …/trip) đổi nơi đón sang chữ gõ tay ⇒ phí tính lại theo NGOAI_VUNG trong cùng lô; đơn không chặng thêm chặng ⇒ có dòng phí của chặng mới", async () => {
  const w = await setup();
  const o = await lap(w, [svc({ adult: 2 }, [OUT(KS_CR)])]);
  const s = o.services[0];
  await ok(w.call("PUT", `/api/orders/${o.id}/trip`, { as: SALES, body: { expectedUpdatedAt: o.updatedAt, services: [{ id: s.id, departDate: D, pickupTime: "07:10", pickupPlace: "Nhà riêng Dò Tìm" }] } }), 200, "sửa chuyến");
  assert.deepEqual(dongPhi(w, o.id).map((d: any) => [d.fee_zone_code, d.quantity, d.line_total]), [["NGOAI_VUNG", 2, 40_000]]);
  assert.equal(tien(w, o.id).subtotal, 1_000_000 + 40_000);
  assert.equal(tongDong(w, o.id), 1_040_000);

  const k = await lap(w, [svc({ adult: 2 }, [])]);
  assert.deepEqual(dongPhi(w, k.id), []);
  const r = await ok(w.call("PUT", `/api/orders/${k.id}/trip`, { as: SALES, body: { expectedUpdatedAt: k.updatedAt, services: [{ id: k.services[0].id, departDate: D, pickupTime: "07:10", pickupPlace: "Nhà riêng Dò Tìm" }] } }), 200, "thêm chặng qua sửa chuyến");
  const legMoi = r.json.order.services[0].legs;
  assert.equal(legMoi.length, 1, "thân cũ có giờ + nơi đón ⇒ thêm một chặng chiều đi (đường chèn chặng của `updateTrip`)");
  assert.deepEqual(dongPhi(w, k.id).map((d: any) => [d.transfer_leg_id, d.fee_zone_code, d.line_total]), [[legMoi[0].id, "NGOAI_VUNG", 40_000]]);
  assert.equal(tien(w, k.id).subtotal, 1_040_000);
  assert.equal(tongDong(w, k.id), tien(w, k.id).subtotal);
  assert.equal(r.json.order.phiDuaDon.dong[0].legId, legMoi[0].id);
  // mốc đơn cũ ⇒ 409, dòng phí và tiền giữ nguyên (các câu phí đứng trước câu khoá lạc quan, gác cùng mốc): đơn ở Cam Ranh, một lần sửa giờ khởi hành hợp lệ,
  // rồi lệnh mang mốc CŨ đổi nơi đón sang chữ gõ tay (nếu lọt sẽ thành NGOAI_VUNG 40.000).
  const m = await lap(w, [svc({ adult: 2 }, [OUT(KS_CR)])]);
  await ok(w.call("PUT", `/api/orders/${m.id}/trip`, { as: SALES, body: { expectedUpdatedAt: m.updatedAt, services: [{ id: m.services[0].id, departDate: D, departTime: "09:00" }] } }), 200, "sửa giờ khởi hành");
  const phiTruoc = dongPhi(w, m.id);
  assert.deepEqual(phiTruoc.map((d: any) => [d.fee_zone_code, d.line_total]), [["CR", 200_000]]);
  const cu = await w.call("PUT", `/api/orders/${m.id}/trip`, { as: SALES, body: { expectedUpdatedAt: m.updatedAt, services: [{ id: m.services[0].id, departDate: D, pickupTime: "08:00", pickupPlace: "Nhà riêng Dò Tìm" }] } });
  assert.equal(cu.status, 409, cu.text);
  assert.deepEqual(dongPhi(w, m.id), phiTruoc);
  assert.equal(tien(w, m.id).subtotal, 1_200_000);
});

test("đơn ĐÃ XÁC NHẬN: sửa chuyến không đụng dòng phí, không lỗi (trigger 0081 không bị chạm)", async () => {
  const w = await setup();
  const o = await lap(w, [svc({ adult: 2 }, [OUT(KS_CR)])]);
  await ok(w.call("POST", `/api/orders/${o.id}/status`, { as: SALES, body: { status: "confirmed" } }), 200, "xác nhận");
  const truoc = dongPhi(w, o.id);
  assert.equal(truoc.length, 1);
  const c = await xem(w, o.id);
  assert.equal(c.phiDuaDon.duKien, false);
  await ok(w.call("PUT", `/api/orders/${o.id}/trip`, { as: SALES, body: { expectedUpdatedAt: c.updatedAt, services: [{ id: c.services[0].id, departDate: D, pickupTime: "07:10", pickupPlace: "Nhà riêng Dò Tìm" }] } }), 200, "sửa chuyến sau xác nhận");
  assert.deepEqual(dongPhi(w, o.id), truoc);
  assert.equal(tien(w, o.id).subtotal, 1_200_000);
});
