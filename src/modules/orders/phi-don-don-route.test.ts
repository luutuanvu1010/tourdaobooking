// Phí đưa đón do văn phòng chọn trên đơn NHÁP (ADR-0214, Task 3; sổ vàng golden/phi-dua-don-chon.json SV-PC-01, 03, 04, 06, 07, 14): lập đơn, lưu nháp, sửa số người chiều về,
// sửa chuyến (đơn nháp) ghi dòng phí `order_item` loại `TRANSFER_FEE` nguồn CHON theo mức người lập chọn; `OrderDto.phiDuaDon`; chặng chưa chọn ⇒ O_TRONG (không 0 đồng);
// tài khoản Đối tác gửi mức ⇒ 400. Chạy CẢ ứng dụng trên SQLite thật (tests/audit/harness.mjs). Bảng phí theo khu vực TRỐNG (ADR-0214: không còn dùng cho đơn); ngày bắt đầu áp đặt
// qua chính route của pricing. Tên người dùng GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const ADM = "55555555-5555-4555-8555-555555555555";
const DT = "88888888-8888-4888-8888-888888888888";
const LAI = "77777777-7777-4777-8777-777777777777"; // tài khoản lai Đối tác + Bán hàng (giữ PARTNER ⇒ là «tài khoản Đối tác» theo ruling P2)
const AT = "2026-10-01T00:00:00.000Z";
const BEN = "a941dd7d-faab-4098-9ab9-1df7fa6dd551"; // Bến tàu du lịch Nha Trang (0010)
const ngayVN = (n: number) => new Date(Date.now() + 7 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);
const HOM_NAY = ngayVN(0);
type W = ReturnType<typeof world>;
type Res = { status: number; text: string; json: any };

const ok = async (p: Promise<Res>, ma: number, ten = ""): Promise<Res> => {
  const r = await p;
  assert.equal(r.status, ma, `${ten} ${r.status}: ${r.text}`);
  return r;
};

/** Ngày bắt đầu áp `batDau` (null = chưa bật). Bảng mức theo khu vực để TRỐNG. */
async function setup(batDau: string | null = HOM_NAY): Promise<W> {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An Bán", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000006", name: "Quản Trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: DT, phone: "0900000008", name: "Đối Tác", perms: ["PARTNER"] });
  seedStaff(w.sqlite, { id: LAI, phone: "0900000007", name: "Lai Đối Tác", perms: ["PARTNER", "SALES"] });
  w.sqlite.prepare("INSERT INTO catalog_item (code, name, unit, price_adult, price_child, price_infant, in_sheet, first_seen_at, updated_at) VALUES ('TOUR_LAN', 'Tour lặn biển', 'perPax', 500000, 300000, 0, 1, ?, ?)").run(AT, AT);
  if (batDau !== null) await ok(w.call("POST", "/api/pricing/phi-don/bat-dau-ap", { as: ADM, body: { ngay: batDau, tuLucDaDoc: null } }), 200, "bật phí");
  return w;
}

const D = ngayVN(5);
const DS = (soTien: number) => ({ donGia: soTien, lyDo: "Văn phòng đổi" });
const SK = (soTien: number) => ({ donGia: soTien, lyDo: "Văn phòng đổi" });
const OUT = (extra: Record<string, unknown> = {}) => ({ direction: "OUT", pickupDate: "", pickupTime: "06:30", pickupLocationId: null, pickupPlace: "Khách sạn A", dropoffLocationId: BEN, dropoffPlace: "", ...extra });
const RET = (extra: Record<string, unknown> = {}) => ({ direction: "RETURN", pickupDate: ngayVN(6), pickupTime: "16:00", pickupLocationId: BEN, pickupPlace: "", dropoffLocationId: null, dropoffPlace: "Khách sạn A", ...extra });
const svc = (pax: Record<string, number>, legs: unknown[], extra: Record<string, unknown> = {}) => ({
  kind: "catalog", pickupChoice: legs.length > 0 ? "DON" : "KHONG_DON", catalogCode: "TOUR_LAN", pax: { adult: 0, child: 0, senior: 0, infant: 0, ...pax },
  catalogPriceSeen: { adult: 500000, child: 300000, infant: 0 }, departDate: D, legs, ...extra,
});
const body = (services: unknown[], extra: Record<string, unknown> = {}) => ({ customerName: "Khách Thử", customerPhone: "0912345678", services, ...extra });
const lap = async (w: W, services: unknown[], as = SALES) => (await ok(w.call("POST", "/api/orders", { as, body: body(services) }), 201, "lập đơn")).json.order;
const dongPhi = (w: W, id: string) =>
  w.q(`SELECT i.transfer_leg_id, l.direction, i.fee_calc_source, i.fee_rule_id, i.fee_kind, i.fee_zone_code, i.fee_tier_code, i.fee_return_pax, i.quantity, i.unit_price, i.line_total, i.description
       FROM order_item i JOIN ord_transfer_leg l ON l.id = i.transfer_leg_id WHERE i.order_id = ? AND i.line_kind = 'TRANSFER_FEE' ORDER BY i.sort_order`, id).map((r: any) => ({ ...r }));
