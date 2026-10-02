// Thử phá (red team) tầng API + CSDL — kiểm toán kiến trúc 2026-09-22 (docs/AUDIT-2026-09-22-KIEN-TRUC.md). TEST ĐẶC TẢ HIỆN TRẠNG, KHÔNG phải test hồi quy:
//   "PASS"    = hệ thống giữ được bất biến (test khẳng định hành vi đúng);
//   "FINDING" = hệ thống KHÔNG giữ được (test khẳng định hành vi YẾU hiện tại — khi sửa phát hiện thì test này ĐỎ; lúc đó đổi nó thành test hồi quy ở src/ hoặc tests/e2e/).
// Cố ý nằm NGOÀI glob `src/**/*.test.ts` của `npm test`. Chạy: node --test "tests/audit/*.test.mjs"
import { test } from "node:test";
import assert from "node:assert/strict";
import { world, seedStaff } from "./harness.mjs";

const A = "11111111-1111-4111-8111-111111111111"; // SALES
const B = "22222222-2222-4222-8222-222222222222"; // SALES khác
const ADM = "33333333-3333-4333-8333-333333333333"; // ADMIN
const F = "44444444-4444-4444-8444-444444444444"; // FIELD
const K = "55555555-5555-4555-8555-555555555555"; // ACCOUNTING
const SUP = "77777777-7777-4777-8777-777777777777"; // SUPER_ADMIN — ADR-0038: chỉ Toàn quyền xử lý Góp ý

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: A, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: B, phone: "0900000002", name: "Bình", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: F, phone: "0900000004", name: "Thực địa", perms: ["FIELD"] });
  seedStaff(w.sqlite, { id: K, phone: "0900000005", name: "Kế toán", perms: ["ACCOUNTING"] });
  seedStaff(w.sqlite, { id: SUP, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  // 2026-09-26 (DK-T3-01): API không nhận dịch vụ nhập tay mới → đơn thử dùng dịch vụ danh mục GIẢ (cùng số tiền 2 × 500.000 với dịch vụ nhập tay cũ).
  w.sqlite.exec("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('ZA1', 'Tour đảo', 'perPax', 500000, 1, '2026-01-01', '2026-01-01')");
  return w;
}
const inDays = (n) => new Date(Date.now() + 7 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);
const orderBody = (extra = {}) => ({
  customerName: "Khách Một", customerPhone: "0912345678",
  services: [{ kind: "catalog", catalogCode: "ZA1", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 500000 }, departDate: inDays(3) }],
  ...extra,
});

// ADR-0094 (lớp chống ghi trùng, giai đoạn 1): R1/R2 ở đây gửi KHÔNG VÉ nên vẫn ra 2 bản ghi — đúng thiết kế "thiếu vé cho qua và đếm" (đ7). Chúng chỉ
// chuyển PASS ở BẢN SIẾT (thiếu vé ⇒ 400). Bài HỒI QUY có vé nằm trong npm test: src/lan-gui-hanh-vi.test.ts ca (a), (c) (R1) và (i) (R2).
test("R1 FINDING idempotency: gửi lại cùng POST /api/orders (bấm 2 lần / mạng chập) tạo 2 đơn", async () => {
  const w = setup();
  const r1 = await w.call("POST", "/api/orders", { as: A, body: orderBody() });
  const r2 = await w.call("POST", "/api/orders", { as: A, body: orderBody() });
  assert.equal(r1.status, 201, r1.text);
  assert.equal(r2.status, 201);
  assert.equal(w.q("SELECT count(*) n FROM orders")[0].n, 2);
});

// SĐT dùng chung giữa nhiều hồ sơ là HỢP LỆ theo thiết kế (ADR-0001 mục 8, chỉ mục KHÔNG duy nhất). Phát hiện ở đây là: chống trùng chỉ là GỢI Ý ở giao diện
// (/api/parties/lookup); máy chủ tạo hồ sơ mới vô điều kiện, nên cùng một lần bấm gửi lặp sinh hai hồ sơ cho cùng một người.
test("R2 FINDING identity: gửi lại POST có newBooker tạo 2 hồ sơ khách cùng SĐT", async () => {
  const w = setup();
  const body = orderBody({ newBooker: { fullName: "Trần Khách", phone: "0912345678" } });
  await w.call("POST", "/api/orders", { as: A, body });
  await w.call("POST", "/api/orders", { as: A, body });
  const n = w.q("SELECT count(DISTINCT party_id) n FROM pty_contact_point WHERE value_normalized = '0912345678'")[0].n;
  assert.equal(n, 2);
});

