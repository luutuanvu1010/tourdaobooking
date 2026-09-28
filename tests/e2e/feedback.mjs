// tests/e2e/feedback.mjs
// Góp ý / Báo lỗi trên route thật: quyền xem, ghi chú nội bộ, bảng chuyển trạng thái, idempotency, trần tần suất (kể cả song song), chấm đỏ.
// Local không có binding EMAIL → mailPending phải là true (tài liệu hoá hành vi "chưa gửi được mail").
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { ACCOUNTS, call, session } from "./lib.mjs";

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

console.log("feedback: OK");
