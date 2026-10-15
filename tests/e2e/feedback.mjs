// tests/e2e/feedback.mjs
// Góp ý / Báo lỗi trên route thật: quyền xem, ghi chú nội bộ, bảng chuyển trạng thái, idempotency, trần tần suất (kể cả song song), chấm đỏ.
// Cuối tệp: Vé hỗ trợ đợt 1 (ADR-0119) — nhóm hỗ trợ, hàng đợi nhóm, nhận việc, /xu-ly, chuyển nhóm, người ngoài nhóm, tài khoản bên ngoài, quản lý nhóm.
// Local không có binding EMAIL → mailPending phải là true (tài liệu hoá hành vi "chưa gửi được mail").
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { ACCOUNTS, call, gieoTaiKhoanLai, session } from "./lib.mjs";

const SALES = await session(ACCOUNTS.salesA);
const SALES_B = await session(ACCOUNTS.salesB);
// ADR-0038: người xử lý Góp ý là Toàn quyền; Quản trị chỉ gửi/xem yêu cầu của chính mình.
const ADMIN = await session(ACCOUNTS.superAdmin);
const QUAN_TRI = await session(ACCOUNTS.admin);
const ACC = await session(ACCOUNTS.accountant);
const FIELD = await session(ACCOUNTS.field);

const input = (over = {}) => ({ kind: "BUG", title: "Nút lưu không bấm được", body: "Bấm Lưu không thấy gì.", clientRequestId: randomUUID(), context: { path: "/order", device: "iPhone Safari", standalone: true, appVersion: "dev", evil: "x" }, ...over });
let r;

// --- Chưa đăng nhập / đầu vào sai
assert.equal((await call(null, "GET", "/api/feedback/mine")).status, 401);
assert.equal((await call(null, "POST", "/api/feedback", input())).status, 401);
for (const bad of [input({ kind: "X" }), input({ title: "  " }), input({ body: "" }), input({ clientRequestId: "abc" })]) {
  assert.equal((await call(SALES, "POST", "/api/feedback", bad)).status, 400, JSON.stringify(bad).slice(0, 80));
}
console.log("✓ 401 khi chưa đăng nhập, 400 khi đầu vào sai");

// --- Tạo + idempotency + lọc context
const first = input();
r = await call(SALES, "POST", "/api/feedback", first);
assert.equal(r.status, 201, JSON.stringify(r.body));
const t = r.body.ticket;
assert.match(t.code, /^YC-\d{4}$/);
assert.equal(t.status, "NEW");
assert.equal(t.submitterName, ACCOUNTS.salesA.name);
assert.deepEqual(t.context, { path: "/order", device: "iPhone Safari", standalone: true, appVersion: "dev" }, "khoá lạ bị bỏ");
r = await call(SALES, "POST", "/api/feedback", first);
assert.equal(r.status, 200, "gửi lại cùng clientRequestId: trả yêu cầu cũ");
assert.equal(r.body.ticket.id, t.id);
r = await call(SALES, "GET", "/api/feedback/mine");
assert.equal(r.status, 200);
assert.equal(r.body.tickets.filter((x) => x.id === t.id).length, 1, "không tạo bản thứ hai");
console.log("✓ tạo yêu cầu, gửi lại không tạo trùng, context được lọc");

// --- Quyền xem: người khác không thấy (404 để không lộ sự tồn tại); admin thấy; FIELD gửi được
assert.equal((await call(SALES_B, "GET", `/api/feedback/${t.id}`)).status, 404);
assert.equal((await call(SALES_B, "POST", `/api/feedback/${t.id}/messages`, { body: "chen ngang" })).status, 404);
assert.equal((await call(ACC, "GET", `/api/feedback/${t.id}`)).status, 404);
assert.equal((await call(FIELD, "POST", "/api/feedback", input({ title: "FIELD góp ý" }))).status, 201, "mọi quyền đều được gửi");
assert.equal((await call(SALES, "GET", "/api/feedback")).status, 403, "hàng đợi chỉ admin");
assert.equal((await call(QUAN_TRI, "GET", "/api/feedback")).status, 403, "ADR-0038: Quản trị không vào hàng đợi");
assert.equal((await call(QUAN_TRI, "GET", `/api/feedback/${t.id}`)).status, 404, "ADR-0038: Quản trị không đọc yêu cầu của người khác");
assert.equal((await call(QUAN_TRI, "PATCH", `/api/feedback/${t.id}`, { status: "ACK" })).status, 403, "ADR-0038: Quản trị không đổi trạng thái");
assert.equal((await call(FIELD, "PATCH", `/api/feedback/${t.id}`, { status: "ACK" })).status, 403);
assert.equal((await call(SALES, "PATCH", `/api/feedback/${t.id}`, { status: "ACK" })).status, 403);
console.log("✓ chỉ chủ và admin xem được; hàng đợi/đổi trạng thái chỉ admin");

