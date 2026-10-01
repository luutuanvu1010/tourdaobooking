// ADR-0047 A2 — danh sách hành khách (kế hoạch Task A12): ô MỚI `order.passenger.write` (= `order.modify`), route `GET /api/orders/:id/passengers`
// (`order.view` rồi `contact.view` theo phạm vi đơn — chỉ-FIELD không phụ trách → 404 như chi tiết đơn) và `POST /api/orders/:id/passengers` (đơn ĐÃ XÁC
// NHẬN: thêm dòng, sửa = dòng mới cùng person_key, huỷ = mọi dòng của người đó — R8; đơn nháp → 409 use_order_form — R1). Đơn nháp: danh sách đi trong
// thân POST/PUT /api/orders (khoá có mặt → hỏi thêm ô). Cờ "danh sách nhiều hơn số khách" (R9) dùng số khách HIỆU LỰC. Nhật ký chỉ số lượng.
// Chạy CẢ ứng dụng trên SQLite thật. Tên khách là tên GIẢ có đánh dấu, năm sinh hiếm.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { maskSource } from "../../../scripts/source-mask-lib.mjs";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const SALES_B = "22222222-2222-4222-8222-222222222222";
const ADM = "33333333-3333-4333-8333-333333333333";
const FIELD = "44444444-4444-4444-8444-444444444444";
const ACC = "55555555-5555-4555-8555-555555555555";
const DRIVER = "66666666-6666-4666-8666-666666666666";
const PARTNER = "88888888-8888-4888-8888-888888888888";
const inDays = (n: number) => new Date(Date.now() + 7 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);
const D = inDays(3);

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: SALES_B, phone: "0900000002", name: "Bình", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: FIELD, phone: "0900000004", name: "Hướng Dẫn", perms: ["FIELD"] });
  seedStaff(w.sqlite, { id: ACC, phone: "0900000005", name: "Kế toán", perms: ["ACCOUNTING"] });
  seedStaff(w.sqlite, { id: DRIVER, phone: "0900000006", name: "Tài Xế", perms: ["DRIVER"] });
  seedStaff(w.sqlite, { id: PARTNER, phone: "0900000008", name: "Đối tác", perms: ["PARTNER"] });
  w.sqlite.exec("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('ZA1', 'Tour đảo', 'perPax', 500000, 1, '2026-01-01', '2026-01-01')");
  return w;
}
const P = (n: number, year = 1911) => ({ fullName: `Khách Dò Tìm ${n}`, birthYear: year, paxCode: null });
const body = (extra: Record<string, unknown> = {}) => ({
  customerName: "Khách Thử", customerPhone: "0912345678",
  services: [{ kind: "catalog", catalogCode: "ZA1", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 500000 }, departDate: D }], ...extra,
});
async function draft(w: any, as = SALES, extra: Record<string, unknown> = {}) {
  const r = await w.call("POST", "/api/orders", { as, body: body(extra) });
  assert.equal(r.status, 201, r.text);
  return r.json.order;
}
async function confirmed(w: any, as = SALES, extra: Record<string, unknown> = {}) {
  const o = await draft(w, as, extra);
  assert.equal((await w.call("POST", `/api/orders/${o.id}/status`, { as, body: { status: "confirmed" } })).status, 200);
  return (await w.call("GET", `/api/orders/${o.id}`, { as: ADM })).json.order;
}
const list = (w: any, id: string, as = SALES) => w.call("GET", `/api/orders/${id}/passengers`, { as });
const change = (w: any, id: string, as: string, expected: string, c: Record<string, unknown>) =>
  w.call("POST", `/api/orders/${id}/passengers`, { as, body: { expectedUpdatedAt: expected, them: [], sua: [], huy: [], ...c } });

