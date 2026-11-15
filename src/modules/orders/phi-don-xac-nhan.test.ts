// Phí đưa đón LÚC XÁC NHẬN (Đợt C, Task 4; ADR-0147 Đ1–Đ3, ADR-0203; trang ghép 2026-10-28 §3): bốn cửa xác nhận (`/status`, Còn vé, Gửi xác nhận, Gửi đơn) TÍNH LẠI phí theo bảng
// ngày xác nhận rồi chụp trong CÙNG lô với câu đổi trạng thái; thiếu mức ⇒ 409 `transfer_fee_missing` (Gửi đơn: nhánh A, cờ «thiếu phí»); lô thua ⇒ tiền và dòng của nháp y như trước.
// Chạy CẢ ứng dụng trên SQLite thật (tests/audit/harness.mjs). Bảng phí gieo qua chính route của pricing. Tên người dùng GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
import { cauThieuPhiDon } from "./phi-don-don.ts";

const SALES = "11111111-1111-4111-8111-111111111111";
const ADM = "55555555-5555-4555-8555-555555555555";
const SUP = "77777777-7777-4777-8777-777777777777";
const DT = "88888888-8888-4888-8888-888888888801"; // Đối tác có hồ sơ mang vai được hưởng ⇒ bên đặt = chính hồ sơ này
const BEN_DT = `pty-${DT}`;
const AT = "2026-10-01T00:00:00.000Z";
const BEN = "a941dd7d-faab-4098-9ab9-1df7fa6dd551"; // Bến tàu du lịch Nha Trang (0010) — chưa xếp vùng ⇒ NGOAI_VUNG
const KS_CR = "cccccccc-0000-4000-8000-000000000001";
const KS_BAC = "cccccccc-0000-4000-8000-000000000002";
const ngayVN = (n: number) => new Date(Date.now() + 7 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);
const HOM_NAY = ngayVN(0);
const D = ngayVN(5);
type W = ReturnType<typeof world>;
type Res = { status: number; text: string; json: any };

const ok = async (p: Promise<Res>, ma: number, ten = ""): Promise<Res> => {
  const r = await p;
  assert.equal(r.status, ma, `${ten} ${r.status}: ${r.text}`);
  return r;
};

/**
 * Bảng phí: CR `cr` đ/khách, NGOAI_VUNG 20.000 đ/khách; bắt đầu áp `batDau` (null = chưa bật). `bac` = thêm khu vực BAC chưa có mức (dựng thẳng, SAU khi bật — route chặn bật
 * khi khu vực đang bật thiếu mức chung). `coDichVuCanKiem` = TOUR_LAN mang cờ «cần xác nhận» (đi qua Gửi xác nhận / Còn vé).
 */
