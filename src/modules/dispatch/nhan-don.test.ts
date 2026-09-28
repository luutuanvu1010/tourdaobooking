// Chốt Nhận (N-2, ADR-0030 S20-5) + chặn tài khoản lai: hành vi API thật (PUT /api/orders/:id/handler) trên SQLite thật qua khung tests/audit/harness.mjs
// (cùng khuôn xem-don-theo-quyen.test.ts). `rules.test.ts` đã kiểm luật thuần (checkAssignee, handlerChangeVerdict); tệp này kiểm ĐÚNG route ghép luật đó
// với dữ liệu (đơn đã huỷ, đơn quá ngày đi, tài khoản lai).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const SALES2 = "22222222-2222-4222-8222-222222222222";
const ADM = "33333333-3333-4333-8333-333333333333";
const PARTNER = "88888888-8888-4888-8888-888888888888";
const LAI = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"; // SALES + PARTNER (tài khoản lai)

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: SALES2, phone: "0900000002", name: "Bình", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: PARTNER, phone: "0900000008", name: "Đối tác", perms: ["PARTNER"] });
  seedStaff(w.sqlite, { id: LAI, phone: "0900000010", name: "Lai Đôi", perms: ["SALES", "PARTNER"] });
  w.sqlite.exec("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('ZA1', 'Tour đảo', 'perPax', 500000, 1, '2026-01-01', '2026-01-01')");
  return w;
}
const inDays = (n: number) => new Date(Date.now() + 7 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);
const orderBody = (departDate = inDays(3)) => ({
  customerName: "Khách Thử", customerPhone: "0912345678",
  services: [{ kind: "catalog", catalogCode: "ZA1", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 500000 }, departDate }],
  depositAmount: 200000, depositMethod: "cash",
});
/** Đơn do PARTNER lập: KHÔNG có người phụ trách mặc định (ADR-0014 điều 9/10, checkAssignee từ chối PARTNER). */
async function newUnhandledOrder(w: any, departDate?: string): Promise<string> {
  const r = await w.call("POST", "/api/orders", { as: PARTNER, body: orderBody(departDate) });
  assert.equal(r.status, 201, r.text);
  return r.json.order.id;
}
const claim = (w: any, orderId: string, as: string) => w.call("PUT", `/api/orders/${orderId}/handler`, { as, body: { staffId: as } });
const assignTo = (w: any, orderId: string, as: string, staffId: string) => w.call("PUT", `/api/orders/${orderId}/handler`, { as, body: { staffId } });

test("Nhận đơn ĐÃ HUỶ, chưa có người phụ trách → 409 cancelled (chốt Nhận N-2, ADR-0030 S20-5) — hôm nay (đỏ) trả 200", async () => {
  const w = setup();
  const orderId = await newUnhandledOrder(w);
  const cancel = await w.call("POST", `/api/orders/${orderId}/status`, { as: ADM, body: { status: "cancelled" } });
  assert.equal(cancel.status, 200, cancel.text);

  const r = await claim(w, orderId, SALES);
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "cancelled");
  // không ghi được người phụ trách cho đơn đã huỷ qua đường Nhận
  assert.equal(w.q("SELECT count(*) n FROM dsp_assignment WHERE order_id = ? AND valid_to_at IS NULL", orderId)[0].n, 0);
});

test("Nhận đơn có ngày đi HÔM QUA (giờ VN), chưa có người phụ trách → 409 departed — hôm nay (đỏ) trả 200", async () => {
  const w = setup();
  const orderId = await newUnhandledOrder(w, inDays(-1));

  const r = await claim(w, orderId, SALES);
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "departed");
});

test("Quản trị GIAO Bán hàng cho đơn ĐÃ HUỶ (không phải Nhận) → vẫn 200 (không đổi hành vi giao)", async () => {
  const w = setup();
  const orderId = await newUnhandledOrder(w);
  assert.equal((await w.call("POST", `/api/orders/${orderId}/status`, { as: ADM, body: { status: "cancelled" } })).status, 200);

  const r = await assignTo(w, orderId, ADM, SALES);
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.handler.staffId, SALES);
});

test("tài khoản LAI (SALES + PARTNER) tự Nhận đơn chưa có người → 403 (chặn tài khoản lai, ADR-0030 S20-5)", async () => {
  const w = setup();
  const orderId = await newUnhandledOrder(w);
  const logs = w.q("SELECT count(*) n FROM audit_log")[0].n;

  const r = await claim(w, orderId, LAI);
  assert.equal(r.status, 403, r.text);
  assert.equal(w.q("SELECT count(*) n FROM audit_log")[0].n, logs, "403 không ghi nhật ký");
  assert.equal(w.q("SELECT count(*) n FROM dsp_assignment WHERE order_id = ? AND valid_to_at IS NULL", orderId)[0].n, 0);
});

test("Bán hàng thường Nhận đơn hợp lệ (chưa huỷ, chưa qua ngày đi, chưa có người) → 200 (hành vi cũ giữ nguyên)", async () => {
  const w = setup();
  const orderId = await newUnhandledOrder(w);
  const r = await claim(w, orderId, SALES);
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.handler.staffId, SALES);
});
