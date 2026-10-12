import assert from "node:assert/strict";
import { ACCOUNTS, FAKE_CATALOG, call, catalogService, ensureFakeCatalog, login, makeLegacyManual, randomPhone, session, sql, vnDate } from "./lib.mjs";

await ensureFakeCatalog(); // API không nhận dịch vụ nhập tay mới (chủ dự án 2026-09-26) → đơn thử dùng danh mục giả ZE* (ZE1: người lớn 100.000, trẻ em 50.000)
const A = await session(ACCOUNTS.salesA);
const Bc = await session(ACCOUNTS.salesB);
const ADMIN = await session(ACCOUNTS.admin);
const TOAN_QUYEN = await session(ACCOUNTS.superAdmin); // ADR-0038 điều 6: trang Nhật ký, đặt lại PIN, gỡ Face ID, mở khoá chỉ Toàn quyền
const ACC = await session(ACCOUNTS.accountant);
const FIELD = await session(ACCOUNTS.field);

// chưa đăng nhập
assert.equal((await call(null, "GET", "/api/orders")).status, 401);

// Dịch vụ danh mục giả ZE1 (theo người) với ĐƠN GIÁ THOẢ THUẬN — số lượng dòng = số khách từng loại (máy chủ sinh dòng); dịch vụ danh mục và
// thông tin chuyến kiểm kỹ ở trip.mjs. Trước 2026-09-26 tệp này dùng dịch vụ nhập tay (tiền tự do); nay API không nhận dịch vụ nhập tay mới.
// `svc(pax, unitPrices)`: pax { adult, child }; unitPrices chỉ cho loại có khách.
const svc = (pax, unitPrices, extra = {}) => catalogService({ pax, unitPrices, ...extra });
const lines = (order) => order.services.flatMap((s) => s.items);
const input = {
  customerName: "Nguyễn Văn A", customerPhone: "0901 234 567", customerEmail: "a@example.com",
  services: [svc({ adult: 3, child: 1 }, { adult: 450000, child: 50000 })], // 3 × 450.000 + 1 × 50.000 = 1.400.000
  discount: 100000,
  // client cố gian lận số dẫn xuất:
  total: 1, subtotal: 1, remainingAmount: 0,
};
let r = await call(A, "POST", "/api/orders", input);
assert.equal(r.status, 201, JSON.stringify(r.body));
const o = r.body.order;
console.log("tạo:", o.orderCode, o.subtotal, o.total, o.status);
assert.match(o.orderCode, /^TD-\d{8}-\d{4}$/);
assert.equal(o.subtotal, 1400000); assert.equal(o.total, 1300000);
// Sổ tiền lượt 1 (ADR-0026 đ9): đơn không còn mang cọc / còn lại; tiền trả trước là LẦN THU của billing (bước hai của form).
assert.ok(!("remainingAmount" in o) && !("depositAmount" in o), "đơn không mang ba trường cọc cũ");
// (Đơn RIÊNG cho phần tiền — giữ nguyên số dòng nhật ký của đơn `o` mà các bước sau đếm.)
const oTien = (await call(A, "POST", "/api/orders", input)).body.order;
assert.equal((await call(A, "POST", `/api/orders/${oTien.id}/payments`, { soTien: 500000, hinhThuc: "CASH", nguoiThu: "toi" })).status, 201);
const tienO = (await call(A, "GET", `/api/orders/${oTien.id}/payments`)).body;
assert.deepEqual([tienO.phaiThu, tienO.daThu, tienO.conLai], [1300000, 500000, 800000], "còn lại = phải thu − đã thu (billing)");
assert.deepEqual(lines(o).map((i) => i.lineTotal), [1350000, 50000]);

// Danh sách đơn trả đủ trường cho thẻ mới (đặc tả thiết kế lại giao diện §7, §16 mục 1)
r = await call(A, "GET", "/api/orders?limit=100");
assert.equal(r.status, 200);
const summary = r.body.orders.find((x) => x.id === o.id);
assert.ok(summary, "đơn vừa tạo phải có trong danh sách");
assert.deepEqual(summary.serviceNames, [FAKE_CATALOG.ZE1.name], "tên dịch vụ = tên danh mục của ZE1");
assert.deepEqual(summary.pax, { adult: 3, child: 1, senior: 0, infant: 0 });
assert.equal(summary.trip.departDate, vnDate(7), "departDate mặc định của catalogService");
assert.equal(summary.trip.pickupTime, null, "không gửi pickupTime trong input này");
assert.equal(summary.trip.pickupPlace, null);
assert.equal((await call(A, "POST", "/api/ledger/balances", { orderIds: [oTien.id] })).body.balances[oTien.id].daThu, 500000, "số đã thu của thẻ danh sách lấy từ billing");
assert.equal(summary.customerNote, null, "input không gửi customerNote");

