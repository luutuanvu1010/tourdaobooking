// CAM KẾT CỦA CHẶNG — đường GHI và ĐỌC phía orders (kế hoạch docs/superpowers/plans/2026-10-01-van-chuyen-con-lai-07-xe-rieng-so-cho.md Task 2;
// ADR-0056 VK3-A): `exclusiveVehicle` (xe riêng) và `minVehicleSeats` (xe tối thiểu N chỗ, 1..100, không kể tài xế). Khuôn "ô phụ" như `flightCode`:
// khoá VẮNG = GIỮ giá trị đang lưu; không xét mốc 6 giờ; không ô quyền mới (nháp `order.modify`, sau xác nhận `order.trip.edit`). Chạy CẢ ứng dụng trên
// SQLite thật (tests/audit/harness.mjs) với mốc THẬT 360 phút. Tên, SĐT là GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const SALES_B = "22222222-2222-4222-8222-222222222222";
const ADM = "33333333-3333-4333-8333-333333333333";
const FIELD = "44444444-4444-4444-8444-444444444444";
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
  seedStaff(w.sqlite, { id: PARTNER, phone: "0900000008", name: "Đối tác", perms: ["PARTNER"] });
  seedStaff(w.sqlite, { id: INTERN, phone: "0900000009", name: "Thực tập", perms: ["INTERN"] });
  w.sqlite.exec("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('ZA1', 'Tour đảo', 'perPax', 500000, 1, '2026-01-01', '2026-01-01')");
  return w;
}
const OUT = { direction: "OUT", pickupDate: "", pickupTime: "06:30", pickupLocationId: null, pickupPlace: "Sân bay Cam Ranh", dropoffLocationId: LOC, dropoffPlace: "" };
const RET = { direction: "RETURN", pickupDate: inDays(4), pickupTime: "16:00", pickupLocationId: LOC, pickupPlace: "", dropoffLocationId: null, dropoffPlace: "Khách sạn Dò Tìm" };
const CK = { exclusiveVehicle: true, minVehicleSeats: 15 };
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
const cot = (w: any, legId: string) => ({ ...w.q("SELECT exclusive_vehicle, min_vehicle_seats, short_notice_reason FROM ord_transfer_leg WHERE id = ?", legId)[0] });
const cotTheoChieu = (w: any, orderId: string, dir: string) =>
  ({ ...w.q("SELECT id, exclusive_vehicle, min_vehicle_seats FROM ord_transfer_leg WHERE order_id = ? AND direction = ? AND closed_at IS NULL", orderId, dir)[0] });
const suaChang = (w: any, o: any, as: string, l: any, over: Record<string, unknown>, extra: Record<string, unknown> = {}) =>
  w.call("PUT", `/api/orders/${o.id}/legs/${l.id}`, { as, body: { expectedUpdatedAt: l.updatedAt, leg: legEdit(l, over), ...extra } });
const nhatKy = (w: any, orderId: string, action: string) => w.q("SELECT detail FROM audit_log WHERE order_id = ? AND action = ? ORDER BY created_at, rowid", orderId, action).map((r: any) => r.detail as string);

test("1. lập đơn có exclusiveVehicle + minVehicleSeats → cột lưu 1 / 15; GET đơn trả đúng; chặng không gửi = false / null", async () => {
  const w = setup();
  const o = await lap(w, SALES, [{ ...OUT, ...CK }, RET]);
  assert.deepEqual(cot(w, di(o).id), { exclusive_vehicle: 1, min_vehicle_seats: 15, short_notice_reason: null });
  assert.deepEqual(cot(w, ve(o).id), { exclusive_vehicle: 0, min_vehicle_seats: null, short_notice_reason: null });
  const g = await xem(w, o.id);
  assert.deepEqual([di(g).exclusiveVehicle, di(g).minVehicleSeats], [true, 15]);
  assert.deepEqual([ve(g).exclusiveVehicle, ve(g).minVehicleSeats], [false, null]);
});

