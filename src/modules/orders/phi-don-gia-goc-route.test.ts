// Phí đưa đón do MÁY TÍNH từ giá gốc Sheet qua cả ứng dụng (ADR-0218 Đ1, Đ2; kế hoạch Task 8): lập đơn, lưu nháp, đổi bên đặt trên nháp, xác nhận (/status), Gửi đơn của Đối tác, Còn vé, «Sửa số khách».
// Mỗi ca sổ vàng `golden/phi-dua-don-gia-goc.json` mà bài hàm thuần không chạm (GG-16, GG-19) có bài tên ca ở đây; các ca còn lại chạy lại qua đường thật (GG-01, 02, 04, 08, 09 …) để so với đáp án chuẩn.
// Chạy trên SQLite thật (tests/audit/harness.mjs). Tên người dùng GIẢ; dữ liệu tự dựng.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const KT = "44444444-4444-4444-8444-444444444444";
const ADM = "55555555-5555-4555-8555-555555555555";
const LAI = "77777777-7777-4777-8777-777777777777";
const DT = "88888888-8888-4888-8888-888888888801";
const AT = "2026-10-01T00:00:00.000Z";
const BEN = "a941dd7d-faab-4098-9ab9-1df7fa6dd551"; // Bến tàu du lịch Nha Trang (0010)
const ngayVN = (n: number) => new Date(Date.now() + 7 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);
const HOM_NAY = ngayVN(0);
const D = ngayVN(5);
type W = ReturnType<typeof world>;
type Res = { status: number; text: string; json: any };
const ok = async (p: Promise<Res>, ma: number, ten = ""): Promise<Res> => { const r = await p; assert.equal(r.status, ma, `${ten} ${r.status}: ${r.text}`); return r; };

