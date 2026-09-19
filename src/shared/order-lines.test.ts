import { test } from "node:test";
import assert from "node:assert/strict";
import { availableCodes, buildLines, parseUnit, type CatalogService } from "./order-lines.ts";

const tour: CatalogService = {
  code: "TD101",
  name: "Tour 3 đảo Hòn Mun",
  unit: "perPax",
  prices: { adult: 850000, child: 595000, senior: 850000, infant: 0 },
  notes: { child: "Trẻ em cao từ 1 m đến 1,4 mét", senior: "Người cao tuổi >= 60 tuổi", infant: "Luôn miễn phí, chiều cao dưới 1 mét" },
};
const banana: CatalogService = {
  code: "TTB03", name: "Phao chuối", unit: "per5Pax",
  prices: { adult: 1000000, child: null, senior: null, infant: null }, notes: { child: null, senior: null, infant: null },
};
const jetski: CatalogService = { ...banana, code: "TTB06", name: "Motor nước", unit: "perPax", prices: { adult: 800000, child: null, senior: null, infant: null } };

test("nhận diện đơn vị", () => {
  assert.deepEqual(parseUnit("perPax"), { kind: "perPax" });
  assert.deepEqual(parseUnit(" per5Pax "), { kind: "group", size: 5 });
  assert.deepEqual(parseUnit("per10Pax"), { kind: "group", size: 10 });
  assert.equal(parseUnit("per1Pax").kind, "unknown");
  assert.equal(parseUnit("perGroup").kind, "unknown");
});

test("theo người: mỗi loại khách có số lượng là một dòng, đúng thứ tự adult/child/senior/infant", () => {
  const r = buildLines(tour, { infant: 1, adult: 2, child: 1 });
  assert.ok(r.ok);
  assert.deepEqual(r.lines.map((l) => [l.description, l.quantity, l.unitPrice]), [
    ["Tour 3 đảo Hòn Mun — Người lớn", 2, 850000],
    ["Tour 3 đảo Hòn Mun — Trẻ em", 1, 595000],
    ["Tour 3 đảo Hòn Mun — Em bé", 1, 0], // em bé miễn phí vẫn thành một dòng giá 0
  ]);
  assert.equal(r.lines[1]!.detail, "Trẻ em cao từ 1 m đến 1,4 mét");
  assert.equal(r.lines[0]!.detail, "");
  assert.equal(buildLines(tour, { adult: 1, child: 1, senior: 1, infant: 1 }).ok && (buildLines(tour, { adult: 1, child: 1, senior: 1, infant: 1 }) as { lines: unknown[] }).lines.length, 4);
});

test("theo nhóm: nhập số khách, số lượng = ceil(khách / cỡ nhóm) lượt", () => {
  for (const [guests, trips] of [[1, 1], [5, 1], [6, 2], [10, 2], [11, 3]] as const) {
    const r = buildLines(banana, { adult: guests });
    assert.ok(r.ok);
    assert.equal(r.lines.length, 1);
    assert.equal(r.lines[0]!.quantity, trips, `${guests} khách`);
    assert.equal(r.lines[0]!.unitPrice, 1000000);
  }
  const r = buildLines(banana, { adult: 7 });
  assert.ok(r.ok);
  assert.match(r.lines[0]!.detail, /7 khách/);
  assert.match(r.lines[0]!.detail, /5 khách/);
});

test("báo lỗi rõ ràng", () => {
  assert.ok(!buildLines(tour, {}).ok);
  assert.ok(!buildLines(tour, { adult: 0 }).ok);
  assert.match((buildLines(jetski, { child: 1 }) as { message: string }).message, /không có giá cho trẻ em/);
  assert.ok(!buildLines(tour, { adult: 1.5 }).ok);
  assert.ok(!buildLines(tour, { adult: -1 }).ok);
  assert.ok(!buildLines(banana, {}).ok);
  assert.match((buildLines({ ...tour, unit: "perGroup" }, { adult: 1 }) as { message: string }).message, /chưa hỗ trợ/);
});

test("loại khách hiện bộ đếm", () => {
  assert.deepEqual(availableCodes(tour), ["adult", "child", "senior", "infant"]);
  assert.deepEqual(availableCodes(jetski), ["adult"]);
  assert.deepEqual(availableCodes(banana), ["adult"]);
  assert.deepEqual(availableCodes({ ...tour, unit: "perGroup" }), []);
});
