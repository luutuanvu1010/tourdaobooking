import assert from "node:assert/strict";
import { ACCOUNTS, BASE as B, call, session, sql } from "./lib.mjs";
// Cần D1 chưa từng đồng bộ danh mục (run.mjs luôn dựng D1 mới) và mạng để đọc Google Sheet thật.
const ADMIN = await session(ACCOUNTS.admin), SALES = await session(ACCOUNTS.salesA);

assert.equal((await call(null, "GET", "/api/catalog")).status, 401);
for (const [m, p] of [["GET", "/api/catalog/admin"], ["POST", "/api/catalog/sync"], ["PATCH", "/api/catalog/TD101"], ["DELETE", "/api/catalog/TD101/override"]]) {
  assert.equal((await call(SALES, m, p, {})).status, 403, `${m} ${p} phải cấm với sales`);
}

// --- lần đọc đầu tiên tự kéo Sheet thật (bootstrap)
let r = await call(SALES, "GET", "/api/catalog");
assert.equal(r.status, 200);
const items = r.body.items;
console.log(`✓ bootstrap: ${items.length} dịch vụ, lastSuccessAt=${r.body.sync.lastSuccessAt ? "có" : "KHÔNG"}`);
assert.ok(items.length >= 30 && r.body.sync.lastSuccessAt && !r.body.sync.error);
const td101 = items.find((i) => i.code === "TD101");
assert.deepEqual(td101.prices, { adult: 850000, child: 595000, senior: 850000, infant: 0 });
assert.equal(td101.notes.child, "Trẻ em cao từ 1 m đến 1,4 mét");
assert.equal(td101.supported, true);
const ttb03 = items.find((i) => i.code === "TTB03");
assert.equal(ttb03.unit, "per5Pax"); assert.deepEqual(ttb03.prices, { adult: 1000000, child: null, senior: null, infant: null });
// không rò cột nội bộ / booking
const raw = JSON.stringify(r.body);
for (const secret of ["Kiểm xem có trùng", "tour-3-dao-nha-trang-hon-mun-hon-tam", "tour-hon-tam-tron-goi-cano-buffet", "Khoá giá", "Đường dẫn"]) assert.ok(!raw.includes(secret), `rò: ${secret}`);
assert.ok(!("override" in td101) && !("sheetPrices" in td101));
console.log("✓ giá đúng, không rò Khoá giá/Đường dẫn/Ghi chú nội bộ");

// --- kéo lại: idempotent
r = await call(ADMIN, "POST", "/api/catalog/sync", {});
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.deepEqual([r.body.added, r.body.changed, r.body.hidden], [0, 0, 0]);
console.log(`✓ kéo lại không đổi gì (unchanged=${r.body.unchanged}, problems=${r.body.problems.length}, warnings=${r.body.warnings.length})`);

// --- Sheet đổi giá (mô phỏng: sửa thẳng bản sao) → kéo về khôi phục + nhật ký ghi rõ
sql("UPDATE catalog_item SET price_adult = 1 WHERE code = 'TD101'");
assert.equal((await call(SALES, "GET", "/api/catalog")).body.items.find((i) => i.code === "TD101").prices.adult, 1);
r = await call(ADMIN, "POST", "/api/catalog/sync", {});
assert.equal(r.body.changed, 1);
assert.equal((await call(SALES, "GET", "/api/catalog")).body.items.find((i) => i.code === "TD101").prices.adult, 850000);
r = await call(ADMIN, "GET", "/api/audit?action=catalog_synced&limit=3");
assert.match(r.body.entries[0].detail, /TD101: giá người lớn 1 ₫ → 850\.000 ₫/);
assert.equal(r.body.entries[0].staffName, "QTV Test");
console.log("✓ đổi giá trên Sheet → kéo về, nhật ký ghi 'TD101: giá người lớn 1 ₫ → 850.000 ₫'");

// --- ghi đè có chủ đích
assert.equal((await call(ADMIN, "PATCH", "/api/catalog/TD101", { prices: { adult: -5 } })).status, 400);
assert.equal((await call(ADMIN, "PATCH", "/api/catalog/TD101", { prices: { adult: "800000" } })).status, 400);
assert.equal((await call(ADMIN, "PATCH", "/api/catalog/TD101", { prices: { teen: 1 } })).status, 400);
assert.equal((await call(ADMIN, "PATCH", "/api/catalog/NOPE", { hidden: true })).status, 404);
r = await call(ADMIN, "PATCH", "/api/catalog/TD101", { prices: { adult: 800000, infant: 50000 } });
assert.equal(r.status, 200);
assert.deepEqual(r.body.item.overridden, ["adult", "infant"]);
assert.deepEqual(r.body.item.sheetPrices, { adult: 850000, child: 595000, senior: 850000, infant: 0 });
assert.equal(r.body.item.prices.adult, 800000);
let sales = (await call(SALES, "GET", "/api/catalog")).body.items.find((i) => i.code === "TD101");
assert.equal(sales.prices.adult, 800000); assert.equal(sales.prices.child, 595000);
// KÉO LẠI KHÔNG ĐÈ ghi đè
r = await call(ADMIN, "POST", "/api/catalog/sync", {});
sales = (await call(SALES, "GET", "/api/catalog")).body.items.find((i) => i.code === "TD101");
assert.equal(sales.prices.adult, 800000, "kéo lại không được đè ghi đè của Admin");
console.log("✓ ghi đè giá; kéo lại KHÔNG đè");

