// Phí đưa đón ở MỌI chỗ đọc dòng tiền (Đợt C, Task 5; ADR-0147 Đ3, ADR-0203 ĐB2–ĐB3; trang ghép 2026-10-28 §1; sổ vàng golden/phi-dua-don.json SV-PD-01, 22–27, 29).
// Sau xác nhận dòng phí bị khoá (trigger 0081). «Sửa số khách» không ghi đè dòng nào: phí theo khách được TÍNH LẠI LÚC ĐỌC (đơn giá đã chụp × số khách tính tiền mới; chiều về
// lấy min(số người chiều về ĐÃ CHỤP, số mới)) ở chi tiết đơn, danh sách, phải thu của billing, biên nhận, công nợ đại lý. Đổi chặng / bên đặt sau xác nhận không đổi phí.
// Chạy CẢ ứng dụng trên SQLite thật (tests/audit/harness.mjs). Bảng phí gieo qua chính route của pricing. Tên người dùng GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { app, world, seedStaff } from "../../../tests/audit/harness.mjs";
import { buildConfirmation, MIEN_PHI } from "../../shared/order-confirmation.ts";
import { chiaPhanBienNhan } from "../receipt/rules.ts";
import { nhaCungCapCuaDon } from "../billing/rules.ts";
import type { BanChup } from "../../shared/hoa-hong-dong.ts";
import type { OrderDetailDto } from "../../shared/contracts.ts";

const SALES = "11111111-1111-4111-8111-111111111111";
const SALES_B = "22222222-2222-4222-8222-222222222222";
const ADM = "55555555-5555-4555-8555-555555555555";
const SUP = "77777777-7777-4777-8777-777777777777";
const ACC = "33333333-3333-4333-8333-333333333333";
const DT = "88888888-8888-4888-8888-888888888801"; // Đối tác có hồ sơ mang vai được hưởng ⇒ bên đặt = chính hồ sơ này
const BEN_DT = `pty-${DT}`;
const AT = "2026-10-01T00:00:00.000Z";
const BEN = "a941dd7d-faab-4098-9ab9-1df7fa6dd551"; // Bến tàu du lịch Nha Trang (0010) — chưa xếp vùng ⇒ NGOAI_VUNG
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

/** Bảng phí: CR `cr` đ/khách, NGOAI_VUNG 20.000 đ/khách; bật từ hôm nay. */
async function setup(o: { cr?: number } = {}): Promise<W> {
  const w = world({});
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An Bán", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: SALES_B, phone: "0900000002", name: "Bình Bán", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000006", name: "Quản Trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: SUP, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  seedStaff(w.sqlite, { id: DT, phone: "0900000021", name: "Đối Tác Hưởng", perms: ["PARTNER"] });
  seedStaff(w.sqlite, { id: ACC, phone: "0900000003", name: "Cúc Kế Toán", perms: ["ACCOUNTING"] });
  w.sqlite.prepare("INSERT INTO catalog_item (code, name, unit, price_adult, price_child, in_sheet, first_seen_at, updated_at) VALUES ('TOUR_LAN', 'Tour lặn biển', 'perPax', 500000, 300000, 1, ?, ?)").run(AT, AT);
  w.sqlite.prepare("INSERT INTO catalog_item (code, name, unit, price_adult, price_child, in_sheet, first_seen_at, updated_at) VALUES ('TOUR_600', 'Tour lặn biển cao cấp', 'perPax', 600000, 300000, 1, ?, ?)").run(AT, AT);
  await ok(w.call("POST", "/api/location-zones", { as: ADM, body: { code: "CR", name: "Bãi Dài – Cam Ranh", sortOrder: 5 } }), 201, "vùng CR");
  w.sqlite.prepare("INSERT INTO loc_location (id, code, name, location_type_code, active, zone_code, created_at, updated_at) VALUES (?, 'KS_CR', 'Khách sạn Cam Ranh', 'HOTEL', 1, 'CR', ?, ?)").run(KS_CR, AT, AT);
  for (const [vung, tien] of [["CR", o.cr ?? 100_000], ["NGOAI_VUNG", 20_000]] as const) {
    await ok(w.call("POST", "/api/pricing/phi-don", { as: ADM, body: { kind: "PER_PAX", amount: tien, validFrom: "2026-01-01", validTo: null, note: null, dieuKien: [{ khoa: "ZONE", giaTri: vung }] } }), 201, `mức ${vung}`);
  }
  const tuLuc = (await ok(w.call("GET", "/api/pricing/phi-don", { as: ADM }), 200)).json.batDauAp.tuLuc;
  await ok(w.call("POST", "/api/pricing/phi-don/bat-dau-ap", { as: ADM, body: { ngay: HOM_NAY, tuLucDaDoc: tuLuc } }), 200, "bật phí");
  return w;
}
/** «Đổi mức phí» chung của một khu vực từ HÔM NAY (mức cũ kết thúc hôm qua). */
async function doiMuc(w: W, vung: string, tien: number) {
  const cu = (await ok(w.call("GET", "/api/pricing/phi-don", { as: ADM }), 200)).json.muc.find((m: any) => m.dieuKien.vung === vung && m.denNgay === null);
  await ok(w.call("POST", "/api/pricing/phi-don", { as: ADM, body: { kind: "PER_PAX", amount: tien, validFrom: HOM_NAY, validTo: null, note: null, dieuKien: [{ khoa: "ZONE", giaTri: vung }], thayCho: { id: cu.id, expectedUpdatedAt: cu.updatedAt } } }), 201, `đổi mức ${vung}`);
}