test("2. thân CŨ (không hai khoá) lưu nháp / PUT trip / PUT legs → GIỮ 1 / 15 (Review Focus 5)", async () => {
  const w = setup();
  const o = await lap(w, SALES, [{ ...OUT, ...CK }, RET]);
  const r = await luuNhap(w, o, SALES, [legBody(di(o), { pickupTime: "07:00" }), legBody(ve(o))]);
  assert.equal(r.status, 200, r.text);
  assert.deepEqual([cotTheoChieu(w, o.id, "OUT").exclusive_vehicle, cotTheoChieu(w, o.id, "OUT").min_vehicle_seats], [1, 15]);
  const c = await xem(w, o.id);
  const t = await w.call("PUT", `/api/orders/${o.id}/trip`, { as: SALES, body: { expectedUpdatedAt: c.updatedAt, services: [{ id: c.services[0].id, departDate: inDays(4), pickupTime: "07:10", pickupPlace: "Sân bay Cam Ranh" }] } });
  assert.equal(t.status, 200, t.text);
  assert.deepEqual([cotTheoChieu(w, o.id, "OUT").exclusive_vehicle, cotTheoChieu(w, o.id, "OUT").min_vehicle_seats], [1, 15], "PUT /trip không xoá");
  await xacNhan(w, o);
  const x = await xem(w, o.id);
  const s = await suaChang(w, x, SALES, di(x), { pickupTime: "08:00" });
  assert.equal(s.status, 200, s.text);
  assert.deepEqual([cotTheoChieu(w, o.id, "OUT").exclusive_vehicle, cotTheoChieu(w, o.id, "OUT").min_vehicle_seats], [1, 15]);
});

test("3. minVehicleSeats null xoá; 0, 101, 'abc', 1.5 → 400 tiếng Việt; exclusiveVehicle '1' → 400 (nháp lẫn sau xác nhận)", async () => {
  const w = setup();
  const o = await lap(w, SALES, [{ ...OUT, ...CK }, RET]);
  const xoa = await luuNhap(w, o, SALES, [legBody(di(o), { minVehicleSeats: null }), legBody(ve(o))]);
  assert.equal(xoa.status, 200, xoa.text);
  assert.deepEqual([cotTheoChieu(w, o.id, "OUT").exclusive_vehicle, cotTheoChieu(w, o.id, "OUT").min_vehicle_seats], [1, null], "null xoá số chỗ, giữ xe riêng");
  let cur = xoa.json.order;
  for (const bad of [0, 101, "abc", 1.5]) {
    const r = await luuNhap(w, cur, SALES, [legBody(di(cur), { minVehicleSeats: bad }), legBody(ve(cur))]);
    assert.equal(r.status, 400, `${bad}: ${r.text}`);
    assert.match(r.json.error.message, /số chỗ tối thiểu là số nguyên từ 1 đến 100 \(không kể tài xế\)\./);
  }
  const rb = await luuNhap(w, cur, SALES, [legBody(di(cur), { exclusiveVehicle: "1" }), legBody(ve(cur))]);
  assert.equal(rb.status, 400, rb.text);
  assert.match(rb.json.error.message, /xe riêng phải là có \/ không\./);
  await xacNhan(w, cur);
  cur = await xem(w, o.id);
  for (const over of [{ minVehicleSeats: 0 }, { minVehicleSeats: 101 }, { exclusiveVehicle: "1" }]) {
    assert.equal((await suaChang(w, cur, SALES, di(cur), over)).status, 400, JSON.stringify(over));
    assert.equal((await w.call("POST", `/api/orders/${o.id}/legs`, { as: SALES, body: { expectedUpdatedAt: cur.updatedAt, serviceId: cur.services[0].id, leg: { ...RET, ...over } } })).status, 400);
  }
});

test("4. Đối tác / Thực tập / Bán hàng bật xe riêng trên nháp CỦA MÌNH → được (lập + lưu); đơn người khác → 403; không ô quyền mới", async () => {
  const w = setup();
  for (const as of [PARTNER, INTERN, SALES]) {
    const o = await lap(w, as, [{ ...OUT, exclusiveVehicle: true }, RET]);
    assert.equal(cotTheoChieu(w, o.id, "OUT").exclusive_vehicle, 1, as);
    const r = await luuNhap(w, o, as, [legBody(di(o), { minVehicleSeats: 9 }), legBody(ve(o))]);
    assert.equal(r.status, 200, `${as}: ${r.text}`);
    assert.equal(cotTheoChieu(w, o.id, "OUT").min_vehicle_seats, 9, as);
  }
  const o = await lap(w, SALES, [OUT, RET]);
  for (const as of [PARTNER, INTERN]) assert.equal((await luuNhap(w, o, as, [legBody(di(o), { exclusiveVehicle: true }), legBody(ve(o))])).status, 403, as);
  assert.equal(cotTheoChieu(w, o.id, "OUT").exclusive_vehicle, 0);
});

