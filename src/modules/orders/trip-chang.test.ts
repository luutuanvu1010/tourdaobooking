// ADR-0047 Ruling R2c, R3, R4e (kế hoạch Task A10) — `PUT /api/orders/:id/trip` (bảng "Sửa thông tin chuyến" CŨ, máy chưa tải bản mới): khoá
// `pickupTime`/`pickupPlace` CÓ MẶT (kể cả rỗng) → trộn vào chặng chiều đi đầu; VẮNG → không đụng chặng; cả hai rỗng → ĐÓNG chiều đi (lý do NOT_NEEDED,
// cả đơn nháp lẫn đã xác nhận); đổi ngày đi → mọi chặng dời cùng số ngày; hai cột cũ ghi kép = dẫn xuất. Chạy CẢ ứng dụng trên SQLite thật.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
import { phanDoiCuaTin } from "../../shared/tin-doi-don.ts";

const SALES = "11111111-1111-4111-8111-111111111111";
const LOC = "a941dd7d-faab-4098-9ab9-1df7fa6dd551";
const inDays = (n: number) => new Date(Date.now() + 7 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);
const D = inDays(3);
const NO_TRIP = { departDate: D, departTime: "", checkinDate: "", checkinTime: "", checkinPlace: "", note: "" };

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  w.sqlite.exec("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('ZA1', 'Tour đảo', 'perPax', 500000, 1, '2026-01-01', '2026-01-01')");
  return w;
}
const OUT = { direction: "OUT", pickupDate: inDays(2), pickupTime: "06:30", pickupLocationId: null, pickupPlace: "Khách sạn Dò Tìm", dropoffLocationId: LOC, dropoffPlace: "" };
const RET = { direction: "RETURN", pickupDate: inDays(4), pickupTime: "16:00", pickupLocationId: LOC, pickupPlace: "", dropoffLocationId: null, dropoffPlace: "Khách sạn Dò Tìm" };

async function order(w: any, confirm: boolean) {
  const r = await w.call("POST", "/api/orders", {
    as: SALES,
    body: { customerName: "Khách Thử", customerPhone: "0912345678", services: [{ kind: "catalog", catalogCode: "ZA1", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 500000 }, departDate: D, legs: [OUT, RET] }] },
  });
  assert.equal(r.status, 201, r.text);
  if (confirm) assert.equal((await w.call("POST", `/api/orders/${r.json.order.id}/status`, { as: SALES, body: { status: "confirmed" } })).status, 200);
  return (await w.call("GET", `/api/orders/${r.json.order.id}`, { as: SALES })).json.order;
}
const legs = (w: any, id: string) =>
  w.q("SELECT id, direction, pickup_date, pickup_time, pickup_location_id, pickup_place, dropoff_location_id, dropoff_place, closed_at, close_reason_code FROM ord_transfer_leg WHERE order_id = ? ORDER BY direction, id", id).map((r: any) => ({ ...r }));
const mirror = (w: any, id: string) => w.q("SELECT pickup_time, pickup_place FROM order_service WHERE order_id = ?", id).map((r: any) => ({ ...r }));
const trip = (w: any, o: any, svc: Record<string, unknown>) =>
  w.call("PUT", `/api/orders/${o.id}/trip`, { as: SALES, body: { expectedUpdatedAt: o.updatedAt, services: [{ id: o.services[0].id, ...NO_TRIP, ...svc }] } });