const OUT = (pickupLocationId: string | null) => ({ direction: "OUT", pickupDate: "", pickupTime: "06:30", pickupLocationId, pickupPlace: "", dropoffLocationId: BEN, dropoffPlace: "" });
const RET = (dropoffLocationId: string | null, paxOverride?: number) => ({
  direction: "RETURN", pickupDate: D, pickupTime: "16:00", pickupLocationId: BEN, pickupPlace: "", dropoffLocationId, dropoffPlace: "", ...(paxOverride === undefined ? {} : { paxOverride }),
});
const P = (p: Pax) => ({ adult: 0, child: 0, senior: 0, infant: 0, ...p });
const svc = (pax: Pax, legs: unknown[], ma: "TOUR_LAN" | "TOUR_600" = "TOUR_LAN") => ({
  kind: "catalog", pickupChoice: legs.length > 0 ? "DON" : "KHONG_DON", catalogCode: ma, pax: P(pax), catalogPriceSeen: { adult: ma === "TOUR_LAN" ? 500000 : 600000, child: 300000 }, departDate: D, legs,
});
/** Lập đơn (người lập SALES trừ khi nói khác) rồi xác nhận qua `/status`; trả chi tiết đơn đã xác nhận. */
async function lapXacNhan(w: W, legs: unknown[], o: { pax?: Pax; extra?: Record<string, unknown>; as?: string; services?: unknown[] } = {}) {
  const as = o.as ?? SALES;
  const lap = (await ok(w.call("POST", "/api/orders", { as, body: { customerName: "Khách Thử", customerPhone: "0912345678", services: o.services ?? [svc(o.pax ?? { adult: 2 }, legs)], ...o.extra } }), 201, "lập đơn")).json.order;
  await ok(w.call("POST", `/api/orders/${lap.id}/status`, { as, body: { status: "confirmed" } }), 200, "xác nhận");
  return don(w, lap.id, as);
}
const don = async (w: W, id: string, as = SALES) => (await ok(w.call("GET", `/api/orders/${id}`, { as }), 200, "đọc đơn")).json.order;
const suaSoKhach = (w: W, o: any, pax: Pax, as = SALES) => w.call("POST", `/api/orders/${o.id}/money-edit`, { as, body: { lyDo: "THEM_NGUOI", services: [{ id: o.services[0].id, pax: P(pax) }] } });
const phiTrenDon = (o: any) => o.phiDuaDon.dong.map((d: any) => ({ direction: d.direction, quantity: d.quantity, unitPrice: d.unitPrice, lineTotal: d.lineTotal }));
const dongPhiDaLuu = (w: W, id: string) =>
  w.q("SELECT quantity, unit_price, line_total, fee_return_pax FROM order_item WHERE order_id = ? AND line_kind = 'TRANSFER_FEE' ORDER BY sort_order", id).map((r: any) => ({ ...r }));