test("sau xác nhận: ô order.trip.edit — Bán hàng đơn mình, Quản trị được (sửa + thêm chặng); Bán hàng khác, Đối tác, Thực tập, HDV → 403", async () => {
  const w = setup();
  const o = await lap(w, SALES, [OUT]);
  await xacNhan(w, o);
  const c = await xem(w, o.id);
  for (const as of [SALES_B, PARTNER, INTERN, FIELD]) {
    assert.equal((await suaChang(w, c, as, di(c), CK)).status, 403, as);
    assert.equal((await w.call("POST", `/api/orders/${o.id}/legs`, { as, body: { expectedUpdatedAt: c.updatedAt, serviceId: c.services[0].id, leg: { ...RET, ...CK } } })).status, 403, as);
  }
  const r = await suaChang(w, c, SALES, di(c), CK);
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(cot(w, di(c).id), { exclusive_vehicle: 1, min_vehicle_seats: 15, short_notice_reason: null });
  const them = await w.call("POST", `/api/orders/${o.id}/legs`, { as: ADM, body: { expectedUpdatedAt: r.json.order.updatedAt, serviceId: c.services[0].id, leg: { ...RET, ...CK } } });
  assert.equal(them.status, 201, them.text);
  assert.deepEqual([cotTheoChieu(w, o.id, "RETURN").exclusive_vehicle, cotTheoChieu(w, o.id, "RETURN").min_vehicle_seats], [1, 15]);
});

async function donDuoiMoc(w: any) {
  const g = vnSau(120);
  const o = await lap(w, SALES, [{ ...OUT, pickupDate: g.date, pickupTime: g.time }, { ...RET, pickupDate: g.date, pickupTime: vnSau(180).time }], { departDate: g.date });
  for (const l of o.services[0].legs) assert.equal((await w.call("POST", `/api/orders/${o.id}/legs/${l.id}/short-notice`, { as: ADM, body: { lyDo: "KHACH_DOAN_GOI_GAP" } })).status, 200);
  await xacNhan(w, o);
  return xem(w, o.id);
}

test("5. chặng dưới mốc 6 giờ, CHỈ đổi cam kết → 200, không short_notice_required, dấu đặt gấp giữ; đổi giờ vẫn 409", async () => {
  const w = setup();
  const c = await donDuoiMoc(w);
  const r = await suaChang(w, c, SALES, di(c), CK);
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(cot(w, di(c).id), { exclusive_vehicle: 1, min_vehicle_seats: 15, short_notice_reason: "KHACH_DOAN_GOI_GAP" });
  assert.doesNotMatch(nhatKy(w, c.id, "order_leg_updated")[0]!, /đặt gấp/);
  const doiGio = await suaChang(w, r.json.order, SALES, di(r.json.order), { ...CK, pickupTime: vnSau(150).time });
  assert.equal(doiGio.status, 409, doiGio.text);
  assert.equal(doiGio.json.error.code, "short_notice_required");
});

test("6. updateTrip có exclusiveVehicle / minVehicleSeats (thân hoặc dịch vụ) → 400; nhánh nháp PUT /legs/:id có khoá cam kết → 409 use_order_form", async () => {
  const w = setup();
  const o = await lap(w, SALES, [OUT, RET]);
  for (const extra of [{ exclusiveVehicle: true }, { minVehicleSeats: 15 }]) {
    for (const noi of ["dichVu", "than"] as const) {
      const services = [{ id: o.services[0].id, departDate: D, ...(noi === "dichVu" ? extra : {}) }];
      const bad = await w.call("PUT", `/api/orders/${o.id}/trip`, { as: SALES, body: { expectedUpdatedAt: o.updatedAt, services, ...(noi === "than" ? extra : {}) } });
      assert.equal(bad.status, 400, bad.text);
      assert.match(bad.json.error.message, /xe riêng, số chỗ tối thiểu sửa ở từng chặng đưa đón/);
    }
  }
  const l = ve(o);
  for (const b of [{ expectedUpdatedAt: l.updatedAt, minVehicleSeats: 15 }, { expectedUpdatedAt: l.updatedAt, exclusiveVehicle: true }, { expectedUpdatedAt: l.updatedAt, paxOverride: 2, minVehicleSeats: 15 }]) {
    const r = await w.call("PUT", `/api/orders/${o.id}/legs/${l.id}`, { as: SALES, body: b });
    assert.equal(r.status, 409, r.text);
    assert.equal(r.json.error.code, "use_order_form");
  }
});