// Đơn 2 dịch vụ: kiểm chỗ GHÉP giữa câu SQL (ORDER BY order_id, sort_order) và summarizeServices — pax cộng dồn, trip lấy dịch vụ ĐẦU
const input2 = {
  ...input,
  discount: 0,
  services: [
    catalogService({ pax: { adult: 2 }, departDate: vnDate(5), pickupTime: "07:00" }),
    catalogService({ catalogCode: "ZE2", pax: { adult: 1 }, catalogPriceSeen: { ...FAKE_CATALOG.ZE2.prices }, departDate: vnDate(5), pickupTime: "09:00" }), // ADR-0021: cả đơn một ngày — phân biệt dịch vụ đầu bằng giờ đón
  ],
};
r = await call(A, "POST", "/api/orders", input2);
assert.equal(r.status, 201, JSON.stringify(r.body));
const o2 = r.body.order;
r = await call(A, "GET", "/api/orders?limit=100");
assert.equal(r.status, 200);
const summary2 = r.body.orders.find((x) => x.id === o2.id);
assert.ok(summary2, "đơn 2 dịch vụ vừa tạo phải có trong danh sách");
assert.deepEqual(summary2.serviceNames, [FAKE_CATALOG.ZE1.name, FAKE_CATALOG.ZE2.name], "đúng thứ tự 2 dịch vụ (sort_order)");
assert.deepEqual(summary2.pax, { adult: 3, child: 0, senior: 0, infant: 0 }, "pax là TỔNG hai dịch vụ, không phải của riêng dịch vụ nào");
assert.equal(summary2.trip.departDate, vnDate(5), "trip lấy đúng của dịch vụ ĐẦU (ZE1)");
assert.equal(summary2.trip.pickupTime, "07:00", "trip lấy đúng của dịch vụ ĐẦU, không phải dịch vụ hai (09:00)");
// Ca đơn KHÔNG có dịch vụ nào: đã thử — rules.ts:74 `if (!Array.isArray(b.services) || b.services.length === 0) return fail(...)` chặn tạo đơn rỗng
// (test bất biến `{ services: [] }` ở trên đã xác nhận trả 400), nên KHÔNG tạo được qua API thật. `summarizeServices([])` đã có unit test riêng ở
// repository.test.ts (Task 1) — coi đó là đủ phủ cho trường hợp không có dịch vụ, bỏ qua ca này ở e2e.

// nhân viên B xem được đơn của A
r = await call(Bc, "GET", `/api/orders/${o.id}`);
assert.equal(r.status, 200); assert.equal(r.body.order.staffName, "NV Bán A (test)");
assert.equal(r.body.history.length, 0, "SALES chỉ xem nhật ký đơn của mình (ADR-0007) — B không thấy nhật ký đơn của A");
assert.equal((await call(A, "GET", `/api/orders/${o.id}`)).body.history.length, 1, "người lập đơn thấy nhật ký của mình");
r = await call(Bc, "GET", "/api/orders?q=Hòn"); // tìm theo tên khách không khớp dịch vụ → 0
r = await call(Bc, "GET", "/api/orders?q=" + encodeURIComponent("Nguyễn"));
assert.ok(r.body.orders.some((x) => x.id === o.id));
r = await call(Bc, "GET", "/api/orders?q=" + o.orderCode);
assert.equal(r.body.orders.length, 1);
r = await call(Bc, "GET", "/api/orders?q=%25"); // ký tự LIKE được escape
assert.equal(r.body.orders.length, 0);

// bất biến: giảm giá / cọc quá mức, số âm, chuỗi
for (const bad of [{ discount: 1400001 }, { discount: -1 }, { services: [svc({ adult: 1 }, { adult: "5" })] }, { services: [] }]) {
  r = await call(A, "POST", "/api/orders", { ...input, ...bad });
  assert.equal(r.status, 400, JSON.stringify(bad));
}

// PHÂN QUYỀN: B (sales, không phải người lập) xem được nhưng KHÔNG sửa/đổi trạng thái đơn của A
r = await call(Bc, "GET", `/api/orders/${o.id}`);
assert.equal(r.body.canModify, false);
r = await call(A, "GET", `/api/orders/${o.id}`);
assert.equal(r.body.canModify, true);
assert.equal((await call(Bc, "PUT", `/api/orders/${o.id}`, input)).status, 403);
assert.equal((await call(Bc, "POST", `/api/orders/${o.id}/status`, { status: "confirmed" })).status, 403);
assert.equal((await call(Bc, "POST", `/api/orders/${o.id}/status`, { status: "cancelled", lyDo: "KHACH_DOI_Y" })).status, 403);
assert.equal((await call(null, "PUT", `/api/orders/${o.id}`, input)).status, 401);
r = await call(A, "GET", `/api/orders/${o.id}`);
assert.equal(r.body.order.status, "draft"); assert.equal(r.body.history.length, 1); // bị từ chối → không đổi gì, không ghi log

