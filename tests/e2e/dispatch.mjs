// Người phụ trách đơn (module dispatch; ADR-0006, ADR-0009): đơn mới tự có người phụ trách = người lập NẾU người lập đủ điều kiện làm người phụ trách
// (tài khoản chỉ Đối tác thì không — ADR-0014 điều 9/10: đơn để trống, nhân viên nhận sau); đổi người = đóng dòng cũ + mở dòng mới + nhật ký;
// nhận đơn chưa có người; ai được làm gì; người được giao phải là SALES/ADMIN đang hoạt động có hồ sơ; tranh chấp song song đúng một bên thắng;
// người phụ trách (khác người lập) sửa được đơn (bộ kiểm hành vi đầy đủ ở các mục cuối và ở orders/trip/permissions.mjs).
// Dùng tài khoản dùng một lần (randomPhone) cho người "không liên quan" và người "đã ngưng"; đóng dòng HANDLE bằng SQL để có đơn "chưa có người phụ trách".
import assert from "node:assert/strict";
import { ACCOUNTS, call, login, manualService, orderInput, randomPhone, session, sql, sqlRows, vnDate } from "./lib.mjs";

const A = await session(ACCOUNTS.salesA);
const B = await session(ACCOUNTS.salesB);
const ADMIN = await session(ACCOUNTS.admin);
const ACC = await session(ACCOUNTS.accountant);
const FIELD = await session(ACCOUNTS.field);
const SUPER = await session(ACCOUNTS.superAdmin);
const me = async (cookie) => (await call(cookie, "GET", "/api/auth/me")).body.staff;
const [a, b, adm, acc, fld] = [await me(A), await me(B), await me(ADMIN), await me(ACC), await me(FIELD)];

// Tài khoản dùng một lần: C (SALES, không liên quan tới các đơn), D (SALES nhưng đã ngưng hoạt động), P (CHỈ Đối tác — PARTNER, ADR-0014).
async function makeStaff(name, active = true, permissions = ["SALES"]) {
  const phone = randomPhone();
  const r = await call(ADMIN, "POST", "/api/staff", { fullName: name, phone, permissions });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const cookie = (await login(phone, r.body.pin)).cookie;
  if (!active) assert.equal((await call(ADMIN, "PATCH", `/api/staff/${r.body.staff.id}`, { active: false })).status, 200);
  return { id: r.body.staff.id, partyId: r.body.staff.partyId, name, cookie };
}
const tag = Date.now().toString(36);
const C = await makeStaff(`Cẩm Cửu ${tag}`);
const D = await makeStaff(`Đào Đã Nghỉ ${tag}`, false);
const P = await makeStaff(`Phan Đối Tác ${tag}`, true, ["PARTNER"]);

const newOrder = async (cookie = A) => {
  const r = await call(cookie, "POST", "/api/orders", orderInput());
  assert.equal(r.status, 201, JSON.stringify(r.body));
  return r.body.order;
};
const handlerOf = async (cookie, orderId) => {
  const r = await call(cookie, "GET", `/api/dispatch/handlers?orderIds=${orderId}`);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  return r.body.handlers[orderId];
};
const setHandler = (cookie, orderId, staffId) => call(cookie, "PUT", `/api/orders/${orderId}/handler`, { staffId });
const rowsOf = (orderId) =>
  sqlRows(`SELECT id, party_id, task_kind_code, status_code, valid_from_at, valid_to_at, created_by, updated_by, order_service_id FROM dsp_assignment WHERE order_id = '${orderId}' ORDER BY valid_from_at, rowid`);
const openOf = async (orderId) => (await rowsOf(orderId)).filter((r) => r.valid_to_at === null);
const history = async (cookie, order) => (await call(cookie, "GET", `/api/orders/${order.id}`)).body.history;
const changes = async (cookie, order) => (await history(cookie, order)).filter((h) => h.action === "order_handler_changed");
/** Mô phỏng đơn "chưa có người phụ trách" (đơn cũ trước 0014 của người lập chưa có hồ sơ): đóng dòng HANDLE đang mở bằng SQL. */
const dropHandler = (orderId) =>
  sql(`UPDATE dsp_assignment SET valid_to_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE order_id = '${orderId}' AND task_kind_code = 'HANDLE' AND valid_to_at IS NULL`);
const asDto = (who) => ({ partyId: who.partyId, staffId: who.id, name: who.fullName ?? who.name });

// --- 1) đơn mới: người lập là người phụ trách (một dòng HANDLE hạt đơn đang mở, không thêm dòng nhật ký)
const o1 = await newOrder(A);
assert.deepEqual(await handlerOf(A, o1.id), asDto(a));
let rows = await rowsOf(o1.id);
assert.equal(rows.length, 1);
assert.deepEqual([rows[0].task_kind_code, rows[0].status_code, rows[0].valid_to_at, rows[0].created_by, rows[0].order_service_id, rows[0].party_id], ["HANDLE", "PENDING", null, a.id, null, a.partyId]);
assert.deepEqual((await history(A, o1)).map((h) => h.action), ["created"], "đặt người phụ trách mặc định không thêm dòng nhật ký");
const oAdmin = await newOrder(ADMIN);
assert.deepEqual(await handlerOf(ADMIN, oAdmin.id), asDto(adm), "quản trị lập đơn cũng là người phụ trách của đơn mình");
console.log("✓ đơn mới: người lập là người phụ trách (một dòng HANDLE đang mở)");

// Tài khoản CHỈ Đối tác (có hồ sơ như mọi tài khoản) lập đơn: KHÔNG tự thành người phụ trách — ADR-0014 điều 9 ("hoặc để trống") và điều 10 (không tự thành
// người phụ trách bằng bất kỳ đường nào). Đơn để trống: không dòng HANDLE nào, không thêm nhật ký; nhân viên bán hàng nhận sau được (dispatch.claim).
assert.ok(P.partyId, "tài khoản Đối tác vẫn có hồ sơ — ca này KHÔNG phải nhánh 'chưa có hồ sơ'");
const oPartner = await newOrder(P.cookie);
assert.equal(await handlerOf(A, oPartner.id), null, "tài khoản chỉ Đối tác lập đơn KHÔNG được tự thành người phụ trách (ADR-0014 điều 9/10)");
assert.deepEqual(await rowsOf(oPartner.id), [], "không có dòng HANDLE nào (kể cả đã đóng) cho đơn do Đối tác lập");
assert.deepEqual((await history(ADMIN, oPartner)).map((h) => h.action), ["created"]);
const claimed = await setHandler(B, oPartner.id, b.id);
assert.equal(claimed.status, 200, JSON.stringify(claimed.body));
assert.deepEqual(await handlerOf(A, oPartner.id), asDto(b), "đơn để trống của Đối tác: nhân viên bán hàng nhận cho chính mình được");
console.log("✓ đơn mới do tài khoản CHỈ Đối tác lập: không có người phụ trách (không dòng HANDLE), nhân viên nhận sau được");

// --- 2) GET /api/dispatch/handlers: tra nhiều đơn, id lạ, giới hạn 100, quyền
let r = await call(A, "GET", `/api/dispatch/handlers?orderIds=${o1.id},${oAdmin.id},00000000-0000-4000-8000-000000000000`);
assert.equal(r.status, 200);
assert.deepEqual(r.body, { handlers: { [o1.id]: asDto(a), [oAdmin.id]: asDto(adm), "00000000-0000-4000-8000-000000000000": null } }, "đơn không có người phụ trách (hoặc không có đơn) → null");
assert.deepEqual(Object.keys(r.body.handlers[o1.id]).sort(), ["name", "partyId", "staffId"], "chỉ tên + id, không SĐT");
assert.doesNotMatch(JSON.stringify(r.body), /09\d{8}/, "không lộ SĐT");
assert.deepEqual((await call(A, "GET", "/api/dispatch/handlers")).body, { handlers: {} }, "thiếu orderIds = danh sách rỗng");
assert.deepEqual((await call(A, "GET", "/api/dispatch/handlers?orderIds=")).body, { handlers: {} });
const fake = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
r = await call(A, "GET", `/api/dispatch/handlers?orderIds=${Array.from({ length: 100 }, (_, i) => fake(i + 1)).join(",")}`);
assert.equal(r.status, 200);
assert.equal(Object.keys(r.body.handlers).length, 100);
for (const bad of [`abc`, `${o1.id},abc`, `${o1.id},,${oAdmin.id}`, "1'%20OR%20'1'='1", Array.from({ length: 101 }, (_, i) => fake(i + 1)).join(",")]) {
  r = await call(A, "GET", `/api/dispatch/handlers?orderIds=${bad}`);
  assert.equal(r.status, 400, bad.slice(0, 60));
  assert.equal(r.body.error.code, "invalid_input");
}
assert.equal((await call(ACC, "GET", `/api/dispatch/handlers?orderIds=${o1.id}`)).status, 200, "kế toán xem được (như xem đơn)");
assert.equal((await call(FIELD, "GET", `/api/dispatch/handlers?orderIds=${o1.id}`)).status, 403, "FIELD không dùng màn hình đơn");
assert.equal((await call(null, "GET", `/api/dispatch/handlers?orderIds=${o1.id}`)).status, 401);
console.log("✓ GET /api/dispatch/handlers: tra nhiều đơn, null cho đơn không có người, tối đa 100, giá trị lạ 400, quyền");

// --- 3) GET /api/dispatch/assignees: chỉ SALES/ADMIN đang hoạt động có hồ sơ; chỉ tên
r = await call(A, "GET", "/api/dispatch/assignees");
assert.equal(r.status, 200, JSON.stringify(r.body));
const ids = r.body.assignees.map((x) => x.staffId);
for (const who of [a, b, adm, C]) assert.ok(ids.includes(who.id), `${who.id} phải có trong danh sách người có thể được giao`);
for (const [label, who] of [["kế toán", acc], ["đã ngưng", D]]) assert.ok(!ids.includes(who.id), `${label} không được có trong danh sách`);
assert.ok(ids.includes(fld.id), "FIELD nay đủ điều kiện làm người phụ trách cấp hẹp (ADR-0014 điều 6) nên phải có trong danh sách");
assert.deepEqual(r.body.assignees.find((x) => x.staffId === b.id), asDto(b));
assert.ok(r.body.assignees.every((x) => Object.keys(x).sort().join() === "name,partyId,staffId"));
assert.doesNotMatch(JSON.stringify(r.body), /09\d{8}/, "không lộ SĐT");
assert.equal((await call(FIELD, "GET", "/api/dispatch/assignees")).status, 403);
assert.equal((await call(null, "GET", "/api/dispatch/assignees")).status, 401);
console.log("✓ GET /api/dispatch/assignees: chỉ SALES/ADMIN đang hoạt động có hồ sơ, chỉ tên");

// --- 4) đổi người: người lập A → B. Dòng cũ đóng, dòng mới mở CÙNG thời điểm, nhật ký "từ A sang B"
r = await setHandler(A, o1.id, b.id);
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.deepEqual(r.body, { handler: asDto(b) });
assert.deepEqual(await handlerOf(A, o1.id), asDto(b));
rows = await rowsOf(o1.id);
assert.equal(rows.length, 2, "dòng cũ được giữ (lịch sử), không xoá");
assert.equal(rows[0].party_id, a.partyId);
assert.ok(rows[0].valid_to_at, "dòng cũ đã đóng");
assert.deepEqual([rows[1].party_id, rows[1].valid_to_at, rows[1].created_by], [b.partyId, null, a.id]);
assert.equal(rows[0].valid_to_at, rows[1].valid_from_at, "đóng dòng cũ và mở dòng mới CÙNG một thời điểm");
assert.equal((await openOf(o1.id)).length, 1, "tối đa MỘT người phụ trách đang mở");
let ch = await changes(A, o1);
assert.equal(ch.length, 1);
assert.equal(ch[0].detail, `từ ${a.fullName} sang ${b.fullName}`);
assert.equal(ch[0].staffName, a.fullName);
assert.doesNotMatch(ch[0].detail, /09\d{8}/, "nhật ký chỉ ghi tên");
r = await call(ADMIN, "GET", `/api/audit?action=order_handler_changed&q=${o1.orderCode}`);
assert.equal(r.status, 200);
assert.deepEqual(r.body.entries.map((e) => [e.action, e.targetLabel, e.orderId]), [["order_handler_changed", o1.orderCode, o1.id]]);
console.log("✓ đổi người phụ trách: dòng cũ đóng, dòng mới mở cùng thời điểm, nhật ký 'từ A sang B' (chỉ tên)");