const gon = (w: W, id: string) => dongPhi(w, id).map((d: any) => [d.direction, d.fee_calc_source, d.unit_price, d.quantity, d.line_total]);
const tongDong = (w: W, id: string) => Number(w.q("SELECT COALESCE(SUM(line_total), 0) AS n FROM order_item WHERE order_id = ?", id)[0].n);
const tongDichVu = (w: W, id: string) => Number(w.q("SELECT COALESCE(SUM(line_total), 0) AS n FROM order_item WHERE order_id = ? AND line_kind = 'SERVICE'", id)[0].n);
const subtotal = (w: W, id: string) => Number(w.q("SELECT subtotal FROM orders WHERE id = ?", id)[0].subtotal);
const nhatKy = (w: W, id: string, action: string) => w.q("SELECT detail FROM audit_log WHERE order_id = ? AND action = ? ORDER BY created_at", id, action).map((r: any) => String(r.detail ?? ""));
/** Chặng đang lưu → chặng của thân lưu nháp (giữ id); `doiPhi` chỉ có khi truyền. */
const changGuiLai = (l: any, extra: Record<string, unknown> = {}) => ({
  id: l.id, direction: l.direction, pickupDate: l.pickupDate, pickupTime: l.pickupTime, pickupLocationId: l.pickupLocationId, pickupPlace: l.pickupLocationId ? "" : (l.pickupPlace ?? ""),
  dropoffLocationId: l.dropoffLocationId, dropoffPlace: l.dropoffLocationId ? "" : (l.dropoffPlace ?? ""), paxOverride: l.paxOverride, ...extra,
});
const luu = (w: W, o: any, pax: Record<string, number>, legs: unknown[], as = SALES) =>
  w.call("PUT", `/api/orders/${o.id}`, { as, body: body([svc(pax, legs, { id: o.services[0].id })], { expectedUpdatedAt: o.updatedAt }) });

test("SV-PC-01 lập đơn: 2 NL + 1 em bé, chiều đi chọn 30.000 ⇒ một dòng CHON 30.000 × 2 = 60.000, tạm tính = Σ dòng, DTO dự kiến, nhật ký ghi mức", async () => {
  const w = await setup();
  const o = await lap(w, [svc({ adult: 2, infant: 1 }, [OUT({ doiPhi: DS(30_000) })])]);
  const leg = o.services[0].legs[0];
  assert.deepEqual(dongPhi(w, o.id), [{
    transfer_leg_id: leg.id, direction: "OUT", fee_calc_source: "DOI_TAY", fee_rule_id: null, fee_kind: "PER_PAX", fee_zone_code: null, fee_tier_code: null,
    fee_return_pax: null, quantity: 2, unit_price: 30_000, line_total: 60_000, description: "Phí đưa đón — chiều đi",
  }]);
  assert.equal(subtotal(w, o.id), tongDichVu(w, o.id) + 60_000);
  assert.equal(tongDong(w, o.id), subtotal(w, o.id), "tạm tính = Σ mọi dòng");
  assert.deepEqual(o.phiDuaDon.thieu, []);
  assert.equal(o.phiDuaDon.duKien, true);
  assert.deepEqual(o.phiDuaDon.dong.map((d: any) => [d.legId, d.serviceId, d.direction, d.nguon, d.kind, d.quantity, d.unitPrice, d.lineTotal, d.zoneCode]), [
    [leg.id, o.services[0].id, "OUT", "DOI_TAY", "PER_PAX", 2, 30_000, 60_000, null],
  ]);
  const ghi = nhatKy(w, o.id, "created").join(" | ");
  assert.ok(ghi.includes("phí đưa đón chiều đi · Tour lặn biển: chưa có → 30.000 ₫ × 2 (đổi số: Văn phòng đổi)"), ghi);
  assert.ok(!ghi.includes("Khách Thử"), "nhật ký không có tên khách");
});

