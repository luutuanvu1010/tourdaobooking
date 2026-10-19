// Chặng đưa đón + danh sách hành khách (ADR-0047 — kế hoạch Task A16; tiêu chí nghiệm thu 4–8) trên API THẬT (wrangler dev, D1 local tạm):
//   (4) tương thích thân CŨ (Ruling R2): lưu nháp không `legs`/`passengers` chỉ đổi chiều đi, giữ chiều về + nơi trả + danh sách khách; `PUT /trip` hai khoá
//       rỗng → ĐÓNG chiều đi (NOT_NEEDED) cả nháp lẫn đã xác nhận, lưu nháp sau không chèn lại; `PUT /trip` không có hai khoá → chặng không đổi;
//   (5) GHI KÉP (R3): sau mọi đường ghi, `order_service.pickup_time/pickup_place` = dẫn xuất của chặng chiều đi đầu (đọc thẳng SQL);
//   (6) route chặng sau xác nhận: thêm/sửa/đóng; 403 cho kế toán, hướng dẫn viên; đơn nháp 409 `use_order_form`; mốc cũ 409 `stale`;
//   (7) hành khách: nháp 3 → giữ → rỗng; sau xác nhận thêm/sửa (dòng mới cùng person_key)/huỷ (mọi dòng); kế toán GET 200 POST 403; HDV phụ trách GET 200,
//       đơn khác 404;
//   (8) cờ vượt số khách dùng số khách HIỆU LỰC (HDV sửa số khách);
//   (10) THAY chặng (C14): một lô đóng chặng cũ + thêm chặng mới; mốc đơn cũ 409 `stale` không ghi gì; dưới mốc 409 `short_notice_required`.
// Dùng danh mục GIẢ `ZE1` (`ensureFakeCatalog`, không cần Sheet — DK-T3-01 cấm dịch vụ nhập tay mới). Tên khách là tên GIẢ có đánh dấu, năm sinh hiếm.
import assert from "node:assert/strict";
import { ACCOUNTS, call, catalogService, ensureFakeCatalog, orderInput, session, sql, sqlRows, vnDate } from "./lib.mjs";

await ensureFakeCatalog();
const A = await session(ACCOUNTS.salesA);
const ACC = await session(ACCOUNTS.accountant);
const FIELD = await session(ACCOUNTS.field);
const FIELD_ID = (await call(FIELD, "GET", "/api/auth/me")).body.staff.id;

const LOC = "a941dd7d-faab-4098-9ab9-1df7fa6dd551"; // Bến tàu du lịch Nha Trang (migration 0010)
const D = vnDate(7);
const OUT = { direction: "OUT", pickupDate: "", pickupTime: "06:30", pickupLocationId: null, pickupPlace: "Khách sạn Dò Tìm E2E", dropoffLocationId: LOC, dropoffPlace: "" };
const RET = { direction: "RETURN", pickupDate: vnDate(8), pickupTime: "16:00", pickupLocationId: LOC, pickupPlace: "", dropoffLocationId: null, dropoffPlace: "Khách sạn Dò Tìm E2E" };
const P = (n, year = 1911) => ({ fullName: `Khách Dò Tìm E2E ${n}`, birthYear: year, paxCode: null });
const svc = (extra = {}) => catalogService({ pax: { adult: 2 }, departDate: D, ...extra });
const legsSql = async (id) =>
  sqlRows(`SELECT id, direction, pickup_date, pickup_time, pickup_location_id, pickup_place, dropoff_location_id, dropoff_place, closed_at, close_reason_code FROM ord_transfer_leg WHERE order_id = '${id}' ORDER BY direction, id`);
const mirror = async (id) => sqlRows(`SELECT pickup_time, pickup_place FROM order_service WHERE order_id = '${id}' ORDER BY sort_order`);
const get = async (id, who = A) => (await call(who, "GET", `/api/orders/${id}`)).body.order;
const tripBody = (o, extra) => ({ expectedUpdatedAt: o.updatedAt, services: [{ id: o.services[0].id, departDate: D, departTime: "", checkinDate: "", checkinTime: "", checkinPlace: "", note: "", ...extra }] });

