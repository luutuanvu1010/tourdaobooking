// Tiền SAU xác nhận theo mức do văn phòng CHỌN (ADR-0214, Task 5; sổ vàng golden/phi-dua-don-chon.json SV-PC-02, 11, 12, 13, 15).
// Các hàm đọc tiền (đọc dòng TRANSFER_FEE: đơn giá đã chụp × số khách) không phụ thuộc nguồn mức; bài này khoá điều đó bằng số của sổ vàng. Không gieo bảng phí khu vực.
// Chạy CẢ ứng dụng trên SQLite thật (tests/audit/harness.mjs). Tên người dùng GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { app, world, seedStaff } from "../tests/audit/harness.mjs";
import { buildConfirmation, MIEN_PHI } from "./shared/order-confirmation.ts";
import { chiaPhanBienNhan } from "./modules/receipt/rules.ts";
import type { BanChup } from "./shared/hoa-hong-dong.ts";
import type { OrderDetailDto } from "./shared/contracts.ts";

const SALES = "11111111-1111-4111-8111-111111111111";
const ADM = "55555555-5555-4555-8555-555555555555";
const SUP = "77777777-7777-4777-8777-777777777777";
const ACC = "33333333-3333-4333-8333-333333333333";
const DT = "88888888-8888-4888-8888-888888888801";
const BEN_DT = `pty-${DT}`;
const AT = "2026-10-01T00:00:00.000Z";
const BEN = "a941dd7d-faab-4098-9ab9-1df7fa6dd551";
const KS_CR = "cccccccc-0000-4000-8000-000000000001";
const ngayVN = (n: number) => new Date(Date.now() + 7 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);
const HOM_NAY = ngayVN(0);
const D = ngayVN(5);
type W = ReturnType<typeof world>;
type Res = { status: number; text: string; json: any };
type Pax = { adult: number; child?: number; senior?: number; infant?: number };
const ok = async (p: Promise<Res>, ma: number, ten = ""): Promise<Res> => {
  const r = await p;
  assert.equal(r.status, ma, `${ten} ${r.status}: ${r.text}`);
  return r;
};
/** ADR-0218: «mức chọn» cũ nay là số văn phòng ĐỔI (kèm lý do) — đúng đường đổi số của lượt đón. */
const mucChon = (soTien: number) => ({ donGia: soTien, lyDo: "Văn phòng đổi thử" });
async function setup(): Promise<W> {
  const w = world({});
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An Bán", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000006", name: "Quản Trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: SUP, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  seedStaff(w.sqlite, { id: DT, phone: "0900000021", name: "Đối Tác Hưởng", perms: ["PARTNER"] });
  seedStaff(w.sqlite, { id: ACC, phone: "0900000003", name: "Cúc Kế Toán", perms: ["ACCOUNTING"] });
  w.sqlite.prepare("INSERT INTO catalog_item (code, name, unit, price_adult, price_child, in_sheet, first_seen_at, updated_at) VALUES ('TOUR_LAN', 'Tour lặn biển', 'perPax', 500000, 300000, 1, ?, ?)").run(AT, AT);
  w.sqlite.prepare("INSERT INTO catalog_item (code, name, unit, price_adult, price_child, in_sheet, first_seen_at, updated_at) VALUES ('TOUR_600', 'Tour lặn biển cao cấp', 'perPax', 600000, 300000, 1, ?, ?)").run(AT, AT);
  w.sqlite.prepare("INSERT INTO loc_location (id, code, name, location_type_code, active, created_at, updated_at) VALUES (?, 'KS_CR', 'Khách sạn Cam Ranh', 'HOTEL', 1, ?, ?)").run(KS_CR, AT, AT);
  const tuLuc = (await ok(w.call("GET", "/api/pricing/phi-don", { as: ADM }), 200)).json.batDauAp.tuLuc;
  await ok(w.call("POST", "/api/pricing/phi-don/bat-dau-ap", { as: ADM, body: { ngay: HOM_NAY, tuLucDaDoc: tuLuc } }), 200, "bật phí");
  return w;
}
const OUT = (muc: number) => ({ direction: "OUT", pickupDate: "", pickupTime: "06:30", pickupLocationId: KS_CR, pickupPlace: "", dropoffLocationId: BEN, dropoffPlace: "", doiPhi: mucChon(muc) });
const RET = (muc: number) => ({ direction: "RETURN", pickupDate: D, pickupTime: "16:00", pickupLocationId: BEN, pickupPlace: "", dropoffLocationId: KS_CR, dropoffPlace: "", doiPhi: mucChon(muc) });
const P = (p: Pax) => ({ adult: 0, child: 0, senior: 0, infant: 0, ...p });
const svc = (pax: Pax, legs: unknown[], ma: "TOUR_LAN" | "TOUR_600" = "TOUR_LAN") => ({
  kind: "catalog", pickupChoice: legs.length > 0 ? "DON" : "KHONG_DON", catalogCode: ma, pax: P(pax), catalogPriceSeen: { adult: ma === "TOUR_LAN" ? 500000 : 600000, child: 300000 }, departDate: D, legs,
});
async function lapXacNhan(w: W, services: unknown[], o: { extra?: Record<string, unknown>; as?: string } = {}) {
  const as = o.as ?? SALES;
  const lap = (await ok(w.call("POST", "/api/orders", { as, body: { customerName: "Khách Thử", customerPhone: "0912345678", services, ...o.extra } }), 201, "lập đơn")).json.order;
  await ok(w.call("POST", `/api/orders/${lap.id}/status`, { as, body: { status: "confirmed" } }), 200, "xác nhận");
  return don(w, lap.id, as);
}
const don = async (w: W, id: string, as = SALES) => (await ok(w.call("GET", `/api/orders/${id}`, { as }), 200, "đọc đơn")).json.order;
const phiTrenDon = (o: any) => o.phiDuaDon.dong.map((d: any) => ({ direction: d.direction, quantity: d.quantity, unitPrice: d.unitPrice, lineTotal: d.lineTotal }));
const dongPhiDaLuu = (w: W, id: string) => w.q("SELECT fee_calc_source, quantity, unit_price, line_total FROM order_item WHERE order_id = ? AND line_kind = 'TRANSFER_FEE' ORDER BY sort_order", id).map((r: any) => ({ ...r }));
const bienNhan = async (w: W, id: string, as = SALES) => (await ok(w.call("GET", `/api/orders/${id}/receipt`, { as }), 200, "biên nhận")).json.receipt;

