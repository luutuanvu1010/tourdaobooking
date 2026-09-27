import { test } from "node:test";
import assert from "node:assert/strict";
import { PERMISSION_CODES, type PermissionCode } from "../../shared/permissions.ts";
import {
  MAX_HANDLER_LOOKUP, checkAssignee, describeHandlerChange, handlerChangeVerdict, isOpenHandlerCollision, mayChangeHandler,
  parseCancelReason, parseOrderIds, parseSetHandler,
} from "./rules.ts";

const ID = (n: number): string => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

// --- GET /api/dispatch/handlers?orderIds=… ------------------------------------------------------------------------------
test("orderIds: thiếu hoặc rỗng là danh sách rỗng (không phải lỗi); dấu cách và trùng được gọt", () => {
  for (const raw of [null, "", "   "]) assert.deepEqual(parseOrderIds(raw), { ok: true, ids: [] }, JSON.stringify(raw));
  assert.deepEqual(parseOrderIds(` ${ID(1)} , ${ID(2)},${ID(1)}`), { ok: true, ids: [ID(1), ID(2)] });
});

test("orderIds: tối đa 100 id KHÁC NHAU — 100 qua, 101 bị từ chối; id trùng không tính thêm", () => {
  const many = (n: number) => Array.from({ length: n }, (_, i) => ID(i + 1));
  assert.equal(MAX_HANDLER_LOOKUP, 100);
  const at100 = parseOrderIds(many(100).join(","));
  assert.ok(at100.ok && at100.ids.length === 100);
  const at101 = parseOrderIds(many(101).join(","));
  assert.ok(!at101.ok && /100/.test(at101.message), JSON.stringify(at101));
  assert.ok(parseOrderIds([...many(100), ...many(100)].join(",")).ok, "200 id nhưng chỉ 100 khác nhau");
});

test("orderIds: giá trị lạ (không phải id đơn, đoạn rỗng giữa dấu phẩy) bị từ chối bằng thông điệp tiếng Việt", () => {
  for (const raw of ["abc", `${ID(1)},abc`, `${ID(1)},,${ID(2)}`, `${ID(1)},`, "1' OR '1'='1", `${ID(1)};${ID(2)}`, "X".repeat(36)]) {
    const r = parseOrderIds(raw);
    assert.ok(!r.ok && /mã đơn/.test(r.message), `${raw} → ${JSON.stringify(r)}`);
  }
});

// --- PUT /api/orders/:id/handler: thân yêu cầu -------------------------------------------------------------------------
test("thân đặt người phụ trách: cần staffId là id hợp lệ", () => {
  assert.deepEqual(parseSetHandler({ staffId: ID(7) }), { ok: true, staffId: ID(7) });
  for (const body of [null, {}, { staffId: "" }, { staffId: 5 }, { staffId: "không phải id" }, { staffId: "ABCDEF00-0000-4000-8000-000000000007" }]) {
    const r = parseSetHandler(body as Record<string, unknown> | null);
    assert.ok(!r.ok && r.message.length > 0, JSON.stringify(body));
  }
});

// --- Người được giao (ADR-0009 điều 5) ---------------------------------------------------------------------------------
const account = (permissions: PermissionCode[], extra: Partial<{ active: boolean; partyId: string | null }> = {}) => ({
  id: "st1",
  fullName: "Nguyễn Thị Hoa",
  permissions,
  active: true,
  partyId: "pty-1" as string | null,
  ...extra,
});

test("người được giao: SALES hoặc ADMIN đang hoạt động có hồ sơ; kể cả có thêm quyền khác", () => {
  for (const perms of [["SALES"], ["ADMIN"], ["SALES", "ADMIN"], ["ACCOUNTING", "SALES"], ["FIELD", "ADMIN"]] as PermissionCode[][]) {
    assert.deepEqual(checkAssignee(account(perms)), { ok: true, partyId: "pty-1", name: "Nguyễn Thị Hoa" }, perms.join("+"));
  }
});

test("người được giao: FIELD đang hoạt động có hồ sơ cũng đủ điều kiện — cấp hẹp (ADR-0014 điều 6, đoạn 3)", () => {
  for (const perms of [["FIELD"], ["ACCOUNTING", "FIELD"]] as PermissionCode[][]) {
    assert.deepEqual(checkAssignee(account(perms)), { ok: true, partyId: "pty-1", name: "Nguyễn Thị Hoa" }, perms.join("+"));
  }
});