let r;
// ---- (4) + (5) TƯƠNG THÍCH thân cũ + GHI KÉP -------------------------------------------------------------------------------------------------
r = await call(A, "POST", "/api/orders", orderInput({ services: [svc({ legs: [OUT, RET] })], passengers: [P(1), P(2)] }));
assert.equal(r.status, 201, JSON.stringify(r.body));
let o = r.body.order;
assert.deepEqual(await mirror(o.id), [{ pickup_time: "06:30", pickup_place: "Khách sạn Dò Tìm E2E" }], "ghi kép khi lập");
const retBefore = (await legsSql(o.id)).find((l) => l.direction === "RETURN");
r = await call(A, "PUT", `/api/orders/${o.id}`, orderInput({ expectedUpdatedAt: o.updatedAt, services: [svc({ id: o.services[0].id, pickupTime: "07:45", pickupPlace: "Khách sạn Dò Tìm E2E" })] }));
assert.equal(r.status, 200, JSON.stringify(r.body));
let legs = await legsSql(o.id);
assert.equal(legs.find((l) => l.direction === "OUT").pickup_time, "07:45");
assert.equal(legs.find((l) => l.direction === "OUT").dropoff_location_id, LOC);
assert.deepEqual(legs.find((l) => l.direction === "RETURN"), retBefore, "chiều về còn nguyên");
assert.equal((await call(A, "GET", `/api/orders/${o.id}/passengers`)).body.passengers.length, 2, "không khoá passengers = giữ danh sách");
assert.deepEqual(await mirror(o.id), [{ pickup_time: "07:45", pickup_place: "Khách sạn Dò Tìm E2E" }], "ghi kép khi lưu nháp");
console.log("✓ (4)(5) lưu nháp thân CŨ: chiều đi đổi giờ; chiều về, nơi trả, danh sách khách còn nguyên; cột cũ = dẫn xuất");

o = r.body.order;
const legsNoKeys = await legsSql(o.id);
r = await call(A, "PUT", `/api/orders/${o.id}/trip`, tripBody(o, { note: "Chỉ đổi ghi chú" }));
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.deepEqual(await legsSql(o.id), legsNoKeys, "PUT /trip không có hai khoá → chặng không đổi");
o = await get(o.id);
r = await call(A, "PUT", `/api/orders/${o.id}/trip`, tripBody(o, { note: "Chỉ đổi ghi chú", pickupTime: "", pickupPlace: "" }));
assert.equal(r.status, 200, JSON.stringify(r.body));
legs = await legsSql(o.id);
assert.equal(legs.find((l) => l.direction === "OUT").close_reason_code, "NOT_NEEDED", "đơn nháp: đóng chiều đi, không xoá ở đường này");
assert.deepEqual(await mirror(o.id), [{ pickup_time: null, pickup_place: null }]);
o = await get(o.id);
r = await call(A, "PUT", `/api/orders/${o.id}`, orderInput({ expectedUpdatedAt: o.updatedAt, services: [svc({ id: o.services[0].id, pickupTime: "", pickupPlace: "" })] }));
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.deepEqual((await legsSql(o.id)).filter((l) => l.closed_at === null).map((l) => l.direction), ["RETURN"], "lưu nháp sau không chèn lại chiều đi đã đóng");
console.log("✓ (4) PUT /trip: không có hai khoá → không đổi; hai khoá rỗng → đóng chiều đi (NOT_NEEDED); lưu nháp sau không chèn lại");