async function setup(o: { batDau?: string | null; bac?: boolean; cr?: number; coDichVuCanKiem?: boolean; tuyChon?: Record<string, unknown> } = {}): Promise<W> {
  const w = world(o.tuyChon ?? {});
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An Bán", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000006", name: "Quản Trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: SUP, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  seedStaff(w.sqlite, { id: DT, phone: "0900000021", name: "Đối Tác Hưởng", perms: ["PARTNER"] });
  w.sqlite.prepare("INSERT INTO catalog_item (code, name, unit, price_adult, price_child, in_sheet, first_seen_at, updated_at) VALUES ('TOUR_LAN', 'Tour lặn biển', 'perPax', 500000, 300000, 1, ?, ?)").run(AT, AT);
  if (o.coDichVuCanKiem) {
    const luc = new Date(Date.now() - 1000).toISOString();
    w.sqlite.prepare("INSERT INTO ord_service_confirm_flag (id, scope, code, required, valid_from_at, created_at, updated_at) VALUES (?, 'SERVICE', 'TOUR_LAN', 1, ?, ?, ?)").run(crypto.randomUUID(), luc, luc, luc);
  }
  await ok(w.call("POST", "/api/location-zones", { as: ADM, body: { code: "CR", name: "Bãi Dài – Cam Ranh", sortOrder: 5 } }), 201, "vùng CR");
  w.sqlite.prepare("INSERT INTO loc_location (id, code, name, location_type_code, active, zone_code, created_at, updated_at) VALUES (?, 'KS_CR', 'Khách sạn Cam Ranh', 'HOTEL', 1, 'CR', ?, ?)").run(KS_CR, AT, AT);
  for (const [vung, tien] of [["CR", o.cr ?? 100_000], ["NGOAI_VUNG", 20_000]] as const) {
    await ok(w.call("POST", "/api/pricing/phi-don", { as: ADM, body: { kind: "PER_PAX", amount: tien, validFrom: "2026-01-01", validTo: null, note: null, dieuKien: [{ khoa: "ZONE", giaTri: vung }] } }), 201, `mức ${vung}`);
  }
  const batDau = o.batDau === undefined ? HOM_NAY : o.batDau;
  if (batDau !== null) await batPhi(w, batDau);
  if (o.bac) {
    w.sqlite.prepare("INSERT INTO loc_zone (code, name, sort_order, active, created_at, updated_at) VALUES ('BAC', 'Bắc Nha Trang', 6, 1, ?, ?)").run(AT, AT);
    w.sqlite.prepare("INSERT INTO loc_location (id, code, name, location_type_code, active, zone_code, created_at, updated_at) VALUES (?, 'KS_BAC', 'Khách sạn Bắc', 'HOTEL', 1, 'BAC', ?, ?)").run(KS_BAC, AT, AT);
  }
  return w;
}
/** Bật (ngày) hoặc tắt (null) phí đưa đón qua route của pricing. */
async function batPhi(w: W, ngay: string | null) {
  const tuLuc = (await ok(w.call("GET", "/api/pricing/phi-don", { as: ADM }), 200)).json.batDauAp.tuLuc;
  await ok(w.call("POST", "/api/pricing/phi-don/bat-dau-ap", { as: ADM, body: { ngay, tuLucDaDoc: tuLuc } }), 200, ngay === null ? "tắt phí" : "bật phí");
}
/** «Đổi mức phí» chung của một khu vực từ HÔM NAY (mức cũ kết thúc hôm qua). */
async function doiMuc(w: W, vung: string, tien: number) {
  const cu = (await ok(w.call("GET", "/api/pricing/phi-don", { as: ADM }), 200)).json.muc.find((m: any) => m.dieuKien.vung === vung && m.denNgay === null);
  await ok(w.call("POST", "/api/pricing/phi-don", { as: ADM, body: { kind: "PER_PAX", amount: tien, validFrom: HOM_NAY, validTo: null, note: null, dieuKien: [{ khoa: "ZONE", giaTri: vung }], thayCho: { id: cu.id, expectedUpdatedAt: cu.updatedAt } } }), 201, `đổi mức ${vung}`);
}

const OUT = (pickupLocationId: string | null, pickupTime = "06:30") => ({ direction: "OUT", pickupDate: "", pickupTime, pickupLocationId, pickupPlace: "", dropoffLocationId: BEN, dropoffPlace: "" });
const svc = (pax: Record<string, number>, legs: unknown[]) => ({
  kind: "catalog", pickupChoice: legs.length > 0 ? "DON" : "KHONG_DON", catalogCode: "TOUR_LAN", pax: { adult: 0, child: 0, senior: 0, infant: 0, ...pax },
  catalogPriceSeen: { adult: 500000, child: 300000 }, departDate: D, legs,
});
const lap = async (w: W, legs: unknown[], extra: Record<string, unknown> = {}, as = SALES) =>
  (await ok(w.call("POST", "/api/orders", { as, body: { customerName: "Khách Thử", customerPhone: "0912345678", services: [svc({ adult: 2 }, legs)], ...extra } }), 201, "lập đơn")).json.order;
const xacNhan = (w: W, id: string) => w.call("POST", `/api/orders/${id}/status`, { as: SALES, body: { status: "confirmed" } });
const dongPhi = (w: W, id: string) =>
  w.q("SELECT fee_zone_code, quantity, unit_price, line_total FROM order_item WHERE order_id = ? AND line_kind = 'TRANSFER_FEE' ORDER BY sort_order", id).map((r: any) => ({ ...r }));
