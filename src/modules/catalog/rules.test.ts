import { test } from "node:test";
import assert from "node:assert/strict";
import { acknowledge, applyOverride, patchOverride, planSync, summarizePlan, syncGuard, type CatalogRecord } from "./rules.ts";
import type { CatalogInput } from "./sheet.ts";

const P = (adult: number, child: number | null = null) => ({ adult, child, senior: null, infant: null });
const N = { child: null, senior: null, infant: null };
const input = (code: string, adult: number, extra: Partial<CatalogInput> = {}): CatalogInput => ({ row: 2, code, name: `Tour ${code}`, unit: "perPax", prices: P(adult), notes: N, ...extra });
const rec = (code: string, adult: number, inSheet = true): CatalogRecord => ({ code, name: `Tour ${code}`, unit: "perPax", prices: P(adult), notes: N, inSheet });
const map = (...r: CatalogRecord[]) => new Map(r.map((x) => [x.code, x]));

test("kế hoạch đồng bộ: thêm / đổi / ẩn / không đổi", () => {
  const plan = planSync(map(rec("A", 100), rec("B", 200), rec("C", 300)), [input("A", 100), input("B", 250), input("D", 400)]);
  assert.deepEqual(plan.added.map((x) => x.code), ["D"]);
  assert.deepEqual(plan.changed.map((x) => x.input.code), ["B"]);
  assert.match(plan.changed[0]!.changes[0]!, /giá người lớn 200 ₫ → 250 ₫/);
  assert.deepEqual(plan.missing, ["C"]);
  assert.equal(plan.unchanged, 1);
});

test("dịch vụ quay lại Sheet được đánh dấu; dịch vụ đã ẩn không bị ẩn lại", () => {
  const plan = planSync(map(rec("A", 100, false), rec("B", 200, false)), [input("A", 100)]);
  assert.deepEqual(plan.changed.map((x) => x.changes), [["quay lại Sheet"]]);
  assert.deepEqual(plan.missing, []); // B đã không còn trong Sheet từ trước
});

test("chỉ đổi số dòng trong Sheet thì không tính là thay đổi", () => {
  const plan = planSync(map(rec("A", 100)), [input("A", 100, { row: 99 })]);
  assert.equal(plan.changed.length, 0);
  assert.equal(plan.unchanged, 1);
});

test("chốt chặn Sheet hỏng", () => {
  const all = map(rec("A", 1), rec("B", 1), rec("C", 1), rec("D", 1), rec("E", 1));
  assert.match(syncGuard(5, planSync(all, []), 0)!, /không còn dịch vụ hợp lệ/);
  assert.match(syncGuard(5, planSync(all, [input("A", 1), input("B", 1)]), 2)!, /ẩn 3\/5/);
  assert.equal(syncGuard(5, planSync(all, [input("A", 1), input("B", 1), input("C", 1), input("D", 1)]), 4), null); // ẩn 1/5: bình thường
  assert.equal(syncGuard(2, planSync(map(rec("A", 1), rec("B", 1)), [input("A", 1)]), 1), null); // danh mục nhỏ: không chặn
  assert.equal(syncGuard(0, planSync(new Map(), []), 0), null); // chưa có gì → lần đầu
});

test("tóm tắt cho nhật ký gọn, không quá dài", () => {
  const many = map(...Array.from({ length: 20 }, (_, i) => rec(`T${i}`, 100)));
  const plan = planSync(many, Array.from({ length: 20 }, (_, i) => input(`T${i}`, 200)));
  const s = summarizePlan(plan);
  assert.match(s, /đổi 20/);
  assert.match(s, /và 14 dịch vụ khác/);
});

test("ghi đè: giá hiệu lực, không xung đột khi Sheet chưa đổi", () => {
  const sheet = P(850000, 595000);
  const ov = patchOverride(sheet, null, { prices: { adult: 800000 } })!;
  assert.deepEqual(ov.prices, { adult: 800000 });
  assert.deepEqual(ov.base, { adult: 850000 });
  const eff = applyOverride(sheet, ov);
  assert.equal(eff.prices.adult, 800000);
  assert.equal(eff.prices.child, 595000); // loại không ghi đè vẫn theo Sheet
  assert.deepEqual(eff.overridden, ["adult"]);
  assert.equal(eff.conflicts.length, 0);
});

test("Sheet đổi giá sau khi ghi đè → cảnh báo xung đột, KHÔNG đè mất ghi đè", () => {
  const ov = patchOverride(P(850000), null, { prices: { adult: 800000 } })!;
  const eff = applyOverride(P(900000), ov); // Sheet tăng lên 900k
  assert.equal(eff.prices.adult, 800000);
  assert.deepEqual(eff.conflicts, [{ code: "adult", base: 850000, current: 900000, override: 800000 }]);
  // "Giữ ghi đè" = xác nhận: hết cảnh báo, giá ghi đè vẫn giữ
  const kept = acknowledge(P(900000), ov);
  assert.equal(applyOverride(P(900000), kept).conflicts.length, 0);
  assert.equal(applyOverride(P(900000), kept).prices.adult, 800000);
});

test("sửa ghi đè nhiều lần giữ nguyên mốc Sheet ban đầu; null = bỏ ghi đè loại đó", () => {
  let ov = patchOverride(P(850000), null, { prices: { adult: 800000 } });
  ov = patchOverride(P(900000), ov, { prices: { adult: 790000 } }); // Sheet đã đổi sang 900k, admin sửa tiếp
  assert.deepEqual(ov!.base, { adult: 850000 }); // mốc KHÔNG bị chụp lại ngầm → xung đột vẫn hiện
  ov = patchOverride(P(900000), ov, { prices: { adult: null } });
  assert.equal(ov, null); // không còn ghi đè nào
});

test("ẩn dịch vụ là một ghi đè; hiện lại thì bỏ", () => {
  let ov = patchOverride(P(1), null, { hidden: true });
  assert.equal(applyOverride(P(1), ov).hidden, true);
  ov = patchOverride(P(1), ov, { hidden: false });
  assert.equal(ov, null);
  assert.equal(applyOverride(P(1), null).hidden, false);
});
