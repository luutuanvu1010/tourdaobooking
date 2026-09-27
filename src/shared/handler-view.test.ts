import { test } from "node:test";
import assert from "node:assert/strict";
import type { HandlerDto } from "./contracts.ts";
import { handlerControls, handlerFailure, handlerSaved, handlerText, myJobActions, NO_HANDLER_TEXT } from "./handler-view.ts";
import type { PermissionCode } from "./permissions.ts";

// Ba nhân viên bán hàng (A lập đơn, B được giao, C người ngoài), quản trị, kế toán, nhân viên hiện trường.
const who = (id: string, ...permissions: PermissionCode[]) => ({ id, permissions });
const A = who("a", "SALES");
const B = who("b", "SALES");
const C = who("c", "SALES");
const ADMIN = who("adm", "ADMIN");
const ACC = who("acc", "ACCOUNTING");
const FIELD = who("fld", "FIELD");
const ORDER = { staffId: "a" }; // đơn do A lập
const handler = (staffId: string | null, name = "Sales Hai"): HandlerDto => ({ partyId: `p-${staffId ?? "x"}`, staffId, name });

/** [nút đổi, nút nhận] của `staff` với người phụ trách `h` của đơn do A lập. */
const buttons = (staff: ReturnType<typeof who>, h: HandlerDto | null | undefined): [boolean, boolean] => {
  const c = handlerControls(staff, ORDER, h);
  return [c.assign, c.claim];
};

test("handlerControls: đơn đã có người phụ trách — người lập, người được giao và quản trị đổi được; người ngoài, kế toán, hiện trường thì không; KHÔNG ai được 'nhận'", () => {
  assert.deepEqual(buttons(A, handler("a", "Sales Một")), [true, false], "người lập tự phụ trách");
  assert.deepEqual(buttons(A, handler("b")), [true, false], "người lập đã giao cho B vẫn đổi lại được (ADR-0009: giữ quyền)");
  assert.deepEqual(buttons(B, handler("b")), [true, false], "người được giao (không phải người lập) đổi được: gate 'assigned' tính từ staffId của người phụ trách");
  assert.deepEqual(buttons(C, handler("b")), [false, false], "SALES khác: không đổi, không nhận (đã có người)");
  assert.deepEqual(buttons(ADMIN, handler("b")), [true, false]);
  assert.deepEqual(buttons(ACC, handler("b")), [false, false]);
  assert.deepEqual(buttons(FIELD, handler("b")), [false, false]);
});

test("handlerControls: đơn CHƯA có người phụ trách — mọi SALES/ADMIN/hướng dẫn viên nhận được; chỉ người lập và quản trị còn thêm nút giao; kế toán không có gì", () => {
  assert.deepEqual(buttons(C, null), [false, true], "SALES khác: chỉ có 'Nhận phụ trách'");
  assert.deepEqual(buttons(B, null), [false, true]);
  assert.deepEqual(buttons(A, null), [true, true], "người lập: nhận cho mình hoặc giao người khác");
  assert.deepEqual(buttons(ADMIN, null), [true, true]);
  assert.deepEqual(buttons(ACC, null), [false, false]);
  assert.deepEqual(buttons(FIELD, null), [false, true], "ADR-0030 S20-6: hướng dẫn viên có nút 'Nhận phụ trách', không có nút giao");
});

test("handlerControls: người phụ trách là hồ sơ chưa có tài khoản (staffId null) không làm ai thành 'được giao'; chưa biết người phụ trách (undefined) thì KHÔNG nút nào — không đoán 'chưa có' rồi mời nhận", () => {
  assert.deepEqual(buttons(C, handler(null, "Người Chưa Có Tài Khoản")), [false, false]);
  assert.deepEqual(buttons(A, handler(null, "Người Chưa Có Tài Khoản")), [true, false], "người lập vẫn đổi được");
  for (const s of [A, B, C, ADMIN, ACC, FIELD]) assert.deepEqual(buttons(s, undefined), [false, false], `chưa biết người phụ trách: ${s.id}`);
});

test("handlerControls: nhãn nút giao — 'Đổi người phụ trách' khi đã có người, 'Chọn người phụ trách' khi chưa có", () => {
  assert.equal(handlerControls(A, ORDER, handler("a")).assignLabel, "Đổi người phụ trách");
  assert.equal(handlerControls(A, ORDER, null).assignLabel, "Chọn người phụ trách");
});

test("chữ hiển thị: 'HDV: <tên>' và chip 'Chờ nhận' (ADR-0030 điều 3, Q-A2 — thay 'Phụ trách: <tên>'/'Chưa có người phụ trách')", () => {
  assert.equal(handlerText("An"), "HDV: An");
  assert.equal(NO_HANDLER_TEXT, "Chờ nhận");
});