// --- Sheet đổi giá sau ghi đè → cảnh báo xung đột, giá ghi đè vẫn giữ
sql("UPDATE catalog_item SET price_adult = 900000 WHERE code = 'TD101'");
r = await call(ADMIN, "GET", "/api/catalog/admin");
let a = r.body.items.find((i) => i.code === "TD101");
assert.deepEqual(a.conflicts, [{ code: "adult", base: 850000, current: 900000, override: 800000 }]);
assert.equal(a.prices.adult, 800000);
r = await call(ADMIN, "POST", "/api/catalog/TD101/ack");
assert.equal(r.body.item.conflicts.length, 0);
assert.equal(r.body.item.prices.adult, 800000);
console.log("✓ xung đột được cảnh báo, 'Giữ ghi đè' xác nhận");

// --- bỏ ghi đè → theo Sheet (kéo về 850000)
await call(ADMIN, "POST", "/api/catalog/sync", {});
r = await call(ADMIN, "DELETE", "/api/catalog/TD101/override");
assert.deepEqual(r.body.item.overridden, []);
assert.equal(r.body.item.prices.adult, 850000);

// --- ẩn / hiện
r = await call(ADMIN, "PATCH", "/api/catalog/TD102", { hidden: true });
assert.equal(r.body.item.hidden, true);
assert.ok(!(await call(SALES, "GET", "/api/catalog")).body.items.some((i) => i.code === "TD102"));
assert.equal((await call(ADMIN, "GET", "/api/catalog/admin")).body.items.find((i) => i.code === "TD102").hidden, true);
await call(ADMIN, "POST", "/api/catalog/sync", {});
assert.ok(!(await call(SALES, "GET", "/api/catalog")).body.items.some((i) => i.code === "TD102"), "kéo lại không hiện lại dịch vụ đã ẩn");
await call(ADMIN, "PATCH", "/api/catalog/TD102", { hidden: false });
assert.ok((await call(SALES, "GET", "/api/catalog")).body.items.some((i) => i.code === "TD102"));
console.log("✓ ẩn/hiện dịch vụ");

// --- Cron (giả lập): không có người thao tác → nhật ký "Hệ thống (tự động)"
sql("UPDATE catalog_item SET price_child = 1 WHERE code = 'TD103'");
const cron = await fetch(B + "/__scheduled?cron=*/15+*+*+*+*");
assert.equal(cron.status, 200);
await new Promise((r) => setTimeout(r, 3000));
r = await call(ADMIN, "GET", "/api/audit?action=catalog_synced&limit=1");
assert.equal(r.body.entries[0].staffName, "Hệ thống (tự động)");
assert.match(r.body.entries[0].detail, /TD103/);
assert.equal((await call(SALES, "GET", "/api/catalog")).body.items.find((i) => i.code === "TD103").prices.child, 600000);
console.log("✓ Cron tự kéo, nhật ký ghi 'Hệ thống (tự động)'");

// --- chốt chặn: Sheet 'mất' hơn nửa dịch vụ
const fake = Array.from({ length: 70 }, (_, i) => `('ZZ${i}','Giả ${i}','perPax',1,1,1,1,'2026-01-01','2026-01-01')`).join(",");
sql(`INSERT INTO catalog_item (code,name,unit,price_adult,in_sheet,first_seen_at,updated_at) SELECT code,name,unit,price_adult,1,first_seen_at,updated_at FROM (SELECT 'ZZ'||value code,'Giả '||value name,'perPax' unit,1 price_adult,'2026-01-01' first_seen_at,'2026-01-01' updated_at FROM (WITH RECURSIVE c(value) AS (SELECT 0 UNION ALL SELECT value+1 FROM c WHERE value<69) SELECT value FROM c))`);
r = await call(ADMIN, "POST", "/api/catalog/sync", {});
assert.equal(r.status, 409); assert.equal(r.body.error.code, "sync_guard");
assert.equal((await call(SALES, "GET", "/api/catalog")).body.items.filter((i) => i.code.startsWith("ZZ")).length, 70, "chốt chặn: chưa ẩn gì");
assert.match((await call(ADMIN, "GET", "/api/catalog/admin")).body.sync.lastError, /Chưa áp dụng thay đổi nào/);
r = await call(ADMIN, "POST", "/api/catalog/sync", { force: true });
assert.equal(r.status, 200); assert.equal(r.body.hidden, 70);
sql("DELETE FROM catalog_item WHERE code LIKE 'ZZ%'");
console.log("✓ chốt chặn Sheet hỏng + ép kéo");

r = await call(ADMIN, "POST", "/api/catalog/sync", {});
assert.equal(r.status, 200);
assert.equal((await call(ADMIN, "GET", "/api/catalog/admin")).body.sync.lastError, null);
console.log("E2E CATALOG OK");
