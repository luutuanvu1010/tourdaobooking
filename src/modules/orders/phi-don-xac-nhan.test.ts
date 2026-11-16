// Phí đưa đón LÚC XÁC NHẬN (Đợt C, Task 4; từ ADR-0214 Task 4: mức do VĂN PHÒNG CHỌN — sổ vàng golden/phi-dua-don-chon.json SV-PC-09, SV-PC-10): bốn cửa xác nhận (`/status`,
// Còn vé, Gửi xác nhận, Gửi đơn) lấy mức đã chọn trong dòng phí đã lưu theo id chặng (Còn vé: cộng mức văn phòng chọn kèm lệnh), tính lại số lượng theo số khách hiện tại rồi chụp trong
// CÙNG lô với câu đổi trạng thái; lượt đón mở chưa chọn ⇒ 409 `transfer_fee_missing` «Chọn phí đưa đón cho lượt đón …» (Gửi đơn: nhánh A, cờ «thiếu phí»); dòng bảng phí cũ ⇒ coi
// như chưa chọn (ruling P6); lô thua ⇒ tiền và dòng của nháp y như trước. Chạy CẢ ứng dụng trên SQLite thật (tests/audit/harness.mjs). Bảng phí theo khu vực TRỐNG (ADR-0214).
// Tên người dùng GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
import { cauThieuPhiDon } from "./phi-don-don.ts";

const SALES = "11111111-1111-4111-8111-111111111111";
const SALES2 = "11111111-1111-4111-8111-111111111112";
const ADM = "55555555-5555-4555-8555-555555555555";
const SUP = "77777777-7777-4777-8777-777777777777";
const LAI = "66666666-6666-4666-8666-666666666666"; // tài khoản lai Đối tác + Bán hàng (giữ PARTNER ⇒ «tài khoản Đối tác», ruling P2)
const DT = "88888888-8888-4888-8888-888888888801"; // Đối tác có hồ sơ mang vai được hưởng ⇒ bên đặt = chính hồ sơ này
const BEN_DT = `pty-${DT}`;
const AT = "2026-10-01T00:00:00.000Z";
const BEN = "a941dd7d-faab-4098-9ab9-1df7fa6dd551"; // Bến tàu du lịch Nha Trang (0010)
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

/** Ngày bắt đầu áp `batDau` (null = chưa bật). `coDichVuCanKiem` = TOUR_LAN mang cờ «cần xác nhận» (đi qua Gửi xác nhận / Còn vé). Bảng mức theo khu vực để TRỐNG. */
async function setup(o: { batDau?: string | null; coDichVuCanKiem?: boolean } = {}): Promise<W> {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An Bán", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: SALES2, phone: "0900000002", name: "Bình Bán", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000006", name: "Quản Trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: SUP, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  seedStaff(w.sqlite, { id: LAI, phone: "0900000009", name: "Lai Đối Tác", perms: ["PARTNER", "SALES"] });
  seedStaff(w.sqlite, { id: DT, phone: "0900000021", name: "Đối Tác Hưởng", perms: ["PARTNER"] });
  w.sqlite.prepare("INSERT INTO catalog_item (code, name, unit, price_adult, price_child, in_sheet, first_seen_at, updated_at) VALUES ('TOUR_LAN', 'Tour lặn biển', 'perPax', 500000, 300000, 1, ?, ?)").run(AT, AT);
  if (o.coDichVuCanKiem) {
    const luc = new Date(Date.now() - 1000).toISOString();
    w.sqlite.prepare("INSERT INTO ord_service_confirm_flag (id, scope, code, required, valid_from_at, created_at, updated_at) VALUES (?, 'SERVICE', 'TOUR_LAN', 1, ?, ?, ?)").run(crypto.randomUUID(), luc, luc, luc);
  }
  const batDau = o.batDau === undefined ? HOM_NAY : o.batDau;
  if (batDau !== null) await batPhi(w, batDau);
  return w;
}
/** Bật (ngày) hoặc tắt (null) phí đưa đón qua route của pricing. */
async function batPhi(w: W, ngay: string | null) {
  const tuLuc = (await ok(w.call("GET", "/api/pricing/phi-don", { as: ADM }), 200)).json.batDauAp.tuLuc;
  await ok(w.call("POST", "/api/pricing/phi-don/bat-dau-ap", { as: ADM, body: { ngay, tuLucDaDoc: tuLuc } }), 200, ngay === null ? "tắt phí" : "bật phí");
}