const hs = (n: number) => `dda00000-0000-4000-8000-0000000000${String(n).padStart(2, "0")}`;
const KHACH_C3 = hs(1), KHACH_C1 = hs(2), KHACH_LE = hs(3), KHACH_X = hs(4), KHACH_Y = hs(5);
function taoHoSo(w: W, id: string, ten: string) {
  w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'PERSON', ?, 1, ?, ?)").run(id, ten, AT, AT);
  w.sqlite.prepare("INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES (?, ?, ?, ?)").run(id, ten, AT, AT);
}
const giaGoc = (w: W, ma: string, moiKhach: number | null, xeRieng: number | null) =>
  w.sqlite.prepare("INSERT INTO ctl_service_transfer_price (id, catalog_code, per_pax_price, private_price, valid_from_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(crypto.randomUUID(), ma, moiKhach, xeRieng, AT, AT, AT);
const mucGiam = (w: W, cap: string, soTien: number) =>
  w.sqlite.prepare("INSERT INTO prc_transfer_fee_tier_discount (id, tier_code, amount, valid_from_date, valid_to_date, created_at, updated_at) VALUES (?, ?, ?, '2026-01-01', NULL, ?, ?)").run(crypto.randomUUID(), cap, soTien, AT, AT);
const ganCap = (w: W, party: string, cap: string) => {
  // cấp gắn riêng chỉ cho hồ sơ mang vai được hưởng hoa hồng (trigger prc_party_tier_party_ok)
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES (?, ?, 'TRAVEL_AGENCY', '2026-01-01', ?, ?)").run(`r-${party}`, party, AT, AT);
  w.sqlite.prepare("INSERT INTO prc_party_tier (id, party_id, tier_code, valid_from_date, valid_to_date, created_at, updated_at) VALUES (?, ?, ?, '2026-01-01', NULL, ?, ?)").run(crypto.randomUUID(), party, cap, AT, AT);
};

/** TOUR_LAN: giá gốc 50.000 mỗi khách, xe riêng 300.000 (như TOUR_A của sổ vàng). TOUR_TRONG: ô giá gốc trống. Cấp C3 giảm 20.000, C1 giảm 70.000. `batDau` null = chưa bật phí. */
async function setup(batDau: string | null = HOM_NAY): Promise<{ w: W; c3: string; c1: string }> {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An Bán", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: KT, phone: "0900000005", name: "Lan Kế Toán", perms: ["ACCOUNTING"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000006", name: "Quản Trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: LAI, phone: "0900000007", name: "Lai Đối Tác", perms: ["PARTNER", "SALES"] });
  seedStaff(w.sqlite, { id: DT, phone: "0900000021", name: "Đối Tác Hưởng", perms: ["PARTNER"] });
  for (const [ma, ten] of [["TOUR_LAN", "Tour lặn biển"], ["TOUR_TRONG", "Tour chưa có giá gốc"]] as const)
    w.sqlite.prepare("INSERT INTO catalog_item (code, name, unit, price_adult, price_child, price_infant, in_sheet, first_seen_at, updated_at) VALUES (?, ?, 'perPax', 500000, 300000, 0, 1, ?, ?)").run(ma, ten, AT, AT);
  giaGoc(w, "TOUR_LAN", 50_000, 300_000);
  giaGoc(w, "TOUR_TRONG", null, null);
  const c3 = (await ok(w.call("POST", "/api/pricing/muc-ta", { as: KT, body: { ten: "Đại lý cấp 3" } }), 201)).json.muc.code as string;
  const c1 = (await ok(w.call("POST", "/api/pricing/muc-ta", { as: KT, body: { ten: "Đại lý cấp 1" } }), 201)).json.muc.code as string;
  mucGiam(w, c3, 20_000); mucGiam(w, c1, 70_000);
  for (const [id, ten] of [[KHACH_C3, "Khách Ba"], [KHACH_C1, "Khách Một"], [KHACH_LE, "Khách Lẻ"], [KHACH_X, "Khách Ích"], [KHACH_Y, "Khách Ý"]] as const) taoHoSo(w, id, ten);
  ganCap(w, KHACH_C3, c3); ganCap(w, KHACH_C1, c1); ganCap(w, KHACH_X, c3); ganCap(w, KHACH_Y, c3);
  if (batDau !== null) await ok(w.call("POST", "/api/pricing/phi-don/bat-dau-ap", { as: ADM, body: { ngay: batDau, tuLucDaDoc: null } }), 200, "bật phí");
  return { w, c3, c1 };
}
const OUT = (extra: Record<string, unknown> = {}) => ({ direction: "OUT", pickupDate: "", pickupTime: "06:30", pickupLocationId: null, pickupPlace: "Khách sạn A", dropoffLocationId: BEN, dropoffPlace: "", ...extra });
const RET = (extra: Record<string, unknown> = {}) => ({ direction: "RETURN", pickupDate: ngayVN(6), pickupTime: "16:00", pickupLocationId: BEN, pickupPlace: "", dropoffLocationId: null, dropoffPlace: "Khách sạn A", ...extra });
const svc = (pax: Record<string, number>, legs: unknown[], extra: Record<string, unknown> = {}) => ({
  kind: "catalog", pickupChoice: legs.length > 0 ? "DON" : "KHONG_DON", catalogCode: "TOUR_LAN", pax: { adult: 0, child: 0, senior: 0, infant: 0, ...pax },
  catalogPriceSeen: { adult: 500000, child: 300000, infant: 0 }, departDate: D, legs, ...extra,
});
const lap = async (w: W, services: unknown[], extra: Record<string, unknown> = {}, as = SALES) =>
  (await ok(w.call("POST", "/api/orders", { as, body: { customerName: "Khách Thử", customerPhone: "0912345678", services, ...extra } }), 201, "lập đơn")).json.order;
const xacNhan = (w: W, id: string, as = SALES) => w.call("POST", `/api/orders/${id}/status`, { as, body: { status: "confirmed" } });
const dong = (w: W, id: string) => w.q(`SELECT l.direction, i.fee_calc_source AS nguon, i.fee_base_price AS goc, i.fee_tier_discount AS giam, i.fee_tier_code AS cap, i.fee_program_id AS ct, i.fee_program_name AS tenCt,
    i.fee_override_reason AS lyDo, i.fee_override_by AS nguoi, i.fee_kind AS kind, i.quantity AS sl, i.unit_price AS gia, i.line_total AS tien, i.fee_source, i.fee_choice, i.fee_rule_id, i.fee_zone_code
  FROM order_item i JOIN ord_transfer_leg l ON l.id = i.transfer_leg_id WHERE i.order_id = ? AND i.line_kind = 'TRANSFER_FEE' ORDER BY l.direction DESC`, id).map((r: any) => ({ ...r }));
const tienDon = (w: W, id: string) => ({ ...w.q("SELECT subtotal, total FROM orders WHERE id = ?", id)[0] });
const tongDong = (w: W, id: string) => Number(w.q("SELECT COALESCE(SUM(line_total), 0) AS n FROM order_item WHERE order_id = ?", id)[0].n);
const nhatKy = (w: W, id: string, action: string) => w.q("SELECT detail FROM audit_log WHERE order_id = ? AND action = ? ORDER BY created_at", id, action).map((r: any) => String(r.detail ?? "")).join(" | ");
const changGuiLai = (l: any, extra: Record<string, unknown> = {}) => ({
  id: l.id, direction: l.direction, pickupDate: l.pickupDate, pickupTime: l.pickupTime, pickupLocationId: l.pickupLocationId, pickupPlace: l.pickupLocationId ? "" : (l.pickupPlace ?? ""),
  dropoffLocationId: l.dropoffLocationId, dropoffPlace: l.dropoffLocationId ? "" : (l.dropoffPlace ?? ""), paxOverride: l.paxOverride, ...extra,
});
const luu = (w: W, o: any, pax: Record<string, number>, legs: unknown[], as = SALES, extra: Record<string, unknown> = {}) =>
  w.call("PUT", `/api/orders/${o.id}`, { as, body: { customerName: "Khách Thử", customerPhone: "0912345678", expectedUpdatedAt: o.updatedAt, services: [svc(pax, legs, { id: o.services[0].id })], ...extra } });

test("GG-02 lập đơn khách lẻ: 2 người lớn + 1 em bé đi chung ⇒ GIA_GOC 50.000 × 2 = 100.000; bản chụp giá gốc, cấp trống; fee_source / fee_choice / mã mức / vùng trống; tạm tính = Σ dòng", async () => {
  const { w } = await setup();
  const o = await lap(w, [svc({ adult: 2, infant: 1 }, [OUT()])]);
  assert.deepEqual(dong(w, o.id), [{ direction: "OUT", nguon: "GIA_GOC", goc: 50_000, giam: 0, cap: null, ct: null, tenCt: null, lyDo: null, nguoi: null, kind: "PER_PAX", sl: 2, gia: 50_000, tien: 100_000,
    fee_source: null, fee_choice: null, fee_rule_id: null, fee_zone_code: null }]);
  assert.equal(tienDon(w, o.id).subtotal, 1_000_000 + 100_000);
  assert.equal(tongDong(w, o.id), tienDon(w, o.id).subtotal);
  assert.deepEqual(o.phiDuaDon.dong.map((d: any) => [d.nguon, d.lyDoDoi, d.tenChuongTrinh, d.unitPrice, d.lineTotal]), [["GIA_GOC", null, null, 50_000, 100_000]]);
  assert.equal(o.phiDuaDon.duKien, true);
  assert.match(nhatKy(w, o.id, "created"), /phí đưa đón chiều đi · Tour lặn biển: chưa có → 50\.000 ₫ × 2 \(giá gốc\)/);
});

test("GG-01 đại lý cấp C3 (giảm 20.000) ⇒ 30.000 × 2 = 60.000, chụp mức giảm và mã cấp; GG-04 cấp C1 giảm 70.000 > giá gốc ⇒ 0 đ nhưng VẪN có dòng; GG-08 xe riêng C3 ⇒ 300.000 × 1, không giảm", async () => {
  const { w, c3, c1 } = await setup();
  const a = await lap(w, [svc({ adult: 2, infant: 1 }, [OUT()])], { bookerPartyId: KHACH_C3 });
  assert.deepEqual(dong(w, a.id).map((d: any) => [d.nguon, d.goc, d.giam, d.cap, d.sl, d.gia, d.tien]), [["GIA_GOC", 50_000, 20_000, c3, 2, 30_000, 60_000]]);
  const b = await lap(w, [svc({ adult: 2 }, [OUT()])], { bookerPartyId: KHACH_C1 });
  assert.deepEqual(dong(w, b.id).map((d: any) => [d.nguon, d.goc, d.giam, d.cap, d.sl, d.gia, d.tien]), [["GIA_GOC", 50_000, 70_000, c1, 2, 0, 0]]);
  assert.equal(tienDon(w, b.id).subtotal, 1_000_000, "tiền 0 vẫn có dòng phí nhưng không cộng gì");
  const c = await lap(w, [svc({ adult: 4 }, [OUT({ exclusiveVehicle: true })])], { bookerPartyId: KHACH_C3 });
  assert.deepEqual(dong(w, c.id).map((d: any) => [d.kind, d.goc, d.giam, d.cap, d.sl, d.gia, d.tien]), [["PER_TRIP", 300_000, 0, c3, 1, 300_000, 300_000]]);
});

test("GG-18 chiều về chỉ 1 người trong 2 người lớn, đại lý C3 ⇒ đi 30.000 × 2 + về 30.000 × 1 = 90.000; số người chiều về GỐC chụp vào fee_return_pax", async () => {
  const { w } = await setup();
  const o = await lap(w, [svc({ adult: 2 }, [OUT(), RET({ paxOverride: 1 })])], { bookerPartyId: KHACH_C3 });
  assert.deepEqual(dong(w, o.id).map((d: any) => [d.direction, d.sl, d.gia, d.tien]).sort(), [["OUT", 2, 30_000, 60_000], ["RETURN", 1, 30_000, 30_000]]);
  assert.equal(tienDon(w, o.id).subtotal, 1_000_000 + 90_000);
});

test("ô giá gốc trống ⇒ KHÔNG dòng, `thieu` O_TRONG (không bao giờ 0 đồng); /status 409 transfer_fee_missing nêu tên dịch vụ; «Đổi phí» có lý do ⇒ xác nhận được", async () => {
  const { w } = await setup();
  const o = await lap(w, [svc({ adult: 2 }, [OUT()], { catalogCode: "TOUR_TRONG" })]);
  assert.deepEqual(dong(w, o.id), []);
  assert.deepEqual(o.phiDuaDon.thieu.map((t: any) => [t.lyDo, t.serviceName, t.direction]), [["O_TRONG", "Tour chưa có giá gốc", "OUT"]]);
  const r = await xacNhan(w, o.id);
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "transfer_fee_missing");
  assert.match(r.json.error.message, /Tour chưa có giá gốc/);
  const l0 = o.services[0].legs[0];
  await ok(luu(w, o, { adult: 2 }, [changGuiLai(l0, { doiPhi: { donGia: 40_000, lyDo: "Chốt giá riêng với khách" } })], SALES, {}), 200, "đổi phí");
  await ok(xacNhan(w, o.id), 200, "xác nhận");
  assert.deepEqual(dong(w, o.id).map((d: any) => [d.nguon, d.gia, d.tien, d.lyDo, d.nguoi]), [["DOI_TAY", 40_000, 80_000, "Chốt giá riêng với khách", SALES]]);
});

