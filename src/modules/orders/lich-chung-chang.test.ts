// Hai hàm HẸP mới của orders cho Vận chuyển (ADR-0049 D1, lát 1.4; kế hoạch Task A11; TC-20, TC-21; ADR-0050 VK1-B — khoá so sánh nơi):
//   `lichChungChang(db, tuNgay, denNgay)` → { chang, nhap } — chặng MỞ của đơn ĐÃ XÁC NHẬN theo NGÀY ĐÓN (không tiền, ghi chú, người lập, SĐT, họ tên, customer_*)
//     + hai khoá so sánh nơi `khoaNoiDon` / `khoaNoiTra` (tính trên chữ CHƯA che — chỉ để so); chặng NHÁP chỉ khoá, mã đơn, ngày giờ, cờ đặt gấp (I11).
//   `lienHeChoTaiXe(db, orderIds)` → ĐÚNG bốn khoá { orderId, orderCode, tenLienHe, sdtLienHe } của các đơn được hỏi (đơn đã xác nhận).
// Hai hàm KHÔNG tự kiểm quyền (bài quét nơi gọi ở src/orders-cong-bo.test.ts). Chạy MÃ THẬT (gói esbuild) trên SQLite thật (khung thử — mốc thật).
import { test } from "node:test";
import assert from "node:assert/strict";
import * as esbuild from "esbuild";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
import { registeredSql } from "../../shared/sql-registry.ts";
import { khoaNoi } from "../../shared/khoa-noi.ts";
import "./chang-hanh-khach-repo.ts";