const DS = (soTien: number) => ({ loai: "DANH_SACH", soTien });
const SK = (soTien: number) => ({ loai: "SO_KHAC", soTien });
const OUT = (phiDon?: unknown, pickupTime = "06:30") => ({ direction: "OUT", pickupDate: "", pickupTime, pickupLocationId: null, pickupPlace: "Khách sạn A", dropoffLocationId: BEN, dropoffPlace: "", ...(phiDon === undefined ? {} : { phiDon }) });
const RET = (phiDon?: unknown) => ({ direction: "RETURN", pickupDate: ngayVN(6), pickupTime: "16:00", pickupLocationId: BEN, pickupPlace: "", dropoffLocationId: null, dropoffPlace: "Khách sạn A", ...(phiDon === undefined ? {} : { phiDon }) });
const svc = (pax: Record<string, number>, legs: unknown[]) => ({
  kind: "catalog", pickupChoice: legs.length > 0 ? "DON" : "KHONG_DON", catalogCode: "TOUR_LAN", pax: { adult: 0, child: 0, senior: 0, infant: 0, ...pax },
  catalogPriceSeen: { adult: 500000, child: 300000 }, departDate: D, legs,
});
const lap = async (w: W, legs: unknown[], extra: Record<string, unknown> = {}, as = SALES) =>
  (await ok(w.call("POST", "/api/orders", { as, body: { customerName: "Khách Thử", customerPhone: "0912345678", services: [svc({ adult: 2 }, legs)], ...extra } }), 201, "lập đơn")).json.order;
const xacNhan = (w: W, id: string) => w.call("POST", `/api/orders/${id}/status`, { as: SALES, body: { status: "confirmed" } });
const dongPhi = (w: W, id: string) =>
  w.q("SELECT fee_source, fee_choice, fee_zone_code, quantity, unit_price, line_total FROM order_item WHERE order_id = ? AND line_kind = 'TRANSFER_FEE' ORDER BY sort_order", id).map((r: any) => ({ ...r }));
const moiDong = (w: W, id: string) => w.q("SELECT * FROM order_item WHERE order_id = ? ORDER BY sort_order, id", id).map((r: any) => ({ ...r }));
const tien = (w: W, id: string) => ({ ...w.q("SELECT subtotal, discount, total, remaining_amount FROM orders WHERE id = ?", id)[0] });
const trangThai = (w: W, id: string) => w.q("SELECT status FROM orders WHERE id = ?", id)[0].status as string;
const soNhatKy = (w: W, id: string) => Number(w.q("SELECT count(*) AS n FROM audit_log WHERE order_id = ?", id)[0].n);
const soXacNhan = (w: W, id: string) => Number(w.q("SELECT count(*) AS n FROM audit_log WHERE order_id = ? AND action = 'confirmed'", id)[0].n);
const nhatKyXacNhan = (w: W, id: string) => w.q("SELECT staff_id, detail FROM audit_log WHERE order_id = ? AND action = 'confirmed'", id).map((r: any) => ({ ...r }));
const soChot = (w: W) => Number(w.q("SELECT count(*) AS n FROM ord_xac_nhan_phi_gac")[0].n);
const CAU_DI = "Chọn phí đưa đón cho lượt đón chiều đi của dịch vụ Tour lặn biển trước khi xác nhận.";
const CAU_VE = "Chọn phí đưa đón cho lượt đón chiều về của dịch vụ Tour lặn biển trước khi xác nhận.";
const thieuPhi = (r: Res, cau = CAU_DI) => {
  assert.equal(r.status, 409, r.text);
  assert.deepEqual([r.json.error.code, r.json.error.message], ["transfer_fee_missing", cau]);
};
const DONG_30K = { fee_source: "CHON", fee_choice: "DANH_SACH", fee_zone_code: null, quantity: 2, unit_price: 30_000, line_total: 60_000 };

/** Đơn Đối tác có lượt đón (nháp không mang mức), đã Gửi đơn ⇒ nhánh A. Trả đơn + hàm đọc lại + hàm bấm Còn vé (người bấm `as`, thân thêm `them`). */
async function donChoCuaDoiTac(w: W, legs: unknown[] = [OUT()]) {
  const o = await lap(w, legs, {}, DT);
  const g = await ok(w.call("POST", `/api/orders/${o.id}/gui-don`, { as: DT, body: {} }), 201, "gửi đơn");
  assert.equal(g.json.nhanh, "A");
  const xem = async () => (await ok(w.call("GET", `/api/orders/${o.id}`, { as: ADM }), 200)).json;
  const conVe = async (them: Record<string, unknown> = {}, as = ADM) => {
    const v = await xem();
    return w.call("POST", `/api/orders/${o.id}/quyet-dinh`, { as, body: { ketQua: "CON_VE", yeuCauId: v.xacNhan.yeuCau.id, updatedAt: v.order.updatedAt, ...them } });
  };
  return { o, g, xem, conVe };
}