// người lập đơn sửa draft (PUT cần expectedUpdatedAt = mốc đã đọc)
const replace = { services: [svc({ adult: 2 }, { adult: 300000 })], discount: 0 }; // 2 × 300.000 = 600.000, một dòng
r = await call(A, "PUT", `/api/orders/${o.id}`, { ...input, ...replace, expectedUpdatedAt: o.updatedAt });
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.order.total, 600000); assert.equal(lines(r.body.order).length, 1);
let cur = r.body.order;

// admin (không phải người lập) sửa được
r = await call(ADMIN, "PUT", `/api/orders/${o.id}`, { ...input, ...replace, customerNote: "admin sửa", expectedUpdatedAt: cur.updatedAt });
assert.equal(r.status, 200);

// xác nhận (người lập): đơn có ngày khởi hành + khách nên đủ điều kiện
r = await call(A, "POST", `/api/orders/${o.id}/status`, { status: "confirmed" });
assert.equal(r.status, 200, JSON.stringify(r.body)); assert.equal(r.body.order.status, "confirmed"); assert.ok(r.body.order.confirmedAt);
// không sửa được, không quay về draft, không xác nhận lại
assert.equal((await call(A, "PUT", `/api/orders/${o.id}`, input)).status, 409);
assert.equal((await call(A, "POST", `/api/orders/${o.id}/status`, { status: "draft" })).status, 400);
assert.equal((await call(A, "POST", `/api/orders/${o.id}/status`, { status: "confirmed" })).status, 409);
// B vẫn không huỷ được; admin huỷ được
assert.equal((await call(Bc, "POST", `/api/orders/${o.id}/status`, { status: "cancelled", lyDo: "KHACH_DOI_Y" })).status, 403);
r = await call(ADMIN, "POST", `/api/orders/${o.id}/status`, { status: "cancelled", lyDo: "KHACH_DOI_Y" });
assert.equal(r.body.order.status, "cancelled");
assert.equal((await call(A, "POST", `/api/orders/${o.id}/status`, { status: "cancelled", lyDo: "KHACH_DOI_Y" })).status, 409);
r = await call(A, "GET", `/api/orders/${o.id}`);
console.log("lịch sử:", r.body.history.map((h) => `${h.action}/${h.staffName}`).join(", "));
// Sổ đại lý đợt 1 (đặc tả §5): lô Xác nhận ghi thêm MỘT dòng `order_terms_captured` ngay sau `confirmed` (cùng mốc giờ, thứ tự chèn) — người xem văn phòng thấy dòng đó.
assert.deepEqual(r.body.history.map((h) => h.action), ["created", "updated", "updated", "confirmed", "order_terms_captured", "cancelled"]);
assert.equal(r.body.history.at(-1).staffName, "QTV Test");

// 0017 (P-2 + P-5): trên D1 thật, CSDL chặn đường quay lại của trạng thái đơn và chặn sửa/xoá nhật ký, kể cả SQL chạy tay.
// Đơn `o` lúc này ĐÃ HUỶ (dòng 84) và có 5 dòng nhật ký (dòng 88), nên mỗi câu dưới đây chắc chắn trúng dòng.
await assert.rejects(sql(`UPDATE orders SET status = 'confirmed' WHERE id = '${o.id}'`), /invalid_transition/, "đơn đã huỷ không được sống lại");
await assert.rejects(sql(`UPDATE orders SET status = 'draft' WHERE id = '${o.id}'`), /invalid_transition/);
await assert.rejects(sql(`UPDATE audit_log SET detail = 'sửa lén' WHERE order_id = '${o.id}'`), /audit_append_only/);
await assert.rejects(sql(`DELETE FROM audit_log WHERE order_id = '${o.id}'`), /audit_append_only/);
r = await call(A, "GET", `/api/orders/${o.id}`);
assert.equal(r.body.order.status, "cancelled");
console.log("✓ TRIGGER 0017 chặn trạng thái đi lùi và sửa/xoá nhật ký ghi thẳng vào D1");