for (const confirmed of [false, true]) {
  const label = confirmed ? "đơn ĐÃ XÁC NHẬN" : "đơn NHÁP";

  test(`${label}: khoá CÓ MẶT → giờ/nơi trộn vào chiều đi đầu; chiều về, nơi trả còn nguyên; ghi kép; nhật ký trước→sau`, async () => {
    const w = setup();
    const o = await order(w, confirmed);
    const before = legs(w, o.id);
    const r = await trip(w, o, { pickupTime: "07:00", pickupPlace: "Khách sạn Dò Tìm" });
    assert.equal(r.status, 200, r.text);
    const after = legs(w, o.id);
    assert.equal(after.find((l: any) => l.direction === "OUT").pickup_time, "07:00");
    assert.equal(after.find((l: any) => l.direction === "OUT").dropoff_location_id, LOC);
    assert.deepEqual(after.find((l: any) => l.direction === "RETURN"), before.find((l: any) => l.direction === "RETURN"));
    assert.deepEqual(mirror(w, o.id), [{ pickup_time: "07:00", pickup_place: "Khách sạn Dò Tìm" }]);
    assert.deepEqual([r.json.order.services[0].pickupTime, r.json.order.services[0].pickupPlace], ["07:00", "Khách sạn Dò Tìm"]);
    const log = w.q("SELECT detail FROM audit_log WHERE order_id = ? AND action = 'trip_updated'", o.id)[0].detail;
    assert.match(log, /giờ đón 06:30 → 07:00/);
  });

  test(`${label}: khoá VẮNG → chặng không đổi (chỉ sửa trường khác)`, async () => {
    const w = setup();
    const o = await order(w, confirmed);
    const before = legs(w, o.id);
    const r = await trip(w, o, { note: "Ghi chú mới" });
    assert.equal(r.status, 200, r.text);
    assert.deepEqual(legs(w, o.id), before);
  });

  test(`${label}: pickupTime "" + pickupPlace "" → chiều đi ĐÓNG (NOT_NEEDED), dòng còn trong CSDL; chiều về còn; cột cũ về trống`, async () => {
    const w = setup();
    const o = await order(w, confirmed);
    const r = await trip(w, o, { pickupTime: "", pickupPlace: "" });
    assert.equal(r.status, 200, r.text);
    const out = legs(w, o.id).find((l: any) => l.direction === "OUT");
    assert.ok(out.closed_at, "đóng dòng, không xoá");
    assert.equal(out.close_reason_code, "NOT_NEEDED");
    assert.deepEqual(r.json.order.services[0].legs.map((l: any) => l.direction), ["RETURN"]);
    assert.deepEqual(mirror(w, o.id), [{ pickup_time: null, pickup_place: null }]);
    if (!confirmed) {
      // lần lưu nháp sau (thân cũ, giờ/nơi trống) không chèn lại chặng đã đóng
      const cur = (await w.call("GET", `/api/orders/${o.id}`, { as: SALES })).json.order;
      const put = await w.call("PUT", `/api/orders/${o.id}`, {
        as: SALES,
        body: { customerName: "Khách Thử", customerPhone: "0912345678", expectedUpdatedAt: cur.updatedAt, services: [{ id: cur.services[0].id, kind: "catalog", catalogCode: "ZA1", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 500000 }, departDate: D, pickupTime: "", pickupPlace: "" }] },
      });
      assert.equal(put.status, 200, put.text);
      assert.deepEqual(legs(w, o.id).filter((l: any) => l.closed_at === null).map((l: any) => l.direction), ["RETURN"]);
    }
  });
}

test("đơn đã xác nhận: đổi NGÀY ĐI → mọi chặng mở dời cùng số ngày ('đón tối hôm trước' vẫn là hôm trước — R4e); chặng đã đóng không đổi", async () => {
  const w = setup();
  const o = await order(w, true);
  const r = await trip(w, o, { departDate: inDays(5) });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(legs(w, o.id).map((l: any) => [l.direction, l.pickup_date]), [["OUT", inDays(4)], ["RETURN", inDays(6)]]);
});

test("đơn đã xác nhận: chưa có chiều đi, gửi giờ + nơi → TẠO chiều đi (ngày đón = ngày đi)", async () => {
  const w = setup();
  const r0 = await w.call("POST", "/api/orders", {
    as: SALES,
    body: { customerName: "Khách Thử", customerPhone: "0912345678", services: [{ kind: "catalog", catalogCode: "ZA1", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 500000 }, departDate: D, legs: [RET] }] },
  });
  assert.equal((await w.call("POST", `/api/orders/${r0.json.order.id}/status`, { as: SALES, body: { status: "confirmed" } })).status, 200);
  const o = (await w.call("GET", `/api/orders/${r0.json.order.id}`, { as: SALES })).json.order;
  const r = await trip(w, o, { pickupTime: "05:45", pickupPlace: "Nhà riêng" });
  assert.equal(r.status, 200, r.text);
  const out = legs(w, o.id).find((l: any) => l.direction === "OUT");
  assert.deepEqual([out.pickup_date, out.pickup_time, out.pickup_place], [D, "05:45", "Nhà riêng"]);
});