test("đơn nháp: lập kèm 3 người → GET 3; lưu nháp KHÔNG gửi passengers → vẫn 3; gửi passengers: [] → 0; nhật ký chỉ 'danh sách khách: N người'", async () => {
  const w = setup();
  const o = await draft(w, SALES, { passengers: [P(1), P(2), P(3)] });
  const g = await list(w, o.id);
  assert.equal(g.status, 200, g.text);
  assert.deepEqual(g.json.passengers.map((p: any) => p.fullName).sort(), ["Khách Dò Tìm 1", "Khách Dò Tìm 2", "Khách Dò Tìm 3"]);
  assert.deepEqual(Object.keys(g.json.passengers[0]).sort(), ["birthYear", "fullName", "paxCode", "personKey", "rowId", "updatedAt"]);
  const keep = await w.call("PUT", `/api/orders/${o.id}`, { as: SALES, body: body({ expectedUpdatedAt: o.updatedAt, services: [{ ...body().services[0], id: o.services[0].id }] }) });
  assert.equal(keep.status, 200, keep.text);
  assert.equal((await list(w, o.id)).json.passengers.length, 3);
  const empty = await w.call("PUT", `/api/orders/${o.id}`, { as: SALES, body: body({ expectedUpdatedAt: keep.json.order.updatedAt, services: [{ ...body().services[0], id: o.services[0].id }], passengers: [] }) });
  assert.equal(empty.status, 200, empty.text);
  assert.equal((await list(w, o.id)).json.passengers.length, 0);
  const details = w.q("SELECT detail FROM audit_log WHERE order_id = ?", o.id).map((r: any) => r.detail ?? "").join(" | ");
  assert.match(details, /danh sách khách: 3 người/);
  assert.match(details, /danh sách khách: 0 người/);
  assert.doesNotMatch(details, /Dò Tìm|1911/);
});

test("sau xác nhận: thêm 1 → 4; sửa tên A → vẫn 4, personKey giữ, rowId đổi, dòng cũ CÒN; huỷ B → 3, mọi dòng của B có voided_at; nhật ký đúng khuôn đếm", async () => {
  const w = setup();
  const o = await confirmed(w, SALES, { passengers: [P(1), P(2), P(3)] });
  const r1 = await change(w, o.id, SALES, o.updatedAt, { them: [P(4, 1922)] });
  assert.equal(r1.status, 200, r1.text);
  assert.equal(r1.json.passengers.length, 4);
  const a = r1.json.passengers.find((p: any) => p.fullName === "Khách Dò Tìm 1");
  const r2 = await change(w, o.id, SALES, r1.json.orderUpdatedAt, { sua: [{ personKey: a.personKey, fullName: "Khách Dò Tìm Một Sửa", birthYear: 1911, paxCode: "adult" }] });
  assert.equal(r2.status, 200, r2.text);
  assert.equal(r2.json.passengers.length, 4);
  const a2 = r2.json.passengers.find((p: any) => p.personKey === a.personKey);
  assert.equal(a2.fullName, "Khách Dò Tìm Một Sửa");
  assert.notEqual(a2.rowId, a.rowId);
  assert.equal(w.q("SELECT count(*) n FROM ord_passenger WHERE person_key = ?", a.personKey)[0].n, 2, "dòng cũ còn trong CSDL");
  const b = r2.json.passengers.find((p: any) => p.fullName === "Khách Dò Tìm 2");
  const r3 = await change(w, o.id, SALES, r2.json.orderUpdatedAt, { huy: [b.personKey] });
  assert.equal(r3.status, 200, r3.text);
  assert.equal(r3.json.passengers.length, 3);
  assert.deepEqual(w.q("SELECT voided_at IS NOT NULL AS v FROM ord_passenger WHERE person_key = ?", b.personKey).map((r: any) => r.v), [1]);
  // huỷ người ĐÃ sửa (hai dòng) → cả hai dòng có voided_at, mới trước cũ sau
  const r4 = await change(w, o.id, SALES, r3.json.orderUpdatedAt, { huy: [a.personKey] });
  assert.equal(r4.status, 200, r4.text);
  assert.deepEqual(w.q("SELECT voided_at IS NOT NULL AS v FROM ord_passenger WHERE person_key = ?", a.personKey).map((r: any) => r.v), [1, 1]);
  const logs = w.q("SELECT detail FROM audit_log WHERE order_id = ? AND action = 'order_passenger_changed' ORDER BY rowid", o.id).map((r: any) => r.detail);
  assert.deepEqual(logs, ["thêm 1, sửa 0, huỷ 0 khách", "thêm 0, sửa 1, huỷ 0 khách", "thêm 0, sửa 0, huỷ 1 khách", "thêm 0, sửa 0, huỷ 1 khách"]);
});

