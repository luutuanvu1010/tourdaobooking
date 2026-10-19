// Biên nhận theo DANH SÁCH TRẮNG (ADR-0026 đ11; kế hoạch Task 8 — NT-B1). Hai lớp:
//  (1) luật thuần `dungBienNhan`: đưa số lạ 480017 vào MỌI ô KHÔNG được phép của đơn (id, người lập, người đặt, ghi chú thanh toán, ghi chú vận hành, mã/giá
//      danh mục, chặng, trạng thái danh mục…) → JSON biên nhận không có số đó; khoá của ReceiptDto bằng ĐÚNG danh sách (thêm trường = sửa bài này);
//  (2) route thật trên khung thử: đơn + sổ mang số lạ ở mọi ô bí mật của đơn / sổ (ghi chú lần thu, tên người thu, hình thức…) → `GET /api/orders/:id/receipt`
//      không lộ; đã trả / còn lại lấy từ billing (một hàm).
import { test } from "node:test";
import assert from "node:assert/strict";
import type { CompanyDto, OrderDetailDto } from "../../shared/contracts.ts";
import { dungBienNhan } from "./rules.ts";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const LA = "480017";
const coLo = (json: string) => json.includes(LA) || json.includes("480.017");
const COMPANY: CompanyDto = { name: "CÔNG TY TNHH TOUR ĐẢO", taxCode: "4201969169", address: "Nha Trang", hotline: "0845 256 256", email: null };

const donBiMat = (): OrderDetailDto => ({
  id: `ord-${LA}`, orderCode: "TD-20260930-0001", staffId: `stf-${LA}`, staffName: `NV ${LA}`, bookerPartyId: `pty-${LA}`, bookerName: `Đại lý ${LA}`, bookerLaDoiTac: true,
  status: "confirmed", customerName: "Trần Văn Bình", customerPhone: "0901234567", customerEmail: null, customerNote: null,
  subtotal: 1_000_000, discount: 0, total: 1_000_000, giamGiaHieuLuc: 0, paymentNote: `ghi chú thanh toán ${LA}`, createdAt: "2026-09-30T01:00:00.000Z", updatedAt: `upd-${LA}`,
  confirmedAt: `cf-${LA}`, deliveredAt: null, completedAt: null,
  services: [{
    id: `svc-${LA}`, kind: "catalog", catalogCode: `TD${LA}`, name: "Vé Hòn Tằm", unit: "perPax", pax: { adult: 2, child: 0, senior: 0, infant: 0 },
    items: [{ id: `it-${LA}`, catalogCode: `TD${LA}`, paxCode: "adult", description: "Người lớn", detail: null, quantity: 2, unitPrice: 500_000, catalogPrice: Number(LA), lineTotal: 1_000_000 }],
    catalogStatus: "ok", legs: [{ id: `leg-${LA}` } as never],
    departDate: "2026-10-01", departTime: null, pickupTime: "07:00", pickupPlace: "Khách sạn", checkinDate: null, checkinTime: null, checkinPlace: null, note: `ghi chú vận hành ${LA}`,
  }],
});

test("NT-B1 (luật): số lạ 480017 ở mọi ô KHÔNG được phép của đơn không lọt vào ReceiptDto; khoá đúng danh sách trắng", () => {
  const r = dungBienNhan(donBiMat(), COMPANY, { daTra: 300_000, conLai: 700_000 }, null);
  assert.equal(coLo(JSON.stringify(r)), false, JSON.stringify(r));
  assert.deepEqual(Object.keys(r).sort(), [
    "company", "conLai", "createdAt", "customerEmail", "customerName", "customerNote", "customerPhone", "daTra", "discount", "huy", "orderCode", "phan", "services", "status", "subtotal", "total",
  ]);
  assert.deepEqual(Object.keys(r.services[0]!).sort(), ["checkinDate", "checkinPlace", "checkinTime", "departDate", "departTime", "items", "name", "pax", "pickupPlace", "pickupTime", "unit"]);
  assert.deepEqual(Object.keys(r.services[0]!.items[0]!).sort(), ["description", "detail", "lineTotal", "quantity", "unitPrice"]);
  assert.deepEqual([r.daTra, r.conLai, r.status.nhan], [300_000, 700_000, "Đã xác nhận"]);
  assert.equal(dungBienNhan({ ...donBiMat(), deliveredAt: "x" }, COMPANY, { daTra: 1, conLai: 0 }, null).status.nhan, "Đã giao – đã thu đủ");
});

