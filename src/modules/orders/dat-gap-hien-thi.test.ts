// DẤU ĐẶT GẤP trên CHI TIẾT ĐƠN theo vai (chủ trả lời H4 / N-14, 29/9 tối — "Trả lời lần 12"; ADR-0049 D2): mọi DTO chặng của chi tiết đơn (`legs[].datGap`)
// - văn phòng (SALES, ACCOUNTING, ADMIN, SUPER_ADMIN — ô `order.leg.short_notice.view` = any): ĐỦ — mã + nhãn lý do, người duyệt (tên hiển thị, không SĐT),
//   lúc duyệt, ghi chú (đã che số);
// - Đối tác, HDV, Thực tập (ô đó = none): CHỈ cờ `{ daDuyet: true }` — khoá lý do, người, lúc, ghi chú VẮNG MẶT (không phải chuỗi rỗng);
// - chặng không đặt gấp: `datGap: null` với mọi vai. Tài xế (hai mã) không xem chi tiết đơn (không đổi).
// Chạy CẢ ứng dụng trên SQLite thật (tests/audit/harness.mjs), mốc THẬT.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const ADM = "33333333-3333-4333-8333-333333333333";
const FIELD = "44444444-4444-4444-8444-444444444444";
const ACC = "55555555-5555-4555-8555-555555555555";
const SUP = "77777777-7777-4777-8777-777777777777";
const PARTNER = "88888888-8888-4888-8888-888888888888";
const INTERN = "99999999-9999-4999-8999-999999999999";
const LOC = "a941dd7d-faab-4098-9ab9-1df7fa6dd551";
const TEN_DUYET = "Duyệt Viên Đánh Dấu";
const inDays = (n: number) => new Date(Date.now() + 7 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);
// ADR-0107 ý (ii): dấu chỉ ghi lên chặng ĐANG dưới mốc — chặng chiều đi gieo 2 giờ nữa (giờ VN, mốc thật 6 giờ), chặng về 18:00 ngày hôm sau (luôn xa).
const G = new Date(Date.now() + 7 * 3600e3 + 120 * 60_000).toISOString();
const NGAY_DI = G.slice(0, 10);
const NGAY_VE = new Date(Date.parse(`${NGAY_DI}T00:00:00Z`) + 86400e3).toISOString().slice(0, 10);

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: TEN_DUYET, perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: FIELD, phone: "0900000004", name: "Hướng Dẫn", perms: ["FIELD"] });
  seedStaff(w.sqlite, { id: ACC, phone: "0900000005", name: "Kế toán", perms: ["ACCOUNTING"] });
  seedStaff(w.sqlite, { id: SUP, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  seedStaff(w.sqlite, { id: PARTNER, phone: "0900000008", name: "Đối tác", perms: ["PARTNER"] });
  seedStaff(w.sqlite, { id: INTERN, phone: "0900000009", name: "Thực tập", perms: ["INTERN"] });
  w.sqlite.exec("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('ZA1', 'Tour đảo', 'perPax', 500000, 1, '2026-01-01', '2026-01-01')");
  return w;
}
const leg = (date: string, time: string) =>
  ({ direction: "OUT", pickupDate: date, pickupTime: time, pickupLocationId: null, pickupPlace: "Khách sạn Dò Tìm", dropoffLocationId: LOC, dropoffPlace: "" });
const than = (extra: Record<string, unknown> = {}) => ({
  customerName: "Khách Thử", customerPhone: "0912345678",
  services: [{
    kind: "catalog", pickupChoice: "DON", catalogCode: "ZA1", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 500000 }, departDate: NGAY_DI,
    legs: [leg(NGAY_DI, G.slice(11, 16)), { ...leg(NGAY_VE, "18:00"), direction: "RETURN" }],
  }],
  ...extra,
});
async function nhap(w: any, as: string, extra: Record<string, unknown> = {}) {
  const r = await w.call("POST", "/api/orders", { as, body: than(extra) });
  assert.equal(r.status, 201, r.text);
  return r.json.order;
}
/** Quản trị đặt gấp chặng chiều ĐI (chặng về giữ không dấu). */
async function datGapChieuDi(w: any, o: any) {
  const di = o.services[0].legs.find((l: any) => l.direction === "OUT");
  const r = await w.call("POST", `/api/orders/${o.id}/legs/${di.id}/short-notice`, { as: ADM, body: { lyDo: "CHUYEN_BAY_DOI_GIO", ghiChu: "Khách gọi, số 0905123456" } });
  assert.equal(r.status, 200, r.text);
  return r.json.order;
}
const legsOf = (order: any) => order.services.flatMap((s: any) => s.legs);
const KHOA_DU = ["daDuyet", "ghiChu", "luc", "lyDo", "lyDoNhan", "nguoiDuyet"];

