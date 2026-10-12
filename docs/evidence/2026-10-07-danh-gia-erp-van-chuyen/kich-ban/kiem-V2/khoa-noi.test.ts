import { test } from "node:test";
import assert from "node:assert/strict";
import { khoaNoi } from "../../../../../src/shared/khoa-noi.ts";

test("khoá nơi: các cách viết cùng một khách sạn", async () => {
  const a = await khoaNoi({ locationId: null, placeText: "Khách sạn Havana" });
  const b = await khoaNoi({ locationId: null, placeText: "  khách   sạn HAVANA " });
  const c = await khoaNoi({ locationId: null, placeText: "KS Havana" });
  const d = await khoaNoi({ locationId: null, placeText: "Khach san Havana" });
  const e = await khoaNoi({ locationId: "loc-havana", placeText: null });
  const f = await khoaNoi({ locationId: null, placeText: "Khách sạn Havana, 38 Trần Phú" });
  console.log(JSON.stringify({ a_b: a === b, a_c: a === c, a_d: a === d, a_e: a === e, a_f: a === f, e }));
  assert.equal(a, b);
  assert.notEqual(a, c);
  assert.notEqual(a, d);
  assert.notEqual(a, e);
  assert.notEqual(a, f);
});