const moiDong = (w: W, id: string) => w.q("SELECT * FROM order_item WHERE order_id = ? ORDER BY sort_order, id", id).map((r: any) => ({ ...r }));
const tien = (w: W, id: string) => ({ ...w.q("SELECT subtotal, discount, total, remaining_amount FROM orders WHERE id = ?", id)[0] });
const trangThai = (w: W, id: string) => w.q("SELECT status FROM orders WHERE id = ?", id)[0].status as string;
const soNhatKy = (w: W, id: string) => Number(w.q("SELECT count(*) AS n FROM audit_log WHERE order_id = ?", id)[0].n);
const soXacNhan = (w: W, id: string) => Number(w.q("SELECT count(*) AS n FROM audit_log WHERE order_id = ? AND action = 'confirmed'", id)[0].n);
const soChot = (w: W) => Number(w.q("SELECT count(*) AS n FROM ord_xac_nhan_phi_gac")[0].n);
const CAU_BAC = "Quản trị cần đặt phí đưa đón cho khu vực Bắc Nha Trang trước khi xác nhận.";
const thieuPhi = (r: Res) => {
  assert.equal(r.status, 409, r.text);
  assert.deepEqual([r.json.error.code, r.json.error.message], ["transfer_fee_missing", CAU_BAC]);
};

test("[Review Focus 1] lưu nháp khi phí CHƯA áp, rồi đặt ngày áp = hôm nay, xác nhận ⇒ dòng phí được chụp trong lô (trigger 0081 không ném), tiền theo tổng mới, nhật ký confirmed có", async () => {
  const w = await setup({ batDau: null });
  const o = await lap(w, [OUT(KS_CR)]);
  assert.deepEqual(dongPhi(w, o.id), []);
  assert.equal(tien(w, o.id).subtotal, 1_000_000);
  await batPhi(w, HOM_NAY);
  const r = await ok(xacNhan(w, o.id), 200, "xác nhận");
  assert.equal(trangThai(w, o.id), "confirmed");
  assert.deepEqual(dongPhi(w, o.id), [{ fee_zone_code: "CR", quantity: 2, unit_price: 100_000, line_total: 200_000 }]);
  assert.deepEqual(tien(w, o.id), { subtotal: 1_200_000, discount: 0, total: 1_200_000, remaining_amount: 1_200_000 });
  assert.equal(soXacNhan(w, o.id), 1, "nhật ký confirmed vẫn ghi (câu chốt không chen vào chuỗi changes())");
  assert.equal(soChot(w), 0, "bảng chốt không bao giờ giữ dòng");
  assert.equal(r.json.order.phiDuaDon.duKien, false);
  assert.equal(r.json.order.phiDuaDon.dong.length, 1);
});

test("[Review Focus 1] không tin dòng phí của nháp: mức đổi sau khi lưu ⇒ xác nhận chụp mức MỚI; phí bị tắt sau khi lưu ⇒ dòng cũ bị bỏ, tạm tính về tổng dịch vụ", async () => {
  const w = await setup();
  const a = await lap(w, [OUT(KS_CR)]);
  const b = await lap(w, [OUT(KS_CR)]);
  assert.deepEqual(dongPhi(w, a.id).map((d: any) => d.line_total), [200_000]);
  await doiMuc(w, "CR", 150_000);
  await ok(xacNhan(w, a.id), 200, "xác nhận a");
  assert.deepEqual(dongPhi(w, a.id), [{ fee_zone_code: "CR", quantity: 2, unit_price: 150_000, line_total: 300_000 }]);
  assert.deepEqual(tien(w, a.id), { subtotal: 1_300_000, discount: 0, total: 1_300_000, remaining_amount: 1_300_000 });
  await batPhi(w, null);
  await ok(xacNhan(w, b.id), 200, "xác nhận b");
  assert.deepEqual(dongPhi(w, b.id), [], "phí đã tắt: dòng dự kiến của nháp bị bỏ");
  assert.deepEqual(tien(w, b.id), { subtotal: 1_000_000, discount: 0, total: 1_000_000, remaining_amount: 1_000_000 });
});