// NHẬT KÝ TOÀN HỆ THỐNG: chỉ Toàn quyền (ADR-0038 điều 6)
assert.equal((await call(ADMIN, "GET", "/api/audit")).status, 403, "Quản trị không xem trang Nhật ký");
assert.equal((await call(A, "GET", "/api/audit")).status, 403);
assert.equal((await call(Bc, "GET", "/api/audit")).status, 403);
assert.equal((await call(null, "GET", "/api/audit")).status, 401);
r = await call(TOAN_QUYEN, "GET", "/api/audit?limit=100");
assert.equal(r.status, 200);
assert.ok(r.body.entries.length >= 5);
assert.ok(r.body.entries.some((e) => e.targetLabel === o.orderCode && e.action === "cancelled" && e.staffName === "QTV Test"));
r = await call(TOAN_QUYEN, "GET", "/api/audit?action=cancelled&q=" + o.orderCode);
assert.equal(r.body.entries.length, 1);
r = await call(TOAN_QUYEN, "GET", "/api/audit?action=hack");
assert.equal(r.status, 400);
r = await call(TOAN_QUYEN, "GET", "/api/audit?q=%25");
assert.equal(r.body.entries.length, 0);
r = await call(TOAN_QUYEN, "GET", "/api/audit?limit=2");
assert.equal(r.body.entries.length, 2); assert.equal(r.body.hasMore, true);

// 404 / id rác
assert.equal((await call(A, "GET", "/api/orders/00000000-0000-0000-0000-000000000000")).status, 404);
assert.equal((await call(A, "GET", "/api/orders/abc")).status, 404);

// đồng thời: 30 đơn cùng lúc → mã duy nhất
const many = await Promise.all(Array.from({ length: 30 }, (_, i) => call(i % 2 ? A : Bc, "POST", "/api/orders", { ...input, customerName: `Song song ${i}` })));
assert.ok(many.every((m) => m.status === 201), JSON.stringify(many.filter((m) => m.status !== 201)));
const codes = many.map((m) => m.body.order.orderCode);
assert.equal(new Set(codes).size, 30);
console.log("song song:", codes.sort().join(" "));

// phân trang
r = await call(A, "GET", "/api/orders?limit=3");
assert.equal(r.body.orders.length, 3); assert.equal(r.body.hasMore, true);

// DỊCH VỤ NHẬP TAY CŨ (dựng bằng SQL — API không nhận dịch vụ nhập tay mới từ 2026-09-26; luật đó thử ở nhap-tay-va-gia-doi-tac.mjs): đọc lại đúng
// kind "manual", dòng tiền không mang mã dịch vụ / loại khách / giá danh mục; mã dịch vụ sai dạng bị từ chối (dịch vụ danh mục: xem trip.mjs)
r = await call(A, "POST", "/api/orders", { ...input, services: [svc({ adult: 2, child: 1 }, { adult: 850000, child: 1 })], discount: 0 }); // 1.700.000 + 1
assert.equal(r.status, 201, JSON.stringify(r.body));
const traced = r.body.order;
const legacy = (await call(A, "POST", "/api/orders", { ...input, services: [catalogService()], discount: 0 })).body.order;
await makeLegacyManual(legacy.id, legacy.services[0].id, { name: "Xe đưa đón cũ", description: "Xe 7 chỗ", detail: "2 chiều", quantity: 2, unitPrice: 400000 });
r = await call(A, "GET", `/api/orders/${legacy.id}`);
assert.equal(r.body.order.services[0].kind, "manual");
assert.equal(r.body.order.services[0].name, "Xe đưa đón cũ");
assert.deepEqual(lines(r.body.order).map((i) => [i.catalogCode, i.paxCode, i.catalogPrice, i.description, i.detail, i.quantity, i.unitPrice, i.lineTotal]), [[null, null, null, "Xe 7 chỗ", "2 chiều", 2, 400000, 800000]]);
assert.deepEqual([r.body.order.subtotal, r.body.order.total], [800000, 800000]);
r = await call(A, "POST", "/api/orders", { ...input, services: [{ kind: "catalog", catalogCode: "x y", pax: { adult: 1 }, catalogPriceSeen: {} }] });
assert.equal(r.status, 400);
assert.match(r.body.error.message, /mã dịch vụ/, "mã sai DẠNG phải bị từ chối vì dạng, không lẫn với 'không còn trong danh mục'");
console.log("✓ dịch vụ nhập tay cũ đọc lại đúng");

// BẤT BIẾN TIỀN TRONG SQL (0007): ghi thẳng số sai vào D1 bị TRIGGER chặn; sửa đúng luật qua API vẫn chạy
for (const bad of [
  `UPDATE orders SET total = total + 1 WHERE id = '${traced.id}'`,
  `UPDATE orders SET remaining_amount = -1, deposit_amount = total + 1 WHERE id = '${traced.id}'`,
  `UPDATE order_item SET line_total = line_total + 1 WHERE order_id = '${traced.id}'`,
  `UPDATE orders SET deposit_amount = 1, remaining_amount = total - 1, deposit_method = NULL WHERE id = '${traced.id}'`,
]) await assert.rejects(sql(bad), /money_invariant/, `TRIGGER phải chặn: ${bad}`);
await sql(`UPDATE orders SET customer_note = 'sửa hợp lệ' WHERE id = '${traced.id}'`); // cập nhật không đụng tiền vẫn qua
r = await call(A, "GET", `/api/orders/${traced.id}`);
assert.equal(r.body.order.total, 1700001); assert.deepEqual(lines(r.body.order).map((i) => i.lineTotal), [1700000, 1]);
r = await call(A, "PUT", `/api/orders/${traced.id}`, { ...input, discount: 1000, expectedUpdatedAt: r.body.order.updatedAt });
assert.equal(r.status, 200, JSON.stringify(r.body));
console.log("✓ TRIGGER chặn số tiền sai ghi thẳng vào D1, API vẫn sửa được");