test("đổi số có lý do ⇒ DOI_TAY, thắng giá gốc và cấp; lưu lại nháp (khoá vắng) GIỮ số và người đổi gốc; null ⇒ bỏ đổi; không lý do ⇒ 400; nhật ký che số điện thoại trong lý do; Đối tác không thấy lý do", async () => {
  const { w } = await setup();
  const o = await lap(w, [svc({ adult: 2 }, [OUT()])], { bookerPartyId: KHACH_C3 });
  const l0 = o.services[0].legs[0];
  const sai = await luu(w, o, { adult: 2 }, [changGuiLai(l0, { doiPhi: { donGia: 80_000, lyDo: "" } })]);
  assert.equal(sai.status, 400, sai.text);
  const r1 = await ok(luu(w, o, { adult: 2 }, [changGuiLai(l0, { doiPhi: { donGia: 80_000, lyDo: "Khách ở xa, gọi 0901234567" } })], SALES, { bookerPartyId: KHACH_C3 }), 200, "đổi số");
  assert.deepEqual(dong(w, o.id).map((d: any) => [d.nguon, d.gia, d.tien, d.nguoi, d.goc]), [["DOI_TAY", 80_000, 160_000, SALES, null]]);
  assert.doesNotMatch(nhatKy(w, o.id, "updated"), /0901234567/, "nhật ký không để lọt số điện thoại");
  assert.match(nhatKy(w, o.id, "updated"), /\(đổi số: Khách ở xa, gọi •+\)/);
  assert.equal(r1.json.order.phiDuaDon.dong[0].lyDoDoi, "Khách ở xa, gọi 0901234567", "văn phòng thấy lý do");
  // quản trị lưu lại KHÔNG gửi khoá doiPhi ⇒ giữ số, người đổi vẫn là người đầu
  const o1 = r1.json.order;
  await ok(luu(w, o1, { adult: 3 }, [changGuiLai(o1.services[0].legs[0])], SALES, { bookerPartyId: KHACH_C3 }), 200, "lưu lại không khoá");
  assert.deepEqual(dong(w, o.id).map((d: any) => [d.nguon, d.gia, d.sl, d.tien, d.nguoi]), [["DOI_TAY", 80_000, 3, 240_000, SALES]]);
  // null ⇒ bỏ đổi tay, máy tính lại theo giá gốc và cấp (C3: 30.000)
  const o2 = (await ok(w.call("GET", `/api/orders/${o.id}`, { as: SALES }), 200)).json.order;
  await ok(luu(w, o2, { adult: 3 }, [changGuiLai(o2.services[0].legs[0], { doiPhi: null })], SALES, { bookerPartyId: KHACH_C3 }), 200, "bỏ đổi");
  assert.deepEqual(dong(w, o.id).map((d: any) => [d.nguon, d.gia, d.sl, d.tien]), [["GIA_GOC", 30_000, 3, 90_000]]);
});

