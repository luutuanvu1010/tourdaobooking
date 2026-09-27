// ADR-0019 điều 1–2 (Task B4): nơi trả đơn, tiền, liên hệ khách hỏi bảng quyền ngay trong thân handler; ba route (Trang chủ, người phụ trách của
// các đơn, đặt/nhận người phụ trách) chuyển từ cổng "office" sang cổng "orders" mà Đối tác / Thực tập VẪN bị chặn — nay bằng `can()` chứ không
// bằng cổng. Chạy CẢ ứng dụng trên SQLite thật qua khung tests/audit/harness.mjs (cùng khuôn ho-so-co-tai-khoan.test.ts, quan-tri-hoi-bang.test.ts).
// Thấy chặn thật của ô `money.view` (B-10): tạm đặt `money.view` của PARTNER = "none" → ca "Đối tác mở đơn của chính mình" đỏ (xem docs/SO-HANG-RAO.md).
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
const NO_SUCH_ORDER = "00000000-0000-4000-8000-000000000000";

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: FIELD, phone: "0900000004", name: "Hướng Dẫn", perms: ["FIELD"] });
  seedStaff(w.sqlite, { id: ACC, phone: "0900000005", name: "Kế toán", perms: ["ACCOUNTING"] });
  seedStaff(w.sqlite, { id: SUP, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  seedStaff(w.sqlite, { id: PARTNER, phone: "0900000008", name: "Đối tác", perms: ["PARTNER"] });
  seedStaff(w.sqlite, { id: INTERN, phone: "0900000009", name: "Thực tập", perms: ["INTERN"] });
  // API không nhận dịch vụ nhập tay mới (DK-T3-01) → đơn thử dùng dịch vụ danh mục giả; Đối tác phải dùng đúng giá danh mục (R2).
  w.sqlite.exec("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('ZA1', 'Tour đảo', 'perPax', 500000, 1, '2026-01-01', '2026-01-01')");
  return w;
}
const inDays = (n: number) => new Date(Date.now() + 7 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);
const orderBody = () => ({
  customerName: "Khách Thử", customerPhone: "0912345678",
  services: [{ kind: "catalog", catalogCode: "ZA1", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 500000 }, departDate: inDays(3) }],
  depositAmount: 200000, depositMethod: "cash",
});
async function newOrder(w: any, as: string): Promise<string> {
  const r = await w.call("POST", "/api/orders", { as, body: orderBody() });
  assert.equal(r.status, 201, r.text);
  return r.json.order.id;
}
const count = (w: any, table: string) => w.q(`SELECT count(*) n FROM ${table}`)[0].n;

test("(1) Trang chủ: Đối tác, Thực tập → 403 forbidden (bảng quyền, không phải cổng); Bán hàng → 200", async () => {
  const w = setup();
  for (const as of [PARTNER, INTERN]) {
    const r = await w.call("GET", "/api/orders/dashboard", { as });
    assert.equal(r.status, 403, `${as}: ${r.text}`);
    assert.equal(r.json.error.code, "forbidden");
  }
  assert.equal((await w.call("GET", "/api/orders/dashboard", { as: SALES })).status, 200);
});

test("(2) người phụ trách của các đơn: Đối tác, Thực tập hỏi đơn của người khác → 403", async () => {
  const w = setup();
  const o = await newOrder(w, SALES);
  for (const as of [PARTNER, INTERN]) {
    const r = await w.call("GET", `/api/dispatch/handlers?orderIds=${o}`, { as });
    assert.equal(r.status, 403, `${as}: ${r.text}`);
    assert.equal(r.json.error.code, "forbidden");
  }
  assert.equal((await w.call("GET", `/api/dispatch/handlers?orderIds=${o}`, { as: SALES })).status, 200);
  assert.equal((await w.call("GET", `/api/dispatch/handlers?orderIds=${o}`, { as: ACC })).status, 200, "kế toán xem được như xem đơn");
});

test("(3) đặt/nhận người phụ trách: Đối tác, Thực tập → 403 ĐỨNG TRƯỚC 404 (đơn không tồn tại) và trước đọc thân; không ghi gì", async () => {
  const w = setup();
  const o = await newOrder(w, SALES);
  const logs = count(w, "audit_log");
  const rows = count(w, "dsp_assignment");
  for (const as of [PARTNER, INTERN]) {
    const missing = await w.call("PUT", `/api/orders/${NO_SUCH_ORDER}/handler`, { as, body: { staffId: as } });
    assert.equal(missing.status, 403, `${as} (đơn không tồn tại): ${missing.text}`);
    const badId = await w.call("PUT", "/api/orders/abc/handler", { as, body: { staffId: as } });
    assert.equal(badId.status, 403, `${as} (mã đơn sai dạng): ${badId.text}`);
    const badBody = await w.call("PUT", `/api/orders/${o}/handler`, { as, body: {} });
    assert.equal(badBody.status, 403, `${as} (thân sai): ${badBody.text}`);
    const real = await w.call("PUT", `/api/orders/${o}/handler`, { as, body: { staffId: as } });
    assert.equal(real.status, 403, `${as} (đơn thật): ${real.text}`);
  }
  assert.equal(count(w, "audit_log"), logs, "403 không ghi nhật ký");
  assert.equal(count(w, "dsp_assignment"), rows, "403 không đổi người phụ trách");
  // Hành vi cũ giữ nguyên với người có quyền: đơn không tồn tại → 404.
  assert.equal((await w.call("PUT", `/api/orders/${NO_SUCH_ORDER}/handler`, { as: SALES, body: { staffId: SALES } })).status, 404);
});