test("đơn KHÔNG có phí (phí chưa áp, không dòng cũ) ⇒ lô xác nhận như hôm nay: không câu phí, không câu chốt", async () => {
  const w = await setup({ batDau: null });
  const o = await lap(w, [OUT(KS_CR)]);
  let lo: { sql: string }[] = [];
  w.chenTruocLo((s: { sql: string }[]) => s.some((x) => /status = 'confirmed'/.test(x.sql)), (s: { sql: string }[]) => { lo = s; });
  await ok(xacNhan(w, o.id), 200);
  assert.ok(lo.length > 0);
  assert.equal(lo.filter((x) => /ord_xac_nhan_phi_gac|TRANSFER_FEE/.test(x.sql)).length, 0);
  assert.match(lo[1]!.sql, /status = 'confirmed'/, "câu đổi trạng thái vẫn là câu thứ hai");
});

test("thiếu mức ⇒ /status 409 transfer_fee_missing (câu nêu tên khu vực), đơn ở lại nháp, không nhật ký confirmed (thứ tự cổng: bài canh cuối tệp — lập đơn có lượt luôn cần mốc nên không dựng được ca «không mốc»)", async () => {
  const w = await setup({ bac: true });
  const o = await lap(w, [OUT(KS_BAC)]);
  const truoc = soNhatKy(w, o.id);
  thieuPhi(await xacNhan(w, o.id));
  assert.equal(trangThai(w, o.id), "draft");
  assert.equal(soNhatKy(w, o.id), truoc);
});

test("[Review Focus 2] lô thua vì mốc tối thiểu (chặng bị dời sát giờ giữa lúc kiểm và lúc ghi) ⇒ CẢ lô lui: tạm tính, tổng, dòng order_item của nháp y như trước; không nhật ký mới", async () => {
  const w = await setup();
  const o = await lap(w, [OUT(KS_CR)]);
  await doiMuc(w, "CR", 150_000); // phí tính lại sẽ KHÁC dòng đã lưu ⇒ câu phí có ghi thì nhìn thấy ngay
  const truoc = { tien: tien(w, o.id), dong: moiDong(w, o.id), nhatKy: soNhatKy(w, o.id) };
  const sat = new Date(Date.now() + 7 * 3600e3 + 60 * 60_000).toISOString();
  // Khớp theo câu ĐỔI TRẠNG THÁI (không theo câu chốt) để bài vẫn chạy khi câu chốt bị gỡ — đột biến «bỏ câu chốt» phải làm bài này đỏ.
  w.chenTruocLo((s: { sql: string }[]) => s.some((x) => /status = 'confirmed'/.test(x.sql)), () => {
    w.sqlite.prepare("UPDATE ord_transfer_leg SET pickup_date = ?, pickup_time = ? WHERE order_id = ?").run(sat.slice(0, 10), sat.slice(11, 16), o.id);
  });
  const r = await xacNhan(w, o.id);
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "short_notice_required", "lô thua đọc lại lý do như hôm nay (chanDoanXacNhan)");
  assert.equal(trangThai(w, o.id), "draft");
  assert.deepEqual(tien(w, o.id), truoc.tien);
  assert.deepEqual(moiDong(w, o.id), truoc.dong);
  assert.equal(soNhatKy(w, o.id), truoc.nhatKy);
  assert.equal(soChot(w), 0);
});

test("[Review Focus 3] Trả sau: lưu nháp khi phí chưa áp (vừa đủ hạn mức), phí đẩy tổng vượt ⇒ 409 vuot_han_muc, ở lại nháp; nâng hạn mức ⇒ xác nhận với tổng gồm phí", async () => {
  const w = await setup({ batDau: null });
  assert.equal((await w.call("POST", "/api/tra-sau/han-muc", { as: SUP, body: { partyId: BEN_DT, hanMuc: 1_000_000, gioTra: 168, gioAnHan: 0, lyDo: "thử" } })).status, 201);
  const o = await lap(w, [OUT(KS_CR)], { bookerPartyId: BEN_DT, paymentTerm: "CREDIT" });
  await batPhi(w, HOM_NAY);
  const r = await xacNhan(w, o.id);
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "vuot_han_muc");
  assert.equal(trangThai(w, o.id), "draft");
  assert.deepEqual(dongPhi(w, o.id), []);
  assert.equal((await w.call("POST", "/api/tra-sau/han-muc", { as: SUP, body: { partyId: BEN_DT, hanMuc: 1_200_000, gioTra: 168, gioAnHan: 0, lyDo: "thử" } })).status, 201);
  await ok(xacNhan(w, o.id), 200, "vừa đủ hạn mức mới");
  assert.equal(tien(w, o.id).total, 1_200_000);
});