test("đổi bên đặt trên NHÁP (PUT /booker) tính lại phí cùng lô: khách lẻ 100.000 → đại lý C3 60.000; tạm tính = Σ dòng; nhật ký ghi cũ → mới; đơn đã xác nhận KHÔNG tính lại", async () => {
  const { w } = await setup();
  const o = await lap(w, [svc({ adult: 2 }, [OUT()])], { bookerPartyId: KHACH_LE });
  assert.deepEqual(dong(w, o.id).map((d: any) => [d.gia, d.tien]), [[50_000, 100_000]]);
  const r = await ok(w.call("PUT", `/api/orders/${o.id}/booker`, { as: SALES, body: { customerName: "Khách Thử", customerPhone: "0912345678", bookerPartyId: KHACH_C3, expectedUpdatedAt: o.updatedAt } }), 200, "đổi bên đặt");
  assert.deepEqual(dong(w, o.id).map((d: any) => [d.nguon, d.goc, d.giam, d.gia, d.tien]), [["GIA_GOC", 50_000, 20_000, 30_000, 60_000]]);
  assert.equal(tienDon(w, o.id).subtotal, 1_000_000 + 60_000);
  assert.equal(tongDong(w, o.id), tienDon(w, o.id).subtotal);
  assert.match(nhatKy(w, o.id, "booker_changed"), /phí đưa đón chiều đi · Tour lặn biển: 50\.000 ₫ × 2 \(giá gốc\) → 30\.000 ₫ × 2 \(giá gốc\)/);
  assert.equal(r.json.order.phiDuaDon.dong[0].lineTotal, 60_000);
  // mốc cũ ⇒ 409, dòng phí không đổi (câu phí gác cùng mốc với câu đổi bên đặt)
  const truoc = dong(w, o.id);
  const cu = await w.call("PUT", `/api/orders/${o.id}/booker`, { as: SALES, body: { customerName: "Khách Thử", customerPhone: "0912345678", bookerPartyId: KHACH_C1, expectedUpdatedAt: o.updatedAt } });
  assert.equal(cu.status, 409, cu.text);
  assert.deepEqual(dong(w, o.id), truoc);
  assert.equal(tienDon(w, o.id).subtotal, 1_060_000);
  await ok(xacNhan(w, o.id), 200, "xác nhận");
  await ok(w.call("PUT", `/api/orders/${o.id}/booker`, { as: SALES, body: { customerName: "Khách Thử", customerPhone: "0912345678", bookerPartyId: KHACH_C1, expectedUpdatedAt: (await ok(w.call("GET", `/api/orders/${o.id}`, { as: SALES }), 200)).json.order.updatedAt } }), 200, "đổi bên đặt sau xác nhận");
  assert.deepEqual(dong(w, o.id).map((d: any) => [d.gia, d.tien]), [[30_000, 60_000]], "đơn đã xác nhận giữ phí đã chụp");
});

