// ADR-0047 A1, A2 — ghi chặng + hành khách ở LẬP / SỬA NHÁP (kế hoạch Task A9; Ruling R1–R4): thân mới (`services[].legs`, `passengers`), đường TƯƠNG
// THÍCH cho thân cũ (khoá vắng = giữ; trộn `pickupTime`/`pickupPlace` vào chặng chiều đi đầu — R2b), GHI KÉP hai cột cũ (R3), xác nhận tự điền ngày đón
// (R4c), và lính gác của lô lưu nháp (bên thua không xoá chặng/khách của bên thắng). Chạy CẢ ứng dụng trên SQLite thật (tests/audit/harness.mjs).
// Tên khách thử là tên GIẢ có đánh dấu, năm sinh hiếm (1911, 1922).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const LOC = "a941dd7d-faab-4098-9ab9-1df7fa6dd551"; // Bến tàu du lịch Nha Trang (0010, đang dùng)
const LOC_OFF = "bbbbbbbb-0000-4000-8000-000000000001"; // điểm NGỪNG dùng (gieo ở setup)
const inDays = (n: number) => new Date(Date.now() + 7 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  w.sqlite.exec("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('ZA1', 'Tour đảo', 'perPax', 500000, 1, '2026-01-01', '2026-01-01')");
  w.sqlite.exec("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('ZB2', 'Vé cáp treo', 'perPax', 200000, 1, '2026-01-01', '2026-01-01')");
  w.sqlite.exec(`INSERT INTO loc_location (id, code, name, location_type_code, active, created_at, updated_at) VALUES ('${LOC_OFF}', 'KS_CU', 'Khách sạn cũ', 'HOTEL', 0, '2026-01-01', '2026-01-01')`);
  return w;
}

const D = inDays(3);
const OUT = { direction: "OUT", pickupDate: "", pickupTime: "06:30", pickupLocationId: null, pickupPlace: "Khách sạn Dò Tìm", dropoffLocationId: LOC, dropoffPlace: "" };
const RET = { direction: "RETURN", pickupDate: inDays(4), pickupTime: "16:00", pickupLocationId: LOC, pickupPlace: "", dropoffLocationId: null, dropoffPlace: "Khách sạn Dò Tìm" };
const P1 = { fullName: "Khách Dò Tìm Một", birthYear: 1911, paxCode: "adult" };
const P2 = { fullName: "Khách Dò Tìm Hai", birthYear: 1922, paxCode: null };
const svc = (extra: Record<string, unknown> = {}) => ({ kind: "catalog", catalogCode: "ZA1", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 500000 }, departDate: D, ...extra });
const body = (extra: Record<string, unknown> = {}) => ({ customerName: "Khách Thử", customerPhone: "0912345678", services: [svc()], ...extra });

async function create(w: any, b: Record<string, unknown>) {
  const r = await w.call("POST", "/api/orders", { as: SALES, body: b });
  assert.equal(r.status, 201, r.text);
  return r.json.order;
}
const legsOf = (w: any, orderId: string) =>
  w.q("SELECT id, order_service_id, direction, pickup_date, pickup_time, pickup_location_id, pickup_place, dropoff_location_id, dropoff_place, closed_at FROM ord_transfer_leg WHERE order_id = ? ORDER BY direction, id", orderId).map((r: any) => ({ ...r }));
const paxRows = (w: any, orderId: string) => w.q("SELECT id, person_key, full_name, birth_year, pax_code FROM ord_passenger WHERE order_id = ? ORDER BY full_name", orderId).map((r: any) => ({ ...r }));
const mirror = (w: any, orderId: string) => w.q("SELECT pickup_time, pickup_place FROM order_service WHERE order_id = ? ORDER BY sort_order", orderId).map((r: any) => ({ ...r }));