test("SV-PC-03 số khác 70.000 × 3 = 210.000; SV-PC-06 xe riêng số khác 500.000 ⇒ × 1 (PER_TRIP); SV-PC-07 đi 20.000 × 3 + về 20.000 × 1 (số người chiều về 1)", async () => {
  const w = await setup();
  const a = await lap(w, [svc({ adult: 3 }, [OUT({ doiPhi: SK(70_000) })])]);
  assert.deepEqual(gon(w, a.id), [["OUT", "DOI_TAY", 70_000, 3, 210_000]]);
  const b = await lap(w, [svc({ adult: 4 }, [OUT({ exclusiveVehicle: true, doiPhi: SK(500_000) })])]);
  assert.deepEqual(dongPhi(w, b.id).map((d: any) => [d.fee_kind, d.quantity, d.line_total]), [["PER_TRIP", 1, 500_000]]);
  const c = await lap(w, [svc({ adult: 3 }, [OUT({ doiPhi: DS(20_000) }), RET({ paxOverride: 1, doiPhi: DS(20_000) })])]);
  assert.deepEqual(dongPhi(w, c.id).map((d: any) => [d.direction, d.quantity, d.line_total, d.fee_return_pax]).sort(), [["OUT", 3, 60_000, null], ["RETURN", 1, 20_000, 1]]);
  assert.equal(subtotal(w, c.id), tongDichVu(w, c.id) + 80_000);
});

test("ADR-0218 Đ1.5 số đổi sai (trần 5.000.000, âm, lẻ, chuỗi, thiếu / rỗng / quá dài lý do) ⇒ 400 đúng câu dùng chung; không tạo đơn; 5.000.000 và 0 được nhận", async () => {
  const w = await setup();
  const truoc = Number(w.q("SELECT count(*) AS n FROM orders")[0].n);
  const thu = async (doiPhi: unknown) => w.call("POST", "/api/orders", { as: SALES, body: body([svc({ adult: 2 }, [OUT({ doiPhi })])]) });
  const CAU_GIA = "Đơn giá phí đưa đón phải là số nguyên từ 0 đến 5.000.000 đ.";
  for (const [sai, cau] of [
    [SK(5_000_001), CAU_GIA], [SK(-5000), CAU_GIA], [SK(1500.5), CAU_GIA], [{ donGia: "70000", lyDo: "x" }, CAU_GIA], [30000, CAU_GIA], ["30000", CAU_GIA], [[], CAU_GIA],
    [{ donGia: 30_000 }, "Nhập lý do đổi phí."], [{ donGia: 30_000, lyDo: "  " }, "Nhập lý do đổi phí."], [{ donGia: 30_000, lyDo: "x".repeat(301) }, "Lý do đổi phí tối đa 300 ký tự."],
  ] as [unknown, string][]) {
    const r = await thu(sai);
    assert.equal(r.status, 400, `${JSON.stringify(sai).slice(0, 80)}: ${r.text}`);
    assert.equal(r.json.error.message, cau);
  }
  assert.equal(Number(w.q("SELECT count(*) AS n FROM orders")[0].n), truoc);
  const tran = await ok(w.call("POST", "/api/orders", { as: SALES, body: body([svc({ adult: 2 }, [OUT({ doiPhi: SK(5_000_000) })])]) }), 201, "đúng trần");
  assert.equal(subtotal(w, tran.json.order.id), tongDichVu(w, tran.json.order.id) + 10_000_000, "trần áp lên ĐƠN GIÁ: thành tiền 2 khách = 10.000.000 vượt 5.000.000 vẫn hợp lệ");
  const khong = await ok(w.call("POST", "/api/orders", { as: SALES, body: body([svc({ adult: 2 }, [OUT({ doiPhi: SK(0) })])]) }), 201, "đổi về 0");
  assert.deepEqual(gon(w, khong.json.order.id), [["OUT", "DOI_TAY", 0, 2, 0]]);
});