test("NT-B1 (route thật): GET /api/orders/:id/receipt — số lạ ở ô bí mật của đơn và SỔ (ghi chú lần thu, tên người thu) không lộ; đã trả / còn lại từ billing; khuôn quyền chi tiết đơn", async () => {
  const w = world();
  const SALES = "11111111-1111-4111-8111-111111111111";
  const HDV = "22222222-2222-4222-8222-222222222222";
  const DT = "66666666-6666-4666-8666-666666666666";
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: `Bán ${LA}`, perms: ["SALES"] });
  seedStaff(w.sqlite, { id: HDV, phone: "0900000002", name: `Người thu ${LA}`, perms: ["FIELD"] });
  seedStaff(w.sqlite, { id: DT, phone: "0900000007", name: "Đối Tác", perms: ["PARTNER"] });
  const id = "99999999-9999-4999-8999-000000000001";
  const AT = "2026-09-01T00:00:00.000Z";
  w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, payment_note, created_at, updated_at)
    VALUES (?, 'TD-BN-1', ?, 'draft', 'Khách Giả', '0900000099', 1000000, 1000000, 1000000, ?, ?, ?)`).run(id, SALES, `nội bộ ${LA}`, AT, AT);
  w.sqlite.prepare(`INSERT INTO order_service (pickup_choice, id, order_id, name, unit, pax_adult, depart_date, note) VALUES ('KHONG_DON', 'svc-bn', ?, 'Vé', 'perPax', 2, '2026-10-01', ?)`).run(id, `vận hành ${LA}`);
  w.sqlite.prepare(`INSERT INTO order_item (id, order_id, service_id, description, quantity, unit_price, line_total, catalog_code, catalog_price, pax_code)
    VALUES ('it-bn', ?, 'svc-bn', 'Người lớn', 2, 500000, 1000000, 'ZX1', ?, 'adult')`).run(id, Number(LA));
  w.sqlite.prepare(`UPDATE orders SET status = 'confirmed', confirmed_at = ?, updated_at = ? WHERE id = ?`).run(AT, AT, id);
  w.sqlite.prepare(`INSERT INTO dsp_assignment (id, order_id, task_kind_code, party_id, status_code, valid_from_at, created_at, created_by, updated_at, updated_by)
    VALUES ('a-bn', ?, 'HANDLE', ?, 'PENDING', ?, ?, NULL, ?, NULL)`).run(id, `pty-${HDV}`, AT, AT, AT);
  const thu = await w.call("POST", `/api/orders/${id}/payments`, { as: HDV, body: { soTien: 300_000, hinhThuc: "BANK_TRANSFER", nguoiThu: "toi", ghiChu: `lần thu ${LA}` } });
  assert.equal(thu.status, 201, thu.text);
  const r = await w.call("GET", `/api/orders/${id}/receipt`, { as: SALES });
  assert.equal(r.status, 200, r.text);
  assert.equal(coLo(r.text), false, r.text);
  assert.doesNotMatch(r.text, /Chuyển khoản|BANK_TRANSFER|Người thu/, "không hình thức thu, không tên người thu");
  assert.deepEqual([r.json.receipt.daTra, r.json.receipt.conLai, r.json.receipt.total], [300_000, 700_000, 1_000_000]);
  assert.equal((await w.call("GET", `/api/orders/${id}/receipt`, { as: DT })).status, 403, "Đối tác đơn người khác");
  assert.equal((await w.call("GET", `/api/orders/${id}/receipt`, { as: HDV })).status, 200, "HDV đang phụ trách");
});

// ---- ADR-0109 QĐ4: biên nhận gửi khách in GIẢM GIÁ HIỆU LỰC (= min(giảm giá, tạm tính hiện hành) — số máy chủ tính bằng `effectiveMoney`, đọc khoá
// `OrderDto.giamGiaHieuLuc`), để ba dòng Tạm tính − Giảm giá = Tổng cộng luôn cân. `ReceiptDto` giữ đúng 16 khoá (bài NT-B1 ở trên; khoá thứ 16 `phan` — sổ đại lý đợt 2 Task 8).
test("ADR-0109 (luật): biên nhận in giảm giá hiệu lực — đơn âm 500.000 / giảm 800.000 → [500.000, 500.000, 0]; bất biến tạm tính − giảm giá = tổng trên ba mẫu", () => {
  const am = dungBienNhan({ ...donBiMat(), subtotal: 500_000, discount: 800_000, total: 0, giamGiaHieuLuc: 500_000 }, COMPANY, { daTra: 200_000, conLai: 0 }, null);
  assert.deepEqual([am.subtotal, am.discount, am.total], [500_000, 500_000, 0]);
  const mau = [
    { ...donBiMat(), subtotal: 1_000_000, discount: 100_000, total: 900_000, giamGiaHieuLuc: 100_000 }, // thường
    { ...donBiMat(), subtotal: 500_000, discount: 800_000, total: 0, giamGiaHieuLuc: 500_000 }, // giảm giá vượt tạm tính
    { ...donBiMat(), subtotal: 0, discount: 100_000, total: 0, giamGiaHieuLuc: 0 }, // tạm tính về 0
  ];
  for (const o of mau) {
    const r = dungBienNhan(o, COMPANY, { daTra: 0, conLai: o.total }, null);
    assert.equal(r.subtotal - r.discount, r.total, JSON.stringify([r.subtotal, r.discount, r.total]));
  }
});

test("ADR-0109 (route thật): bớt khách tới giảm giá > tạm tính → biên nhận [500.000, 500.000, 0], đã trả 200.000, còn lại 0; huỷ đơn → biên nhận huỷ Tổng cộng 0, đã trả trước 200.000", async () => {
  const w = world();
  const SALES = "11111111-1111-4111-8111-111111111111";
  const ACC = "33333333-3333-4333-8333-333333333333";
  seedStaff(w.sqlite, { id: SALES, phone: "0900000011", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ACC, phone: "0900000013", name: "Cúc", perms: ["ACCOUNTING"] });
  w.sqlite.exec(
    "INSERT INTO catalog_item (code, name, unit, price_adult, price_child, price_infant, in_sheet, first_seen_at, updated_at) VALUES ('ZA1', 'Tour đảo', 'perPax', 500000, 300000, 50000, 1, '2026-01-01', '2026-01-01')",
  );
  const ngay = new Date(Date.now() + 7 * 3600e3 + 3 * 86400e3).toISOString().slice(0, 10);
  const P = (adult: number) => ({ adult, child: 0, senior: 0, infant: 0 });
  const tao = await w.call("POST", "/api/orders", {
    as: SALES,
    body: { customerName: "Khách Thử", customerPhone: "0912345678", discount: 800000, services: [{ kind: "catalog", pickupChoice: "KHONG_DON", catalogCode: "ZA1", pax: P(2), catalogPriceSeen: { adult: 500000, child: 300000, infant: 50000 }, departDate: ngay }] },
  });
  assert.equal(tao.status, 201, tao.text);
  const id = tao.json.order.id as string;
  assert.equal((await w.call("POST", `/api/orders/${id}/status`, { as: SALES, body: { status: "confirmed" } })).status, 200);
  assert.equal((await w.call("POST", `/api/orders/${id}/payments`, { as: ACC, body: { soTien: 200000, hinhThuc: "BANK_TRANSFER", nguoiThu: "cong_ty", maGiaoDich: `BNHN${Date.now()}${Math.floor(Math.random() * 1e6)}`, soThucChuyen: 200000 } })).status, 201);
  const sua = await w.call("POST", `/api/orders/${id}/money-edit`, { as: ACC, body: { lyDo: "BOT_NGUOI", services: [{ id: tao.json.order.services[0].id, pax: P(1) }] } });
  assert.equal(sua.status, 200, sua.text);
  const bn = (await w.call("GET", `/api/orders/${id}/receipt`, { as: SALES })).json.receipt;
  assert.deepEqual([bn.subtotal, bn.discount, bn.total, bn.daTra, bn.conLai], [500000, 500000, 0, 200000, 0]);
  const huy = await w.call("POST", `/api/orders/${id}/status`, { as: SALES, body: { status: "cancelled", lyDo: "KHACH_DOI_Y" } });
  assert.equal(huy.status, 200, huy.text);
  const bnHuy = (await w.call("GET", `/api/orders/${id}/receipt`, { as: SALES })).json.receipt;
  assert.deepEqual([bnHuy.subtotal, bnHuy.discount, bnHuy.total, bnHuy.huy?.daTra], [500000, 500000, 0, 200000], "đơn huỷ từng âm: Tổng cộng 0, số cọc không đổi (ADR-0109 QĐ5)");
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------
// Sổ đại lý đợt 2, Task 8 — biên nhận CHIA PHẦN theo người bán (ADR-0078 điều 10, ví dụ B-4, B-5; đặc tả P5; trang-ghep.md §8). `ReceiptDto.phan[]`: mỗi người bán
// một phần, danh sách trắng không đổi (không a%, giá vốn, hoa hồng, tên người thu, hình thức thu). Luật chia: `chiaPhanBienNhan` (rules.ts) — Ruling R-80…R-83.
// ---------------------------------------------------------------------------------------------------------------------------------------------------
// Đọc qua không gian tên: thiếu tên công bố (trước khi cài) thì từng bài đỏ riêng, không đỏ cả tệp lúc nạp.
import * as RB from "./rules.ts";
import type { NguoiBanChoBienNhan } from "./rules.ts";
const chiaPhanBienNhan: typeof RB.chiaPhanBienNhan = (...a) => RB.chiaPhanBienNhan(...a);
import type { BanChup } from "../../shared/hoa-hong-dong.ts";

const CT = "pty-cong-ty";
const NCC_ID = "pty-ncc";
/** Bản chụp một dòng: người bán `ban` (công ty / nhà cung cấp), kèm SỐ LẠ ở mọi ô mức (tỷ lệ, đ/khách, a%, mã mức, mã điều khoản) — không ô nào được ra biên nhận. */
const chupDong = (serviceId: string, ban: string, la: { rate: number; perPax: number; cost: number }): BanChup => ({
  serviceId, beneficiaryPartyId: `pty-huong-${la.perPax}`,
  hoaHong: { status: "SET", kind: "PER_PAX", rateBp: la.rate, perPax: la.perPax, ruleId: `rule-${la.rate}` },
  cungUng: { status: "SET", termId: `term-${la.cost}`, sellerPartyId: ban, supplierPartyId: ban === CT ? null : ban, costRateBp: ban === CT ? null : la.cost },
});
const dvDon = (id: string, name: string, lineTotal: number) => ({
  ...donBiMat().services[0]!, id, name, items: [{ ...donBiMat().services[0]!.items[0]!, id: `${id}-i`, lineTotal, unitPrice: lineTotal, quantity: 1 }],
});
/** Đơn trộn B-4: vé Hòn Tằm 1.000.000 (Tour Đảo bán) + vé i-resort 600.000 (i-resort bán). */
const donTron = (giam = 0): OrderDetailDto => ({
  ...donBiMat(), subtotal: 1_600_000, discount: giam, giamGiaHieuLuc: giam, total: 1_600_000 - giam,
  services: [dvDon("svc-ht", "Vé Hòn Tằm", 1_000_000), dvDon("svc-ir", "Vé tắm bùn i-resort", 600_000)],
});
const LA3 = { rate: 480017, perPax: 460023, cost: 470019 };
const banTron = (): NguoiBanChoBienNhan => ({
  chup: [chupDong("svc-ht", CT, LA3), chupDong("svc-ir", NCC_ID, LA3)],
  ten: new Map([[CT, "Tour Đảo (tên hồ sơ)"], [NCC_ID, "i-resort"], ["pty-huong-460023", "Hương Lễ Tân 470019"]]),
  congTyChuId: CT,
});
const SO_LA_BA = ["480017", "480.017", "4800,17", "470019", "470.019", "460023", "460.023", "Hương Lễ Tân"];
const loSoLa = (t: string) => SO_LA_BA.filter((x) => t.includes(x));
const tong = (phan: { tong: number; daTra: number; conLai: number }[]) => ({
  tong: phan.reduce((a, p) => a + p.tong, 0), daTra: phan.reduce((a, p) => a + p.daTra, 0), conLai: phan.reduce((a, p) => a + p.conLai, 0),
});

test("Task 8 B-4 (luật): đơn trộn ⇒ hai phần — Tour Đảo 1.000.000 đã trả 500.000 còn 500.000; i-resort 600.000 còn 600.000 trả tại quầy; số lạ ở a% / hoa hồng / mã mức / tên người hưởng không lộ", () => {
  const r = dungBienNhan(donTron(), COMPANY, { daTra: 500_000, conLai: 1_100_000, theoThuCho: new Map([[CT, 500_000]]) }, banTron());
  assert.deepEqual(r.phan, [
    { nguoiBan: COMPANY.name, vaiTourDao: "nguoi_ban", dichVu: ["Vé Hòn Tằm"], tong: 1_000_000, giamGia: 0, daTra: 500_000, conLai: 500_000, traTaiQuay: false },
    { nguoiBan: "i-resort", vaiTourDao: "doi_tac_dat_ve", dichVu: ["Vé tắm bùn i-resort"], tong: 600_000, giamGia: 0, daTra: 0, conLai: 600_000, traTaiQuay: true },
  ]);
  assert.deepEqual(loSoLa(JSON.stringify(r)), [], JSON.stringify(r));
  assert.deepEqual(Object.keys(r.phan[0]!).sort(), ["conLai", "daTra", "dichVu", "giamGia", "nguoiBan", "tong", "traTaiQuay", "vaiTourDao"], "khoá phần đúng danh sách trắng");
});

test("Task 8 B-5 (luật): chỉ vé i-resort, đại lý giảm 20.000 ⇒ một phần «giảm 20.000, còn 580.000 thanh toán tại quầy i-resort»; giảm giá trừ vào phần Tour Đảo trước (R-81)", () => {
  const don: OrderDetailDto = { ...donBiMat(), subtotal: 600_000, discount: 20_000, giamGiaHieuLuc: 20_000, total: 580_000, services: [dvDon("svc-ir", "Vé tắm bùn i-resort", 600_000)] };
  const r = dungBienNhan(don, COMPANY, { daTra: 0, conLai: 580_000 }, { ...banTron(), chup: [chupDong("svc-ir", NCC_ID, LA3)] });
  assert.deepEqual(r.phan, [{ nguoiBan: "i-resort", vaiTourDao: "doi_tac_dat_ve", dichVu: ["Vé tắm bùn i-resort"], tong: 580_000, giamGia: 20_000, daTra: 0, conLai: 580_000, traTaiQuay: true }]);
  // Đơn trộn có giảm giá: Tour Đảo chịu trước ⇒ phần nhà cung cấp giữ nguyên số trả tại quầy.
  const tron = dungBienNhan(donTron(150_000), COMPANY, { daTra: 0, conLai: 1_450_000 }, banTron());
  assert.deepEqual(tron.phan.map((p) => [p.tong, p.giamGia, p.conLai]), [[850_000, 150_000, 850_000], [600_000, 0, 600_000]]);
  assert.deepEqual(tong(tron.phan), { tong: tron.total, daTra: 0, conLai: 1_450_000 });
});

test("Task 8 «thu cho ai» (luật): khoản không chọn ⇒ phần Tour Đảo; thu cho i-resort ⇒ phần i-resort; dư của một phần chuyển sang phần còn thiếu; không có phần Tour Đảo ⇒ khoản thu cho Tour Đảo vẫn được tính", () => {
  const a = chiaPhanBienNhan(donTron(), COMPANY.name, banTron(), { daTra: 400_000, theoThuCho: new Map([[CT, 300_000], [NCC_ID, 100_000]]) });
  assert.deepEqual(a.map((p) => [p.daTra, p.conLai]), [[300_000, 700_000], [100_000, 500_000]]);
  // Thu cho Tour Đảo 1.200.000 > phần Tour Đảo 1.000.000 ⇒ 200.000 dư sang phần i-resort.
  const b = chiaPhanBienNhan(donTron(), COMPANY.name, banTron(), { daTra: 1_200_000, theoThuCho: new Map([[CT, 1_200_000]]) });
  assert.deepEqual(b.map((p) => [p.daTra, p.conLai]), [[1_000_000, 0], [200_000, 400_000]]);
  // SV-HT-03 biến thể: lễ tân thu 200.000 KHÔNG chọn «thu cho» (mặc định Tour Đảo) + quầy 400.000 ⇒ đơn chỉ có phần i-resort, vẫn đủ 600.000.
  const chiIr: OrderDetailDto = { ...donBiMat(), subtotal: 600_000, discount: 0, giamGiaHieuLuc: 0, total: 600_000, services: [dvDon("svc-ir", "Vé tắm bùn i-resort", 600_000)] };
  const c = chiaPhanBienNhan(chiIr, COMPANY.name, { ...banTron(), chup: [chupDong("svc-ir", NCC_ID, LA3)] }, { daTra: 600_000, theoThuCho: new Map([[CT, 200_000], [NCC_ID, 400_000]]) });
  assert.deepEqual(c.map((p) => [p.nguoiBan, p.daTra, p.conLai]), [["i-resort", 600_000, 0]]);
  // Khách trả dư ⇒ phần đầu nhận phần dư; Σ đã trả = đã trả của đơn.
  const d = chiaPhanBienNhan(donTron(), COMPANY.name, banTron(), { daTra: 1_700_000, theoThuCho: new Map([[CT, 1_100_000], [NCC_ID, 600_000]]) });
  assert.deepEqual(d.map((p) => [p.daTra, p.conLai]), [[1_100_000, 0], [600_000, 0]]);
  // Trả lại khách làm phần Tour Đảo âm ⇒ bớt ở phần sau, không bao giờ âm.
  const e = chiaPhanBienNhan(donTron(), COMPANY.name, banTron(), { daTra: 500_000, theoThuCho: new Map([[CT, -100_000], [NCC_ID, 600_000]]) });
  assert.deepEqual(e.map((p) => [p.daTra, p.conLai]), [[0, 1_000_000], [500_000, 100_000]]);
  for (const x of [a, b, d, e]) assert.equal(tong(x).daTra, x === a ? 400_000 : x === b ? 1_200_000 : x === d ? 1_700_000 : 500_000);
});

test("Task 8 (luật): người bán thiếu (dòng nhập tay MISSING), dòng chưa có bản chụp, không đọc được bản chụp ⇒ phần Tour Đảo (R-80); đơn huỷ ⇒ không phần nào", () => {
  const thieu: NguoiBanChoBienNhan = { ...banTron(), chup: [chupDong("svc-ht", CT, LA3), { serviceId: "svc-ir", beneficiaryPartyId: null, hoaHong: { status: "NONE" }, cungUng: { status: "MISSING" } }] };
  assert.deepEqual(chiaPhanBienNhan(donTron(), COMPANY.name, thieu, { daTra: 0 }).map((p) => [p.nguoiBan, p.tong]), [[COMPANY.name, 1_600_000]]);
  assert.deepEqual(chiaPhanBienNhan(donTron(), COMPANY.name, { ...banTron(), chup: [] }, { daTra: 0 }).map((p) => [p.nguoiBan, p.dichVu]), [[COMPANY.name, ["Vé Hòn Tằm", "Vé tắm bùn i-resort"]]]);
  assert.deepEqual(chiaPhanBienNhan(donTron(), COMPANY.name, null, { daTra: 100 }).map((p) => [p.nguoiBan, p.tong, p.daTra]), [[COMPANY.name, 1_600_000, 100]]);
  assert.deepEqual(chiaPhanBienNhan({ ...donTron(), status: "cancelled" }, COMPANY.name, banTron(), { daTra: 100 }), []);
});

// ---- Route thật (khung thử: SQLite đủ migration). Đại lý A (tài khoản Đối tác, vai TRAVEL_AGENCY) hưởng 10%; i-resort bán IRESORT, tỷ lệ mua lại 80%.
const R_SALES = "11111111-1111-4111-8111-111111111111";
const R_HDV = "22222222-2222-4222-8222-222222222222";
const R_SUPER = "33333333-3333-4333-8333-333333333333";
const R_KT = "44444444-4444-4444-8444-444444444444";
const R_PT = "66666666-6666-4666-8666-666666666666";
const R_NCC = "pty-ncc";
const R_AT = "2026-10-01T00:00:00.000Z";
const vnHomNay = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
let seq = 0;
const uuid = () => `93939393-9393-4939-8939-${String(++seq).padStart(12, "0")}`;
type W = ReturnType<typeof world>;

async function dung(o: { tenHdv?: string; tyLeMuaBp?: number; hoaHong?: { kieu: "RATE"; tyLeBp: number } | { kieu: "PER_PAX"; moiKhach: number } } = {}): Promise<{ w: W; ct: string }> {
  const w = world();
  for (const [id, phone, name, perms] of [
    [R_SALES, "0900000001", "An Bán", ["SALES"]], [R_HDV, "0900000002", o.tenHdv ?? "Nam HDV", ["FIELD"]], [R_SUPER, "0900000003", "Chủ", ["SUPER_ADMIN"]],
    [R_KT, "0900000005", "Lan Kế Toán", ["ACCOUNTING"]], [R_PT, "0900000008", "Hương Lễ Tân", ["PARTNER"]],
  ] as const) seedStaff(w.sqlite, { id, phone, name, perms: [...perms] });
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES ('ptr-bn-dl', ?, 'TRAVEL_AGENCY', '2026-01-01', ?, ?)").run(`pty-${R_PT}`, R_AT, R_AT);
  const hh = o.hoaHong ?? { kieu: "RATE", tyLeBp: 1000 };
  const m = await w.call("POST", "/api/pricing/hoa-hong", { as: R_KT, body: { tuNgay: "2026-01-01", doiTuong: { loai: "VAI", code: "TRAVEL_AGENCY" }, phamVi: "ALL", ...hh } });
  assert.equal(m.status, 201, m.text);
  w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'ORGANIZATION', 'i-resort', 1, ?, ?)").run(R_NCC, R_AT, R_AT);
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES ('r-bn-ncc', ?, 'SUPPLIER', '2026-01-01', ?, ?)").run(R_NCC, R_AT, R_AT);
  w.sqlite.exec(`INSERT INTO catalog_item (code, name, unit, price_adult, price_child, price_senior, price_infant, sheet_row, in_sheet, first_seen_at, updated_at)
    VALUES ('IRESORT', 'Vé tắm bùn i-resort', 'perPax', 300000, NULL, NULL, NULL, 1, 1, '${R_AT}', '${R_AT}')`);
  const c = await w.call("POST", "/api/pricing/cung-ung", { as: R_KT, body: { phamVi: "SERVICE", catalogCode: "IRESORT", nguoiBanPartyId: R_NCC, tyLeMuaBp: o.tyLeMuaBp ?? 8000, tuNgay: "2026-01-01" } });
  assert.equal(c.status, 201, c.text);
  return { w, ct: String(w.q("SELECT party_id FROM v_pty_owner_company LIMIT 1")[0].party_id) };
}
interface Dv { ten: string; catalog: string; khach: number; donGia: number }
/** Đơn qua SQL (nháp, ngày đi hôm nay) rồi XÁC NHẬN qua route (máy chủ chụp bản chụp); HDV phụ trách. */
async function don(w: W, o: { owner?: string; booker?: string | null; dichVu: Dv[]; giam?: number }): Promise<string> {
  const id = uuid();
  const sub = o.dichVu.reduce((t, d) => t + d.khach * d.donGia, 0);
  const tongDon = sub - (o.giam ?? 0);
  w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, discount, total, remaining_amount, booker_party_id, created_at, updated_at)
    VALUES (?, ?, ?, 'draft', 'Khách Giả', '0900000099', ?, ?, ?, ?, ?, ?, ?)`).run(id, `TD-BN-${seq}`, o.owner ?? R_SALES, sub, o.giam ?? 0, tongDon, tongDon, o.booker === undefined ? `pty-${R_PT}` : o.booker, R_AT, R_AT);
  o.dichVu.forEach((d, i) => {
    const s = `${id}-s${i}`;
    w.sqlite.prepare(`INSERT INTO order_service (pickup_choice, id, order_id, sort_order, catalog_code, name, unit, pax_adult, depart_date) VALUES ('KHONG_DON', ?, ?, ?, ?, ?, 'perPax', ?, ?)`).run(s, id, i, d.catalog, d.ten, d.khach, vnHomNay());
    w.sqlite.prepare(`INSERT INTO order_item (id, order_id, service_id, catalog_code, pax_code, description, quantity, unit_price, catalog_price, line_total) VALUES (?, ?, ?, ?, 'adult', 'Người lớn', ?, ?, ?, ?)`)
      .run(`${s}-i`, id, s, d.catalog, d.khach, d.donGia, d.donGia, d.khach * d.donGia);
  });
  const xn = await w.call("POST", `/api/orders/${id}/status`, { as: R_SUPER, body: { status: "confirmed" } });
  assert.equal(xn.status, 200, xn.text);
  w.sqlite.prepare(`INSERT INTO dsp_assignment (id, order_id, task_kind_code, party_id, status_code, valid_from_at, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, 'HANDLE', ?, 'PENDING', ?, ?, NULL, ?, NULL)`).run(uuid(), id, `pty-${R_HDV}`, R_AT, R_AT, R_AT);
  return id;
}
const thuR = async (w: W, as: string, id: string, body: Record<string, unknown>) => {
  const r = await w.call("POST", `/api/orders/${id}/payments`, { as, body: { hinhThuc: "CASH", ...body } });
  assert.equal(r.status, 201, r.text);
};
const bienNhan = async (w: W, id: string, as = R_SALES) => {
  const r = await w.call("GET", `/api/orders/${id}/receipt`, { as });
  assert.equal(r.status, 200, r.text);
  return r;
};
const VE_IR: Dv = { ten: "Vé tắm bùn i-resort", catalog: "IRESORT", khach: 2, donGia: 300_000 };
const VE_HT: Dv = { ten: "Vé Hòn Tằm", catalog: "HONTAM", khach: 1, donGia: 1_000_000 };