test("chương trình miễn phí: tạo TRƯỚC xác nhận ⇒ đơn nháp tính lại ở lần xác nhận (CHUONG_TRINH 0 đ, chụp mã và tên); tạo SAU xác nhận ⇒ đơn đã xác nhận giữ nguyên (Đ2.4); chương trình theo đối tác chỉ áp cho bên đặt đó (GG-12, GG-12b)", async () => {
  const { w } = await setup();
  const a = await lap(w, [svc({ adult: 2 }, [OUT()])], { bookerPartyId: KHACH_X });
  const b = await lap(w, [svc({ adult: 2 }, [OUT()])], { bookerPartyId: KHACH_Y });
  const c = await lap(w, [svc({ adult: 2 }, [OUT()])], { bookerPartyId: KHACH_LE });
  await ok(xacNhan(w, c.id), 200, "xác nhận trước khi có chương trình");
  const ct = await ok(w.call("POST", "/api/pricing/chuong-trinh-phi-don", { as: ADM, body: { name: "Miễn phí đón cho khách Ích", scope: "PARTNERS", parties: [KHACH_X], tripFrom: HOM_NAY, tripTo: ngayVN(30), includePrivate: false } }), 201, "tạo chương trình");
  const maCt = ct.json.chuongTrinh?.id ?? ct.json.id;
  await ok(xacNhan(w, a.id), 200); await ok(xacNhan(w, b.id), 200);
  assert.deepEqual(dong(w, a.id).map((d: any) => [d.nguon, d.gia, d.tien, d.tenCt]), [["CHUONG_TRINH", 0, 0, "Miễn phí đón cho khách Ích"]], "GG-12: đơn của X ⇒ 0 đ");
  assert.ok(dong(w, a.id)[0].ct, "chụp mã chương trình");
  void maCt;
  assert.deepEqual(dong(w, b.id).map((d: any) => [d.nguon, d.gia, d.tien]), [["GIA_GOC", 30_000, 60_000]], "GG-12b: đơn của Y (cùng cấp C3) ⇒ 60.000");
  assert.deepEqual(dong(w, c.id).map((d: any) => [d.nguon, d.gia, d.tien]), [["GIA_GOC", 50_000, 100_000]], "chương trình tạo SAU xác nhận không đổi đơn đã xác nhận");
  assert.match(nhatKy(w, a.id, "confirmed"), /phí đưa đón chiều đi · Tour lặn biển: 30\.000 ₫ × 2 \(giá gốc\) → Miễn phí \(chương trình «Miễn phí đón cho khách Ích»\)/);
});