test("R3 PASS authz (ADR-0013, vá 2026-…): SALES không đổi tên/ngưng hồ sơ quản trị viên — 403, tên không đổi", async () => {
  const w = setup();
  const cur = await w.call("GET", `/api/parties/pty-${ADM}`, { as: B });
  assert.equal(cur.status, 200, cur.text);
  const p = cur.json.party;
  const r = await w.call("PUT", `/api/parties/pty-${ADM}`, { as: B, body: { name: { family: null, middle: null, given: "Kẻ Mạo Danh" }, familyName: null, middleName: null, givenName: "Kẻ Mạo Danh", active: false, expectedUpdatedAt: p.updatedAt } });
  const label = w.q(`SELECT label FROM v_stf_staff_label WHERE id = ?`, ADM)[0].label;
  const active = w.q(`SELECT active FROM pty_party WHERE id = ?`, `pty-${ADM}`)[0].active;
  console.log("R3 status", r.status, "label=", label, "party.active=", active, r.status !== 200 ? r.text : "");
  assert.equal(r.status, 403);
  assert.equal(label, "Quản trị");
});

test("R3b PASS authz (ADR-0013, vá 2026-…): SALES không đổi được tên đồng nghiệp — 403; người phụ trách và người lập vẫn mang tên thật", async () => {
  const w = setup();
  const o = (await w.call("POST", "/api/orders", { as: A, body: orderBody() })).json.order;
  // Từ ADR-0030 S20-4 đơn mới không tự gắn người lập: A Nhận tường minh để đơn có người phụ trách mang tên A (điều bài này kiểm).
  assert.equal((await w.call("PUT", `/api/orders/${o.id}/handler`, { as: A, body: { staffId: A } })).status, 200);
  const p = (await w.call("GET", `/api/parties/pty-${A}`, { as: B })).json.party;
  const r = await w.call("PUT", `/api/parties/pty-${A}`, { as: B, body: { familyName: null, middleName: null, givenName: "Tên Giả", active: true, expectedUpdatedAt: p.updatedAt } });
  assert.equal(r.status, 403, r.text);
  const h = await w.call("GET", `/api/dispatch/handlers?orderIds=${o.id}`, { as: B });
  assert.equal(h.json.handlers[o.id].name, "An");
  assert.equal((await w.call("GET", `/api/orders/${o.id}`, { as: B })).json.order.staffName, "An");
});

// 2026-09-24 (docs/evidence/2026-09-24-lo-hong-ho-so/): F-01 rộng hơn kiểm toán ghi — không chỉ tên/ngưng mà cả LIÊN HỆ của hồ sơ nhân viên.
// Đặc tả 11 vai dự định hiện "SĐT công việc trong hồ sơ" của người phụ trách cho đối tác → số bị cài ở đây sẽ đi ra ngoài.
test("R3c PASS authz (ADR-0013, vá 2026-…): SALES không thêm SĐT vào hồ sơ quản trị viên — 403, không có dòng liên hệ", async () => {
  const w = setup();
  const r = await w.call("POST", `/api/parties/pty-${ADM}/contacts`, { as: B, body: { kind: "PHONE", value: "0911222333", label: "Zalo", isPrimary: true } });
  console.log("R3c status", r.status, r.status !== 201 ? r.text : "");
  assert.equal(r.status, 403);
  assert.equal(w.q("SELECT count(*) n FROM pty_contact_point WHERE party_id = ? AND value_normalized = '0911222333'", `pty-${ADM}`)[0].n, 0);
});