test("Task 8 SV-HT-03 (route thật): chỉ vé i-resort — lễ tân (bên đặt) thu 200.000 «thu cho» i-resort + HDV khai quầy 400.000, Kế toán «Bên kia đã nhận» ⇒ một phần i-resort 600.000, đã trả 600.000, còn 0, trả tại quầy", async () => {
  const { w } = await dung();
  const id = await don(w, { owner: R_PT, dichVu: [VE_IR] });
  await thuR(w, R_PT, id, { soTien: 200_000, nguoiThu: "toi", thuChoNhaCungCapPartyId: R_NCC });
  await thuR(w, R_HDV, id, { soTien: 400_000, nguoiThu: { nhaCungCapPartyId: R_NCC } });
  const rid = String(w.q("SELECT id FROM bil_payment_receipt WHERE order_id = ? ORDER BY rowid DESC LIMIT 1", id)[0].id);
  const bk = await w.call("POST", `/api/ledger/counterparty-receipts/${rid}/confirm`, { as: R_KT, body: {} });
  assert.equal(bk.status, 200, bk.text);
  const r = (await bienNhan(w, id)).json.receipt;
  assert.deepEqual(r.phan, [{ nguoiBan: "i-resort", vaiTourDao: "doi_tac_dat_ve", dichVu: ["Vé tắm bùn i-resort"], tong: 600_000, giamGia: 0, daTra: 600_000, conLai: 0, traTaiQuay: true }]);
  assert.deepEqual([r.daTra, r.conLai], [600_000, 0]);
});