test("GG-16 trước ngày bắt đầu áp (hoặc chưa bật) ⇒ không dòng phí dù ô Sheet trống, không chặn xác nhận; phiDuaDon = null", async () => {
  for (const batDau of [ngayVN(30), null]) {
    const { w } = await setup(batDau);
    const o = await lap(w, [svc({ adult: 2 }, [OUT()], { catalogCode: "TOUR_TRONG" })]);
    assert.deepEqual(dong(w, o.id), [], String(batDau));
    assert.equal(o.phiDuaDon, null);
    await ok(xacNhan(w, o.id), 200, "xác nhận khi phí chưa áp");
    assert.deepEqual(dong(w, o.id), []);
    assert.equal(tienDon(w, o.id).subtotal, 1_000_000);
  }
});

test("GG-19 «Sửa số khách» sau xác nhận: tính lại theo ĐƠN GIÁ ĐÃ CHỤP, không theo mức giảm hiện hành — C3 giảm 20.000 chụp 30.000; Kế toán đổi mức giảm (hôm nay không còn mức nào, mức 10.000 chỉ từ ngày mai); sửa 2 → 4 người lớn ⇒ 30.000 × 4 = 120.000", async () => {
  const { w, c3 } = await setup();
  const o = await lap(w, [svc({ adult: 2 }, [OUT()])], { bookerPartyId: KHACH_C3 });
  await ok(xacNhan(w, o.id), 200);
  assert.deepEqual(dong(w, o.id).map((d: any) => [d.gia, d.sl, d.tien]), [[30_000, 2, 60_000]]);
  w.sqlite.prepare("UPDATE prc_transfer_fee_tier_discount SET valid_to_date = ?, updated_at = ? WHERE tier_code = ? AND valid_to_date IS NULL").run(HOM_NAY, "2026-11-18T00:00:00.000Z", c3);
  w.sqlite.prepare("INSERT INTO prc_transfer_fee_tier_discount (id, tier_code, amount, valid_from_date, valid_to_date, created_at, updated_at) VALUES (?, ?, 10000, ?, NULL, ?, ?)").run(crypto.randomUUID(), c3, ngayVN(1), AT, AT);
  const v = (await ok(w.call("GET", `/api/orders/${o.id}`, { as: SALES }), 200)).json.order;
  const r = await ok(w.call("POST", `/api/orders/${o.id}/money-edit`, { as: SALES, body: { lyDo: "THEM_NGUOI", services: [{ id: v.services[0].id, pax: { adult: 4, child: 0, senior: 0, infant: 0 } }] } }), 200, "sửa số khách");
  assert.deepEqual(r.json.order.phiDuaDon.dong.map((d: any) => [d.unitPrice, d.quantity, d.lineTotal]), [[30_000, 4, 120_000]], "đơn giá đã chụp 30.000, không phải 40.000 theo mức giảm mới");
  assert.deepEqual(dong(w, o.id).map((d: any) => [d.gia, d.sl, d.goc, d.giam]), [[30_000, 2, 50_000, 20_000]], "dòng đã lưu đóng băng; số hiệu lực nằm ở dòng điều chỉnh");
});