test("người được giao: chỉ kế toán, không quyền nào, đã ngưng, chưa có hồ sơ, không tồn tại → từ chối kèm lý do tiếng Việt", () => {
  const cases: [ReturnType<typeof account> | null, RegExp][] = [
    [account(["ACCOUNTING"]), /Bán hàng, Quản trị hoặc Hướng dẫn viên/],
    [account([]), /Bán hàng, Quản trị hoặc Hướng dẫn viên/],
    [account(["SALES"], { active: false }), /ngưng hoạt động/],
    [account(["ADMIN"], { partyId: null }), /chưa có hồ sơ/],
    [null, /Không tìm thấy/],
  ];
  for (const [who, re] of cases) {
    const r = checkAssignee(who);
    assert.ok(!r.ok && re.test(r.message), `${JSON.stringify(who)} → ${JSON.stringify(r)}`);
  }
});

test("người được giao: tài khoản LAI (còn quyền Đối tác kèm quyền khác) không đủ điều kiện dù quyền khác đủ cấp (ADR-0030 S20-5)", () => {
  for (const perms of [["PARTNER", "FIELD"], ["PARTNER", "SALES"]] as PermissionCode[][]) {
    const r = checkAssignee(account(perms));
    assert.ok(!r.ok && /Tài khoản có quyền Đối tác không làm người phụ trách được\./.test(r.message), `${perms.join("+")} → ${JSON.stringify(r)}`);
  }
});

test("mọi quyền hiện có được xếp vào đúng nhóm được giao / không được giao (một nguồn: ô order.modify/order.money.edit của bản đồ quyền)", () => {
  const eligible = PERMISSION_CODES.filter((p) => checkAssignee(account([p])).ok);
  // ADR-0014 điều 2: SUPER_ADMIN = any ở MỌI thao tác. ADR-0014 điều 6: FIELD đủ điều kiện cấp hẹp qua order.money.edit=assigned (Phase B).
  // PARTNER (own, không phải assigned) CHƯA đủ điều kiện — cấp thứ ba của PARTNER (điều 10) là Phase C, không phải checkAssignee.
  assert.deepEqual(eligible, ["SALES", "ADMIN", "FIELD", "SUPER_ADMIN"], "thêm mã quyền mới thì phải quyết định nó có được giao phụ trách không");
});

// --- Lý do huỷ đơn của FIELD (ADR-0014 điều 11; "other" — ADR-0030 điều 2, sửa đổi sau khi duyệt 2026-09-27) -----------------------------------------
test("lý do huỷ: đúng một trong hai mã đóng cũ — note (nếu có gửi kèm) bị bỏ qua, không lỗi", () => {
  assert.deepEqual(parseCancelReason({ reason: "not_reachable" }), { ok: true, reason: "not_reachable" });
  assert.deepEqual(parseCancelReason({ reason: "customer_requested" }), { ok: true, reason: "customer_requested" });
  assert.deepEqual(parseCancelReason({ reason: "not_reachable", note: "0905123456" }), { ok: true, reason: "not_reachable" }, "note thừa với mã cũ không gây lỗi và không lọt vào kết quả");
});

test("lý do huỷ: thiếu, sai kiểu, tự do, hoặc ngoài danh sách đóng → từ chối, thông điệp nêu đủ ba lựa chọn hợp lệ", () => {
  for (const body of [null, {}, { reason: "" }, { reason: "khác" }, { reason: 1 }, { reason: "Không liên hệ được với khách" }, { reason: "NOT_REACHABLE" }]) {
    const r = parseCancelReason(body as Record<string, unknown> | null);
    assert.ok(!r.ok && /Không liên hệ được với khách/.test(r.message) && /Khách yêu cầu huỷ/.test(r.message) && /Khác/.test(r.message), JSON.stringify(body));
  }
});

test('lý do "Khác": thiếu note, note rỗng, hoặc note toàn khoảng trắng → từ chối, nêu đúng lý do', () => {
  for (const body of [{ reason: "other" }, { reason: "other", note: "" }, { reason: "other", note: "   " }, { reason: "other", note: 5 }]) {
    const r = parseCancelReason(body as Record<string, unknown> | null);
    assert.ok(!r.ok && /Cần nhập lý do khi chọn "Khác"/.test(r.message), JSON.stringify(body));
  }
});

test('lý do "Khác": note chứa số điện thoại/dãy số dài (mọi cách viết) → từ chối, không ghi', () => {
  for (const note of ["Gọi số 0905123456 không được", "Khách để lại số (0258) 3521 234 rồi mất liên lạc", "Đổi lịch, gọi +84 905 123 456 xác nhận"]) {
    const r = parseCancelReason({ reason: "other", note });
    assert.ok(!r.ok && /không được chứa số điện thoại hoặc dãy số dài/.test(r.message), JSON.stringify({ note, r }));
  }
});

