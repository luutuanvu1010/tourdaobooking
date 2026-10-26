// ADR-0047 A1 — ba route chặng SAU XÁC NHẬN (kế hoạch Task A11; Ruling R1): `POST /api/orders/:id/legs` (thêm), `PUT /api/orders/:id/legs/:legId` (sửa
// trường vận hành), `POST /api/orders/:id/legs/:legId/close` (bỏ = đóng dòng có lý do). Ô `order.trip.edit` { ownerId, assigned }; đơn nháp → 409
// `use_order_form`; đơn huỷ → 409; khoá lạc quan: thêm theo `orders.updated_at`, sửa/đóng theo `updated_at` CỦA CHẶNG; mọi lần ghi đẩy mốc đơn, ghi kép cột
// cũ, nhật ký trước → sau (nơi chữ che dãy số). Chạy CẢ ứng dụng trên SQLite thật (tests/audit/harness.mjs).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const SALES_B = "22222222-2222-4222-8222-222222222222";
const ADM = "33333333-3333-4333-8333-333333333333";
const FIELD = "44444444-4444-4444-8444-444444444444";
const ACC = "55555555-5555-4555-8555-555555555555";
const PARTNER = "88888888-8888-4888-8888-888888888888";
const LOC = "a941dd7d-faab-4098-9ab9-1df7fa6dd551";
const NO_SUCH = "00000000-0000-4000-8000-000000000000";
const inDays = (n: number) => new Date(Date.now() + 7 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);
const D = inDays(3);

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: SALES_B, phone: "0900000002", name: "Bình", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: FIELD, phone: "0900000004", name: "Hướng Dẫn", perms: ["FIELD"] });
  seedStaff(w.sqlite, { id: ACC, phone: "0900000005", name: "Kế toán", perms: ["ACCOUNTING"] });
  seedStaff(w.sqlite, { id: PARTNER, phone: "0900000008", name: "Đối tác", perms: ["PARTNER"] });
  w.sqlite.exec("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('ZA1', 'Tour đảo', 'perPax', 500000, 1, '2026-01-01', '2026-01-01')");
  return w;
}
const OUT = { direction: "OUT", pickupDate: "", pickupTime: "06:30", pickupLocationId: null, pickupPlace: "Khách sạn Dò Tìm", dropoffLocationId: LOC, dropoffPlace: "" };
const RET = { direction: "RETURN", pickupDate: inDays(4), pickupTime: "16:00", pickupLocationId: LOC, pickupPlace: "", dropoffLocationId: null, dropoffPlace: "Nhà riêng gọi 0905 123 456" };

async function order(w: any, as = SALES, confirm = true, extra: Record<string, unknown> = {}) {
  const r = await w.call("POST", "/api/orders", {
    as,
    body: { customerName: "Khách Thử", customerPhone: "0912345678", services: [{ kind: "catalog", pickupChoice: "DON", catalogCode: "ZA1", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 500000 }, departDate: D, legs: [OUT] }], ...extra },
  });
  assert.equal(r.status, 201, r.text);
  if (confirm) assert.equal((await w.call("POST", `/api/orders/${r.json.order.id}/status`, { as, body: { status: "confirmed" } })).status, 200);
  return (await w.call("GET", `/api/orders/${r.json.order.id}`, { as })).json.order; // ADR-0135: đọc bằng người lập (nháp chỉ người lập đọc)
}
const addLeg = (w: any, o: any, as: string, leg: Record<string, unknown> = RET, expected = o.updatedAt) =>
  w.call("POST", `/api/orders/${o.id}/legs`, { as, body: { expectedUpdatedAt: expected, serviceId: o.services[0].id, leg } });
const edit = (w: any, o: any, as: string, legId: string, expected: string, leg: Record<string, unknown>) =>
  w.call("PUT", `/api/orders/${o.id}/legs/${legId}`, { as, body: { expectedUpdatedAt: expected, leg } });
const close = (w: any, o: any, as: string, legId: string, expected: string, reasonCode = "NOT_NEEDED") =>
  w.call("POST", `/api/orders/${o.id}/legs/${legId}/close`, { as, body: { expectedUpdatedAt: expected, reasonCode } });
const LEG_EDIT = (l: any, over: Record<string, unknown> = {}) => ({
  pickupDate: l.pickupDate, pickupTime: l.pickupTime ?? "", pickupLocationId: l.pickupLocationId, pickupPlace: l.pickupPlace ?? "", dropoffLocationId: l.dropoffLocationId, dropoffPlace: l.dropoffPlace ?? "", ...over,
});
const mirror = (w: any, id: string) => w.q("SELECT pickup_time, pickup_place FROM order_service WHERE order_id = ?", id).map((r: any) => ({ ...r }));

