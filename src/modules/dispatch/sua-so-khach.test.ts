// Hàng rào mức ROUTE cho `POST /api/orders/:id/handler-money-edit` (HDV sửa số khách) — hai luật chủ dự án duyệt 2026-09-30:
//  1. "Những lỗi của app đã báo sửa luôn": lý do sửa là chữ tự do, đi thẳng vào nhật ký chỉ-thêm (`audit_log.detail`) — máy chủ CHẶN lý do có dãy số
//     dài giống số điện thoại, DÙNG LẠI `hasLongDigitRun` (`src/shared/text-guards.ts`) như lý do "Khác" khi HDV huỷ đơn (ADR-0037), cùng câu báo lỗi.
//  2. "Cho sửa đến hết ngày đi": hướng dẫn viên chỉ sửa số khách tới HẾT ngày đi (giờ VN) — cùng luật `tripDeparted` của huỷ đơn (DK-T4-02);
//     Toàn quyền vẫn sửa được sau ngày đi.
// Cùng khuôn `huy-don-khac.test.ts`: gọi THẬT route qua `tests/audit/harness.mjs` rồi đọc thẳng `audit_log` / `order_money_adjustment` (bài học
// ADR-0037: bài kiểm hàm thuần một mình để đột biến sống sót).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
import { PHONE_IN_TEXT_MESSAGE } from "../../shared/text-guards.ts";

const SALES = "11111111-1111-4111-8111-111111111111";
const FIELD = "44444444-4444-4444-8444-444444444444";
const SUPER = "55555555-5555-4555-8555-555555555555";

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: FIELD, phone: "0900000004", name: "Hướng Dẫn", perms: ["FIELD"] });
  seedStaff(w.sqlite, { id: SUPER, phone: "0900000005", name: "Toàn Quyền", perms: ["SUPER_ADMIN"] });
  w.sqlite.exec("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('ZA1', 'Tour đảo', 'perPax', 500000, 1, '2026-01-01', '2026-01-01')");
  return w;
}
/** Ngày theo giờ VN, lệch `n` ngày so với hôm nay (cùng cách `huy-don-khac.test.ts`). */
const vnDay = (n: number) => new Date(Date.now() + 7 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);
const orderBody = () => ({
  customerName: "Khách Thử", customerPhone: "0912345678",
  services: [{ kind: "catalog", catalogCode: "ZA1", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 500000 }, departDate: vnDay(3) }],
});
async function confirmedForField(w: any): Promise<string> {
  const created = await w.call("POST", "/api/orders", { as: SALES, body: orderBody() });
  assert.equal(created.status, 201, created.text);
  const orderId = created.json.order.id;
  assert.equal((await w.call("POST", `/api/orders/${orderId}/status`, { as: SALES, body: { status: "confirmed" } })).status, 200);
  assert.equal((await w.call("PUT", `/api/orders/${orderId}/handler`, { as: SALES, body: { staffId: FIELD } })).status, 200);
  return orderId;
}
const svcId = (w: any, orderId: string) => w.q("SELECT id FROM order_service WHERE order_id = ?", orderId)[0].id;
const edit = (w: any, as: string, orderId: string, reason: string, adult = 3) =>
  w.call("POST", `/api/orders/${orderId}/handler-money-edit`, { as, body: { reason, services: [{ id: svcId(w, orderId), pax: { adult, child: 0, senior: 0, infant: 0 } }] } });
const auditCount = (w: any, orderId: string) => w.q("SELECT COUNT(*) AS n FROM audit_log WHERE order_id = ?", orderId)[0].n;
const adjCount = (w: any, orderId: string) => w.q("SELECT COUNT(*) AS n FROM order_money_adjustment WHERE order_id = ?", orderId)[0].n;
/** Mô phỏng thời gian trôi: dời ngày đi của mọi dịch vụ (như e2e `dispatch.mjs` 13b). */
const setDepart = (w: any, orderId: string, date: string) => w.sqlite.prepare("UPDATE order_service SET depart_date = ? WHERE order_id = ?").run(date, orderId);

