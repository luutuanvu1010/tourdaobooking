import assert from "node:assert/strict";
import { ACCOUNTS, BASE as B, call, login, randomPhone, session, sql, sqlRows, vnDate } from "./lib.mjs";
// Cần D1 chưa từng đồng bộ danh mục (run.mjs luôn dựng D1 mới) và mạng để đọc Google Sheet thật.
const ADMIN = await session(ACCOUNTS.admin), SALES = await session(ACCOUNTS.salesA);
const TOAN_QUYEN = await session(ACCOUNTS.superAdmin); // ADR-0038 điều 6: trang Nhật ký, đặt lại PIN, gỡ Face ID, mở khoá chỉ Toàn quyền

// --- Đọc THẲNG Sheet thật, trong CHÍNH lượt chạy này (Đợt D Task 6, F-4): kịch bản này từng GHIM CỨNG giá đọc
// được từ Sheet tại một thời điểm (vd TTB03 "1.000.000"), nên mỗi lần chủ dự án thật sự đổi giá trên Sheet, kịch
// bản tự đỏ dù ĐỒNG BỘ vẫn đúng — không phải lỗi mã. Không thấy chú thích nào nói các con số này CỐ Ý ghim để bắt
// thay đổi ngoài ý muốn (khác kiểu "chốt chặn Sheet hỏng" ở cuối tệp — đó test một CƠ CHẾ, không phải một GIÁ TRỊ),
// nên chọn phương án (a) của brief: so API với giá đọc thẳng từ Sheet, dùng LẠI đúng `parseCatalogSheet` (cách đọc
// cột) mà máy chủ dùng để đồng bộ — không tự viết lại cách đọc cột, không lệch máy chủ. KHÔNG dùng lại
// `fetchSheetCsv` của `src/shared/sheets.ts`: lớp `SheetError` của nó dùng cú pháp "constructor parameter property"
// mà chế độ strip-type của Node (`node file.mjs` chạy `.ts` trực tiếp, không biên dịch) không đọc được
// (`ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX` — đã tự đo) — tải CSV thẳng bằng `fetch` (đúng URL export CSV mà
// `fetchSheetCsv` dùng) rồi đưa qua `parseCatalogSheet`. `SERVICES_SHEET_ID` không phải bí mật (`wrangler.jsonc`
// ghi rõ; Sheet chỉ cho ĐỌC công khai) nên chép lại ở đây là an toàn.
const { parseCatalogSheet } = await import("../../src/modules/catalog/sheet.ts");
const SERVICES_SHEET_ID = "1XPx1g0JVTdevdX35MeCpt6Cc6Dgxdmfer6okEWleD3s"; // = wrangler.jsonc vars.SERVICES_SHEET_ID
const sheetCsvRes = await fetch(`https://docs.google.com/spreadsheets/d/${SERVICES_SHEET_ID}/export?format=csv`, { redirect: "follow" });
assert.equal(sheetCsvRes.status, 200, `đọc CSV Sheet thật để đối chiếu: HTTP ${sheetCsvRes.status}`);
const sheetParsed = parseCatalogSheet(await sheetCsvRes.text());
assert.ok(sheetParsed.ok, `đọc Sheet thật để đối chiếu: ${JSON.stringify(sheetParsed)}`);
const sheetItem = (code) => {
  const it = sheetParsed.items.find((i) => i.code === code);
  assert.ok(it, `Sheet thật không còn dòng ${code} — kịch bản cần sửa lại (Sheet đã đổi cấu trúc, không chỉ đổi giá)`);
  return it;
};
// Chủ dự án đổi mã dịch vụ trên Sheet (2026-09-27: TD101… → TD1…) — kịch bản KHÔNG ghim mã nào: chọn lúc chạy
// MA1 = dòng "theo người" đầu tiên có giá người lớn lẫn trẻ em; MA3 = một dòng "theo người" khác có giá trẻ em.
const coGia = (i) => i.unit === "perPax" && i.prices.adult !== null && i.prices.child !== null;
const sheetTD101 = sheetParsed.items.find(coGia);
assert.ok(sheetTD101, "Sheet thật không còn dòng 'theo người' nào có giá người lớn + trẻ em — kịch bản cần xem lại");
const sheetTD103 = sheetParsed.items.find((i) => coGia(i) && i.code !== sheetTD101.code);
assert.ok(sheetTD103, "Sheet thật cần ít nhất hai dòng 'theo người' có giá trẻ em");
const MA1 = sheetTD101.code, MA3 = sheetTD103.code;
// MA2: một dòng bất kỳ khác MA1/MA3 để thử ẩn/hiện (trước đây ghim TD102).
const MA2 = sheetParsed.items.find((i) => i.code !== MA1 && i.code !== MA3).code;
// Dịch vụ thứ hai để đối chiếu đơn vị + giá: chọn LÚC CHẠY một dòng có đơn vị khác "theo người" (vd theo nhóm 5 khách),
// không ghim mã cố định — TTB03 từng dùng ở đây đã bị chủ dự án bỏ khỏi Sheet thật (2026-09-27), làm kịch bản đỏ dù đồng bộ đúng.
const sheetKhac = sheetParsed.items.find((i) => i.unit !== "perPax") ?? sheetTD103;
const vnd = (n) => n.toLocaleString("vi-VN"); // "850000" → "850.000" — dùng để đối chiếu câu chữ nhật ký
console.log(`✓ đọc Sheet thật: ${MA1} giá người lớn ${vnd(sheetTD101.prices.adult)} ₫, ${sheetKhac.code} (${sheetKhac.unit}) có giá ${JSON.stringify(sheetKhac.prices)}`);