// --- Hàng đợi admin: có yêu cầu, chưa gửi được mail (không có binding), có thống kê
r = await call(ADMIN, "GET", "/api/feedback");
assert.equal(r.status, 200);
const inQueue = r.body.tickets.find((x) => x.id === t.id);
assert.ok(inQueue, "yêu cầu có trong hàng đợi");
assert.equal(inQueue.mailPending, true, "local không có binding EMAIL → chưa gửi được mail");
assert.ok(inQueue.unread, "admin chưa xem → chưa đọc");
assert.ok(Array.isArray(r.body.stats) && r.body.stats.length >= 1);
r = await call(ADMIN, "GET", "/api/feedback?status=NEW&kind=BUG");
assert.equal(r.status, 200);
assert.equal((await call(ADMIN, "GET", "/api/feedback?status=LẠ")).status, 400);
console.log("✓ hàng đợi admin: mailPending, chưa đọc, thống kê, lọc");

// --- Chấm đỏ
r = await call(ADMIN, "GET", "/api/feedback/badge");
assert.ok(r.body.queue >= 1);
assert.equal((await call(ADMIN, "GET", `/api/feedback/${t.id}`)).status, 200); // admin xem được → đánh dấu đã xem
r = await call(ADMIN, "GET", "/api/feedback");
assert.equal(r.body.tickets.find((x) => x.id === t.id).unread, false, "admin đã xem");
r = await call(SALES, "GET", "/api/feedback/badge");
assert.equal(r.body.queue, 0, "người thường không có hàng đợi");
console.log("✓ chấm đỏ admin giảm sau khi xem");

// --- Chuyển trạng thái: hợp lệ và không hợp lệ
r = await call(ADMIN, "PATCH", `/api/feedback/${t.id}`, { status: "DONE" });
assert.equal(r.status, 409, "NEW → DONE không hợp lệ");
r = await call(ADMIN, "PATCH", `/api/feedback/${t.id}`, { status: "ACK" });
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.ticket.status, "ACK");
r = await call(ADMIN, "PATCH", `/api/feedback/${t.id}`, { status: "ACK" });
assert.equal(r.status, 409, "ACK → ACK không hợp lệ (cũng là trường hợp đổi từ trạng thái đã khác)");
assert.equal((await call(ADMIN, "PATCH", `/api/feedback/${t.id}`, { status: "CLOSED" })).status, 400);
assert.equal((await call(ADMIN, "PATCH", `/api/feedback/${t.id}`, {})).status, 400);
assert.equal((await call(ADMIN, "PATCH", `/api/feedback/${t.id}`, { assigneeId: randomUUID() })).status, 400, "người xử lý không tồn tại");
r = await call(ADMIN, "PATCH", `/api/feedback/${t.id}`, { status: "DONE", resolvedIn: "20260921120000" });
assert.equal(r.status, 200);
assert.equal(r.body.ticket.resolvedIn, "20260921120000");
console.log("✓ chuyển trạng thái theo bảng luật; sai → 409/400");