test("quyền: Đối tác (đơn CỦA MÌNH) GET/POST 200; Đối tác (đơn người khác) 403; Kế toán GET 200, POST 403; người lập khác POST 403; Quản trị POST 200", async () => {
  const w = setup();
  const mine = await confirmed(w, PARTNER, { passengers: [P(1)] });
  const other = await confirmed(w, SALES, { passengers: [P(1)] });
  assert.equal((await list(w, mine.id, PARTNER)).status, 200);
  assert.equal((await change(w, mine.id, PARTNER, mine.updatedAt, { them: [P(2)] })).status, 200);
  assert.equal((await list(w, other.id, PARTNER)).status, 403);
  assert.equal((await change(w, other.id, PARTNER, other.updatedAt, { them: [P(2)] })).status, 403);
  assert.equal((await list(w, other.id, ACC)).status, 200);
  assert.equal((await change(w, other.id, ACC, other.updatedAt, { them: [P(2)] })).status, 403);
  assert.equal((await change(w, other.id, SALES_B, other.updatedAt, { them: [P(2)] })).status, 403);
  assert.equal((await change(w, other.id, ADM, other.updatedAt, { them: [P(2)] })).status, 200);
});

test("Hướng dẫn viên: GET đơn ĐANG phụ trách → 200; đơn khác → 404 (như chi tiết đơn); POST → 403. Tài khoản chỉ Tài xế → 403 ở cổng", async () => {
  const w = setup();
  const handled = await confirmed(w, SALES, { passengers: [P(1)], handlerStaffId: FIELD });
  const other = await confirmed(w, SALES, { passengers: [P(1)] });
  assert.equal((await list(w, handled.id, FIELD)).status, 200);
  const nf = await list(w, other.id, FIELD);
  assert.equal(nf.status, 404, nf.text);
  assert.equal((await change(w, handled.id, FIELD, handled.updatedAt, { them: [P(2)] })).status, 403);
  assert.equal((await list(w, handled.id, DRIVER)).status, 403);
  assert.equal((await change(w, handled.id, DRIVER, handled.updatedAt, { them: [P(2)] })).status, 403);
});

test("POST /passengers: đơn nháp → 409 use_order_form; đơn huỷ → 409 not_editable; mốc cũ → 409 stale; sửa người không có → 400; không đổi gì → 200 không ghi", async () => {
  const w = setup();
  const d = await draft(w, SALES, { passengers: [P(1)] });
  const r = await change(w, d.id, SALES, d.updatedAt, { them: [P(2)] });
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "use_order_form");
  const o = await confirmed(w, SALES, { passengers: [P(1)] });
  assert.equal((await change(w, o.id, SALES, "2020-01-01T00:00:00.000Z", { them: [P(2)] })).json.error.code, "stale");
  assert.equal((await change(w, o.id, SALES, o.updatedAt, { sua: [{ personKey: "00000000-0000-4000-8000-000000000000", ...P(9) }] })).status, 400);
  assert.equal((await change(w, o.id, SALES, o.updatedAt, { them: [{ ...P(2), birthYear: 1800 }] })).status, 400);
  const logs = w.q("SELECT count(*) n FROM audit_log WHERE order_id = ?", o.id)[0].n;
  const same = (await list(w, o.id)).json.passengers[0];
  const noop = await change(w, o.id, SALES, o.updatedAt, { sua: [{ personKey: same.personKey, fullName: same.fullName, birthYear: same.birthYear, paxCode: same.paxCode }] });
  assert.equal(noop.status, 200, noop.text);
  assert.equal(w.q("SELECT count(*) n FROM audit_log WHERE order_id = ?", o.id)[0].n, logs, "không đổi gì → không nhật ký");
  assert.equal((await w.call("POST", `/api/orders/${o.id}/status`, { as: SALES, body: { status: "cancelled" } })).status, 200);
  const c = (await w.call("GET", `/api/orders/${o.id}`, { as: SALES })).json.order;
  assert.equal((await change(w, o.id, SALES, c.updatedAt, { them: [P(2)] })).json.error.code, "not_editable");
});

test("cờ vượt số khách (R9): đơn 2 khách, danh sách 3 người → vuotSoKhach true, soKhachDoan 2; HDV sửa số khách lên 3 (số khách HIỆU LỰC) → false", async () => {
  const w = setup();
  const o = await confirmed(w, SALES, { passengers: [P(1), P(2), P(3)], handlerStaffId: FIELD });
  const g = (await list(w, o.id)).json;
  assert.deepEqual([g.soNguoiCoTen, g.soKhachDoan, g.vuotSoKhach], [3, 2, true]);
  const edit = await w.call("POST", `/api/orders/${o.id}/handler-money-edit`, {
    as: FIELD,
    body: { reason: "Khách thêm một người", services: [{ id: o.services[0].id, pax: { adult: 3, child: 0, senior: 0, infant: 0 } }] },
  });
  assert.equal(edit.status, 200, edit.text);
  const g2 = (await list(w, o.id)).json;
  assert.deepEqual([g2.soNguoiCoTen, g2.soKhachDoan, g2.vuotSoKhach], [3, 3, false]);
});