assert.equal((await call(null, "GET", "/api/catalog")).status, 401);
for (const [m, p] of [["GET", "/api/catalog/admin"], ["POST", "/api/catalog/sync"], ["PATCH", `/api/catalog/${MA1}`], ["DELETE", `/api/catalog/${MA1}/override`]]) {
  assert.equal((await call(SALES, m, p, {})).status, 403, `${m} ${p} phải cấm với sales`);
}

// --- lần đọc đầu tiên tự kéo Sheet thật (bootstrap), 5 người mở form cùng lúc. Kiểm hồi quy: không có dòng nhật ký trùng.
// Lưu ý: chưa tái hiện được tranh chấp gốc trên wrangler dev local (D1 local tuần tự quá nhanh; lần đồng bộ thừa lại thấy
// "0 thay đổi" nên không ghi nhật ký) → kiểm này KHÔNG chứng minh claimFirstSync; điều đó dựa vào UPDATE có điều kiện.
const burst = await Promise.all(Array.from({ length: 5 }, () => call(SALES, "GET", "/api/catalog")));
assert.ok(burst.every((b) => b.status === 200));
const syncedLogs = (await call(TOAN_QUYEN, "GET", "/api/audit?action=catalog_synced&limit=10")).body.entries;
assert.equal(syncedLogs.length, 1, `bootstrap song song ghi nhật ký đồng bộ ${syncedLogs.length} lần`);
console.log("✓ 5 request đầu tiên song song → một dòng nhật ký đồng bộ");
let r = await call(SALES, "GET", "/api/catalog");
assert.equal(r.status, 200);
const items = r.body.items;
console.log(`✓ bootstrap: ${items.length} dịch vụ, lastSuccessAt=${r.body.sync.lastSuccessAt ? "có" : "KHÔNG"}`);
assert.ok(items.length >= 30 && r.body.sync.lastSuccessAt && !r.body.sync.error);
const td101 = items.find((i) => i.code === MA1);
assert.deepEqual(td101.prices, sheetTD101.prices, `giá ${MA1} phải khớp Sheet thật đọc được ở trên (${JSON.stringify(sheetTD101.prices)})`);
assert.equal(td101.notes.child, sheetTD101.notes.child);
assert.equal(td101.supported, true);
const khac = items.find((i) => i.code === sheetKhac.code);
assert.ok(khac, `API thiếu dịch vụ ${sheetKhac.code} có trên Sheet thật`);
assert.equal(khac.unit, sheetKhac.unit);
assert.deepEqual(khac.prices, sheetKhac.prices, `giá ${sheetKhac.code} phải khớp Sheet thật đọc được ở trên (${JSON.stringify(sheetKhac.prices)})`);
// không rò cột nội bộ / booking
const raw = JSON.stringify(r.body);
for (const secret of ["Kiểm xem có trùng", "tour-3-dao-nha-trang-hon-mun-hon-tam", "tour-hon-tam-tron-goi-cano-buffet", "Khoá giá", "Đường dẫn"]) assert.ok(!raw.includes(secret), `rò: ${secret}`);
assert.ok(!("override" in td101) && !("sheetPrices" in td101));
console.log("✓ giá đúng, không rò Khoá giá/Đường dẫn/Ghi chú nội bộ");