test("Task 8 B-4 (route thật): Hòn Tằm 1.000.000 (Tour Đảo bán) + i-resort 600.000; khách chuyển trước 500.000 cho công ty ⇒ hai phần; không 480.000, 80%, hoa hồng", async () => {
  const { w } = await dung();
  const id = await don(w, { booker: null, dichVu: [VE_HT, VE_IR] });
  await thuR(w, R_SUPER, id, { soTien: 500_000, nguoiThu: "cong_ty" });
  const res = await bienNhan(w, id);
  const r = res.json.receipt;
  assert.deepEqual(r.phan, [
    { nguoiBan: r.company.name, vaiTourDao: "nguoi_ban", dichVu: ["Vé Hòn Tằm"], tong: 1_000_000, giamGia: 0, daTra: 500_000, conLai: 500_000, traTaiQuay: false },
    { nguoiBan: "i-resort", vaiTourDao: "doi_tac_dat_ve", dichVu: ["Vé tắm bùn i-resort"], tong: 600_000, giamGia: 0, daTra: 0, conLai: 600_000, traTaiQuay: true },
  ]);
  assert.doesNotMatch(res.text, /480000|480\.000|80%|8000|hoaHong|giaVon|costRate/, res.text);
});

test("Task 8 B-5 (route thật): đại lý giảm 20.000 trên vé i-resort 600.000 ⇒ «giảm 20.000, còn 580.000 thanh toán tại quầy i-resort»; quầy thu đủ 580.000 ⇒ còn 0", async () => {
  const { w } = await dung();
  const id = await don(w, { owner: R_PT, dichVu: [VE_IR], giam: 20_000 });
  const truoc = (await bienNhan(w, id)).json.receipt;
  assert.deepEqual([truoc.discount, truoc.total], [20_000, 580_000]);
  assert.deepEqual(truoc.phan, [{ nguoiBan: "i-resort", vaiTourDao: "doi_tac_dat_ve", dichVu: ["Vé tắm bùn i-resort"], tong: 580_000, giamGia: 20_000, daTra: 0, conLai: 580_000, traTaiQuay: true }]);
  await thuR(w, R_KT, id, { soTien: 580_000, nguoiThu: { partyId: R_NCC } });
  const sau = (await bienNhan(w, id)).json.receipt;
  assert.deepEqual(sau.phan.map((p: { daTra: number; conLai: number }) => [p.daTra, p.conLai]), [[580_000, 0]]);
});