// TRANH CHẤP: thao tác thua cuộc (điều kiện SQL không còn đúng) KHÔNG được để lại dòng nhật ký (idiom changes() > 0)
for (let round = 0; round < 3; round++) {
  const d = (await call(A, "POST", "/api/orders", { ...input, customerName: `Tranh chấp ${round}` })).body.order;
  const [c1, c2] = await Promise.all([
    call(A, "POST", `/api/orders/${d.id}/status`, { status: "confirmed" }),
    call(ADMIN, "POST", `/api/orders/${d.id}/status`, { status: "cancelled", lyDo: "KHACH_DOI_Y" }),
  ]);
  const wins = [c1, c2].filter((x) => x.status === 200).length;
  const hist = (await call(A, "GET", `/api/orders/${d.id}`)).body.history.map((h) => h.action);
  // Nếu hai request chạy nối tiếp thì cả hai có thể thắng (draft→confirmed→cancelled); nếu đan xen thì kẻ thua nhận 409.
  // Dù thế nào, số dòng nhật ký phải đúng bằng số thao tác thắng. (Đơn có đủ chuyến nên xác nhận không thua vì thiếu ngày — bài đua này kiểm tranh chấp trạng thái.)
  assert.ok(wins >= 1);
  // Sổ đại lý đợt 1: xác nhận thắng ghi THÊM một dòng `order_terms_captured` trong cùng lô (chụp mức) — đếm riêng: dòng đổi trạng thái khớp số thao tác thắng,
  // dòng chụp mức có đúng một khi xác nhận thắng và không có khi xác nhận thua.
  assert.equal(hist.filter((a) => a !== "order_terms_captured").length, 1 + wins, `nhật ký phải khớp số thao tác thắng: ${hist} / ${c1.status},${c2.status}`);
  assert.equal(hist.filter((a) => a === "order_terms_captured").length, c1.status === 200 ? 1 : 0, `chụp mức chỉ khi xác nhận thắng: ${hist} / ${c1.status},${c2.status}`);
}
console.log("✓ thao tác thua khi tranh chấp không ghi nhật ký");

// NGƯỜI PHỤ TRÁCH SỬA ĐƯỢC ĐƠN (ADR-0009): người phụ trách (khác người lập) làm được đúng những gì người lập làm được — sửa nháp ĐỦ (dịch vụ, số khách, tiền),
// xác nhận, huỷ, sửa thông tin chuyến sau xác nhận, xem nhật ký; người lập KHÔNG mất quyền khi đã giao lại; SALES khác / kế toán / FIELD vẫn 403;
// `order.money.edit` không mở (sau xác nhận số khách/dịch vụ/tiền vẫn khoá với người phụ trách). Hàm "được giao" do gốc lắp ráp tiêm vào ctx (không import dispatch).
const me = async (cookie) => (await call(cookie, "GET", "/api/auth/me")).body.staff;
const bId = (await me(Bc)).id;
const cPhone = randomPhone();
r = await call(TOAN_QUYEN, "POST", "/api/staff", { taoHoSoMoi: true, fullName: `Người Ngoài ${Date.now().toString(36)}`, phone: cPhone, permissions: ["SALES"] });
assert.equal(r.status, 201, JSON.stringify(r.body));
const Cx = (await login(cPhone, r.body.pin)).cookie; // SALES không liên quan tới đơn nào ở dưới (trừ ca đổi người phụ trách)
const cId = r.body.staff.id;
const mkOrder = async () => {
  const x = await call(A, "POST", "/api/orders", input);
  assert.equal(x.status, 201, JSON.stringify(x.body));
  return x.body.order;
};
const assign = async (cookie, order, staffId) => {
  const x = await call(cookie, "PUT", `/api/orders/${order.id}/handler`, { staffId });
  assert.equal(x.status, 200, JSON.stringify(x.body));
};
const detail = async (cookie, order) => (await call(cookie, "GET", `/api/orders/${order.id}`)).body;
const putOrder = (cookie, order, extra) => call(cookie, "PUT", `/api/orders/${order.id}`, { ...input, ...extra, expectedUpdatedAt: order.updatedAt });
// ADR-0089 đ8: huỷ bắt buộc lý do — kịch bản này kiểm quyền / chuyển trạng thái, dùng lý do "Khách đổi ý" (nhóm khách huỷ).
const setStatus = (cookie, order, status) => call(cookie, "POST", `/api/orders/${order.id}/status`, status === "cancelled" ? { status, lyDo: "KHACH_DOI_Y" } : { status });
const tripOf = (sv) => ({
  departDate: sv.departDate ?? "", departTime: sv.departTime ?? "", pickupTime: sv.pickupTime ?? "", pickupPlace: sv.pickupPlace ?? "",
  checkinDate: sv.checkinDate ?? "", checkinTime: sv.checkinTime ?? "", checkinPlace: sv.checkinPlace ?? "", note: sv.note ?? "",
});
const putTrip = (cookie, order, changes = {}, extra = {}) =>
  call(cookie, "PUT", `/api/orders/${order.id}/trip`, { expectedUpdatedAt: order.updatedAt, services: [{ id: order.services[0].id, ...tripOf(order.services[0]), ...changes, ...extra }], ...extra });