test("handlerFailure: 409 stale (đổi) → cảnh báo + tải lại; 409 stale (nhận) nói đơn vừa có người; 409 no_change → tải lại; 403 → tải lại (quyền đã đổi)", () => {
  const stale = handlerFailure({ status: 409, code: "stale", message: "Người phụ trách đơn vừa được người khác đổi, hãy tải lại rồi thử lại." }, "assign");
  assert.equal(stale.reload, true);
  assert.equal(stale.banner.tone, "warning");
  assert.match(stale.banner.title, /^Người phụ trách của đơn vừa được đổi ở nơi khác\./);
  const claim = handlerFailure({ status: 409, code: "stale", message: "x" }, "claim");
  assert.equal(claim.reload, true);
  assert.match(claim.banner.title, /^Đơn này vừa có người khác nhận phụ trách\./);
  const same = handlerFailure({ status: 409, code: "no_change", message: "Người này đang phụ trách đơn rồi." }, "assign");
  assert.deepEqual([same.reload, same.banner.tone], [true, "info"]);
  assert.match(same.banner.title, /^Người này đang phụ trách đơn rồi\./);
  const forbidden = handlerFailure({ status: 403, code: "forbidden", message: "…" }, "assign");
  assert.deepEqual([forbidden.reload, forbidden.banner.tone], [true, "danger"]);
  assert.match(forbidden.banner.title, /^Bạn không còn quyền/);
});

test("handlerFailure: 400 invalid_assignee giữ nguyên chữ của máy chủ và KHÔNG tải lại (bảng còn mở để chọn người khác); mất mạng có câu riêng; 404 và lỗi lạ dùng chữ máy chủ", () => {
  const bad = handlerFailure({ status: 400, code: "invalid_assignee", message: "Người này không thể nhận phụ trách." }, "assign");
  assert.deepEqual([bad.reload, bad.banner.title], [false, "Người này không thể nhận phụ trách."]);
  const net = handlerFailure(null, "assign");
  assert.deepEqual([net.reload, net.banner.title], [false, "Không kết nối được máy chủ."]);
  assert.equal(handlerFailure({ status: 404, code: "not_found", message: "Không tìm thấy đơn." }, "claim").banner.title, "Không tìm thấy đơn.");
  assert.equal(handlerFailure({ status: 500, code: "internal", message: "" }, "assign").banner.title, "Có lỗi xảy ra, thử lại sau.");
});

test("handlerFailure: không lộ mã lỗi thô ra người dùng (mọi banner là chữ tiếng Việt, không chứa stale/no_change/forbidden/invalid)", () => {
  const cases: Parameters<typeof handlerFailure>[0][] = [
    { status: 409, code: "stale", message: "" }, { status: 409, code: "no_change", message: "" }, { status: 403, code: "forbidden", message: "" }, { status: 400, code: "invalid_assignee", message: "" }, null,
  ];
  for (const c of cases) for (const kind of ["assign", "claim"] as const) {
    const b = handlerFailure(c, kind).banner;
    assert.doesNotMatch(`${b.title} ${b.lines.map((l) => l.text).join(" ")}`, /stale|no_change|forbidden|invalid|cancelled/i, `${JSON.stringify(c)} ${kind}`);
  }
});

test("handlerSaved: câu báo sau khi lưu — nhận, đổi người, giao lần đầu", () => {
  assert.equal(handlerSaved("claim", "Sales Một", false), "Bạn đã nhận phụ trách đơn này.");
  assert.equal(handlerSaved("assign", "Sales Hai", true), "Đã đổi người phụ trách sang Sales Hai.");
  assert.equal(handlerSaved("assign", "Sales Hai", false), "Đã giao đơn cho Sales Hai phụ trách.");
});

test("myJobActions (ADR-0030 S23-8, lượt 1): nháp → ẩn cả hai; đã xác nhận còn ngày đi → đủ cả hai; đã xác nhận qua ngày đi → chỉ còn sửa số khách", () => {
  assert.deepEqual(myJobActions({ status: "draft", departed: false }), { cancel: false, editPax: false }, "nháp chưa đi thì cũng ẩn cả hai (route đều 409)");
  assert.deepEqual(myJobActions({ status: "draft", departed: true }), { cancel: false, editPax: false }, "nháp đã qua ngày đi vẫn ẩn cả hai — trạng thái thắng, không xét departed");
  assert.deepEqual(myJobActions({ status: "confirmed", departed: false }), { cancel: true, editPax: true });
  assert.deepEqual(myJobActions({ status: "confirmed", departed: true }), { cancel: false, editPax: true }, "giữ DK-T4-02: qua ngày đi thì ẩn huỷ, vẫn sửa được số khách");
});