test("lập đơn có services[0].legs = [đi, về] + passengers 2 người → đọc lại đúng; hai khoá cũ dẫn xuất = chiều đi; GHI KÉP cột cũ (R3); nhật ký chỉ số lượng", async () => {
  const w = setup();
  const o = await create(w, body({ services: [svc({ legs: [OUT, RET] })], passengers: [P1, P2] }));
  const s = o.services[0];
  assert.equal(s.legs.length, 2);
  assert.deepEqual([s.pickupTime, s.pickupPlace], ["06:30", "Khách sạn Dò Tìm"]);
  const out = s.legs.find((l: any) => l.direction === "OUT");
  assert.deepEqual([out.pickupDate, out.dropoffLabel], [D, "Bến tàu du lịch Nha Trang"], "ngày đón trống → ngày đi (R4b); nơi trả = tên điểm");
  const ret = s.legs.find((l: any) => l.direction === "RETURN");
  assert.deepEqual([ret.pickupLabel, ret.dropoffLabel], ["Bến tàu du lịch Nha Trang", "Khách sạn Dò Tìm"]);
  assert.deepEqual(mirror(w, o.id), [{ pickup_time: "06:30", pickup_place: "Khách sạn Dò Tìm" }], "cột cũ = dẫn xuất (ghi kép R3)");
  assert.deepEqual(paxRows(w, o.id).map((p: any) => [p.full_name, p.birth_year, p.pax_code, p.id === p.person_key]), [
    ["Khách Dò Tìm Hai", 1922, null, true],
    ["Khách Dò Tìm Một", 1911, "adult", true],
  ]);
  const log = w.q("SELECT detail FROM audit_log WHERE order_id = ? AND action = 'created'", o.id)[0].detail as string;
  assert.match(log, /danh sách khách: 2 người/);
  assert.doesNotMatch(log, /Dò Tìm|1911|1922/);
});

test("lập đơn thân CŨ (không legs, không passengers) có giờ + điểm đón → một chặng chiều đi; không có dữ liệu đón → không chặng", async () => {
  const w = setup();
  const o = await create(w, body({ services: [svc({ pickupTime: "07:15", pickupPlace: "Nhà riêng Dò Tìm" }), { ...svc(), catalogCode: "ZB2", catalogPriceSeen: { adult: 200000 } }] }));
  assert.equal(o.services[0].legs.length, 1);
  assert.deepEqual([o.services[0].pickupTime, o.services[0].pickupPlace, o.services[0].legs[0].pickupDate], ["07:15", "Nhà riêng Dò Tìm", D]);
  assert.equal(o.services[1].legs.length, 0);
  assert.equal(paxRows(w, o.id).length, 0);
  assert.deepEqual(mirror(w, o.id), [{ pickup_time: "07:15", pickup_place: "Nhà riêng Dò Tìm" }, { pickup_time: null, pickup_place: null }]);
});

test("lưu nháp gửi lại → GIỮ id chặng và id hành khách; passengers: [] → danh sách rỗng", async () => {
  const w = setup();
  const o = await create(w, body({ services: [svc({ legs: [OUT, RET] })], passengers: [P1, P2] }));
  const legIds = o.services[0].legs.map((l: any) => l.id).sort();
  const paxIds = paxRows(w, o.id).map((p: any) => p.id).sort();
  const rows = paxRows(w, o.id);
  const again = o.services[0].legs.map((l: any) => ({ id: l.id, direction: l.direction, pickupDate: l.pickupDate, pickupTime: l.pickupTime, pickupLocationId: l.pickupLocationId, pickupPlace: l.pickupPlace ?? "", dropoffLocationId: l.dropoffLocationId, dropoffPlace: l.dropoffPlace ?? "" }));
  const r = await w.call("PUT", `/api/orders/${o.id}`, {
    as: SALES,
    body: body({ expectedUpdatedAt: o.updatedAt, services: [svc({ id: o.services[0].id, legs: again })], passengers: rows.map((p: any) => ({ id: p.id, fullName: p.full_name, birthYear: p.birth_year, paxCode: p.pax_code })) }),
  });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json.order.services[0].legs.map((l: any) => l.id).sort(), legIds);
  assert.deepEqual(paxRows(w, o.id).map((p: any) => p.id).sort(), paxIds);
  const r2 = await w.call("PUT", `/api/orders/${o.id}`, { as: SALES, body: body({ expectedUpdatedAt: r.json.order.updatedAt, services: [svc({ id: o.services[0].id, legs: again })], passengers: [] }) });
  assert.equal(r2.status, 200, r2.text);
  assert.equal(paxRows(w, o.id).length, 0);
});

