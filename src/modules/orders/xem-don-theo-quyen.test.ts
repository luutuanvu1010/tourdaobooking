// ADR-0019 điều 1–2 (Task B4): nơi trả đơn, tiền, liên hệ khách hỏi bảng quyền ngay trong thân handler; ba route (Trang chủ, người phụ trách của
// các đơn, đặt/nhận người phụ trách) chuyển từ cổng "office" sang cổng "orders" mà Đối tác / Thực tập VẪN bị chặn — nay bằng `can()` chứ không
// bằng cổng. Chạy CẢ ứng dụng trên SQLite thật qua khung tests/audit/harness.mjs (cùng khuôn ho-so-co-tai-khoan.test.ts, quan-tri-hoi-bang.test.ts).
// Thấy chặn thật của ô `money.view` (B-10): tạm đặt `money.view` của PARTNER = "none" → ca "Đối tác mở đơn của chính mình" đỏ (xem docs/SO-HANG-RAO.md).
// ADR-0030 lượt 1 (S23-1…5, S20-6, S20-12 — Task 1.5): hướng dẫn viên (chỉ quyền FIELD) qua cổng "orders"; ba đường xem tách nhau — (a) danh sách
// = đơn mình ĐANG phụ trách, (b) hàng chờ nhận `GET /api/orders/pool` = PHẦN HẸP của đơn chưa có người, (c) chi tiết đơn không phụ trách = 404, (d) chi
// tiết đơn mình phụ trách = đủ (tiền, SĐT, lịch sử). Thấy chặn thật: `money.view` FIELD tạm "none" → ca (d) đỏ; bỏ `holdsPartner` ở route pool → ca
// tài khoản lai đỏ (docs/SO-HANG-RAO.md).
import { test } from "node:test";
import assert from "node:assert/strict";
import { MATRIX, type OperationCode } from "../../shared/permissions.ts";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const ADM = "33333333-3333-4333-8333-333333333333";
const FIELD = "44444444-4444-4444-8444-444444444444";
const ACC = "55555555-5555-4555-8555-555555555555";
const SUP = "77777777-7777-4777-8777-777777777777";
const PARTNER = "88888888-8888-4888-8888-888888888888";
const INTERN = "99999999-9999-4999-8999-999999999999";
const FIELD_B = "44444444-4444-4444-8444-bbbbbbbbbbbb"; // hướng dẫn viên thứ hai
const LAI_HDV = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"; // FIELD + PARTNER (tài khoản lai)
const LAI_CHU = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"; // SUPER_ADMIN + PARTNER (tài khoản lai)
const HDV_TT = "dddddddd-dddd-4ddd-8ddd-dddddddddddd"; // FIELD + INTERN (tài khoản ghép: "mình lập" ∪ "mình phụ trách")
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
  seedStaff(w.sqlite, { id: FIELD_B, phone: "0900000014", name: "Hướng Dẫn Hai", perms: ["FIELD"] });
  seedStaff(w.sqlite, { id: LAI_HDV, phone: "0900000010", name: "Lai Hướng Dẫn", perms: ["FIELD", "PARTNER"] });
  seedStaff(w.sqlite, { id: LAI_CHU, phone: "0900000011", name: "Lai Toàn Quyền", perms: ["SUPER_ADMIN", "PARTNER"] });
  seedStaff(w.sqlite, { id: HDV_TT, phone: "0900000012", name: "Hướng Dẫn Thực Tập", perms: ["FIELD", "INTERN"] });
  // API không nhận dịch vụ nhập tay mới (DK-T3-01) → đơn thử dùng dịch vụ danh mục giả; Đối tác phải dùng đúng giá danh mục (R2).
  w.sqlite.exec("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('ZA1', 'Tour đảo', 'perPax', 500000, 1, '2026-01-01', '2026-01-01')");
  return w;
}
const inDays = (n: number) => new Date(Date.now() + 7 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);
const orderBody = (extra: Record<string, unknown> = {}, departDate = inDays(3)) => ({
  customerName: "Khách Thử", customerPhone: "0912345678",
  services: [{ kind: "catalog", catalogCode: "ZA1", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 500000 }, departDate }],
  depositAmount: 200000, depositMethod: "cash", ...extra,
});
async function newOrder(w: any, as: string, extra: Record<string, unknown> = {}, departDate?: string): Promise<string> {
  const r = await w.call("POST", "/api/orders", { as, body: orderBody(extra, departDate) });
  assert.equal(r.status, 201, r.text);
  return r.json.order.id;
}
/** Bán hàng lập đơn giao ngay cho hướng dẫn viên `hdv` (chọn HDV lúc lập — ADR-0030 S20-4). */
const orderHandledBy = (w: any, hdv: string, extra: Record<string, unknown> = {}) => newOrder(w, SALES, { handlerStaffId: hdv, ...extra });
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