// --- Phản hồi công khai → chấm đỏ người gửi; ghi chú nội bộ ẩn với người gửi; người gửi trả lời → mở lại
r = await call(SALES, "GET", "/api/feedback/badge");
assert.equal(r.body.mine, 1, "admin đổi trạng thái (công khai) → người gửi có tin mới");
r = await call(SALES, "GET", `/api/feedback/${t.id}`);
assert.equal(r.status, 200);
r = await call(SALES, "GET", "/api/feedback/badge");
assert.equal(r.body.mine, 0, "xem xong hết chấm đỏ");
r = await call(SALES, "POST", `/api/feedback/${t.id}/messages`, { body: "ghi chú lén", internal: true });
assert.equal(r.status, 403, "người gửi không đặt được ghi chú nội bộ");
r = await call(ADMIN, "POST", `/api/feedback/${t.id}/messages`, { body: "Ghi chú nội bộ: kiểm tra log", internal: true });
assert.equal(r.status, 201);
r = await call(ADMIN, "POST", `/api/feedback/${t.id}/messages`, { body: "Đã sửa, bạn thử lại nhé." });
assert.equal(r.status, 201);
r = await call(SALES, "GET", `/api/feedback/${t.id}`);
assert.deepEqual(r.body.messages.map((m) => m.internal), [false, false], "người gửi chỉ thấy tin công khai (mô tả + phản hồi)");
assert.ok(!r.body.messages.some((m) => m.body.includes("nội bộ")));
assert.equal(r.body.canTriage, false);
r = await call(ADMIN, "GET", `/api/feedback/${t.id}`);
assert.equal(r.body.messages.length, 3);
assert.equal(r.body.canTriage, true);
r = await call(SALES, "POST", `/api/feedback/${t.id}/messages`, { body: "Vẫn lỗi." });
assert.equal(r.status, 201);
r = await call(SALES, "GET", `/api/feedback/${t.id}`);
assert.equal(r.body.ticket.status, "ACK", "người gửi trả lời khi đã DONE → mở lại thành ACK");
assert.equal((await call(SALES, "POST", `/api/feedback/${t.id}/messages`, { body: "  " })).status, 400);
console.log("✓ tin nội bộ ẩn, người gửi trả lời mở lại yêu cầu");

// --- Khoá lạc quan của PATCH: nhiều admin cùng đổi NEW → ACK song song. Đúng một bên thắng, các bên còn lại không được đổi.
// Bên thua nhận 409 `stale` nếu đã đọc NEW trước khi bên thắng ghi (nhánh `changes() === 0` trong index.ts), hoặc 409 `bad_transition`
// nếu D1 cục bộ chạy các request tuần tự hoàn toàn (đọc thấy ACK rồi). Đo thực tế trên môi trường cục bộ: luôn là `bad_transition`,
// nên kịch bản này KHÔNG khoá được nhánh `stale` ở local (lỗ hổng còn lại, xem báo cáo); nó vẫn khoá bất biến "đúng một bên thắng".
r = await call(SALES, "POST", "/api/feedback", input({ title: "Khoá lạc quan" }));
assert.equal(r.status, 201, JSON.stringify(r.body));
const raceId = r.body.ticket.id;
const race = await Promise.all(Array.from({ length: 6 }, () => call(ADMIN, "PATCH", `/api/feedback/${raceId}`, { status: "ACK" })));
const winners = race.filter((x) => x.status === 200);
const losers = race.filter((x) => x.status !== 200);
assert.equal(winners.length, 1, `đúng một bên thắng: ${race.map((x) => x.status)}`);
for (const l of losers) {
  assert.ok(l.status === 409 && (l.body.error.code === "stale" || l.body.error.code === "bad_transition"), `bên thua: ${l.status} ${JSON.stringify(l.body)}`);
}
console.log(`✓ khoá lạc quan: 6 PATCH song song → 1 thắng, ${losers.length} thua (${[...new Set(losers.map((l) => l.body.error.code))]})`);

// --- Nhật ký
r = await call(ADMIN, "GET", "/api/audit?action=feedback_created");
assert.equal(r.status, 200);
r = await call(ADMIN, "GET", "/api/audit?action=feedback_status_changed");
assert.equal(r.status, 200);
console.log("✓ nhật ký nhận hành động feedback_*");

