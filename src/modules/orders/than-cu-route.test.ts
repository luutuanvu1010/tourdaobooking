// ADR-0047 §6 (Đợt 8) — bộ đếm thân cũ ở ba route ghi đơn; Lần A KHÔNG đổi hành vi (thân cũ vẫn được nhận). Chạy cả ứng dụng trên SQLite thật.
import { test } from "node:test";
import assert from "node:assert/strict";
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const inDays = (n: number) => new Date(Date.now() + 7 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);
const D = inDays(3);
const OUT = { direction: "OUT", pickupDate: "", pickupTime: "06:30", pickupLocationId: null, pickupPlace: "Khách sạn Dò Tìm", dropoffLocationId: null, dropoffPlace: "" };
const SVC = { kind: "catalog", catalogCode: "ZA1", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 500000 }, departDate: D };

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  w.sqlite.exec("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('ZA1', 'Tour đảo', 'perPax', 500000, 1, '2026-01-01', '2026-01-01')");
  return w;
}
const dem = (w: any) => w.sqlite.prepare("SELECT staff_id, order_id, target_type, detail FROM audit_log WHERE action = 'client_outdated_body' ORDER BY created_at").all().map((x: any) => ({ ...x }));

test("thân mới (có legs) → không đếm", async () => {
  const w = setup();
  const r = await w.call("POST", "/api/orders", { as: SALES, body: { customerName: "Khách Thử", customerPhone: "0912345678", services: [{ ...SVC, legs: [OUT] }] } });
  assert.equal(r.status, 201, r.text);
  assert.deepEqual(dem(w), []);
});

test("Lần A: thân đơn cũ (không legs) → vẫn 201 như trước, ghi ĐÚNG một dòng đếm 'Lập đơn', không gắn đơn", async () => {
  const w = setup();
  const r = await w.call("POST", "/api/orders", { as: SALES, body: { customerName: "Khách Thử", customerPhone: "0912345678", services: [{ ...SVC, pickupTime: "07:00", pickupPlace: "Khách sạn A" }] } });
  assert.equal(r.status, 201, r.text); // Task 4 đổi dòng này thành 409
  assert.deepEqual(dem(w), [{ staff_id: SALES, order_id: null, target_type: "system", detail: "Lập đơn" }]);
});

test("Lần A: PUT /trip có pickupTime → đếm 'Sửa thông tin chuyến'; PUT /api/orders/:id nháp không legs → đếm 'Lưu nháp'", async () => {
  const w = setup();
  const o = (await w.call("POST", "/api/orders", { as: SALES, body: { customerName: "Khách Thử", customerPhone: "0912345678", services: [{ ...SVC, legs: [OUT] }] } })).json.order;
  const sid = o.services[0].id;
  const trip = { id: sid, departDate: D, departTime: "", checkinDate: "", checkinTime: "", checkinPlace: "", note: "", pickupTime: "07:15", pickupPlace: "Khách sạn B" };
  await w.call("PUT", `/api/orders/${o.id}/trip`, { as: SALES, body: { expectedUpdatedAt: o.updatedAt, services: [trip] } });
  const o2 = (await w.call("GET", `/api/orders/${o.id}`, { as: SALES })).json.order;
  await w.call("PUT", `/api/orders/${o.id}`, { as: SALES, body: { expectedUpdatedAt: o2.updatedAt, customerName: "Khách Thử", customerPhone: "0912345678", services: [{ ...SVC, id: sid }] } });
  assert.deepEqual(dem(w).map((x: any) => x.detail), ["Sửa thông tin chuyến", "Lưu nháp"]);
});

test("Review Focus 3: chèn dòng đếm lỗi → yêu cầu vẫn chạy như không có bộ đếm", async () => {
  const w = setup();
  w.sqlite.exec(`CREATE TRIGGER tam_chan_dem BEFORE INSERT ON audit_log WHEN NEW.action = 'client_outdated_body' BEGIN SELECT RAISE(ABORT, 'thử hỏng'); END`);
  const r = await w.call("POST", "/api/orders", { as: SALES, body: { customerName: "Khách Thử", customerPhone: "0912345678", services: [{ ...SVC, pickupTime: "07:00" }] } });
  assert.equal(r.status, 201, r.text); // Task 4: 409 client_outdated (không phải 500)
});