type Mod = typeof import("./index.ts");
const built = await esbuild.build({ entryPoints: [new URL("./index.ts", import.meta.url).pathname], bundle: true, format: "esm", platform: "neutral", target: "es2022", write: false, logLevel: "silent" });
const { lichChungChang, lienHeChoTaiXe, hanhKhachChoChuyen } = (await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0]!.text).toString("base64")}`)) as Mod;

const SALES = "11111111-1111-4111-8111-111111111111";
const ADM = "33333333-3333-4333-8333-333333333333";
const FIELD = "44444444-4444-4444-8444-444444444444";
const LOC = "a941dd7d-faab-4098-9ab9-1df7fa6dd551";
const inDays = (n: number) => new Date(Date.now() + 7 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);
/** Ngày + giờ VN cách bây giờ `phut` phút (ADR-0107: chỉ đặt gấp được chặng ĐANG dưới mốc 360 phút). */
const vnSau = (phut: number) => {
  const iso = new Date(Date.now() + 7 * 3600e3 + phut * 60_000).toISOString();
  return { ngay: iso.slice(0, 10), gio: iso.slice(11, 16) };
};
const D = inDays(3);
const NOI_A = "Căn hộ 0905123456 Mường Thanh";
const NOI_B = "Căn hộ 0905999999 Mường Thanh"; // chỉ khác dãy 8+ chữ số → chữ đã che GIỐNG NOI_A

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: FIELD, phone: "0900000004", name: "Hướng Dẫn", perms: ["FIELD"] });
  w.sqlite.exec("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('ZA1', 'Tour đảo', 'perPax', 500000, 1, '2026-01-01', '2026-01-01')");
  return w;
}
const OUT = (place: string) => ({ direction: "OUT", pickupDate: "", pickupTime: "06:30", pickupLocationId: null, pickupPlace: place, dropoffLocationId: LOC, dropoffPlace: "" });
const RET = { direction: "RETURN", pickupDate: inDays(4), pickupTime: "16:00", pickupLocationId: LOC, pickupPlace: "", dropoffLocationId: null, dropoffPlace: "" };
async function order(w: any, confirm: boolean, legs: unknown[], extra: Record<string, unknown> = {}, ngayDi = D) {
  const r = await w.call("POST", "/api/orders", {
    as: SALES,
    body: {
      customerName: "Khách Dò Tìm Chủ Đơn", customerPhone: "0912345678", customerEmail: "do.tim@example.com", customerNote: "Ghi chú kín", paymentNote: "Tiền mặt",
      services: [{ kind: "catalog", pickupChoice: (legs.length > 0 ? "DON" : "KHONG_DON"), catalogCode: "ZA1", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 500000 }, departDate: ngayDi, legs }],
      passengers: [{ fullName: "Khách Dò Tìm Một", birthYear: 1911, paxCode: "adult" }], ...extra,
    },
  });
  assert.equal(r.status, 201, r.text);
  if (confirm) assert.equal((await w.call("POST", `/api/orders/${r.json.order.id}/status`, { as: SALES, body: { status: "confirmed" } })).status, 200);
  return (await w.call("GET", `/api/orders/${r.json.order.id}`, { as: SALES })).json.order;
}

test("TC-20 lichChungChang: ĐÚNG các khoá của chặng (có khoaNoiDon / khoaNoiTra) và của chặng nháp; chỉ chặng MỞ của đơn ĐÃ XÁC NHẬN theo ngày đón; không tiền / ghi chú / người lập / SĐT / họ tên", async () => {
  const w = setup();
  const o = await order(w, true, [OUT(NOI_A), RET]);
  const nhap = await order(w, false, [OUT("Khách sạn nháp")]);
  const huy = await order(w, true, [OUT("Khách sạn huỷ")]);
  assert.equal((await w.call("POST", `/api/orders/${huy.id}/status`, { as: SALES, body: { status: "cancelled", lyDo: "KHACH_DOI_Y" } })).status, 200);
  const dong = o.services[0].legs.find((l: any) => l.direction === "RETURN");
  const kq = await lichChungChang(w.env.DB, D, inDays(4));
  assert.deepEqual(kq.chang.map((c: any) => c.legId).sort(), o.services[0].legs.map((l: any) => l.id).sort(), "chỉ chặng của đơn đã xác nhận, chưa huỷ");
  for (const c of kq.chang) {
    assert.deepEqual(Object.keys(c).sort(), [
      "choToiThieu", "datGap", "direction", "khoaNoiDon", "khoaNoiTra", "legId", "nguoiCuaDon", "noiDon", "noiDonDiemId", "noiTra", "noiTraDiemId", "orderCode", "orderId", "pickupDate",
      "pickupTime", "serviceName", "soHieuChuyenBay", "soNguoi", "xeRieng",
    ]);
  }
  assert.deepEqual(kq.nhap, [{ legId: nhap.services[0].legs[0].id, orderId: nhap.id, orderCode: nhap.orderCode, pickupDate: D, pickupTime: "06:30", datGap: false }]);
  for (const n of kq.nhap) assert.deepEqual(Object.keys(n).sort(), ["datGap", "legId", "orderCode", "orderId", "pickupDate", "pickupTime"]);
  const out = kq.chang.find((c: any) => c.direction === "OUT")!;
  assert.equal(out.soNguoi, 2);
  assert.equal(out.nguoiCuaDon.length, 1, "khoá người (không tên)");
  assert.equal(out.noiDon, "Căn hộ •••••••••• Mường Thanh", "chữ trả ra đã che");
  assert.equal(out.khoaNoiDon, await khoaNoi({ locationId: null, placeText: NOI_A }), "khoá tính trên chữ CHƯA che");
  assert.equal(out.khoaNoiTra, `L:${LOC}`);
  assert.equal(out.noiTraDiemId, LOC);
  const ret = kq.chang.find((c: any) => c.direction === "RETURN")!;
  assert.equal(ret.khoaNoiDon, `L:${LOC}`);
  assert.equal(ret.khoaNoiTra, null, "chưa có nơi trả → null");
  const text = JSON.stringify(kq);
  for (const leak of ["0912345678", "0905123456", "do.tim@example.com", "Ghi chú kín", "Tiền mặt", "500000", "Chủ Đơn", "Khách Dò Tìm Một", "1911", SALES]) assert.ok(leak === "1911" ? !/(?<![0-9a-fA-F])1911(?![0-9a-fA-F])/.test(text) : !text.includes(leak), `lộ "${leak}"`); // năm sinh dò riêng: khoá SHA-256 / UUID ngẫu nhiên đôi khi tình cờ chứa «1911» (bài chập chờn 17/10)
  // lọc theo NGÀY ĐÓN: chiều về (ngày +4) ra khỏi khoảng [D, D]
  assert.deepEqual((await lichChungChang(w.env.DB, D, D)).chang.map((c: any) => c.direction), ["OUT"]);
  // chặng đã đóng không có
  const doc = (await w.call("GET", `/api/orders/${o.id}`, { as: SALES })).json.order;
  const r = doc.services[0].legs.find((l: any) => l.id === dong.id);
  assert.equal((await w.call("POST", `/api/orders/${o.id}/legs/${r.id}/close`, { as: SALES, body: { expectedUpdatedAt: r.updatedAt, reasonCode: "NOT_NEEDED" } })).status, 200);
  assert.ok(!(await lichChungChang(w.env.DB, D, inDays(4))).chang.some((c: any) => c.legId === dong.id));
});

test("TC-20 [0050] hai nơi CHỈ khác ở dãy từ 8 chữ số: chữ đã che GIỐNG nhau nhưng hai khoá so sánh KHÁC nhau; cờ đặt gấp của chặng", async () => {
  const w = setup();
  const a = await order(w, true, [OUT(NOI_A)]);
  // ADR-0107: chỉ đặt gấp được chặng ĐANG dưới mốc → chặng của b đón sau 150 phút (ngày gB); lịch đọc từ ngày gB tới D để có cả a lẫn b.
  const gB = vnSau(150);
  const b = await order(w, false, [{ ...OUT(NOI_B), pickupDate: gB.ngay, pickupTime: gB.gio }], {}, gB.ngay);
  assert.equal((await w.call("POST", `/api/orders/${b.id}/legs/${b.services[0].legs[0].id}/short-notice`, { as: ADM, body: { lyDo: "KHAC" } })).status, 200);
  assert.equal((await w.call("POST", `/api/orders/${b.id}/status`, { as: SALES, body: { status: "confirmed" } })).status, 200);
  const kq = await lichChungChang(w.env.DB, gB.ngay, D);
  const ca = kq.chang.find((c: any) => c.orderId === a.id)!;
  const cb = kq.chang.find((c: any) => c.orderId === b.id)!;
  assert.equal(ca.noiDon, cb.noiDon, "chữ đã che giống nhau");
  assert.notEqual(ca.khoaNoiDon, cb.khoaNoiDon, "khoá so sánh khác nhau");
  assert.match(ca.khoaNoiDon, /^T:[0-9a-f]{64}$/);
  assert.deepEqual([ca.datGap, cb.datGap], [false, true]);
});

// K2d (khoảng trống P16): `nguoiCuaDon` = khoá người của dòng hành khách HIỆN HÀNH — khách đã huỷ (`voided_at`) KHÔNG có mặt; khách sửa tên (dòng mới cùng
// `person_key`) có mặt MỘT lần. Trước đây đổi `dongHienHanh(rows)` thành mọi dòng mà 0/1790 bài đỏ (người kiểm K2d).
test("K2d nguoiCuaDon: chỉ khoá của dòng khách HIỆN HÀNH — khách đã huỷ vắng mặt, khách sửa tên có đúng một lần", async () => {
  const w = setup();
  const o = await order(w, true, [OUT("Khách sạn A")], {
    passengers: [{ fullName: "Khách Dò Tìm Một", birthYear: 1911, paxCode: "adult" }, { fullName: "Khách Dò Tìm Hai", birthYear: 1922, paxCode: "adult" }],
  });
  let ds = (await w.call("GET", `/api/orders/${o.id}/passengers`, { as: SALES })).json;
  const [a, b] = [...ds.passengers].sort((x: any, y: any) => (x.fullName < y.fullName ? -1 : 1));
  // Huỷ khách "Một" (a); sửa tên khách "Hai" (b — dòng mới cùng person_key).
  ds = (await w.call("POST", `/api/orders/${o.id}/passengers`, { as: SALES, body: { expectedUpdatedAt: ds.orderUpdatedAt, them: [], sua: [], huy: [a.personKey] } })).json;
  const sua = await w.call("POST", `/api/orders/${o.id}/passengers`, {
    as: SALES, body: { expectedUpdatedAt: ds.orderUpdatedAt, them: [], sua: [{ personKey: b.personKey, fullName: "Khách Dò Tìm Hai Sửa", birthYear: 1922, paxCode: "adult" }], huy: [] },
  });
  assert.equal(sua.status, 200, sua.text);
  assert.ok(w.q("SELECT count(*) n FROM ord_passenger WHERE order_id = ? AND voided_at IS NOT NULL", o.id)[0].n >= 1, "chống bài rỗng: có dòng đã huỷ");
  assert.equal(w.q("SELECT count(*) n FROM ord_passenger WHERE person_key = ?", b.personKey)[0].n, 2, "chống bài rỗng: khách sửa tên có HAI dòng cùng khoá");
  const c = (await lichChungChang(w.env.DB, D, D)).chang.find((x: any) => x.orderId === o.id)!;
  assert.deepEqual(c.nguoiCuaDon, [b.personKey], "chỉ khoá hiện hành, không khoá đã huỷ, không lặp");
});

test("TC-21 lienHeChoTaiXe: ĐÚNG bốn khoá; chỉ các đơn được hỏi, đơn đã xác nhận; rỗng → [] (không truy vấn)", async () => {
  const w = setup();
  const a = await order(w, true, [OUT("Khách sạn A")]);
  const b = await order(w, true, [OUT("Khách sạn B")], { customerName: "Người Liên Hệ B", customerPhone: "0987654321" });
  const nhap = await order(w, false, [OUT("Khách sạn C")]);
  const kq = await lienHeChoTaiXe(w.env.DB, [b.id, nhap.id]);
  assert.deepEqual(kq, [{ orderId: b.id, orderCode: b.orderCode, tenLienHe: "Người Liên Hệ B", sdtLienHe: "0987654321" }]);
  for (const k of kq) assert.deepEqual(Object.keys(k).sort(), ["orderCode", "orderId", "sdtLienHe", "tenLienHe"]);
  assert.ok(!JSON.stringify(kq).includes(a.id), "chỉ các đơn được hỏi");
  assert.deepEqual(await lienHeChoTaiXe(w.env.DB, []), []);
});

test("TC-20 lớp thứ nhất: câu SQL của lichChungChang (defineSql) không chọn tiền, ghi chú, người lập, liên hệ khách, họ tên hành khách", () => {
  const cau = registeredSql().filter((x) => x.module === "orders" && /^leg_lich_chung/.test(x.name));
  assert.ok(cau.length >= 2, `phải có câu leg_lich_chung*, thấy ${JSON.stringify(cau.map((x) => x.name))}`);
  for (const c of cau) {
    for (const cot of ["customer_", "subtotal", "total", "deposit", "note", "staff_id", "created_by", "full_name", "birth_year", "payment"]) {
      assert.ok(!c.sql.includes(cot), `${c.name}: chọn cột "${cot}"`);
    }
  }
  const lh = registeredSql().filter((x) => x.module === "orders" && x.name === "order_contact_for_driver");
  assert.equal(lh.length, 1);
  for (const cot of ["subtotal", "total", "deposit", "customer_note", "customer_email", "staff_id", "payment"]) assert.ok(!lh[0]!.sql.includes(cot), `liên hệ: "${cot}"`);
});

void FIELD;

test("kế hoạch ô mới TC-F7 + TC-P8: lichChungChang có `soHieuChuyenBay`; số người chặng về = soNguoiChang (pax_override 2 của dịch vụ 4 khách → 2; cột vượt số khách → kẹp lúc đọc, cột không đổi); hanhKhachChoChuyen cùng số", async () => {
  const w = setup();
  const r = await w.call("POST", "/api/orders", {
    as: SALES,
    body: {
      customerName: "Khách Thử", customerPhone: "0912345678",
      services: [{ kind: "catalog", pickupChoice: "DON", catalogCode: "ZA1", pax: { adult: 4, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 500000 }, departDate: D,
        legs: [{ ...OUT("Sân bay Cam Ranh"), flightCode: "VN1553" }, { ...RET, paxOverride: 2, flightCode: "VJ123" }] }],
    },
  });
  assert.equal(r.status, 201, r.text);
  assert.equal((await w.call("POST", `/api/orders/${r.json.order.id}/status`, { as: SALES, body: { status: "confirmed" } })).status, 200);
  const kq = await lichChungChang(w.env.DB, D, inDays(4));
  const di = kq.chang.find((c: any) => c.direction === "OUT")!;
  const ve = kq.chang.find((c: any) => c.direction === "RETURN")!;
  assert.deepEqual([di.soNguoi, di.soHieuChuyenBay], [4, "VN1553"]);
  assert.deepEqual([ve.soNguoi, ve.soHieuChuyenBay], [2, "VJ123"]);
  const hk = await hanhKhachChoChuyen(w.env.DB, [di.legId, ve.legId]);
  assert.deepEqual(hk.map((c: any) => [c.direction, c.soNguoi]).sort(), [["OUT", 4], ["RETURN", 2]]);
  // Cột vượt số khách (tình trạng sau khi giảm khách — chèn thẳng để mô phỏng): đọc kẹp về số khách dịch vụ, cột giữ nguyên (máy không tự sửa).
  w.sqlite.prepare("UPDATE ord_transfer_leg SET pax_override = 6 WHERE id = ?").run(ve.legId);
  const kq2 = await lichChungChang(w.env.DB, D, inDays(4));
  assert.equal(kq2.chang.find((c: any) => c.legId === ve.legId)!.soNguoi, 4);
  assert.equal((await hanhKhachChoChuyen(w.env.DB, [ve.legId]))[0]!.soNguoi, 4);
  assert.equal(w.q("SELECT pax_override FROM ord_transfer_leg WHERE id = ?", ve.legId)[0].pax_override, 6);
});

test("Đợt 7 (ADR-0056 VK3-A): lichChungChang + hanhKhachChoChuyen trả `xeRieng` / `choToiThieu` từ hai cột; mặc định false / null", async () => {
  const w = setup();
  const r = await w.call("POST", "/api/orders", {
    as: SALES,
    body: {
      customerName: "Khách Thử", customerPhone: "0912345678",
      services: [{ kind: "catalog", pickupChoice: "DON", catalogCode: "ZA1", pax: { adult: 4, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 500000 }, departDate: D,
        legs: [{ ...OUT("Sân bay Cam Ranh"), exclusiveVehicle: true, minVehicleSeats: 15 }, RET] }],
    },
  });
  assert.equal(r.status, 201, r.text);
  assert.equal((await w.call("POST", `/api/orders/${r.json.order.id}/status`, { as: SALES, body: { status: "confirmed" } })).status, 200);
  const kq = await lichChungChang(w.env.DB, D, inDays(4));
  const di = kq.chang.find((c: any) => c.direction === "OUT")!;
  const ve = kq.chang.find((c: any) => c.direction === "RETURN")!;
  assert.deepEqual([di.xeRieng, di.choToiThieu], [true, 15]);
  assert.deepEqual([ve.xeRieng, ve.choToiThieu], [false, null]);
  const hk = await hanhKhachChoChuyen(w.env.DB, [di.legId, ve.legId]);
  assert.deepEqual(hk.map((c: any) => [c.direction, c.xeRieng, c.choToiThieu]).sort(), [["OUT", true, 15], ["RETURN", false, null]]);
  w.sqlite.prepare("UPDATE ord_transfer_leg SET exclusive_vehicle = 1, min_vehicle_seats = 15 WHERE id = ?").run(ve.legId);
  assert.deepEqual((await hanhKhachChoChuyen(w.env.DB, [ve.legId])).map((c: any) => [c.xeRieng, c.choToiThieu]), [[true, 15]]);
});