test("chặng không có mức ⇒ không dòng, thieu O_TRONG (có chiều + dịch vụ), tạm tính chỉ gồm dịch vụ — không bao giờ 0 đồng thay cho chưa chọn", async () => {
  const w = await setup();
  const o = await lap(w, [svc({ adult: 2 }, [OUT({ doiPhi: DS(15_000) }), RET()])]);
  const ret = o.services[0].legs.find((l: any) => l.direction === "RETURN");
  assert.deepEqual(gon(w, o.id), [["OUT", "DOI_TAY", 15_000, 2, 30_000]]);
  assert.deepEqual(o.phiDuaDon.thieu, [{ legId: ret.id, serviceId: o.services[0].id, serviceName: "Tour lặn biển", direction: "RETURN", lyDo: "O_TRONG" }]);
  assert.equal(subtotal(w, o.id), tongDichVu(w, o.id) + 30_000);
});

test("SV-PC-14 trước ngày bắt đầu áp (hoặc chưa bật) ⇒ không dòng phí dù thân có mức (mức vẫn được kiểm), phiDuaDon = null", async () => {
  for (const batDau of [ngayVN(3), null]) {
    const w = await setup(batDau);
    const o = await lap(w, [svc({ adult: 2 }, [OUT({ doiPhi: DS(30_000) })])]);
    assert.deepEqual(dongPhi(w, o.id), [], String(batDau));
    assert.equal(subtotal(w, o.id), tongDichVu(w, o.id));
    assert.equal(o.phiDuaDon, null);
    assert.ok(!nhatKy(w, o.id, "created").join("").includes("phí đưa đón"), "chưa áp ⇒ không ghi mức");
    const r = await w.call("POST", "/api/orders", { as: SALES, body: body([svc({ adult: 2 }, [OUT({ doiPhi: SK(6_000_000) })])]) });
    assert.equal(r.status, 400, "chưa áp vẫn kiểm mức");
  }
});

test("[Điểm 2] lưu nháp đổi 2 → 3 người lớn ⇒ 15.000 × 3 (gửi lại mức, HOẶC vắng khoá doiPhi = giữ mức đã lưu); doiPhi null ⇒ bỏ chọn; nhật ký chỉ ghi khi mức đổi", async () => {
  const w = await setup();
  const o = await lap(w, [svc({ adult: 2 }, [OUT({ doiPhi: DS(15_000) })])]);
  assert.deepEqual(gon(w, o.id), [["OUT", "DOI_TAY", 15_000, 2, 30_000]]);
  const l0 = o.services[0].legs[0];
  // vắng khoá doiPhi ⇒ giữ 15.000 theo id chặng, tính lại theo 3 khách
  const r1 = await ok(luu(w, o, { adult: 3 }, [changGuiLai(l0)]), 200, "lưu vắng khoá");
  assert.deepEqual(gon(w, o.id), [["OUT", "DOI_TAY", 15_000, 3, 45_000]]);
  assert.equal(subtotal(w, o.id), tongDichVu(w, o.id) + 45_000);
  assert.equal(tongDong(w, o.id), subtotal(w, o.id));
  assert.ok(!nhatKy(w, o.id, "updated").join("").includes("phí đưa đón"), "mức không đổi ⇒ không ghi");
  // gửi lại đúng mức ⇒ như trên
  const o1 = r1.json.order;
  const r2 = await ok(luu(w, o1, { adult: 3 }, [changGuiLai(o1.services[0].legs[0], { doiPhi: DS(15_000) })]), 200, "lưu gửi lại mức");
  assert.deepEqual(gon(w, o.id), [["OUT", "DOI_TAY", 15_000, 3, 45_000]]);
  // đổi mức ⇒ nhật ký ghi chiều, dịch vụ, mức cũ → mới, kiểu chọn
  const o2 = r2.json.order;
  const r3 = await ok(luu(w, o2, { adult: 3 }, [changGuiLai(o2.services[0].legs[0], { doiPhi: SK(70_000) })]), 200, "đổi mức");
  assert.deepEqual(gon(w, o.id), [["OUT", "DOI_TAY", 70_000, 3, 210_000]]);
  const ghi = nhatKy(w, o.id, "updated").join(" | ");
  assert.ok(ghi.includes("phí đưa đón chiều đi · Tour lặn biển: 15.000 ₫ × 3 (đổi số: Văn phòng đổi) → 70.000 ₫ × 3 (đổi số: Văn phòng đổi)"), ghi);
  // null ⇒ bỏ chọn: không dòng, thiếu O_TRONG
  const o3 = r3.json.order;
  const r4 = await ok(luu(w, o3, { adult: 3 }, [changGuiLai(o3.services[0].legs[0], { doiPhi: null })]), 200, "bỏ chọn");
  assert.deepEqual(dongPhi(w, o.id), []);
  assert.equal(subtotal(w, o.id), tongDichVu(w, o.id));
  assert.deepEqual(r4.json.order.phiDuaDon.thieu.map((t: any) => t.lyDo), ["O_TRONG"]);
});