const tienDaLuu = (w: W, id: string) => ({ ...w.q("SELECT subtotal, discount, total FROM orders WHERE id = ?", id)[0] });
const bienNhan = async (w: W, id: string, as = SALES) => (await ok(w.call("GET", `/api/orders/${id}/receipt`, { as }), 200, "biên nhận")).json.receipt;
const tongTrongDanhSach = async (w: W, id: string) => {
  const ds = (await ok(w.call("GET", "/api/orders?status=confirmed", { as: SALES }), 200, "danh sách")).json;
  const dong = (ds.orders ?? ds.items ?? ds).find((x: any) => x.id === id);
  assert.ok(dong, "đơn có trong danh sách");
  return dong.total as number;
};

test("SV-PD-24: sửa số khách 2 → 3 người lớn sau xác nhận ⇒ phí tính lại theo mức ĐÃ CHỤP 100.000 × 3 = 300.000 (không theo mức mới 110.000) ở chi tiết đơn, danh sách, biên nhận; dòng đã lưu không đổi; dòng điều chỉnh gồm phí", async () => {
  const w = await setup();
  const o = await lapXacNhan(w, [OUT(KS_CR)]);
  assert.deepEqual(phiTrenDon(o), [{ direction: "OUT", quantity: 2, unitPrice: 100_000, lineTotal: 200_000 }]);
  assert.deepEqual(tienDaLuu(w, o.id), { subtotal: 1_200_000, discount: 0, total: 1_200_000 });
  await doiMuc(w, "CR", 110_000);
  const r = await ok(suaSoKhach(w, o, { adult: 3 }), 200, "sửa số khách");
  assert.deepEqual(phiTrenDon(r.json.order), [{ direction: "OUT", quantity: 3, unitPrice: 100_000, lineTotal: 300_000 }], "phản hồi sửa số khách");
  const sau = await don(w, o.id);
  assert.deepEqual(phiTrenDon(sau), [{ direction: "OUT", quantity: 3, unitPrice: 100_000, lineTotal: 300_000 }]);
  assert.deepEqual([sau.subtotal, sau.total, sau.giamGiaHieuLuc], [1_800_000, 1_800_000, 0]);
  assert.deepEqual(dongPhiDaLuu(w, o.id), [{ quantity: 2, unit_price: 100_000, line_total: 200_000, fee_return_pax: null }], "dòng đã lưu đóng băng");
  assert.deepEqual(tienDaLuu(w, o.id), { subtotal: 1_200_000, discount: 0, total: 1_200_000 }, "cột tiền đã lưu đóng băng (0081)");
  const dc = { ...w.q("SELECT subtotal_before, subtotal_after FROM order_money_adjustment WHERE order_id = ? AND seq = 1", o.id)[0] };
  assert.deepEqual(dc, { subtotal_before: 1_200_000, subtotal_after: 1_800_000 }, "R-ORD-6a: subtotal_before dòng đầu = orders.subtotal (gồm phí)");
  assert.equal(await tongTrongDanhSach(w, o.id), 1_800_000, "danh sách đọc computeEffectiveMoney");
  const b = await bienNhan(w, o.id);
  assert.deepEqual([b.subtotal, b.total, b.conLai], [1_800_000, 1_800_000, 1_800_000], "biên nhận / phải thu của billing");
  // lịch sử số khách: tạm tính mỗi dòng gồm phí
  const ls = sau.lichSuSoKhach ?? (await don(w, o.id)).lichSuSoKhach;
  if (ls) assert.deepEqual(ls.map((d: any) => d.tamTinh), [1_200_000, 1_800_000]);
});