test("[Điểm 4] lưu nháp khi phí CHƯA áp (mức trong thân bị bỏ qua), đặt ngày áp = hôm nay ⇒ /status 409 «chưa chọn» (không tự 0 đồng); lưu lại với mức ⇒ xác nhận chụp dòng trong lô", async () => {
  const w = await setup({ batDau: null });
  const o = await lap(w, [OUT(DS(30_000))]);
  assert.deepEqual(dongPhi(w, o.id), []);
  assert.equal(tien(w, o.id).subtotal, 1_000_000);
  await batPhi(w, HOM_NAY);
  const truoc = soNhatKy(w, o.id);
  thieuPhi(await xacNhan(w, o.id));
  assert.equal(trangThai(w, o.id), "draft");
  assert.equal(soNhatKy(w, o.id), truoc);
  const l0 = o.services[0].legs[0];
  await ok(w.call("PUT", `/api/orders/${o.id}`, { as: SALES, body: { customerName: "Khách Thử", customerPhone: "0912345678", expectedUpdatedAt: o.updatedAt, services: [{ ...svc({ adult: 2 }, [{ ...OUT(DS(30_000)), id: l0.id }]), id: o.services[0].id }] } }), 200, "lưu lại có mức");
  const r = await ok(xacNhan(w, o.id), 200, "xác nhận");
  assert.equal(trangThai(w, o.id), "confirmed");
  assert.deepEqual(dongPhi(w, o.id), [DONG_30K]);
  assert.deepEqual(tien(w, o.id), { subtotal: 1_060_000, discount: 0, total: 1_060_000, remaining_amount: 1_060_000 });
  assert.equal(soXacNhan(w, o.id), 1, "nhật ký confirmed vẫn ghi (câu chốt không chen vào chuỗi changes())");
  assert.equal(soChot(w), 0, "bảng chốt không bao giờ giữ dòng");
  assert.equal(r.json.order.phiDuaDon.duKien, false);
  assert.equal(r.json.order.phiDuaDon.dong.length, 1);
});

test("[ruling P6] nháp còn dòng phí theo bảng cũ (nguồn BANG_PHI hoặc không nguồn) ⇒ coi như chưa chọn: /status 409, không bao giờ 0 đồng; phí tắt ⇒ dòng cũ bị bỏ, tạm tính về tổng dịch vụ", async () => {
  const w = await setup();
  const a = await lap(w, [OUT(DS(30_000))]);
  const b = await lap(w, [OUT(DS(30_000))]);
  // Giả lập nháp Đợt C: dòng do bảng phí sinh (mã mức + khu vực, không kiểu chọn — trigger 0173). Mức bảng gieo qua route pricing chỉ để có mã mức thật; bảng không còn tác dụng với đơn.
  await ok(w.call("POST", "/api/pricing/phi-don", { as: ADM, body: { kind: "PER_PAX", amount: 30_000, validFrom: "2026-01-01", validTo: null, note: null, dieuKien: [{ khoa: "ZONE", giaTri: "NGOAI_VUNG" }] } }), 201, "mức bảng cũ");
  const maMuc = (await ok(w.call("GET", "/api/pricing/phi-don", { as: ADM }), 200)).json.muc[0].id;
  w.sqlite.prepare("UPDATE order_item SET fee_source = 'BANG_PHI', fee_choice = NULL, fee_rule_id = ?, fee_zone_code = 'NGOAI_VUNG' WHERE order_id = ? AND line_kind = 'TRANSFER_FEE'").run(maMuc, a.id);
  w.sqlite.prepare("UPDATE order_item SET fee_source = NULL, fee_choice = NULL, fee_rule_id = ?, fee_zone_code = 'NGOAI_VUNG' WHERE order_id = ? AND line_kind = 'TRANSFER_FEE'").run(maMuc, b.id);
  thieuPhi(await xacNhan(w, a.id));
  thieuPhi(await xacNhan(w, b.id));
  assert.equal(trangThai(w, a.id), "draft");
  await batPhi(w, null);
  await ok(xacNhan(w, a.id), 200, "phí đã tắt");
  assert.deepEqual(dongPhi(w, a.id), [], "phí đã tắt: dòng dự kiến của nháp bị bỏ");
  assert.deepEqual(tien(w, a.id), { subtotal: 1_000_000, discount: 0, total: 1_000_000, remaining_amount: 1_000_000 });
});