// Task 1.8 (chủ dự án quyết 2026-09-27: HDV cần biết còn thu bao nhiêu) — "Việc của tôi" nay trả thêm ba trường tiền, nên route hỏi CẢ `money.view`
// phạm vi "được giao" (ADR-0019 điều 2: nơi trả tiền hỏi ô tiền; thiếu → 403 cả phản hồi, không cắt bớt trường). ĐẢO CÓ CHỦ ĐÍCH: Đối tác trước đây
// 200 (contact.view = ownOrAssigned) nay 403 (money.view = own) — siết, không mất chức năng: Đối tác thuần không bao giờ làm người phụ trách
// (`checkAssignee`), danh sách của họ luôn rỗng, giao diện cũng không gọi route này cho họ.
test("'Việc của tôi' trả liên hệ khách VÀ tiền → hỏi contact.view và money.view phạm vi 'được giao': Thực tập, Đối tác → 403; Hướng dẫn viên, Bán hàng, Kế toán → 200", async () => {
  const w = setup();
  for (const as of [INTERN, PARTNER]) {
    const r = await w.call("GET", "/api/dispatch/mine", { as });
    assert.equal(r.status, 403, `${as}: ${r.text}`);
    assert.equal(r.json.error.code, "forbidden");
  }
  for (const as of [FIELD, SALES, ACC, LAI_HDV]) assert.equal((await w.call("GET", "/api/dispatch/mine", { as })).status, 200, as);
});

// Task 1.8 (quyết định A của chủ dự án, 2026-09-27): ba trường tiền của "Việc của tôi" là số HIỆN HÀNH sau điều chỉnh (ADR-0017 điều 5) — PHẢI trùng
// đúng số mà chi tiết đơn (`GET /api/orders/:id`, cùng người xem) trả, kể cả sau khi HDV sửa số khách (dòng điều chỉnh, không sửa đè cột tiền).
test("'Việc của tôi' có Tổng tiền / Đã cọc / Còn thu = đúng số của chi tiết đơn, kể cả đơn nháp và đơn đã sửa số khách", async () => {
  const w = setup();
  const draft = await orderHandledBy(w, FIELD); // 2 người lớn × 500.000 = 1.000.000, cọc 200.000
  const conf = await orderHandledBy(w, FIELD);
  const ok = await w.call("POST", `/api/orders/${conf}/status`, { as: SALES, body: { status: "confirmed" } });
  assert.equal(ok.status, 200, ok.text);
  const svc = (await w.call("GET", `/api/orders/${conf}`, { as: FIELD })).json.order.services[0].id;
  const edit = await w.call("POST", `/api/orders/${conf}/handler-money-edit`, { as: FIELD, body: { reason: "Khách thêm người", services: [{ id: svc, pax: { adult: 3, child: 0, senior: 0, infant: 0 } }] } });
  assert.equal(edit.status, 200, edit.text);

  const mine = await w.call("GET", "/api/dispatch/mine", { as: FIELD });
  assert.equal(mine.status, 200, mine.text);
  const byId = new Map(mine.json.assignments.map((a: any) => [a.orderId, a]));
  const money = (a: any) => ({ total: a.total, depositAmount: a.depositAmount, remainingAmount: a.remainingAmount });
  assert.deepEqual(money(byId.get(draft)), { total: 1000000, depositAmount: 200000, remainingAmount: 800000 }, "đơn nháp: số lúc lập");
  assert.deepEqual(money(byId.get(conf)), { total: 1500000, depositAmount: 200000, remainingAmount: 1300000 }, "đơn đã xác nhận, đã sửa 2 → 3 người lớn: số SAU điều chỉnh");
  for (const id of [draft, conf]) {
    const detail = (await w.call("GET", `/api/orders/${id}`, { as: FIELD })).json.order;
    assert.deepEqual(money(byId.get(id)), money(detail), `${id}: trùng chi tiết đơn`);
  }
});