// --- Đối tác và Thực tập xem danh mục CHỈ-ĐỌC để lập đơn (ADR-0028 điều 2–4; ADR-0033 2026-09-27 thay điều 1): đọc qua route RIÊNG
// GET /api/catalog/for-order (cổng "orders" + can(order.create) trong thân) — cùng NỘI DUNG như nhân viên (không rò thêm gì), không đụng route quản
// trị danh mục. GET /api/catalog về cổng "office" (ADR-0019 điều 1): Đối tác/Thực tập nay 403 ở đó — ĐẢO CÓ CHỦ ĐÍCH so với bản 1.15.
// Kế toán và Hướng dẫn viên thuần (không có order.create) → 403 ở route mới.
const newAccount = async (body) => {
  const res = await call(ADMIN, "POST", "/api/staff", { fullName: `Xem danh mục ${randomPhone().slice(-4)}`, phone: randomPhone(), ...body });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return (await login(res.body.staff.phone, res.body.pin)).cookie;
};
const PARTNER = await newAccount({ roles: ["COLLABORATOR"] }), INTERN = await newAccount({ roles: ["INTERN"] }), FIELD_ONLY = await newAccount({ permissions: ["FIELD"] });
const ACCOUNTANT = await session(ACCOUNTS.accountant);
for (const [who, label] of [[PARTNER, "Đối tác"], [INTERN, "Thực tập"]]) {
  const res = await call(who, "GET", "/api/catalog/for-order");
  assert.equal(res.status, 200, `${label} phải đọc được danh mục cho form lập đơn: ${JSON.stringify(res.body)}`);
  assert.deepEqual(res.body.items, items, `${label} thấy ĐÚNG nội dung như nhân viên bán hàng (không thêm, không bớt)`);
  assert.equal(res.body.sync.error, null, `${label}: không phải văn phòng nên không thấy chữ lỗi đồng bộ Sheet`);
  assert.equal((await call(who, "GET", "/api/catalog")).status, 403, `${label}: GET /api/catalog (cổng office, ADR-0033) phải 403`);
  for (const [m, pth] of [["GET", "/api/catalog/admin"], ["POST", "/api/catalog/sync"], ["PATCH", `/api/catalog/${MA1}`], ["DELETE", `/api/catalog/${MA1}/override`]]) {
    assert.equal((await call(who, m, pth, {})).status, 403, `${label}: ${m} ${pth} vẫn phải cấm`);
  }
}
r = await call(SALES, "GET", "/api/catalog/for-order");
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.deepEqual(r.body.items, items, "Bán hàng: route mới cùng nội dung với GET /api/catalog");
assert.equal((await call(ACCOUNTANT, "GET", "/api/catalog/for-order")).status, 403, "Kế toán không lập đơn → 403 ở route mới");
assert.equal((await call(ACCOUNTANT, "GET", "/api/catalog")).status, 200, "Kế toán (văn phòng) vẫn đọc GET /api/catalog");
assert.equal((await call(FIELD_ONLY, "GET", "/api/catalog")).status, 403, "Hướng dẫn viên thuần (chỉ FIELD) vẫn không đọc danh mục");
assert.equal((await call(FIELD_ONLY, "GET", "/api/catalog/for-order")).status, 403, "Hướng dẫn viên thuần (chỉ FIELD) không đọc danh mục qua route mới");
// Đối tác lập đơn nháp bằng một dịch vụ lấy từ chính danh sách route mới trả → 201; giá dòng do MÁY CHỦ tính lại (buildLines), đúng giá bán lẻ.
const partnerTd101 = (await call(PARTNER, "GET", "/api/catalog/for-order")).body.items.find((i) => i.code === MA1);
assert.ok(partnerTd101 && partnerTd101.supported && partnerTd101.prices.adult !== null, `${MA1} phải có trong danh mục của Đối tác, có giá người lớn`);
r = await call(PARTNER, "POST", "/api/orders", {
  customerName: "Khách Đối Tác Danh Mục",
  customerPhone: "0901 111 222",
  services: [{ kind: "catalog", catalogCode: MA1, pax: { adult: 2 }, catalogPriceSeen: { adult: partnerTd101.prices.adult }, departDate: vnDate(7) }],
});
assert.equal(r.status, 201, JSON.stringify(r.body));
const partnerLine = r.body.order.services.flatMap((s) => s.items)[0];
assert.equal(partnerLine.unitPrice, partnerTd101.prices.adult, "giá dòng = giá bán lẻ danh mục");
assert.equal(partnerLine.lineTotal, partnerTd101.prices.adult * 2);
console.log("✓ Đối tác + Thực tập đọc danh mục qua /api/catalog/for-order (200, cùng nội dung, không thấy lỗi đồng bộ), /api/catalog 403; Kế toán + Hướng dẫn viên 403 ở route mới; Đối tác lập đơn từ danh mục đúng giá");

