// ADR-0047 A3 — hàm đọc HẸP cho Vận chuyển `hanhKhachChoChuyen(db, legIds)` (kế hoạch Task A13): mỗi chặng CÒN MỞ của đơn ĐÃ XÁC NHẬN → ĐÚNG các khoá
// { legId, orderId, orderCode, serviceName, direction, pickupDate, pickupTime, noiDon, noiTra, soNguoi, nguoi[{ personKey, rowId, fullName, birthYear }] }
// — danh sách trường được phép dựng TRONG orders (khuôn pool.ts, Hiến chương 4.4). KHÔNG tiền, ghi chú, người lập, SĐT, email. Chữ tự do (nơi, tên dịch
// vụ) che dãy từ 8 chữ số. Số người = số khách HIỆU LỰC của dịch vụ. Hàm không tự kiểm quyền (bài quét nơi gọi ở src/orders-cong-bo.test.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import * as esbuild from "esbuild";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

type Mod = typeof import("./index.ts");
async function loadModule(): Promise<Mod> {
  const built = await esbuild.build({
    entryPoints: [new URL("./index.ts", import.meta.url).pathname],
    bundle: true, format: "esm", platform: "neutral", target: "es2022", write: false, logLevel: "silent",
  });
  return (await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0]!.text).toString("base64")}`)) as Mod;
}
const { hanhKhachChoChuyen } = await loadModule();

const SALES = "11111111-1111-4111-8111-111111111111";
const FIELD = "44444444-4444-4444-8444-444444444444";
const LOC = "a941dd7d-faab-4098-9ab9-1df7fa6dd551";
const inDays = (n: number) => new Date(Date.now() + 7 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);
const D = inDays(3);

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: FIELD, phone: "0900000004", name: "Hướng Dẫn", perms: ["FIELD"] });
  w.sqlite.exec("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('ZA1', 'Tour đảo 0905123456', 'perPax', 500000, 1, '2026-01-01', '2026-01-01')");
  return w;
}
const OUT = { direction: "OUT", pickupDate: "", pickupTime: "06:30", pickupLocationId: null, pickupPlace: "Nhà riêng gọi 0905 123 456", dropoffLocationId: LOC, dropoffPlace: "" };
const RET = { direction: "RETURN", pickupDate: inDays(4), pickupTime: "16:00", pickupLocationId: LOC, pickupPlace: "", dropoffLocationId: null, dropoffPlace: "Khách sạn Dò Tìm" };
async function order(w: any, confirm: boolean, extra: Record<string, unknown> = {}) {
  const r = await w.call("POST", "/api/orders", {
    as: SALES,
    body: {
      customerName: "Khách Dò Tìm Chủ Đơn", customerPhone: "0912345678", customerEmail: "do.tim@example.com", customerNote: "Ghi chú kín 0987654321", paymentNote: "Tiền mặt",
      services: [{ kind: "catalog", catalogCode: "ZA1", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 500000 }, departDate: D, note: "Ghi chú dịch vụ", legs: [OUT, RET] }],
      passengers: [{ fullName: "Khách Dò Tìm Một", birthYear: 1911, paxCode: "adult" }, { fullName: "Khách Dò Tìm Hai", birthYear: 1922, paxCode: null }],
      ...extra,
    },
  });
  assert.equal(r.status, 201, r.text);
  if (confirm) assert.equal((await w.call("POST", `/api/orders/${r.json.order.id}/status`, { as: SALES, body: { status: "confirmed" } })).status, 200);
  return (await w.call("GET", `/api/orders/${r.json.order.id}`, { as: SALES })).json.order;
}

test("hanhKhachChoChuyen: ĐÚNG các khoá (phần tử + từng người); nơi/tên dịch vụ che dãy số; số người = số khách hiệu lực; không tiền/ghi chú/SĐT/email/người lập", async () => {
  const w = setup();
  const o = await order(w, true, { handlerStaffId: FIELD });
  const legIds = o.services[0].legs.map((l: any) => l.id);
  const got = await hanhKhachChoChuyen(w.env.DB, legIds);
  assert.equal(got.length, 2);
  for (const g of got) {
    assert.deepEqual(Object.keys(g).sort(), ["choToiThieu", "direction", "legId", "nguoi", "noiDon", "noiTra", "orderCode", "orderId", "pickupDate", "pickupTime", "serviceName", "soNguoi", "xeRieng"]);
    for (const p of g.nguoi) assert.deepEqual(Object.keys(p).sort(), ["birthYear", "fullName", "personKey", "rowId"]);
    assert.equal(g.orderId, o.id);
    assert.equal(g.orderCode, o.orderCode);
    assert.equal(g.soNguoi, 2);
    assert.deepEqual(g.nguoi.map((p: any) => [p.fullName, p.birthYear]).sort(), [["Khách Dò Tìm Hai", 1922], ["Khách Dò Tìm Một", 1911]]);
    assert.equal(g.serviceName, "Tour đảo ••••••••••");
  }
  const out = got.find((g: any) => g.direction === "OUT")!;
  assert.deepEqual([out.pickupDate, out.pickupTime, out.noiDon, out.noiTra], [D, "06:30", "Nhà riêng gọi •••• ••• •••", "Bến tàu du lịch Nha Trang"]);
  const text = JSON.stringify(got);
  for (const leak of ["0912345678", "do.tim@example.com", "Ghi chú", "Tiền mặt", "300000", "500000", "Chủ Đơn", "An", SALES]) assert.ok(!text.includes(leak), `lộ "${leak}"`);
  // số khách HIỆU LỰC (dòng điều chỉnh gần nhất), không phải số đã lưu
  const edit = await w.call("POST", `/api/orders/${o.id}/handler-money-edit`, {
    as: FIELD, body: { reason: "Thêm người", services: [{ id: o.services[0].id, pax: { adult: 3, child: 0, senior: 0, infant: 0 } }] },
  });
  assert.equal(edit.status, 200, edit.text);
  assert.ok((await hanhKhachChoChuyen(w.env.DB, legIds)).every((g: any) => g.soNguoi === 3));
});

test("hanhKhachChoChuyen: chặng ĐÃ ĐÓNG / đơn NHÁP / đơn HUỶ / id lạ → không có mặt; người đã huỷ không có trong nguoi; rỗng → []", async () => {
  const w = setup();
  const o = await order(w, true);
  const [a, b] = o.services[0].legs;
  const closed = await w.call("POST", `/api/orders/${o.id}/legs/${b.id}/close`, { as: SALES, body: { expectedUpdatedAt: b.updatedAt, reasonCode: "WRONG_ENTRY" } });
  assert.equal(closed.status, 200, closed.text);
  const pax = (await w.call("GET", `/api/orders/${o.id}/passengers`, { as: SALES })).json;
  const huy = await w.call("POST", `/api/orders/${o.id}/passengers`, { as: SALES, body: { expectedUpdatedAt: pax.orderUpdatedAt, them: [], sua: [], huy: [pax.passengers[0].personKey] } });
  assert.equal(huy.status, 200, huy.text);
  const draft = await order(w, false);
  const cancelled = await order(w, true);
  assert.equal((await w.call("POST", `/api/orders/${cancelled.id}/status`, { as: SALES, body: { status: "cancelled", lyDo: "KHACH_DOI_Y" } })).status, 200);
  const got = await hanhKhachChoChuyen(w.env.DB, [a.id, b.id, draft.services[0].legs[0].id, cancelled.services[0].legs[0].id, "00000000-0000-4000-8000-000000000000"]);
  assert.deepEqual(got.map((g: any) => g.legId), [a.id]);
  assert.equal(got[0]!.nguoi.length, 1);
  assert.deepEqual(await hanhKhachChoChuyen(w.env.DB, []), []);
});