const lastAction = async (cookie, order) => (await detail(cookie, order)).history.at(-1);

// --- trước khi được giao: B chỉ là người ngoài
let h = await mkOrder();
assert.equal((await detail(Bc, h)).canModify, false);
assert.equal((await putOrder(Bc, h, {})).status, 403);
await assign(A, h, bId); // người lập giao cho B
// canModify + nhật ký đúng cho từng người (cờ ở giao diện và kiểm ở máy chủ dùng CÙNG một giá trị "được giao")
for (const [label, cookie, canModify, sees] of [
  ["người phụ trách (B)", Bc, true, true], ["người lập đã giao lại (A)", A, true, true], ["quản trị", ADMIN, true, true],
  ["kế toán", ACC, false, true], ["SALES khác", Cx, false, false],
]) {
  const d = await detail(cookie, h);
  assert.equal(d.canModify, canModify, `${label}: canModify`);
  assert.equal(d.history.length > 0, sees, `${label}: thấy nhật ký`);
}
// ADR-0030 S23-4: hướng dẫn viên (chỉ-FIELD) KHÔNG phụ trách đơn này → 404 như đơn không tồn tại (không dò được đơn người khác); 403 cũ đổi ở lượt 1.
r = await call(FIELD, "GET", `/api/orders/${h.id}`);
assert.equal(r.status, 404, `FIELD không phụ trách đơn → 404: ${JSON.stringify(r.body)}`);
assert.equal(r.body.error.code, "not_found");
assert.deepEqual((await detail(Bc, h)).history.map((x) => x.action), ["created", "order_handler_changed"], "người phụ trách xem cả dòng đổi người");

// --- người phụ trách sửa đơn NHÁP đủ: đổi dịch vụ, số khách, giảm giá, cọc — máy chủ tính lại tiền
const bigger = { services: [svc({ adult: 4, child: 2 }, { adult: 300000, child: 50000 })], discount: 50000 }; // 4 × 300.000 + 2 × 50.000 = 1.300.000
r = await putOrder(Bc, h, bigger);
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.deepEqual([r.body.order.services[0].pax.adult, r.body.order.subtotal, r.body.order.total], [4, 1300000, 1250000], "dịch vụ, số khách và tiền do máy chủ tính lại");
assert.equal(lines(r.body.order).length, 2);
h = r.body.order;
let last = await lastAction(Bc, h);
assert.deepEqual([last.action, last.staffName], ["updated", "NV Bán B (test)"], "nhật ký ghi đúng người phụ trách đã sửa");
// người lập (đã giao lại) VẪN sửa được
r = await putOrder(A, h, { ...bigger, customerNote: "người lập vẫn sửa được" });
assert.equal(r.status, 200, JSON.stringify(r.body));
h = r.body.order;
assert.equal(h.customerNote, "người lập vẫn sửa được");
// người khác / kế toán / FIELD: 403 ở mọi thao tác sửa; không gì đổi
for (const [label, cookie] of [["SALES khác", Cx], ["kế toán", ACC], ["FIELD", FIELD]]) {
  for (const [what, res] of [
    ["PUT đơn", await putOrder(cookie, h, bigger)], ["xác nhận", await setStatus(cookie, h, "confirmed")], ["huỷ", await setStatus(cookie, h, "cancelled")], ["PUT chuyến", await putTrip(cookie, h, { note: "chui" })],
  ]) assert.equal(res.status, 403, `${label} ${what} → ${res.status}`);
}
assert.deepEqual((await detail(A, h)).order.updatedAt, h.updatedAt, "bị từ chối thì không đổi gì");