// Trong phạm vi ADR-0007 CHO PHÉP (SALES sửa hồ sơ khách), nhưng cờ "ngưng" của hồ sơ dùng chung lan sang đơn NHÁP của người khác
// (resolveBooker từ chối hồ sơ đã ngưng), và nhật ký chỉ ghi "cá nhân" — không nói việc ngưng (F-07, F-09).
test("R3d FINDING identity: SALES ngưng hồ sơ KHÁCH đang là người đặt của đồng nghiệp → đồng nghiệp không sửa được đơn nháp của mình (400); nhật ký không ghi việc ngưng", async () => {
  const w = setup();
  const o = (await w.call("POST", "/api/orders", { as: A, body: orderBody({ newBooker: { fullName: "Trần Khách", phone: "0912345678" } }) })).json.order;
  const pid = w.q("SELECT booker_party_id p FROM orders WHERE id = ?", o.id)[0].p;
  const pk = (await w.call("GET", `/api/parties/${pid}`, { as: B })).json.party;
  const off = await w.call("PUT", `/api/parties/${pid}`, { as: B, body: { familyName: "Trần", middleName: null, givenName: "Khách", active: false, expectedUpdatedAt: pk.updatedAt } });
  assert.equal(off.status, 200, off.text);
  const edit = await w.call("PUT", `/api/orders/${o.id}`, { as: A, body: { ...orderBody(), bookerPartyId: pid, expectedUpdatedAt: o.updatedAt } });
  console.log("R3d ngưng", off.status, "→ đồng nghiệp sửa đơn", edit.status, edit.status !== 200 ? edit.text : "");
  assert.equal(edit.status, 400);
  assert.equal(w.q("SELECT detail FROM audit_log WHERE target_id = ? ORDER BY rowid DESC LIMIT 1", pid)[0].detail, "cá nhân");
});

test("R4 PASS IDOR: SALES khác biết id đơn — xem được (thiết kế: order.view any), mọi đường SỬA → 403, đơn không đổi", async () => {
  const w = setup();
  const o = (await w.call("POST", "/api/orders", { as: A, body: orderBody() })).json.order;
  // Từ ADR-0030 S20-4 đơn mới không tự gắn người lập (không dòng HANDLE nào lúc lập); A Nhận TRƯỚC khi B thử để đơn "đã có người phụ trách".
  assert.equal(w.q("SELECT count(*) n FROM dsp_assignment WHERE order_id = ?", o.id)[0].n, 0, "lúc lập: 0 dòng phân công");
  assert.equal((await w.call("PUT", `/api/orders/${o.id}/handler`, { as: A, body: { staffId: A } })).status, 200);
  assert.equal((await w.call("GET", `/api/orders/${o.id}`, { as: B })).status, 200);
  assert.equal((await w.call("PUT", `/api/orders/${o.id}`, { as: B, body: { ...orderBody(), expectedUpdatedAt: o.updatedAt } })).status, 403);
  assert.equal((await w.call("POST", `/api/orders/${o.id}/status`, { as: B, body: { status: "cancelled" } })).status, 403);
  assert.equal((await w.call("PUT", `/api/orders/${o.id}/trip`, { as: B, body: { updates: [], expectedUpdatedAt: o.updatedAt } })).status, 403);
  assert.equal((await w.call("PUT", `/api/orders/${o.id}/booker`, { as: B, body: { customerName: "X", customerPhone: "0912345679", expectedUpdatedAt: o.updatedAt } })).status, 403);
  // Tự "nhận" đơn ĐÃ có người phụ trách: 409 stale theo thiết kế (dispatch/index.ts, handlerChangeVerdict), không ghi gì.
  assert.equal((await w.call("PUT", `/api/orders/${o.id}/handler`, { as: B, body: { staffId: B } })).status, 409);
  const after = w.q("SELECT status, customer_name FROM orders WHERE id = ?", o.id)[0];
  assert.deepEqual({ ...after }, { status: "draft", customer_name: "Khách Một" });
  assert.equal(w.q("SELECT count(*) n FROM dsp_assignment WHERE order_id = ? AND valid_to_at IS NULL", o.id)[0].n, 1);
});