// ---- (6) Route chặng sau xác nhận -------------------------------------------------------------------------------------------------------------
r = await call(A, "POST", "/api/orders", orderInput({ services: [svc({ legs: [OUT] })], handlerStaffId: FIELD_ID }));
assert.equal(r.status, 201, JSON.stringify(r.body));
const draft = r.body.order;
const draftLeg = draft.services[0].legs[0];
r = await call(A, "POST", `/api/orders/${draft.id}/legs`, { expectedUpdatedAt: draft.updatedAt, serviceId: draft.services[0].id, leg: RET });
assert.equal(r.status, 409); assert.equal(r.body.error.code, "use_order_form");
assert.equal((await call(A, "POST", `/api/orders/${draft.id}/status`, { status: "confirmed" })).status, 200);
let c = await get(draft.id);
r = await call(A, "POST", `/api/orders/${c.id}/legs`, { expectedUpdatedAt: c.updatedAt, serviceId: c.services[0].id, leg: RET });
assert.equal(r.status, 201, JSON.stringify(r.body));
assert.deepEqual(r.body.order.services[0].legs.map((l) => l.direction).sort(), ["OUT", "RETURN"]);
r = await call(A, "POST", `/api/orders/${c.id}/legs`, { expectedUpdatedAt: c.updatedAt, serviceId: c.services[0].id, leg: RET });
assert.equal(r.status, 409); assert.equal(r.body.error.code, "stale");
c = await get(c.id);
const out = c.services[0].legs.find((l) => l.id === draftLeg.id);
const edit = { pickupDate: out.pickupDate, pickupTime: "07:00", pickupLocationId: null, pickupPlace: out.pickupPlace, dropoffLocationId: LOC, dropoffPlace: "" };
for (const who of [ACC, FIELD]) assert.equal((await call(who, "PUT", `/api/orders/${c.id}/legs/${out.id}`, { expectedUpdatedAt: out.updatedAt, leg: edit })).status, 403);
r = await call(A, "PUT", `/api/orders/${c.id}/legs/${out.id}`, { expectedUpdatedAt: out.updatedAt, leg: edit });
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.deepEqual(await mirror(c.id), [{ pickup_time: "07:00", pickup_place: "Khách sạn Dò Tìm E2E" }], "ghi kép khi sửa chặng");
const hist = (await call(A, "GET", `/api/orders/${c.id}`)).body.history.map((h) => h.detail ?? "").join(" | ");
assert.match(hist, /Chiều đi · Dịch vụ thử: giờ đón 06:30 → 07:00/);
const ret = r.body.order.services[0].legs.find((l) => l.direction === "RETURN");
r = await call(A, "POST", `/api/orders/${c.id}/legs/${ret.id}/close`, { expectedUpdatedAt: ret.updatedAt, reasonCode: "WRONG_ENTRY" });
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.deepEqual(r.body.order.services[0].legs.map((l) => l.direction), ["OUT"]);
assert.equal((await sqlRows(`SELECT count(*) AS n FROM ord_transfer_leg WHERE id = '${ret.id}' AND closed_at IS NOT NULL`))[0].n, 1, "dòng còn trong CSDL");
console.log("✓ (6) chặng sau xác nhận: thêm 201, sửa 200 (nhật ký trước → sau), đóng 200 (dòng còn); kế toán/HDV 403; nháp 409 use_order_form; mốc cũ 409 stale");