test("[Review Focus 3] lời khai đặt cọc so với tổng MỚI: lưu khi có phí (cọc 1.100.000 ≤ 1.200.000), tắt phí rồi Gửi đơn ⇒ 409 declared_deposit_exceeds_total, ở lại nháp", async () => {
  const w = await setup();
  const o = await lap(w, [OUT(KS_CR)], { declaredDeposit: 1_100_000 }, DT);
  assert.equal(tien(w, o.id).total, 1_200_000);
  await batPhi(w, null);
  const r = await w.call("POST", `/api/orders/${o.id}/gui-don`, { as: DT, body: {} });
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "declared_deposit_exceeds_total");
  assert.equal(trangThai(w, o.id), "draft");
});

test("[Review Focus 4] SV-PD-29: giảm giá không trừ vào phí — dịch vụ 1.000.000 + phí 140.000 − giảm giá 100.000 ⇒ tổng 1.040.000; giảm giá tối đa 1.000.000 (= tổng dòng dịch vụ)", async () => {
  const w = await setup({ batDau: null, cr: 70_000 });
  const o = await lap(w, [OUT(KS_CR)], { discount: 100_000 });
  const toiDa = await lap(w, [OUT(KS_CR)], { discount: 1_000_000 });
  assert.equal((await w.call("POST", "/api/orders", { as: SALES, body: { customerName: "Khách Thử", customerPhone: "0912345678", services: [svc({ adult: 2 }, [OUT(KS_CR)])], discount: 1_000_001 } })).status, 400);
  await batPhi(w, HOM_NAY);
  await ok(xacNhan(w, o.id), 200);
  assert.deepEqual(tien(w, o.id), { subtotal: 1_140_000, discount: 100_000, total: 1_040_000, remaining_amount: 1_040_000 });
  assert.deepEqual(dongPhi(w, o.id), [{ fee_zone_code: "CR", quantity: 2, unit_price: 70_000, line_total: 140_000 }]);
  await ok(xacNhan(w, toiDa.id), 200);
  assert.deepEqual(tien(w, toiDa.id), { subtotal: 1_140_000, discount: 1_000_000, total: 140_000, remaining_amount: 140_000 });
});

test("Gửi xác nhận (văn phòng) thiếu mức ⇒ 409 cùng câu, không mở yêu cầu; đủ mức ⇒ 201", async () => {
  const w = await setup({ bac: true, coDichVuCanKiem: true });
  const o = await lap(w, [OUT(KS_BAC)]);
  thieuPhi(await w.call("POST", `/api/orders/${o.id}/gui-xac-nhan`, { as: SALES, body: {} }));
  assert.equal(w.q("SELECT count(*) AS n FROM ord_confirm_request WHERE order_id = ?", o.id)[0].n, 0);
  const k = await lap(w, [OUT(KS_CR)]);
  await ok(w.call("POST", `/api/orders/${k.id}/gui-xac-nhan`, { as: SALES, body: {} }), 201);
});