// ============================================================================================================================================
// ADR-0030 lượt 1 — hàng chờ nhận (S23-1, S23-2) và ba đường xem của hướng dẫn viên (S23-3, S23-4, S23-5, S20-6, S20-12). Task 1.5.
// ============================================================================================================================================

// Danh sách trường được phép của phần hẹp — CHÉP TAY từ ADR-0030 S23-2 (cùng danh sách với src/modules/orders/pool.test.ts; không suy từ mã).
const POOL_ORDER_KEYS = ["departDate", "orderCode", "orderId", "services"];
const POOL_SERVICE_KEYS = ["name", "pax", "pickupPlace", "pickupTime"];
/** Một dãy từ 8 chữ số trở lên (đếm sau khi bỏ dấu ngăn) — chỉ áp cho chữ tự do (nơi đón), KHÔNG cho mã đơn/ngày (vốn có 8 chữ số). */
const EIGHT_DIGITS = /\d(?:[\s.()+\-–—]*\d){7,}/;

/**
 * Bộ đơn thử cho hàng chờ: mỗi đơn một trạng thái khác nhau với hàng chờ. Trả id theo tên. `pickupPlace` của đơn "moi" có SĐT viết kiểu người thật gõ.
 * Đơn "lech": hai dịch vụ, một dịch vụ bị đưa về HÔM QUA bằng SQL (đơn cũ trước 1.11 — API nay không cho lưu lệch ngày) → ngày đi = ngày lớn nhất, chưa qua.
 * Đơn "coNguoi" giao ngay cho hướng dẫn viên FIELD lúc lập.
 */
async function poolWorld() {
  const w = setup();
  const moi = await newOrder(w, SALES, {
    customerEmail: "khach@example.com", customerNote: "Khách dặn gọi 0987654321",
    services: [{ kind: "catalog", catalogCode: "ZA1", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 500000 }, departDate: inDays(3), pickupPlace: "Đón ở 0905 123.456 cổng sau", pickupTime: "06:45" }],
  });
  const coNguoi = await orderHandledBy(w, FIELD);
  const daHuy = await newOrder(w, SALES);
  assert.equal((await w.call("POST", `/api/orders/${daHuy}/status`, { as: SALES, body: { status: "cancelled" } })).status, 200);
  const quaNgay = await newOrder(w, PARTNER, {}, inDays(-1));
  const chuaCoNgay = await newOrder(w, PARTNER, {}, "");
  const lech = await newOrder(w, SALES, {
    services: [1, 2].map(() => ({ kind: "catalog", catalogCode: "ZA1", pax: { adult: 1, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 500000 }, departDate: inDays(4) })),
  });
  const [first] = w.q("SELECT id FROM order_service WHERE order_id = ? ORDER BY sort_order LIMIT 1", lech);
  w.sqlite.prepare("UPDATE order_service SET depart_date = ? WHERE id = ?").run(inDays(-1), first.id);
  const daXacNhan = await newOrder(w, SALES);
  assert.equal((await w.call("POST", `/api/orders/${daXacNhan}/status`, { as: SALES, body: { status: "confirmed" } })).status, 200);
  return { w, ids: { moi, coNguoi, daHuy, quaNgay, chuaCoNgay, lech, daXacNhan } };
}