// ---- (7) + (8) Hành khách --------------------------------------------------------------------------------------------------------------------
r = await call(A, "POST", "/api/orders", orderInput({ services: [svc()], passengers: [P(1), P(2), P(3)], handlerStaffId: FIELD_ID }));
assert.equal(r.status, 201, JSON.stringify(r.body));
let h = r.body.order;
assert.equal((await call(A, "GET", `/api/orders/${h.id}/passengers`)).body.passengers.length, 3);
r = await call(A, "PUT", `/api/orders/${h.id}`, orderInput({ expectedUpdatedAt: h.updatedAt, services: [svc({ id: h.services[0].id })] }));
assert.equal(r.status, 200);
assert.equal((await call(A, "GET", `/api/orders/${h.id}/passengers`)).body.passengers.length, 3, "không gửi passengers → vẫn 3");
r = await call(A, "PUT", `/api/orders/${h.id}`, orderInput({ expectedUpdatedAt: r.body.order.updatedAt, services: [svc({ id: h.services[0].id })], passengers: [] }));
assert.equal(r.status, 200);
assert.equal((await call(A, "GET", `/api/orders/${h.id}/passengers`)).body.passengers.length, 0, "passengers: [] → 0");
r = await call(A, "PUT", `/api/orders/${h.id}`, orderInput({ expectedUpdatedAt: r.body.order.updatedAt, services: [svc({ id: h.services[0].id })], passengers: [P(1), P(2), P(3)] }));
assert.equal(r.status, 200);
assert.equal((await call(A, "POST", `/api/orders/${h.id}/status`, { status: "confirmed" })).status, 200);
let ds = (await call(A, "GET", `/api/orders/${h.id}/passengers`)).body;
assert.deepEqual([ds.soNguoiCoTen, ds.soKhachDoan, ds.vuotSoKhach], [3, 2, true], "(8) 3 người > 2 khách");
r = await call(A, "POST", `/api/orders/${h.id}/passengers`, { expectedUpdatedAt: ds.orderUpdatedAt, them: [P(4, 1922)], sua: [], huy: [] });
assert.equal(r.status, 200, JSON.stringify(r.body));
ds = r.body;
assert.equal(ds.passengers.length, 4);
const a = ds.passengers.find((p) => p.fullName === "Khách Dò Tìm E2E 1");
r = await call(A, "POST", `/api/orders/${h.id}/passengers`, { expectedUpdatedAt: ds.orderUpdatedAt, them: [], sua: [{ personKey: a.personKey, fullName: "Khách Dò Tìm E2E 1 Sửa", birthYear: 1911, paxCode: null }], huy: [] });
assert.equal(r.status, 200, JSON.stringify(r.body));
ds = r.body;
const a2 = ds.passengers.find((p) => p.personKey === a.personKey);
assert.equal(ds.passengers.length, 4);
assert.notEqual(a2.rowId, a.rowId);
assert.equal((await sqlRows(`SELECT count(*) AS n FROM ord_passenger WHERE person_key = '${a.personKey}'`))[0].n, 2, "dòng cũ còn");
const b = ds.passengers.find((p) => p.fullName === "Khách Dò Tìm E2E 2");
r = await call(A, "POST", `/api/orders/${h.id}/passengers`, { expectedUpdatedAt: ds.orderUpdatedAt, them: [], sua: [], huy: [b.personKey] });
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.passengers.length, 3);
assert.equal((await sqlRows(`SELECT count(*) AS n FROM ord_passenger WHERE person_key = '${b.personKey}' AND voided_at IS NULL`))[0].n, 0, "mọi dòng của B đã huỷ");
assert.equal((await call(ACC, "GET", `/api/orders/${h.id}/passengers`)).status, 200);
assert.equal((await call(ACC, "POST", `/api/orders/${h.id}/passengers`, { expectedUpdatedAt: r.body.orderUpdatedAt, them: [P(9)], sua: [], huy: [] })).status, 403);
assert.equal((await call(FIELD, "GET", `/api/orders/${h.id}/passengers`)).status, 200, "HDV đang phụ trách");
r = await call(A, "POST", "/api/orders", orderInput({ services: [svc()] }));
assert.equal((await call(FIELD, "GET", `/api/orders/${r.body.order.id}/passengers`)).status, 404, "HDV không phụ trách → 404");
const logs = (await sqlRows(`SELECT detail FROM audit_log WHERE order_id = '${h.id}' AND action = 'order_passenger_changed' ORDER BY rowid`)).map((x) => x.detail);
assert.deepEqual(logs, ["thêm 1, sửa 0, huỷ 0 khách", "thêm 0, sửa 1, huỷ 0 khách", "thêm 0, sửa 0, huỷ 1 khách"]);
console.log("✓ (7) hành khách: nháp 3 → giữ → rỗng; sau xác nhận thêm/sửa (dòng mới cùng person_key)/huỷ (mọi dòng); kế toán GET 200 POST 403; HDV phụ trách 200, đơn khác 404; nhật ký chỉ số lượng");

// (8) số khách HIỆU LỰC: HDV sửa số khách lên 3 → cờ tắt (3 người có tên = 3 khách)
h = await get(h.id);
r = await call(FIELD, "POST", `/api/orders/${h.id}/handler-money-edit`, { reason: "Khách thêm người", services: [{ id: h.services[0].id, pax: { adult: 3, child: 0, senior: 0, infant: 0 } }] });
assert.equal(r.status, 200, JSON.stringify(r.body));
ds = (await call(A, "GET", `/api/orders/${h.id}/passengers`)).body;
assert.deepEqual([ds.soNguoiCoTen, ds.soKhachDoan, ds.vuotSoKhach], [3, 3, false]);
console.log("✓ (8) cờ vượt số khách dùng số khách hiệu lực (HDV sửa 2 → 3 thì tắt)");