// --- 5) ai đổi được: người phụ trách hiện tại (B), người lập (A) kể cả sau khi đã giao lại, quản trị; người khác thì không
assert.equal((await setHandler(B, o1.id, a.id)).status, 200, "người phụ trách hiện tại đổi được");
assert.deepEqual(await handlerOf(A, o1.id), asDto(a));
assert.equal((await setHandler(A, o1.id, C.id)).status, 200);
assert.equal((await setHandler(A, o1.id, b.id)).status, 200, "người lập đổi được dù đã giao lại (ADR-0009 hệ quả)");
assert.equal((await setHandler(ADMIN, o1.id, a.id)).status, 200, "quản trị đổi được mọi đơn");
const stableRows = (await rowsOf(o1.id)).length;
for (const [label, cookie, target] of [
  ["SALES không liên quan → giao cho người khác", C.cookie, b.id],
  ["kế toán", ACC, acc.id],
]) {
  r = await setHandler(cookie, o1.id, target);
  assert.equal(r.status, 403, `${label} → ${r.status} ${JSON.stringify(r.body)}`);
  assert.equal(r.body.error.code, "forbidden");
}
// "Nhận" (tự đặt mình) một đơn ĐÃ có người phụ trách, bởi người CÓ quyền nhận: là thua đua chứ không phải vượt quyền → 409 stale (giao diện tải lại), không phải 403.
for (const [label, cookie, target] of [
  ["SALES không liên quan → tự nhận khi đã có người phụ trách", C.cookie, C.id],
  ["người phụ trách cũ (B) đã bị đổi → tự nhận lại", B, b.id],
]) {
  r = await setHandler(cookie, o1.id, target);
  assert.equal(r.status, 409, `${label} → ${r.status} ${JSON.stringify(r.body)}`);
  assert.equal(r.body.error.code, "stale", label);
}
assert.equal((await setHandler(FIELD, o1.id, fld.id)).status, 403, "FIELD bị chặn từ router");
assert.equal((await setHandler(null, o1.id, a.id)).status, 401);
assert.deepEqual(await handlerOf(A, o1.id), asDto(a), "bị từ chối thì không đổi gì");
assert.equal((await rowsOf(o1.id)).length, stableRows);
console.log("✓ ai đổi được: người lập (kể cả đã giao lại), người phụ trách hiện tại, quản trị; người khác/kế toán/FIELD bị từ chối; tự nhận đơn đã có người → 409 stale");

// --- 6) đổi sang chính người đang phụ trách = 409 no_change (không ghi gì)
const nChanges = (await changes(A, o1)).length;
r = await setHandler(A, o1.id, a.id);
assert.equal(r.status, 409);
assert.equal(r.body.error.code, "no_change");
assert.equal((await changes(A, o1)).length, nChanges, "no_change không ghi nhật ký");
assert.equal((await rowsOf(o1.id)).length, stableRows, "no_change không tạo dòng");
console.log("✓ đổi sang chính người đang phụ trách → 409 no_change");

// --- 7) người được giao phải là SALES/ADMIN/FIELD đang hoạt động có hồ sơ → còn lại 400 invalid_assignee; thân/đơn sai
for (const [label, target] of [["kế toán", acc.id], ["đã ngưng", D.id], ["không tồn tại", "00000000-0000-4000-8000-00000000abcd"]]) {
  r = await setHandler(A, o1.id, target);
  assert.equal(r.status, 400, `${label}: ${JSON.stringify(r.body)}`);
  assert.equal(r.body.error.code, "invalid_assignee", label);
}
// FIELD nay đủ điều kiện cấp hẹp làm người phụ trách (ADR-0014 điều 6) — thử trên đơn RIÊNG để không đụng trạng thái o1 đang được theo dõi ở trên.
const oFieldAssignee = await newOrder(A);
r = await setHandler(A, oFieldAssignee.id, fld.id);
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.deepEqual(await handlerOf(A, oFieldAssignee.id), asDto(fld));
console.log("✓ FIELD nay gán được làm người phụ trách (ADR-0014 điều 6, cấp hẹp)");
for (const body of [{}, { staffId: "" }, { staffId: 7 }, { staffId: "không phải id" }, null]) {
  r = await call(A, "PUT", `/api/orders/${o1.id}/handler`, body ?? undefined);
  assert.equal(r.status, 400, JSON.stringify(body));
  assert.equal(r.body.error.code, "invalid_input");
}
assert.equal((await setHandler(A, "00000000-0000-4000-8000-000000000000", a.id)).status, 404);
assert.equal((await setHandler(A, "abc", a.id)).status, 404);
assert.deepEqual(await handlerOf(A, o1.id), asDto(a), "bị từ chối thì không đổi gì");
assert.equal((await rowsOf(o1.id)).length, stableRows);
console.log("✓ giao cho kế toán/đã ngưng/không tồn tại → 400 invalid_assignee; thân sai → 400; đơn lạ → 404");

// --- 8) nhận đơn CHƯA có người phụ trách (dispatch.claim): SALES/ADMIN nhận cho CHÍNH MÌNH
const o2 = await newOrder(A);
await dropHandler(o2.id);
assert.equal(await handlerOf(A, o2.id), null, "đơn chưa có người phụ trách");
for (const [label, cookie, target] of [
  ["kế toán nhận", ACC, acc.id],
  ["SALES giao hộ người khác khi không phải người lập", B, a.id],
]) {
  r = await setHandler(cookie, o2.id, target);
  assert.equal(r.status, 403, `${label}: ${JSON.stringify(r.body)}`);
}
assert.equal((await setHandler(FIELD, o2.id, fld.id)).status, 403);
r = await setHandler(B, o2.id, b.id);
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.deepEqual(r.body, { handler: asDto(b) });
assert.deepEqual((await changes(A, o2)).map((h) => h.detail), [`từ chưa có người phụ trách sang ${b.fullName}`]);
assert.equal((await openOf(o2.id)).length, 1);
r = await setHandler(C.cookie, o2.id, C.id); // đã có người phụ trách: không còn "nhận" được — thua đua, không phải vượt quyền
assert.equal(r.status, 409, "chỉ nhận được đơn CHƯA có người phụ trách");
assert.equal(r.body.error.code, "stale");
// người lập / quản trị giao cho người khác khi chưa có người; đổi người thường
const o3 = await newOrder(A);
await dropHandler(o3.id);
assert.equal((await setHandler(A, o3.id, C.id)).status, 200, "người lập giao khi chưa có người");
const o4 = await newOrder(A);
await dropHandler(o4.id);
assert.equal((await setHandler(ADMIN, o4.id, b.id)).status, 200, "quản trị giao khi chưa có người");
console.log("✓ nhận đơn chưa có người phụ trách: SALES/ADMIN nhận cho mình; kế toán/FIELD/giao hộ bị từ chối");

// --- 9) người phụ trách (khác người lập) SỬA ĐƯỢC ĐƠN nhờ ctx.assigned; người khác thì không (bộ kiểm đầy đủ: mục cuối + orders/trip/permissions.mjs)
const o5 = await newOrder(A);
assert.equal((await setHandler(A, o5.id, b.id)).status, 200);
r = await call(B, "GET", `/api/orders/${o5.id}`);
assert.equal(r.body.canModify, true, "người phụ trách thấy canModify");
assert.ok(r.body.history.length >= 2, "người phụ trách xem được lịch sử đơn");
assert.equal((await call(C.cookie, "GET", `/api/orders/${o5.id}`)).body.canModify, false);
r = await call(B, "PUT", `/api/orders/${o5.id}`, orderInput({ customerNote: "người phụ trách sửa", expectedUpdatedAt: o5.updatedAt }));
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.order.customerNote, "người phụ trách sửa");
assert.equal((await call(C.cookie, "PUT", `/api/orders/${o5.id}`, orderInput({ expectedUpdatedAt: r.body.order.updatedAt }))).status, 403);
console.log("✓ người phụ trách (khác người lập) sửa được đơn nháp; SALES không liên quan thì không");

// --- 10) tranh chấp song song: đúng một bên thắng, bên thua không để lại dòng nào và KHÔNG có dòng nhật ký
// (Nếu hai request tình cờ chạy nối tiếp thì cả hai có thể thắng — lần thứ hai đọc người phụ trách đã đổi; bất biến vẫn phải đúng: số dòng nhật ký
//  và số dòng đã đóng đúng bằng số lần thắng, luôn còn đúng MỘT dòng đang mở. Chốt cứng của bên thua nằm ở service.test.ts trên SQLite thật.)
let sawStale = 0;
for (let round = 0; round < 5; round++) {
  const o = await newOrder(A);
  // Sáu yêu cầu cùng lúc từ ba người có quyền (người lập, quản trị; người phụ trách hiện tại là chính người lập) sang các người nhận khác nhau.
  const results = await Promise.all([
    setHandler(ADMIN, o.id, b.id), setHandler(A, o.id, C.id), setHandler(ADMIN, o.id, adm.id), setHandler(A, o.id, b.id), setHandler(ADMIN, o.id, C.id), setHandler(A, o.id, adm.id),
  ]);
  const wins = results.filter((z) => z.status === 200);
  for (const z of results) {
    assert.ok(z.status === 200 || (z.status === 409 && ["stale", "no_change"].includes(z.body.error.code)), `${z.status} ${JSON.stringify(z.body)}`);
  }
  sawStale += results.filter((z) => z.status === 409 && z.body.error.code === "stale").length;
  assert.ok(wins.length >= 1);
  assert.equal((await changes(A, o)).length, wins.length, "số dòng nhật ký = số lần đổi thắng");
  rows = await rowsOf(o.id);
  assert.equal(rows.length, 1 + wins.length, "không dòng thừa của bên thua");
  assert.equal(rows.filter((r) => r.valid_to_at !== null).length, wins.length, "số dòng đã đóng = số lần đổi thắng");
  const open = await openOf(o.id);
  assert.equal(open.length, 1, "luôn đúng MỘT người phụ trách đang mở");
  assert.ok(wins.some((z) => z.body.handler.partyId === open[0].party_id), "người phụ trách cuối cùng là của một bên thắng");
}
// nhận đơn chưa có người, ba người nhận CÙNG LÚC (mỗi người chỉ nhận cho chính mình) → đúng một người nhận được
const E = await makeStaff(`Đinh Em ${tag}`);
for (let round = 0; round < 5; round++) {
  const o = await newOrder(A);
  await dropHandler(o.id);
  const results = await Promise.all([setHandler(B, o.id, b.id), setHandler(C.cookie, o.id, C.id), setHandler(E.cookie, o.id, E.id)]);
  assert.equal(results.filter((z) => z.status === 200).length, 1, `đúng một người nhận được: ${results.map((z) => z.status)}`);
  for (const loser of results.filter((z) => z.status !== 200)) {
    // ĐÚNG MỘT kết quả cho bên thua: 409 stale — dù thua lúc ghi (câu chốt không áp dụng) hay đến sau khi đã có người phụ trách (người có quyền nhận, đơn đã có người).
    assert.equal(loser.status, 409, `bên thua: ${loser.status} ${JSON.stringify(loser.body)}`);
    assert.equal(loser.body.error.code, "stale", `bên thua: ${JSON.stringify(loser.body)}`);
    sawStale++;
  }
  assert.equal((await changes(A, o)).length, 1, "chỉ MỘT dòng nhật ký");
  assert.equal((await rowsOf(o.id)).length, 2, "dòng của người lập (đã đóng bằng SQL) + dòng của người nhận thắng — bên thua không để lại dòng nào");
  assert.equal((await openOf(o.id)).length, 1);
}
console.log(`✓ tranh chấp song song: đúng một bên thắng, bên thua không để lại dòng nào (409 stale thật gặp ${sawStale} lần / 10 vòng)`);

// --- 11) canModify đi theo người phụ trách HIỆN TẠI (giao diện và máy chủ dùng cùng một giá trị): người lập giữ quyền qua mọi lần đổi
const o6 = await newOrder(A);
const canModifyOf = async (cookie) => (await call(cookie, "GET", `/api/orders/${o6.id}`)).body.canModify;
const whoCan = async () => [await canModifyOf(A), await canModifyOf(B), await canModifyOf(C.cookie), await canModifyOf(ADMIN), await canModifyOf(ACC)]; // [A, B, C, ADMIN, kế toán]
assert.deepEqual(await whoCan(), [true, false, false, true, false], "mới lập: người lập (cũng là người phụ trách) và quản trị");
assert.equal((await setHandler(A, o6.id, b.id)).status, 200);
assert.deepEqual(await whoCan(), [true, true, false, true, false], "giao B: B có quyền, người lập giữ quyền");
assert.equal((await setHandler(B, o6.id, C.id)).status, 200, "B (người phụ trách) giao tiếp cho C");
assert.deepEqual(await whoCan(), [true, false, true, true, false], "B mất quyền, C có quyền");
assert.equal((await setHandler(ADMIN, o6.id, a.id)).status, 200);
assert.deepEqual(await whoCan(), [true, false, false, true, false], "giao lại cho người lập: C mất quyền");
console.log("✓ canModify đi theo người phụ trách hiện tại (người lập giữ quyền qua mọi lần đổi)");

// --- 12) nhật ký đơn: người phụ trách xem được (cả dòng đổi người); người không liên quan thì không
const histO1 = await history(A, o1);
assert.ok(histO1.some((h) => h.action === "order_handler_changed"));
assert.deepEqual(await history(C.cookie, o1), [], "SALES không liên quan không xem nhật ký đơn (ADR-0007)");
console.log("✓ nhật ký đơn: người phụ trách xem được, người không liên quan thì không");