test("TƯƠNG THÍCH (R2b): lưu nháp bằng thân CŨ (không legs, không passengers) đổi giờ đón → chiều đi đổi giờ; chiều về, nơi trả, danh sách khách CÒN NGUYÊN", async () => {
  const w = setup();
  const o = await create(w, body({ services: [svc({ legs: [OUT, RET] })], passengers: [P1, P2] }));
  const before = legsOf(w, o.id);
  const r = await w.call("PUT", `/api/orders/${o.id}`, {
    as: SALES,
    body: body({ expectedUpdatedAt: o.updatedAt, services: [svc({ id: o.services[0].id, pickupTime: "07:45", pickupPlace: "Khách sạn Dò Tìm" })] }),
  });
  assert.equal(r.status, 200, r.text);
  const after = legsOf(w, o.id);
  const out = after.find((l: any) => l.direction === "OUT");
  const ret = after.find((l: any) => l.direction === "RETURN");
  assert.equal(out.pickup_time, "07:45");
  assert.equal(out.dropoff_location_id, LOC, "nơi trả chiều đi còn nguyên");
  assert.deepEqual(ret, before.find((l: any) => l.direction === "RETURN"), "chiều về còn nguyên (cả id)");
  assert.equal(out.id, before.find((l: any) => l.direction === "OUT").id, "id chiều đi giữ nguyên");
  assert.equal(paxRows(w, o.id).length, 2, "không có khoá passengers = giữ danh sách");
  assert.deepEqual(mirror(w, o.id), [{ pickup_time: "07:45", pickup_place: "Khách sạn Dò Tìm" }]);
  // thân cũ gửi giờ + nơi RỖNG → bỏ chiều đi (đơn nháp: xoá hẳn khi lưu); chiều về còn
  const r2 = await w.call("PUT", `/api/orders/${o.id}`, { as: SALES, body: body({ expectedUpdatedAt: r.json.order.updatedAt, services: [svc({ id: o.services[0].id, pickupTime: "", pickupPlace: "" })] }) });
  assert.equal(r2.status, 200, r2.text);
  assert.deepEqual(legsOf(w, o.id).map((l: any) => l.direction), ["RETURN"]);
  assert.deepEqual(mirror(w, o.id), [{ pickup_time: null, pickup_place: null }]);
});

test("TƯƠNG THÍCH: thân cũ đổi NGÀY ĐI → mọi chặng dời cùng số ngày (R4e); điểm danh mục gửi lại bằng TÊN → giữ pickupLocationId", async () => {
  const w = setup();
  const o = await create(w, body({ services: [svc({ legs: [{ ...OUT, pickupPlace: "", pickupLocationId: LOC, pickupDate: inDays(2) }, RET] })] }));
  const r = await w.call("PUT", `/api/orders/${o.id}`, {
    as: SALES,
    body: body({ expectedUpdatedAt: o.updatedAt, services: [svc({ id: o.services[0].id, departDate: inDays(5), pickupTime: "06:30", pickupPlace: "Bến tàu du lịch Nha Trang" })] }),
  });
  assert.equal(r.status, 200, r.text);
  const legs = legsOf(w, o.id);
  assert.deepEqual(legs.map((l: any) => [l.direction, l.pickup_date]), [["OUT", inDays(4)], ["RETURN", inDays(6)]]);
  assert.deepEqual([legs[0].pickup_location_id, legs[0].pickup_place], [LOC, null]);
});