test("SV-PC-11: chọn 15.000, 2 người lớn ⇒ 30.000; sửa số khách thành 3 ⇒ 15.000 × 3 = 45.000 ở chi tiết đơn, danh sách, biên nhận; dòng đã lưu không đổi", async () => {
  const w = await setup();
  const o = await lapXacNhan(w, [svc({ adult: 2 }, [OUT(15_000)])]);
  assert.deepEqual(phiTrenDon(o), [{ direction: "OUT", quantity: 2, unitPrice: 15_000, lineTotal: 30_000 }]);
  const r = await ok(w.call("POST", `/api/orders/${o.id}/money-edit`, { as: SALES, body: { lyDo: "THEM_NGUOI", services: [{ id: o.services[0].id, pax: P({ adult: 3 }) }] } }), 200, "sửa số khách");
  assert.deepEqual(phiTrenDon(r.json.order), [{ direction: "OUT", quantity: 3, unitPrice: 15_000, lineTotal: 45_000 }]);
  const sau = await don(w, o.id);
  assert.deepEqual(phiTrenDon(sau), [{ direction: "OUT", quantity: 3, unitPrice: 15_000, lineTotal: 45_000 }]);
  assert.equal(sau.total, 1_500_000 + 45_000);
  assert.deepEqual(dongPhiDaLuu(w, o.id), [{ fee_calc_source: "DOI_TAY", quantity: 2, unit_price: 15_000, line_total: 30_000 }], "dòng đã lưu đóng băng, nguồn DOI_TAY");
  const ds = (await ok(w.call("GET", "/api/orders?status=confirmed", { as: SALES }), 200)).json;
  assert.equal((ds.orders.find((x: any) => x.id === o.id)).total, 1_545_000, "danh sách");
  assert.equal((await bienNhan(w, o.id)).total, 1_545_000, "biên nhận");
});