test("người lập / người phụ trách / Quản trị thêm chiều về sau xác nhận → 201; mốc đơn đổi; nhật ký 'Thêm chặng' che dãy số; một tin Bảng tin (không kiểm ở đây)", async () => {
  const w = setup();
  for (const as of [SALES, SALES_B, ADM]) {
    const o = await order(w, SALES, true, { handlerStaffId: SALES_B });
    const r = await addLeg(w, o, as);
    assert.equal(r.status, 201, `${as}: ${r.text}`);
    assert.deepEqual(r.json.order.services[0].legs.map((l: any) => l.direction).sort(), ["OUT", "RETURN"]);
    assert.notEqual(r.json.order.updatedAt, o.updatedAt, "đẩy mốc đơn");
    const log = w.q("SELECT detail FROM audit_log WHERE order_id = ? AND action = 'order_leg_added'", o.id)[0].detail;
    assert.match(log, /^Chiều về · Tour đảo: thêm — ngày đón /);
    assert.match(log, /nơi trả Nhà riêng gọi •••• ••• •••/);
    assert.doesNotMatch(log, /0905/);
  }
});

test("sửa giờ chặng → 200; nhật ký 'order_leg_updated' có '06:30 → 07:00'; ghi kép cột cũ; khoá lạc quan theo updated_at CỦA CHẶNG", async () => {
  const w = setup();
  const o = await order(w);
  const leg = o.services[0].legs[0];
  const r = await edit(w, o, SALES, leg.id, leg.updatedAt, LEG_EDIT(leg, { pickupTime: "07:00" }));
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.order.services[0].pickupTime, "07:00");
  const log = w.q("SELECT detail FROM audit_log WHERE order_id = ? AND action = 'order_leg_updated'", o.id)[0].detail;
  assert.equal(log, "Chiều đi · Tour đảo: giờ đón 06:30 → 07:00");
  assert.deepEqual(mirror(w, o.id), [{ pickup_time: "07:00", pickup_place: "Khách sạn Dò Tìm" }]);
  const stale = await edit(w, o, SALES, leg.id, leg.updatedAt, LEG_EDIT(leg, { pickupTime: "08:00" }));
  assert.equal(stale.status, 409, stale.text);
  assert.equal(stale.json.error.code, "stale");
});

test("đóng chặng với lý do → 200; chặng biến khỏi legs, DÒNG CÒN trong CSDL (closed_at, lý do); sửa/đóng lại → 409 leg_closed; lý do lạ → 400", async () => {
  const w = setup();
  const o = await order(w);
  const leg = o.services[0].legs[0];
  assert.equal((await close(w, o, SALES, leg.id, leg.updatedAt, "cancelled")).status, 400);
  const r = await close(w, o, SALES, leg.id, leg.updatedAt, "WRONG_ENTRY");
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json.order.services[0].legs, []);
  assert.deepEqual([r.json.order.services[0].pickupTime, r.json.order.services[0].pickupPlace], [null, null]);
  const row = w.q("SELECT closed_at, close_reason_code FROM ord_transfer_leg WHERE id = ?", leg.id)[0];
  assert.ok(row.closed_at);
  assert.equal(row.close_reason_code, "WRONG_ENTRY");
  assert.match(w.q("SELECT detail FROM audit_log WHERE order_id = ? AND action = 'order_leg_closed'", o.id)[0].detail, /bỏ — Nhập nhầm$/);
  assert.deepEqual(mirror(w, o.id), [{ pickup_time: null, pickup_place: null }]);
  const again = await edit(w, o, SALES, leg.id, leg.updatedAt, LEG_EDIT(leg));
  assert.equal(again.status, 409, again.text);
  assert.equal(again.json.error.code, "leg_closed");
  assert.equal((await close(w, o, SALES, leg.id, leg.updatedAt)).json.error.code, "leg_closed");
});

test("Đối tác, Kế toán, Hướng dẫn viên (kể cả đang phụ trách), người lập khác → 403 ở cả ba route; không ghi gì", async () => {
  const w = setup();
  const o = await order(w, SALES, true, { handlerStaffId: FIELD });
  const leg = o.services[0].legs[0];
  const logs = w.q("SELECT count(*) n FROM audit_log")[0].n;
  for (const as of [PARTNER, ACC, FIELD, SALES_B]) {
    assert.equal((await addLeg(w, o, as)).status, 403, `thêm: ${as}`);
    assert.equal((await edit(w, o, as, leg.id, leg.updatedAt, LEG_EDIT(leg, { pickupTime: "09:00" }))).status, 403, `sửa: ${as}`);
    assert.equal((await close(w, o, as, leg.id, leg.updatedAt)).status, 403, `đóng: ${as}`);
  }
  assert.equal(w.q("SELECT count(*) n FROM audit_log")[0].n, logs);
});