/** Kiểm một phản hồi hàng chờ: đúng tập đơn, đúng khoá, nơi đón bị che, không lộ khách/tiền/người lập. */
function assertPool(r: any, ids: Record<string, string>, who: string) {
  assert.equal(r.status, 200, `${who}: ${r.text}`);
  assert.deepEqual(Object.keys(r.json), ["orders"], who);
  assert.deepEqual(new Set(r.json.orders.map((o: any) => o.orderId)), new Set([ids.moi, ids.chuaCoNgay, ids.lech, ids.daXacNhan]), `${who}: tập đơn của hàng chờ`);
  for (const o of r.json.orders) {
    assert.deepEqual(Object.keys(o).sort(), POOL_ORDER_KEYS, `${who}: khoá đơn ${o.orderCode}`);
    for (const s of o.services) {
      assert.deepEqual(Object.keys(s).sort(), POOL_SERVICE_KEYS, `${who}: khoá dịch vụ ${o.orderCode}`);
      assert.doesNotMatch(s.pickupPlace ?? "", EIGHT_DIGITS, `${who}: nơi đón ${o.orderCode} còn dãy từ 8 chữ số`);
    }
  }
  const moi = r.json.orders.find((o: any) => o.orderId === ids.moi);
  assert.equal(moi.services[0].pickupPlace, "Đón ở •••• •••.••• cổng sau", who);
  assert.equal(moi.services[0].pickupTime, "06:45", who);
  assert.deepEqual(moi.services[0].pax, { adult: 2, child: 0, senior: 0, infant: 0 }, who);
  assert.equal(r.json.orders.find((o: any) => o.orderId === ids.lech).departDate, inDays(4), `${who}: ngày đi = ngày khởi hành lớn nhất`);
  assert.equal(r.json.orders.find((o: any) => o.orderId === ids.chuaCoNgay).departDate, null, who);
  for (const secret of ["Khách Thử", "0912345678", "khach@example.com", "0987654321", SALES, PARTNER, "total", "customer", "staff"]) {
    assert.ok(!r.text.includes(secret), `${who}: hàng chờ lộ "${secret}"`);
  }
}

test("ADR-0030 S23-1/S23-2 (L1-3 b, L1-4): GET /api/orders/pool (Toàn quyền) — chỉ đơn CHƯA có người phụ trách, CHƯA huỷ, CHƯA qua ngày đi (kể cả đơn nháp, chưa có ngày, lệch ngày); phần hẹp đúng khoá; nơi đón bị che", async () => {
  const { w, ids } = await poolWorld();
  assertPool(await w.call("GET", "/api/orders/pool", { as: SUP }), ids, "Toàn quyền");
});

test("ADR-0030 S23-1/S23-5 (L1-5): ai thấy hàng chờ — Bán hàng, Kế toán, Quản trị, Đối tác, Thực tập → 403; tài khoản lai Hướng dẫn viên+Đối tác và Toàn quyền+Đối tác → 403 (Q-M); Toàn quyền → 200", async () => {
  const { w } = await poolWorld();
  for (const as of [SALES, ACC, ADM, PARTNER, INTERN, LAI_HDV, LAI_CHU]) {
    const r = await w.call("GET", "/api/orders/pool", { as });
    assert.equal(r.status, 403, `${as}: ${r.text}`);
    assert.equal(r.json.error.code, "forbidden", as);
    assert.equal(r.json.orders, undefined, `${as}: 403 không kèm đơn nào`);
  }
  assert.equal((await w.call("GET", "/api/orders/pool", { as: SUP })).status, 200);
  assert.equal((await w.call("GET", "/api/orders/pool")).status, 401, "chưa đăng nhập");
});

test("ADR-0030 Review Focus 3: GET /api/orders/pool KHÔNG rơi vào route chi tiết đơn (404 'Không tìm thấy đơn') — kể cả khi hàng chờ rỗng", async () => {
  const w = setup();
  const r = await w.call("GET", "/api/orders/pool", { as: SUP });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json, { orders: [] });
});

