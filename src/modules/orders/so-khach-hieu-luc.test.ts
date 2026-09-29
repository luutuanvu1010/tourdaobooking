// ADR-0047 A3 — hàm công bố `soKhachHieuLuc(db, serviceIds)`: số khách HIỆN HÀNH của từng dịch vụ = số đã lưu, phủ dòng điều chỉnh GẦN NHẤT qua
// ĐÚNG `parseAdjustmentAfter` (một nguồn — bài học Đợt E). Chạy CẢ ứng dụng trên SQLite thật (tests/audit/harness.mjs) để lập/xác nhận đơn qua API;
// hàm công bố gói riêng bằng esbuild (mã nguồn import module khác bằng thư mục — Node không tự giải được, như order-ref.test.ts).
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
const { soKhachHieuLuc } = await loadModule();

const SALES = "11111111-1111-4111-8111-111111111111";
const inDays = (n: number) => new Date(Date.now() + 7 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  w.sqlite.exec("INSERT INTO catalog_item (code, name, unit, price_adult, price_child, in_sheet, first_seen_at, updated_at) VALUES ('ZA1', 'Tour đảo', 'perPax', 500000, 300000, 1, '2026-01-01', '2026-01-01')");
  w.sqlite.exec("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('ZB2', 'Vé cáp treo', 'perPax', 200000, 1, '2026-01-01', '2026-01-01')");
  return w;
}

/** Lập + xác nhận một đơn hai dịch vụ (ZA1: 2 người lớn 1 trẻ em; ZB2: 3 người lớn). Trả id đơn và id hai dịch vụ theo thứ tự. */
async function confirmedOrder(w: any): Promise<{ orderId: string; a: string; b: string }> {
  const departDate = inDays(3);
  const r = await w.call("POST", "/api/orders", {
    as: SALES,
    body: {
      customerName: "Khách Thử", customerPhone: "0912345678",
      services: [
        { kind: "catalog", catalogCode: "ZA1", pax: { adult: 2, child: 1, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 500000, child: 300000 }, departDate },
        { kind: "catalog", catalogCode: "ZB2", pax: { adult: 3, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 200000 }, departDate },
      ],
    },
  });
  assert.equal(r.status, 201, r.text);
  const orderId = r.json.order.id as string;
  const c = await w.call("POST", `/api/orders/${orderId}/status`, { as: SALES, body: { status: "confirmed" } });
  assert.equal(c.status, 200, c.text);
  return { orderId, a: r.json.order.services[0].id, b: r.json.order.services[1].id };
}

function addAdjustment(w: any, orderId: string, seq: number, afterJson: string) {
  w.sqlite
    .prepare("INSERT INTO order_money_adjustment (id, order_id, seq, before_json, after_json, subtotal_before, subtotal_after) VALUES (?, ?, ?, '[]', ?, 0, 0)")
    .run(`adj-${orderId}-${seq}`, orderId, seq, afterJson);
}

const pax = (adult: number, child = 0, senior = 0, infant = 0) => ({ adult, child, senior, infant });

test("soKhachHieuLuc: đơn có HAI dòng điều chỉnh → số của dòng GẦN NHẤT (seq lớn nhất), không phải dòng đầu, không phải số đã lưu", async () => {
  const w = setup();
  const { orderId, a, b } = await confirmedOrder(w);
  addAdjustment(w, orderId, 1, JSON.stringify([{ serviceId: a, pax: pax(5) }, { serviceId: b, pax: pax(1) }]));
  addAdjustment(w, orderId, 2, JSON.stringify([{ serviceId: a, pax: pax(4, 2) }, { serviceId: b, pax: pax(6) }]));
  const got = await soKhachHieuLuc(w.env.DB, [a, b]);
  assert.deepEqual(got.get(a), pax(4, 2));
  assert.deepEqual(got.get(b), pax(6));
});

test("soKhachHieuLuc: `after_json` hỏng (không phải JSON) → số ĐÃ LƯU (parseAdjustmentAfter rơi về rỗng), không ném lỗi", async () => {
  const w = setup();
  const { orderId, a, b } = await confirmedOrder(w);
  addAdjustment(w, orderId, 1, "{không phải json");
  const got = await soKhachHieuLuc(w.env.DB, [a, b]);
  assert.deepEqual(got.get(a), pax(2, 1));
  assert.deepEqual(got.get(b), pax(3));
});

test("soKhachHieuLuc: dịch vụ KHÔNG có trong dòng điều chỉnh (và đơn không có điều chỉnh nào) → số đã lưu", async () => {
  const w = setup();
  const one = await confirmedOrder(w);
  const two = await confirmedOrder(w);
  addAdjustment(w, one.orderId, 1, JSON.stringify([{ serviceId: one.a, pax: pax(7) }])); // chỉ nhắc dịch vụ a
  const got = await soKhachHieuLuc(w.env.DB, [one.a, one.b, two.a, two.b]);
  assert.deepEqual(got.get(one.a), pax(7));
  assert.deepEqual(got.get(one.b), pax(3), "dịch vụ không có trong after_json giữ số đã lưu");
  assert.deepEqual(got.get(two.a), pax(2, 1), "đơn không có dòng điều chỉnh nào giữ số đã lưu");
  assert.deepEqual(got.get(two.b), pax(3));
});

test("soKhachHieuLuc: id lạ / danh sách rỗng → không có trong Map (không ném lỗi); dòng điều chỉnh của đơn KHÁC không lẫn sang", async () => {
  const w = setup();
  const one = await confirmedOrder(w);
  const two = await confirmedOrder(w);
  addAdjustment(w, two.orderId, 1, JSON.stringify([{ serviceId: one.a, pax: pax(9) }])); // dòng của đơn khác nhắc id dịch vụ của đơn này
  const got = await soKhachHieuLuc(w.env.DB, [one.a, "00000000-0000-4000-8000-000000000000"]);
  assert.equal(got.has("00000000-0000-4000-8000-000000000000"), false);
  assert.deepEqual(got.get(one.a), pax(2, 1), "chỉ dòng điều chỉnh của CHÍNH đơn chứa dịch vụ được áp");
  assert.equal((await soKhachHieuLuc(w.env.DB, [])).size, 0);
});