// ---- G17 (sổ thi công 2026-10-08 mục G17; kế hoạch docs/superpowers/plans/2026-10-09-g17-bao-tai-xe-doi-ngay.md): `PUT /trip` đổi ngày / giờ đón của chặng ⇒
// MỖI chặng đổi có MỘT dòng `order_leg_updated` (target = id chặng, cùng mốc với `trip_updated`, cùng lô) theo khuôn chặng `moTaChang` mà hàm đọc tin
// `phanDoiCuaTin` nhận ra (`gioHen` cho MQ-07 — ADR-0052 D6.2). Không ghi giá trị nơi (luật cũ của PUT /trip: nhật ký không chứa địa điểm).
const nhatKyChang = (w: any, id: string) =>
  w.q("SELECT target_type, target_id, detail, created_at FROM audit_log WHERE order_id = ? AND action = 'order_leg_updated' ORDER BY rowid", id).map((r: any) => ({ ...r }));
const mocTrip = (w: any, id: string) => w.q("SELECT created_at FROM audit_log WHERE order_id = ? AND action = 'trip_updated'", id).map((r: any) => r.created_at);

test("G17: đơn đã xác nhận dời NGÀY ĐI → mỗi chặng dời có một dòng order_leg_updated (target = chặng, cùng mốc trip_updated), khuôn chặng, gioHen = true (chỉ đổi ngày)", async () => {
  const w = setup();
  const o = await order(w, true);
  const r = await trip(w, o, { departDate: inDays(5) });
  assert.equal(r.status, 200, r.text);
  const out = o.services[0].legs.find((l: any) => l.direction === "OUT");
  const ret = o.services[0].legs.find((l: any) => l.direction === "RETURN");
  const rows = nhatKyChang(w, o.id);
  const moc = mocTrip(w, o.id);
  assert.equal(moc.length, 1);
  const theoChang = (a: any, b: any) => (a[1] < b[1] ? -1 : 1);
  assert.deepEqual(
    rows.map((x: any) => [x.target_type, x.target_id, x.detail, x.created_at]).sort(theoChang),
    [
      ["order", out.id, `Chiều đi · Tour đảo: ngày đón ${inDays(2)} → ${inDays(4)}`, moc[0]],
      ["order", ret.id, `Chiều về · Tour đảo: ngày đón ${inDays(4)} → ${inDays(6)}`, moc[0]],
    ].sort(theoChang),
  );
  for (const x of rows) {
    const p = phanDoiCuaTin("order_leg_updated", x.detail);
    assert.equal(p?.gioHen, true, x.detail);
    assert.equal(p?.loai, "cu-the", x.detail);
  }
});

test("G17: thân cũ đổi giờ + nơi đón → dòng chặng chỉ có giờ đón (KHÔNG giá trị nơi); chỉ đổi nơi / ghi chú → không thêm dòng chặng", async () => {
  const w = setup();
  let o = await order(w, true);
  let r = await trip(w, o, { pickupTime: "07:00", pickupPlace: "Nhà nghỉ Mới 0905123456" });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(nhatKyChang(w, o.id).map((x: any) => x.detail), ["Chiều đi · Tour đảo: giờ đón 06:30 → 07:00"]);
  o = r.json.order;
  r = await trip(w, o, { pickupTime: "07:00", pickupPlace: "Nhà nghỉ Khác" });
  assert.equal(r.status, 200, r.text);
  o = r.json.order;
  r = await trip(w, o, { note: "Chỉ ghi chú" });
  assert.equal(r.status, 200, r.text);
  assert.equal(nhatKyChang(w, o.id).length, 1, "chỉ đổi nơi / ghi chú → không thêm dòng chặng");
  const tatCa = JSON.stringify(w.q("SELECT detail FROM audit_log WHERE order_id = ?", o.id));
  for (const x of ["Nhà nghỉ", "0905123456"]) assert.ok(!tatCa.includes(x), `nhật ký chứa "${x}"`);
});