// --- người phụ trách XÁC NHẬN đơn
r = await setStatus(Bc, h, "confirmed");
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.order.status, "confirmed");
h = r.body.order;
// Sổ đại lý đợt 1: dòng cuối là `order_terms_captured` (cùng lô, ngay sau `confirmed`) — so hai dòng cuối, cả hai do người phụ trách ghi.
assert.deepEqual((await detail(A, h)).history.slice(-2).map((x) => [x.action, x.staffName]), [["confirmed", "NV Bán B (test)"], ["order_terms_captured", "NV Bán B (test)"]]);

// --- sau xác nhận: sửa THÔNG TIN CHUYẾN được (order.trip.edit); số khách/dịch vụ/tiền vẫn KHOÁ (order.money.edit không mở)
assert.equal((await putOrder(Bc, h, bigger)).status, 409, "PUT cả đơn sau xác nhận vẫn 409 (như người lập)");
assert.equal((await putOrder(Bc, h, bigger)).body.error.code, "not_editable");
// cố lách qua PUT /trip bằng số khách, dịch vụ, tiền: các trường thừa bị bỏ qua, chỉ trường chuyến đổi
r = await putTrip(Bc, h, { pickupPlace: "KS người phụ trách chỉnh" }, { pax: { adult: 9 }, items: [{ description: "lách", quantity: 1, unitPrice: 1 }], total: 1, discount: 999999, name: "Đổi tên" });
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.order.services[0].pickupPlace, "KS người phụ trách chỉnh");
assert.deepEqual([r.body.order.services[0].pax.adult, r.body.order.total, r.body.order.discount, r.body.order.services[0].name], [4, h.total, h.discount, h.services[0].name], "số khách/tiền/tên dịch vụ không đổi");
assert.deepEqual(lines(r.body.order).map((i) => [i.description, i.quantity, i.unitPrice, i.lineTotal]), lines(h).map((i) => [i.description, i.quantity, i.unitPrice, i.lineTotal]));
h = r.body.order;
last = await lastAction(Bc, h);
assert.deepEqual([last.action, last.staffName], ["trip_updated", "NV Bán B (test)"]);
r = await putTrip(A, h, { note: "người lập chỉnh sau khi đã giao lại" }); // người lập vẫn sửa được chuyến
assert.equal(r.status, 200, JSON.stringify(r.body));
h = r.body.order;
for (const [label, cookie] of [["SALES khác", Cx], ["kế toán", ACC], ["FIELD", FIELD]]) assert.equal((await putTrip(cookie, h, { note: "chui" })).status, 403, `${label} PUT chuyến`);

// --- người phụ trách HUỶ đơn đã xác nhận; sau huỷ không sửa được gì nữa
r = await setStatus(Bc, h, "cancelled");
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.order.status, "cancelled");
assert.deepEqual((await lastAction(Bc, r.body.order)).staffName, "NV Bán B (test)");
assert.equal((await putTrip(Bc, r.body.order, { note: "sau huỷ" })).status, 409);
assert.equal((await setStatus(Bc, r.body.order, "confirmed")).status, 409);
console.log("✓ người phụ trách (khác người lập) sửa nháp đủ, xác nhận, sửa chuyến, huỷ; người lập vẫn được; SALES khác/kế toán/FIELD 403; số khách/dịch vụ/tiền vẫn khoá sau xác nhận");

// --- người phụ trách huỷ thẳng đơn NHÁP; và MẤT quyền ngay khi bị đổi người (quyền đi theo người phụ trách HIỆN TẠI, không theo người từng phụ trách)
const h2 = await mkOrder();
await assign(A, h2, bId);
r = await setStatus(Bc, h2, "cancelled");
assert.equal(r.status, 200, JSON.stringify(r.body));
const h3 = await mkOrder();
await assign(A, h3, bId);
assert.equal((await putOrder(Bc, h3, { customerNote: "B còn là người phụ trách" })).status, 200);
await assign(A, h3, cId); // A đổi sang Cx
const h3now = (await detail(Cx, h3)).order;
assert.equal((await detail(Bc, h3)).canModify, false, "B không còn là người phụ trách → hết quyền");
assert.equal((await detail(Bc, h3)).history.length, 0, "và không xem được nhật ký");
assert.equal((await putOrder(Bc, h3now, { customerNote: "B sửa lén" })).status, 403);
assert.equal((await setStatus(Bc, h3now, "confirmed")).status, 403);
assert.equal((await detail(Cx, h3)).canModify, true, "người phụ trách mới có quyền");
assert.equal((await putOrder(Cx, h3now, { customerNote: "Cx sửa" })).status, 200);
assert.equal((await putOrder(A, (await detail(A, h3)).order, { customerNote: "A vẫn sửa được" })).status, 200, "người lập vẫn sửa được");
console.log("✓ người phụ trách huỷ đơn nháp; bị đổi người thì mất quyền ngay, người phụ trách mới có quyền");

