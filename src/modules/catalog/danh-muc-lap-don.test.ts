// ADR-0033 (chủ dự án 2026-09-27, thay điều 1 của ADR-0028): `GET /api/catalog/for-order` — người ĐƯỢC LẬP ĐƠN (kể cả Đối tác, Thực tập, không
// qua cổng office) đọc danh mục cho form lập đơn; `GET /api/catalog` về cổng office (ADR-0019 điều 1). Chạy CẢ ứng dụng (router + mọi module, gói
// bằng esbuild) trên SQLite thật qua khung tests/audit/harness.mjs — cùng khuôn với ho-so-co-tai-khoan.test.ts, xem-don-theo-quyen.test.ts.
// Thấy chặn thật (P16, docs/SO-HANG-RAO.md): bỏ câu `if (!can(staff, "order.create")) …` ở route mới → ca "Kế toán 403 ở thân" đỏ (nhận 200).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const ADM = "33333333-3333-4333-8333-333333333333";
const FIELD = "44444444-4444-4444-8444-444444444444";
const ACC = "55555555-5555-4555-8555-555555555555";
const SUP = "77777777-7777-4777-8777-777777777777";
const PARTNER = "88888888-8888-4888-8888-888888888888";
const INTERN = "99999999-9999-4999-8999-999999999999";
const NAME: Record<string, string> = { [SALES]: "Bán hàng", [ADM]: "Quản trị", [FIELD]: "Hướng dẫn viên", [ACC]: "Kế toán", [SUP]: "Toàn quyền", [PARTNER]: "Đối tác", [INTERN]: "Thực tập" };