// --- 13) POST /api/orders/:id/handler-cancel: FIELD huỷ đơn đang phụ trách, lý do đóng, không đổi cột tiền (ADR-0014 điều 11)
const handlerCancel = (cookie, orderId, body) => call(cookie, "POST", `/api/orders/${orderId}/handler-cancel`, body);
const orderMoney = async (orderId) => (await sqlRows(`SELECT status, subtotal, total, deposit_amount FROM orders WHERE id = '${orderId}'`))[0];

// Đơn nháp: FIELD chưa là người phụ trách (mặc định là A, người lập) → 403; gán rồi thử huỷ khi CÒN NHÁP → 409 (route chỉ nhận đơn đã xác nhận).
const o10 = await newOrder(A);
r = await handlerCancel(FIELD, o10.id, { reason: "customer_requested" });
assert.equal(r.status, 403, JSON.stringify(r.body));
console.log("✓ FIELD không phải người phụ trách → 403");

assert.equal((await setHandler(A, o10.id, fld.id)).status, 200);
r = await handlerCancel(FIELD, o10.id, { reason: "customer_requested" });
assert.equal(r.status, 409, JSON.stringify(r.body));
assert.equal(r.body.error.code, "not_editable");
console.log("✓ đơn nháp (chưa xác nhận) → 409, chưa huỷ được qua đường này");

// Đơn xác nhận được (orderInput() mặc định đã có departDate/pax hợp lệ — xác nhận thẳng): xác nhận, gán FIELD, thử lý do sai rồi lý do đúng.
const o11 = await newOrder(A);
assert.equal((await call(A, "POST", `/api/orders/${o11.id}/status`, { status: "confirmed" })).status, 200);
assert.equal((await setHandler(A, o11.id, fld.id)).status, 200);

r = await handlerCancel(FIELD, o11.id, {});
assert.equal(r.status, 400, JSON.stringify(r.body));
assert.equal(r.body.error.code, "invalid_input");
console.log("✓ thiếu lý do → 400");

r = await handlerCancel(FIELD, o11.id, { reason: "vì tôi thích vậy" });
assert.equal(r.status, 400);
console.log("✓ lý do ngoài danh sách đóng → 400");

r = await handlerCancel(A, o11.id, { reason: "customer_requested" });
assert.equal(r.status, 403, JSON.stringify(r.body));
console.log("✓ SALES (không dùng route này, dù là người lập) → 403");

const beforeMoney = await orderMoney(o11.id);
r = await handlerCancel(FIELD, o11.id, { reason: "customer_requested" });
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.deepEqual(r.body, { ok: true });
const afterMoney = await orderMoney(o11.id);
assert.equal(afterMoney.status, "cancelled");
assert.deepEqual([afterMoney.subtotal, afterMoney.total, afterMoney.deposit_amount], [beforeMoney.subtotal, beforeMoney.total, beforeMoney.deposit_amount], "huỷ không đổi cột tiền");
const h11 = await history(A, o11);
const entry = h11.find((x) => x.action === "order_cancelled_by_field");
assert.ok(entry, "phải có dòng nhật ký riêng cho huỷ qua đường FIELD");
assert.match(entry.detail ?? "", /Khách yêu cầu huỷ/);
console.log("✓ FIELD đang phụ trách huỷ đơn đã xác nhận, đúng lý do → 200, không đổi tiền, có dòng nhật ký riêng cho kế toán");

r = await handlerCancel(FIELD, o11.id, { reason: "customer_requested" });
assert.equal(r.status, 409, JSON.stringify(r.body));
assert.equal(r.body.error.code, "not_editable", "đơn đã huỷ rồi, không huỷ lại được");
console.log("✓ huỷ đơn đã huỷ rồi → 409");

r = await handlerCancel(FIELD, "00000000-0000-4000-8000-000000000000", { reason: "customer_requested" });
assert.equal(r.status, 404);
console.log("✓ đơn không tồn tại → 404");

// --- 13b) DK-T4-02 (kiểm toán 24/9; chủ dự án chốt 2026-09-26): tour ĐÃ QUA NGÀY ĐI (ngày đi < hôm nay giờ VN) → HDV không huỷ được nữa (409 `departed`),
// chỉ văn phòng huỷ; NGAY TRONG NGÀY ĐI vẫn huỷ được (khách không đến bến). Sửa số khách (handler-money-edit) giữ như cũ. Thời gian trôi mô phỏng bằng
// UPDATE order_service.depart_date trên D1 local tạm (trigger 0008 không khoá cột này — đúng cách kiểm toán dựng "tour 40 ngày trước").
const confirmedForField = async () => {
  const o = await newOrder(A);
  assert.equal((await call(A, "POST", `/api/orders/${o.id}/status`, { status: "confirmed" })).status, 200);
  assert.equal((await setHandler(A, o.id, fld.id)).status, 200);
  return o;
};
const setDepart = (orderId, date) => sql(`UPDATE order_service SET depart_date = '${date}' WHERE order_id = '${orderId}'`);
const fieldCancelLogs = async (orderId) => (await history(A, { id: orderId })).filter((h) => h.action === "order_cancelled_by_field").length;

const oPast = await confirmedForField();
await setDepart(oPast.id, vnDate(-1));
r = await handlerCancel(FIELD, oPast.id, { reason: "customer_requested" });
assert.equal(r.status, 409, JSON.stringify(r.body));
assert.equal(r.body.error.code, "departed");
assert.match(r.body.error.message, /đã qua ngày đi/);
assert.equal((await orderMoney(oPast.id)).status, "confirmed", "tour đã qua ngày đi: đơn VẪN đã xác nhận");
assert.equal(await fieldCancelLogs(oPast.id), 0, "không có dòng nhật ký huỷ");
r = await handlerCancel(FIELD, oPast.id, {});
assert.equal(r.status, 409, "thứ tự kiểm: 409 departed đứng TRƯỚC 400 lý do");
assert.equal(r.body.error.code, "departed");
r = await handlerCancel(A, oPast.id, { reason: "customer_requested" });
assert.equal(r.status, 403, "thứ tự kiểm: 403 (không phải người phụ trách cấp hẹp) đứng TRƯỚC 409 departed");
r = await call(FIELD, "POST", `/api/orders/${oPast.id}/handler-money-edit`, { reason: "tour đã đi — sửa số khách vẫn như cũ", services: oPast.services.filter((s) => s.catalogCode).map((s) => ({ id: s.id, pax: s.pax })) });
assert.equal(r.status, 200, `handler-money-edit KHÔNG đổi (chủ chọn "sửa số khách giữ như hiện nay"): ${JSON.stringify(r.body)}`);
r = await call(A, "POST", `/api/orders/${oPast.id}/status`, { status: "cancelled" });
assert.equal(r.status, 200, "văn phòng (người lập) vẫn huỷ được tour đã qua ngày đi");
console.log("✓ DK-T4-02: tour đã qua ngày đi → HDV huỷ 409 departed (trước 400, sau 403), đơn vẫn xác nhận; sửa số khách như cũ; văn phòng huỷ được");

const oToday = await confirmedForField();
await setDepart(oToday.id, vnDate(0));
r = await handlerCancel(FIELD, oToday.id, { reason: "not_reachable" });
assert.equal(r.status, 200, `ngày đi = hôm nay → HDV vẫn huỷ được: ${JSON.stringify(r.body)}`);
assert.equal((await orderMoney(oToday.id)).status, "cancelled");
console.log("✓ DK-T4-02: ngày đi = hôm nay (giờ VN) → HDV vẫn huỷ được (200)");

// --- 14) POST /api/orders/:id/handler-money-edit: FIELD sửa số khách của đơn đang phụ trách, giá theo giá lúc lập đơn, ghi dòng điều chỉnh
const T14 = "'2026-01-01T00:00:00.000Z'";
await sql(`INSERT INTO catalog_item (code,name,unit,price_adult,price_child,price_senior,price_infant,note_child,note_senior,note_infant,sheet_row,in_sheet,first_seen_at,updated_at) VALUES
  ('ZH1','Tour thử (handler-money-edit)','perPax',300000,NULL,NULL,NULL,NULL,NULL,NULL,99,1,${T14},${T14})`);