test("[Review Focus 5] sửa số người chiều về SAU xác nhận rồi sửa số khách ⇒ phí chiều về theo số người ĐÃ CHỤP (min(1, 3) = 1), không theo số mới 2; chiều đi theo số khách mới", async () => {
  const w = await setup();
  const o = await lapXacNhan(w, [OUT(KS_CR), RET(KS_CR, 1)]);
  assert.deepEqual(dongPhiDaLuu(w, o.id).map((d: any) => [d.quantity, d.fee_return_pax]), [[2, null], [1, 1]]);
  const ve = o.services[0].legs.find((l: any) => l.direction === "RETURN");
  const legEdit = { pickupDate: ve.pickupDate, pickupTime: ve.pickupTime ?? "", pickupLocationId: ve.pickupLocationId, pickupPlace: ve.pickupPlace ?? "", dropoffLocationId: ve.dropoffLocationId, dropoffPlace: ve.dropoffPlace ?? "", paxOverride: 2 };
  await ok(w.call("PUT", `/api/orders/${o.id}/legs/${ve.id}`, { as: SALES, body: { expectedUpdatedAt: ve.updatedAt, leg: legEdit } }), 200, "sửa số người chiều về");
  const giua = await don(w, o.id);
  assert.equal(giua.services[0].legs.find((l: any) => l.direction === "RETURN").paxOverride, 2);
  assert.deepEqual(phiTrenDon(giua).map((d: any) => d.lineTotal), [200_000, 100_000], "sửa chặng sau xác nhận không đổi phí");
  await ok(suaSoKhach(w, giua, { adult: 3 }), 200, "sửa số khách");
  const sau = await don(w, o.id);
  assert.deepEqual(phiTrenDon(sau), [
    { direction: "OUT", quantity: 3, unitPrice: 100_000, lineTotal: 300_000 },
    { direction: "RETURN", quantity: 1, unitPrice: 100_000, lineTotal: 100_000 },
  ]);
  assert.equal(sau.total, 1_900_000);
});

test("đóng chặng chiều về SAU xác nhận ⇒ dòng phí vẫn trên trang đơn và biên nhận, vẫn tính lại khi sửa số khách (phí chụp theo dòng, không theo chặng)", async () => {
  const w = await setup();
  const o = await lapXacNhan(w, [OUT(KS_CR), RET(KS_CR)]);
  const ve = o.services[0].legs.find((l: any) => l.direction === "RETURN");
  await ok(w.call("POST", `/api/orders/${o.id}/legs/${ve.id}/close`, { as: SALES, body: { expectedUpdatedAt: ve.updatedAt, reasonCode: "NOT_NEEDED" } }), 200, "đóng chiều về");
  const dong = await don(w, o.id);
  assert.equal(dong.services[0].legs.filter((l: any) => l.direction === "RETURN").length, 0, "chặng đã đóng không còn trong danh sách chặng mở");
  assert.deepEqual(phiTrenDon(dong).map((d: any) => [d.direction, d.lineTotal]), [["OUT", 200_000], ["RETURN", 200_000]]);
  assert.equal(dong.total, 1_400_000);
  await ok(suaSoKhach(w, dong, { adult: 3 }), 200);
  const sau = await don(w, o.id);
  assert.deepEqual(phiTrenDon(sau).map((d: any) => d.lineTotal), [300_000, 300_000]);
  assert.equal(sau.total, 2_100_000);
});

test("SV-PD-23: thêm chiều về SAU xác nhận ⇒ không sinh dòng phí mới, tổng không đổi", async () => {
  const w = await setup();
  const o = await lapXacNhan(w, [OUT(KS_CR)], { pax: { adult: 2, child: 1 } });
  assert.deepEqual(phiTrenDon(o), [{ direction: "OUT", quantity: 3, unitPrice: 100_000, lineTotal: 300_000 }]);
  const truoc = tienDaLuu(w, o.id);
  await ok(w.call("POST", `/api/orders/${o.id}/legs`, { as: SALES, body: { expectedUpdatedAt: o.updatedAt, serviceId: o.services[0].id, leg: RET(KS_CR) } }), 201, "thêm chiều về");
  const sau = await don(w, o.id);
  assert.equal(sau.services[0].legs.length, 2);
  assert.deepEqual(phiTrenDon(sau), [{ direction: "OUT", quantity: 3, unitPrice: 100_000, lineTotal: 300_000 }], "không dòng phí mới");
  assert.deepEqual(tienDaLuu(w, o.id), truoc);
  assert.equal(sau.total, truoc.total);
});