test("[Điểm 1] lưu nháp sửa nơi đón một chặng (vắng khoá doiPhi) + thêm chặng mới ⇒ mức chặng cũ giữ nguyên, chặng mới «chưa chọn»", async () => {
  const w = await setup();
  const o = await lap(w, [svc({ adult: 2 }, [OUT({ doiPhi: DS(15_000) })])]);
  const l0 = o.services[0].legs[0];
  const r = await ok(luu(w, o, { adult: 2 }, [changGuiLai(l0, { pickupPlace: "Nhà riêng Dò Tìm" }), RET()]), 200, "lưu nháp");
  const legs = r.json.order.services[0].legs;
  assert.equal(legs.find((l: any) => l.direction === "OUT").id, l0.id, "id chặng giữ qua lần lưu (ADR-0047)");
  assert.deepEqual(gon(w, o.id), [["OUT", "DOI_TAY", 15_000, 2, 30_000]]);
  const ret = legs.find((l: any) => l.direction === "RETURN");
  assert.deepEqual(r.json.order.phiDuaDon.thieu.map((t: any) => [t.legId, t.lyDo]), [[ret.id, "O_TRONG"]]);
});

test("[Điểm 1] sửa chuyến trên NHÁP (PUT …/trip) đổi nơi đón ⇒ mức đã lưu theo id chặng giữ nguyên; dịch vụ thêm chặng qua /trip ⇒ chặng mới «chưa chọn», không dòng", async () => {
  const w = await setup();
  const o = await lap(w, [svc({ adult: 2 }, [OUT({ doiPhi: DS(15_000) })]), svc({ adult: 1 }, [])]);
  const [s0, s1] = o.services;
  const r = await ok(w.call("PUT", `/api/orders/${o.id}/trip`, { as: SALES, body: { expectedUpdatedAt: o.updatedAt, services: [
    { id: s0.id, departDate: D, pickupTime: "07:10", pickupPlace: "Nhà riêng Dò Tìm" },
    { id: s1.id, departDate: D, pickupTime: "07:20", pickupPlace: "Nhà riêng Hai" },
  ] } }), 200, "sửa chuyến");
  assert.deepEqual(gon(w, o.id), [["OUT", "DOI_TAY", 15_000, 2, 30_000]]);
  assert.equal(subtotal(w, o.id), tongDichVu(w, o.id) + 30_000);
  assert.equal(tongDong(w, o.id), subtotal(w, o.id));
  const moi = r.json.order.services.find((s: any) => s.id === s1.id).legs;
  assert.equal(moi.length, 1, "thân cũ có giờ + nơi đón ⇒ thêm một chặng chiều đi");
  assert.deepEqual(r.json.order.phiDuaDon.thieu.map((t: any) => [t.legId, t.lyDo]), [[moi[0].id, "O_TRONG"]]);
  // mốc đơn cũ ⇒ 409, dòng phí giữ nguyên
  const cu = await w.call("PUT", `/api/orders/${o.id}/trip`, { as: SALES, body: { expectedUpdatedAt: o.updatedAt, services: [{ id: s0.id, departDate: D, pickupTime: "08:00", pickupPlace: "Nhà khác" }] } });
  assert.equal(cu.status, 409, cu.text);
  assert.deepEqual(gon(w, o.id), [["OUT", "DOI_TAY", 15_000, 2, 30_000]]);
});