function kiemDu(order: any, ai: string) {
  const [di, ve] = [legsOf(order).find((l: any) => l.direction === "OUT"), legsOf(order).find((l: any) => l.direction === "RETURN")];
  assert.deepEqual(Object.keys(di.datGap).sort(), KHOA_DU, `${ai}: văn phòng thấy ĐỦ khoá`);
  assert.equal(di.datGap.daDuyet, true);
  assert.equal(di.datGap.lyDo, "CHUYEN_BAY_DOI_GIO");
  assert.equal(di.datGap.lyDoNhan, "Chuyến bay đổi giờ");
  assert.equal(di.datGap.nguoiDuyet, TEN_DUYET, "tên HIỂN THỊ người duyệt");
  assert.match(di.datGap.luc, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  assert.match(di.datGap.ghiChu, /^Khách gọi, số •+$/, "ghi chú ĐÃ CHE dãy số (lưu đã che ở route đặt gấp)");
  assert.equal(ve.datGap, null, `${ai}: chặng không đặt gấp → null`);
  assert.doesNotMatch(JSON.stringify(order), /0900000003/, "không SĐT người duyệt");
}
function kiemCo(order: any, ai: string) {
  const [di, ve] = [legsOf(order).find((l: any) => l.direction === "OUT"), legsOf(order).find((l: any) => l.direction === "RETURN")];
  assert.deepEqual(di.datGap, { daDuyet: true }, `${ai}: CHỈ cờ — lý do, người, lúc, ghi chú VẮNG MẶT`);
  assert.equal(ve.datGap, null, `${ai}: chặng không đặt gấp → null`);
  const txt = JSON.stringify(order);
  for (const lo of [TEN_DUYET, "Chuyến bay đổi giờ", "CHUYEN_BAY_DOI_GIO", "Khách gọi", "0900000003"]) assert.ok(!txt.includes(lo), `${ai}: lộ "${lo}"`);
}

test("H4/N-14: văn phòng (Bán hàng, Kế toán, Quản trị, Toàn quyền) thấy ĐỦ dấu đặt gấp trên GET /api/orders/:id; HDV đang phụ trách đơn đó CHỈ thấy cờ", async () => {
  const w = setup();
  const o = await nhap(w, SALES, { handlerStaffId: FIELD });
  kiemDu(await datGapChieuDi(w, o), "phản hồi route đặt gấp (Quản trị)");
  for (const as of [SALES, ACC, ADM, SUP]) {
    const r = await w.call("GET", `/api/orders/${o.id}`, { as });
    assert.equal(r.status, 200, `${as}: ${r.text}`);
    kiemDu(r.json.order, as);
  }
  const hdv = await w.call("GET", `/api/orders/${o.id}`, { as: FIELD });
  assert.equal(hdv.status, 200, hdv.text);
  kiemCo(hdv.json.order, "HDV");
});

test("H4/N-14: Đối tác và Thực tập (đơn tự lập) CHỈ thấy cờ — ở GET chi tiết lẫn phản hồi LƯU NHÁP (PUT) — dù Quản trị đã duyệt kèm ghi chú", async () => {
  const w = setup();
  for (const as of [PARTNER, INTERN]) {
    const o = await nhap(w, as);
    await datGapChieuDi(w, o);
    const r = await w.call("GET", `/api/orders/${o.id}`, { as });
    assert.equal(r.status, 200, r.text);
    kiemCo(r.json.order, `${as} GET`);
    const luu = await w.call("PUT", `/api/orders/${o.id}`, { as, body: { ...than(), expectedUpdatedAt: r.json.order.updatedAt } });
    assert.equal(luu.status, 200, luu.text);
    kiemCo(luu.json.order, `${as} PUT (dấu giữ theo Q1 = (a): chặng không đổi)`);
    // Quản trị xem CÙNG đơn: đủ.
    kiemDu((await w.call("GET", `/api/orders/${o.id}`, { as: ADM })).json.order, `Quản trị xem đơn của ${as}`);
  }
});

// ---- R-P21 (điều phối 29/9 đêm — lỗ tìm thấy trước phát hành, áp lời chủ H4): khối LỊCH SỬ trên trang đơn -----------------------------------------------
// Dòng nhật ký `order_leg_short_notice` (route đặt gấp) và dòng sửa / thêm chặng kèm `datGap` ("… · đặt gấp: <nhãn>") lộ lý do + tên người duyệt. Đối tác,
// HDV, Thực tập: dòng đó chỉ còn "Điều chỉnh khẩn cấp (văn phòng)" (ADR-0107 mục 8), người làm = "Văn phòng" rồi lớp ADR-0131 làm rỗng. Văn phòng giữ nguyên.
const lichSu = async (w: any, id: string, as: string) => {
  const r = await w.call("GET", `/api/orders/${id}`, { as });
  assert.equal(r.status, 200, r.text);
  return r.json.history as { action: string; staffId: string | null; staffName: string; detail: string | null }[];
};
function kiemLichSuCo(h: { action: string; staffId: string | null; staffName: string; detail: string | null }[], ai: string, tenMong = "") {
  const dong = h.filter((e) => e.action === "order_leg_short_notice" || /đặt gấp|Điều chỉnh khẩn cấp/iu.test(e.detail ?? ""));
  assert.ok(dong.length > 0, `${ai}: chống bài rỗng — phải có dòng đặt gấp`);
  for (const e of dong) {
    assert.equal(e.staffName, tenMong, `${ai}: người làm chỉ là nhãn "${tenMong}"`); // ADR-0131 đ2: người không qua `audit.view` (Đối tác, HDV, Thực tập) không thấy tên nào, kể cả nhãn "Văn phòng"
    assert.equal(e.staffId, null, `${ai}: không lộ id người duyệt`);
    assert.match(e.detail ?? "", / · Điều chỉnh khẩn cấp \(văn phòng\)$/, `${ai}: ${e.detail}`);
    assert.doesNotMatch(e.detail ?? "", /Quản trị/, `${ai}: ADR-0107 — người đóng dấu có thể là Bán hàng, không ghi "Quản trị"`);
  }
  const txt = JSON.stringify(h);
  for (const lo of [TEN_DUYET, ADM, "Chuyến bay đổi giờ", "Khách đoàn gọi gấp", "CHUYEN_BAY_DOI_GIO", "Khách gọi"]) assert.ok(!txt.includes(lo), `${ai}: lịch sử lộ "${lo}"`);
}

test("R-P21: lịch sử đơn — Đối tác, Thực tập (đơn tự lập), HDV (đơn đang phụ trách) KHÔNG thấy lý do / tên người duyệt đặt gấp; văn phòng thấy đủ", async () => {
  const w = setup();
  for (const as of [PARTNER, INTERN]) {
    const o = await nhap(w, as);
    await datGapChieuDi(w, o);
    kiemLichSuCo(await lichSu(w, o.id, as), as);
    const vp = await lichSu(w, o.id, ACC);
    const dong = vp.find((e) => e.action === "order_leg_short_notice")!;
    assert.equal(dong.staffName, "", "văn phòng không qua audit.view: không tên (ADR-0131 đ2)");
    assert.match(dong.detail!, /đặt gấp: Chuyến bay đổi giờ/, "văn phòng: nhãn lý do");
    const chu = (await lichSu(w, o.id, SUP)).find((e) => e.action === "order_leg_short_notice")!;
    assert.equal(chu.staffName, TEN_DUYET, "Toàn quyền: tên người duyệt");
  }
  const o = await nhap(w, SALES, { handlerStaffId: FIELD });
  await datGapChieuDi(w, o);
  kiemLichSuCo(await lichSu(w, o.id, FIELD), "HDV");
  assert.ok((await lichSu(w, o.id, SUP)).some((e) => e.staffName === TEN_DUYET && /Chuyến bay đổi giờ/.test(e.detail ?? "")), "Toàn quyền: tên người duyệt + nhãn lý do");
  for (const as of [SALES, ADM]) assert.ok((await lichSu(w, o.id, as)).some((e) => e.staffName === "" && /Chuyến bay đổi giờ/.test(e.detail ?? "")), `${as}: nhãn lý do, không tên`);
});

test("R-P21: lịch sử đơn — dòng SỬA CHẶNG đơn đã xác nhận dưới mốc kèm datGap ('… · đặt gấp: <nhãn>') cũng rút gọn với HDV đang phụ trách", async () => {
  const w = setup();
  // Ngày đi = ngày mai, chặng 23:00 ngày mai (luôn xa hơn mốc 6 giờ) → xác nhận được; rồi Quản trị dời giờ đón về 90 phút nữa (dưới mốc) kèm datGap.
  const mai = inDays(1);
  const tao = await w.call("POST", "/api/orders", {
    as: SALES,
    body: { ...than({ handlerStaffId: FIELD }), services: [{ kind: "catalog", pickupChoice: "DON", catalogCode: "ZA1", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 500000 }, departDate: mai, legs: [leg(mai, "23:00")] }] },
  });
  assert.equal(tao.status, 201, tao.text);
  const o = tao.json.order;
  const xn = await w.call("POST", `/api/orders/${o.id}/status`, { as: SALES, body: { status: "confirmed" } });
  assert.equal(xn.status, 200, xn.text);
  const don = (await w.call("GET", `/api/orders/${o.id}`, { as: ADM })).json.order;
  const l = legsOf(don).find((x: any) => x.direction === "OUT");
  const gan = new Date(Date.now() + 7 * 3600e3 + 90 * 60_000).toISOString();
  const sua = await w.call("PUT", `/api/orders/${o.id}/legs/${l.id}`, {
    as: ADM,
    body: {
      expectedUpdatedAt: l.updatedAt, leg: { pickupDate: gan.slice(0, 10), pickupTime: gan.slice(11, 16), pickupLocationId: null, pickupPlace: "Khách sạn Dò Tìm", dropoffLocationId: LOC, dropoffPlace: "" },
      datGap: { lyDo: "CHUYEN_BAY_DOI_GIO" },
    },
  });
  assert.equal(sua.status, 200, sua.text);
  kiemLichSuCo(await lichSu(w, o.id, FIELD), "HDV — dòng sửa chặng");
});

test("H4/N-14: chặng chưa đặt gấp → datGap null với mọi vai (khoá có mặt, giá trị null)", async () => {
  const w = setup();
  const o = await nhap(w, SALES, { handlerStaffId: FIELD });
  for (const as of [SALES, ADM, FIELD]) {
    const r = await w.call("GET", `/api/orders/${o.id}`, { as });
    for (const l of legsOf(r.json.order)) assert.ok("datGap" in l && l.datGap === null, `${as}: ${JSON.stringify(l)}`);
  }
});
