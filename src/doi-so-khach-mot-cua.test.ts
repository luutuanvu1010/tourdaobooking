// ADR-0062 Đ1-a (NT-B3): MỘT cửa ghi `order_money_adjustment` (insertMoneyAdjustment) và mọi hành động ghi dòng đó mang cờ `doiSoKhach` — tập nguồn tin
// "đơn đổi sau xác nhận" dẫn từ cờ, nên đường sửa số khách mới (ADR-0063) không thể lọt khỏi tin.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { AUDIT_ACTIONS, HANH_DONG_DOI_SO_KHACH } from "./shared/audit-actions.ts";

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

test("NT-B3: mọi INSERT INTO order_money_adjustment trong mã chạy chỉ nằm trong thân insertMoneyAdjustment (src/modules/orders/repository.ts)", () => {
  const hits = walk("src").filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))
    .flatMap((f) => [...readFileSync(f, "utf8").matchAll(/INSERT INTO order_money_adjustment\b/g)].map(() => f));
  assert.deepEqual(hits, ["src/modules/orders/repository.ts"]);
  const src = readFileSync("src/modules/orders/repository.ts", "utf8");
  const dau = src.indexOf("export async function insertMoneyAdjustment");
  assert.ok(dau >= 0, "không thấy insertMoneyAdjustment");
  const than = src.slice(dau, src.indexOf("\n}\n", dau));
  assert.match(than, /INSERT INTO order_money_adjustment\b/);
});

test("NT-B3: hành động mang cờ doiSoKhach = đúng hai hành động sửa số khách (HDV + văn phòng khai trước — ADR-0062 Đ1 cách (a))", () => {
  assert.deepEqual([...HANH_DONG_DOI_SO_KHACH].sort(), ["order_money_adjusted", "order_money_adjusted_by_field"]);
  for (const a of HANH_DONG_DOI_SO_KHACH) assert.equal((AUDIT_ACTIONS[a] as { doiSoKhach?: true }).doiSoKhach, true, a);
  assert.equal(AUDIT_ACTIONS.order_money_adjusted.group, "order");
});

test("NT-B3: insertMoneyAdjustment nhận tham số hành động kiểu chỉ-cờ (HanhDongDoiSoKhach) và ghi đúng hành động được truyền", () => {
  const src = readFileSync("src/modules/orders/repository.ts", "utf8");
  const dau = src.indexOf("export async function insertMoneyAdjustment");
  const than = src.slice(dau, src.indexOf("\n}\n", dau));
  assert.match(than, /action: HanhDongDoiSoKhach/);
  assert.doesNotMatch(than, /action: "order_money_adjusted_by_field"/, "không viết cứng hành động trong hàm ghi");
});
