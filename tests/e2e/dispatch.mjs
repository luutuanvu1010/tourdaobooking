// Người phụ trách đơn (module dispatch; ADR-0006, ADR-0009): đơn mới tự có người phụ trách = người lập; đổi người = đóng dòng cũ + mở dòng mới + nhật ký;
// nhận đơn chưa có người; ai được làm gì; người được giao phải là SALES/ADMIN đang hoạt động có hồ sơ; tranh chấp song song đúng một bên thắng;
// người phụ trách (khác người lập) sửa được đơn (bộ kiểm hành vi đầy đủ ở các mục cuối và ở orders/trip/permissions.mjs).
// Dùng tài khoản dùng một lần (randomPhone) cho người "không liên quan" và người "đã ngưng"; đóng dòng HANDLE bằng SQL để có đơn "chưa có người phụ trách".
import assert from "node:assert/strict";
import { ACCOUNTS, call, login, orderInput, randomPhone, session, sql, sqlRows, vnDate } from "./lib.mjs";

const A = await session(ACCOUNTS.salesA);
const B = await session(ACCOUNTS.salesB);
const ADMIN = await session(ACCOUNTS.admin);
const ACC = await session(ACCOUNTS.accountant);
const FIELD = await session(ACCOUNTS.field);
const me = async (cookie) => (await call(cookie, "GET", "/api/auth/me")).body.staff;
const [a, b, adm, acc, fld] = [await me(A), await me(B), await me(ADMIN), await me(ACC), await me(FIELD)];

// Hai tài khoản dùng một lần: C (SALES, không liên quan tới các đơn) và D (SALES nhưng đã ngưng hoạt động).
async function makeStaff(name, active = true) {
  const phone = randomPhone();
  const r = await call(ADMIN, "POST", "/api/staff", { fullName: name, phone, permissions: ["SALES"] });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const cookie = (await login(phone, r.body.pin)).cookie;
  if (!active) assert.equal((await call(ADMIN, "PATCH", `/api/staff/${r.body.staff.id}`, { active: false })).status, 200);
  return { id: r.body.staff.id, partyId: r.body.staff.partyId, name, cookie };
}
const tag = Date.now().toString(36);
const C = await makeStaff(`Cẩm Cửu ${tag}`);
const D = await makeStaff(`Đào Đã Nghỉ ${tag}`, false);

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
} finally {
  await sql("DELETE FROM catalog_item WHERE code = 'ZH1'").catch((e) => console.error("dọn danh mục giả ZH1 thất bại:", String(e).slice(0, 200)));
}

console.log("E2E DISPATCH OK");