test("SV-PC-12: đại lý Trả sau, tour 600.000 × 2, hoa hồng 120.000, phí chọn 30.000 × 2 ⇒ khách trả 1.260.000, đại lý nợ 1.140.000, hoa hồng vẫn 120.000", async () => {
  const w = await setup();
  await ok(w.call("POST", "/api/pricing/hoa-hong", { as: ACC, body: { doiTuong: { loai: "VAI", code: "TRAVEL_AGENCY" }, phamVi: "ALL", tuNgay: "2026-01-01", kieu: "RATE", tyLeBp: 1000 } }), 201, "hoa hồng");
  assert.equal((await w.call("POST", "/api/tra-sau/han-muc", { as: SUP, body: { partyId: BEN_DT, hanMuc: 10_000_000, gioTra: 168, gioAnHan: 0, lyDo: "thử" } })).status, 201);
  const o = await lapXacNhan(w, [svc({ adult: 2 }, [OUT(30_000)], "TOUR_600")], { extra: { bookerPartyId: BEN_DT, paymentTerm: "CREDIT" } });
  assert.equal(o.total, 1_260_000, "khách trả");
  assert.deepEqual(dongPhiDaLuu(w, o.id), [{ fee_calc_source: "DOI_TAY", quantity: 2, unit_price: 30_000, line_total: 60_000 }]);
  const g = (await app.giaDaiLyNhieuDon(w.env.DB, [o.id])).get(o.id);
  assert.deepEqual([g.dong.map((d: any) => [d.thanhTien, d.hoaHong, d.giaDaiLy]), g.phiDon, g.tong], [[[1_200_000, 120_000, 1_080_000]], 60_000, 1_140_000]);
  const p = (await ok(w.call("GET", `/api/orders/${o.id}/cong-no-dai-ly`, { as: ACC }), 200, "phiếu")).json.phieu;
  assert.deepEqual([p.tong, p.conLai], [1_140_000, 1_140_000]);
});

const CT = "pty-ct";
const chupHt: BanChup = { serviceId: "ht", beneficiaryPartyId: null, hoaHong: { status: "NONE" }, cungUng: { status: "SET", termId: "t", sellerPartyId: "ht", supplierPartyId: "ht", costRateBp: 8000 } } as BanChup;
const banHt = { chup: [chupHt], ten: new Map([["ht", "Hòn Tằm"]]), congTyChuId: CT };
const donHonTam = (phi: number, giam: number): OrderDetailDto => ({
  id: "o", orderCode: "TD-1", staffId: "s", staffName: "", bookerPartyId: null, bookerName: null, bookerLaDoiTac: false, manifestExempt: false, status: "confirmed",
  customerName: "Khách", customerPhone: "0900000000", customerEmail: null, customerNote: null, subtotal: 1_000_000 + phi, discount: giam, total: 1_000_000 + phi - giam, giamGiaHieuLuc: giam,
  paymentNote: null, createdAt: "", updatedAt: "", confirmedAt: "", deliveredAt: null, completedAt: null, declaredDeposit: 0, paymentTerm: "PREPAID", hanTra: null, hetAnHan: null,
  phiDuaDon: { dong: [{ id: "f", legId: "l", serviceId: "ht", direction: "OUT", zoneCode: null, zoneName: null, kind: "PER_PAX", returnPax: null, quantity: 2, unitPrice: phi / 2, lineTotal: phi, description: "Phí đưa đón — chiều đi" }], thieu: [], duKien: false },
  services: [{ id: "ht", kind: "catalog", catalogCode: "HT_BUN", name: "Tắm bùn Hòn Tằm", unit: "perPax", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, items: [{ id: "i", catalogCode: "HT_BUN", paxCode: "adult", description: "Người lớn", detail: null, quantity: 2, unitPrice: 500_000, catalogPrice: 500_000, lineTotal: 1_000_000 }], catalogStatus: null, legs: [], departDate: "", departTime: null, pickupTime: null, pickupPlace: null, checkinDate: null, checkinTime: null, checkinPlace: null, note: null, pickupChoice: "DON" }],
} as unknown as OrderDetailDto);

// SV-PC-13 gồm hai nửa: nửa CHIA PHẦN Hòn Tằm / Tour Đảo kiểm ở bài hàm thuần dưới đây (chiaPhanBienNhan); nửa TRẦN GIẢM GIÁ 1.000.000 kiểm ở bài đường thật kế tiếp.
test("SV-PC-13: Hòn Tằm 500.000 × 2, phí chọn 50.000 × 2 = 100.000, giảm giá 100.000 ⇒ phần Hòn Tằm 900.000, Tour Đảo 100.000, tổng 1.000.000", () => {
  const phan = chiaPhanBienNhan(donHonTam(100_000, 100_000), "Tour Đảo", banHt, { daTra: 0 });
  assert.deepEqual(phan.map((p) => [p.nguoiBan, p.tong, p.giamGia]), [["Tour Đảo", 100_000, 0], ["Hòn Tằm", 900_000, 100_000]]);
  assert.equal(phan.reduce((t, p) => t + p.tong, 0), 1_000_000);
});