// Lời báo 403 của từng tầng — để biết lời từ chối đến từ CỔNG của router (src/shared/router.ts) hay từ THÂN route (src/modules/catalog/index.ts).
const GATE_ORDERS = "Tài khoản này không dùng được màn hình đơn.";
const GATE_OFFICE = "Tài khoản này chỉ dùng cho việc được giao, không dùng màn hình này.";
const BODY_NO_CREATE = "Tài khoản này không lập đơn nên không xem được danh mục dịch vụ.";
const SYNC_ERROR = "Không đọc được Sheet lúc 08:00";
const NOW = "2026-09-01T00:00:00.000Z";

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: FIELD, phone: "0900000004", name: "Hướng Dẫn", perms: ["FIELD"] });
  seedStaff(w.sqlite, { id: ACC, phone: "0900000005", name: "Kế toán", perms: ["ACCOUNTING"] });
  seedStaff(w.sqlite, { id: SUP, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  seedStaff(w.sqlite, { id: PARTNER, phone: "0900000008", name: "Đối tác", perms: ["PARTNER"] });
  seedStaff(w.sqlite, { id: INTERN, phone: "0900000009", name: "Thực tập", perms: ["INTERN"] });
  // Ba dịch vụ: hai đang hiện (máy chủ xếp theo mã), một bị ẩn bằng ghi đè — dịch vụ ẩn không được lọt vào phản hồi nào.
  w.sqlite.exec(`INSERT INTO catalog_item (code, name, unit, price_adult, price_child, price_senior, price_infant, note_child, note_senior, note_infant, sheet_row, in_sheet, first_seen_at, updated_at)
    VALUES ('TOUR4DAO', 'Tour 4 đảo', 'perPax', 500000, 350000, 450000, 0, 'Trẻ 5–10 tuổi', NULL, 'Em bé miễn phí', 1, 1, '${NOW}', '${NOW}')`);
  w.sqlite.exec(`INSERT INTO catalog_item (code, name, unit, price_adult, price_child, price_senior, price_infant, sheet_row, in_sheet, first_seen_at, updated_at)
    VALUES ('PHAO', 'Phao chuối', 'per5Pax', 1500000, NULL, NULL, NULL, 2, 1, '${NOW}', '${NOW}')`);
  w.sqlite.exec(`INSERT INTO catalog_item (code, name, unit, price_adult, price_child, price_senior, price_infant, sheet_row, in_sheet, first_seen_at, updated_at)
    VALUES ('AN', 'Dịch vụ ẩn', 'perPax', 100000, NULL, NULL, NULL, 3, 1, '${NOW}', '${NOW}')`);
  w.sqlite.exec(`INSERT INTO catalog_override (code, hidden, updated_at) VALUES ('AN', 1, '${NOW}')`);
  // Chữ lỗi đồng bộ Sheet: chỉ người qua cổng office thấy; Đối tác/Thực tập nhận null.
  w.sqlite.exec(`UPDATE catalog_sync SET last_error = '${SYNC_ERROR}' WHERE id = 'default'`);
  return w;
}

test("ADR-0033: Đối tác, Thực tập, Bán hàng, Quản trị, Toàn quyền đọc được GET /api/catalog/for-order — đúng bảy khoá mỗi dịch vụ (thêm groupCode — ADR-0058 Đ5), cùng nội dung và thứ tự như Bán hàng thấy ở GET /api/catalog, không có dịch vụ ẩn", async () => {
  const w = setup();
  const sales = await w.call("GET", "/api/catalog", { as: SALES });
  assert.equal(sales.status, 200, sales.text);
  assert.deepEqual(sales.json.items.map((i: any) => i.code), ["PHAO", "TOUR4DAO"], "khung thử: Bán hàng thấy hai dịch vụ đang hiện (xếp theo mã — loadAll ORDER BY code)");
  for (const as of [PARTNER, INTERN, SALES, ADM, SUP]) {
    const r = await w.call("GET", "/api/catalog/for-order", { as });
    assert.equal(r.status, 200, `${NAME[as]}: ${r.text}`);
    // ADR-0058 Đ5 (Task A3): thêm ĐÚNG `groups` ở cấp trên và `groupCode` mỗi dịch vụ — không khoá nào khác (không giá gốc, không cột Sheet).
    assert.deepEqual(Object.keys(r.json).sort(), ["groups", "items", "sync"], `${NAME[as]}: phản hồi chỉ có groups + items + sync`);
    assert.deepEqual(Object.keys(r.json.sync).sort(), ["error", "lastSuccessAt"], `${NAME[as]}: sync chỉ có hai khoá`);
    for (const item of r.json.items) assert.deepEqual(Object.keys(item).sort(), ["code", "groupCode", "name", "notes", "prices", "supported", "unit"], `${NAME[as]} ${item.code}`);
    for (const g of r.json.groups) assert.deepEqual(Object.keys(g).sort(), ["code", "name"], `${NAME[as]}: nhóm cho form chỉ có mã + tên`);
    assert.deepEqual(r.json.items, sales.json.items, `${NAME[as]}: danh mục phải ĐÚNG như Bán hàng thấy ở GET /api/catalog (cùng giá, cùng thứ tự)`);
    assert.deepEqual(r.json.groups, sales.json.groups, `${NAME[as]}: danh sách nhóm phải ĐÚNG như Bán hàng thấy ở GET /api/catalog`);
    assert.equal(r.json.items.some((i: any) => i.code === "AN"), false, `${NAME[as]}: dịch vụ ẩn không lọt vào`);
  }
});

test("ADR-0033: sync.error = null với Đối tác/Thực tập (không qua cổng office); Bán hàng, Quản trị, Toàn quyền vẫn thấy chữ lỗi đồng bộ ở cả hai route", async () => {
  const w = setup();
  for (const as of [PARTNER, INTERN]) {
    const r = await w.call("GET", "/api/catalog/for-order", { as });
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.sync.error, null, `${NAME[as]} không thuộc văn phòng — không được thấy chữ lỗi đồng bộ Sheet`);
  }
  for (const as of [SALES, ADM, SUP]) {
    for (const path of ["/api/catalog/for-order", "/api/catalog"]) {
      const r = await w.call("GET", path, { as });
      assert.equal(r.status, 200, `${NAME[as]} ${path}: ${r.text}`);
      assert.equal(r.json.sync.error, SYNC_ERROR, `${NAME[as]} ${path}: văn phòng vẫn thấy chữ lỗi đồng bộ`);
    }
  }
});