test("Lý do sửa số khách chứa số điện thoại (nhiều cách viết) → 400 đúng câu của lý do huỷ, KHÔNG ghi nhật ký, KHÔNG ghi dòng điều chỉnh", async () => {
  const w = setup();
  const orderId = await confirmedForField(w);
  const truocNhatKy = auditCount(w, orderId);
  for (const reason of ["Khách thêm người, gọi 0905 123 456", "0905123456", "liên hệ +84 905 123 456", "số (0258) 3521 234", "0905.123.456 báo thêm"]) {
    const r = await edit(w, FIELD, orderId, reason);
    assert.equal(r.status, 400, `${reason}: ${r.text}`);
    assert.equal(r.json.error.code, "invalid_input");
    assert.equal(r.json.error.message, PHONE_IN_TEXT_MESSAGE, "cùng câu tiếng Việt với lý do 'Khác' khi huỷ");
  }
  assert.equal(auditCount(w, orderId), truocNhatKy, "400 không ghi thêm dòng nhật ký nào");
  assert.equal(adjCount(w, orderId), 0, "400 không ghi dòng điều chỉnh nào");
});

test("Lý do sửa số khách có số ngắn (số phòng, số khách) → vẫn nhận (200)", async () => {
  const w = setup();
  const orderId = await confirmedForField(w);
  const r = await edit(w, FIELD, orderId, "Khách thêm 1 người, phòng 1203");
  assert.equal(r.status, 200, r.text);
  assert.equal(adjCount(w, orderId), 1);
});

test("Hướng dẫn viên sửa số khách: ĐÚNG ngày đi (giờ VN) vẫn sửa được", async () => {
  const w = setup();
  const orderId = await confirmedForField(w);
  setDepart(w, orderId, vnDay(0));
  const r = await edit(w, FIELD, orderId, "Khách thêm người");
  assert.equal(r.status, 200, r.text);
});

test("Hướng dẫn viên sửa số khách: từ hôm sau ngày đi → 409 `departed`, câu tiếng Việt, không ghi gì", async () => {
  const w = setup();
  const orderId = await confirmedForField(w);
  setDepart(w, orderId, vnDay(-1));
  const truocNhatKy = auditCount(w, orderId);
  const r = await edit(w, FIELD, orderId, "Khách thêm người");
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "departed");
  assert.match(r.json.error.message, /đã qua ngày đi/);
  assert.match(r.json.error.message, /Toàn quyền/);
  assert.equal(auditCount(w, orderId), truocNhatKy);
  assert.equal(adjCount(w, orderId), 0);
});

test("Toàn quyền sửa số khách SAU ngày đi vẫn được (200)", async () => {
  const w = setup();
  const orderId = await confirmedForField(w);
  setDepart(w, orderId, vnDay(-2));
  const r = await edit(w, SUPER, orderId, "Văn phòng chỉnh sau tour");
  assert.equal(r.status, 200, r.text);
  assert.equal(adjCount(w, orderId), 1);
});

// ADR-0109 bài 9 (NT-11): đường HDV `handler-money-edit` dùng CÙNG hàm phải thu — bớt khách tới giảm giá > tạm tính thì "Việc của tôi" và khối Thanh toán đều
// thấy phải thu 0 (không âm), dư = đúng số khách đã trả (kiểm toán 24/9 DK-T2-02 từng chứng minh tổng âm trên chính đường này).
test("ADR-0109: HDV bớt khách tới giảm giá > tạm tính → GET /api/dispatch/mine total 0; khối Thanh toán phải thu 0, dư = đã thu", async () => {
  const w = setup();
  const created = await w.call("POST", "/api/orders", { as: SALES, body: { ...orderBody(), discount: 800000 } });
  assert.equal(created.status, 201, created.text);
  const orderId = created.json.order.id;
  assert.equal((await w.call("POST", `/api/orders/${orderId}/status`, { as: SALES, body: { status: "confirmed" } })).status, 200);
  assert.equal((await w.call("PUT", `/api/orders/${orderId}/handler`, { as: SALES, body: { staffId: FIELD } })).status, 200);
  assert.equal((await w.call("POST", `/api/orders/${orderId}/payments`, { as: FIELD, body: { soTien: 200000, hinhThuc: "CASH", nguoiThu: "toi" } })).status, 201);
  const r = await edit(w, FIELD, orderId, "Khách bớt người", 1);
  assert.equal(r.status, 200, r.text);
  const mine = (await w.call("GET", "/api/dispatch/mine", { as: FIELD })).json.assignments as { orderId: string; total: number }[];
  assert.equal(mine.find((a) => a.orderId === orderId)?.total, 0, "max(0, 500.000 − 800.000)");
  const p = (await w.call("GET", `/api/orders/${orderId}/payments`, { as: FIELD })).json;
  assert.deepEqual([p.phaiThu, p.daThu, p.conLai, p.du], [0, 200000, 0, 200000]);
});