test("ADR-0030 L1-12: MỌI ô của Đối tác (PARTNER) giữ nguyên — ghim nguyên dòng, kể cả ô mới order.pool.view = none", () => {
  const PARTNER_ROW: Record<string, string> = {
    "order.view": "own", "money.view": "own", "order.history.view": "own", "contact.view": "ownOrAssigned", "order.create": "any", "order.modify": "own",
    "order.trip.edit": "none", "task.progress": "assigned", "order.money.edit": "none", "order.cancel": "none", "dispatch.assign": "none", "dispatch.claim": "none",
    "dispatch.guides.view": "any", "payment.receive": "none", "payment.refund": "none", "invoice.request": "none", "invoice.issue": "none", "party.view": "none",
    "party.write": "none", "party.staff.write": "none", "admin.manage": "none", "admin.manage.superadmin": "none", "feedback.submit": "any", "feedback.view": "own",
    "feedback.triage": "none", "settings.ops": "none", "order.pool.view": "none", "account.access.manage": "none", "audit.view": "none", "notice.send": "none",
    "staff.sheet.sync": "none",
    "company.legal.write": "none", // T2b (ADR-0024 6.4 + ADR-0038 điều 7): ô mới, chỉ Toàn quyền — thêm khi gộp main 356084a vào nhánh T2b (D19)
    "party.document.view": "none", "party.document.write": "none", "party.document.reveal": "none", // ADR-0040 D2: Đối tác không có giấy tờ trong app
  };
  const actual = Object.fromEntries((Object.keys(MATRIX) as OperationCode[]).map((op) => [op, MATRIX[op].PARTNER]));
  assert.deepEqual(actual, PARTNER_ROW);
});

// ---- Hướng dẫn viên qua cổng orders (S23-5) — ba đường tách nhau (S23-1…4). Các ca dưới cần FIELD trong ORDERS_GATE (cùng lần phát hành với nhánh lọc
// thứ ba và chi tiết 404 — S23-4: thiếu một trong ba thì HDV rơi vào trang lỗi 403). ----------------------------------------------------------------

test("ADR-0030 L1-3 (b), L1-5, Review Focus 3: hướng dẫn viên GET /api/orders/pool → 200 phần hẹp (không bao giờ 404) — đúng tập, đúng khoá, nơi đón bị che", async () => {
  const { w, ids } = await poolWorld();
  for (const as of [FIELD, FIELD_B]) assertPool(await w.call("GET", "/api/orders/pool", { as }), ids, `HDV ${as}`);
  const empty = setup();
  const r = await empty.call("GET", "/api/orders/pool", { as: FIELD });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json, { orders: [] }, "hàng chờ rỗng vẫn 200, không rơi vào route chi tiết đơn");
});

test("ADR-0030 L1-3 (a): hướng dẫn viên GET /api/orders → 200, CHỈ các đơn mình ĐANG phụ trách (kể cả đơn nháp), có tiền + SĐT; tìm theo SĐT/mã đơn cũng chỉ trong tập đó", async () => {
  const { w, ids } = await poolWorld();
  const cuaB = await orderHandledBy(w, FIELD_B);
  const nhapCuaA = ids.coNguoi; // đơn nháp giao cho FIELD lúc lập
  const daXacNhanCuaA = await orderHandledBy(w, FIELD);
  assert.equal((await w.call("POST", `/api/orders/${daXacNhanCuaA}/status`, { as: SALES, body: { status: "confirmed" } })).status, 200);
  const list = await w.call("GET", "/api/orders?limit=100", { as: FIELD });
  assert.equal(list.status, 200, list.text);
  assert.deepEqual(new Set(list.json.orders.map((o: any) => o.id)), new Set([nhapCuaA, daXacNhanCuaA]), "chỉ đơn HDV A đang phụ trách");
  for (const o of list.json.orders) {
    assert.equal(typeof o.total, "number", "đơn mình phụ trách: có tiền (money.view = assigned)");
    assert.equal(o.customerPhone, "0912345678", "đơn mình phụ trách: có SĐT (contact.view = assigned)");
  }
  const byPhone = await w.call("GET", "/api/orders?q=0912345678&limit=100", { as: FIELD });
  assert.equal(byPhone.status, 200, byPhone.text);
  assert.deepEqual(new Set(byPhone.json.orders.map((o: any) => o.id)), new Set([nhapCuaA, daXacNhanCuaA]), "tìm theo SĐT không lòi đơn người khác (mọi đơn thử cùng SĐT)");
  const drafts = await w.call("GET", "/api/orders?status=draft&limit=100", { as: FIELD });
  assert.deepEqual(drafts.json.orders.map((o: any) => o.id), [nhapCuaA], "lọc trạng thái áp TRONG tập đơn mình phụ trách");
  const listB = await w.call("GET", "/api/orders?limit=100", { as: FIELD_B });
  assert.deepEqual(listB.json.orders.map((o: any) => o.id), [cuaB], "HDV B chỉ thấy đơn của B");
});