test("đổi bên đặt SAU xác nhận ⇒ phí giữ nguyên (không tính lại theo cấp / bên đặt mới)", async () => {
  const w = await setup();
  const o = await lapXacNhan(w, [OUT(KS_CR)]);
  const r = await w.call("PUT", `/api/orders/${o.id}/booker`, { as: SALES, body: { customerName: "Khách Thử", customerPhone: "0912345678", bookerPartyId: BEN_DT, expectedUpdatedAt: o.updatedAt } });
  assert.equal(r.status, 200, r.text);
  const sau = await don(w, o.id);
  assert.equal(sau.bookerPartyId, BEN_DT);
  assert.deepEqual(phiTrenDon(sau), [{ direction: "OUT", quantity: 2, unitPrice: 100_000, lineTotal: 200_000 }]);
  assert.deepEqual(tienDaLuu(w, o.id), { subtotal: 1_200_000, discount: 0, total: 1_200_000 });
});

test("Bán hàng đang phụ trách mà KHÔNG phải người lập sửa số khách đơn có phí ⇒ 403, không ghi dòng điều chỉnh (không thêm đường ghi, không thêm quyền)", async () => {
  const w = await setup();
  const o = await lapXacNhan(w, [OUT(KS_CR)]);
  await ok(w.call("PUT", `/api/orders/${o.id}/handler`, { as: SALES, body: { staffId: SALES_B } }), 200, "giao phụ trách");
  const r = await suaSoKhach(w, o, { adult: 3 }, SALES_B);
  assert.equal(r.status, 403, r.text);
  assert.equal(w.q("SELECT count(*) AS n FROM order_money_adjustment WHERE order_id = ?", o.id)[0].n, 0);
});

test("đơn có giảm giá + phí, sửa số khách bớt người: giảm giá chỉ trừ phần dịch vụ — phí không bị giảm, giảm giá hiệu lực ≤ tiền dịch vụ hiện hành", async () => {
  const w = await setup({ cr: 70_000 });
  const o = await lapXacNhan(w, [OUT(KS_CR)], { extra: { discount: 900_000 } });
  assert.deepEqual([o.subtotal, o.giamGiaHieuLuc, o.total], [1_140_000, 900_000, 240_000]);
  await ok(w.call("POST", `/api/orders/${o.id}/money-edit`, { as: SALES, body: { lyDo: "BOT_NGUOI", services: [{ id: o.services[0].id, pax: P({ adult: 1 }) }] } }), 200, "bớt khách");
  const sau = await don(w, o.id);
  // dịch vụ 500.000 < giảm giá 900.000 ⇒ phần dịch vụ về 0; phí 70.000 × 1 vẫn thu đủ.
  assert.deepEqual([sau.subtotal, sau.giamGiaHieuLuc, sau.total], [570_000, 500_000, 70_000]);
  assert.equal(await tongTrongDanhSach(w, o.id), 70_000);
  assert.equal((await bienNhan(w, o.id)).conLai, 70_000);
});

test("Trả sau «sửa tăng»: cổng hạn mức cộng cả phần phí tăng (dịch vụ +500.000, phí +100.000 ⇒ phần tăng 600.000 vượt phần còn 550.000)", async () => {
  const w = await setup();
  assert.equal((await w.call("POST", "/api/tra-sau/han-muc", { as: SUP, body: { partyId: BEN_DT, hanMuc: 1_750_000, gioTra: 168, gioAnHan: 0, lyDo: "thử" } })).status, 201);
  const o = await lapXacNhan(w, [OUT(KS_CR)], { extra: { bookerPartyId: BEN_DT, paymentTerm: "CREDIT" } });
  assert.equal(o.total, 1_200_000);
  const r = await suaSoKhach(w, o, { adult: 3 });
  assert.equal(r.status, 409, r.text);
  assert.equal(w.q("SELECT count(*) AS n FROM order_money_adjustment WHERE order_id = ?", o.id)[0].n, 0);
  assert.equal((await w.call("POST", "/api/tra-sau/han-muc", { as: SUP, body: { partyId: BEN_DT, hanMuc: 1_800_000, gioTra: 168, gioAnHan: 0, lyDo: "thử" } })).status, 201);
  await ok(suaSoKhach(w, o, { adult: 3 }), 200, "vừa đủ hạn mức mới");
  assert.equal((await don(w, o.id)).total, 1_800_000);
});

// ---- Biên nhận, chia phần người bán, trần quầy (Đợt C, Task 5 phần 2) ----

