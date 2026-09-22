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

const { summarizeServices } = await loadModule();

type ServiceSummaryRow = typeof import("./repository.ts").ServiceSummaryRow;
const row = (o: Partial<ServiceSummaryRow> & { order_id: string; name: string; sort_order: number }): ServiceSummaryRow => ({
  pax_adult: 0, pax_child: 0, pax_senior: 0, pax_infant: 0, depart_date: null, pickup_time: null, pickup_place: null, ...o,
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