test("Task 8 «thu cho ai» (route thật): HDV thu 300.000 không chọn ⇒ phần Tour Đảo; HDV thu 100.000 «thu cho» i-resort ⇒ phần i-resort", async () => {
  const { w } = await dung();
  const id = await don(w, { booker: null, dichVu: [VE_HT, VE_IR] });
  await thuR(w, R_HDV, id, { soTien: 300_000, nguoiThu: "toi" });
  await thuR(w, R_HDV, id, { soTien: 100_000, nguoiThu: "toi", thuChoNhaCungCapPartyId: R_NCC });
  const r = (await bienNhan(w, id)).json.receipt;
  assert.deepEqual(r.phan.map((p: { nguoiBan: string; daTra: number; conLai: number }) => [p.vaiTourDao, p.daTra, p.conLai]), [["nguoi_ban", 300_000, 700_000], ["doi_tac_dat_ve", 100_000, 500_000]]);
});

test("Task 8 «thu cho» rồi Kế toán đảo (route thật — M-1 người kiểm Task 8+9): HDV thu 100.000 «thu cho» i-resort, Kế toán đảo lần thu ⇒ phần i-resort đã trả 0, còn 600.000; khoản thu khác vẫn ở phần Tour Đảo", async () => {
  const { w } = await dung();
  const id = await don(w, { booker: null, dichVu: [VE_HT, VE_IR] });
  await thuR(w, R_HDV, id, { soTien: 300_000, nguoiThu: "toi" });
  await thuR(w, R_HDV, id, { soTien: 100_000, nguoiThu: "toi", thuChoNhaCungCapPartyId: R_NCC });
  const truoc = (await bienNhan(w, id)).json.receipt;
  assert.deepEqual(truoc.phan.map((p: { daTra: number }) => p.daTra), [300_000, 100_000], "có răng: trước khi đảo, khoản «thu cho» nằm ở phần i-resort");
  const lt = await w.call("GET", `/api/orders/${id}/payments`, { as: R_KT });
  const rc = lt.json.lanThu.find((l: { soTien: number }) => l.soTien === 100_000)?.id;
  assert.ok(rc, lt.text);
  const d = await w.call("POST", "/api/ledger/adjustments", { as: R_KT, body: { loai: "dao_lan_thu", receiptId: rc, lyDo: "ghi nhầm người thu" } });
  assert.ok(d.status === 200 || d.status === 201, d.text);
  const r = (await bienNhan(w, id)).json.receipt;
  assert.deepEqual(r.phan.map((p: { vaiTourDao: string; daTra: number; conLai: number }) => [p.vaiTourDao, p.daTra, p.conLai]), [["nguoi_ban", 300_000, 700_000], ["doi_tac_dat_ve", 0, 600_000]]);
});