test("Gửi đơn của Đối tác thiếu mức ⇒ 201 nhánh A, yêu cầu mang cờ thiếu phí (lý do PHI_DON); Còn vé khi còn thiếu ⇒ 409; Quản trị đặt mức ⇒ Còn vé xác nhận có phí", async () => {
  const w = await setup({ bac: true });
  const o = await lap(w, [OUT(KS_BAC)], {}, DT);
  const g = await ok(w.call("POST", `/api/orders/${o.id}/gui-don`, { as: DT, body: {} }), 201, "gửi đơn");
  assert.equal(g.json.nhanh, "A");
  assert.deepEqual(g.json.yeuCau.vi, ["PHI_DON"]);
  assert.equal(w.q("SELECT transfer_fee_missing AS f FROM ord_confirm_request WHERE order_id = ?", o.id)[0].f, 1);
  const cho = (await ok(w.call("GET", "/api/orders/cho-xac-nhan", { as: ADM }), 200)).json.don.find((d: any) => d.orderId === o.id);
  assert.deepEqual(cho.vi, ["PHI_DON"]);
  const xem = async () => (await ok(w.call("GET", `/api/orders/${o.id}`, { as: ADM }), 200)).json;
  const x = await xem();
  assert.deepEqual(x.xacNhan.yeuCau.vi, ["PHI_DON"]);
  const conVe = (v: any) => w.call("POST", `/api/orders/${o.id}/quyet-dinh`, { as: ADM, body: { ketQua: "CON_VE", yeuCauId: v.xacNhan.yeuCau.id, updatedAt: v.order.updatedAt } });
  thieuPhi(await conVe(x));
  assert.equal(trangThai(w, o.id), "draft");
  await ok(w.call("POST", "/api/pricing/phi-don", { as: ADM, body: { kind: "PER_PAX", amount: 50_000, validFrom: "2026-01-01", validTo: null, note: null, dieuKien: [{ khoa: "ZONE", giaTri: "BAC" }] } }), 201, "mức BAC");
  await ok(conVe(await xem()), 200, "Còn vé");
  assert.equal(trangThai(w, o.id), "confirmed");
  assert.deepEqual(dongPhi(w, o.id), [{ fee_zone_code: "BAC", quantity: 2, unit_price: 50_000, line_total: 100_000 }]);
  assert.equal(tien(w, o.id).subtotal, 1_100_000);
  assert.equal(soXacNhan(w, o.id), 1);
});

test("Còn vé: đơn thiếu phí có lượt dưới hạn chốt ⇒ báo THIẾU PHÍ trước (không đẩy người xét đi đặt gấp cho đơn chưa xác nhận được)", async () => {
  const w = await setup({ bac: true });
  const o = await lap(w, [OUT(KS_BAC)], {}, DT);
  await ok(w.call("POST", `/api/orders/${o.id}/gui-don`, { as: DT, body: {} }), 201, "gửi đơn");
  const sat = new Date(Date.now() + 7 * 3600e3 + 60 * 60_000).toISOString();
  w.sqlite.prepare("UPDATE ord_transfer_leg SET pickup_date = ?, pickup_time = ? WHERE order_id = ?").run(sat.slice(0, 10), sat.slice(11, 16), o.id);
  const x = (await ok(w.call("GET", `/api/orders/${o.id}`, { as: ADM }), 200)).json;
  thieuPhi(await w.call("POST", `/api/orders/${o.id}/quyet-dinh`, { as: ADM, body: { ketQua: "CON_VE", yeuCauId: x.xacNhan.yeuCau.id, updatedAt: x.order.updatedAt } }));
  assert.equal(trangThai(w, o.id), "draft");
});

test("Gửi đơn của Đối tác đủ mức, không cờ ⇒ nhánh B xác nhận ngay với phí tính lại ở ngày xác nhận", async () => {
  const w = await setup();
  const o = await lap(w, [OUT(KS_CR)], {}, DT);
  await doiMuc(w, "CR", 120_000);
  const g = await ok(w.call("POST", `/api/orders/${o.id}/gui-don`, { as: DT, body: {} }), 200, "gửi đơn");
  assert.equal(g.json.nhanh, "B");
  assert.deepEqual(dongPhi(w, o.id), [{ fee_zone_code: "CR", quantity: 2, unit_price: 120_000, line_total: 240_000 }]);
  assert.equal(tien(w, o.id).total, 1_240_000);
});