// (9) ADR-0049 D2 — MỐC 6 GIỜ LÚC ĐẶT + ĐẶT GẤP trên D1 THẬT (đường thật: Quản trị đặt gấp qua route — Ruling N-9 (ii); mốc = chính sách gieo 360 phút).
// Chặng đón sau 2 giờ: lưu nháp được (kèm cảnh báo), xác nhận → 409 `short_notice_required`; Bán hàng đặt gấp → 403; Quản trị đặt gấp → 200; xác nhận → 200.
{
  const ADM = await session(ACCOUNTS.admin);
  const sau2 = new Date(Date.now() + 7 * 3600e3 + 120 * 60e3).toISOString();
  const [ngay, gio] = [sau2.slice(0, 10), sau2.slice(11, 16)];
  r = await call(A, "POST", "/api/orders", orderInput({ services: [catalogService({ pax: { adult: 2 }, departDate: ngay, legs: [{ ...OUT, pickupDate: ngay, pickupTime: gio }] })] }));
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal(r.body.mocToiThieuPhut, 360, "mốc tối thiểu thật của chính sách gieo");
  assert.equal(r.body.canhBaoMoc.length, 1, "lưu nháp dưới mốc: cảnh báo, không chặn");
  const g = r.body.order;
  const legId = g.services[0].legs[0].id;
  r = await call(A, "POST", `/api/orders/${g.id}/status`, { status: "confirmed" });
  assert.equal(r.status, 409, JSON.stringify(r.body));
  assert.equal(r.body.error.code, "short_notice_required");
  assert.deepEqual(r.body.error.legs.map((x) => x.legId), [legId]);
  assert.equal((await call(A, "POST", `/api/orders/${g.id}/legs/${legId}/short-notice`, { lyDo: "KHACH_DOAN_GOI_GAP" })).status, 403, "Bán hàng không đặt gấp");
  r = await call(ADM, "POST", `/api/orders/${g.id}/legs/${legId}/short-notice`, { lyDo: "KHACH_DOAN_GOI_GAP", ghiChu: "Khách gọi, số 0905 123 456 78" });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const cot = (await sqlRows(`SELECT short_notice_reason AS l, short_notice_lead_minutes AS p, short_notice_note AS n FROM ord_transfer_leg WHERE id = '${legId}'`))[0];
  assert.deepEqual([cot.l, cot.p], ["KHACH_DOAN_GOI_GAP", 360]);
  assert.ok(!String(cot.n).includes("0905"), "ghi chú đã che dãy số");
  r = await call(A, "POST", `/api/orders/${g.id}/status`, { status: "confirmed" });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const nk = (await sqlRows(`SELECT detail FROM audit_log WHERE order_id = '${g.id}' AND action = 'order_leg_short_notice'`)).map((x) => x.detail);
  assert.equal(nk.length, 1);
  assert.ok(!nk[0].includes("0905") && !nk[0].includes("Khách gọi"), "nhật ký không chép ghi chú");
  // D1 THẬT giữ CHECK của 0040: có lý do mà thiếu số phút → chặn (vế IS NOT NULL tường minh)
  const legId2 = (await sqlRows(`SELECT id FROM ord_transfer_leg WHERE order_id = '${g.id}' AND closed_at IS NULL`))[0].id;
  await assert.rejects(sql(`UPDATE ord_transfer_leg SET short_notice_lead_minutes = NULL WHERE id = '${legId2}'`), /CHECK constraint failed/);
  console.log("✓ (9) mốc 6 giờ: lưu nháp có cảnh báo, xác nhận 409 short_notice_required; Bán hàng đặt gấp 403; Quản trị đặt gấp 200 (360 phút, ghi chú che số); xác nhận 200; CHECK 0040 giữ trên D1");
}