test("7. nhật ký order_leg_updated: 'xe riêng: không → có' và 'xe tối thiểu: — → 15 chỗ'; order_leg_added ghi ', xe riêng, xe tối thiểu 15 chỗ'; không tên khách", async () => {
  const w = setup();
  const o = await lap(w, SALES, [OUT]);
  await xacNhan(w, o);
  const c = await xem(w, o.id);
  const r1 = await suaChang(w, c, SALES, di(c), { exclusiveVehicle: true });
  assert.equal(r1.status, 200, r1.text);
  const r2 = await suaChang(w, r1.json.order, SALES, di(r1.json.order), { minVehicleSeats: 15 });
  assert.equal(r2.status, 200, r2.text);
  const log = nhatKy(w, o.id, "order_leg_updated");
  assert.deepEqual(log, ["Chiều đi · Tour đảo: xe riêng: không → có", "Chiều đi · Tour đảo: xe tối thiểu: — → 15 chỗ"]);
  const them = await w.call("POST", `/api/orders/${o.id}/legs`, { as: SALES, body: { expectedUpdatedAt: r2.json.order.updatedAt, serviceId: c.services[0].id, leg: { ...RET, ...CK } } });
  assert.equal(them.status, 201, them.text);
  assert.match(nhatKy(w, o.id, "order_leg_added")[0]!, /, xe riêng, xe tối thiểu 15 chỗ$/);
  for (const x of [...log, ...nhatKy(w, o.id, "order_leg_added")]) assert.doesNotMatch(x, /Khách Thử|0912345678/);
});

test("8. chepDatGapNhap: lưu nháp chỉ đổi cam kết (giờ, nơi y nguyên) → dấu đặt gấp được chép lại cùng cam kết", async () => {
  const w = setup();
  const g = vnSau(120);
  const o = await lap(w, SALES, [{ ...OUT, pickupDate: g.date, pickupTime: g.time }], { departDate: g.date });
  assert.equal((await w.call("POST", `/api/orders/${o.id}/legs/${di(o).id}/short-notice`, { as: ADM, body: { lyDo: "CHUYEN_BAY_DOI_GIO" } })).status, 200);
  const o2 = await xem(w, o.id);
  const r = await luuNhap(w, o2, SALES, [legBody(di(o2), CK)], { departDate: g.date });
  assert.equal(r.status, 200, r.text);
  const row = { ...w.q("SELECT exclusive_vehicle, min_vehicle_seats, short_notice_reason, short_notice_lead_minutes FROM ord_transfer_leg WHERE order_id = ? AND closed_at IS NULL", o.id)[0] };
  assert.deepEqual(row, { exclusive_vehicle: 1, min_vehicle_seats: 15, short_notice_reason: "CHUYEN_BAY_DOI_GIO", short_notice_lead_minutes: 360 });
});

test("Đối tác lập đơn có cam kết → GET của chính Đối tác thấy hai khoá (LegDto không lọc theo vai)", async () => {
  const w = setup();
  const o = await lap(w, PARTNER, [{ ...OUT, exclusiveVehicle: true, minVehicleSeats: 7 }, RET]);
  const p = (await w.call("GET", `/api/orders/${o.id}`, { as: PARTNER })).json.order;
  assert.deepEqual([di(p).exclusiveVehicle, di(p).minVehicleSeats], [true, 7]);
  assert.deepEqual([ve(p).exclusiveVehicle, ve(p).minVehicleSeats], [false, null]);
});