test("xác nhận tính lại SỐ LƯỢNG theo số khách hiện tại với mức đã chọn (dòng nháp sửa tay sai số lượng ⇒ chụp đúng 30.000 × 2)", async () => {
  const w = await setup();
  const o = await lap(w, [OUT(DS(30_000))]);
  w.sqlite.prepare("UPDATE order_item SET quantity = 5, line_total = 150000 WHERE order_id = ? AND line_kind = 'TRANSFER_FEE'").run(o.id);
  w.sqlite.prepare("UPDATE orders SET subtotal = 1150000, total = 1150000, remaining_amount = 1150000 WHERE id = ?").run(o.id);
  await ok(xacNhan(w, o.id), 200);
  assert.deepEqual(dongPhi(w, o.id), [DONG_30K]);
  assert.equal(tien(w, o.id).total, 1_060_000);
});

test("đơn KHÔNG có phí (phí chưa áp, không dòng cũ) ⇒ lô xác nhận như hôm nay: không câu phí, không câu chốt", async () => {
  const w = await setup({ batDau: null });
  const o = await lap(w, [OUT()]);
  let lo: { sql: string }[] = [];
  w.chenTruocLo((s: { sql: string }[]) => s.some((x) => /status = 'confirmed'/.test(x.sql)), (s: { sql: string }[]) => { lo = s; });
  await ok(xacNhan(w, o.id), 200);
  assert.ok(lo.length > 0);
  assert.equal(lo.filter((x) => /ord_xac_nhan_phi_gac|TRANSFER_FEE/.test(x.sql)).length, 0);
  assert.match(lo[1]!.sql, /status = 'confirmed'/, "câu đổi trạng thái vẫn là câu thứ hai");
});

test("SV-PC-09: lượt đón chưa chọn ⇒ /status 409 «Chọn phí đưa đón cho lượt đón chiều … của dịch vụ …», đơn ở lại nháp, không nhật ký mới; câu nêu lượt thiếu ĐẦU TIÊN", async () => {
  const w = await setup();
  const o = await lap(w, [OUT()]);
  const truoc = soNhatKy(w, o.id);
  thieuPhi(await xacNhan(w, o.id));
  assert.equal(trangThai(w, o.id), "draft");
  assert.equal(soNhatKy(w, o.id), truoc);
  const v = await lap(w, [OUT(DS(0)), RET()]);
  thieuPhi(await xacNhan(w, v.id), CAU_VE);
});