test("R5 PASS vertical: FIELD không vào API văn phòng (danh sách đơn chỉ đơn mình phụ trách — ADR-0030 S23-4); SALES không vào API admin; ACCOUNTING không lập đơn", async () => {
  const w = setup();
  const own = await w.call("GET", "/api/orders", { as: F });
  assert.equal(own.status, 200, own.text); // ADR-0030 S23-5: FIELD qua cổng orders; nhánh lọc thứ ba = đơn đang phụ trách
  assert.deepEqual(own.json.orders, [], "FIELD chưa phụ trách đơn nào → rỗng");
  assert.equal((await w.call("GET", "/api/parties", { as: F })).status, 403);
  assert.equal((await w.call("GET", "/api/staff", { as: A })).status, 403);
  assert.equal((await w.call("PUT", `/api/staff/${A}/permissions`, { as: A, body: { permissions: ["ADMIN"] } })).status, 403);
  assert.equal((await w.call("GET", "/api/audit", { as: K })).status, 403);
  assert.equal((await w.call("POST", "/api/orders", { as: K, body: orderBody() })).status, 403);
  assert.equal((await w.call("GET", "/api/orders")).status, 401);
});

test("R6 PASS CSRF: POST không có Origin cùng trang → 403; text/plain → 415", async () => {
  const w = setup();
  assert.equal((await w.call("POST", "/api/orders", { as: A, body: orderBody(), headers: { origin: "https://evil.tourdao.vn" } })).status, 403);
  assert.equal((await w.call("POST", "/api/orders", { as: A, body: orderBody(), headers: { origin: null } })).status, 403);
  assert.equal((await w.call("POST", "/api/orders", { as: A, body: orderBody(), headers: { "content-type": "text/plain" } })).status, 415);
  assert.equal(w.q("SELECT count(*) n FROM orders")[0].n, 0);
});

test("R7 PASS retry xác nhận/huỷ: lần 2 không đổi kết quả nghiệp vụ (409), nhật ký chỉ 1 dòng", async () => {
  const w = setup();
  const o = (await w.call("POST", "/api/orders", { as: A, body: orderBody() })).json.order;
  assert.equal((await w.call("POST", `/api/orders/${o.id}/status`, { as: A, body: { status: "confirmed" } })).status, 200);
  assert.equal((await w.call("POST", `/api/orders/${o.id}/status`, { as: A, body: { status: "confirmed" } })).status, 409);
  assert.equal((await w.call("POST", `/api/orders/${o.id}/status`, { as: A, body: { status: "cancelled" } })).status, 200);
  assert.equal((await w.call("POST", `/api/orders/${o.id}/status`, { as: A, body: { status: "cancelled" } })).status, 409);
  const acts = w.q("SELECT action FROM audit_log WHERE order_id = ? ORDER BY created_at", o.id).map((r) => r.action);
  assert.deepEqual(acts.filter((a) => a === "confirmed").length, 1);
  assert.deepEqual(acts.filter((a) => a === "cancelled").length, 1);
});

// ĐÃ VÁ (sổ tiền lượt 1 — ADR-0026 đ9, 2026-09-30): ba cột cọc không còn mang nghĩa (đơn mới ghi 0 / NULL / total); tiền trả trước là LẦN THU của billing,
// đơn đã huỷ vẫn có chỗ ghi (lần thu còn hiệu lực — việc hoàn khách của Kế toán).
test("R8 PASS (đã vá — sổ tiền lượt 1) money: đơn đã HUỶ — cột cọc = 0, tiền đã trả nằm ở lần thu của sổ (billing), không mất dấu", async () => {
  const w = setup();
  const o = (await w.call("POST", "/api/orders", { as: A, body: orderBody() })).json.order;
  const thu = await w.call("POST", `/api/orders/${o.id}/payments`, { as: A, body: { soTien: 200000, hinhThuc: "CASH", nguoiThu: "cong_ty" } });
  assert.equal(thu.status, 201, thu.text);
  await w.call("POST", `/api/orders/${o.id}/status`, { as: A, body: { status: "confirmed" } });
  await w.call("POST", `/api/orders/${o.id}/status`, { as: A, body: { status: "cancelled" } });
  const r = w.q("SELECT status, deposit_amount FROM orders WHERE id = ?", o.id)[0];
  assert.deepEqual({ ...r }, { status: "cancelled", deposit_amount: 0 });
  assert.equal(w.q("SELECT count(*) AS n FROM bil_payment_receipt WHERE order_id = ?", o.id)[0].n, 1);
});