test("ADR-0030 Review Focus 1: hướng dẫn viên KHÔNG phụ trách đơn nào → GET /api/orders trả DANH SÁCH RỖNG (tập rỗng KHÔNG có nghĩa là 'không lọc'), tìm theo SĐT/mã đơn cũng rỗng", async () => {
  const { w, ids } = await poolWorld();
  const r = await w.call("GET", "/api/orders?limit=100", { as: FIELD_B });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json, { orders: [], hasMore: false });
  const code = w.q("SELECT order_code FROM orders WHERE id = ?", ids.moi)[0].order_code;
  for (const q of ["0912345678", code, "Khách"]) {
    const s = await w.call("GET", `/api/orders?q=${encodeURIComponent(q)}`, { as: FIELD_B });
    assert.deepEqual(s.json.orders, [], `tìm "${q}"`);
  }
});

test("ADR-0030 L1-3 (c), S23-4: hướng dẫn viên mở chi tiết đơn HDV khác đang phụ trách, đơn chờ nhận, đơn không phụ trách → 404 — CÙNG câu trả lời với đơn không tồn tại", async () => {
  const { w, ids } = await poolWorld();
  const cuaB = await orderHandledBy(w, FIELD_B);
  const missing = await w.call("GET", `/api/orders/${NO_SUCH_ORDER}`, { as: FIELD });
  assert.equal(missing.status, 404);
  for (const [label, id] of [["đơn HDV B đang phụ trách", cuaB], ["đơn chờ nhận", ids.moi], ["đơn đã huỷ", ids.daHuy], ["đơn quá ngày đi", ids.quaNgay]] as const) {
    const r = await w.call("GET", `/api/orders/${id}`, { as: FIELD });
    assert.equal(r.status, 404, `${label}: ${r.text}`);
    assert.deepEqual(r.json, missing.json, `${label}: không phân biệt được với đơn không tồn tại`);
  }
});

test("ADR-0030 L1-3 (d), S23-3: hướng dẫn viên mở chi tiết đơn mình phụ trách → 200 ĐỦ (tiền, SĐT, lịch sử), không được sửa (canModify = false)", async () => {
  const { w, ids } = await poolWorld();
  const r = await w.call("GET", `/api/orders/${ids.coNguoi}`, { as: FIELD });
  assert.equal(r.status, 200, r.text);
  assert.equal(typeof r.json.order.total, "number");
  assert.equal(r.json.order.customerPhone, "0912345678");
  assert.ok(Array.isArray(r.json.history) && r.json.history.length >= 2, `lịch sử có dòng lập đơn + dòng giao người phụ trách: ${JSON.stringify(r.json.history)}`);
  assert.equal(r.json.canModify, false, "HDV không sửa/xác nhận đơn (order.modify = none)");
});

test("ADR-0030 Review Focus 1: tài khoản ghép Hướng dẫn viên + Thực tập thấy HỢP hai tập 'mình lập' ∪ 'mình phụ trách', không thấy đơn khác", async () => {
  const { w, ids } = await poolWorld();
  const minhLap = await newOrder(w, HDV_TT);
  const minhPhuTrach = await orderHandledBy(w, HDV_TT);
  const list = await w.call("GET", "/api/orders?limit=100", { as: HDV_TT });
  assert.equal(list.status, 200, list.text);
  assert.deepEqual(new Set(list.json.orders.map((o: any) => o.id)), new Set([minhLap, minhPhuTrach]));
  assert.equal((await w.call("GET", `/api/orders/${minhLap}`, { as: HDV_TT })).status, 200);
  assert.equal((await w.call("GET", `/api/orders/${minhPhuTrach}`, { as: HDV_TT })).status, 200);
  assert.equal((await w.call("GET", `/api/orders/${ids.moi}`, { as: HDV_TT })).status, 403, "đơn khác: 403 (không phải chỉ-assigned vì có ô own của Thực tập)");
});