test('lý do "Khác": note hợp lệ (văn bản thường, đã trim) → ok, trả đúng note đã trim', () => {
  assert.deepEqual(parseCancelReason({ reason: "other", note: "  Khách đổi lịch bất ngờ  " }), { ok: true, reason: "other", note: "Khách đổi lịch bất ngờ" });
});

// --- Ai được đặt/đổi người phụ trách (ADR-0009 điều 1–2) --------------------------------------------------------------
const who = (id: string, permissions: PermissionCode[]) => ({ id, permissions });
const ORDER = { ownerId: "creator" };

test("đổi người: người lập, người phụ trách hiện tại và ADMIN được; SALES khác, kế toán, FIELD không", () => {
  const current = { staffId: "handler" };
  assert.ok(mayChangeHandler(who("creator", ["SALES"]), ORDER, current, "x"), "người lập");
  assert.ok(mayChangeHandler(who("handler", ["SALES"]), ORDER, current, "x"), "người phụ trách hiện tại");
  assert.ok(mayChangeHandler(who("boss", ["ADMIN"]), ORDER, current, "x"), "quản trị");
  assert.ok(!mayChangeHandler(who("other", ["SALES"]), ORDER, current, "x"), "SALES không liên quan");
  assert.ok(!mayChangeHandler(who("other", ["SALES"]), ORDER, current, "other"), "tự nhận khi đã có người phụ trách thì KHÔNG được (chỉ nhận đơn chưa có người)");
  assert.ok(!mayChangeHandler(who("acc", ["ACCOUNTING"]), ORDER, current, "acc"), "kế toán");
  assert.ok(!mayChangeHandler(who("field", ["FIELD"]), ORDER, current, "field"), "FIELD");
});

test("đổi người: người lập vẫn đổi được sau khi đã giao lại (ADR-0009 hệ quả); người phụ trách cũ (đã bị đổi) thì không", () => {
  assert.ok(mayChangeHandler(who("creator", ["SALES"]), ORDER, { staffId: "someone-else" }, "creator"));
  assert.ok(!mayChangeHandler(who("former", ["SALES"]), ORDER, { staffId: "someone-else" }, "former"), "người từng phụ trách không còn quyền");
});

test("nhận đơn chưa có người phụ trách: SALES/ADMIN/FIELD nhận CHO CHÍNH MÌNH; nhận cho người khác thì phải là người lập/quản trị", () => {
  assert.ok(mayChangeHandler(who("other", ["SALES"]), ORDER, null, "other"), "SALES nhận cho mình");
  assert.ok(!mayChangeHandler(who("other", ["SALES"]), ORDER, null, "creator"), "SALES giao hộ người khác khi không phải người lập");
  assert.ok(mayChangeHandler(who("creator", ["SALES"]), ORDER, null, "other"), "người lập giao cho người khác");
  assert.ok(mayChangeHandler(who("boss", ["ADMIN"]), ORDER, null, "other"), "quản trị giao cho người khác");
  assert.ok(!mayChangeHandler(who("acc", ["ACCOUNTING"]), ORDER, null, "acc"), "kế toán không nhận");
  assert.ok(mayChangeHandler(who("field", ["FIELD"]), ORDER, null, "field"), "ADR-0030 S20-6/S20-12: FIELD nhận cho CHÍNH MÌNH đơn chưa có người");
  assert.ok(!mayChangeHandler(who("field", ["FIELD"]), ORDER, null, "creator"), "FIELD KHÔNG giao hộ người khác (dispatch.assign = none)");
  assert.ok(mayChangeHandler(who("multi", ["ACCOUNTING", "SALES"]), ORDER, null, "multi"), "nhiều quyền: hợp các ô");
});

test("người phụ trách chưa có tài khoản (staffId null) không làm ai thành người phụ trách", () => {
  assert.ok(!mayChangeHandler(who("other", ["SALES"]), ORDER, { staffId: null }, "other"));
  assert.ok(mayChangeHandler(who("creator", ["SALES"]), ORDER, { staffId: null }, "other"), "người lập vẫn đổi được");
});

// --- Phán quyết của route: được phép / dữ liệu đã cũ (409) / không được phép (403) --------------------------------------------
test("nhận phụ trách THUA ĐUA: người có quyền nhận (SALES/ADMIN) tự nhận khi đơn ĐÃ có người phụ trách → 'stale' (giao diện tải lại), KHÔNG phải 'forbidden'", () => {
  const current = { staffId: "handler" };
  assert.equal(handlerChangeVerdict(who("other", ["SALES"]), ORDER, current, "other"), "stale", "SALES khác vừa thấy đơn 'chưa có người' rồi bị người khác nhận trước");
  assert.equal(handlerChangeVerdict(who("former", ["SALES"]), ORDER, { staffId: "someone-else" }, "former"), "stale", "người phụ trách cũ (đã bị đổi) tự nhận lại");
  assert.equal(handlerChangeVerdict(who("multi", ["ACCOUNTING", "SALES"]), ORDER, current, "multi"), "stale", "nhiều quyền: có SALES nên có quyền nhận");
  assert.equal(handlerChangeVerdict(who("other", ["SALES"]), ORDER, { staffId: null }, "other"), "stale", "người phụ trách hiện tại chưa có tài khoản cũng là 'đã có người'");
});