test("SV-PD-01: đón miễn phí (mức 0 đồng) ⇒ biên nhận vẫn in dòng «Phí đưa đón … Miễn phí»; đóng chặng sau xác nhận không làm mất dòng", async () => {
  const w = await setup({ cr: 0 });
  const o = await lapXacNhan(w, [OUT(KS_CR)]);
  assert.deepEqual(phiTrenDon(o), [{ direction: "OUT", quantity: 2, unitPrice: 0, lineTotal: 0 }]);
  const b = await bienNhan(w, o.id);
  assert.deepEqual(b.phiDuaDon, [{ description: "Phí đưa đón — chiều đi, Bãi Dài – Cam Ranh", quantity: 2, unitPrice: 0, lineTotal: 0 }]);
  assert.deepEqual([b.subtotal, b.total], [1_000_000, 1_000_000]);
  const khoi = buildConfirmation(b, null).blocks.find((k: any) => k.kind === "service" && k.name === "Phí đưa đón") as any;
  assert.ok(khoi, "có khối Phí đưa đón");
  assert.deepEqual(khoi.lines.map((l: any) => [l.description, l.quantity, l.lineTotal]), [["Phí đưa đón — chiều đi, Bãi Dài – Cam Ranh", "2", MIEN_PHI]]);
  const di = o.services[0].legs[0];
  await ok(w.call("POST", `/api/orders/${o.id}/legs/${di.id}/close`, { as: SALES, body: { expectedUpdatedAt: di.updatedAt, reasonCode: "NOT_NEEDED" } }), 200, "đóng chiều đi");
  assert.equal((await bienNhan(w, o.id)).phiDuaDon.length, 1, "chặng đã đóng: dòng phí vẫn trên biên nhận");
});

test("SV-PD-27 (dạng): một đơn hai dịch vụ — mức riêng dịch vụ 0 đồng + mức chung 40.000 × 2 ⇒ phí 0 + 80.000; biên nhận hai dòng («Miễn phí», 80.000), tổng gồm 80.000", async () => {
  const w = await setup({ cr: 40_000 });
  await ok(w.call("POST", "/api/pricing/phi-don", { as: ADM, body: { kind: "PER_PAX", amount: 0, validFrom: "2026-01-01", validTo: null, note: null, dieuKien: [{ khoa: "ZONE", giaTri: "CR" }, { khoa: "SERVICE", giaTri: "TOUR_LAN" }] } }), 201, "mức riêng dịch vụ");
  const o = await lapXacNhan(w, [], { services: [svc({ adult: 2 }, [OUT(KS_CR)]), svc({ adult: 2 }, [OUT(KS_CR)], "TOUR_600")] });
  assert.deepEqual(phiTrenDon(o).map((d: any) => d.lineTotal), [0, 80_000]);
  assert.deepEqual([o.subtotal, o.total], [1_000_000 + 1_200_000 + 80_000, 2_280_000]);
  const b = await bienNhan(w, o.id);
  const khoi = buildConfirmation(b, null).blocks.find((k: any) => k.kind === "service" && k.name === "Phí đưa đón") as any;
  assert.deepEqual(khoi.lines.map((l: any) => l.lineTotal), [MIEN_PHI, "80.000 ₫"]);
  assert.deepEqual([b.total, b.conLai], [2_280_000, 2_280_000]);
});