test("SV-PC-13 (đường thật): giảm giá tối đa 1.000.000 = tiền dịch vụ, không gồm phí chọn 100.000; giảm quá thì máy chủ từ chối", async () => {
  const w = await setup();
  const lap = (giam: number) => w.call("POST", "/api/orders", { as: SALES, body: { customerName: "Khách Thử", customerPhone: "0912345678", services: [svc({ adult: 2 }, [OUT(50_000)])], discount: giam } });
  await ok(lap(1_000_001), 400, "giảm quá tiền dịch vụ");
  const id = (await ok(lap(1_000_000), 201, "giảm tối đa")).json.order.id;
  await ok(w.call("POST", `/api/orders/${id}/status`, { as: SALES, body: { status: "confirmed" } }), 200, "xác nhận");
  const o = await don(w, id);
  assert.deepEqual([o.subtotal, o.giamGiaHieuLuc, o.total], [1_100_000, 1_000_000, 100_000]);
});

test("SV-PC-02: đổi phí về 0 («Miễn phí»), 2 người lớn ⇒ 0 đ; biên nhận khách lẻ gộp (không dòng phí) — bật «Hiện riêng» thì in dòng «Phí đưa đón — Miễn phí»; xác nhận được", async () => {
  const w = await setup();
  const o = await lapXacNhan(w, [svc({ adult: 2 }, [OUT(0)])]);
  assert.deepEqual(phiTrenDon(o), [{ direction: "OUT", quantity: 2, unitPrice: 0, lineTotal: 0 }]);
  assert.deepEqual(dongPhiDaLuu(w, o.id), [{ fee_calc_source: "DOI_TAY", quantity: 2, unit_price: 0, line_total: 0 }]);
  // mặc định (khách lẻ, công tắc tắt): gộp — tiền 0 nên giá không đổi, không dòng phí riêng
  const gop = await bienNhan(w, o.id);
  assert.deepEqual(gop.phiDuaDon, []);
  assert.doesNotMatch(JSON.stringify(buildConfirmation(gop, null)), /Phí đưa đón/);
  // Toàn quyền bật «Hiện riêng phí đưa đón trên biên nhận khách lẻ» ⇒ in lại dòng phí riêng
  await ok(w.call("POST", "/api/cai-dat/phi-don-bien-nhan", { as: SUP, body: { hienRieng: true } }), 200, "bật hiện riêng");
  const b = await bienNhan(w, o.id);
  assert.deepEqual(b.phiDuaDon, [{ description: "Phí đưa đón — chiều đi", quantity: 2, unitPrice: 0, lineTotal: 0 }]);
  const khoi = buildConfirmation(b, null).blocks.find((k: any) => k.kind === "service" && k.name === "Phí đưa đón") as any;
  assert.deepEqual(khoi.lines.map((l: any) => [l.description, l.quantity, l.lineTotal]), [["Phí đưa đón — chiều đi", "2", MIEN_PHI]]);
});

test("SV-PC-15: đơn đã xác nhận phí chọn 30.000 × 2 = 60.000; thêm chiều về SAU xác nhận ⇒ không dòng phí mới, tổng không đổi", async () => {
  const w = await setup();
  w.sqlite.prepare("UPDATE catalog_item SET price_infant = 0 WHERE code = 'TOUR_LAN'").run(); // em bé đi miễn phí, để lập được đơn có em bé
  const dv = { ...svc({ adult: 2, infant: 1 }, [OUT(30_000)]), catalogPriceSeen: { adult: 500000, child: 300000, infant: 0 } };
  const o = await lapXacNhan(w, [dv]);
  assert.deepEqual(phiTrenDon(o), [{ direction: "OUT", quantity: 2, unitPrice: 30_000, lineTotal: 60_000 }]);
  const truoc = { ...w.q("SELECT subtotal, discount, total FROM orders WHERE id = ?", o.id)[0] };
  await ok(w.call("POST", `/api/orders/${o.id}/legs`, { as: SALES, body: { expectedUpdatedAt: o.updatedAt, serviceId: o.services[0].id, leg: RET(30_000) } }), 201, "thêm chiều về");
  const sau = await don(w, o.id);
  assert.equal(sau.services[0].legs.length, 2);
  assert.deepEqual(phiTrenDon(sau), [{ direction: "OUT", quantity: 2, unitPrice: 30_000, lineTotal: 60_000 }]);
  assert.equal(dongPhiDaLuu(w, o.id).length, 1);
  assert.deepEqual({ ...w.q("SELECT subtotal, discount, total FROM orders WHERE id = ?", o.id)[0] }, truoc);
  assert.equal(sau.total, 1_000_000 + 60_000);
});