test("400: chặng id không thuộc dịch vụ này; legs có ở dịch vụ này mà vắng ở dịch vụ khác; điểm ngừng dùng; ngày đón ngoài khoảng; hành khách sai", async () => {
  const w = setup();
  const o = await create(w, body({ services: [svc({ legs: [OUT] })] }));
  const put = (b: Record<string, unknown>) => w.call("PUT", `/api/orders/${o.id}`, { as: SALES, body: body({ expectedUpdatedAt: o.updatedAt, ...b }) });
  const cases: [string, Record<string, unknown>][] = [
    ["id lạ", { services: [svc({ id: o.services[0].id, legs: [{ ...OUT, id: "00000000-0000-4000-8000-000000000000" }] })] }],
    ["trộn", { services: [svc({ id: o.services[0].id, legs: [OUT] }), { ...svc(), catalogCode: "ZB2", catalogPriceSeen: { adult: 200000 } }] }],
    ["điểm ngừng", { services: [svc({ id: o.services[0].id, legs: [{ ...OUT, pickupPlace: "", pickupLocationId: LOC_OFF }] })] }],
    ["ngày ngoài khoảng", { services: [svc({ id: o.services[0].id, legs: [{ ...OUT, pickupDate: inDays(12) }] })] }],
    ["khách sai năm", { services: [svc({ id: o.services[0].id, legs: [OUT] })], passengers: [{ ...P1, birthYear: 1800 }] }],
    ["khách id lạ", { services: [svc({ id: o.services[0].id, legs: [OUT] })], passengers: [{ ...P1, id: "00000000-0000-4000-8000-000000000000" }] }],
    ["quá 10 chặng", { services: [svc({ id: o.services[0].id, legs: Array.from({ length: 11 }, () => OUT) })] }],
  ];
  for (const [label, b] of cases) {
    const r = await put(b);
    assert.equal(r.status, 400, `${label}: ${r.text}`);
    assert.equal(r.json.error.code, "invalid_input", label);
  }
  const created = await w.call("POST", "/api/orders", { as: SALES, body: body({ services: [svc({ legs: [{ ...OUT, pickupPlace: "", pickupLocationId: LOC_OFF }] })] }) });
  assert.equal(created.status, 400, created.text);
});

test("xác nhận đơn nháp có chặng THIẾU ngày mà dịch vụ có ngày → máy chủ điền ngày đi vào chặng (R4c), đơn xác nhận được", async () => {
  const w = setup();
  const o = await create(w, body({ services: [svc({ legs: [OUT] })] }));
  w.sqlite.prepare("UPDATE ord_transfer_leg SET pickup_date = NULL WHERE order_id = ?").run(o.id);
  const c = await w.call("POST", `/api/orders/${o.id}/status`, { as: SALES, body: { status: "confirmed" } });
  assert.equal(c.status, 200, c.text);
  assert.equal(legsOf(w, o.id)[0].pickup_date, D);
});

test("hai lần lưu nháp cùng expectedUpdatedAt → một 409 stale; bên THUA không xoá chặng/khách của bên thắng", async () => {
  const w = setup();
  const o = await create(w, body({ services: [svc({ legs: [OUT] })], passengers: [P1] }));
  const winner = await w.call("PUT", `/api/orders/${o.id}`, {
    as: SALES,
    body: body({ expectedUpdatedAt: o.updatedAt, services: [svc({ id: o.services[0].id, legs: [OUT, RET] })], passengers: [P1, P2] }),
  });
  assert.equal(winner.status, 200, winner.text);
  const legsAfterWin = legsOf(w, o.id);
  const loser = await w.call("PUT", `/api/orders/${o.id}`, { as: SALES, body: body({ expectedUpdatedAt: o.updatedAt, services: [svc({ id: o.services[0].id, legs: [] })], passengers: [] }) });
  assert.equal(loser.status, 409, loser.text);
  assert.equal(loser.json.error.code, "stale");
  assert.deepEqual(legsOf(w, o.id), legsAfterWin);
  assert.equal(paxRows(w, o.id).length, 2);
});