// --- Trần tần suất, kể cả gửi SONG SONG: đúng 5 yêu cầu mới/giờ
const burst = await Promise.all(Array.from({ length: 8 }, (_, i) => call(ACC, "POST", "/api/feedback", input({ title: `Dồn dập ${i}` }))));
const created = burst.filter((x) => x.status === 201).length;
assert.equal(created, 5, `song song 8 lần: đúng 5 được tạo, thực tế ${created} (${burst.map((x) => x.status)})`);
assert.ok(burst.every((x) => x.status === 201 || x.status === 429));
console.log("✓ trần 5 yêu cầu/giờ giữ được khi gửi song song");

// --- Trần tin nhắn: 30/giờ gồm tin mô tả ban đầu → tài khoản FIELD (đã có 1 tin) chỉ thêm được 29
r = await call(FIELD, "GET", "/api/feedback/mine");
const own = r.body.tickets[0];
const replies = await Promise.all(Array.from({ length: 35 }, (_, i) => call(FIELD, "POST", `/api/feedback/${own.id}/messages`, { body: `tin ${i}` })));
const okReplies = replies.filter((x) => x.status === 201).length;
assert.equal(okReplies, 29, `song song 35 tin: đúng 29 được nhận (30 − 1 tin mô tả), thực tế ${okReplies}`);
assert.ok(replies.every((x) => x.status === 201 || x.status === 429));
console.log("✓ trần 30 tin/giờ giữ được khi gửi song song");

// ===== Vé hỗ trợ đợt 1 (ADR-0119): nhóm hỗ trợ, hàng đợi nhóm, nhận việc, đổi trạng thái theo nhóm, chuyển nhóm =====
// Đặt CUỐI tệp vì trần theo giờ: ACC đã dùng hết 5 phiếu/giờ (chỉ làm thành viên, nhận việc, ghi chú — không tạo phiếu), FIELD đã chạm 30 tin/giờ (không dùng),
// người gửi là salesB (chưa gửi phiếu nào). Hai nhóm thử tạo mới mỗi lần chạy (mã theo Date.now()), cuối khối gỡ thành viên + NGƯNG nhóm (không xoá — luật không xoá cứng).
const HR = await session(ACCOUNTS.hr);
const FIELD_B = await session(ACCOUNTS.fieldB);
const idOf = async (cookie) => (await call(cookie, "GET", "/api/auth/me")).body.staff.id;
const ACC_ID = await idOf(ACC);
const HR_ID = await idOf(HR);
const FIELD_B_ID = await idOf(FIELD_B);
const KY_THUAT = "fbk-team-ky-thuat";
const hau = String(Date.now());

// --- Quản lý nhóm: chỉ Toàn quyền (ô feedback.team.manage). Quản trị, Nhân sự, Bán hàng: 403.
for (const [ten, co] of [["Quản trị", QUAN_TRI], ["Nhân sự", HR], ["Bán hàng", SALES]]) {
  assert.equal((await call(co, "GET", "/api/feedback/admin/teams")).status, 403, `${ten} không xem trang quản lý nhóm`);
  assert.equal((await call(co, "POST", "/api/feedback/admin/teams", { code: `E2E_CAM_${hau}`, name: "Không được tạo" })).status, 403, `${ten} không tạo nhóm`);
}
r = await call(ADMIN, "POST", "/api/feedback/admin/teams", { code: `E2E_A_${hau}`, name: "Nhóm thử A", description: "Nhóm e2e", sensitive: true });
assert.equal(r.status, 201, JSON.stringify(r.body));
const NHOM_A = r.body.team.id;
r = await call(ADMIN, "POST", "/api/feedback/admin/teams", { code: `E2E_B_${hau}`, name: "Nhóm thử B" });
assert.equal(r.status, 201, JSON.stringify(r.body));
const NHOM_B = r.body.team.id;
assert.equal((await call(ADMIN, "POST", "/api/feedback/admin/teams", { code: `E2E_A_${hau}`, name: "Trùng mã" })).status, 409, "mã nhóm trùng");
assert.equal((await call(QUAN_TRI, "PUT", `/api/feedback/admin/teams/${NHOM_A}/members/${ACC_ID}`, { role: "MEMBER" })).status, 403, "Quản trị không gán thành viên");
console.log("✓ quản lý nhóm chỉ Toàn quyền; tạo hai nhóm thử");