test("ADR-0033 + ADR-0030 S23-5: Kế toán và chỉ-Hướng dẫn viên (không có order.create) → 403 ở THÂN route mới, không kèm danh mục", async () => {
  const w = setup();
  const acc = await w.call("GET", "/api/catalog/for-order", { as: ACC });
  assert.equal(acc.status, 403, `Kế toán: ${acc.text}`);
  assert.equal(acc.json.error.code, "forbidden");
  assert.equal(acc.json.error.message, BODY_NO_CREATE, "Kế toán qua cổng orders, bị chặn ở thân (can order.create)");
  assert.equal(acc.json.items, undefined, "403 không được kèm items");
  const field = await w.call("GET", "/api/catalog/for-order", { as: FIELD });
  assert.equal(field.status, 403, `Hướng dẫn viên: ${field.text}`);
  // ADR-0030 S23-5: FIELD nay QUA cổng orders (lời báo của cổng `GATE_ORDERS` không còn) — chặn ở chốt order.create trong thân (ADR-0019 điều 3:
  // hướng dẫn viên không đọc danh mục giá cho form lập đơn).
  assert.notEqual(field.json.error.message, GATE_ORDERS, "không còn bị chặn ở cổng orders");
  assert.equal(field.json.error.message, BODY_NO_CREATE, "chỉ-FIELD bị chặn ở thân (can order.create)");
  assert.equal(field.json.items, undefined);
});

test("ADR-0033: Kế toán bị từ chối TRƯỚC mọi truy vấn — không kích lần đồng bộ Sheet đầu tiên (bootstrapIfNeverSynced) dù hệ thống chưa từng đồng bộ", async () => {
  const w = setup();
  w.sqlite.exec("UPDATE catalog_sync SET last_attempt_at = NULL, last_success_at = NULL WHERE id = 'default'");
  // ID Sheet ĐÚNG DẠNG (khung thử mặc định "x" bị fetchSheetCsv từ chối trước khi gọi mạng) để nếu lần đồng bộ đầu có chạy thì nó chạm tới `fetch` giả dưới đây.
  w.env.SERVICES_SHEET_ID = "A".repeat(30);
  const realFetch = globalThis.fetch;
  let netCalls = 0;
  globalThis.fetch = (async () => {
    netCalls++;
    throw new Error("khung thử: không được gọi mạng");
  }) as typeof fetch;
  try {
    const r = await w.call("GET", "/api/catalog/for-order", { as: ACC });
    assert.equal(r.status, 403, r.text);
  } finally {
    globalThis.fetch = realFetch;
  }
  assert.equal(netCalls, 0, "403 không được đi đọc Google Sheet");
  assert.equal(w.q("SELECT last_attempt_at FROM catalog_sync WHERE id = 'default'")[0].last_attempt_at, null, "403 không được đánh dấu đã thử đồng bộ");
});

test("ADR-0033 (đảo có chủ đích so với bản 1.15): GET /api/catalog về cổng office — Đối tác, Thực tập, Hướng dẫn viên → 403 ở CỔNG office; Bán hàng, Kế toán, Quản trị, Toàn quyền → 200", async () => {
  const w = setup();
  for (const as of [PARTNER, INTERN, FIELD]) {
    const r = await w.call("GET", "/api/catalog", { as });
    assert.equal(r.status, 403, `${NAME[as]}: ${r.text}`);
    assert.equal(r.json.error.message, GATE_OFFICE, `${NAME[as]}: lời báo của cổng office`);
    assert.equal(r.json.items, undefined);
  }
  for (const as of [SALES, ACC, ADM, SUP]) {
    const r = await w.call("GET", "/api/catalog", { as });
    assert.equal(r.status, 200, `${NAME[as]}: ${r.text}`);
    assert.ok(r.json.items.some((i: any) => i.code === "TOUR4DAO"), NAME[as]);
  }
});