test("Task 8 số lạ (route thật): a% 48,17% (4817), giá vốn 470.019, hoa hồng 460.023/khách, HDV «Nam Số Lạ 4817» thu — sau «Đã giao» biên nhận của Bán hàng, Đối tác, Kế toán không chứa số / tên nào; Kế toán THẤY chúng ở phần thương mại (có răng)", async () => {
  // 975.750 × 48,17% = 470.018,775 ⇒ làm tròn 470.019 (giá vốn); hoa hồng 460.023 đ/khách × 1 khách mỗi dòng. Không số tiền nào khác chứa số lạ.
  const { w } = await dung({ tenHdv: "Nam Số Lạ 4817", tyLeMuaBp: 4817, hoaHong: { kieu: "PER_PAX", moiKhach: 460_023 } });
  const id = await don(w, { owner: R_PT, dichVu: [VE_HT, { ten: "Vé tắm bùn i-resort", catalog: "IRESORT", khach: 1, donGia: 975_750 }] });
  await thuR(w, R_HDV, id, { soTien: 500_000, nguoiThu: "toi", ghiChu: "thu ở cảng 4817" });
  await thuR(w, R_KT, id, { soTien: 975_750, nguoiThu: { partyId: R_NCC } });
  await thuR(w, R_SUPER, id, { soTien: 500_000, nguoiThu: "cong_ty" });
  const g = await w.call("POST", `/api/orders/${id}/delivered`, { as: R_SUPER, body: {} });
  assert.equal(g.status, 200, g.text);
  // Có răng: sổ và phần thương mại của Kế toán mang đúng các số lạ.
  const so = w.q("SELECT kind_code AS k, amount AS a FROM bil_debt_line WHERE order_id = ? AND kind_code IN ('HOA_HONG', 'GIA_VON') ORDER BY rowid", id).map((x: { k: string; a: number }) => `${x.k}:${x.a}`);
  assert.deepEqual(so, ["HOA_HONG:460023", "HOA_HONG:460023", "GIA_VON:470019"]);
  const tm = await w.call("GET", `/api/orders/${id}/thuong-mai`, { as: R_KT });
  assert.match(tm.text, /48,17%/);
  assert.match(tm.text, /470019/);
  const CAM = ["4817", "48,17", "48.17", "470019", "470.019", "460023", "460.023", "920046", "920.046", "Nam Số Lạ", "Hương Lễ Tân", "Chuyển khoản", "Tiền mặt", "cảng"];
  for (const as of [R_SALES, R_PT, R_KT, R_HDV]) {
    const r = await bienNhan(w, id, as);
    const lo = CAM.filter((x) => r.text.includes(x));
    assert.deepEqual(lo, [], `${as}: ${r.text}`);
    assert.deepEqual(r.json.receipt.phan.map((p: { tong: number; daTra: number; conLai: number }) => [p.tong, p.daTra, p.conLai]), [[1_000_000, 1_000_000, 0], [975_750, 975_750, 0]]);
  }
});