// (10) C14 — THAY CHẶNG trên D1 THẬT (`POST /api/orders/:id/legs/:legId/replace`; người kiểm độc lập V3, 2026-10-08): đóng chặng cũ + thêm chặng mới
// trong MỘT lô, MỘT khoá lạc quan theo mốc ĐƠN. Thắng: 200, chặng cũ đóng REPLACED (dòng còn), chặng mới mở, ghi kép = chặng mới, đúng hai dòng nhật ký.
// Thua: mốc ĐƠN cũ → 409 `stale`, đọc lại đơn thấy mốc, chặng, ghi kép, nhật ký y nguyên. Dưới mốc: chặng mới đón sau 2 giờ, Bán hàng không `datGap` →
// 409 `short_notice_required`, chặng cũ vẫn mở, không ghi gì.
{
  const nhatKyDon = async (id) => sqlRows(`SELECT action, detail FROM audit_log WHERE order_id = '${id}' ORDER BY rowid`);
  const chupDon = async (id) => ({ updatedAt: (await get(id)).updatedAt, legs: await legsSql(id), mirror: await mirror(id), nhatKy: (await nhatKyDon(id)).length });

  r = await call(A, "POST", "/api/orders", orderInput({ services: [svc({ legs: [OUT] })] }));
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const t = r.body.order;
  assert.equal((await call(A, "POST", `/api/orders/${t.id}/status`, { status: "confirmed" })).status, 200);
  const truocThay = await get(t.id);
  const cuId = truocThay.services[0].legs[0].id;
  const soNhatKyTruoc = (await nhatKyDon(t.id)).length;
  const MOI = { ...OUT, pickupDate: D, pickupTime: "08:15", pickupPlace: "Khách sạn Thay E2E" };
  r = await call(A, "POST", `/api/orders/${t.id}/legs/${cuId}/replace`, { expectedUpdatedAt: truocThay.updatedAt, leg: MOI });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const moiLegs = r.body.order.services[0].legs;
  assert.deepEqual(moiLegs.map((l) => [l.direction, l.pickupTime, l.id === cuId]), [["OUT", "08:15", false]], "còn đúng chặng mới");
  const cuSql = (await legsSql(t.id)).find((l) => l.id === cuId);
  assert.ok(cuSql && cuSql.closed_at !== null, "chặng cũ đóng, dòng còn trong CSDL");
  assert.equal(cuSql.close_reason_code, "REPLACED");
  assert.deepEqual(await mirror(t.id), [{ pickup_time: "08:15", pickup_place: "Khách sạn Thay E2E" }], "ghi kép = chặng mới");
  const nkMoi = (await nhatKyDon(t.id)).slice(soNhatKyTruoc);
  assert.deepEqual(nkMoi.map((x) => x.action), ["order_leg_closed", "order_leg_added"], "đúng hai dòng nhật ký của lô thay");
  assert.match(nkMoi[0].detail, /bỏ — Đổi sang lượt đưa đón khác/);

  const sauThang = await chupDon(t.id);
  r = await call(A, "POST", `/api/orders/${t.id}/legs/${moiLegs[0].id}/replace`, { expectedUpdatedAt: truocThay.updatedAt, leg: { ...MOI, pickupTime: "09:30" } });
  assert.equal(r.status, 409, JSON.stringify(r.body));
  assert.equal(r.body.error.code, "stale");
  assert.deepEqual(await chupDon(t.id), sauThang, "lô thua (mốc đơn cũ): mốc đơn, chặng, ghi kép, nhật ký y nguyên");

  // Dưới mốc: đơn đi ngày mai, chặng 20:00 (luôn ≥ 20 giờ nữa → xác nhận được); thay bằng chặng đón sau 2 giờ (cách lấy giờ VN như khối (9)).
  const ngayDi = vnDate(1);
  r = await call(A, "POST", "/api/orders", orderInput({ services: [catalogService({ pax: { adult: 2 }, departDate: ngayDi, legs: [{ ...OUT, pickupDate: ngayDi, pickupTime: "20:00" }] })] }));
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const m = r.body.order;
  assert.equal((await call(A, "POST", `/api/orders/${m.id}/status`, { status: "confirmed" })).status, 200);
  const mc = await get(m.id);
  const mLegId = mc.services[0].legs[0].id;
  const truocMoc = await chupDon(m.id);
  const sau2 = new Date(Date.now() + 7 * 3600e3 + 120 * 60e3).toISOString();
  r = await call(A, "POST", `/api/orders/${m.id}/legs/${mLegId}/replace`, { expectedUpdatedAt: mc.updatedAt, leg: { ...OUT, pickupDate: sau2.slice(0, 10), pickupTime: sau2.slice(11, 16) } });
  assert.equal(r.status, 409, JSON.stringify(r.body));
  assert.equal(r.body.error.code, "short_notice_required");
  assert.deepEqual(await chupDon(m.id), truocMoc, "dưới mốc: chặng cũ vẫn mở, không ghi gì");
  console.log("✓ (10) thay chặng: 200 một lô (chặng cũ đóng REPLACED, chặng mới mở, ghi kép, 2 dòng nhật ký); mốc đơn cũ 409 stale không ghi gì; dưới mốc 409 short_notice_required không ghi gì");
}

console.log("\nE2E CHẶNG + HÀNH KHÁCH OK");