test("đơn nháp → 409 use_order_form; đơn huỷ → 409 not_editable; mốc đơn cũ → 409 stale; chặng của đơn khác / không có → 404 leg_not_found; dịch vụ lạ → 400", async () => {
  const w = setup();
  const draft = await order(w, SALES, false);
  const r1 = await addLeg(w, draft, SALES);
  assert.equal(r1.status, 409, r1.text);
  assert.equal(r1.json.error.code, "use_order_form");
  const dl = draft.services[0].legs[0];
  assert.equal((await edit(w, draft, SALES, dl.id, dl.updatedAt, LEG_EDIT(dl))).json.error.code, "use_order_form");
  assert.equal((await close(w, draft, SALES, dl.id, dl.updatedAt)).json.error.code, "use_order_form");

  const o = await order(w);
  const stale = await addLeg(w, o, SALES, RET, "2020-01-01T00:00:00.000Z");
  assert.equal(stale.status, 409, stale.text);
  assert.equal(stale.json.error.code, "stale");
  const other = await order(w);
  const nf = await edit(w, o, SALES, other.services[0].legs[0].id, other.services[0].legs[0].updatedAt, LEG_EDIT(other.services[0].legs[0]));
  assert.equal(nf.status, 404, nf.text);
  assert.equal(nf.json.error.code, "leg_not_found");
  assert.equal((await edit(w, o, SALES, NO_SUCH, "x", LEG_EDIT(o.services[0].legs[0]))).status, 404);
  const badSvc = await w.call("POST", `/api/orders/${o.id}/legs`, { as: SALES, body: { expectedUpdatedAt: o.updatedAt, serviceId: other.services[0].id, leg: RET } });
  assert.equal(badSvc.status, 400, badSvc.text);

  assert.equal((await w.call("POST", `/api/orders/${o.id}/status`, { as: SALES, body: { status: "cancelled", lyDo: "KHACH_DOI_Y" } })).status, 200);
  const cancelled = (await w.call("GET", `/api/orders/${o.id}`, { as: SALES })).json.order;
  const r2 = await addLeg(w, cancelled, SALES);
  assert.equal(r2.status, 409, r2.text);
  assert.equal(r2.json.error.code, "not_editable");
});

test("kiểm chặng: ngày đón đã qua (đơn đã xác nhận) → 400; ngoài khoảng −1/+7 → 400; điểm ngừng dùng → 400; quá 10 chặng → 400", async () => {
  const w = setup();
  w.sqlite.exec("INSERT INTO loc_location (id, code, name, location_type_code, active, created_at, updated_at) VALUES ('bbbbbbbb-0000-4000-8000-000000000001', 'KS_CU', 'Khách sạn cũ', 'HOTEL', 0, '2026-01-01', '2026-01-01')");
  const o = await order(w);
  const cases = [
    { ...RET, pickupDate: inDays(-1) },
    { ...RET, pickupDate: inDays(11) },
    { ...RET, pickupLocationId: "bbbbbbbb-0000-4000-8000-000000000001" },
  ];
  for (const leg of cases) {
    const r = await addLeg(w, o, SALES, leg);
    assert.equal(r.status, 400, `${JSON.stringify(leg)}: ${r.text}`);
  }
  let cur = o;
  for (let i = 0; i < 9; i++) {
    const r = await addLeg(w, cur, SALES, RET);
    assert.equal(r.status, 201, r.text);
    cur = r.json.order;
  }
  const full = await addLeg(w, cur, SALES, RET);
  assert.equal(full.status, 400, "10 chặng rồi, thêm nữa → 400");
});

test("MQ-07 (ADR-0052 D6.2): dòng nhật ký sửa / bỏ chặng ghi target_id = id CHẶNG (target_type vẫn 'order') → cột leg_id của v_aud_order_change; thêm chặng thì leg_id NULL", async () => {
  const w = setup();
  const o = await order(w);
  const leg = o.services[0].legs[0];
  const r = await edit(w, o, SALES, leg.id, leg.updatedAt, LEG_EDIT(leg, { pickupTime: "07:00" }));
  assert.equal(r.status, 200, r.text);
  const sua = w.q("SELECT target_type, target_id FROM audit_log WHERE order_id = ? AND action = 'order_leg_updated'", o.id)[0];
  assert.deepEqual({ ...sua }, { target_type: "order", target_id: leg.id });
  const moi = r.json.order.services[0].legs[0];
  assert.equal((await close(w, r.json.order, SALES, moi.id, moi.updatedAt, "WRONG_ENTRY")).status, 200);
  const o2 = await order(w);
  assert.equal((await addLeg(w, o2, SALES)).status, 201);
  const view = w.q("SELECT order_id, action, leg_id FROM v_aud_order_change WHERE action LIKE 'order_leg_%' ORDER BY created_at").map((x: any) => [x.order_id, x.action, x.leg_id]);
  assert.deepEqual(view, [[o.id, "order_leg_updated", leg.id], [o.id, "order_leg_closed", moi.id], [o2.id, "order_leg_added", null]]);
});