// --- Bộ lọc danh sách đơn nhiều điều kiện (góp ý T4): ngày đi, dịch vụ (nhiều), trạng thái (nhiều), người lập — AND nhau và với ô tìm; sai → 400 tiếng Việt.
// D1 dùng chung cả lần chạy → mọi truy vấn kèm `q=<nhãn riêng>` để chỉ đếm đơn của đoạn này. Bài đủ ca (kể cả phạm vi theo vai) ở loc-don-route.test.ts.
{
  const tag = `Lọc ${Date.now()}`;
  const mk = async (who, code, days) => {
    const res = await call(who, "POST", "/api/orders", { customerName: `${tag} ${code}`, customerPhone: randomPhone(), services: [catalogService({ catalogCode: code, catalogPriceSeen: { ...FAKE_CATALOG[code].prices }, departDate: vnDate(days) })], depositAmount: 0, depositMethod: "cash" });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    return res.body.order.id;
  };
  const x1 = await mk(A, "ZE1", 3);
  const x2 = await mk(A, "ZE2", 4);
  const x3 = await mk(Bc, "ZE1", 4);
  assert.equal((await setStatus(Bc, { id: x3 }, "cancelled")).status, 200);
  const loc = async (qs) => {
    const res = await call(ADMIN, "GET", `/api/orders?limit=100&q=${encodeURIComponent(tag)}&${qs}`);
    assert.equal(res.status, 200, `${qs}: ${JSON.stringify(res.body)}`);
    return new Set(res.body.orders.map((x) => x.id));
  };
  assert.deepEqual(await loc(""), new Set([x1, x2, x3]));
  assert.deepEqual(await loc(`tu=${vnDate(4)}&den=${vnDate(4)}`), new Set([x2, x3]), "ngày đi");
  assert.deepEqual(await loc("dichVu=ZE2"), new Set([x2]), "dịch vụ");
  assert.deepEqual(await loc("status=draft&status=cancelled"), new Set([x1, x2, x3]), "trạng thái chọn nhiều");
  assert.deepEqual(await loc("status=cancelled"), new Set([x3]));
  assert.deepEqual(await loc(`nguoiLap=${bId}`), new Set([x3]), "người lập");
  assert.deepEqual(await loc(`nguoiLap=${bId}&dichVu=ZE1&tu=${vnDate(4)}&status=cancelled`), new Set([x3]), "bốn điều kiện cùng lúc");
  assert.deepEqual(await loc(`dichVu=ZE1&den=${vnDate(3)}`), new Set([x1]));
  const bad = await call(ADMIN, "GET", `/api/orders?tu=${vnDate(5)}&den=${vnDate(1)}`);
  assert.equal(bad.status, 400);
  assert.equal(bad.body.error.message, "Từ ngày không được sau Đến ngày.");
  assert.equal((await call(ADMIN, "GET", "/api/orders?tu=2026-02-30")).status, 400);
  console.log("✓ bộ lọc danh sách đơn: ngày đi, dịch vụ, trạng thái, người lập chọn đồng thời; tham số sai → 400");
}
// Chữ tìm dài (tên khách có dấu, mẫu LIKE > 50 byte): D1 từ chối mẫu dài hơn 50 byte ("LIKE or GLOB pattern too complex") — trước đây GET này trả 500. Nay máy chủ cắt chữ tìm
// theo byte (mauLikeChua) nên vẫn 200 và thấy đơn. Đây là bằng chứng trên D1 thật (local) mà khung thử SQLite không cho được.
{
  const tenDai = `Nguyễn Thị Phượng Hoàng Yến Nhi Thanh Tâm ${randomPhone().slice(-4)}`; // 46+ ký tự, > 48 byte; đuôi số để chỉ khớp đơn của đoạn này
  const dai = (await call(A, "POST", "/api/orders", { ...input, customerName: tenDai, discount: 0 }));
  assert.equal(dai.status, 201, JSON.stringify(dai.body));
  const tim = await call(ADMIN, "GET", "/api/orders?limit=100&q=" + encodeURIComponent(tenDai));
  assert.equal(tim.status, 200, `chữ tìm dài phải 200, không 500: ${JSON.stringify(tim.body)}`);
  assert.ok(tim.body.orders.some((x) => x.id === dai.body.order.id), "thấy đơn có tên khách dài (tìm theo phần đầu)");
  for (const q of ["ệ".repeat(100), "x".repeat(100), "%".repeat(100)]) {
    const kq = await call(ADMIN, "GET", "/api/orders?q=" + encodeURIComponent(q));
    assert.equal(kq.status, 200, `q ${q.length} ký tự phải 200: ${JSON.stringify(kq.body)}`);
  }
  console.log("✓ ô tìm danh sách đơn: chữ tìm dài (tên có dấu, 100 ký tự) → 200, không 500");
}
console.log("E2E OK");