// Review Focus 6: ô mới hôm nay BẰNG order.modify nên test hành vi không bắt được việc QUÊN hỏi ô ở đường nháp. Bài KHOÁ VĂN BẢN: thân handler
// POST /api/orders và PUT /api/orders (src/modules/orders/index.ts, đã che chú thích) phải có `can(…, "order.passenger.write", …)`.
// GIỚI HẠN: canh QUÊN, không canh CỐ Ý (không biết lời hỏi có chặn thật, có đứng trước ghi hay không — test hành vi + người kiểm đọc mã lo phần đó).
test("khoá văn bản (Review Focus 6): POST /api/orders và PUT /api/orders hỏi can(…, \"order.passenger.write\", …) trong thân handler", () => {
  const src = readFileSync(new URL("./index.ts", import.meta.url), "utf8");
  const code = maskSource(src, { strings: false, comments: true });
  const body = (method: string, path: string): string => {
    const start = code.indexOf(`route("${method}", "${path}", `);
    assert.ok(start >= 0, `không thấy route ${method} ${path}`);
    const next = code.indexOf("route(", start + 10);
    return code.slice(start, next === -1 ? code.length : next);
  };
  for (const [m, p] of [["POST", "/api/orders"], ["PUT", "/api/orders/:id"]] as const) {
    assert.match(body(m, p), /can\(\s*staff\s*,\s*"order\.passenger\.write"/, `${m} ${p}: thiếu lời hỏi ô order.passenger.write khi thân có khoá passengers`);
  }
});

// PM-2 (nợ nhỏ 2026-10-01): GET /passengers trả người THEO THỨ TỰ NHẬP. Cả lô cùng `created_at` ⇒ trước đây hoà giờ sắp theo `id` (UUID ngẫu nhiên) ⇒
// thứ tự lộn. Nay hoà giờ sắp theo `rowid` (thứ tự chèn trong lô). Người đã sửa tên (dòng thay thế) GIỮ chỗ của người đó; người thêm sau đứng cuối.
test("PM-2: danh sách theo thứ tự nhập — nháp 8 người đúng thứ tự; lưu nháp đảo thứ tự → theo thứ tự mới; sau xác nhận sửa tên người đầu vẫn đứng đầu, thêm người đứng cuối", async () => {
  const w = setup();
  const names = (r: any) => r.json.passengers.map((p: any) => p.fullName);
  const nhap = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => P(n));
  const o = await draft(w, SALES, { passengers: nhap });
  assert.deepEqual(names(await list(w, o.id)), nhap.map((p) => p.fullName));
  const dao = [...nhap].reverse();
  const put = await w.call("PUT", `/api/orders/${o.id}`, { as: SALES, body: body({ expectedUpdatedAt: o.updatedAt, services: [{ ...body().services[0], id: o.services[0].id }], passengers: dao }) });
  assert.equal(put.status, 200, put.text);
  assert.deepEqual(names(await list(w, o.id)), dao.map((p) => p.fullName));
  assert.equal((await w.call("POST", `/api/orders/${o.id}/status`, { as: SALES, body: { status: "confirmed" } })).status, 200);
  const g = (await list(w, o.id)).json;
  const dau = g.passengers[0];
  const r1 = await change(w, o.id, SALES, g.orderUpdatedAt, { sua: [{ personKey: dau.personKey, fullName: "Khách Dò Tìm Đầu Sửa", birthYear: 1911, paxCode: null }] });
  assert.equal(r1.status, 200, r1.text);
  const r2 = await change(w, o.id, SALES, r1.json.orderUpdatedAt, { them: [P(9), P(10)] });
  assert.equal(r2.status, 200, r2.text);
  assert.deepEqual(names(await list(w, o.id)), ["Khách Dò Tìm Đầu Sửa", ...dao.slice(1).map((p) => p.fullName), "Khách Dò Tìm 9", "Khách Dò Tìm 10"]);
});
