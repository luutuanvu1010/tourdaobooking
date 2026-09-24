import { test } from "node:test";
import assert from "node:assert/strict";
import * as esbuild from "esbuild";

const HERE = new URL("./", import.meta.url).pathname;

type Mod = typeof import("./repository.ts");
async function loadModule(): Promise<Mod> {
  const built = await esbuild.build({
    stdin: { contents: 'export * from "./repository";', resolveDir: HERE, loader: "ts" },
    bundle: true,
    format: "esm",
    platform: "neutral",
    target: "es2022",
    write: false,
  });
  const code = Buffer.from(built.outputFiles[0]!.text).toString("base64");
  return (await import(`data:text/javascript;base64,${code}`)) as Mod;
}

const { summarizeServices, applyAdjustedPax } = await loadModule();

type ServiceSummaryRow = typeof import("./repository.ts").ServiceSummaryRow;
const row = (o: Partial<ServiceSummaryRow> & { order_id: string; name: string; sort_order: number }): ServiceSummaryRow => ({
  id: "", pax_adult: 0, pax_child: 0, pax_senior: 0, pax_infant: 0, depart_date: null, pickup_time: null, pickup_place: null, ...o,
});

test("summarizeServices: dịch vụ ĐẦU (sort_order nhỏ nhất) quyết định trip; pax cộng dồn mọi dịch vụ của đơn; nhiều đơn không lẫn nhau", () => {
  const rows: ServiceSummaryRow[] = [
    row({ order_id: "o1", name: "Tour Hòn Mun", sort_order: 0, pax_adult: 2, pax_child: 1, depart_date: "2026-10-01", pickup_time: "07:00", pickup_place: "Cảng Cầu Đá" }),
    row({ order_id: "o1", name: "Áo phao", sort_order: 1, depart_date: "2026-10-02", pickup_time: "08:00", pickup_place: "Khách sạn" }),
    row({ order_id: "o2", name: "Tour 4 đảo", sort_order: 0, pax_adult: 1, pax_senior: 1 }),
  ];
  const out = summarizeServices(rows);
  assert.deepEqual(out.get("o1"), {
    serviceNames: ["Tour Hòn Mun", "Áo phao"],
    pax: { adult: 2, child: 1, senior: 0, infant: 0 },
    trip: { departDate: "2026-10-01", pickupTime: "07:00", pickupPlace: "Cảng Cầu Đá" },
  });
  assert.deepEqual(out.get("o2"), {
    serviceNames: ["Tour 4 đảo"],
    pax: { adult: 1, child: 0, senior: 1, infant: 0 },
    trip: { departDate: null, pickupTime: null, pickupPlace: null },
  });
  assert.equal(out.has("o3"), false, "đơn không có trong rows thì không có trong Map");
});

test("summarizeServices([]) → Map rỗng", () => {
  assert.equal(summarizeServices([]).size, 0);
});

// ---------------------------------------------------------------------------------------------------------------------
// applyAdjustedPax (Đợt E: sau khi FIELD sửa số khách hậu xác nhận, /orders và Trang chủ hiện đúng tiền nhưng vẫn hiện số khách CŨ — gốc lỗi là
// toSummaryDtos() lấy pax từ order_service đã đóng băng thay vì từ after_json của dòng điều chỉnh gần nhất, như trang chi tiết đơn đã làm đúng).
// ---------------------------------------------------------------------------------------------------------------------
test("applyAdjustedPax: dịch vụ có mặt trong điều chỉnh gần nhất của đơn → pax_* đổi thành số MỚI, các trường khác (tên, ngày…) giữ nguyên", () => {
  const rows: ServiceSummaryRow[] = [row({ order_id: "o1", id: "sv1", name: "Tour Hòn Mun", sort_order: 0, pax_adult: 2, pax_child: 1, depart_date: "2026-10-01" })];
  const afterByOrder = new Map([["o1", [{ serviceId: "sv1", pax: { adult: 5, child: 0, senior: 0, infant: 0 } }]]]);
  const out = applyAdjustedPax(rows, afterByOrder);
  assert.deepEqual(out, [{ ...rows[0], pax_adult: 5, pax_child: 0, pax_senior: 0, pax_infant: 0 }]);
});

test("applyAdjustedPax: đơn KHÔNG có trong afterByOrder (chưa có điều chỉnh nào) → giữ NGUYÊN số khách gốc", () => {
  const rows: ServiceSummaryRow[] = [row({ order_id: "o2", id: "sv2", name: "Tour 4 đảo", sort_order: 0, pax_adult: 1, pax_senior: 1 })];
  const out = applyAdjustedPax(rows, new Map());
  assert.deepEqual(out, rows);
});

test("applyAdjustedPax: dịch vụ KHÔNG có mặt trong after (nhập tay, hoặc không thuộc danh mục) → giữ nguyên dòng đó dù đơn có điều chỉnh dịch vụ khác", () => {
  const rows: ServiceSummaryRow[] = [
    row({ order_id: "o3", id: "sv-catalog", name: "Tour", sort_order: 0, pax_adult: 2 }),
    row({ order_id: "o3", id: "sv-manual", name: "Áo phao (nhập tay)", sort_order: 1, pax_adult: 1 }),
  ];
  const afterByOrder = new Map([["o3", [{ serviceId: "sv-catalog", pax: { adult: 4, child: 0, senior: 0, infant: 0 } }]]]);
  const out = applyAdjustedPax(rows, afterByOrder);
  assert.equal(out[0]!.pax_adult, 4, "dịch vụ có trong after → số mới");
  assert.equal(out[1]!.pax_adult, 1, "dịch vụ nhập tay không có trong after → giữ số gốc");
});

test("summarizeServices(applyAdjustedPax(...)): số khách TÓM TẮT của đơn CÓ điều chỉnh là số MỚI; đơn KHÔNG có điều chỉnh là số GỐC — đúng hành vi phải sửa (Đợt E)", () => {
  const rows: ServiceSummaryRow[] = [
    row({ order_id: "o-adjusted", id: "sv-a", name: "Tour Hòn Mun", sort_order: 0, pax_adult: 2 }),
    row({ order_id: "o-plain", id: "sv-b", name: "Tour 4 đảo", sort_order: 0, pax_adult: 2 }),
  ];
  const afterByOrder = new Map([["o-adjusted", [{ serviceId: "sv-a", pax: { adult: 5, child: 0, senior: 0, infant: 0 } }]]]);
  const out = summarizeServices(applyAdjustedPax(rows, afterByOrder));
  assert.deepEqual(out.get("o-adjusted")!.pax, { adult: 5, child: 0, senior: 0, infant: 0 }, "đơn có điều chỉnh → số khách tóm tắt là số MỚI");
  assert.deepEqual(out.get("o-plain")!.pax, { adult: 2, child: 0, senior: 0, infant: 0 }, "đơn không có điều chỉnh → số khách tóm tắt là số GỐC");
});