test("câu báo thiếu phí: ba lý do, đúng chữ của kế hoạch", () => {
  assert.equal(cauThieuPhiDon({ lyDo: "KHONG_CO_MUC", tenVung: "Bắc Nha Trang" }, null), CAU_BAC);
  assert.equal(cauThieuPhiDon({ lyDo: "XUNG_DOT", tenVung: "Bắc Nha Trang" }, null), "Phí đưa đón khu vực Bắc Nha Trang có hai mức trùng nhau; Quản trị cần kết thúc một mức trước khi xác nhận.");
  assert.equal(cauThieuPhiDon({ lyDo: "DAI_LY_HAI_CAP", tenVung: "Bắc Nha Trang" }, "Lữ Hành Dò Tìm"), "Cần gán cấp riêng cho đối tác Lữ Hành Dò Tìm trước khi xác nhận.");
});

// ---- Lưới văn bản (canh): cửa không đi qua kiemCongXacNhan phải tự chốt; thứ tự cổng trong kiemCongXacNhan theo trang ghép §3 ----
const boChuThich = (s: string): string => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1");
const doc = (rel: string): string => boChuThich(readFileSync(new URL(rel, import.meta.url), "utf8"));
const thanRoute = (src: string, dau: string): string => {
  const i = src.indexOf(dau);
  assert.ok(i >= 0, `không thấy ${dau}`);
  const j = src.indexOf('route("', i + dau.length);
  return src.slice(i, j < 0 ? src.length : j);
};
const truocSau = (than: string, a: string, b: string, ten: string) => {
  const i = than.indexOf(a);
  const j = than.indexOf(b);
  assert.ok(i >= 0, `${ten}: không thấy ${a}`);
  assert.ok(j >= 0, `${ten}: không thấy ${b}`);
  assert.ok(i < j, `${ten}: ${a} phải đứng trước ${b}`);
};

test("canh: Gửi xác nhận tự chốt thiếu phí SAU cổng chọn Đón, TRƯỚC khi mở yêu cầu", () => {
  const than = thanRoute(doc("./xac-nhan-route.ts"), 'route("POST", "/api/orders/:id/gui-xac-nhan"');
  truocSau(than, "thieuChonDon(", "congThieuPhiDon(", "gui-xac-nhan");
  truocSau(than, "congThieuPhiDon(", "moYeuCau(", "gui-xac-nhan");
});

test("canh: Còn vé chốt thiếu phí ngay sau nhóm tắt đưa đón, TRƯỚC phần kiểm mốc / đặt gấp của route", () => {
  const than = thanRoute(doc("./xac-nhan-route.ts"), 'route("POST", "/api/orders/:id/quyet-dinh"');
  truocSau(than, "congNhomTatDuaDon(", "congThieuPhiDon(", "quyet-dinh");
  truocSau(than, "congThieuPhiDon(", "canhBaoMocCua(", "quyet-dinh");
  truocSau(than, "congThieuPhiDon(", "xetDatGap(", "quyet-dinh");
});

test("canh: kiemCongXacNhan — phí tính ở đầu (trước cổng Trả sau), lỗi thiếu phí đứng sau cổng chọn Đón và trước cổng mốc", () => {
  const src = doc("./xac-nhan-chung.ts");
  const i = src.search(/export async function kiemCongXacNhan\b/);
  const than = src.slice(i, src.indexOf("\nexport ", i + 10));
  truocSau(than, "chuanBiPhiDonXacNhan(", "traSauChoXacNhan(", "kiemCongXacNhan");
  truocSau(than, "thieuChonDon(", "congThieuPhiDon(", "kiemCongXacNhan");
  truocSau(than, "congThieuPhiDon(", "MOC_CHUA_CO(", "kiemCongXacNhan");
});

test("canh: mọi lời gọi soanXacNhan ngoài định nghĩa truyền câu phí `cong.phiDon.cauLenh` của kiemCongXacNhan", () => {
  let n = 0;
  for (const f of ["./index.ts", "./xac-nhan-route.ts"]) {
    const src = doc(f);
    for (const k of src.matchAll(/(?<!function )\bsoanXacNhan\(/g)) {
      n++;
      const loi = src.slice(k.index!, src.indexOf(";", k.index!));
      assert.match(loi, /\bcong\.phiDon\.cauLenh\b/, `${f}: ${loi.slice(0, 120)}`);
    }
  }
  assert.equal(n, 3);
});