test("(4) Đối tác xem đơn của chính mình (danh sách + chi tiết) → 200 có tiền; đơn của người khác → 403", async () => {
  const w = setup();
  const mine = await newOrder(w, PARTNER);
  const other = await newOrder(w, SALES);
  const detail = await w.call("GET", `/api/orders/${mine}`, { as: PARTNER });
  assert.equal(detail.status, 200, detail.text);
  assert.equal(typeof detail.json.order.total, "number");
  const list = await w.call("GET", "/api/orders?limit=100", { as: PARTNER });
  assert.equal(list.status, 200, list.text);
  assert.deepEqual(list.json.orders.map((x: any) => x.id), [mine], "chỉ đơn của chính mình");
  assert.equal(typeof list.json.orders[0].total, "number");
  assert.equal((await w.call("GET", `/api/orders/${other}`, { as: PARTNER })).status, 403);
});

test("danh sách/chi tiết đơn: mọi mã qua cổng orders vẫn 200 (thêm kiểm tiền/liên hệ không đổi hành vi); Thực tập chỉ đơn của mình", async () => {
  const w = setup();
  const o = await newOrder(w, SALES);
  for (const as of [SALES, ACC, ADM, SUP, PARTNER, INTERN]) {
    assert.equal((await w.call("GET", "/api/orders", { as })).status, 200, `${as} danh sách`);
  }
  for (const as of [SALES, ACC, ADM, SUP]) assert.equal((await w.call("GET", `/api/orders/${o}`, { as })).status, 200, `${as} chi tiết`);
  const own = await newOrder(w, INTERN);
  assert.equal((await w.call("GET", `/api/orders/${own}`, { as: INTERN })).status, 200);
  assert.equal((await w.call("GET", `/api/orders/${o}`, { as: INTERN })).status, 403);
});

// ADR-0033 (2026-09-27) ĐẢO CÓ CHỦ ĐÍCH ca của bản 1.15 (ADR-0028 điều 1): Đối tác/Thực tập đọc danh mục qua route riêng /api/catalog/for-order
// (chốt chặn order.create rồi money.view "của mình"), còn GET /api/catalog về cổng office. Ca đầy đủ ở src/modules/catalog/danh-muc-lap-don.test.ts.
test("danh mục cho form lập đơn (ADR-0033): /api/catalog/for-order — Đối tác, Thực tập, Bán hàng, Quản trị, Toàn quyền → 200; Kế toán, Hướng dẫn viên → 403. /api/catalog (office) — Bán hàng, Kế toán, Quản trị, Toàn quyền → 200; Đối tác, Thực tập, Hướng dẫn viên → 403", async () => {
  const w = setup();
  for (const as of [PARTNER, INTERN, SALES, ADM, SUP]) {
    const r = await w.call("GET", "/api/catalog/for-order", { as });
    assert.equal(r.status, 200, `${as} for-order: ${r.text}`);
    assert.ok(r.json.items.some((i: any) => i.code === "ZA1"));
  }
  for (const as of [ACC, FIELD]) assert.equal((await w.call("GET", "/api/catalog/for-order", { as })).status, 403, `${as} for-order`);
  for (const as of [SALES, ACC, ADM, SUP]) {
    const r = await w.call("GET", "/api/catalog", { as });
    assert.equal(r.status, 200, `${as}: ${r.text}`);
    assert.ok(r.json.items.some((i: any) => i.code === "ZA1"));
  }
  for (const as of [PARTNER, INTERN, FIELD]) assert.equal((await w.call("GET", "/api/catalog", { as })).status, 403, `${as} /api/catalog`);
});

test("danh sách người có thể được giao: chỉ ai giao được ít nhất đơn của mình (dispatch.assign) — kế toán nay 403; Bán hàng, Quản trị → 200", async () => {
  const w = setup();
  assert.equal((await w.call("GET", "/api/dispatch/assignees", { as: ACC })).status, 403);
  for (const as of [SALES, ADM, SUP]) assert.equal((await w.call("GET", "/api/dispatch/assignees", { as })).status, 200, as);
  for (const as of [PARTNER, INTERN, FIELD]) assert.equal((await w.call("GET", "/api/dispatch/assignees", { as })).status, 403, as);
});

test("'Việc của tôi' trả liên hệ khách → hỏi contact.view phạm vi 'được giao': Thực tập (own) → 403; Hướng dẫn viên, Đối tác, Bán hàng → 200", async () => {
  const w = setup();
  assert.equal((await w.call("GET", "/api/dispatch/mine", { as: INTERN })).status, 403);
  for (const as of [FIELD, PARTNER, SALES]) assert.equal((await w.call("GET", "/api/dispatch/mine", { as })).status, 200, as);
});