test("[Review Focus 2] lô thua vì mốc tối thiểu (chặng bị dời sát giờ giữa lúc kiểm và lúc ghi) ⇒ CẢ lô lui: tạm tính, tổng, dòng order_item của nháp y như trước; không nhật ký mới", async () => {
  const w = await setup();
  const o = await lap(w, [OUT(DS(30_000))]);
  const truoc = { tien: tien(w, o.id), dong: moiDong(w, o.id), nhatKy: soNhatKy(w, o.id) };
  const sat = new Date(Date.now() + 7 * 3600e3 + 60 * 60_000).toISOString();
  // Khớp theo câu ĐỔI TRẠNG THÁI (không theo câu chốt) để bài vẫn chạy khi câu chốt bị gỡ — đột biến «bỏ câu chốt» phải làm bài này đỏ. Câu phí xoá–chèn dòng mới (id mới) ⇒ lọt là thấy ngay.
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

test("[Review Focus 2] Còn vé kèm mức, lô thua (đơn vừa bị đổi giữa lúc kiểm và lúc ghi) ⇒ không dòng phí, tiền nháp y như trước, đơn vẫn chờ", async () => {
  const w = await setup();
  const { o, xem, conVe } = await donChoCuaDoiTac(w);
  const truoc = { tien: tien(w, o.id), dong: moiDong(w, o.id) };
  const l0 = (await xem()).order.services[0].legs[0];
  w.chenTruocLo((s: { sql: string }[]) => s.some((x) => /status = 'confirmed'/.test(x.sql)), () => {
    w.sqlite.prepare("UPDATE orders SET updated_at = ? WHERE id = ?").run(new Date(Date.now() + 5000).toISOString(), o.id);
  });
  const r = await conVe({ phiDon: [{ legId: l0.id, muc: DS(30_000) }] });
  assert.equal(r.status, 409, r.text);
  assert.equal(trangThai(w, o.id), "draft");
  assert.deepEqual(dongPhi(w, o.id), []);
  assert.deepEqual(tien(w, o.id), truoc.tien);
  assert.deepEqual(moiDong(w, o.id), truoc.dong);
  assert.equal(soXacNhan(w, o.id), 0);
  assert.equal(soChot(w), 0);
});

test("[Review Focus 3] Trả sau: phí đã chọn đẩy tổng vượt hạn mức ⇒ 409 vuot_han_muc, ở lại nháp, không dòng mới; nâng hạn mức ⇒ xác nhận với tổng gồm phí", async () => {
  const w = await setup();
  const hanMuc = async (n: number) => assert.equal((await w.call("POST", "/api/tra-sau/han-muc", { as: SUP, body: { partyId: BEN_DT, hanMuc: n, gioTra: 168, gioAnHan: 0, lyDo: "thử" } })).status, 201);
  await hanMuc(1_200_000);
  const o = await lap(w, [OUT(DS(100_000))], { bookerPartyId: BEN_DT, paymentTerm: "CREDIT" });
  assert.equal(tien(w, o.id).total, 1_200_000);
  await hanMuc(1_100_000); // hạn mức hạ sau khi lưu: tổng dịch vụ 1.000.000 vẫn vừa, tổng gồm phí 1.200.000 thì vượt
  const r = await xacNhan(w, o.id);
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "vuot_han_muc");
  assert.equal(trangThai(w, o.id), "draft");
  assert.deepEqual(dongPhi(w, o.id).map((d: any) => d.line_total), [200_000]);
  await hanMuc(1_200_000);
  await ok(xacNhan(w, o.id), 200, "vừa đủ hạn mức mới");
  assert.equal(tien(w, o.id).total, 1_200_000);
});

test("[Review Focus 4] SV-PD-29: giảm giá không trừ vào phí — dịch vụ 1.000.000 + phí 140.000 (số khác 70.000 × 2) − giảm giá 100.000 ⇒ tổng 1.040.000; giảm giá tối đa 1.000.000", async () => {
  const w = await setup();
  const o = await lap(w, [OUT(SK(70_000))], { discount: 100_000 });
  const toiDa = await lap(w, [OUT(SK(70_000))], { discount: 1_000_000 });
  assert.equal((await w.call("POST", "/api/orders", { as: SALES, body: { customerName: "Khách Thử", customerPhone: "0912345678", services: [svc({ adult: 2 }, [OUT(SK(70_000))])], discount: 1_000_001 } })).status, 400);
  await ok(xacNhan(w, o.id), 200);
  assert.deepEqual(tien(w, o.id), { subtotal: 1_140_000, discount: 100_000, total: 1_040_000, remaining_amount: 1_040_000 });
  assert.deepEqual(dongPhi(w, o.id), [{ fee_source: "CHON", fee_choice: "SO_KHAC", fee_zone_code: null, quantity: 2, unit_price: 70_000, line_total: 140_000 }]);
  await ok(xacNhan(w, toiDa.id), 200);
  assert.deepEqual(tien(w, toiDa.id), { subtotal: 1_140_000, discount: 1_000_000, total: 140_000, remaining_amount: 140_000 });
});

test("SV-PC-09 Gửi xác nhận (văn phòng) chưa chọn ⇒ 409 cùng câu, không mở yêu cầu; đã chọn ⇒ 201", async () => {
  const w = await setup({ coDichVuCanKiem: true });
  const o = await lap(w, [OUT()]);
  thieuPhi(await w.call("POST", `/api/orders/${o.id}/gui-xac-nhan`, { as: SALES, body: {} }));
  assert.equal(w.q("SELECT count(*) AS n FROM ord_confirm_request WHERE order_id = ?", o.id)[0].n, 0);
  const k = await lap(w, [OUT(DS(30_000))]);
  await ok(w.call("POST", `/api/orders/${k.id}/gui-xac-nhan`, { as: SALES, body: {} }), 201);
});

test("[Điểm 3] SV-PC-10: Đối tác Gửi đơn ⇒ nhánh A (cờ thiếu phí, lý do PHI_DON); Còn vé thiếu mức ⇒ 409; văn phòng Còn vé kèm 30.000 ⇒ xác nhận, phí 60.000 trong CÙNG lô; nhật ký ghi lượt, mức, kiểu, người chọn", async () => {
  const w = await setup();
  const { o, g, xem, conVe } = await donChoCuaDoiTac(w);
  assert.deepEqual(g.json.yeuCau.vi, ["PHI_DON"]);
  assert.equal(w.q("SELECT transfer_fee_missing AS f FROM ord_confirm_request WHERE order_id = ?", o.id)[0].f, 1);
  const cho = (await ok(w.call("GET", "/api/orders/cho-xac-nhan", { as: ADM }), 200)).json.don.find((d: any) => d.orderId === o.id);
  assert.deepEqual(cho.vi, ["PHI_DON"]);
  const x = await xem();
  assert.deepEqual(x.xacNhan.yeuCau.vi, ["PHI_DON"]);
  assert.deepEqual(x.order.phiDuaDon.thieu.map((t: any) => [t.lyDo, t.serviceName, t.direction]), [["CHUA_CHON", "Tour lặn biển", "OUT"]]);
  thieuPhi(await conVe());
  assert.equal(trangThai(w, o.id), "draft");
  const l0 = x.order.services[0].legs[0];
  let lo: { sql: string }[] = [];
  w.chenTruocLo((s: { sql: string }[]) => s.some((q) => /status = 'confirmed'/.test(q.sql)), (s: { sql: string }[]) => { lo = s; });
  await ok(conVe({ phiDon: [{ legId: l0.id, muc: DS(30_000) }] }, SALES2), 200, "Còn vé kèm mức (Bán hàng không phải người lập)");
  assert.equal(trangThai(w, o.id), "confirmed");
  assert.deepEqual(dongPhi(w, o.id), [DONG_30K]);
  assert.deepEqual(tien(w, o.id), { subtotal: 1_060_000, discount: 0, total: 1_060_000, remaining_amount: 1_060_000 });
  assert.equal(soXacNhan(w, o.id), 1);
  // Thứ tự lô (như Đợt C): câu phí TRƯỚC câu đổi trạng thái, câu chốt SAU.
  const iPhi = lo.findIndex((q) => /INSERT INTO order_item/.test(q.sql) && /TRANSFER_FEE/.test(q.sql));
  const iDoi = lo.findIndex((q) => /status = 'confirmed'/.test(q.sql));
  const iChot = lo.findIndex((q) => /ord_xac_nhan_phi_gac/.test(q.sql));
  assert.ok(iPhi >= 0 && iPhi < iDoi && iDoi < iChot, `thứ tự lô: phí ${iPhi}, đổi trạng thái ${iDoi}, chốt ${iChot}`);
  const nk = nhatKyXacNhan(w, o.id);
  assert.equal(nk[0].staff_id, SALES2, "người chọn = người bấm Còn vé");
  assert.ok(String(nk[0].detail).includes("phí đưa đón chiều đi · Tour lặn biển: chưa chọn → 30.000 ₫ (trong danh sách)"), nk[0].detail);
  assert.doesNotMatch(String(nk[0].detail), /Khách Thử/);
});

test("[Điểm 3] Còn vé: hai lượt mà chỉ gửi mức cho một ⇒ 409 nêu lượt còn thiếu; gửi đủ (Miễn phí + số khác) ⇒ xác nhận", async () => {
  const w = await setup();
  const { o, xem, conVe } = await donChoCuaDoiTac(w, [OUT(), RET()]);
  const legs = (await xem()).order.services[0].legs;
  const di = legs.find((l: any) => l.direction === "OUT");
  const ve = legs.find((l: any) => l.direction === "RETURN");
  thieuPhi(await conVe({ phiDon: [{ legId: di.id, muc: DS(30_000) }] }), CAU_VE);
  assert.deepEqual(dongPhi(w, o.id), []);
  await ok(conVe({ phiDon: [{ legId: di.id, muc: DS(0) }, { legId: ve.id, muc: SK(25_000) }] }), 200);
  assert.deepEqual(dongPhi(w, o.id).map((d: any) => [d.fee_choice, d.unit_price, d.line_total]), [["DANH_SACH", 0, 0], ["SO_KHAC", 25_000, 50_000]]);
  assert.equal(tien(w, o.id).total, 1_050_000);
});

test("[ruling P5] Còn vé: mức sai, lượt không thuộc đơn, nhắc hai lần, lượt đã có mức ⇒ 400, không đổi gì; tài khoản giữ quyền Đối tác gửi mức ⇒ 400 transfer_fee_not_allowed", async () => {
  const w = await setup();
  const { o, xem, conVe } = await donChoCuaDoiTac(w);
  const khac = await lap(w, [OUT(DS(30_000))]);
  const l0 = (await xem()).order.services[0].legs[0];
  const bon = async (them: Record<string, unknown>, cau: string | RegExp) => {
    const r = await conVe(them);
    assert.equal(r.status, 400, r.text);
    if (typeof cau === "string") assert.equal(r.json.error.message, cau); else assert.match(r.json.error.message, cau);
    assert.equal(trangThai(w, o.id), "draft");
    assert.deepEqual(dongPhi(w, o.id), []);
  };
  await bon({ phiDon: [{ legId: l0.id, muc: SK(6_000_000) }] }, "Mức phí tối đa 5.000.000 đ.");
  await bon({ phiDon: [{ legId: l0.id, muc: DS(12_345) }] }, "Chọn phí đưa đón trong danh sách hoặc gõ số tiền hợp lệ.");
  await bon({ phiDon: [{ legId: l0.id, muc: { loai: "SO_KHAC", soTien: "30000" } }] }, "Chọn phí đưa đón trong danh sách hoặc gõ số tiền hợp lệ.");
  await bon({ phiDon: { [l0.id]: DS(30_000) } }, "Chọn phí đưa đón trong danh sách hoặc gõ số tiền hợp lệ.");
  await bon({ phiDon: [{ legId: khac.services[0].legs[0].id, muc: DS(30_000) }] }, /không có trong đơn/);
  await bon({ phiDon: [{ legId: l0.id, muc: DS(30_000) }, { legId: l0.id, muc: DS(30_000) }] }, /bị nhắc hai lần/);
  // tài khoản lai Đối tác + Bán hàng (được bấm Còn vé đơn người khác) gửi mức ⇒ 400 transfer_fee_not_allowed (kể cả Hết vé / Huỷ)
  for (const ketQua of ["CON_VE", "HUY"]) {
    const v = await xem();
    const r = await w.call("POST", `/api/orders/${o.id}/quyet-dinh`, { as: LAI, body: { ketQua, yeuCauId: v.xacNhan.yeuCau.id, updatedAt: v.order.updatedAt, phiDon: [{ legId: l0.id, muc: DS(30_000) }] } });
    assert.equal(r.status, 400, r.text);
    assert.equal(r.json.error.code, "transfer_fee_not_allowed");
    assert.equal(trangThai(w, o.id), "draft");
  }
  // lượt đã có mức (đơn văn phòng chờ kiểm vé) ⇒ 400, mức đã chọn giữ nguyên
  const w2 = await setup({ coDichVuCanKiem: true });
  const k = await lap(w2, [OUT(DS(30_000))]);
  await ok(w2.call("POST", `/api/orders/${k.id}/gui-xac-nhan`, { as: SALES, body: {} }), 201);
  const v2 = (await ok(w2.call("GET", `/api/orders/${k.id}`, { as: ADM }), 200)).json;
  const r2 = await w2.call("POST", `/api/orders/${k.id}/quyet-dinh`, { as: ADM, body: { ketQua: "CON_VE", yeuCauId: v2.xacNhan.yeuCau.id, updatedAt: v2.order.updatedAt, phiDon: [{ legId: k.services[0].legs[0].id, muc: DS(50_000) }] } });
  assert.equal(r2.status, 400, r2.text);
  assert.equal(r2.json.error.message, "Lượt đón này đã có phí đưa đón.");
  assert.deepEqual(dongPhi(w2, k.id).map((d: any) => d.unit_price), [30_000]);
});

test("Gửi đơn: Đối tác gửi kèm mức ⇒ 400 transfer_fee_not_allowed, không mở yêu cầu; Đối tác có lượt đón khi phí đang áp ⇒ luôn nhánh A (nháp Đối tác không mang mức); không lượt đón ⇒ nhánh B, không dòng phí", async () => {
  const w = await setup();
  const o = await lap(w, [OUT()], {}, DT);
  const r = await w.call("POST", `/api/orders/${o.id}/gui-don`, { as: DT, body: { phiDon: [{ legId: o.services[0].legs[0].id, muc: DS(30_000) }] } });
  assert.equal(r.status, 400, r.text);
  assert.equal(r.json.error.code, "transfer_fee_not_allowed");
  assert.equal(w.q("SELECT count(*) AS n FROM ord_confirm_request WHERE order_id = ?", o.id)[0].n, 0);
  const g = await ok(w.call("POST", `/api/orders/${o.id}/gui-don`, { as: DT, body: {} }), 201, "gửi đơn");
  assert.equal(g.json.nhanh, "A");
  const b = await lap(w, [], {}, DT);
  const gb = await ok(w.call("POST", `/api/orders/${b.id}/gui-don`, { as: DT, body: {} }), 200, "gửi đơn không lượt");
  assert.equal(gb.json.nhanh, "B");
  assert.deepEqual(dongPhi(w, b.id), []);
  assert.equal(tien(w, b.id).total, 1_000_000);
});

test("Còn vé: đơn thiếu phí có lượt dưới hạn chốt ⇒ báo THIẾU PHÍ trước (không đẩy người xét đi đặt gấp cho đơn chưa xác nhận được)", async () => {
  const w = await setup();
  const { o, conVe } = await donChoCuaDoiTac(w);
  const sat = new Date(Date.now() + 7 * 3600e3 + 60 * 60_000).toISOString();
  w.sqlite.prepare("UPDATE ord_transfer_leg SET pickup_date = ?, pickup_time = ? WHERE order_id = ?").run(sat.slice(0, 10), sat.slice(11, 16), o.id);
  thieuPhi(await conVe());
  assert.equal(trangThai(w, o.id), "draft");
});

test("Còn vé trước ngày áp: mức gửi kèm vẫn được kiểm, không sinh dòng, không ghi mức vào nhật ký", async () => {
  // trước ngày áp, Gửi đơn không thiếu phí ⇒ không đi nhánh A vì phí; dựng đơn chờ bằng cờ «cần xác nhận» của văn phòng
  const w2 = await setup({ batDau: null, coDichVuCanKiem: true });
  const k = await lap(w2, [OUT()]);
  await ok(w2.call("POST", `/api/orders/${k.id}/gui-xac-nhan`, { as: SALES, body: {} }), 201);
  const v = (await ok(w2.call("GET", `/api/orders/${k.id}`, { as: ADM }), 200)).json;
  const goi = (muc: unknown) => w2.call("POST", `/api/orders/${k.id}/quyet-dinh`, { as: ADM, body: { ketQua: "CON_VE", yeuCauId: v.xacNhan.yeuCau.id, updatedAt: v.order.updatedAt, phiDon: [{ legId: k.services[0].legs[0].id, muc }] } });
  assert.equal((await goi(SK(6_000_000))).status, 400);
  await ok(goi(DS(30_000)), 200);
  assert.deepEqual(dongPhi(w2, k.id), []);
  assert.equal(tien(w2, k.id).total, 1_000_000);
  assert.doesNotMatch(String(nhatKyXacNhan(w2, k.id)[0].detail), /phí đưa đón/);
});

test("câu báo thiếu phí (CHUA_CHON): đúng chữ ADR-0214 Đ3, chiều viết thường", () => {
  assert.equal(cauThieuPhiDon({ direction: "OUT", tenDichVu: "Tour lặn biển" }), CAU_DI);
  assert.equal(cauThieuPhiDon({ direction: "RETURN", tenDichVu: "Tour lặn biển" }), CAU_VE);
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

test("canh: Còn vé đọc mức văn phòng chọn TRƯỚC chốt thiếu phí; chốt thiếu phí ngay sau nhóm tắt đưa đón, TRƯỚC phần kiểm mốc / đặt gấp; cả hai lần tính phí dùng CÙNG mức chọn", () => {
  const than = thanRoute(doc("./xac-nhan-route.ts"), 'route("POST", "/api/orders/:id/quyet-dinh"');
  truocSau(than, "kiemMucChon(", "congThieuPhiDon(", "quyet-dinh");
  truocSau(than, "congNhomTatDuaDon(", "congThieuPhiDon(", "quyet-dinh");
  truocSau(than, "congThieuPhiDon(", "canhBaoMocCua(", "quyet-dinh");
  truocSau(than, "congThieuPhiDon(", "xetDatGap(", "quyet-dinh");
  assert.match(than, /chuanBiPhiDonXacNhan\(env\.DB, order, homNay, mucPhiChon\)/);
  assert.match(than, /mucPhiThem: mucPhiChon/);
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