// ---- ADR-0058 Đ5 (Task A3, NT-A9): nhóm trong DTO danh mục -------------------------------------------------------------------------------------
// Khung thử áp migration 0053 trên catalog_item RỖNG → 14 nhóm, 0 dòng gán. Gán thẳng bằng SQL ở đây (bài route ghi ở nhom-route.test.ts).
const GAN = (code: string, group: string | null, seq = 1) =>
  `INSERT INTO ctl_service_group (id, service_code, group_code, seq, valid_from_at, created_at, created_by, updated_at, updated_by)
   VALUES ('t-${code}-${seq}', '${code}', ${group === null ? "NULL" : `'${group}'`}, ${seq}, '${NOW}', '${NOW}', NULL, '${NOW}', NULL)`;

test("ADR-0058 Đ5: groupCode mỗi dịch vụ = nhóm hiện hành; groups chỉ nhóm đang dùng có ≥ 1 dịch vụ đang hiện, xếp sort_order; nhóm của dịch vụ ẩn không lọt", async () => {
  const w = setup();
  w.sqlite.exec(GAN("PHAO", "TDA"));
  w.sqlite.exec(GAN("PHAO", "TTB", 2)); // dòng seq lớn nhất = hiện hành
  w.sqlite.exec(GAN("AN", "LPH")); // dịch vụ ẩn: nhóm LPH không có dịch vụ đang hiện nào → không vào groups
  for (const path of ["/api/catalog", "/api/catalog/for-order"]) {
    const r = await w.call("GET", path, { as: SALES });
    assert.equal(r.status, 200, r.text);
    const by = Object.fromEntries(r.json.items.map((i: any) => [i.code, i.groupCode]));
    assert.deepEqual(by, { PHAO: "TTB", TOUR4DAO: null }, `${path}: PHAO ở nhóm hiện hành TTB; TOUR4DAO chưa phân loại`);
    assert.deepEqual(r.json.groups, [{ code: "TTB", name: "Thể thao biển" }], `${path}: chỉ nhóm có dịch vụ đang hiện`);
  }
  w.sqlite.exec(GAN("TOUR4DAO", "TDA"));
  const r = await w.call("GET", "/api/catalog/for-order", { as: PARTNER });
  assert.deepEqual(r.json.groups.map((g: any) => g.code), ["TDA", "TTB"], "xếp theo sort_order (Tour đảo 1, Thể thao biển 7)");
});

test("ADR-0058 Đ5: nhóm đang TẮT → dịch vụ của nó groupCode null ở form đơn, nhóm không có trong groups; danh sách quản trị vẫn liệt kê nhóm tắt", async () => {
  const w = setup();
  w.sqlite.exec(GAN("PHAO", "TTB"));
  w.sqlite.exec(GAN("TOUR4DAO", "TDA"));
  w.sqlite.exec(`UPDATE ctl_group SET active = 0 WHERE code = 'TTB'`); // khung thử đặt thẳng (máy chủ chặn tắt nhóm còn dịch vụ — bài ở nhom-route.test.ts)
  const r = await w.call("GET", "/api/catalog/for-order", { as: SALES });
  const by = Object.fromEntries(r.json.items.map((i: any) => [i.code, i.groupCode]));
  assert.deepEqual(by, { PHAO: null, TOUR4DAO: "TDA" });
  assert.deepEqual(r.json.groups, [{ code: "TDA", name: "Tour đảo" }]);
  const adm = await w.call("GET", "/api/catalog/admin", { as: ADM });
  assert.equal(adm.status, 200, adm.text);
  const ttb = adm.json.groups.find((g: any) => g.code === "TTB");
  assert.ok(ttb, "danh sách quản trị có cả nhóm tắt");
  assert.equal(ttb.active, false);
  assert.equal(ttb.soDichVu, 1);
  assert.deepEqual(Object.keys(ttb).sort(), ["active", "code", "name", "soDichVu", "sortOrder", "updatedAt"]);
  assert.equal(adm.json.groups.length, 14, "đủ 14 nhóm gieo");
  assert.equal(adm.json.items.find((i: any) => i.code === "PHAO").groupCode, "TTB", "quản trị thấy nhóm hiện hành thật (kể cả nhóm tắt)");
  assert.equal(adm.json.items.find((i: any) => i.code === "AN").groupCode, null);
});