test("sửa số người chiều về trên NHÁP (PUT …/legs/:legId) ⇒ phí chiều về tính lại theo mức đã lưu, chiều đi giữ nguyên; mốc cũ ⇒ 409 không đổi gì", async () => {
  const w = await setup();
  const o = await lap(w, [svc({ adult: 3 }, [OUT({ doiPhi: DS(20_000) }), RET({ doiPhi: DS(10_000) })])]);
  const ret = o.services[0].legs.find((l: any) => l.direction === "RETURN");
  await ok(w.call("PUT", `/api/orders/${o.id}/legs/${ret.id}`, { as: SALES, body: { paxOverride: 1, expectedUpdatedAt: ret.updatedAt } }), 200, "sửa số người về");
  assert.deepEqual(dongPhi(w, o.id).map((d: any) => [d.direction, d.unit_price, d.quantity, d.line_total, d.fee_return_pax]).sort(), [["OUT", 20_000, 3, 60_000, null], ["RETURN", 10_000, 1, 10_000, 1]]);
  assert.equal(subtotal(w, o.id), tongDichVu(w, o.id) + 70_000);
  assert.equal(tongDong(w, o.id), subtotal(w, o.id));
  const truoc = dongPhi(w, o.id);
  const cu = await w.call("PUT", `/api/orders/${o.id}/legs/${ret.id}`, { as: SALES, body: { paxOverride: 2, expectedUpdatedAt: ret.updatedAt } });
  assert.equal(cu.status, 409, cu.text);
  assert.deepEqual(dongPhi(w, o.id), truoc);
});

test("tài khoản Đối tác gửi mức phí ⇒ 400 transfer_fee_not_allowed ở lập đơn, lưu nháp, sửa chặng, sửa chuyến — không ghi gì; không gửi khoá thì như thường", async () => {
  const w = await setup();
  const truoc = Number(w.q("SELECT count(*) AS n FROM orders")[0].n);
  const lapCo = await w.call("POST", "/api/orders", { as: DT, body: body([svc({ adult: 2 }, [OUT({ doiPhi: DS(30_000) })])]) });
  assert.equal(lapCo.status, 400, lapCo.text);
  assert.equal(lapCo.json.error.code, "transfer_fee_not_allowed");
  assert.equal(Number(w.q("SELECT count(*) AS n FROM orders")[0].n), truoc);
  // ĐỔI CÓ CHỦ ĐÍCH (vòng sửa 3, ruling P4b): trước đây khoá `doiPhi: null` của Đối tác được nhận; nay CÓ KHOÁ (kể cả null) ⇒ 400 — bài riêng bên dưới. Ở đây không gửi khoá.
  const o = await lap(w, [svc({ adult: 2 }, [OUT(), RET()])], DT);
  assert.deepEqual(dongPhi(w, o.id), []);
  assert.deepEqual(o.phiDuaDon.thieu.map((t: any) => t.lyDo), ["O_TRONG", "O_TRONG"]);
  const [l0, l1] = o.services[0].legs;
  const luuCo = await luu(w, o, { adult: 2 }, [changGuiLai(l0, { doiPhi: DS(0) }), changGuiLai(l1)], DT);
  assert.equal(luuCo.status, 400, luuCo.text);
  assert.equal(luuCo.json.error.code, "transfer_fee_not_allowed");
  // Đối tác thuần không có ô sửa chặng / sửa chuyến ⇒ 403 trước; tài khoản LAI (Đối tác + Bán hàng) qua ô đó vẫn bị 400 khi gửi mức.
  const ret = o.services[0].legs.find((l: any) => l.direction === "RETURN");
  assert.equal((await w.call("PUT", `/api/orders/${o.id}/legs/${ret.id}`, { as: DT, body: { paxOverride: 1, expectedUpdatedAt: ret.updatedAt, doiPhi: DS(5000) } })).status, 403);
  const k = await lap(w, [svc({ adult: 2 }, [OUT(), RET()])], LAI);
  const kRet = k.services[0].legs.find((l: any) => l.direction === "RETURN");
  const chang = await w.call("PUT", `/api/orders/${k.id}/legs/${kRet.id}`, { as: LAI, body: { paxOverride: 1, expectedUpdatedAt: kRet.updatedAt, doiPhi: DS(5000) } });
  assert.equal(chang.status, 400, chang.text);
  assert.equal(chang.json.error.code, "transfer_fee_not_allowed");
  const trip = await w.call("PUT", `/api/orders/${k.id}/trip`, { as: LAI, body: { expectedUpdatedAt: k.updatedAt, services: [{ id: k.services[0].id, departDate: D, pickupTime: "07:10", legs: [{ doiPhi: DS(5000) }] }] } });
  assert.equal(trip.status, 400, trip.text);
  assert.equal(trip.json.error.code, "transfer_fee_not_allowed");
  const lapLai = await w.call("POST", "/api/orders", { as: LAI, body: body([svc({ adult: 2 }, [OUT({ doiPhi: DS(0) })])]) });
  assert.equal(lapLai.status, 400, "tài khoản lai lập đơn kèm mức (kể cả Miễn phí) ⇒ 400");
  assert.deepEqual(dongPhi(w, k.id), []);
  assert.equal(Number(w.q("SELECT updated_at = ? AS same FROM orders WHERE id = ?", k.updatedAt, k.id)[0].same), 1, "đơn không đổi");
  assert.deepEqual(dongPhi(w, o.id), []);
  assert.equal(Number(w.q("SELECT updated_at = ? AS same FROM orders WHERE id = ?", o.updatedAt, o.id)[0].same), 1, "đơn không đổi");
});