test("Task 8 đơn NHÁP (route thật — «Xem biên nhận» mở ngay sau khi lưu đơn mới): đại lý đặt + dòng i-resort ⇒ hai phần theo bản tính thử; khách lẻ có dòng nhập tay ⇒ dòng nhập tay vào phần Tour Đảo; Σ tong = tổng cộng", async () => {
  const { w } = await dung();
  const nhapDon = (booker: string | null, dv: { ten: string; catalog: string | null; donGia: number }[]): string => {
    const id = uuid();
    const sub = dv.reduce((t, d) => t + d.donGia, 0);
    w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, discount, total, remaining_amount, booker_party_id, created_at, updated_at)
      VALUES (?, ?, ?, 'draft', 'Khách Giả', '0900000099', ?, 0, ?, ?, ?, ?, ?)`).run(id, `TD-BN-${seq}`, R_SALES, sub, sub, sub, booker, R_AT, R_AT);
    dv.forEach((d, i) => {
      const s = `${id}-s${i}`;
      w.sqlite.prepare(`INSERT INTO order_service (pickup_choice, id, order_id, sort_order, catalog_code, name, unit, pax_adult, depart_date) VALUES ('KHONG_DON', ?, ?, ?, ?, ?, ?, 1, ?)`).run(s, id, i, d.catalog, d.ten, d.catalog ? "perPax" : "manual", vnHomNay());
      w.sqlite.prepare(`INSERT INTO order_item (id, order_id, service_id, catalog_code, pax_code, description, quantity, unit_price, catalog_price, line_total) VALUES (?, ?, ?, ?, ?, 'Người lớn', 1, ?, ?, ?)`)
        .run(`${s}-i`, id, s, d.catalog, d.catalog ? "adult" : null, d.donGia, d.catalog ? d.donGia : null, d.donGia);
    });
    return id;
  };
  const daiLy = nhapDon(`pty-${R_PT}`, [{ ten: "Vé Hòn Tằm", catalog: "HONTAM", donGia: 1_000_000 }, { ten: "Vé tắm bùn i-resort", catalog: "IRESORT", donGia: 300_000 }]);
  const a = (await bienNhan(w, daiLy)).json.receipt;
  assert.deepEqual(a.phan.map((p: { nguoiBan: string; tong: number; traTaiQuay: boolean }) => [p.nguoiBan, p.tong, p.traTaiQuay]), [[a.company.name, 1_000_000, false], ["i-resort", 300_000, true]]);
  assert.equal(a.phan.reduce((t: number, p: { tong: number }) => t + p.tong, 0), a.total);
  const le = nhapDon(null, [{ ten: "Thuê thuyền riêng", catalog: null, donGia: 700_000 }, { ten: "Vé tắm bùn i-resort", catalog: "IRESORT", donGia: 300_000 }]);
  const b = (await bienNhan(w, le)).json.receipt;
  assert.deepEqual(b.phan.map((p: { nguoiBan: string; dichVu: string[]; tong: number }) => [p.nguoiBan, p.dichVu, p.tong]), [[b.company.name, ["Thuê thuyền riêng"], 700_000], ["i-resort", ["Vé tắm bùn i-resort"], 300_000]]);
  assert.equal(b.phan.reduce((t: number, p: { tong: number }) => t + p.tong, 0), b.total);
});
