// ADR-0047 A1, Ruling R2a (kế hoạch Task A8): MỌI nơi đọc giờ/nơi đón chuyển sang chặng đưa đón — hai khoá cũ `pickupTime`/`pickupPlace` nay là DẪN XUẤT
// của chặng chiều đi đầu (`chieuDiDau`), KHÔNG đọc cột cũ `order_service.pickup_time/pickup_place` (phát hành 1 chỉ còn ghi kép vào đó). Gieo dịch vụ có
// cột cũ "06:00 · Cột cũ" nhưng chặng chiều đi "07:00 · Chặng mới" → chi tiết đơn, danh sách, Trang chủ, hàng chờ HDV, "việc của tôi" đều phải ra
// "07:00 · Chặng mới". Chạy CẢ ứng dụng trên SQLite thật (tests/audit/harness.mjs).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const FIELD = "44444444-4444-4444-8444-444444444444";
const LOC = "a941dd7d-faab-4098-9ab9-1df7fa6dd551"; // Bến tàu du lịch Nha Trang (0010)
const vnToday = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
const AT = "2026-09-29T00:00:00.000Z";

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: FIELD, phone: "0900000004", name: "Hướng Dẫn", perms: ["FIELD"] });
  w.sqlite.exec("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('ZA1', 'Tour đảo', 'perPax', 500000, 1, '2026-01-01', '2026-01-01')");
  return w;
}

/** Lập đơn KHÔNG dữ liệu đón, rồi đặt cột CŨ = "06:00 · Cột cũ" và chèn chặng chiều đi "07:00 · Chặng mới" bằng SQL (đơn còn nháp), rồi xác nhận. */
async function orderWithLeg(w: any, extra: Record<string, unknown> = {}, leg: { locId?: string } = {}): Promise<string> {
  const today = vnToday();
  const r = await w.call("POST", "/api/orders", {
    as: SALES,
    body: {
      customerName: "Khách Thử", customerPhone: "0912345678",
      services: [{ kind: "catalog", catalogCode: "ZA1", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 500000 }, departDate: today }],
      ...extra,
    },
  });
  assert.equal(r.status, 201, r.text);
  const id = r.json.order.id as string;
  const svc = r.json.order.services[0].id as string;
  w.sqlite.prepare("UPDATE order_service SET pickup_time = '06:00', pickup_place = 'Cột cũ' WHERE id = ?").run(svc);
  w.sqlite
    .prepare(
      `INSERT INTO ord_transfer_leg (id, order_id, order_service_id, direction, pickup_date, pickup_time, pickup_location_id, pickup_place, created_at, updated_at)
       VALUES (?, ?, ?, 'OUT', ?, '07:00', ?, ?, ?, ?)`,
    )
    .run(`leg-${id}`.slice(0, 36), id, svc, today, leg.locId ?? null, leg.locId ? null : "Chặng mới", AT, AT);
  const c = await w.call("POST", `/api/orders/${id}/status`, { as: SALES, body: { status: "confirmed" } });
  assert.equal(c.status, 200, c.text);
  return id;
}

test("chi tiết đơn: pickupTime/pickupPlace DẪN XUẤT từ chặng (07:00 · Chặng mới), không phải cột cũ (06:00); có `legs` còn hiệu lực", async () => {
  const w = setup();
  const id = await orderWithLeg(w);
  const r = await w.call("GET", `/api/orders/${id}`, { as: SALES });
  assert.equal(r.status, 200, r.text);
  const s = r.json.order.services[0];
  assert.equal(s.pickupTime, "07:00");
  assert.equal(s.pickupPlace, "Chặng mới");
  assert.equal(s.legs.length, 1);
  assert.deepEqual(
    { direction: s.legs[0].direction, pickupTime: s.legs[0].pickupTime, pickupLabel: s.legs[0].pickupLabel, dropoffLabel: s.legs[0].dropoffLabel },
    { direction: "OUT", pickupTime: "07:00", pickupLabel: "Chặng mới", dropoffLabel: null },
  );
});

test("chi tiết đơn: chặng trỏ ĐIỂM DANH MỤC → pickupPlace = tên điểm; chặng đã ĐÓNG không có trong legs và không dẫn xuất", async () => {
  const w = setup();
  const id = await orderWithLeg(w, {}, { locId: LOC });
  let s = (await w.call("GET", `/api/orders/${id}`, { as: SALES })).json.order.services[0];
  assert.equal(s.pickupPlace, "Bến tàu du lịch Nha Trang");
  w.sqlite.prepare("UPDATE ord_transfer_leg SET closed_at = ?, close_reason_code = 'NOT_NEEDED' WHERE order_id = ?").run(AT, id);
  s = (await w.call("GET", `/api/orders/${id}`, { as: SALES })).json.order.services[0];
  assert.deepEqual([s.legs.length, s.pickupTime, s.pickupPlace], [0, null, null]);
});

test("danh sách đơn + Trang chủ 'Chuyến đón hôm nay': trip.pickupTime/pickupPlace dẫn xuất từ chặng", async () => {
  const w = setup();
  const id = await orderWithLeg(w);
  const list = await w.call("GET", "/api/orders?limit=100", { as: SALES });
  assert.equal(list.status, 200, list.text);
  const row = list.json.orders.find((o: any) => o.id === id);
  assert.deepEqual([row.trip.pickupTime, row.trip.pickupPlace], ["07:00", "Chặng mới"]);
  const dash = await w.call("GET", "/api/orders/dashboard", { as: SALES });
  assert.equal(dash.status, 200, dash.text);
  const t = dash.json.today.find((o: any) => o.id === id);
  assert.ok(t, "đơn đi hôm nay có trong 'Chuyến đón hôm nay' (Q3: theo ngày đi)");
  assert.deepEqual([t.trip.pickupTime, t.trip.pickupPlace], ["07:00", "Chặng mới"]);
});

test("hàng chờ HDV (phần hẹp, ĐÚNG bốn khoá) và 'việc của tôi': giờ/nơi đón dẫn xuất từ chặng", async () => {
  const w = setup();
  const pooled = await orderWithLeg(w);
  const mine = await orderWithLeg(w, { handlerStaffId: FIELD });
  const pool = await w.call("GET", "/api/orders/pool", { as: FIELD });
  assert.equal(pool.status, 200, pool.text);
  const p = pool.json.orders.find((o: any) => o.orderId === pooled);
  assert.ok(p, pool.text);
  assert.deepEqual(Object.keys(p.services[0]).sort(), ["name", "pax", "pickupPlace", "pickupTime"]);
  assert.deepEqual([p.services[0].pickupTime, p.services[0].pickupPlace], ["07:00", "Chặng mới"]);
  const my = await w.call("GET", "/api/dispatch/mine", { as: FIELD });
  assert.equal(my.status, 200, my.text);
  const m = my.json.assignments.find((a: any) => a.orderId === mine);
  assert.ok(m, my.text);
  assert.deepEqual([m.services[0].pickupTime, m.services[0].pickupPlace], ["07:00", "Chặng mới"]);
  assert.equal("legs" in m.services[0], false, "'việc của tôi' không có khoá legs ở Phần A (Review Focus 7)");
});