test("R9 PASS session: đăng xuất kết thúc dòng phiên; cookie đã chép đi nơi khác bị từ chối (ADR-0075, trước đây còn dùng được 7 ngày)", async () => {
  const w = setup();
  const { app } = await import("./harness.mjs");
  const token = await w.token(A);
  await w.call("POST", "/api/auth/logout", { headers: { cookie: `td_session=${token}` }, body: {} });
  const me = await app.default.fetch(new Request("https://booking.tourdao.vn/api/auth/me", { headers: { cookie: `td_session=${token}` } }), w.env, { waitUntil() {} });
  assert.equal(me.status, 401);
  assert.equal(w.q("SELECT end_reason FROM aut_session WHERE staff_id = ? ORDER BY created_at DESC LIMIT 1", A)[0].end_reason, "dang_xuat");
});

test("R10 PASS session: tài khoản bị ngưng → phiên đang mở bị từ chối ngay", async () => {
  const w = setup();
  w.sqlite.exec(`UPDATE staff SET active = 0 WHERE id = '${A}'`);
  assert.equal((await w.call("GET", "/api/orders", { as: A })).status, 401);
});

test("R11 PASS feedback: người khác không đọc/trả lời được yêu cầu của mình (404), không vào hàng đợi admin; ghi chú nội bộ ẩn với người gửi; gửi lại cùng clientRequestId → cùng một yêu cầu", async () => {
  const w = setup();
  const req = { kind: "BUG", title: "Lỗi in ảnh", body: "Chi tiết riêng tư", clientRequestId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" };
  const t1 = await w.call("POST", "/api/feedback", { as: A, body: req });
  assert.equal(t1.status, 201, t1.text);
  const id = t1.json.ticket.id;
  const t2 = await w.call("POST", "/api/feedback", { as: A, body: req });
  assert.equal(t2.status, 200);
  assert.equal(t2.json.ticket.id, id);
  assert.equal(w.q("SELECT count(*) n FROM fbk_ticket")[0].n, 1);
  for (const who of [B, F, K, ADM]) { // ADR-0038: Quản trị cũng không đọc/xử lý Góp ý của người khác
    assert.equal((await w.call("GET", `/api/feedback/${id}`, { as: who })).status, 404);
    assert.equal((await w.call("POST", `/api/feedback/${id}/messages`, { as: who, body: { body: "chen vao" } })).status, 404);
    assert.equal((await w.call("GET", "/api/feedback", { as: who })).status, 403);
    assert.equal((await w.call("PATCH", `/api/feedback/${id}`, { as: who, body: { status: "DONE" } })).status, 403);
  }
  assert.equal((await w.call("POST", `/api/feedback/${id}/messages`, { as: A, body: { body: "x", internal: true } })).status, 403);
  assert.equal((await w.call("POST", `/api/feedback/${id}/messages`, { as: SUP, body: { body: "ghi chu noi bo", internal: true } })).status, 201);
  const mine = await w.call("GET", `/api/feedback/${id}`, { as: A });
  assert.equal(mine.json.messages.some((m) => m.body === "ghi chu noi bo"), false);
  assert.equal((await w.call("GET", "/api/feedback/mine", { as: B })).json.tickets.length, 0);
});

// ---------------- Tầng CSDL: lưới cuối có giữ được khi mã (hoặc SQL tay) sai? ----------------
function confirmedOrder(w) {
  return (async () => {
    const o = (await w.call("POST", "/api/orders", { as: A, body: orderBody() })).json.order;
    assert.equal((await w.call("POST", `/api/orders/${o.id}/status`, { as: A, body: { status: "confirmed" } })).status, 200);
    return o;
  })();
}

test("D1 FINDING: thêm dòng tiền vào đơn ĐÃ XÁC NHẬN bằng SQL — CSDL cho qua (chỉ order_service bị đóng băng)", async () => {
  const w = setup();
  const o = await confirmedOrder(w);
  const svc = w.q("SELECT id FROM order_service WHERE order_id = ?", o.id)[0].id;
  w.sqlite.exec(`INSERT INTO order_item (id, order_id, service_id, description, quantity, unit_price, line_total, sort_order) VALUES ('x', '${o.id}', '${svc}', 'phụ thu', 1, 999, 999, 9)`);
  const sum = w.q("SELECT sum(line_total) s FROM order_item WHERE order_id = ?", o.id)[0].s;
  const sub = w.q("SELECT subtotal FROM orders WHERE id = ?", o.id)[0].subtotal;
  assert.notEqual(sum, sub); // tổng dòng ≠ tạm tính đơn, CSDL không phát hiện
});

test("D2 FINDING: sửa tổng tiền của đơn ĐÃ XÁC NHẬN (giữ đúng số học) — CSDL cho qua", async () => {
  const w = setup();
  const o = await confirmedOrder(w);
  w.sqlite.exec(`UPDATE orders SET subtotal = 1, discount = 0, total = 1, deposit_amount = 0, deposit_method = NULL, remaining_amount = 1 WHERE id = '${o.id}'`);
  assert.equal(w.q("SELECT total FROM orders WHERE id = ?", o.id)[0].total, 1);
});

test("D3 PASS: nhật ký không sửa/xoá được; trạng thái đơn không quay lui; xoá đơn đã xác nhận bị trigger gốc orders_no_delete chặn (chủ lần 15 — trước đó khoá ngoại)", async () => {
  const w = setup();
  const o = await confirmedOrder(w);
  assert.throws(() => w.sqlite.exec("UPDATE audit_log SET detail = 'x'"), /audit_append_only/);
  assert.throws(() => w.sqlite.exec("DELETE FROM audit_log"), /audit_append_only/);
  assert.throws(() => w.sqlite.exec(`UPDATE orders SET status = 'draft' WHERE id = '${o.id}'`), /invalid_transition/);
  assert.throws(() => w.sqlite.exec(`DELETE FROM orders WHERE id = '${o.id}'`), /order_frozen/); // trigger gốc chạy TRƯỚC khoá ngoại (0034, chủ lần 15)
});

// Đề xuất kiểm bất biến chạy trên DỮ LIỆU (bổ sung scripts/audit-checks.mjs): điều trigger không diễn đạt được vì dòng tiền chèn SAU đơn trong cùng batch.
export const MONEY_SUM_CHECK = `SELECT count(*) FROM orders o WHERE o.subtotal IS NOT (SELECT COALESCE(sum(line_total), 0) FROM order_item i WHERE i.order_id = o.id)`;

test("D5 đề xuất: câu kiểm 'tạm tính = Σ dòng tiền' bằng 0 trên dữ liệu do API tạo, và BẮT được hỏng hóc kiểu D1", async () => {
  const w = setup();
  const o = await confirmedOrder(w);
  await w.call("POST", "/api/orders", { as: B, body: orderBody() });
  assert.equal(Object.values(w.q(MONEY_SUM_CHECK)[0])[0], 0);
  const svc = w.q("SELECT id FROM order_service WHERE order_id = ?", o.id)[0].id;
  w.sqlite.exec(`INSERT INTO order_item (id, order_id, service_id, description, quantity, unit_price, line_total, sort_order) VALUES ('x', '${o.id}', '${svc}', 'phụ thu', 1, 999, 999, 9)`);
  assert.equal(Object.values(w.q(MONEY_SUM_CHECK)[0])[0], 1);
});

test("D4 FINDING: tài khoản nhân viên trỏ hồ sơ ĐÃ NGƯNG vẫn đăng nhập/hoạt động (hai cờ 'active' độc lập)", async () => {
  const w = setup();
  w.sqlite.exec(`UPDATE pty_party SET active = 0 WHERE id = 'pty-${A}'`);
  assert.equal((await w.call("GET", "/api/orders", { as: A })).status, 200);
});