test("phán quyết: vẫn 'forbidden' khi KHÔNG phải nhận cho chính mình hoặc không có quyền nhận; 'allow' khi được phép đổi", () => {
  const current = { staffId: "handler" };
  assert.equal(handlerChangeVerdict(who("other", ["SALES"]), ORDER, current, "x"), "forbidden", "giao hộ người khác: không phải 'nhận', là vượt quyền");
  assert.equal(handlerChangeVerdict(who("acc", ["ACCOUNTING"]), ORDER, current, "acc"), "forbidden", "kế toán không có dispatch.claim");
  assert.equal(handlerChangeVerdict(who("field", ["FIELD"]), ORDER, current, "field"), "stale", "ADR-0030 S20-6: FIELD có dispatch.claim — tự nhận đơn ĐÃ có người = thua đua (409), không phải vượt quyền");
  assert.equal(handlerChangeVerdict(who("field", ["FIELD"]), ORDER, null, "field"), "allow", "FIELD nhận đơn chưa có người cho chính mình");
  assert.equal(handlerChangeVerdict(who("field", ["FIELD"]), ORDER, null, "creator"), "forbidden", "FIELD giao hộ người khác: vượt quyền");
  assert.equal(handlerChangeVerdict(who("acc", ["ACCOUNTING"]), ORDER, null, "acc"), "forbidden", "chưa có người phụ trách nhưng kế toán vẫn không nhận được");
  assert.equal(handlerChangeVerdict(who("other", ["SALES"]), ORDER, null, "creator"), "forbidden", "chưa có người phụ trách: SALES giao hộ người khác");
  // được phép: đúng như mayChangeHandler (một nguồn)
  assert.equal(handlerChangeVerdict(who("other", ["SALES"]), ORDER, null, "other"), "allow", "nhận đơn chưa có người");
  assert.equal(handlerChangeVerdict(who("creator", ["SALES"]), ORDER, current, "x"), "allow", "người lập");
  assert.equal(handlerChangeVerdict(who("handler", ["SALES"]), ORDER, current, "x"), "allow", "người phụ trách hiện tại");
  assert.equal(handlerChangeVerdict(who("boss", ["ADMIN"]), ORDER, current, "boss"), "allow", "quản trị tự giao cho mình khi đã có người khác: đổi người, không phải thua đua");
  for (const [w, cur, target] of [[who("other", ["SALES"]), current, "other"], [who("acc", ["ACCOUNTING"]), current, "acc"], [who("creator", ["SALES"]), null, "x"]] as const) {
    assert.equal(handlerChangeVerdict(w, ORDER, cur, target) === "allow", mayChangeHandler(w, ORDER, cur, target), "allow ⇔ mayChangeHandler");
  }
});

// --- Lưới cuối của chỉ mục duy nhất -------------------------------------------------------------------------------------------
test("lỗi 'đã có người phụ trách đang mở' của CSDL được nhận ra (kể cả tiền tố D1_ERROR); lỗi khác thì không", () => {
  assert.ok(isOpenHandlerCollision(new Error("UNIQUE constraint failed: dsp_assignment.order_id")));
  assert.ok(isOpenHandlerCollision(new Error("D1_ERROR: UNIQUE constraint failed: dsp_assignment.order_id: SQLITE_CONSTRAINT")));
  assert.ok(!isOpenHandlerCollision(new Error("UNIQUE constraint failed: orders.order_code")));
  assert.ok(!isOpenHandlerCollision(new Error("FOREIGN KEY constraint failed")));
  assert.ok(!isOpenHandlerCollision("UNIQUE constraint failed: dsp_assignment.order_id"), "chỉ nhận Error");
});

// --- Câu nhật ký ------------------------------------------------------------------------------------------------------------
test("nhật ký đổi người: chỉ tên (từ A sang B); chưa có người thì nói rõ", () => {
  assert.equal(describeHandlerChange("Nguyễn Văn An", "Trần Thị Bình"), "từ Nguyễn Văn An sang Trần Thị Bình");
  assert.equal(describeHandlerChange(null, "Trần Thị Bình"), "từ chưa có người phụ trách sang Trần Thị Bình");
});
