// Ô MỚI CỦA CHẶNG — đường GHI (kế hoạch docs/superpowers/plans/2026-10-01-may-chu-o-moi-chang-ke-hoach.md Task 3; TC-F3, F4, F5, F6, F8, TC-P2…P7, P10):
// số hiệu chuyến bay `flightCode` (ADR-0055 VK2-C) và số người riêng của chặng về `paxOverride` (ADR-0054 D10.3). Chủ 1/10: Q-B = GIỮ dấu đặt gấp khi chỉ đổi
// ô phụ. Chạy CẢ ứng dụng trên SQLite thật (tests/audit/harness.mjs) với mốc THẬT 360 phút. Tên, SĐT là GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const SALES_B = "22222222-2222-4222-8222-222222222222";
const ADM = "33333333-3333-4333-8333-333333333333";
const FIELD = "44444444-4444-4444-8444-444444444444";
const ACC = "55555555-5555-4555-8555-555555555555";
const SUP = "77777777-7777-4777-8777-777777777777";
const PARTNER = "88888888-8888-4888-8888-888888888888";
const INTERN = "99999999-9999-4999-8999-999999999999";
const LOC = "a941dd7d-faab-4098-9ab9-1df7fa6dd551";
const PHUT = 60_000;
const inDays = (n: number) => new Date(Date.now() + 7 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);
const vnSau = (phut: number) => {
  const iso = new Date(Date.now() + 7 * 3600e3 + phut * PHUT).toISOString();
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
};
const D = inDays(3);

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: SALES_B, phone: "0900000002", name: "Bình", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: FIELD, phone: "0900000004", name: "Hướng Dẫn", perms: ["FIELD"] });
  seedStaff(w.sqlite, { id: ACC, phone: "0900000005", name: "Kế toán", perms: ["ACCOUNTING"] });
  seedStaff(w.sqlite, { id: SUP, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  seedStaff(w.sqlite, { id: PARTNER, phone: "0900000008", name: "Đối tác", perms: ["PARTNER"] });
  seedStaff(w.sqlite, { id: INTERN, phone: "0900000009", name: "Thực tập", perms: ["INTERN"] });
  w.sqlite.exec("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('ZA1', 'Tour đảo', 'perPax', 500000, 1, '2026-01-01', '2026-01-01')");
  return w;
}
const OUT = { direction: "OUT", pickupDate: "", pickupTime: "06:30", pickupLocationId: null, pickupPlace: "Sân bay Cam Ranh", dropoffLocationId: LOC, dropoffPlace: "" };
const RET = { direction: "RETURN", pickupDate: inDays(4), pickupTime: "16:00", pickupLocationId: LOC, pickupPlace: "", dropoffLocationId: null, dropoffPlace: "Khách sạn Dò Tìm" };
const svc = (legs: unknown[], extra: Record<string, unknown> = {}) =>
  ({ kind: "catalog", catalogCode: "ZA1", pax: { adult: 4, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 500000 }, departDate: D, legs, ...extra });
const body = (services: unknown[], extra: Record<string, unknown> = {}) => ({ customerName: "Khách Thử", customerPhone: "0912345678", services, ...extra });

async function lap(w: any, as: string, legs: unknown[] = [OUT, RET], extra: Record<string, unknown> = {}) {
  const r = await w.call("POST", "/api/orders", { as, body: body([svc(legs, extra)]) });
  assert.equal(r.status, 201, r.text);
  return r.json.order;
}
const xem = async (w: any, id: string) => (await w.call("GET", `/api/orders/${id}`, { as: ADM })).json.order;
const xacNhan = async (w: any, o: any, as = SALES) => assert.equal((await w.call("POST", `/api/orders/${o.id}/status`, { as, body: { status: "confirmed" } })).status, 200);
/** Chặng (LegDto) → thân chặng gửi lại (giữ id). Khoá ô phụ chỉ có khi `over` mang. */
const legBody = (l: any, over: Record<string, unknown> = {}) => ({
  id: l.id, direction: l.direction, pickupDate: l.pickupDate ?? "", pickupTime: l.pickupTime ?? "", pickupLocationId: l.pickupLocationId, pickupPlace: l.pickupPlace ?? "",
  dropoffLocationId: l.dropoffLocationId, dropoffPlace: l.dropoffPlace ?? "", ...over,
});
const legEdit = (l: any, over: Record<string, unknown> = {}) => {
  const { id: _i, direction: _d, ...rest } = legBody(l, over);
  return rest;
};
const luuNhap = (w: any, o: any, as: string, legs: unknown[], extra: Record<string, unknown> = {}) =>
  w.call("PUT", `/api/orders/${o.id}`, { as, body: body([svc(legs, { id: o.services[0].id, ...extra })], { expectedUpdatedAt: o.updatedAt }) });
const ve = (o: any) => o.services[0].legs.find((l: any) => l.direction === "RETURN");
const di = (o: any) => o.services[0].legs.find((l: any) => l.direction === "OUT");
const cot = (w: any, legId: string) => ({ ...w.q("SELECT flight_code, pax_override, short_notice_reason FROM ord_transfer_leg WHERE id = ?", legId)[0] });
const cotTheoChieu = (w: any, orderId: string, dir: string) =>
  ({ ...w.q("SELECT id, flight_code, pax_override, short_notice_reason FROM ord_transfer_leg WHERE order_id = ? AND direction = ? AND closed_at IS NULL", orderId, dir)[0] });
const suaChang = (w: any, o: any, as: string, l: any, over: Record<string, unknown>, extra: Record<string, unknown> = {}) =>
  w.call("PUT", `/api/orders/${o.id}/legs/${l.id}`, { as, body: { expectedUpdatedAt: l.updatedAt, leg: legEdit(l, over), ...extra } });
const nhanhNhap = (w: any, o: any, as: string, l: any, b: Record<string, unknown>) => w.call("PUT", `/api/orders/${o.id}/legs/${l.id}`, { as, body: b });
const nhatKy = (w: any, orderId: string, action: string) => w.q("SELECT detail FROM audit_log WHERE order_id = ? AND action = ? ORDER BY created_at, rowid", orderId, action).map((r: any) => r.detail as string);

// ---- TC-F3, TC-F4, TC-F2 (máy chủ chuẩn hoá) — đơn NHÁP ------------------------------------------------------------------------------------------------------
test("TC-F3 nháp: Bán hàng / Đối tác / Thực tập (đơn mình) ghi số hiệu khi lập + lưu nháp → 200, lưu chữ HOA đã chuẩn hoá; Kế toán lưu nháp → 403", async () => {
  const w = setup();
  for (const as of [SALES, PARTNER, INTERN]) {
    const o = await lap(w, as, [{ ...OUT, flightCode: " vn 1553 " }]);
    assert.equal(cot(w, di(o).id).flight_code, "VN1553", as);
    const r = await luuNhap(w, o, as, [legBody(di(o), { flightCode: "vj123" })]);
    assert.equal(r.status, 200, `${as}: ${r.text}`);
    assert.equal(cotTheoChieu(w, o.id, "OUT").flight_code, "VJ123", as);
    const sai = await luuNhap(w, r.json.order, as, [legBody(di(r.json.order), { flightCode: "VN-1553" })]);
    assert.equal(sai.status, 400, `${as}: ${sai.text}`);
    assert.match(sai.json.error.message, /Số hiệu chuyến bay/);
    const xoa = await luuNhap(w, r.json.order, as, [legBody(di(r.json.order), { flightCode: "" })]);
    assert.equal(xoa.status, 200, xoa.text);
    assert.equal(cotTheoChieu(w, o.id, "OUT").flight_code, null, "chuỗi rỗng = xoá về NULL");
  }
  const o = await lap(w, SALES, [{ ...OUT, flightCode: "VN1553" }]);
  assert.equal((await luuNhap(w, o, ACC, [legBody(di(o), { flightCode: "VJ123" })])).status, 403);
  // ADR-0055 tiêu chí 7: Đối tác sửa số hiệu trên nháp của NGƯỜI KHÁC → 403 (ô order.modify phạm vi own); Thực tập cũng vậy.
  for (const as of [PARTNER, INTERN]) assert.equal((await luuNhap(w, o, as, [legBody(di(o), { flightCode: "VJ123" })])).status, 403, as);
  assert.equal(cot(w, di(o).id).flight_code, "VN1553");
});

test("TC-F4 khoá vắng = giữ: lưu nháp thân MỚI không có khoá flightCode / paxOverride → hai ô còn nguyên (chặng cùng id)", async () => {
  const w = setup();
  const o = await lap(w, SALES, [{ ...OUT, flightCode: "VN1553" }, { ...RET, flightCode: "VJ123", paxOverride: 2 }]);
  const r = await luuNhap(w, o, SALES, [legBody(di(o), { pickupTime: "07:00" }), legBody(ve(o))]);
  assert.equal(r.status, 200, r.text);
  assert.equal(cotTheoChieu(w, o.id, "OUT").flight_code, "VN1553");
  assert.deepEqual([cotTheoChieu(w, o.id, "RETURN").flight_code, cotTheoChieu(w, o.id, "RETURN").pax_override], ["VJ123", 2]);
});

test("TC-F4 (thân CŨ, PWA chưa tải bản mới — không khoá legs): lưu nháp đổi giờ đón → hai ô của mọi chặng còn nguyên", async () => {
  const w = setup();
  const o = await lap(w, SALES, [{ ...OUT, flightCode: "VN1553" }, { ...RET, paxOverride: 2 }]);
  const r = await w.call("PUT", `/api/orders/${o.id}`, {
    as: SALES, body: body([{ ...svc([]), legs: undefined, id: o.services[0].id, pickupTime: "07:45", pickupPlace: "Sân bay Cam Ranh" }], { expectedUpdatedAt: o.updatedAt }),
  });
  assert.equal(r.status, 200, r.text);
  assert.equal(cotTheoChieu(w, o.id, "OUT").flight_code, "VN1553");
  assert.equal(cotTheoChieu(w, o.id, "RETURN").pax_override, 2);
});

test("lưu nháp giữ CẢ số hiệu lẫn dấu đặt gấp chép (Q1 = (a)) trên cùng chặng — vị trí tham số câu chèn có lính gác đúng", async () => {
  const w = setup();
  const g = vnSau(120);
  const o = await lap(w, SALES, [{ ...OUT, pickupDate: g.date, pickupTime: g.time, flightCode: "VN1553" }], { departDate: g.date });
  assert.equal((await w.call("POST", `/api/orders/${o.id}/legs/${di(o).id}/short-notice`, { as: ADM, body: { lyDo: "CHUYEN_BAY_DOI_GIO" } })).status, 200);
  const o2 = await xem(w, o.id);
  const r = await luuNhap(w, o2, SALES, [legBody(di(o2))], { departDate: g.date });
  assert.equal(r.status, 200, r.text);
  const row = { ...w.q("SELECT flight_code, pax_override, short_notice_reason, short_notice_by, short_notice_at, short_notice_lead_minutes FROM ord_transfer_leg WHERE order_id = ?", o.id)[0] };
  assert.equal(row.flight_code, "VN1553");
  assert.equal(row.pax_override, null);
  assert.equal(row.short_notice_reason, "CHUYEN_BAY_DOI_GIO");
  assert.equal(row.short_notice_by, ADM);
  assert.equal(row.short_notice_lead_minutes, 360);
  assert.ok(String(row.short_notice_at).endsWith("Z"));
});

// ---- TC-F3 sau xác nhận, TC-F6 ------------------------------------------------------------------------------------------------------------------------------
test("TC-F3 sau xác nhận: thêm / sửa số hiệu — Bán hàng đơn mình, Quản trị → được; Bán hàng đơn người khác, Đối tác, Thực tập, HDV → 403", async () => {
  const w = setup();
  const o = await lap(w, SALES, [OUT]);
  await xacNhan(w, o);
  const c = await xem(w, o.id);
  for (const as of [SALES_B, PARTNER, INTERN, FIELD]) {
    assert.equal((await suaChang(w, c, as, di(c), { flightCode: "VN1553" })).status, 403, as);
    assert.equal((await w.call("POST", `/api/orders/${o.id}/legs`, { as, body: { expectedUpdatedAt: c.updatedAt, serviceId: c.services[0].id, leg: { ...RET, flightCode: "VJ123" } } })).status, 403, as);
  }
  const r = await suaChang(w, c, SALES, di(c), { flightCode: "vn 1553" });
  assert.equal(r.status, 200, r.text);
  assert.equal(cot(w, di(c).id).flight_code, "VN1553");
  const r2 = await suaChang(w, r.json.order, ADM, di(r.json.order), { flightCode: "VJ123" });
  assert.equal(r2.status, 200, r2.text);
  const them = await w.call("POST", `/api/orders/${o.id}/legs`, { as: SALES, body: { expectedUpdatedAt: r2.json.order.updatedAt, serviceId: c.services[0].id, leg: { ...RET, flightCode: "QH1520" } } });
  assert.equal(them.status, 201, them.text);
  assert.equal(cotTheoChieu(w, o.id, "RETURN").flight_code, "QH1520");
  // TC-F6: nhật ký ghi GIÁ TRỊ số hiệu (G-C2).
  const sua = nhatKy(w, o.id, "order_leg_updated");
  assert.deepEqual(sua, ["Chiều đi · Tour đảo: số hiệu chuyến bay (trống) → VN1553", "Chiều đi · Tour đảo: số hiệu chuyến bay VN1553 → VJ123"]);
  assert.match(nhatKy(w, o.id, "order_leg_added")[0]!, /, số hiệu chuyến bay QH1520$/);
});

// ---- TC-F5, TC-P7 (mốc 6 giờ + Q-B giữ dấu) ------------------------------------------------------------------------------------------------------------------
async function donDuoiMoc(w: any) {
  const g = vnSau(120);
  const o = await lap(w, SALES, [{ ...OUT, pickupDate: g.date, pickupTime: g.time }, { ...RET, pickupDate: g.date, pickupTime: vnSau(180).time }], { departDate: g.date });
  for (const l of o.services[0].legs) assert.equal((await w.call("POST", `/api/orders/${o.id}/legs/${l.id}/short-notice`, { as: ADM, body: { lyDo: "KHACH_DOAN_GOI_GAP" } })).status, 200);
  await xacNhan(w, o);
  return xem(w, o.id);
}

test("TC-F5 + Q-B (chủ 1/10 'Giữ dấu đặt gấp cũ'): chặng dưới mốc, Bán hàng CHỈ sửa số hiệu → 200, không đòi datGap, dấu cũ CÒN; đổi giờ vẫn 409 như cũ", async () => {
  const w = setup();
  const c = await donDuoiMoc(w);
  const r = await suaChang(w, c, SALES, di(c), { flightCode: "VN1553" });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(cot(w, di(c).id), { flight_code: "VN1553", pax_override: null, short_notice_reason: "KHACH_DOAN_GOI_GAP" });
  assert.doesNotMatch(nhatKy(w, c.id, "order_leg_updated")[0]!, /đặt gấp/, "không dấu đặt gấp mới");
  const doiGio = await suaChang(w, r.json.order, SALES, di(r.json.order), { pickupTime: vnSau(150).time });
  assert.equal(doiGio.status, 409, doiGio.text);
  assert.equal(doiGio.json.error.code, "short_notice_required");
});

test("Q-B: chỉ đổi ô phụ mà thân CÓ datGap (Quản trị vừa duyệt) → ghi dấu MỚI (cờ giữ = 0); Bán hàng gửi datGap → 403", async () => {
  const w = setup();
  const c = await donDuoiMoc(w);
  assert.equal((await suaChang(w, c, SALES, di(c), { flightCode: "VN1553" }, { datGap: { lyDo: "CHUYEN_BAY_DOI_GIO" } })).status, 403);
  const r = await suaChang(w, c, ADM, di(c), { flightCode: "VN1553" }, { datGap: { lyDo: "CHUYEN_BAY_DOI_GIO" } });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(cot(w, di(c).id), { flight_code: "VN1553", pax_override: null, short_notice_reason: "CHUYEN_BAY_DOI_GIO" });
});

test("TC-P7: chặng VỀ dưới mốc, Bán hàng chỉ đổi số người chiều về → 200, không đòi datGap, dấu cũ CÒN", async () => {
  const w = setup();
  const c = await donDuoiMoc(w);
  const r = await suaChang(w, c, SALES, ve(c), { paxOverride: 2 });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(cot(w, ve(c).id), { flight_code: null, pax_override: 2, short_notice_reason: "KHACH_DOAN_GOI_GAP" });
});

// ---- TC-F8 (PUT /trip không xoá ô phụ) -----------------------------------------------------------------------------------------------------------------------
test("TC-F8: PUT /trip dời ngày đi / đổi giờ đón (nháp lẫn đã xác nhận) → số hiệu + số người còn nguyên; tạo chiều đi mới → hai ô NULL; thân /trip có khoá ô phụ → 400", async () => {
  const w = setup();
  for (const confirm of [false, true]) {
    const o = await lap(w, SALES, [{ ...OUT, flightCode: "VN1553" }, { ...RET, paxOverride: 2 }]);
    if (confirm) await xacNhan(w, o);
    const c = await xem(w, o.id);
    const r = await w.call("PUT", `/api/orders/${o.id}/trip`, { as: SALES, body: { expectedUpdatedAt: c.updatedAt, services: [{ id: c.services[0].id, departDate: inDays(4), pickupTime: "07:10", pickupPlace: "Sân bay Cam Ranh" }] } });
    assert.equal(r.status, 200, `${confirm}: ${r.text}`);
    assert.equal(cotTheoChieu(w, o.id, "OUT").flight_code, "VN1553", `${confirm}`);
    assert.equal(cotTheoChieu(w, o.id, "RETURN").pax_override, 2, `${confirm}`);
    for (const extra of [{ flightCode: "VJ123" }, { paxOverride: 1 }]) {
      const bad = await w.call("PUT", `/api/orders/${o.id}/trip`, { as: SALES, body: { expectedUpdatedAt: r.json.order.updatedAt, services: [{ id: c.services[0].id, departDate: inDays(4), ...extra }] } });
      assert.equal(bad.status, 400, bad.text);
      assert.match(bad.json.error.message, /từng chặng/);
    }
  }
  // Dịch vụ chưa có chiều đi → /trip tạo chiều đi mới (op insert): hai ô NULL; chặng về không đổi.
  const o = await lap(w, SALES, [{ ...RET, paxOverride: 2, flightCode: "VJ123" }]);
  const r = await w.call("PUT", `/api/orders/${o.id}/trip`, { as: SALES, body: { expectedUpdatedAt: o.updatedAt, services: [{ id: o.services[0].id, departDate: D, pickupTime: "06:00", pickupPlace: "Khách sạn Mới" }] } });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual([cotTheoChieu(w, o.id, "OUT").flight_code, cotTheoChieu(w, o.id, "OUT").pax_override], [null, null]);
  assert.deepEqual([cotTheoChieu(w, o.id, "RETURN").flight_code, cotTheoChieu(w, o.id, "RETURN").pax_override], ["VJ123", 2]);
});

// ---- TC-P2, TC-P3 (sau xác nhận) ----------------------------------------------------------------------------------------------------------------------------
test("TC-P2: chiều đi + số người → 400; 0 → 400; vượt số khách hiệu lực (L-R1) → 400; hợp lệ → 200, nhật ký 'số người chiều về 4 → 2' không tên", async () => {
  const w = setup();
  const o = await lap(w, SALES, [OUT, RET]);
  await xacNhan(w, o);
  const c = await xem(w, o.id);
  for (const [l, over] of [[di(c), { paxOverride: 2 }], [ve(c), { paxOverride: 0 }], [ve(c), { paxOverride: 5 }]] as const) {
    const r = await suaChang(w, c, SALES, l, over);
    assert.equal(r.status, 400, `${JSON.stringify(over)}: ${r.text}`);
  }
  const themVuot = await w.call("POST", `/api/orders/${o.id}/legs`, { as: SALES, body: { expectedUpdatedAt: c.updatedAt, serviceId: c.services[0].id, leg: { ...RET, paxOverride: 5 } } });
  assert.equal(themVuot.status, 400, themVuot.text);
  assert.match(themVuot.json.error.message, /số khách/);
  const r4 = await suaChang(w, c, SALES, ve(c), { paxOverride: 4 });
  assert.equal(r4.status, 200, r4.text);
  const r2 = await suaChang(w, r4.json.order, SALES, ve(r4.json.order), { paxOverride: 2 });
  assert.equal(r2.status, 200, r2.text);
  const log = nhatKy(w, o.id, "order_leg_updated");
  assert.deepEqual(log, ["Chiều về · Tour đảo: số người chiều về theo số khách dịch vụ → 4", "Chiều về · Tour đảo: số người chiều về 4 → 2"]);
  for (const x of log) assert.doesNotMatch(x, /Khách Thử|0912345678/);
});

test("TC-P3 quyền đơn ĐÃ XÁC NHẬN (ô order.trip.edit): Bán hàng đơn mình, Quản trị, Toàn quyền → 200; Bán hàng đơn người khác, HDV, Đối tác, Kế toán → 403", async () => {
  const w = setup();
  const o = await lap(w, SALES, [OUT, RET]);
  await xacNhan(w, o);
  for (const as of [SALES_B, FIELD, PARTNER, ACC]) assert.equal((await suaChang(w, await xem(w, o.id), as, ve(await xem(w, o.id)), { paxOverride: 2 })).status, 403, as);
  let n = 1;
  for (const as of [SALES, ADM, SUP]) {
    const c = await xem(w, o.id);
    const r = await suaChang(w, c, as, ve(c), { paxOverride: n });
    assert.equal(r.status, 200, `${as}: ${r.text}`);
    assert.equal(cot(w, ve(c).id).pax_override, n++);
  }
});

// ---- TC-P4, TC-P5 (đơn NHÁP) --------------------------------------------------------------------------------------------------------------------------------
test("TC-P4 (a)(b): nhánh nháp PUT /legs/:legId — Bán hàng đơn mình / Quản trị chỉ gửi paxOverride + expectedUpdatedAt → 200; có khoá khác → 409 use_order_form", async () => {
  const w = setup();
  for (const as of [SALES, ADM]) {
    const o = await lap(w, SALES, [OUT, RET]);
    const r = await nhanhNhap(w, o, as, ve(o), { expectedUpdatedAt: ve(o).updatedAt, paxOverride: 3 });
    assert.equal(r.status, 200, `${as}: ${r.text}`);
    assert.equal(cot(w, ve(o).id).pax_override, 3);
    assert.equal(r.json.order.status, "draft");
    assert.deepEqual(nhatKy(w, o.id, "order_leg_updated"), ["Chiều về · Tour đảo: số người chiều về theo số khách dịch vụ → 3"]);
    for (const b of [{ expectedUpdatedAt: ve(o).updatedAt, leg: legEdit(ve(o)) }, { expectedUpdatedAt: ve(o).updatedAt, paxOverride: 2, leg: legEdit(ve(o)) }, { expectedUpdatedAt: ve(o).updatedAt }]) {
      const bad = await nhanhNhap(w, o, as, ve(o), b);
      assert.equal(bad.status, 409, bad.text);
      assert.equal(bad.json.error.code, "use_order_form");
    }
  }
  // Nhánh nháp: chiều đi → 400; vượt số khách → 400; mốc chặng cũ → 409 stale; Đối tác / Thực tập (không có order.trip.edit) → 403.
  const o = await lap(w, SALES, [OUT, RET]);
  assert.equal((await nhanhNhap(w, o, SALES, di(o), { expectedUpdatedAt: di(o).updatedAt, paxOverride: 2 })).status, 400);
  assert.equal((await nhanhNhap(w, o, SALES, ve(o), { expectedUpdatedAt: ve(o).updatedAt, paxOverride: 5 })).status, 400);
  assert.equal((await nhanhNhap(w, o, SALES, ve(o), { expectedUpdatedAt: "2000-01-01T00:00:00.000Z", paxOverride: 2 })).json.error.code, "stale");
  for (const as of [PARTNER, INTERN]) {
    const p = await lap(w, as, [OUT, RET]);
    assert.equal((await nhanhNhap(w, p, as, ve(p), { expectedUpdatedAt: ve(p).updatedAt, paxOverride: 2 })).status, 403, as);
  }
});

test("TC-P4 (c)(d)(e): Đối tác / Thực tập lưu nháp — gửi paxOverride KHÁC bản cũ → 403 (không ghi); không gửi → còn nguyên; gửi BẰNG bản cũ → 200; lập đơn có số → 403", async () => {
  const w = setup();
  for (const as of [PARTNER, INTERN]) {
    assert.equal((await w.call("POST", "/api/orders", { as, body: body([svc([OUT, { ...RET, paxOverride: 2 }])]) })).status, 403, as);
    const o = await lap(w, as, [OUT, RET]);
    assert.equal((await nhanhNhap(w, o, ADM, ve(o), { expectedUpdatedAt: ve(o).updatedAt, paxOverride: 2 })).status, 200);
    const c = await xem(w, o.id);
    const khac = await luuNhap(w, c, as, [legBody(di(c)), legBody(ve(c), { paxOverride: 3 })]);
    assert.equal(khac.status, 403, khac.text);
    assert.match(khac.json.error.message, /Chỉ văn phòng đổi được số người chiều về/);
    const xoa = await luuNhap(w, c, as, [legBody(di(c)), legBody(ve(c), { paxOverride: null })]);
    assert.equal(xoa.status, 403, "xoá (null) cũng là đổi");
    assert.equal(cot(w, ve(c).id).pax_override, 2);
    const vang = await luuNhap(w, c, as, [legBody(di(c)), legBody(ve(c))]);
    assert.equal(vang.status, 200, vang.text);
    assert.equal(cotTheoChieu(w, o.id, "RETURN").pax_override, 2);
    const bang = await luuNhap(w, vang.json.order, as, [legBody(di(vang.json.order)), legBody(ve(vang.json.order), { paxOverride: 2 })]);
    assert.equal(bang.status, 200, bang.text);
    assert.equal(cotTheoChieu(w, o.id, "RETURN").pax_override, 2);
  }
  // Bán hàng (có order.trip.edit trên đơn mình) lập + lưu nháp có số → được.
  const s = await lap(w, SALES, [OUT, { ...RET, paxOverride: 2 }]);
  assert.equal(cotTheoChieu(w, s.id, "RETURN").pax_override, 2);
  const r = await luuNhap(w, s, SALES, [legBody(di(s)), legBody(ve(s), { paxOverride: 3 })]);
  assert.equal(r.status, 200, r.text);
  assert.equal(cotTheoChieu(w, s.id, "RETURN").pax_override, 3);
  assert.equal((await luuNhap(w, r.json.order, SALES, [legBody(di(r.json.order)), legBody(ve(r.json.order), { paxOverride: 5 })])).status, 400, "L-R1 ở lưu nháp");
});

test("TC-P5 không mất khi lưu nháp: Quản trị đặt 2 qua nhánh nháp → form cũ của Đối tác 409 stale → tải lại, lưu thân KHÔNG có khoá → vẫn 2", async () => {
  const w = setup();
  const o = await lap(w, PARTNER, [OUT, RET]);
  assert.equal((await nhanhNhap(w, o, ADM, ve(o), { expectedUpdatedAt: ve(o).updatedAt, paxOverride: 2 })).status, 200);
  const cu = await luuNhap(w, o, PARTNER, [legBody(di(o)), legBody(ve(o))]);
  assert.equal(cu.status, 409);
  assert.equal(cu.json.error.code, "stale");
  const moi = (await w.call("GET", `/api/orders/${o.id}`, { as: PARTNER })).json.order;
  const r = await luuNhap(w, moi, PARTNER, [legBody(di(moi), { pickupTime: "07:00" }), legBody(ve(moi))]);
  assert.equal(r.status, 200, r.text);
  assert.equal(cotTheoChieu(w, o.id, "RETURN").pax_override, 2);
});

test("TC-P6: chặng về bị BỎ rồi thêm lại → chặng mới số người NULL (nháp: lưu không có chặng về rồi thêm lại; đã xác nhận: đóng rồi POST /legs)", async () => {
  const w = setup();
  const o = await lap(w, SALES, [OUT, { ...RET, paxOverride: 2 }]);
  const r1 = await luuNhap(w, o, SALES, [legBody(di(o))]);
  assert.equal(r1.status, 200, r1.text);
  const r2 = await luuNhap(w, r1.json.order, SALES, [legBody(di(r1.json.order)), RET]);
  assert.equal(r2.status, 200, r2.text);
  assert.equal(cotTheoChieu(w, o.id, "RETURN").pax_override, null);
  const k = await lap(w, SALES, [OUT, { ...RET, paxOverride: 2 }]);
  await xacNhan(w, k);
  const c = await xem(w, k.id);
  assert.equal((await w.call("POST", `/api/orders/${k.id}/legs/${ve(c).id}/close`, { as: SALES, body: { expectedUpdatedAt: ve(c).updatedAt, reasonCode: "NOT_NEEDED" } })).status, 200);
  const c2 = await xem(w, k.id);
  assert.equal((await w.call("POST", `/api/orders/${k.id}/legs`, { as: SALES, body: { expectedUpdatedAt: c2.updatedAt, serviceId: c2.services[0].id, leg: RET } })).status, 201);
  assert.equal(cotTheoChieu(w, k.id, "RETURN").pax_override, null);
});

test("nháp: chặng về đang có số người mà thân gửi CÙNG id với chiều ĐI (không khoá) → số người về NULL (chặng về coi như bỏ), không 403, không lỗi CSDL", async () => {
  const w = setup();
  const o = await lap(w, PARTNER, [{ ...RET, paxOverride: undefined }]);
  assert.equal((await nhanhNhap(w, o, ADM, ve(o), { expectedUpdatedAt: ve(o).updatedAt, paxOverride: 2 })).status, 200);
  const c = (await w.call("GET", `/api/orders/${o.id}`, { as: PARTNER })).json.order;
  const r = await luuNhap(w, c, PARTNER, [legBody(ve(c), { direction: "OUT", pickupLocationId: null, pickupPlace: "Khách sạn A", dropoffLocationId: LOC, dropoffPlace: "" })]);
  assert.equal(r.status, 200, r.text);
  assert.deepEqual([cotTheoChieu(w, o.id, "OUT").pax_override, w.q("SELECT count(*) n FROM ord_transfer_leg WHERE order_id = ? AND direction = 'RETURN'", o.id)[0].n], [null, 0]);
});

// ---- TC-P10 (L-R1 chỉ chặn giá trị MỚI) --------------------------------------------------------------------------------------------------------------------
test("TC-P10: số người về 2 đã lưu, số khách giảm còn 1 — Đối tác lưu nháp không gửi / gửi bằng 2 → 200 (cột vẫn 2); văn phòng gửi 3 → 400, gửi 1 → 200", async () => {
  const w = setup();
  const o = await lap(w, PARTNER, [OUT, RET]);
  assert.equal((await nhanhNhap(w, o, ADM, ve(o), { expectedUpdatedAt: ve(o).updatedAt, paxOverride: 2 })).status, 200);
  const c = (await w.call("GET", `/api/orders/${o.id}`, { as: PARTNER })).json.order;
  const giam = await w.call("PUT", `/api/orders/${o.id}`, {
    as: PARTNER, body: body([svc([legBody(di(c)), legBody(ve(c))], { id: c.services[0].id, pax: { adult: 1, child: 0, senior: 0, infant: 0 } })], { expectedUpdatedAt: c.updatedAt }),
  });
  assert.equal(giam.status, 200, giam.text);
  assert.equal(cotTheoChieu(w, o.id, "RETURN").pax_override, 2, "máy không tự sửa cột (ADR-0054 D10.3)");
  const g = giam.json.order;
  const bang = await w.call("PUT", `/api/orders/${o.id}`, {
    as: PARTNER, body: body([svc([legBody(di(g)), legBody(ve(g), { paxOverride: 2 })], { id: g.services[0].id, pax: { adult: 1, child: 0, senior: 0, infant: 0 } })], { expectedUpdatedAt: g.updatedAt }),
  });
  assert.equal(bang.status, 200, `gửi BẰNG bản cũ không kiểm L-R1: ${bang.text}`);
  const b = bang.json.order;
  assert.equal((await nhanhNhap(w, b, ADM, ve(b), { expectedUpdatedAt: ve(b).updatedAt, paxOverride: 3 })).status, 400, "vượt số khách hiện hành 1");
  const mot = await nhanhNhap(w, b, ADM, ve(b), { expectedUpdatedAt: ve(b).updatedAt, paxOverride: 1 });
  assert.equal(mot.status, 200, mot.text);
  assert.equal(cotTheoChieu(w, o.id, "RETURN").pax_override, 1);
});

// ---- Task 4 — đường ĐỌC (TC-F7 phần đơn) ---------------------------------------------------------------------------------------------------------------------
test("TC-F7: chi tiết đơn — LegDto có flightCode + paxOverride (ai xem được chặng thì thấy, kể cả Đối tác đơn mình); biên nhận gửi khách KHÔNG có số hiệu (C3)", async () => {
  const w = setup();
  const o = await lap(w, PARTNER, [{ ...OUT, flightCode: "VN1553" }, RET]);
  assert.equal((await nhanhNhap(w, o, ADM, ve(o), { expectedUpdatedAt: ve(o).updatedAt, paxOverride: 2 })).status, 200);
  const p = (await w.call("GET", `/api/orders/${o.id}`, { as: PARTNER })).json.order;
  assert.deepEqual([di(p).flightCode, di(p).paxOverride], ["VN1553", null]);
  assert.deepEqual([ve(p).flightCode, ve(p).paxOverride], [null, 2]);
  const s = await lap(w, SALES, [{ ...OUT, flightCode: "VN1553" }]);
  await xacNhan(w, s);
  const bn = await w.call("GET", `/api/orders/${s.id}/receipt`, { as: ADM });
  assert.equal(bn.status, 200, bn.text);
  assert.doesNotMatch(bn.text, /VN1553|flightCode|soHieu/);
});
