import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_GUESTS_PER_SERVICE, availableCodes, buildLines, parseUnit, paxTotal, payingGuests, priceDeviation, type CatalogService } from "./order-lines.ts";

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
  assert.ok(r.lines.every((l) => l.catalogCode === "TD101"), "mọi dòng mang mã dịch vụ nguồn");
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

test("theo nhóm: số khách loại khác adult bị từ chối (không lưu khách mà không tính tiền)", () => {
  for (const other of ["child", "senior", "infant"] as const) {
    const r = buildLines(banana, { adult: 3, [other]: 1 });
    assert.ok(!r.ok, other);
    assert.match((r as { message: string }).message, /tính theo nhóm/);
  }
  assert.ok(buildLines(banana, { adult: 3, child: 0, senior: 0, infant: 0 }).ok); // 0 khách loại khác vẫn hợp lệ
});

test("loại khách hiện bộ đếm", () => {
  assert.deepEqual(availableCodes(tour), ["adult", "child", "senior", "infant"]);
  assert.deepEqual(availableCodes(jetski), ["adult"]);
  assert.deepEqual(availableCodes(banana), ["adult"]);
  assert.deepEqual(availableCodes({ ...tour, unit: "perGroup" }), []);
});

test("đơn giá thực tế: ghi đè từng loại, vẫn giữ giá danh mục và loại khách trên dòng", () => {
  const r = buildLines(tour, { adult: 2, child: 1 }, { adult: 800000 });
  assert.ok(r.ok);
  assert.deepEqual(r.lines.map((l) => [l.pax, l.unitPrice, l.catalogPrice]), [
    ["adult", 800000, 850000],
    ["child", 595000, 595000], // không ghi đè → giá danh mục
  ]);
  const g = buildLines(banana, { adult: 7 }, { adult: 900000 });
  assert.ok(g.ok);
  assert.deepEqual([g.lines[0]!.pax, g.lines[0]!.quantity, g.lines[0]!.unitPrice, g.lines[0]!.catalogPrice], ["adult", 2, 900000, 1000000]);
});

test("trần khách mỗi dịch vụ: từng loại và tổng ≤ MAX_GUESTS_PER_SERVICE", () => {
  assert.equal(MAX_GUESTS_PER_SERVICE, 50);
  assert.ok(buildLines(tour, { adult: 50 }).ok);
  assert.ok(buildLines(tour, { adult: 25, child: 20, senior: 5 }).ok);
  assert.ok(!buildLines(tour, { adult: 51 }).ok);
  const over = buildLines(tour, { adult: 30, child: 21 });
  assert.ok(!over.ok);
  assert.match((over as { message: string }).message, /Tối đa 50 khách/);
  assert.ok(!buildLines(banana, { adult: 51 }).ok);
});

test("đếm khách: tổng và khách tính tiền (trừ em bé)", () => {
  assert.equal(paxTotal({ adult: 2, child: 1, senior: 0, infant: 3 }), 6);
  assert.equal(paxTotal({}), 0);
  assert.equal(payingGuests({ adult: 2, child: 1, senior: 1, infant: 3 }), 4);
  assert.equal(payingGuests({ infant: 2 }), 0);
});

test("lệch giá so với danh mục: dương/âm, null khi khớp hoặc nhập tay", () => {
  assert.equal(priceDeviation({ unitPrice: 800000, catalogPrice: 850000 }), -50000);
  assert.equal(priceDeviation({ unitPrice: 900000, catalogPrice: 850000 }), 50000);
  assert.equal(priceDeviation({ unitPrice: 850000, catalogPrice: 850000 }), null);
  assert.equal(priceDeviation({ unitPrice: 123, catalogPrice: null }), null);
});