// --- kéo lại: idempotent
r = await call(ADMIN, "POST", "/api/catalog/sync", {});
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.deepEqual([r.body.added, r.body.changed, r.body.hidden], [0, 0, 0]);
console.log(`✓ kéo lại không đổi gì (unchanged=${r.body.unchanged}, problems=${r.body.problems.length}, warnings=${r.body.warnings.length})`);

// --- Sheet đổi giá (mô phỏng: sửa thẳng bản sao) → kéo về khôi phục + nhật ký ghi rõ
await sql(`UPDATE catalog_item SET price_adult = 1 WHERE code = '${MA1}'`);
assert.equal((await call(SALES, "GET", "/api/catalog")).body.items.find((i) => i.code === MA1).prices.adult, 1);
r = await call(ADMIN, "POST", "/api/catalog/sync", {});
assert.equal(r.body.changed, 1);
assert.equal((await call(SALES, "GET", "/api/catalog")).body.items.find((i) => i.code === MA1).prices.adult, sheetTD101.prices.adult);
r = await call(TOAN_QUYEN, "GET", "/api/audit?action=catalog_synced&limit=3");
assert.match(r.body.entries[0].detail, new RegExp(`${MA1}: giá người lớn 1 ₫ → ${vnd(sheetTD101.prices.adult).replace(/\./g, "\\.")} ₫`));
assert.equal(r.body.entries[0].staffName, "QTV Test");
console.log(`✓ đổi giá trên Sheet → kéo về, nhật ký ghi '${MA1}: giá người lớn 1 ₫ → ${vnd(sheetTD101.prices.adult)} ₫'`);

// --- ghi đè có chủ đích
assert.equal((await call(ADMIN, "PATCH", `/api/catalog/${MA1}`, { prices: { adult: -5 } })).status, 400);
assert.equal((await call(ADMIN, "PATCH", `/api/catalog/${MA1}`, { prices: { adult: "800000" } })).status, 400);
assert.equal((await call(ADMIN, "PATCH", `/api/catalog/${MA1}`, { prices: { teen: 1 } })).status, 400);
assert.equal((await call(ADMIN, "PATCH", "/api/catalog/NOPE", { hidden: true })).status, 404);
r = await call(ADMIN, "PATCH", `/api/catalog/${MA1}`, { prices: { adult: 800000, infant: 50000 } });
assert.equal(r.status, 200);
assert.deepEqual(r.body.item.overridden, ["adult", "infant"]);
assert.deepEqual(r.body.item.sheetPrices, sheetTD101.prices);
assert.equal(r.body.item.prices.adult, 800000);
let sales = (await call(SALES, "GET", "/api/catalog")).body.items.find((i) => i.code === MA1);
assert.equal(sales.prices.adult, 800000); assert.equal(sales.prices.child, sheetTD101.prices.child);
// KÉO LẠI KHÔNG ĐÈ ghi đè
r = await call(ADMIN, "POST", "/api/catalog/sync", {});
sales = (await call(SALES, "GET", "/api/catalog")).body.items.find((i) => i.code === MA1);
assert.equal(sales.prices.adult, 800000, "kéo lại không được đè ghi đè của Admin");
console.log("✓ ghi đè giá; kéo lại KHÔNG đè");

// --- Sheet đổi giá sau ghi đè → cảnh báo xung đột, giá ghi đè vẫn giữ
await sql(`UPDATE catalog_item SET price_adult = 900000 WHERE code = '${MA1}'`);
r = await call(ADMIN, "GET", "/api/catalog/admin");
let a = r.body.items.find((i) => i.code === MA1);
assert.deepEqual(a.conflicts, [{ code: "adult", base: sheetTD101.prices.adult, current: 900000, override: 800000 }]);
assert.equal(a.prices.adult, 800000);
r = await call(ADMIN, "POST", `/api/catalog/${MA1}/ack`);
assert.equal(r.body.item.conflicts.length, 0);
assert.equal(r.body.item.prices.adult, 800000);
console.log("✓ xung đột được cảnh báo, 'Giữ ghi đè' xác nhận");