/** Đơn đã xác nhận dạng DTO cho luật chia biên nhận: một dịch vụ của nhà cung cấp `ht` + dòng phí `phi`. */
const donHonTam = (phi: number, giam: number): OrderDetailDto => ({
  id: "o", orderCode: "TD-1", staffId: "s", staffName: "", bookerPartyId: null, bookerName: null, bookerLaDoiTac: false, manifestExempt: false, status: "confirmed",
  customerName: "Khách", customerPhone: "0900000000", customerEmail: null, customerNote: null, subtotal: 1_000_000 + phi, discount: giam, total: 1_000_000 + phi - giam, giamGiaHieuLuc: giam,
  paymentNote: null, createdAt: "", updatedAt: "", confirmedAt: "", deliveredAt: null, completedAt: null, declaredDeposit: 0, paymentTerm: "PREPAID", hanTra: null, hetAnHan: null,
  phiDuaDon: { dong: [{ id: "f", legId: "l", serviceId: "ht", direction: "OUT", zoneCode: "CR", zoneName: "Bãi Dài", tierCode: null, kind: "PER_PAX", returnPax: null, quantity: 2, unitPrice: phi / 2, lineTotal: phi, description: "Phí đưa đón — chiều đi, Bãi Dài" }], thieu: [], duKien: false },
  services: [{ id: "ht", kind: "catalog", catalogCode: "HT_BUN", name: "Tắm bùn Hòn Tằm", unit: "perPax", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, items: [{ id: "i", catalogCode: "HT_BUN", paxCode: "adult", description: "Người lớn", detail: null, quantity: 2, unitPrice: 500_000, catalogPrice: 500_000, lineTotal: 1_000_000 }], catalogStatus: null, legs: [], departDate: "", departTime: null, pickupTime: null, pickupPlace: null, checkinDate: null, checkinTime: null, checkinPlace: null, note: null, pickupChoice: "DON" }],
} as unknown as OrderDetailDto);
const CT = "pty-ct";
const chupHt: BanChup = { serviceId: "ht", beneficiaryPartyId: null, hoaHong: { status: "NONE" }, cungUng: { status: "SET", termId: "t", sellerPartyId: "ht", supplierPartyId: "ht", costRateBp: 8000 } } as BanChup;
const banHt = { chup: [chupHt], ten: new Map([["ht", "Hòn Tằm"]]), congTyChuId: CT };

test("SV-PD-26 / SV-PD-29: biên nhận — phí vào phần Tour Đảo, giảm giá chỉ trừ phần dịch vụ; trần thu tại quầy Hòn Tằm không tăng vì phí", () => {
  const ca26 = chiaPhanBienNhan(donHonTam(140_000, 0), "Tour Đảo", banHt, { daTra: 0 });
  assert.deepEqual(ca26.map((p) => [p.nguoiBan, p.dichVu, p.tong, p.giamGia, p.traTaiQuay]), [["Tour Đảo", ["Phí đưa đón"], 140_000, 0, false], ["Hòn Tằm", ["Tắm bùn Hòn Tằm"], 1_000_000, 0, true]]);
  assert.equal(ca26.reduce((t, p) => t + p.tong, 0), 1_140_000);
  const ca29 = chiaPhanBienNhan(donHonTam(140_000, 100_000), "Tour Đảo", banHt, { daTra: 0 });
  assert.deepEqual(ca29.map((p) => [p.nguoiBan, p.tong, p.giamGia]), [["Tour Đảo", 140_000, 0], ["Hòn Tằm", 900_000, 100_000]]);
  assert.equal(ca29.reduce((t, p) => t + p.tong, 0), 1_040_000);
  const phan = (giam: number) => ({ duKien: false, chuaChup: false, congTyChuId: CT, giamGiaHieuLuc: giam, chup: [chupHt], dichVu: [{ id: "ht", thanhTien: 1_000_000 }] });
  assert.deepEqual([...nhaCungCapCuaDon(phan(0))], [["ht", 1_000_000]], "SV-PD-26: trần quầy = phần Hòn Tằm, không gồm phí");
  assert.deepEqual([...nhaCungCapCuaDon(phan(100_000))], [["ht", 900_000]], "SV-PD-29");
});

// ---- Công nợ đại lý, «Khách đã trả đủ» (Đợt C, Task 5 phần 3) ----

async function hoaHong(w: W, body: Record<string, unknown>) {
  await ok(w.call("POST", "/api/pricing/hoa-hong", { as: ACC, body: { doiTuong: { loai: "VAI", code: "TRAVEL_AGENCY" }, phamVi: "ALL", tuNgay: "2026-01-01", ...body } }), 201, "mức hoa hồng");
}