/** Nháp mang sẵn mức đã chọn (dòng CHON 30.000 × 2 cho chặng đầu) — dựng thẳng bằng SQL: nháp của Đối tác không có đường API để có mức (dữ liệu cũ / quyền đổi sau khi lưu). */
function chenMucDaChon(w: W, orderId: string, legId: string) {
  w.sqlite.prepare(`INSERT INTO order_item (id, order_id, line_kind, transfer_leg_id, fee_kind, description, quantity, unit_price, line_total, sort_order, fee_calc_source, fee_override_reason, fee_override_by)
    VALUES (?, ?, 'TRANSFER_FEE', ?, 'PER_PAX', 'Phí đưa đón — chiều đi', 2, 30000, 60000, 9, 'DOI_TAY', 'Văn phòng đổi trước đó', 'nv-cu')`).run(crypto.randomUUID(), orderId, legId);
  w.sqlite.prepare("UPDATE orders SET subtotal = subtotal + 60000, total = total + 60000, remaining_amount = remaining_amount + 60000 WHERE id = ?").run(orderId);
}

test("[ruling P4b] tài khoản giữ quyền Đối tác (thuần và lai) gửi khoá doiPhi = null ⇒ 400 transfer_fee_not_allowed ở lập đơn, lưu nháp, sửa chặng, sửa chuyến — mức đã lưu còn nguyên", async () => {
  const w = await setup();
  const lapNull = await w.call("POST", "/api/orders", { as: DT, body: body([svc({ adult: 2 }, [OUT({ doiPhi: null })])]) });
  assert.deepEqual([lapNull.status, lapNull.json?.error?.code], [400, "transfer_fee_not_allowed"], lapNull.text);
  for (const ai of [DT, LAI]) {
    const o = await lap(w, [svc({ adult: 2 }, [OUT(), RET()])], ai);
    const [l0, l1] = o.services[0].legs;
    chenMucDaChon(w, o.id, l0.id);
    const truoc = { dong: dongPhi(w, o.id), tong: subtotal(w, o.id) };
    const moi = (await ok(w.call("GET", `/api/orders/${o.id}`, { as: ai }), 200)).json.order;
    const r = await luu(w, moi, { adult: 2 }, [changGuiLai(l0, { doiPhi: null }), changGuiLai(l1)], ai);
    assert.deepEqual([r.status, r.json?.error?.code], [400, "transfer_fee_not_allowed"], `${ai}: ${r.text}`);
    assert.deepEqual(dongPhi(w, o.id), truoc.dong, "mức đã lưu còn nguyên");
    assert.equal(subtotal(w, o.id), truoc.tong);
    if (ai === LAI) {
      const ret = moi.services[0].legs.find((l: any) => l.direction === "RETURN");
      const chang = await w.call("PUT", `/api/orders/${o.id}/legs/${ret.id}`, { as: LAI, body: { paxOverride: 1, expectedUpdatedAt: ret.updatedAt, doiPhi: null } });
      assert.deepEqual([chang.status, chang.json?.error?.code], [400, "transfer_fee_not_allowed"], chang.text);
      const trip = await w.call("PUT", `/api/orders/${o.id}/trip`, { as: LAI, body: { expectedUpdatedAt: moi.updatedAt, services: [{ id: moi.services[0].id, departDate: D, pickupTime: "07:10", legs: [{ doiPhi: null }] }] } });
      assert.deepEqual([trip.status, trip.json?.error?.code], [400, "transfer_fee_not_allowed"], trip.text);
      assert.deepEqual(dongPhi(w, o.id), truoc.dong, "mức đã lưu còn nguyên sau sửa chặng / sửa chuyến");
    }
  }
});