// --- bỏ ghi đè → theo Sheet (kéo về giá Sheet thật)
await call(ADMIN, "POST", "/api/catalog/sync", {});
r = await call(ADMIN, "DELETE", `/api/catalog/${MA1}/override`);
assert.deepEqual(r.body.item.overridden, []);
assert.equal(r.body.item.prices.adult, sheetTD101.prices.adult);

// --- ẩn / hiện
r = await call(ADMIN, "PATCH", `/api/catalog/${MA2}`, { hidden: true });
assert.equal(r.body.item.hidden, true);
assert.ok(!(await call(SALES, "GET", "/api/catalog")).body.items.some((i) => i.code === MA2));
assert.equal((await call(ADMIN, "GET", "/api/catalog/admin")).body.items.find((i) => i.code === MA2).hidden, true);
await call(ADMIN, "POST", "/api/catalog/sync", {});
assert.ok(!(await call(SALES, "GET", "/api/catalog")).body.items.some((i) => i.code === MA2), "kéo lại không hiện lại dịch vụ đã ẩn");
await call(ADMIN, "PATCH", `/api/catalog/${MA2}`, { hidden: false });
assert.ok((await call(SALES, "GET", "/api/catalog")).body.items.some((i) => i.code === MA2));
console.log("✓ ẩn/hiện dịch vụ");

// --- Cron (giả lập): không có người thao tác → nhật ký "Hệ thống (tự động)"
await sql(`UPDATE catalog_item SET price_child = 1 WHERE code = '${MA3}'`);
const cron = await fetch(B + "/__scheduled?cron=*/15+*+*+*+*");
assert.equal(cron.status, 200);
await new Promise((r) => setTimeout(r, 3000));
r = await call(TOAN_QUYEN, "GET", "/api/audit?action=catalog_synced&limit=1");
assert.equal(r.body.entries[0].staffName, "Hệ thống (tự động)");
assert.match(r.body.entries[0].detail, new RegExp(MA3));
assert.equal((await call(SALES, "GET", "/api/catalog")).body.items.find((i) => i.code === MA3).prices.child, sheetTD103.prices.child);
console.log("✓ Cron tự kéo, nhật ký ghi 'Hệ thống (tự động)'");

// --- chốt chặn: Sheet 'mất' hơn nửa dịch vụ. Số mã giả tính theo Sheet THẬT lúc chạy (số dòng hợp lệ đổi theo thời gian: 61 → 133
// ngày 2026-09-27): `syncGuard` chặn khi số sẽ ẩn × 2 > số đang có trong Sheet, tức cần số mã giả > số dịch vụ thật.
const [{ n: dangCoTrongSheet }] = await sqlRows("SELECT count(*) AS n FROM catalog_item WHERE in_sheet = 1");
const soMaGia = dangCoTrongSheet + 1;
await sql(`INSERT INTO catalog_item (code,name,unit,price_adult,in_sheet,first_seen_at,updated_at) SELECT code,name,unit,price_adult,1,first_seen_at,updated_at FROM (SELECT 'ZZ'||value code,'Giả '||value name,'perPax' unit,1 price_adult,'2026-01-01' first_seen_at,'2026-01-01' updated_at FROM (WITH RECURSIVE c(value) AS (SELECT 0 UNION ALL SELECT value+1 FROM c WHERE value<${soMaGia - 1}) SELECT value FROM c))`);
r = await call(ADMIN, "POST", "/api/catalog/sync", {});
assert.equal(r.status, 409); assert.equal(r.body.error.code, "sync_guard");
assert.equal((await call(SALES, "GET", "/api/catalog")).body.items.filter((i) => i.code.startsWith("ZZ")).length, soMaGia, "chốt chặn: chưa ẩn gì");
assert.match((await call(ADMIN, "GET", "/api/catalog/admin")).body.sync.lastError, /Chưa áp dụng thay đổi nào/);
r = await call(ADMIN, "POST", "/api/catalog/sync", { force: true });
assert.equal(r.status, 200); assert.equal(r.body.hidden, soMaGia);
await sql("DELETE FROM catalog_item WHERE code LIKE 'ZZ%'");
console.log("✓ chốt chặn Sheet hỏng + ép kéo");

r = await call(ADMIN, "POST", "/api/catalog/sync", {});
assert.equal(r.status, 200);
assert.equal((await call(ADMIN, "GET", "/api/catalog/admin")).body.sync.lastError, null);
console.log("E2E CATALOG OK");