test("SV-PD-25: đơn đại lý Trả sau — nợ = 1.200.000 − hoa hồng 120.000 + phí 160.000 = 1.240.000; hoa hồng không tính trên phí; phiếu công nợ có dòng «Phí đưa đón»", async () => {
  const w = await setup({ cr: 80_000 });
  await hoaHong(w, { kieu: "RATE", tyLeBp: 1000 });
  assert.equal((await w.call("POST", "/api/tra-sau/han-muc", { as: SUP, body: { partyId: BEN_DT, hanMuc: 10_000_000, gioTra: 168, gioAnHan: 0, lyDo: "thử" } })).status, 201);
  const o = await lapXacNhan(w, [], { services: [svc({ adult: 2 }, [OUT(KS_CR)], "TOUR_600")], extra: { bookerPartyId: BEN_DT, paymentTerm: "CREDIT" } });
  assert.equal(o.total, 1_360_000, "khách trả 1.360.000");
  const g = (await app.giaDaiLyNhieuDon(w.env.DB, [o.id])).get(o.id);
  assert.deepEqual([g.dong.map((d: any) => [d.thanhTien, d.hoaHong, d.giaDaiLy]), g.phiDon, g.tong], [[[1_200_000, 120_000, 1_080_000]], 160_000, 1_240_000]);
  const no = (await ok(w.call("GET", `/api/tra-sau/han-muc/${BEN_DT}/don`, { as: ACC }), 200)).json.don.find((d: any) => d.orderId === o.id).no;
  assert.equal(no, 1_240_000, "số nợ của hạn mức");
  const p = (await ok(w.call("GET", `/api/orders/${o.id}/cong-no-dai-ly`, { as: ACC }), 200, "phiếu")).json.phieu;
  assert.deepEqual([p.tong, p.conLai], [1_240_000, 1_240_000]);
  assert.deepEqual(p.dong.map((d: any) => [d.ten, d.giaDaiLy]), [["Tour lặn biển cao cấp", 1_080_000], ["Phí đưa đón", 160_000]], "các dòng cộng khớp tổng");
  // sửa số khách 2 → 3: phí theo khách tính lại trong công nợ (cùng hàm với chi tiết đơn)
  const dv = o.services[0];
  await ok(w.call("POST", `/api/orders/${o.id}/money-edit`, { as: ACC, body: { lyDo: "THEM_NGUOI", services: [{ id: dv.id, pax: P({ adult: 3 }) }] } }), 200, "sửa số khách");
  const g2 = (await app.giaDaiLyNhieuDon(w.env.DB, [o.id])).get(o.id);
  assert.deepEqual([g2.phiDon, g2.tong], [240_000, 1_800_000 - 180_000 + 240_000]);
});

test("«Khách đã trả đủ» đơn có người hưởng + giảm giá + phí ⇒ dòng giảm giá bên đặt = đúng giảm giá (60.000), thành tiền trước giảm (gross) gồm phí", async () => {
  const w = await setup({ cr: 100_000 });
  await hoaHong(w, { kieu: "PER_PAX", moiKhach: 50_000 });
  const o = await lapXacNhan(w, [OUT(KS_CR)], { extra: { bookerPartyId: BEN_DT, discount: 60_000 } });
  assert.deepEqual([o.subtotal, o.giamGiaHieuLuc, o.total], [1_200_000, 60_000, 1_140_000]);
  await ok(w.call("POST", `/api/orders/${o.id}/payments`, { as: ACC, body: { soTien: 1_140_000, hinhThuc: "CASH", nguoiThu: "cong_ty" } }), 201, "thu đủ");
  w.sqlite.prepare("UPDATE order_service SET depart_date = ? WHERE order_id = ?").run(HOM_NAY, o.id); // «Khách đã trả đủ» chỉ từ ngày đi
  await ok(w.call("POST", `/api/orders/${o.id}/delivered`, { as: SUP, body: {} }), 200, "khách đã trả đủ");
  const phieu = { ...w.q("SELECT gross_snapshot, due_snapshot FROM bil_posting WHERE order_id = ? AND kind_code = 'DELIVERED'", o.id)[0] };
  assert.deepEqual(phieu, { gross_snapshot: 1_200_000, due_snapshot: 1_140_000 }, "R-BIL-16: gross − due = giảm giá hiệu lực");
  const giam = w.q("SELECT amount FROM bil_debt_line WHERE order_id = ? AND kind_code = 'GIAM_GIA_BEN_DAT'", o.id).map((r: any) => r.amount);
  assert.deepEqual(giam, [60_000]);
});