test("Đối tác Gửi đơn: ô Sheet có số ⇒ nhánh B (xác nhận thẳng, phí chụp GIA_GOC); ô trống ⇒ nhánh A (cờ thiếu phí, lý do PHI_DON); Còn vé đổi số ⇒ xác nhận", async () => {
  const { w } = await setup();
  const b = await lap(w, [svc({ adult: 2 }, [OUT()])], {}, DT);
  const gb = await ok(w.call("POST", `/api/orders/${b.id}/gui-don`, { as: DT, body: {} }), 200, "gửi đơn nhánh B");
  assert.equal(gb.json.nhanh, "B");
  assert.deepEqual(dong(w, b.id).map((d: any) => [d.nguon, d.gia, d.tien]), [["GIA_GOC", 50_000, 100_000]]);
  assert.equal(tienDon(w, b.id).total, 1_100_000);
  const a = await lap(w, [svc({ adult: 2 }, [OUT()], { catalogCode: "TOUR_TRONG" })], {}, DT);
  const ga = await ok(w.call("POST", `/api/orders/${a.id}/gui-don`, { as: DT, body: {} }), 201, "gửi đơn nhánh A");
  assert.equal(ga.json.nhanh, "A");
  assert.deepEqual(ga.json.yeuCau.vi, ["PHI_DON"]);
  const v = (await ok(w.call("GET", `/api/orders/${a.id}`, { as: ADM }), 200)).json;
  assert.deepEqual(v.order.phiDuaDon.thieu.map((t: any) => t.lyDo), ["O_TRONG"]);
  const l0 = v.order.services[0].legs[0];
  const conVe = (them: Record<string, unknown>) => w.call("POST", `/api/orders/${a.id}/quyet-dinh`, { as: ADM, body: { ketQua: "CON_VE", yeuCauId: v.xacNhan.yeuCau.id, updatedAt: v.order.updatedAt, ...them } });
  assert.equal((await conVe({})).status, 409, "chưa có số ⇒ thiếu phí");
  await ok(conVe({ doiPhi: [{ legId: l0.id, donGia: 25_000, lyDo: "Báo giá riêng" }] }), 200, "Còn vé kèm số đổi");
  assert.deepEqual(dong(w, a.id).map((d: any) => [d.nguon, d.gia, d.tien, d.nguoi]), [["DOI_TAY", 25_000, 50_000, ADM]]);
});

