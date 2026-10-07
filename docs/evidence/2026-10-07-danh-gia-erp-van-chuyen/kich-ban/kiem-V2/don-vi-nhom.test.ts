import { test } from "node:test";
import assert from "node:assert/strict";
import { buildLines } from "../../../../../src/shared/order-lines.ts";

test("đơn vị nhóm perNPax dùng như giá theo xe", () => {
  const item = { code: "XE16", name: "Xe riêng 16 chỗ", unit: "per15Pax", prices: { adult: 1_500_000, child: null, senior: null, infant: null }, notes: { child: null, senior: null, infant: null } } as any;
  const r3 = buildLines(item, { adult: 3 });
  const r15 = buildLines(item, { adult: 15 });
  const r16 = buildLines(item, { adult: 16 });
  const r4 = buildLines({ ...item, unit: "perVehicle" }, { adult: 3 });
  console.log(JSON.stringify({ r3, r15: r15.ok && r15.lines[0].quantity, r16: r16.ok && r16.lines[0].quantity, r4 }));
  assert.ok(r3.ok && r3.lines[0].quantity === 1);
  assert.ok(r16.ok && r16.lines[0].quantity === 2);
  assert.equal(r4.ok, false);
});