test("ADR-0030 L1-13, Review Focus 2: Đối tác, Thực tập, tài khoản lai Hướng dẫn viên+Đối tác mở đơn người khác → vẫn 403 (không phải 404)", async () => {
  const { w, ids } = await poolWorld();
  for (const as of [PARTNER, INTERN, LAI_HDV]) {
    const r = await w.call("GET", `/api/orders/${ids.moi}`, { as });
    assert.equal(r.status, 403, `${as}: ${r.text}`);
    assert.equal(r.json.error.code, "forbidden", as);
  }
});

test("ADR-0030 L1-12, S23-5: hướng dẫn viên — GET /api/catalog/for-order → 403 ở THÂN route (can order.create), GET /api/catalog → 403 ở CỔNG office; Trang chủ và người phụ trách của các đơn → 403", async () => {
  const w = setup();
  const forOrder = await w.call("GET", "/api/catalog/for-order", { as: FIELD });
  assert.equal(forOrder.status, 403, forOrder.text);
  assert.equal(forOrder.json.error.message, "Tài khoản này không lập đơn nên không xem được danh mục dịch vụ.", "lời báo của THÂN route, không phải của cổng orders");
  const catalog = await w.call("GET", "/api/catalog", { as: FIELD });
  assert.equal(catalog.status, 403, catalog.text);
  assert.equal(catalog.json.error.message, "Tài khoản này chỉ dùng cho việc được giao, không dùng màn hình này.", "lời báo của cổng office");
  assert.equal((await w.call("GET", "/api/orders/dashboard", { as: FIELD })).status, 403, "Trang chủ = số toàn công ty: HDV không xem");
  const o = await newOrder(w, SALES);
  assert.equal((await w.call("GET", `/api/dispatch/handlers?orderIds=${o}`, { as: FIELD })).status, 403, "ruling điều phối: không mở route handlers cho HDV");
});

test("ADR-0030 S20-6/S20-12, L1-6: hướng dẫn viên Nhận đơn ở hàng chờ → 200, đơn rời hàng chờ và hiện ở danh sách + chi tiết của mình; HDV khác Nhận sau → 409 stale; HDV GIAO cho người khác → 403", async () => {
  const { w, ids } = await poolWorld();
  const nhan = await w.call("PUT", `/api/orders/${ids.moi}/handler`, { as: FIELD, body: { staffId: FIELD } });
  assert.equal(nhan.status, 200, nhan.text);
  assert.equal(nhan.json.handler.staffId, FIELD);
  const pool = await w.call("GET", "/api/orders/pool", { as: FIELD_B });
  assert.ok(!pool.json.orders.some((o: any) => o.orderId === ids.moi), "đơn vừa nhận rời hàng chờ");
  const list = await w.call("GET", "/api/orders?limit=100", { as: FIELD });
  assert.ok(list.json.orders.some((o: any) => o.id === ids.moi), "đơn vừa nhận hiện ở danh sách của HDV A");
  assert.equal((await w.call("GET", `/api/orders/${ids.moi}`, { as: FIELD })).status, 200);
  assert.equal((await w.call("GET", `/api/orders/${ids.moi}`, { as: FIELD_B })).status, 404, "HDV B: đơn người khác → 404");
  const tre = await w.call("PUT", `/api/orders/${ids.moi}/handler`, { as: FIELD_B, body: { staffId: FIELD_B } });
  assert.equal(tre.status, 409, tre.text);
  assert.equal(tre.json.error.code, "stale");
  const giao = await w.call("PUT", `/api/orders/${ids.chuaCoNgay}/handler`, { as: FIELD, body: { staffId: FIELD_B } });
  assert.equal(giao.status, 403, `HDV giao cho người khác: ${giao.text}`);
  assert.equal(w.q("SELECT count(*) n FROM dsp_assignment WHERE order_id = ? AND valid_to_at IS NULL", ids.chuaCoNgay)[0].n, 0, "403 không ghi");
  const lai = await w.call("PUT", `/api/orders/${ids.chuaCoNgay}/handler`, { as: LAI_HDV, body: { staffId: LAI_HDV } });
  assert.equal(lai.status, 403, `tài khoản lai Nhận: ${lai.text}`);
});