test("trình duyệt cũ gửi khoá `phiDon` (danh sách mức ADR-0214) ⇒ 400 client_outdated «Nền tảng vừa cập nhật. Tải lại trang rồi thử lại.» ở lập đơn, lưu nháp, Còn vé — không ghi gì; Đối tác gửi `phiDon` hoặc `doiPhi` ⇒ 400 transfer_fee_not_allowed (ưu tiên hơn)", async () => {
  const { w } = await setup();
  const truoc = Number(w.q("SELECT count(*) AS n FROM orders")[0].n);
  const cu = { loai: "DANH_SACH", soTien: 30_000 };
  const lapCu = await w.call("POST", "/api/orders", { as: SALES, body: { customerName: "Khách Thử", customerPhone: "0912345678", services: [svc({ adult: 2 }, [OUT({ phiDon: cu })])] } });
  assert.deepEqual([lapCu.status, lapCu.json.error.code, lapCu.json.error.message], [400, "client_outdated", "Nền tảng vừa cập nhật. Tải lại trang rồi thử lại."]);
  assert.equal(Number(w.q("SELECT count(*) AS n FROM orders")[0].n), truoc);
  const o = await lap(w, [svc({ adult: 2 }, [OUT()])]);
  const luuCu = await luu(w, o, { adult: 2 }, [changGuiLai(o.services[0].legs[0], { phiDon: cu })]);
  assert.deepEqual([luuCu.status, luuCu.json.error.code], [400, "client_outdated"]);
  assert.deepEqual(dong(w, o.id).map((d: any) => d.nguon), ["GIA_GOC"], "không ghi gì");
  // Còn vé: thân cũ `phiDon: [{ legId, muc }]`
  const { w: w2 } = await setup();
  const d = await lap(w2, [svc({ adult: 2 }, [OUT()], { catalogCode: "TOUR_TRONG" })], {}, DT);
  await ok(w2.call("POST", `/api/orders/${d.id}/gui-don`, { as: DT, body: {} }), 201);
  const v = (await ok(w2.call("GET", `/api/orders/${d.id}`, { as: ADM }), 200)).json;
  const cv = await w2.call("POST", `/api/orders/${d.id}/quyet-dinh`, { as: ADM, body: { ketQua: "CON_VE", yeuCauId: v.xacNhan.yeuCau.id, updatedAt: v.order.updatedAt, phiDon: [{ legId: v.order.services[0].legs[0].id, muc: cu }] } });
  assert.deepEqual([cv.status, cv.json.error.code], [400, "client_outdated"]);
  // Đối tác: cả hai khoá ⇒ transfer_fee_not_allowed
  for (const khoa of [{ phiDon: cu }, { doiPhi: { donGia: 1000, lyDo: "x" } }]) {
    for (const ai of [DT, LAI]) {
      const r = await w.call("POST", "/api/orders", { as: ai, body: { customerName: "Khách Thử", customerPhone: "0912345678", services: [svc({ adult: 2 }, [OUT(khoa)])] } });
      assert.deepEqual([r.status, r.json.error.code], [400, "transfer_fee_not_allowed"], JSON.stringify(khoa));
    }
  }
  assert.equal(Number(w.q("SELECT count(*) AS n FROM orders")[0].n), truoc + 1, "chỉ đơn `o` hợp lệ");
});

test("sửa chặng trên NHÁP: sửa số người chiều về ⇒ tính lại; đổi NGÀY ĐI sang ngày nằm trong chương trình miễn phí (PUT /trip) ⇒ phí tính theo ngày đón MỚI ⇒ 0 đ", async () => {
  const { w } = await setup();
  const o = await lap(w, [svc({ adult: 3 }, [OUT(), RET()])]);
  assert.deepEqual(dong(w, o.id).map((d: any) => [d.direction, d.sl, d.tien]).sort(), [["OUT", 3, 150_000], ["RETURN", 3, 150_000]]);
  const ret = o.services[0].legs.find((l: any) => l.direction === "RETURN");
  await ok(w.call("PUT", `/api/orders/${o.id}/legs/${ret.id}`, { as: SALES, body: { paxOverride: 1, expectedUpdatedAt: ret.updatedAt } }), 200, "số người về");
  assert.deepEqual(dong(w, o.id).map((d: any) => [d.direction, d.sl, d.tien, d.nguon]).sort(), [["OUT", 3, 150_000, "GIA_GOC"], ["RETURN", 1, 50_000, "GIA_GOC"]]);
  assert.equal(tienDon(w, o.id).subtotal, tongDong(w, o.id));
  // chương trình chỉ phủ ngày đi D+8…D+10; nháp đang đi D+5 ⇒ chưa khớp; PUT /trip dời ngày đi sang D+8 ⇒ chặng đi dời theo ⇒ khớp chương trình ngay lúc lưu
  await ok(w.call("POST", "/api/pricing/chuong-trinh-phi-don", { as: ADM, body: { name: "Miễn phí đón tuần sau", scope: "ALL", tripFrom: ngayVN(8), tripTo: ngayVN(10), includePrivate: false } }), 201, "tạo chương trình");
  assert.ok(dong(w, o.id).every((d: any) => d.nguon === "GIA_GOC"));
  const v = (await ok(w.call("GET", `/api/orders/${o.id}`, { as: SALES }), 200)).json.order;
  await ok(w.call("PUT", `/api/orders/${o.id}/trip`, { as: SALES, body: { expectedUpdatedAt: v.updatedAt, services: [{ id: v.services[0].id, departDate: ngayVN(8) }] } }), 200, "dời ngày đi");
  const sau = dong(w, o.id).map((d: any) => [d.direction, d.nguon, d.tien]).sort();
  assert.deepEqual(sau.find((d: any) => d[0] === "OUT"), ["OUT", "CHUONG_TRINH", 0], "chặng đi dời theo ngày đi mới ⇒ khớp chương trình");
  assert.equal(tienDon(w, o.id).subtotal, tongDong(w, o.id));
});