test("đơn ĐÃ XÁC NHẬN: sửa chuyến không đụng dòng phí đã chụp", async () => {
  const w = await setup();
  const o = await lap(w, [svc({ adult: 2 }, [OUT({ doiPhi: DS(30_000) })])]);
  await ok(w.call("POST", `/api/orders/${o.id}/status`, { as: SALES, body: { status: "confirmed" } }), 200, "xác nhận");
  const truoc = dongPhi(w, o.id);
  assert.deepEqual(gon(w, o.id), [["OUT", "DOI_TAY", 30_000, 2, 60_000]]);
  const c = (await ok(w.call("GET", `/api/orders/${o.id}`, { as: SALES }), 200)).json.order;
  assert.equal(c.phiDuaDon.duKien, false);
  await ok(w.call("PUT", `/api/orders/${o.id}/trip`, { as: SALES, body: { expectedUpdatedAt: c.updatedAt, services: [{ id: c.services[0].id, departDate: D, pickupTime: "07:10", pickupPlace: "Nhà riêng Dò Tìm" }] } }), 200, "sửa chuyến sau xác nhận");
  assert.deepEqual(dongPhi(w, o.id), truoc);
});

test("[Điểm 2] xe riêng: lưu nháp KHÔNG gửi khoá exclusiveVehicle, doiPhi ⇒ vẫn PER_TRIP × 1 = 500.000 (khoá vắng được giải TRƯỚC khi tính phí)", async () => {
  const w = await setup();
  const o = await lap(w, [svc({ adult: 4 }, [OUT({ exclusiveVehicle: true, doiPhi: SK(500_000) })])]);
  assert.deepEqual(dongPhi(w, o.id).map((d: any) => [d.fee_kind, d.quantity, d.line_total]), [["PER_TRIP", 1, 500_000]]);
  await ok(luu(w, o, { adult: 4 }, [changGuiLai(o.services[0].legs[0])]), 200, "lưu vắng khoá");
  assert.deepEqual(dongPhi(w, o.id).map((d: any) => [d.fee_kind, d.fee_calc_source, d.quantity, d.line_total]), [["PER_TRIP", "DOI_TAY", 1, 500_000]]);
  assert.equal(subtotal(w, o.id), tongDichVu(w, o.id) + 500_000);
});

test("Task 6 — GET /api/orders/phi-don-ap: công tắc cho biểu mẫu đơn chưa lưu (máy chủ so ngày, trình duyệt không tính); người không lập đơn ⇒ 403; không bị route /api/orders/:id nuốt", async () => {
  const ACC = "33333333-3333-4333-8333-333333333333";
  const chuaBat = await setup(null);
  assert.deepEqual((await ok(chuaBat.call("GET", "/api/orders/phi-don-ap", { as: SALES }), 200, "chưa bật")).json, { dangAp: false });
  const mai = await setup(ngayVN(1));
  assert.deepEqual((await ok(mai.call("GET", "/api/orders/phi-don-ap", { as: SALES }), 200, "áp từ mai")).json, { dangAp: false });
  const w = await setup(HOM_NAY);
  for (const as of [SALES, ADM, DT, LAI]) assert.deepEqual((await ok(w.call("GET", "/api/orders/phi-don-ap", { as }), 200, `áp hôm nay ${as}`)).json, { dangAp: true });
  seedStaff(w.sqlite, { id: ACC, phone: "0900000003", name: "Kế Toán", perms: ["ACCOUNTING"] });
  await ok(w.call("GET", "/api/orders/phi-don-ap", { as: ACC }), 403, "kế toán");
});
