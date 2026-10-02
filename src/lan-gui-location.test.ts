// HÀNG RÀO H7 (ADR-0094 A-10) — mọi route trả 201 gửi `Location` (trang nội bộ chỉ chứa id); lớp vé lưu nó làm `ket_qua` để gửi lặp mở đúng trang kết quả.
// Ba lớp: (1) bài tĩnh dưới đây — mỗi dòng mã có số 201 ở src/modules/*/index.ts phải gắn `location:` hoặc `kemLocation(` trên CÙNG dòng; (2) `call()` của
// khung thử (tests/audit/harness.mjs) ném khi gặp 201 thiếu/sai Location ⇒ mọi bài khung thử là bài canh; (3) `call()` của e2e (tests/e2e/lib.mjs) như vậy.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { maskSource } from "../scripts/source-mask-lib.mjs";
import { TAO_TRA_200 } from "./shared/lan-gui-ket-qua.ts";
import { ketQuaDeLuu } from "./shared/lan-gui-luat.ts";
import { kemLocation, trangDon } from "./shared/http.ts";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { LOCATION_HOP_LE, seedStaff, world } from "../tests/audit/harness.mjs";

const SRC = fileURLToPath(new URL(".", import.meta.url));

test("H7 (tĩnh): mỗi dòng có mã trạng thái 201 ở src/modules/*/index.ts gắn Location trên cùng dòng", () => {
  const thieu: string[] = [];
  for (const mod of readdirSync(join(SRC, "modules"))) {
    const f = join(SRC, "modules", mod, "index.ts");
    if (!existsSync(f)) continue;
    const goc = readFileSync(f, "utf8").split("\n");
    maskSource(readFileSync(f, "utf8"), { strings: false }).split("\n").forEach((dong, i) => {
      if (/\b201\b/.test(dong.replace(/\/\/.*$/, "")) && !/location:|kemLocation\(/.test(goc[i]!)) thieu.push(`src/modules/${mod}/index.ts:${i + 1}`);
    });
  }
  assert.deepEqual(thieu, [], "route trả 201 thiếu Location");
});

test("H7: kemLocation / trangDon cho đường dẫn hợp lệ với mẫu lưu ket_qua; mẫu khung thử = mẫu ketQuaDeLuu", () => {
  const r = kemLocation(new Response("{}", { status: 201, headers: { "content-type": "application/json" } }), trangDon("7f0c2c1e-1d2b-4c1a-9a51-0e2b8a1d2c3f"));
  assert.equal(r.status, 201);
  assert.equal(r.headers.get("content-type"), "application/json");
  assert.equal(ketQuaDeLuu(r.headers.get("location")), "/order?id=7f0c2c1e-1d2b-4c1a-9a51-0e2b8a1d2c3f");
  for (const x of ["/order?id=abc-1", "/parties", "/x?id=1&y=2", "//evil", "/Order"]) assert.equal(LOCATION_HOP_LE.test(x), ketQuaDeLuu(x) !== null, x);
});

test("H7 (chạy): lập đơn qua router thật ⇒ 201 + Location = trang đơn; gửi lặp cùng vé ⇒ ket_qua là trang đó", async () => {
  const w = world();
  const A = "11111111-1111-4111-8111-111111111111";
  seedStaff(w.sqlite, { id: A, phone: "0900000001", name: "An", perms: ["SALES"] });
  w.sqlite.exec("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('ZA1', 'Tour đảo', 'perPax', 500000, 1, '2026-01-01', '2026-01-01')");
  const ngay = new Date(Date.now() + 7 * 3600e3 + 3 * 86400e3).toISOString().slice(0, 10);
  const body = { customerName: "Khách", customerPhone: "0912345678", services: [{ kind: "catalog", catalogCode: "ZA1", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 500000 }, departDate: ngay, legs: [] }] };
  const ve = crypto.randomUUID();
  const r1 = await w.call("POST", "/api/orders", { as: A, body, headers: { "idempotency-key": ve } });
  assert.equal(r1.status, 201, r1.text);
  assert.equal(r1.headers.get("location"), `/order?id=${r1.json.order.id}`);
  await w.choNen();
  const r2 = await w.call("POST", "/api/orders", { as: A, body, headers: { "idempotency-key": ve } });
  assert.deepEqual(r2.json, { da_ghi_truoc_do: true, ket_qua: `/order?id=${r1.json.order.id}` });
});

test("TAO_TRA_200: mỗi mục là route ghi có thật, có lý do", () => {
  const co = new Set<string>();
  for (const mod of readdirSync(join(SRC, "modules"))) {
    const f = join(SRC, "modules", mod, "index.ts");
    if (existsSync(f)) for (const h of readFileSync(f, "utf8").matchAll(/route\(\s*"(POST|PUT|PATCH|DELETE)",\s*"([^"]+)"/g)) co.add(`${h[1]} ${h[2]}`);
  }
  for (const m of TAO_TRA_200) {
    assert.ok(co.has(`${m.method} ${m.path}`), `${m.method} ${m.path}`);
    assert.ok(m.lyDo.trim().length > 10);
  }
});