try {
  // Nhóm A: ACC thành viên, fieldB Trưởng nhóm. Nhóm B: hr thành viên (để thử nhóm mới không đọc ghi chú nội bộ của nhóm cũ).
  for (const [nhom, id, vai] of [[NHOM_A, ACC_ID, "MEMBER"], [NHOM_A, FIELD_B_ID, "LEAD"], [NHOM_B, HR_ID, "MEMBER"]]) {
    r = await call(ADMIN, "PUT", `/api/feedback/admin/teams/${nhom}/members/${id}`, { role: vai });
    assert.equal(r.status, 200, JSON.stringify(r.body));
  }
  r = await call(ACC, "GET", "/api/feedback/teams");
  assert.equal(r.status, 200);
  assert.ok(r.body.teams.some((x) => x.id === NHOM_A), "nhóm thử hiện trong danh sách chọn");
  assert.deepEqual(r.body.mine.map((m) => m.teamId), [NHOM_A], "tư cách thành viên của chính người gọi");
  assert.equal(r.body.isSuper, false);

  // --- Tài khoản bên ngoài (ADR-0119 điều 6): chỉ thấy Kỹ thuật, gửi nhóm khác 403, không làm thành viên được (R6).
  const DT = await gieoTaiKhoanLai("Đối tác thử vé hỗ trợ", ["PARTNER"]);
  r = await call(DT.cookie, "GET", "/api/feedback/teams");
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.teams.map((x) => x.id), [KY_THUAT], "bên ngoài chỉ thấy nhóm Kỹ thuật");
  assert.deepEqual(r.body.mine, []);
  assert.equal((await call(DT.cookie, "POST", "/api/feedback", input({ title: "Đối tác gửi nhóm khác", teamId: NHOM_A }))).status, 403, "bên ngoài không gửi nhóm khác Kỹ thuật");
  assert.equal((await call(ADMIN, "PUT", `/api/feedback/admin/teams/${NHOM_A}/members/${DT.id}`, { role: "MEMBER" })).status, 400, "tài khoản bên ngoài không làm thành viên");
  assert.equal((await call(DT.cookie, "GET", `/api/feedback/queue?team=${KY_THUAT}`)).status, 403, "bên ngoài không có hàng đợi");
  console.log("✓ tài khoản bên ngoài: chỉ Kỹ thuật, gửi nhóm khác 403, không làm thành viên");

  // --- Gửi phiếu tới nhóm A
  r = await call(SALES_B, "POST", "/api/feedback", input({ title: "Hỏi công nợ tháng", body: "Nội dung riêng của nhóm A.", teamId: NHOM_A }));
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const v = r.body.ticket;
  assert.equal(v.teamId, NHOM_A);
  assert.equal(v.teamSensitive, true);
  assert.equal((await call(SALES_B, "POST", "/api/feedback", input({ teamId: "khong-co-nhom" }))).status, 400, "nhóm không có thật");

  // --- Hàng đợi nhóm: thành viên thấy; Quản trị / Nhân sự / người ngoài nhóm 403 (Quản trị, Nhân sự không có đường tắt).
  r = await call(ACC, "GET", `/api/feedback/queue?team=${NHOM_A}`);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const trongHang = r.body.tickets.find((x) => x.id === v.id);
  assert.ok(trongHang, "phiếu có trong hàng đợi nhóm A");
  assert.equal(trongHang.assigneeId, null);
  assert.ok(trongHang.unread, "thành viên chưa xem → chưa đọc");
  r = await call(ACC, "GET", `/api/feedback/queue?team=${NHOM_A}&loc=UNASSIGNED`);
  assert.ok(r.body.tickets.some((x) => x.id === v.id), "lọc Chưa ai nhận");
  for (const [ten, co] of [["Quản trị", QUAN_TRI], ["Nhân sự (thành viên nhóm B)", HR], ["Bán hàng", SALES]]) {
    assert.equal((await call(co, "GET", `/api/feedback/queue?team=${NHOM_A}`)).status, 403, `${ten} không xem hàng đợi nhóm A`);
  }
  assert.equal((await call(ACC, "GET", `/api/feedback/queue?team=${KY_THUAT}`)).status, 403, "thành viên nhóm A không xem hàng đợi Kỹ thuật");
  assert.equal((await call(ACC, "GET", `/api/feedback/queue?team=${NHOM_A}&status=`)).status, 400, "trạng thái rỗng là bộ lọc sai");
  r = await call(ACC, "GET", "/api/feedback/badge");
  assert.ok(r.body.queue >= 1, "huy hiệu hàng đợi của thành viên");
  r = await call(HR, "GET", "/api/feedback/badge");
  assert.equal(r.body.queue, 0, "huy hiệu không đếm phiếu nhóm khác");
  console.log("✓ hàng đợi nhóm: thành viên thấy, người ngoài nhóm 403, huy hiệu không lộ nhóm khác");

  // --- Người ngoài nhóm: 404 ở chi tiết và mọi lệnh theo id (không lộ sự tồn tại). Thành viên: đọc được, xử lý được, chưa chuyển nhóm được.
  for (const [ten, co] of [["Quản trị", QUAN_TRI], ["Nhân sự", HR], ["Bán hàng khác", SALES]]) {
    assert.equal((await call(co, "GET", `/api/feedback/${v.id}`)).status, 404, `${ten}: chi tiết 404`);
    assert.equal((await call(co, "POST", `/api/feedback/${v.id}/claim`)).status, 404, `${ten}: nhận việc 404`);
    assert.equal((await call(co, "PATCH", `/api/feedback/${v.id}/xu-ly`, { status: "ACK" })).status, 404, `${ten}: đổi trạng thái 404`);
    assert.equal((await call(co, "POST", `/api/feedback/${v.id}/transfer`, { teamId: NHOM_B, reason: "chen ngang" })).status, 404, `${ten}: chuyển nhóm 404`);
    assert.equal((await call(co, "POST", `/api/feedback/${v.id}/messages`, { body: "chen ngang" })).status, 404, `${ten}: trả lời 404`);
  }
  r = await call(ACC, "GET", `/api/feedback/${v.id}`);
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.perms, { xuLy: true, giaoViec: false, chuyenNhom: false }, "thành viên thường");
  r = await call(SALES_B, "GET", `/api/feedback/${v.id}`);
  assert.deepEqual(r.body.perms, { xuLy: false, giaoViec: false, chuyenNhom: false }, "người gửi không xử lý phiếu mình");
  assert.equal((await call(SALES_B, "PATCH", `/api/feedback/${v.id}/xu-ly`, { status: "ACK" })).status, 403, "người gửi không đổi trạng thái");
  assert.equal((await call(SALES_B, "POST", `/api/feedback/${v.id}/claim`)).status, 403, "người gửi không nhận việc phiếu mình");
  console.log("✓ người ngoài nhóm 404 ở chi tiết và mọi lệnh; người gửi không xử lý phiếu mình");

  // --- Nhận việc (Mới → Đã tiếp nhận), rồi người khác nhận cùng phiếu → 409.
  r = await call(ACC, "POST", `/api/feedback/${v.id}/claim`);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.ticket.assigneeId, ACC_ID);
  assert.equal(r.body.ticket.status, "ACK", "nhận việc chuyển Mới → Đã tiếp nhận");
  r = await call(FIELD_B, "POST", `/api/feedback/${v.id}/claim`);
  assert.equal(r.status, 409, "đã có người nhận");
  assert.equal(r.body.error.code, "taken");
  r = await call(ACC, "GET", `/api/feedback/queue?team=${NHOM_A}&loc=MINE`);
  assert.ok(r.body.tickets.some((x) => x.id === v.id), "lọc Của tôi");

  // --- Đổi trạng thái qua /xu-ly; thành viên thường không giao việc, không chuyển nhóm; ghi chú nội bộ chỉ nhóm thấy.
  r = await call(ACC, "PATCH", `/api/feedback/${v.id}/xu-ly`, { status: "IN_PROGRESS" });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.ticket.status, "IN_PROGRESS");
  assert.equal((await call(ACC, "PATCH", `/api/feedback/${v.id}/xu-ly`, { status: "NEW" })).status, 409, "sai bảng luật chuyển trạng thái");
  assert.equal((await call(ACC, "PATCH", `/api/feedback/${v.id}/xu-ly`, { assigneeId: FIELD_B_ID })).status, 403, "thành viên thường không giao việc");
  assert.equal((await call(ACC, "POST", `/api/feedback/${v.id}/transfer`, { teamId: NHOM_B, reason: "thử" })).status, 403, "thành viên thường không chuyển nhóm");
  assert.equal((await call(ACC, "POST", `/api/feedback/${v.id}/messages`, { body: "Ghi chú nội bộ nhóm A: đã đối chiếu", internal: true })).status, 201);
  assert.equal((await call(ACC, "POST", `/api/feedback/${v.id}/messages`, { body: "Bên mình đang kiểm tra." })).status, 201);
  r = await call(SALES_B, "GET", `/api/feedback/${v.id}`);
  assert.ok(!r.body.messages.some((m) => m.internal || m.body.includes("nội bộ")), "người gửi không thấy ghi chú nội bộ");
  r = await call(FIELD_B, "GET", `/api/feedback/${v.id}`);
  assert.deepEqual(r.body.perms, { xuLy: true, giaoViec: true, chuyenNhom: true }, "Trưởng nhóm");
  assert.ok(r.body.messages.some((m) => m.internal), "Trưởng nhóm cùng nhóm thấy ghi chú nội bộ");
  console.log("✓ nhận việc (409 khi đã có người nhận), đổi trạng thái qua /xu-ly, thành viên thường không giao/chuyển, ghi chú nội bộ ẩn với người gửi");

  // --- Trưởng nhóm chuyển sang nhóm B: Đang xử lý → Đã tiếp nhận, bỏ người xử lý; nhóm A mất quyền ngay; nhóm B không đọc ghi chú nội bộ của nhóm A.
  assert.equal((await call(FIELD_B, "POST", `/api/feedback/${v.id}/transfer`, { teamId: NHOM_B, reason: "  " })).status, 400, "lý do bắt buộc");
  r = await call(FIELD_B, "POST", `/api/feedback/${v.id}/transfer`, { teamId: NHOM_B, reason: "Việc của nhóm B" });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.ticket.teamId, NHOM_B);
  assert.equal(r.body.ticket.status, "ACK", "chuyển nhóm: Đang xử lý → Đã tiếp nhận");
  assert.equal(r.body.ticket.assigneeId, null, "chuyển nhóm bỏ người xử lý");
  assert.deepEqual(r.body.perms, { xuLy: false, giaoViec: false, chuyenNhom: false }, "Trưởng nhóm cũ mất quyền ngay");
  assert.ok(!r.body.messages.some((m) => m.internal), "phản hồi cho Trưởng nhóm cũ không kèm ghi chú nội bộ");
  assert.equal((await call(ACC, "GET", `/api/feedback/${v.id}`)).status, 404, "thành viên nhóm cũ mất quyền đọc");
  assert.equal((await call(FIELD_B, "GET", `/api/feedback/${v.id}`)).status, 404, "Trưởng nhóm cũ mất quyền đọc");
  r = await call(HR, "GET", `/api/feedback/${v.id}`);
  assert.equal(r.status, 200, "thành viên nhóm mới đọc được");
  const noiBoB = r.body.messages.filter((m) => m.internal);
  assert.equal(noiBoB.length, 1, "nhóm mới chỉ thấy ghi chú lý do chuyển");
  assert.match(noiBoB[0].body, /Việc của nhóm B/);
  assert.ok(!r.body.messages.some((m) => m.body.includes("Ghi chú nội bộ nhóm A")), "nhóm mới không đọc ghi chú nội bộ của nhóm cũ");
  r = await call(ADMIN, "GET", `/api/feedback/${v.id}`);
  assert.equal(r.body.messages.filter((m) => m.internal).length, 2, "Toàn quyền thấy ghi chú nội bộ mọi nhóm");
  r = await call(HR, "GET", `/api/feedback/queue?team=${NHOM_B}`);
  assert.equal(r.status, 200, "Nhân sự là thành viên nhóm B: vào hàng đợi nhóm B");
  assert.ok(r.body.tickets.some((x) => x.id === v.id));
  console.log("✓ chuyển nhóm: trạng thái về Đã tiếp nhận, nhóm cũ mất quyền, nhóm mới không đọc ghi chú nội bộ cũ");

  // --- Hai người bấm Nhận việc cùng lúc: đúng một thắng, bên kia 409.
  r = await call(SALES_B, "POST", "/api/feedback", input({ title: "Hai người cùng nhận", teamId: NHOM_A }));
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const dua = r.body.ticket.id;
  const hai = await Promise.all([call(ACC, "POST", `/api/feedback/${dua}/claim`), call(FIELD_B, "POST", `/api/feedback/${dua}/claim`)]);
  assert.deepEqual(hai.map((x) => x.status).sort(), [200, 409], `một thắng một thua: ${hai.map((x) => x.status)}`);
  assert.equal(hai.find((x) => x.status === 409).body.error.code, "taken");
  // Trưởng nhóm giao lại cho thành viên khác (qua /xu-ly); giao cho người gửi ⇒ 400.
  r = await call(FIELD_B, "PATCH", `/api/feedback/${dua}/xu-ly`, { assigneeId: ACC_ID });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.ticket.assigneeId, ACC_ID);
  assert.equal((await call(FIELD_B, "PATCH", `/api/feedback/${dua}/xu-ly`, { assigneeId: await idOf(SALES_B) })).status, 400, "không giao cho người gửi");
  console.log("✓ hai người nhận cùng lúc: 1 thắng 1 thua (409); Trưởng nhóm giao việc");

  // --- Gỡ khỏi nhóm: mất quyền ngay, phiếu người đó giữ hiện «chưa ai nhận».
  r = await call(ADMIN, "DELETE", `/api/feedback/admin/teams/${NHOM_A}/members/${ACC_ID}`);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal((await call(ACC, "GET", `/api/feedback/${dua}`)).status, 404, "bị gỡ khỏi nhóm: mất quyền đọc ngay");
  assert.equal((await call(ACC, "GET", `/api/feedback/queue?team=${NHOM_A}`)).status, 403);
  r = await call(FIELD_B, "GET", `/api/feedback/queue?team=${NHOM_A}&loc=UNASSIGNED`);
  assert.ok(r.body.tickets.some((x) => x.id === dua), "phiếu của người bị gỡ hiện ở «Chưa ai nhận»");
  console.log("✓ gỡ khỏi nhóm: mất quyền ngay, phiếu họ giữ về «Chưa ai nhận»");

  // --- Nhật ký nhận các hành động mới
  for (const a of ["feedback_claimed", "feedback_team_changed", "feedback_team_created", "feedback_team_member_changed"]) {
    assert.equal((await call(ADMIN, "GET", `/api/audit?action=${a}`)).status, 200, a);
  }
} finally {
  // Dọn: gỡ thành viên còn lại + ngưng hai nhóm thử (không xoá). Kỹ thuật không ngưng được (409).
  for (const [nhom, id] of [[NHOM_A, ACC_ID], [NHOM_A, FIELD_B_ID], [NHOM_B, HR_ID]]) await call(ADMIN, "DELETE", `/api/feedback/admin/teams/${nhom}/members/${id}`);
  for (const nhom of [NHOM_A, NHOM_B]) assert.equal((await call(ADMIN, "PATCH", `/api/feedback/admin/teams/${nhom}`, { active: false })).status, 200, "ngưng nhóm thử");
}
assert.equal((await call(ADMIN, "PATCH", `/api/feedback/admin/teams/${KY_THUAT}`, { active: false })).status, 409, "không ngưng được nhóm Kỹ thuật");
assert.equal((await call(SALES_B, "POST", "/api/feedback", input({ teamId: NHOM_A }))).status, 400, "nhóm đã ngưng không nhận phiếu mới");
console.log("✓ dọn: gỡ thành viên, ngưng nhóm thử; Kỹ thuật không ngưng được; nhóm đã ngưng không nhận phiếu");

console.log("feedback: OK");