try {
  const catSvc = (extra = {}) => ({ kind: "catalog", catalogCode: "ZH1", pax: { adult: 2 }, catalogPriceSeen: { adult: 300000 }, departDate: vnDate(7), ...extra });
  const moneyEdit = (cookie, orderId, body) => call(cookie, "POST", `/api/orders/${orderId}/handler-money-edit`, body);
  const orderView = async (cookie, orderId) => (await call(cookie, "GET", `/api/orders/${orderId}`)).body.order;
  const storedPax = async (orderId) => (await sqlRows(`SELECT pax_adult FROM order_service WHERE order_id = '${orderId}'`))[0].pax_adult;

  const o14 = (await call(A, "POST", "/api/orders", orderInput({ services: [catSvc()] }))).body.order;
  const svcId = o14.services[0].id;
  const pax = (adult) => ({ adult, child: 0, senior: 0, infant: 0 });

  r = await moneyEdit(FIELD, o14.id, { reason: "x", services: [{ id: svcId, pax: pax(3) }] });
  assert.equal(r.status, 403, JSON.stringify(r.body));
  console.log("✓ FIELD không phải người phụ trách → 403");

  assert.equal((await setHandler(A, o14.id, fld.id)).status, 200);
  r = await moneyEdit(FIELD, o14.id, { reason: "x", services: [{ id: svcId, pax: pax(3) }] });
  assert.equal(r.status, 409, JSON.stringify(r.body));
  assert.equal(r.body.error.code, "not_editable");
  console.log("✓ đơn nháp (chưa xác nhận) → 409");

  assert.equal((await call(A, "POST", `/api/orders/${o14.id}/status`, { status: "confirmed" })).status, 200, JSON.stringify(await call(A, "GET", `/api/orders/${o14.id}`)));

  r = await moneyEdit(FIELD, o14.id, { reason: "", services: [{ id: svcId, pax: pax(3) }] });
  assert.equal(r.status, 400, JSON.stringify(r.body));
  console.log("✓ thiếu lý do → 400");

  r = await moneyEdit(FIELD, o14.id, { reason: "x", services: [] });
  assert.equal(r.status, 400, JSON.stringify(r.body));
  console.log("✓ thiếu dịch vụ (đơn có 1 dịch vụ từ danh mục, gửi rỗng) → 400");

  r = await moneyEdit(A, o14.id, { reason: "x", services: [{ id: svcId, pax: pax(3) }] });
  assert.equal(r.status, 403, JSON.stringify(r.body));
  console.log("✓ SALES (không dùng route này) → 403");

  // Kế toán/quản trị KHÔNG phải người phụ trách đơn này — route hẹp CHỈ dành cho FIELD đang phụ trách, không phải "ai có order.money.edit=any"
  // (ACCOUNTING/ADMIN có order.money.edit=any nhưng đó là cho một route KHÁC, chưa làm — không phải route hẹp này).
  r = await moneyEdit(ACC, o14.id, { reason: "x", services: [{ id: svcId, pax: pax(3) }] });
  assert.equal(r.status, 403, JSON.stringify(r.body));
  r = await moneyEdit(ADMIN, o14.id, { reason: "x", services: [{ id: svcId, pax: pax(3) }] });
  assert.equal(r.status, 403, JSON.stringify(r.body));
  console.log("✓ ACCOUNTING/ADMIN không phải người phụ trách đơn này → 403 (route hẹp chỉ dành cho FIELD đang phụ trách)");

  const beforePax = await storedPax(o14.id);
  r = await moneyEdit(FIELD, o14.id, { reason: "Khách báo thêm 1 người", services: [{ id: svcId, pax: pax(3) }] });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.deepEqual(r.body, { ok: true }, "không lộ giá cho FIELD");
  assert.equal(await storedPax(o14.id), beforePax, "order_service GỐC không đổi (chỉ ghi dòng điều chỉnh)");

  const viewed = await orderView(A, o14.id);
  assert.equal(viewed.subtotal, 900000, "hiển thị SỐ MỚI: 3 khách × 300,000");
  assert.equal(viewed.services[0].pax.adult, 3);
  const adjRows = await sqlRows(`SELECT seq, subtotal_before, subtotal_after FROM order_money_adjustment WHERE order_id = '${o14.id}' ORDER BY seq`);
  assert.deepEqual(adjRows.map((x) => [Number(x.seq), Number(x.subtotal_before), Number(x.subtotal_after)]), [[1, 600000, 900000]]);
  const h14 = await history(A, o14);
  assert.ok(h14.some((x) => x.action === "order_money_adjusted_by_field" && x.detail === "Khách báo thêm 1 người"));
  console.log("✓ FIELD sửa số khách đơn đã xác nhận → 200, order_service gốc không đổi, màn hình hiện số mới, có dòng điều chỉnh + nhật ký");

  // Task 8 Đợt E (hiện lý do trong "Lịch sử" ở trang chi tiết đơn): sửa ở GIAO DIỆN (web/order.ts), KHÔNG đổi API — hai khẳng định dưới đây
  // GHIM LẠI hành vi API đã đúng từ trước (đột biến `web/order.ts` không làm chúng đỏ; bằng chứng giao diện THẬT ở kịch bản Chrome
  // v1-nguoi-phu-trach.mjs bước b, nơi xoá dòng dựng `e.detail` mới làm đỏ được). Case 1 (chủ đề/brief): ADMIN (order.history.view = any) đọc
  // đúng lý do qua API, y hệt A (người lập, ownOrAssigned).
  const h14Admin = await history(ADMIN, o14);
  assert.ok(h14Admin.some((x) => x.action === "order_money_adjusted_by_field" && x.detail === "Khách báo thêm 1 người"), "ADMIN cũng đọc đúng lý do (order.history.view = any)");
  // Case 4 — ca hồi quy quyền quan trọng nhất: C (SALES không liên quan, không lập/không phụ trách o14) vẫn KHÔNG thấy GÌ, dù o14 giờ có một
  // dòng mang lý do — hành vi KHÔNG đổi so với trước (gần giống dispatch.mjs dòng ~283 với o1, lặp lại có chủ đích ở ĐÂY vì o14 là đơn CÓ
  // detail thật, không phải đơn trống — đây mới là ca có nguy cơ rò nếu ô quyền hoặc mã bị sửa sai).
  assert.deepEqual(await history(C.cookie, o14), [], "SALES không liên quan vẫn KHÔNG thấy nhật ký đơn có lý do — order.history.view giữ nguyên");
  console.log("✓ order.history.view không đổi: ADMIN thấy lý do (any), SALES không liên quan vẫn không thấy gì (ownOrAssigned)");

  // Trang DANH SÁCH đơn phải hiện ĐÚNG số như trang chi tiết (bản đầu chỉ sửa trang chi tiết, quên trang danh sách vẫn hiện số gốc — lỗi thật đã bắt).
  const listed = (await call(A, "GET", `/api/orders?q=${o14.orderCode}`)).body.orders.find((x) => x.id === o14.id);
  assert.ok(listed, "không tìm thấy đơn trong danh sách");
  assert.equal(listed.total, 900000, "danh sách đơn phải hiện SỐ MỚI (đã cộng điều chỉnh), khớp trang chi tiết");
  assert.equal(listed.remainingAmount, viewed.remainingAmount, "remainingAmount của danh sách phải khớp trang chi tiết");
  // Đợt E: TIỀN đã đúng từ trước (khẳng định ở trên) nhưng SỐ KHÁCH của danh sách từng vẫn hiện số CŨ (2 khách, order_service gốc đã đóng
  // băng) trong khi trang chi tiết đã hiện đúng số mới — hai con số cạnh nhau trên cùng thẻ nói khác nhau. Khẳng định này bắt đúng lỗi đó.
  assert.deepEqual(listed.pax, viewed.services[0].pax, "SỐ KHÁCH của danh sách đơn phải khớp trang chi tiết");
  assert.deepEqual(listed.pax, { adult: 3, child: 0, senior: 0, infant: 0 }, "danh sách đơn phải hiện SỐ KHÁCH MỚI (3), không phải số gốc (2)");
  console.log("✓ trang danh sách đơn hiện đúng số tiền LẪN số khách đã sửa, khớp trang chi tiết");

  // Đơn ĐÃ CÓ điều chỉnh rồi bị HUỶ (qua đường thường của SALES, không phải handler-cancel) vẫn phải hiện đúng số đã sửa gần nhất — không được
  // "quên" điều chỉnh và lùi lại số gốc chỉ vì đổi trạng thái sang cancelled (lỗi thật đã bắt: bản đầu chỉ overlay khi status === "confirmed").
  const o16 = (await call(A, "POST", "/api/orders", orderInput({ services: [catSvc()] }))).body.order;
  assert.equal((await call(A, "POST", `/api/orders/${o16.id}/status`, { status: "confirmed" })).status, 200);
  assert.equal((await setHandler(A, o16.id, fld.id)).status, 200);
  r = await moneyEdit(FIELD, o16.id, { reason: "Trước khi huỷ", services: [{ id: o16.services[0].id, pax: pax(4) }] });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal((await call(A, "POST", `/api/orders/${o16.id}/status`, { status: "cancelled" })).status, 200);
  const viewedCancelled = await orderView(A, o16.id);
  assert.equal(viewedCancelled.status, "cancelled");
  assert.equal(viewedCancelled.subtotal, 1200000, "đơn đã huỷ vẫn phải hiện SỐ ĐÃ SỬA gần nhất (4 khách × 300,000), không lùi về số gốc (2 khách)");
  assert.deepEqual(viewedCancelled.services[0].pax, { adult: 4, child: 0, senior: 0, infant: 0 });
  const listedCancelled = (await call(A, "GET", `/api/orders?q=${o16.orderCode}`)).body.orders.find((x) => x.id === o16.id);
  assert.equal(listedCancelled.total, 1200000, "danh sách đơn cũng phải khớp, kể cả đơn đã huỷ");
  assert.deepEqual(listedCancelled.pax, { adult: 4, child: 0, senior: 0, infant: 0 }, "danh sách đơn đã huỷ cũng phải hiện SỐ KHÁCH đã sửa gần nhất, không lùi về số gốc (2)");
  console.log("✓ đơn có điều chỉnh rồi bị huỷ: chi tiết lẫn danh sách vẫn hiện đúng cả tiền lẫn số khách đã sửa gần nhất, không lùi về số gốc");

  // Trang chủ (GET /api/orders/dashboard, "Chuyến đón hôm nay") dùng CHUNG hàm tóm tắt với /api/orders — đơn đón HÔM NAY có điều chỉnh số khách
  // phải hiện đúng số MỚI ở đây, khớp cả trang chi tiết lẫn /api/orders (bài học Đợt E: tiền đã overlay đúng ở dashboard từ trước, số khách thì chưa).
  const o18 = (await call(A, "POST", "/api/orders", orderInput({ services: [catSvc({ departDate: vnDate(0) })] }))).body.order;
  assert.equal((await call(A, "POST", `/api/orders/${o18.id}/status`, { status: "confirmed" })).status, 200);
  assert.equal((await setHandler(A, o18.id, fld.id)).status, 200);
  r = await moneyEdit(FIELD, o18.id, { reason: "Khách báo thêm 3 người", services: [{ id: o18.services[0].id, pax: pax(5) }] });
  assert.equal(r.status, 200, JSON.stringify(r.body));

  const viewed18 = await orderView(A, o18.id);
  assert.deepEqual(viewed18.services[0].pax, { adult: 5, child: 0, senior: 0, infant: 0 }, "đối chứng: chi tiết đơn đã hiện đúng số mới");

  const listed18 = (await call(A, "GET", `/api/orders?q=${o18.orderCode}`)).body.orders.find((x) => x.id === o18.id);
  assert.ok(listed18, "không tìm thấy o18 trong danh sách");
  assert.deepEqual(listed18.pax, { adult: 5, child: 0, senior: 0, infant: 0 });

  const dash = await call(A, "GET", "/api/orders/dashboard");
  assert.equal(dash.status, 200, JSON.stringify(dash.body));
  const dashToday = dash.body.today.find((x) => x.id === o18.id);
  assert.ok(dashToday, "o18 (đón hôm nay, confirmed) phải có trong Trang chủ / Chuyến đón hôm nay");
  assert.deepEqual(dashToday.pax, { adult: 5, child: 0, senior: 0, infant: 0 }, "Trang chủ (Chuyến đón hôm nay) phải hiện SỐ KHÁCH MỚI, khớp trang chi tiết và /api/orders (bài học Đợt E)");
  console.log("✓ sau khi FIELD sửa số khách: /api/orders, Trang chủ (dashboard.today) và trang chi tiết đơn đều hiện ĐÚNG số khách mới, khớp nhau");

  // --------------------------------------------------------------------------------------------------------------------------------------
  // Lỗi 1 + Lỗi 2 (kiểm độc lập Đợt E vòng 2): after_json của dòng điều chỉnh GẦN NHẤT bị HỎNG — dựng thẳng bằng SQL (order_money_adjustment
  // CHỈ-THÊM, không sửa/xoá được qua API bình thường, kể cả bằng SQL tay — trigger 0021 chặn UPDATE/DELETE; nhưng INSERT thêm MỘT dòng seq mới
  // thì được, đúng cách mô phỏng "dữ liệu hỏng ngoài tầm kiểm lúc ghi" mà không cần sửa trực tiếp dòng cũ). Tiếp tục dùng o18 (đã đo lành mạnh ở
  // trên — chi tiết/danh sách/Trang chủ đều đúng 5 khách) để so sánh trước/sau ngay trên CÙNG một đơn.
  // --------------------------------------------------------------------------------------------------------------------------------------
  const svc18 = o18.services[0].id;
  const maxSeq18 = Number((await sqlRows(`SELECT MAX(seq) AS s FROM order_money_adjustment WHERE order_id = '${o18.id}'`))[0].s);

  // --- Lỗi 1: after_json hỏng DẠNG MỀM (mảng đọc được, phần tử có mặt nhưng pax CHỈ có adult, thiếu child/senior/infant) — đúng ca kiểm độc lập
  // đo được: trước bản sửa, chi tiết đơn hiện "9 người lớn" (bịa từ dữ liệu thiếu) trong khi /orders và Trang chủ hiện "2 người lớn" (số đã lưu).
  // Số mong đợi TỰ TÍNH TỪ KỊCH BẢN (không chép từ kết quả chạy): pax hỏng → parseAdjustmentAfter loại bỏ phần tử này → dòng seq=softSeq có
  // after=[] → svc18 KHÔNG có trong after của dòng GẦN NHẤT → lùi về số ĐÃ LƯU GỐC (order_service, đóng băng lúc tạo đơn = 2 khách, biết trước vì
  // `catSvc()` mặc định `pax: { adult: 2 }`) × giá ZH1 (300.000/khách) = 600.000₫ — dùng số 600000 THẲNG, không lấy qua `detailSoft.total`.
  // `subtotal_after` trong SQL đặt = 999999999 (RÁC, KHÔNG PHẢI 600.000) CỐ Ý: Đợt E task 7 đã sửa nơi đọc (repository.ts) NGỪNG đọc cột này —
  // nếu khẳng định dưới đây vẫn thấy 600.000 dù cột lưu rác, tức mã ĐÃ THẬT SỰ không đọc cột đó nữa (không phải "tình cờ đặt đúng số" như bản cũ).
  const softSeq = maxSeq18 + 1;
  const softAfter = JSON.stringify([{ serviceId: svc18, pax: { adult: 9 } }]).replace(/'/g, "''");
  await sql(`INSERT INTO order_money_adjustment (id, order_id, seq, before_json, after_json, subtotal_before, subtotal_after) VALUES
    ('adj-soft-${o18.id}', '${o18.id}', ${softSeq}, '[]', '${softAfter}', 999999999, 999999999)`);

  const detailSoft = await orderView(A, o18.id);
  const listSoft = (await call(A, "GET", `/api/orders?q=${o18.orderCode}`)).body.orders.find((x) => x.id === o18.id);
  const dashSoft = await call(A, "GET", "/api/orders/dashboard");
  assert.equal(dashSoft.status, 200, "Trang chủ không được sập vì after_json hỏng dạng mềm");
  const dashTodaySoft = dashSoft.body.today.find((x) => x.id === o18.id);

  assert.deepEqual(detailSoft.services[0].pax, { adult: 2, child: 0, senior: 0, infant: 0 }, "chi tiết đơn: pax hỏng dạng mềm → lùi về số ĐÃ LƯU (2), không hiện 9 bịa từ dữ liệu thiếu (Lỗi 1)");
  assert.deepEqual(listSoft.pax, { adult: 2, child: 0, senior: 0, infant: 0 }, "Lỗi 1 đã sửa: /orders phải khớp CHÍNH XÁC số tự tính (2), trước đây lệch 2 so với 5/9");
  assert.deepEqual(dashTodaySoft.pax, { adult: 2, child: 0, senior: 0, infant: 0 }, "Lỗi 1 đã sửa: Trang chủ cũng phải khớp số tự tính (2)");
  assert.equal(detailSoft.subtotal, 600000, "chi tiết: tiền TỰ TÍNH LẠI từ dịch vụ, tự nhiên khớp với pax đã lùi (2×300,000) — không đọc cột subtotal_after");
  assert.equal(listSoft.total, 600000, "danh sách PHẢI tự tính 600.000 (2×300.000) — cột subtotal_after đã lưu RÁC (999999999), không được đọc lại");
  assert.equal(dashTodaySoft.total, 600000, "Trang chủ PHẢI tự tính 600.000 — CÙNG lý do, không đọc cột subtotal_after đã lưu rác");
  console.log("✓ Lỗi 1 đã sửa: after_json hỏng dạng mềm → chi tiết/​danh sách/​Trang chủ CÙNG số khách (2) VÀ CÙNG tiền (600.000, tự tính, không đọc cột subtotal_after đã lưu rác)");

  // --- Lỗi 2 + Lỗi 3: after_json hỏng NẶNG (không phải JSON hợp lệ) — trước bản sửa, một phần tử/nội dung như thế này làm applyAdjustedPax (đường
  // /orders, Trang chủ) NÉM LỖI, sập request cho MỌI nhân viên (không riêng đơn hỏng); đơn cũng "không gỡ được bằng thao tác bình thường" vì
  // getLatestAdjustment (đường GHI, editMoneyAsHandler dùng chung) cũng ném lỗi, khiến POST handler-money-edit tiếp theo cũng 500. `subtotal_after`
  // cũng đặt RÁC (cùng lý do khối Lỗi 1 ở trên): nơi đọc TỰ TÍNH LẠI từ dịch vụ (2×300.000=600.000), không đọc cột này.
  const hardSeq = softSeq + 1;
  await sql(`INSERT INTO order_money_adjustment (id, order_id, seq, before_json, after_json, subtotal_before, subtotal_after) VALUES
    ('adj-hard-${o18.id}', '${o18.id}', ${hardSeq}, '[]', 'khong phai JSON hop le', 999999999, 999999999)`);

  const detailHard = await orderView(A, o18.id);
  assert.deepEqual(detailHard.services[0].pax, { adult: 2, child: 0, senior: 0, infant: 0 }, "chi tiết đơn: after_json hỏng nặng → KHÔNG sập (Lỗi 2), lùi về số ĐÃ LƯU");
  assert.equal(detailHard.subtotal, 600000, "tiền chi tiết tự tính lại từ dịch vụ (2×300,000), không phụ thuộc after_json hỏng nặng");

  const listHard = await call(A, "GET", `/api/orders?q=${o18.orderCode}`);
  assert.equal(listHard.status, 200, "Lỗi 2 đã sửa: /api/orders KHÔNG được sập vì MỘT đơn có after_json hỏng nặng");
  const listedHard = listHard.body.orders.find((x) => x.id === o18.id);
  assert.deepEqual(listedHard.pax, { adult: 2, child: 0, senior: 0, infant: 0 });
  assert.equal(listedHard.total, 600000);

  // Một đơn KHÁC (o14, đứng trước o18 trong cùng file, không liên quan, KHÔNG có after_json hỏng) vẫn phải hiện đúng, không bị đơn hỏng của o18
  // kéo theo — CHỨNG MINH "chỉ ĐÚNG đơn đó rơi về số gốc", không phải cả trang chung một số phận. Truy vấn RIÊNG (không dùng chung `listHard`,
  // vốn lọc theo mã đơn của o18) để chắc chắn tìm đúng o14 dù D1 tạm có thể có nhiều đơn khác từ các mục kiểm trước.
  const listedO14StillOk = (await call(A, "GET", `/api/orders?q=${o14.orderCode}`)).body.orders.find((x) => x.id === o14.id);
  assert.ok(listedO14StillOk, "o14 (đơn khác, không liên quan) vẫn phải có trong /api/orders dù o18 có after_json hỏng nặng");
  assert.equal(listedO14StillOk.total, 900000, "o14 không bị ảnh hưởng bởi after_json hỏng của o18 — số tiền của NÓ vẫn đúng, không rơi về đâu cả");

  const dashHard = await call(A, "GET", "/api/orders/dashboard");
  assert.equal(dashHard.status, 200, "Lỗi 2 đã sửa: Trang chủ KHÔNG được sập vì MỘT đơn có after_json hỏng nặng");
  const dashTodayHard = dashHard.body.today.find((x) => x.id === o18.id);
  assert.deepEqual(dashTodayHard.pax, { adult: 2, child: 0, senior: 0, infant: 0 });
  assert.equal(dashTodayHard.total, 600000);
  console.log("✓ Lỗi 2 đã sửa: after_json hỏng NẶNG (không phải JSON) → /orders và Trang chủ KHÔNG sập, chỉ ĐÚNG đơn hỏng rơi về số gốc, đơn khác không bị kéo theo");

  // --- Lỗi 2 (biến thể khác, CÙNG mức "hỏng nặng" nhưng chạm nhánh mã KHÁC): after_json là JSON HỢP LỆ, LÀ MẢNG, nhưng một PHẦN TỬ không phải
  // object (`[null]`) — trước bản sửa, applyAdjustedPax/applyAdjustmentToOrder truy cập `.serviceId` thẳng trên phần tử đó, ném TypeError. Khác
  // với ca "không phải JSON hợp lệ" ở trên (từng đã được `try/catch` của đường DANH SÁCH/Trang chủ — bản CŨ — bắt được một phần; ca `[null]` này
  // mới là ca CHƯA có lưới nào trước bản sửa, đúng cơ chế gây "sập cả trang" mà kiểm độc lập đo được).
  const nullElemSeq = hardSeq + 1;
  await sql(`INSERT INTO order_money_adjustment (id, order_id, seq, before_json, after_json, subtotal_before, subtotal_after) VALUES
    ('adj-nullelem-${o18.id}', '${o18.id}', ${nullElemSeq}, '[]', '[null]', 999999999, 999999999)`);

  const detailNullElem = await orderView(A, o18.id);
  assert.deepEqual(detailNullElem.services[0].pax, { adult: 2, child: 0, senior: 0, infant: 0 }, "chi tiết đơn: after_json = [null] → KHÔNG sập, lùi về số ĐÃ LƯU");
  assert.equal(detailNullElem.subtotal, 600000, "chi tiết: 2×300.000 (tự tính), không phụ thuộc after_json hỏng");
  const listNullElem = await call(A, "GET", `/api/orders?q=${o18.orderCode}`);
  assert.equal(listNullElem.status, 200, "Lỗi 2 đã sửa: /api/orders KHÔNG được sập vì after_json = [null] (ca cụ thể kiểm độc lập đo được)");
  const listedNullElem = listNullElem.body.orders.find((x) => x.id === o18.id);
  assert.deepEqual(listedNullElem.pax, { adult: 2, child: 0, senior: 0, infant: 0 });
  assert.equal(listedNullElem.total, 600000, "danh sách PHẢI tự tính 600.000 — cột subtotal_after đã lưu RÁC, không được đọc lại");
  const dashNullElem = await call(A, "GET", "/api/orders/dashboard");
  assert.equal(dashNullElem.status, 200, "Lỗi 2 đã sửa: Trang chủ KHÔNG được sập vì after_json = [null]");
  assert.equal(dashNullElem.body.today.find((x) => x.id === o18.id).total, 600000, "Trang chủ PHẢI tự tính 600.000 — CÙNG lý do");
  console.log("✓ Lỗi 2 đã sửa (biến thể [null]): phần tử KHÔNG phải object trong after_json → /orders và Trang chủ vẫn 200, không sập, tiền tự tính đúng 600.000");

  // --- Lỗi 1 (biến thể TRÙNG serviceId — phát hiện ở vòng kiểm độc lập THỨ HAI trên CHÍNH task này, sau khi bản sửa đầu "coi là xong"): after_json
  // có HAI phần tử CÙNG serviceId, cả hai hợp lệ về DẠNG (chỉ tới được đây qua dữ liệu hỏng ngoài tầm kiểm — parseMoneyEditInput chặn khi GHI).
  // Nếu parseAdjustmentAfter không tự gom (đứng sau thắng), applyAdjustmentToOrder (dựng Map — đứng sau thắng) và applyAdjustedPax (Array.find —
  // đứng TRƯỚC thắng) sẽ lại tự chọn khác nhau — ĐÚNG kiểu "hai luật khác nhau ở hai nơi" việc này phải xoá bỏ, chỉ dịch sang khâu hợp giải.
  const dupSeq = nullElemSeq + 1;
  const dupAfter = JSON.stringify([
    { serviceId: svc18, pax: { adult: 3, child: 0, senior: 0, infant: 0 } },
    { serviceId: svc18, pax: { adult: 7, child: 0, senior: 0, infant: 0 } },
  ]).replace(/'/g, "''");
  await sql(`INSERT INTO order_money_adjustment (id, order_id, seq, before_json, after_json, subtotal_before, subtotal_after) VALUES
    ('adj-dup-${o18.id}', '${o18.id}', ${dupSeq}, '[]', '${dupAfter}', 999999999, 999999999)`);

  const detailDup = await orderView(A, o18.id);
  const listDup = (await call(A, "GET", `/api/orders?q=${o18.orderCode}`)).body.orders.find((x) => x.id === o18.id);
  const dashDup = await call(A, "GET", "/api/orders/dashboard");
  const dashTodayDup = dashDup.body.today.find((x) => x.id === o18.id);
  const expectedDup = 7 * 300000; // 2.100.000 — phần tử ĐỨNG SAU (7) thắng, tự tính từ giá ZH1 (300.000/khách), KHÔNG đọc subtotal_after (đã lưu rác)
  assert.deepEqual(detailDup.services[0].pax, { adult: 7, child: 0, senior: 0, infant: 0 }, "chi tiết đơn: hai phần tử trùng serviceId → phần tử ĐỨNG SAU (7) thắng, không phải 3");
  assert.deepEqual(listDup.pax, { adult: 7, child: 0, senior: 0, infant: 0 }, "Lỗi 1 (biến thể trùng serviceId): /orders PHẢI khớp số tự tính (7)");
  assert.deepEqual(dashTodayDup.pax, { adult: 7, child: 0, senior: 0, infant: 0 }, "Trang chủ cũng phải khớp số tự tính (7)");
  assert.equal(detailDup.subtotal, expectedDup, "chi tiết: 7×300.000 = 2.100.000");
  assert.equal(listDup.total, expectedDup, "danh sách PHẢI tự tính 2.100.000 — cột subtotal_after đã lưu RÁC, không được đọc lại");
  assert.equal(dashTodayDup.total, expectedDup, "Trang chủ PHẢI tự tính 2.100.000 — CÙNG lý do");
  console.log("✓ Lỗi 1 đã sửa (biến thể trùng serviceId): after_json có hai phần tử cùng serviceId → chi tiết/​danh sách/​Trang chủ CÙNG lấy phần tử đứng sau (7), CÙNG tự tính tiền 2.100.000, không mỗi bên một số");

  // Bề mặt THỨ TƯ đọc after_json (kiểm độc lập lưu ý: getMyAssignments → loadOrderView → getLatestAdjustment) — "Việc của tôi" của chính FIELD đang
  // phụ trách o18, trong lúc dòng điều chỉnh gần nhất của o18 VẪN đang là dòng trùng serviceId ở trên. Không có trường tiền nào ở màn này nên chỉ
  // đo pax — phải khớp CÙNG quy tắc "đứng sau thắng" như ba bề mặt kia, và quan trọng hơn: KHÔNG được 500 (trước bản sửa Lỗi 2, đường này cũng
  // dùng chung getLatestAdjustment không có try/catch nên cũng sập — chính FIELD là người CẦN sửa lại đơn hỏng, không được kẹt ở màn này).
  const mineWhileDup = await call(FIELD, "GET", "/api/dispatch/mine");
  assert.equal(mineWhileDup.status, 200, "Lỗi 2 đã sửa: GET /api/dispatch/mine (bề mặt thứ tư đọc after_json) KHÔNG được sập khi đơn đang phụ trách có after_json hỏng");
  const mineO18 = mineWhileDup.body.assignments.find((x) => x.orderId === o18.id);
  assert.ok(mineO18, "o18 (FIELD đang phụ trách, đã xác nhận) phải có trong 'Việc của tôi'");
  assert.deepEqual(mineO18.services[0].pax, { adult: 7, child: 0, senior: 0, infant: 0 }, "'Việc của tôi' cũng phải khớp CÙNG số (7) — bề mặt thứ tư, không riêng ba bề mặt kia");
  console.log("✓ Bề mặt thứ tư (GET /api/dispatch/mine) cũng đọc đúng after_json qua parseAdjustmentAfter, không sập, khớp ba bề mặt còn lại");

  // "Đơn hỏng cũng không gỡ được bằng thao tác bình thường" (Lỗi 2) — trước bản sửa, editMoneyAsHandler (dùng chung getLatestAdjustment) cũng
  // ném lỗi 500 khi đọc dòng hỏng nặng, khiến HDV không sửa tiếp được. Giờ phải sửa được bình thường, ghi seq TIẾP THEO (dupSeq + 1).
  r = await moneyEdit(FIELD, o18.id, { reason: "Sửa lại sau khi thấy dữ liệu bất thường", services: [{ id: svc18, pax: pax(4) }] });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const afterRepairSeqs = (await sqlRows(`SELECT seq FROM order_money_adjustment WHERE order_id = '${o18.id}' ORDER BY seq`)).map((x) => Number(x.seq));
  assert.deepEqual(afterRepairSeqs, [1, softSeq, hardSeq, nullElemSeq, dupSeq, dupSeq + 1], "sửa lại bình thường phải ghi được dòng MỚI, không bị chặn bởi các dòng hỏng nặng phía trước");
  const detailRepaired = await orderView(A, o18.id);
  assert.deepEqual(detailRepaired.services[0].pax, { adult: 4, child: 0, senior: 0, infant: 0 }, "sau khi sửa lại: hiện đúng số MỚI (4), đơn đã 'gỡ' được khỏi trạng thái hỏng");
  console.log("✓ Lỗi 2 đã sửa: đơn có dòng điều chỉnh hỏng nặng vẫn SỬA LẠI được bằng thao tác bình thường (POST handler-money-edit), không còn kẹt 500");

  // --------------------------------------------------------------------------------------------------------------------------------------
  // Lỗi 4 (kiểm độc lập Đợt E vòng 2): sửa NHIỀU LẦN LIÊN TIẾP (2 → 5 → 3) — /orders và Trang chủ phải lấy ĐÚNG lần sửa GẦN NHẤT, cả số khách
  // LẪN số tiền, không phải lần đầu hay lần giữa. Dùng đơn MỚI (không phải o14 — đơn đó có bài kiểm tranh chấp ở dưới làm số dòng không đoán trước
  // được; không phải o18 — đơn đó vừa dùng để kiểm dữ liệu hỏng ở trên).
  // --------------------------------------------------------------------------------------------------------------------------------------
  const o19 = (await call(A, "POST", "/api/orders", orderInput({ services: [catSvc({ departDate: vnDate(0), pax: { adult: 2 } })] }))).body.order;
  const svc19 = o19.services[0].id;
  assert.equal((await call(A, "POST", `/api/orders/${o19.id}/status`, { status: "confirmed" })).status, 200);
  assert.equal((await setHandler(A, o19.id, fld.id)).status, 200);

  assert.equal((await moneyEdit(FIELD, o19.id, { reason: "Khách báo thêm người", services: [{ id: svc19, pax: pax(5) }] })).status, 200);
  assert.equal((await moneyEdit(FIELD, o19.id, { reason: "Khách huỷ bớt", services: [{ id: svc19, pax: pax(3) }] })).status, 200);

  const detail19 = await orderView(A, o19.id);
  const listed19 = (await call(A, "GET", `/api/orders?q=${o19.orderCode}`)).body.orders.find((x) => x.id === o19.id);
  const dash19 = await call(A, "GET", "/api/orders/dashboard");
  const dashToday19 = dash19.body.today.find((x) => x.id === o19.id);

  for (const [label, surface] of [["chi tiết đơn", detail19.services[0]], ["/orders", listed19], ["Trang chủ", dashToday19]]) {
    assert.deepEqual(surface.pax, { adult: 3, child: 0, senior: 0, infant: 0 }, `${label}: sau chuỗi sửa 2→5→3 phải hiện ĐÚNG lần CUỐI (3), không phải 2 hay 5`);
  }
  assert.equal(detail19.subtotal, 900000, "tiền chi tiết đơn = lần sửa CUỐI (3 khách × 300,000), không phải 600,000 (2) hay 1,500,000 (5)");
  assert.equal(listed19.total, 900000, "tiền /orders = lần sửa CUỐI");
  assert.equal(dashToday19.total, 900000, "tiền Trang chủ = lần sửa CUỐI");
  console.log("✓ Lỗi 4 đã có test: chuỗi sửa liên tiếp 2→5→3 — chi tiết/​danh sách/​Trang chủ đều lấy ĐÚNG lần sửa gần nhất, cả số khách lẫn tiền");

  // SUPER_ADMIN: any ở MỌI thao tác (ADR-0014 điều 2), kể cả route hẹp này — dùng được dù KHÔNG phải người phụ trách (đơn RIÊNG, không đụng o14).
  const o15 = (await call(A, "POST", "/api/orders", orderInput({ services: [catSvc()] }))).body.order;
  assert.equal((await call(A, "POST", `/api/orders/${o15.id}/status`, { status: "confirmed" })).status, 200);
  r = await moneyEdit(SUPER, o15.id, { reason: "SUPER_ADMIN test", services: [{ id: o15.services[0].id, pax: pax(3) }] });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  console.log("✓ SUPER_ADMIN dùng được route dù không phải người phụ trách (any ở mọi thao tác, ADR-0014 điều 2)");

  // "Việc của tôi": FIELD chỉ thấy đơn CHÍNH MÌNH đang phụ trách VÀ đã xác nhận — không thấy o10 (nháp), o11/o16 (đã huỷ), o15 (người khác phụ
  // trách). Tuyệt đối không có trường tiền nào trong phản hồi.
  const mine = async (cookie) => (await call(cookie, "GET", "/api/dispatch/mine")).body.assignments;
  const mineList = await mine(FIELD);
  const mineIds = mineList.map((x) => x.orderId);
  assert.ok(mineIds.includes(o14.id), "FIELD đang phụ trách o14 (đã xác nhận) phải thấy trong danh sách");
  for (const [label, id] of [["o10 (nháp)", o10.id], ["o11 (đã huỷ)", o11.id], ["o16 (đã huỷ)", o16.id], ["o15 (người khác phụ trách)", o15.id]]) {
    assert.ok(!mineIds.includes(id), `${label} không được có trong danh sách của FIELD`);
  }
  const mine14 = mineList.find((x) => x.orderId === o14.id);
  assert.deepEqual(Object.keys(mine14).sort(), ["customerName", "customerPhone", "orderCode", "orderId", "services"]);
  assert.deepEqual(
    Object.keys(mine14.services[0]).sort(),
    ["catalogCode", "checkinDate", "checkinPlace", "checkinTime", "departDate", "departTime", "editablePaxCodes", "id", "name", "note", "pax", "pickupPlace", "pickupTime"].sort(),
  );
  assert.doesNotMatch(JSON.stringify(mine14), /subtotal|discount|total|price|amount/i, "tuyệt đối không lộ trường tiền nào");
  assert.deepEqual(mine14.services[0].editablePaxCodes, ["adult"]);
  assert.equal((await mine(A)).some((x) => x.orderId === o14.id), false, "SALES (đã đổi người phụ trách o14 sang FIELD từ đầu mục 14) không còn thấy o14 trong DANH SÁCH CỦA CHÍNH HỌ");
  assert.deepEqual(await mine(ACC), [], "kế toán gọi được (access staff), chỉ không có đơn nào của họ — không lỗi");
  console.log("✓ GET /api/dispatch/mine: chỉ đơn CHÍNH MÌNH đang phụ trách, đã xác nhận, không có trường tiền nào");

  // editablePaxCodes không được "mất" loại khách sau khi bị sửa về 0 (lỗi thật tìm được lúc kiểm độc lập 2026-09-22): dịch vụ theo người có HAI
  // loại khách (adult+child) — sửa trẻ em về 0 rồi gọi lại /api/dispatch/mine phải VẪN thấy "child" trong editablePaxCodes (server vẫn chấp nhận
  // đặt lại > 0 sau đó), không phải chỉ còn "adult".
  await sql(`INSERT INTO catalog_item (code,name,unit,price_adult,price_child,price_senior,price_infant,note_child,note_senior,note_infant,sheet_row,in_sheet,first_seen_at,updated_at) VALUES
    ('ZH2','Tour thử (nhiều loại khách)','perPax',300000,150000,NULL,NULL,NULL,NULL,NULL,98,1,${T14},${T14})`);
  try {
    const o17 = (await call(A, "POST", "/api/orders", orderInput({
      services: [{ kind: "catalog", catalogCode: "ZH2", pax: { adult: 2, child: 1 }, catalogPriceSeen: { adult: 300000, child: 150000 }, departDate: vnDate(7) }],
    }))).body.order;
    const svc17 = o17.services[0].id;
    assert.equal((await call(A, "POST", `/api/orders/${o17.id}/status`, { status: "confirmed" })).status, 200);
    assert.equal((await setHandler(A, o17.id, fld.id)).status, 200);

    let mine17 = (await mine(FIELD)).find((x) => x.orderId === o17.id);
    assert.deepEqual(mine17.services[0].editablePaxCodes.slice().sort(), ["adult", "child"], "lúc đầu có cả hai loại khách");

    r = await moneyEdit(FIELD, o17.id, { reason: "Khách báo bé không đi nữa", services: [{ id: svc17, pax: pax(2) }] });
    assert.equal(r.status, 200, JSON.stringify(r.body));

    mine17 = (await mine(FIELD)).find((x) => x.orderId === o17.id);
    assert.equal(mine17.services[0].pax.child, 0, "số khách hiện hành đúng là 0");
    assert.deepEqual(mine17.services[0].editablePaxCodes.slice().sort(), ["adult", "child"], "sửa trẻ em về 0 KHÔNG được làm ô nhập trẻ em biến mất");

    r = await moneyEdit(FIELD, o17.id, { reason: "Khách đổi ý, bé đi lại", services: [{ id: svc17, pax: { adult: 2, child: 1, senior: 0, infant: 0 } }] });
    assert.equal(r.status, 200, JSON.stringify(r.body), "máy chủ vẫn phải cho đặt lại > 0 sau khi đã về 0");
    console.log("✓ editablePaxCodes không mất loại khách sau khi bị sửa về 0 (bug tìm được lúc kiểm độc lập, đã vá)");
  } finally {
    await sql("DELETE FROM catalog_item WHERE code = 'ZH2'").catch((e) => console.error("dọn danh mục giả ZH2 thất bại:", String(e).slice(0, 200)));
  }

  // Tranh chấp: N yêu cầu gửi gần như đồng thời, MỖI yêu cầu tự đọc "trạng thái gần nhất" tại thời điểm nó chạy — vì wrangler dev xử lý các
  // request bằng một luồng sự kiện xen kẽ (không phải song song thật), NHIỀU yêu cầu có thể đọc-rồi-ghi kế tiếp nhau hợp lệ (không phải lúc nào
  // cũng đúng MỘT yêu cầu thắng); bất biến CẦN kiểm không phải "đúng 1 thắng" mà là KHÔNG BAO GIỜ có hai yêu cầu cùng ghi trùng một `seq` (chỉ
  // mục duy nhất `idx_order_money_adjustment_seq` phải chặn thật mọi lần đụng nhau) — seq của mọi dòng mới phải LIÊN TỤC, không trùng, không nhảy cóc.
  const N = 8;
  const race = await Promise.all(Array.from({ length: N }, (_, i) => moneyEdit(FIELD, o14.id, { reason: `đua ${i}`, services: [{ id: svcId, pax: pax(4 + i) }] })));
  for (const x of race) assert.ok(x.status === 200 || (x.status === 409 && x.body.error?.code === "stale"), JSON.stringify(x));
  const wins = race.filter((x) => x.status === 200).length;
  assert.ok(wins >= 1, "ít nhất một yêu cầu phải thành công");
  const seqRows = await sqlRows(`SELECT seq FROM order_money_adjustment WHERE order_id = '${o14.id}' ORDER BY seq`);
  const seqs = seqRows.map((x) => Number(x.seq));
  assert.deepEqual(seqs, Array.from({ length: seqs.length }, (_, i) => i + 1), "seq của mọi dòng liên tục từ 1, không trùng, không nhảy cóc");
  assert.equal(seqs.length, 1 + wins, "số dòng MỚI (sau lần sửa đầu tiên ở trên) đúng bằng số yêu cầu thành công trong đợt tranh chấp này");
  console.log(`✓ ${N} yêu cầu sửa gần như đồng thời: ${wins} thành công, seq liên tục không trùng (chỉ mục duy nhất chặn thật mọi lần đụng nhau), còn lại 409 stale`);

  // --------------------------------------------------------------------------------------------------------------------------------------
  // Đợt E task 7 — CA LỖI GỐC đo được thật (kiểm độc lập): đơn có dịch vụ NHẬP TAY (ngoài danh mục) + có ít nhất một lần sửa số khách/tiền SAU
  // KHI XÁC NHẬN → trang chi tiết đơn và GET /api/dispatch/mine (không có trường tiền — chỉ đối chứng số khách, ADR-0007 điều 3) ĐÚNG; /api/orders
  // và Trang chủ (`/api/orders/dashboard`) từng THIẾU đúng tiền dịch vụ nhập tay (đo được: thiếu 200.000₫) vì đọc thẳng cột `subtotal_after` đã
  // lưu — cột này, ở nơi GHI cũ, chỉ cộng dịch vụ TỪ DANH MỤC. Sáu ca dưới đây (đặc tả điều phối viên mục D) mỗi ca TỰ TÍNH số mong đợi TỪ KỊCH
  // BẢN (giá ZH1 = 300.000₫/khách đã khai ở đầu khối `try` này, dịch vụ nhập tay = 200.000₫/dòng CỐ ĐỊNH) — KHÔNG chép số từ kết quả chạy (đây
  // chính là chỗ bộ kiểm CŨ ở đoạn hỏng after_json phía trên "kiểm giả": so đối chiếu bốn bề mặt VỚI NHAU thay vì với số tự tính — đã viết lại,
  // xem đoạn softSeq/hardSeq ở trên đã đặt `subtotal_after` thành số RÁC (999) thay vì số trùng hợp khớp).
  // --------------------------------------------------------------------------------------------------------------------------------------
  const manualSvc = (price, extra = {}) => manualService([{ description: "Phí phát sinh", quantity: 1, unitPrice: price }], extra);
  const measured = []; // bảng số đo cuối — in ra cuối khối này (yêu cầu báo cáo: "ca nào, tự tính tay bao nhiêu, bốn bề mặt trả về bao nhiêu")

  /** Đo BA bề mặt CÓ tiền (chi tiết đơn, /api/orders, Trang chủ hôm nay) + bề mặt thứ tư KHÔNG có tiền (Việc của tôi — chỉ đối chứng số khách). */
  async function measureFourSurfaces(orderId, orderCode) {
    const chiTiet = await orderView(A, orderId);
    const orders = (await call(A, "GET", `/api/orders?q=${orderCode}`)).body.orders.find((x) => x.id === orderId);
    const dash = await call(A, "GET", "/api/orders/dashboard");
    assert.equal(dash.status, 200, JSON.stringify(dash.body));
    const dashboard = dash.body.today.find((x) => x.id === orderId);
    const mine = (await call(FIELD, "GET", "/api/dispatch/mine")).body.assignments.find((x) => x.orderId === orderId);
    return { chiTiet, orders, dashboard, mine };
  }

  // --- D1: đơn CHỈ có dịch vụ DANH MỤC + sửa sau xác nhận (hồi quy — bốn bề mặt vốn đã đúng trước bản sửa này, xác nhận vẫn đúng sau) ------------
  {
    const d1 = (await call(A, "POST", "/api/orders", orderInput({ services: [catSvc({ pax: { adult: 2 }, departDate: vnDate(0) })] }))).body.order;
    assert.equal((await call(A, "POST", `/api/orders/${d1.id}/status`, { status: "confirmed" })).status, 200);
    assert.equal((await setHandler(A, d1.id, fld.id)).status, 200);
    r = await moneyEdit(FIELD, d1.id, { reason: "D1: chỉ danh mục", services: [{ id: d1.services[0].id, pax: pax(3) }] });
    assert.equal(r.status, 200, JSON.stringify(r.body));

    const expected = 3 * 300000; // 900.000 — 3 khách × 300.000, không có dịch vụ nhập tay nào
    const s = await measureFourSurfaces(d1.id, d1.orderCode);
    assert.equal(s.chiTiet.total, expected, "D1 chi tiết đơn");
    assert.equal(s.orders.total, expected, "D1 /api/orders");
    assert.ok(s.dashboard, "D1 phải có trong Trang chủ hôm nay");
    assert.equal(s.dashboard.total, expected, "D1 Trang chủ");
    assert.ok(s.mine, "D1 phải có trong Việc của tôi");
    assert.deepEqual(s.mine.services[0].pax, pax(3), "D1 Việc của tôi: số khách khớp");
    measured.push({ ca: "D1 chỉ danh mục", tuTinh: expected, chiTiet: s.chiTiet.total, orders: s.orders.total, dashboard: s.dashboard.total });
    console.log(`✓ D1 (chỉ danh mục): tự tính ${expected.toLocaleString("vi-VN")}₫ — chi tiết ${s.chiTiet.total.toLocaleString("vi-VN")}₫, /orders ${s.orders.total.toLocaleString("vi-VN")}₫, Trang chủ ${s.dashboard.total.toLocaleString("vi-VN")}₫`);
  }

  // --- D2: đơn CHỈ có dịch vụ NHẬP TAY + "sửa" sau xác nhận (route chỉ chấp nhận services:[] — không có dịch vụ danh mục nào để liệt kê) ----------
  {
    const d2 = (await call(A, "POST", "/api/orders", orderInput({ services: [manualSvc(200000, { departDate: vnDate(0) })] }))).body.order;
    assert.equal((await call(A, "POST", `/api/orders/${d2.id}/status`, { status: "confirmed" })).status, 200);
    assert.equal((await setHandler(A, d2.id, fld.id)).status, 200);
    r = await moneyEdit(FIELD, d2.id, { reason: "D2: chỉ nhập tay", services: [] });
    assert.equal(r.status, 200, JSON.stringify(r.body));

    const expected = 200000; // GIỮ NGUYÊN — đúng lỗi cũ: vòng lặp nơi ghi cũ chỉ duyệt catalogServices (rỗng ở đây) nên subtotal_after cũ = 0
    const s = await measureFourSurfaces(d2.id, d2.orderCode);
    assert.equal(s.chiTiet.total, expected, "D2 chi tiết đơn");
    assert.equal(s.orders.total, expected, "D2 /api/orders");
    assert.ok(s.dashboard, "D2 phải có trong Trang chủ hôm nay");
    assert.equal(s.dashboard.total, expected, "D2 Trang chủ");

    // Task 9 (kiểm độc lập, phần "còn cửa cho lần thứ NĂM"): TẤT CẢ khẳng định D1–D6 ở khối này đo BỀ MẶT ĐỌC (repository.ts) — từ Task 7, nơi
    // đọc đã NGỪNG tin cột order_money_adjustment.subtotal_before/subtotal_after đã lưu, tự tính lại từ order_service/order_item. Nghĩa là nếu
    // NƠI GHI (editMoneyAsHandler) hồi quy về đúng lỗi cũ (vòng lặp chỉ duyệt catalogServices, bỏ sót dịch vụ nhập tay khi cộng subtotal_after),
    // MỌI khẳng định phía trên (chi tiết/​​/orders/​Trang chủ) vẫn XANH — chỉ CỘT ĐÃ LƯU mới sai. Khẳng định dưới đây đọc THẲNG cột đó (không qua
    // effectiveSubtotal ở nơi đọc) — số mong đợi TỰ TÍNH TỪ KỊCH BẢN: D2 chỉ có dịch vụ nhập tay (200.000₫, không đổi qua lần "sửa" reason ở
    // trên vì route chỉ cho sửa dịch vụ TỪ DANH MỤC, ở đây rỗng) → before/after đều = 200.000 (own, effectiveSubtotal không có gì để tính lại).
    // Nơi ghi cũ (đúng lỗi đã vá) cho ra [0, 0] (vòng lặp catalogServices rỗng, không cộng gì) — khác 200.000 rất rõ, không thể trùng hợp đúng.
    // ĐỔI CÓ CHỦ Ý 2026-09-25 (vá DK-T2-01): lần "sửa" này không đổi số khách nào (đơn không có dịch vụ danh mục) → từ nay là lưu Y NGUYÊN, KHÔNG
    // ghi dòng điều chỉnh (planMoneyEdit write=false). Lưới cho cột ĐÃ LƯU ở nơi ghi (bài học Task 9: không bỏ sót dịch vụ nhập tay) vẫn còn ở D3
    // (đơn TRỘN, có đổi số khách thật) — khẳng định [800.000, 1.100.000] ở đó đọc thẳng cột subtotal_before/subtotal_after.
    const d2Rows = (await sqlRows(`SELECT count(*) AS n FROM order_money_adjustment WHERE order_id = '${d2.id}'`))[0];
    assert.equal(Number(d2Rows.n), 0, "D2: không có dịch vụ nào đổi số khách → không ghi dòng điều chỉnh");

    measured.push({ ca: "D2 chỉ nhập tay", tuTinh: expected, chiTiet: s.chiTiet.total, orders: s.orders.total, dashboard: s.dashboard.total });
    console.log(`✓ D2 (chỉ nhập tay): tự tính ${expected.toLocaleString("vi-VN")}₫ — chi tiết ${s.chiTiet.total.toLocaleString("vi-VN")}₫, /orders ${s.orders.total.toLocaleString("vi-VN")}₫, Trang chủ ${s.dashboard.total.toLocaleString("vi-VN")}₫; lưu y nguyên → không ghi dòng điều chỉnh`);
  }

  // --- D3: đơn TRỘN danh mục + nhập tay + sửa sau xác nhận — ĐÚNG CA LỖI GỐC kiểm độc lập đo được (thiếu 200.000₫) ------------------------------
  {
    const d3 = (
      await call(A, "POST", "/api/orders", orderInput({ services: [catSvc({ pax: { adult: 2 }, departDate: vnDate(0) }), manualSvc(200000, { departDate: vnDate(0) })] }))
    ).body.order;
    const d3SvcId = d3.services.find((s) => s.catalogCode === "ZH1").id;
    assert.equal((await call(A, "POST", `/api/orders/${d3.id}/status`, { status: "confirmed" })).status, 200);
    assert.equal((await setHandler(A, d3.id, fld.id)).status, 200);
    r = await moneyEdit(FIELD, d3.id, { reason: "D3: đơn trộn — ca lỗi gốc", services: [{ id: d3SvcId, pax: pax(3) }] });
    assert.equal(r.status, 200, JSON.stringify(r.body));

    const expected = 3 * 300000 + 200000; // 1.100.000 = 900.000 (danh mục, 3×300.000) + 200.000 (nhập tay) — bản cũ hiện 900.000 ở /orders & Trang chủ
    const s = await measureFourSurfaces(d3.id, d3.orderCode);
    assert.equal(s.chiTiet.total, expected, "D3 chi tiết đơn (đã đúng từ trước bản sửa này)");
    assert.equal(s.orders.total, expected, "D3 /api/orders — CA LỖI GỐC: bản cũ hiện 900.000 (thiếu 200.000) ở đây");
    assert.ok(s.dashboard, "D3 phải có trong Trang chủ hôm nay");
    assert.equal(s.dashboard.total, expected, "D3 Trang chủ — CA LỖI GỐC: bản cũ hiện 900.000 (thiếu 200.000) ở đây");
    assert.ok(s.mine, "D3 phải có trong Việc của tôi");
    assert.deepEqual(s.mine.services.find((x) => x.catalogCode === "ZH1").pax, pax(3), "D3 Việc của tôi: số khách khớp");

    // Task 9 (kiểm độc lập) — CÙNG lý do đã ghi ở khối D2 phía trên: đọc THẲNG cột order_money_adjustment.subtotal_before/subtotal_after ĐÃ LƯU
    // của D3 (đơn TRỘN — đúng ca lỗi gốc), không qua effectiveSubtotal ở nơi đọc. Số mong đợi TỰ TÍNH TỪ KỊCH BẢN: before = pax GỐC lúc lập đơn
    // (2 khách × 300.000 danh mục) + 200.000 (nhập tay, own, chưa đổi) = 800.000; after = 3×300.000 + 200.000 = 1.100.000 (= `expected` ở trên).
    // Nơi ghi cũ (đúng lỗi đã vá, vòng lặp chỉ duyệt catalogServices) sẽ lưu [600.000, 900.000] — THIẾU đúng 200.000 (nhập tay) ở CẢ HAI cột, dù
    // MỌI khẳng định bề mặt đọc ở trên (chi tiết/​/orders/​Trang chủ/​Việc của tôi) vẫn xanh (chúng không đọc lại cột này).
    const d3Adj = (await sqlRows(`SELECT subtotal_before, subtotal_after FROM order_money_adjustment WHERE order_id = '${d3.id}' ORDER BY seq DESC LIMIT 1`))[0];
    const d3ExpectedBefore = 2 * 300000 + 200000; // 800.000
    assert.deepEqual(
      [Number(d3Adj.subtotal_before), Number(d3Adj.subtotal_after)],
      [d3ExpectedBefore, expected],
      `D3 NƠI GHI (cột đã lưu): phải là [${d3ExpectedBefore.toLocaleString("vi-VN")}₫, ${expected.toLocaleString("vi-VN")}₫] — nơi ghi cũ sẽ lưu [600.000₫, 900.000₫], thiếu 200.000₫ (nhập tay) ở cả hai cột`,
    );

    measured.push({ ca: "D3 TRỘN — ca lỗi gốc", tuTinh: expected, chiTiet: s.chiTiet.total, orders: s.orders.total, dashboard: s.dashboard.total });
    console.log(`✓ D3 (TRỘN, ca lỗi gốc): tự tính ${expected.toLocaleString("vi-VN")}₫ — chi tiết ${s.chiTiet.total.toLocaleString("vi-VN")}₫, /orders ${s.orders.total.toLocaleString("vi-VN")}₫, Trang chủ ${s.dashboard.total.toLocaleString("vi-VN")}₫; cột đã lưu [before, after] = [${Number(d3Adj.subtotal_before).toLocaleString("vi-VN")}₫, ${Number(d3Adj.subtotal_after).toLocaleString("vi-VN")}₫]`);
  }

  // --- D4: đơn TRỘN + NHIỀU LẦN SỬA LIÊN TIẾP (2 gốc → 5 → 6 → 4) — bốn bề mặt phải lấy ĐÚNG lần sửa GẦN NHẤT ----------------------------------
  {
    const d4 = (
      await call(A, "POST", "/api/orders", orderInput({ services: [catSvc({ pax: { adult: 2 }, departDate: vnDate(0) }), manualSvc(200000, { departDate: vnDate(0) })] }))
    ).body.order;
    const d4SvcId = d4.services.find((s) => s.catalogCode === "ZH1").id;
    assert.equal((await call(A, "POST", `/api/orders/${d4.id}/status`, { status: "confirmed" })).status, 200);
    assert.equal((await setHandler(A, d4.id, fld.id)).status, 200);
    for (const p of [5, 6, 4]) {
      r = await moneyEdit(FIELD, d4.id, { reason: `D4: sửa còn ${p} khách`, services: [{ id: d4SvcId, pax: pax(p) }] });
      assert.equal(r.status, 200, JSON.stringify(r.body));
    }

    const expected = 4 * 300000 + 200000; // 1.400.000 — LẦN CUỐI (4), không phải lần giữa (5 → 1.700.000, hay 6 → 2.000.000)
    const s = await measureFourSurfaces(d4.id, d4.orderCode);
    assert.equal(s.chiTiet.total, expected, "D4 chi tiết đơn");
    assert.equal(s.orders.total, expected, "D4 /api/orders");
    assert.ok(s.dashboard, "D4 phải có trong Trang chủ hôm nay");
    assert.equal(s.dashboard.total, expected, "D4 Trang chủ");
    measured.push({ ca: "D4 TRỘN, nhiều lần sửa", tuTinh: expected, chiTiet: s.chiTiet.total, orders: s.orders.total, dashboard: s.dashboard.total });
    console.log(`✓ D4 (TRỘN, sửa liên tiếp 2→5→6→4): tự tính ${expected.toLocaleString("vi-VN")}₫ — chi tiết ${s.chiTiet.total.toLocaleString("vi-VN")}₫, /orders ${s.orders.total.toLocaleString("vi-VN")}₫, Trang chủ ${s.dashboard.total.toLocaleString("vi-VN")}₫`);
  }

  // --- D5: đơn TRỘN + CỌC + sửa — "còn thu" (remainingAmount) phải đúng ở CẢ BỐN bề mặt --------------------------------------------------------
  {
    const d5 = (
      await call(
        A, "POST", "/api/orders",
        orderInput({
          services: [catSvc({ pax: { adult: 2 }, departDate: vnDate(0) }), manualSvc(200000, { departDate: vnDate(0) })],
          depositAmount: 300000, depositMethod: "cash",
        }),
      )
    ).body.order;
    const d5SvcId = d5.services.find((s) => s.catalogCode === "ZH1").id;
    assert.equal((await call(A, "POST", `/api/orders/${d5.id}/status`, { status: "confirmed" })).status, 200);
    assert.equal((await setHandler(A, d5.id, fld.id)).status, 200);
    r = await moneyEdit(FIELD, d5.id, { reason: "D5: đơn trộn có cọc", services: [{ id: d5SvcId, pax: pax(4) }] });
    assert.equal(r.status, 200, JSON.stringify(r.body));

    const expectedTotal = 4 * 300000 + 200000; // 1.400.000
    const expectedRemaining = expectedTotal - 300000; // 1.100.000 (cọc không đổi qua điều chỉnh)
    const s = await measureFourSurfaces(d5.id, d5.orderCode);
    assert.equal(s.chiTiet.total, expectedTotal, "D5 chi tiết đơn: total");
    assert.equal(s.chiTiet.remainingAmount, expectedRemaining, "D5 chi tiết đơn: còn thu");
    assert.equal(s.orders.total, expectedTotal, "D5 /api/orders: total");
    assert.equal(s.orders.remainingAmount, expectedRemaining, "D5 /api/orders: còn thu");
    assert.ok(s.dashboard, "D5 phải có trong Trang chủ hôm nay");
    assert.equal(s.dashboard.total, expectedTotal, "D5 Trang chủ: total");
    assert.equal(s.dashboard.remainingAmount, expectedRemaining, "D5 Trang chủ: còn thu");
    measured.push({ ca: "D5 TRỘN + cọc (còn thu)", tuTinh: expectedRemaining, chiTiet: s.chiTiet.remainingAmount, orders: s.orders.remainingAmount, dashboard: s.dashboard.remainingAmount });
    console.log(`✓ D5 (TRỘN + cọc 300.000): tự tính total ${expectedTotal.toLocaleString("vi-VN")}₫, còn thu ${expectedRemaining.toLocaleString("vi-VN")}₫ — khớp cả bốn bề mặt`);
  }

  // --- D6: đơn CŨ đã lưu `subtotal_after` THIẾU (dựng bằng SQL — bảng order_money_adjustment CHỈ-THÊM, không sửa được bản ghi cũ qua API bình
  // thường, kể cả bằng SQL tay: trigger 0021 chặn UPDATE/DELETE nhưng INSERT thêm MỘT dòng seq mới thì được, đúng cách mô phỏng "dữ liệu hỏng/cũ
  // ngoài tầm kiểm lúc ghi" mà file này đã dùng cho các ca after_json hỏng phía trên). subtotal_before=600.000/subtotal_after=900.000 dưới đây LÀ
  // SỐ THẬT nơi ghi CŨ (trước khi có mục A của bản sửa này) tính ra cho CHÍNH kịch bản này — suy trực tiếp từ công thức nơi ghi cũ (chỉ lặp qua
  // dịch vụ TỪ DANH MỤC): before = 2 khách × 300.000 = 600.000, after = 3 khách × 300.000 = 900.000, CẢ HAI đều BỎ SÓT đúng 200.000 tiền dịch vụ
  // nhập tay — khớp chính xác với D3 (kịch bản GIỐNG HỆT D6, chạy qua API thật ở trên) nếu chạy trên mã CHƯA sửa mục A. Đây CHÍNH LÀ lý do mục B
  // (nơi đọc) quan trọng hơn mục A (nơi ghi): mục A chỉ chữa được đơn TỪ NAY, còn đơn CŨ như D6 chỉ được chữa nếu nơi ĐỌC ngừng tin cột đã lưu.
  {
    const d6 = (
      await call(A, "POST", "/api/orders", orderInput({ services: [catSvc({ pax: { adult: 2 }, departDate: vnDate(0) }), manualSvc(200000, { departDate: vnDate(0) })] }))
    ).body.order;
    const d6SvcId = d6.services.find((s) => s.catalogCode === "ZH1").id;
    assert.equal((await call(A, "POST", `/api/orders/${d6.id}/status`, { status: "confirmed" })).status, 200);
    assert.equal((await setHandler(A, d6.id, fld.id)).status, 200);

    const oldAfter = JSON.stringify([{ serviceId: d6SvcId, pax: { adult: 3, child: 0, senior: 0, infant: 0 } }]).replace(/'/g, "''");
    await sql(`INSERT INTO order_money_adjustment (id, order_id, seq, before_json, after_json, subtotal_before, subtotal_after) VALUES
      ('adj-d6-old-${d6.id}', '${d6.id}', 1, '[]', '${oldAfter}', 600000, 900000)`);

    const expected = 3 * 300000 + 200000; // 1.100.000 — ĐÚNG, dù cột subtotal_after đã lưu SAI (900.000, thiếu 200.000 nhập tay)
    const s = await measureFourSurfaces(d6.id, d6.orderCode);
    assert.equal(s.chiTiet.total, expected, "D6 chi tiết đơn: phải đúng dù subtotal_after đã lưu sai");
    assert.equal(s.orders.total, expected, "D6 /api/orders: KHÔNG được đọc lại 900.000 đã lưu sai (đây là điểm mục B chữa được dữ liệu cũ)");
    assert.ok(s.dashboard, "D6 phải có trong Trang chủ hôm nay");
    assert.equal(s.dashboard.total, expected, "D6 Trang chủ: KHÔNG được đọc lại 900.000 đã lưu sai");
    assert.ok(s.mine, "D6 phải có trong Việc của tôi");
    assert.deepEqual(s.mine.services.find((x) => x.catalogCode === "ZH1").pax, pax(3), "D6 Việc của tôi: số khách khớp");
    measured.push({ ca: "D6 dữ liệu CŨ đã lưu sai", tuTinh: expected, chiTiet: s.chiTiet.total, orders: s.orders.total, dashboard: s.dashboard.total });
    console.log(`✓ D6 (dữ liệu CŨ, subtotal_after đã lưu SAI = 900.000): tự tính ĐÚNG ${expected.toLocaleString("vi-VN")}₫ — cả bốn bề mặt hiện đúng, không đọc lại số đã lưu sai`);
  }

  // --------------------------------------------------------------------------------------------------------------------------------------
  // DK-T2-01 (kiểm toán điểm khuất 24/9, CRITICAL): đơn có GIÁ THOẢ THUẬN (200.000₫/khách, danh mục ZH1 niêm yết 300.000₫) — HDV lưu số khách
  // KHÔNG được làm tiền đơn nhảy về giá niêm yết. Số mong đợi TỰ TÍNH từ kịch bản. G1: gửi lại y nguyên → không ghi dòng điều chỉnh, tiền không
  // đổi. G2: 2→3 → 3 × 200.000 ở CẢ bốn bề mặt (chi tiết, /orders, Trang chủ; Việc của tôi chỉ số khách), còn lại = tổng − cọc.
  // ("Còn lại" âm khi HDV giảm khách: KHÔNG chặn — việc mở chưa quyết, xem docs/CHANGE-GUIDE.md §4 mục 32.)
  // --------------------------------------------------------------------------------------------------------------------------------------
  {
    const DEAL = 200000;
    const g = (
      await call(A, "POST", "/api/orders", orderInput({
        services: [catSvc({ pax: { adult: 2 }, unitPrices: { adult: DEAL }, departDate: vnDate(0) })],
        depositAmount: 300000, depositMethod: "cash",
      }))
    ).body.order;
    assert.ok(g?.id, "lập đơn giá thoả thuận thất bại");
    assert.equal(g.services[0].items[0].unitPrice, DEAL, "đối chứng: đơn lưu đúng giá thoả thuận");
    assert.equal(g.services[0].items[0].catalogPrice, 300000);
    const gSvc = g.services[0].id;
    assert.equal((await call(A, "POST", `/api/orders/${g.id}/status`, { status: "confirmed" })).status, 200);
    assert.equal((await setHandler(A, g.id, fld.id)).status, 200);
    const adjCount = async () => Number((await sqlRows(`SELECT count(*) AS n FROM order_money_adjustment WHERE order_id = '${g.id}'`))[0].n);

    // G1 — y nguyên
    r = await moneyEdit(FIELD, g.id, { reason: "Kiểm lại danh sách khách, không đổi", services: [{ id: gSvc, pax: pax(2) }] });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(await adjCount(), 0, "G1: gửi lại y nguyên số khách KHÔNG được ghi dòng điều chỉnh");
    let s = await measureFourSurfaces(g.id, g.orderCode);
    assert.equal(s.chiTiet.total, 2 * DEAL, "G1 chi tiết: tổng giữ nguyên 400.000 (không nhảy lên 600.000 giá niêm yết)");
    assert.equal(s.chiTiet.remainingAmount, 2 * DEAL - 300000, "G1 chi tiết: còn lại 100.000");
    assert.equal(s.orders.total, 2 * DEAL, "G1 /orders");
    assert.equal(s.dashboard.total, 2 * DEAL, "G1 Trang chủ");
    console.log("✓ DK-T2-01 G1: HDV gửi lại y nguyên số khách → không ghi dòng điều chỉnh, tiền giữ giá thoả thuận ở mọi bề mặt");

    // G2 — 2→3
    r = await moneyEdit(FIELD, g.id, { reason: "Khách báo thêm 1 người", services: [{ id: gSvc, pax: pax(3) }] });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(await adjCount(), 1);
    s = await measureFourSurfaces(g.id, g.orderCode);
    const exp = 3 * DEAL; // 600.000 — KHÔNG phải 900.000 (3 × giá niêm yết)
    for (const [label, v] of [["chi tiết", s.chiTiet], ["/orders", s.orders], ["Trang chủ", s.dashboard]]) {
      assert.equal(v.total, exp, `G2 ${label}: tổng theo giá thoả thuận`);
      assert.equal(v.remainingAmount, exp - 300000, `G2 ${label}: còn lại = tổng − cọc`);
    }
    assert.equal(s.chiTiet.services[0].items[0].unitPrice, DEAL, "G2 chi tiết: dòng tiền mang đơn giá thoả thuận (phiếu gửi khách dựng từ đây)");
    assert.deepEqual(s.mine.services[0].pax, pax(3), "G2 Việc của tôi: số khách khớp");
    const adj = (await sqlRows(`SELECT subtotal_before, subtotal_after, after_json FROM order_money_adjustment WHERE order_id = '${g.id}'`))[0];
    assert.deepEqual([Number(adj.subtotal_before), Number(adj.subtotal_after)], [2 * DEAL, exp], "G2: cột đã lưu cũng theo giá thoả thuận (R-ORD-6a khớp orders.subtotal)");
    assert.deepEqual(JSON.parse(adj.after_json)[0].unitPrices, { adult: DEAL }, "G2: after_json lưu kèm đơn giá để truy vết");
    console.log("✓ DK-T2-01 G2: HDV 2→3 khách → 3 × giá thoả thuận ở chi tiết, /orders, Trang chủ; cột đã lưu cũng đúng");
  }
  console.log("\n=== Đợt E task 7 — bảng số đo bốn bề mặt (tiền: total, hoặc remainingAmount cho D5) ===");
  for (const m of measured) {
    console.log(`${m.ca}: tự tính ${m.tuTinh.toLocaleString("vi-VN")}₫ | chi tiết ${m.chiTiet.toLocaleString("vi-VN")}₫ | /orders ${m.orders.toLocaleString("vi-VN")}₫ | Trang chủ ${m.dashboard.toLocaleString("vi-VN")}₫`);
  }
} finally {
  await sql("DELETE FROM catalog_item WHERE code = 'ZH1'").catch((e) => console.error("dọn danh mục giả ZH1 thất bại:", String(e).slice(0, 200)));
}

console.log("E2E DISPATCH OK");
