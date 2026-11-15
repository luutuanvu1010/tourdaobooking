// ADR-0172 Đ2 mục 2: số gợi ý theo cấp «không cho ai công nợ» — chỉ để ĐIỀN SẴN bảng bật Trả sau. Hàng rào: bảng `bil_credit_tier_default` chỉ được nhắc ở tầng SQL của billing,
// và hàm đọc `goiYTheoCap` chỉ được gọi ở route `GET /api/tra-sau/goi-y`. Cổng hạn mức (`kiemTraSau`, `tra-sau.ts`) mà đọc số gợi ý thì bài đỏ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const SRC = new URL(".", import.meta.url).pathname;
function tep(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? tep(p) : /\.ts$/.test(f) && !/\.test\.ts$/.test(f) ? [p] : [];
  });
}
const TAT_CA = [...tep(SRC), ...tep(join(SRC, "../web"))];
const rel = (p: string) => p.slice(p.indexOf("/src/") >= 0 ? p.indexOf("/src/") + 1 : p.indexOf("/web/") + 1);

test("bảng số gợi ý chỉ nhắc ở tầng SQL của billing", () => {
  const nhac = TAT_CA.filter((p) => readFileSync(p, "utf8").includes("bil_credit_tier_default")).map(rel);
  assert.deepEqual(nhac, ["src/modules/billing/tra-sau-repo.ts"]);
});

test("hàm đọc số gợi ý chỉ gọi ở đúng một route xem (GET /api/tra-sau/goi-y), không ở cổng hạn mức", () => {
  const goi = TAT_CA.filter((p) => /\bgoiYTheoCap\(/.test(readFileSync(p, "utf8"))).map(rel).sort();
  assert.deepEqual(goi, ["src/modules/billing/index.ts"]);
  const idx = readFileSync(join(SRC, "modules/billing/index.ts"), "utf8");
  const lan = [...idx.matchAll(/\bgoiYTheoCap\(/g)].length;
  assert.equal(lan, 1, "một lần gọi");
  const truoc = idx.slice(0, idx.indexOf("goiYTheoCap(env.DB)"));
  assert.match(truoc.slice(truoc.lastIndexOf("route(")), /^route\("GET", "\/api\/tra-sau\/goi-y"/, "lần gọi nằm trong route GET /api/tra-sau/goi-y");
  const cong = readFileSync(join(SRC, "modules/billing/tra-sau.ts"), "utf8");
  assert.doesNotMatch(cong, /goiY|tier_default/i, "cổng hạn mức không đọc số gợi ý");
});
