import { test } from "node:test";
import assert from "node:assert/strict";
import type { HandlerDto } from "./contracts.ts";
import { handlerControls, handlerFailure, handlerSaved, handlerText, hoiDuocNguoiPhuTrach, myJobActions, NO_HANDLER_TEXT, nguoiPhuTrachTuPhien } from "./handler-view.ts";
import { can, PERMISSION_CODES, type PermissionCode } from "./permissions.ts";

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

test("myJobActions (ADR-0030 S23-8, lượt 1; chủ duyệt 2026-09-30 \"Cho sửa đến hết ngày đi\"): nháp → ẩn cả hai; đã xác nhận còn ngày đi → đủ cả hai; đã xác nhận qua ngày đi → ẩn cả hai", () => {
  assert.deepEqual(myJobActions({ status: "draft", departed: false }), { cancel: false, editPax: false }, "nháp chưa đi thì cũng ẩn cả hai (route đều 409)");
  assert.deepEqual(myJobActions({ status: "draft", departed: true }), { cancel: false, editPax: false }, "nháp đã qua ngày đi vẫn ẩn cả hai — trạng thái thắng, không xét departed");
  assert.deepEqual(myJobActions({ status: "confirmed", departed: false }), { cancel: true, editPax: true });
  assert.deepEqual(myJobActions({ status: "confirmed", departed: true }), { cancel: false, editPax: false }, "qua ngày đi: ẩn huỷ (DK-T4-02) và ẩn sửa số khách (chủ duyệt 2026-09-30) — máy chủ cũng chặn cả hai");
});

// Vòng sửa 1 sau kiểm độc lập lượt 1 ADR-0030 (phát hiện I-2): trang Đơn hàng, trang đơn và biên nhận gọi GET /api/dispatch/handlers (403 với HDV — route
// hỏi order.view KHÔNG ngữ cảnh, không mở cho HDV theo ruling Task 1.6) → HDV mở đơn CHÍNH MÌNH phụ trách thấy "Chưa tải được người phụ trách", biên
// nhận mất dòng "Nhân viên phụ trách". Người chỉ xem được đơn mình đang phụ trách thì người phụ trách của MỌI đơn họ thấy = chính họ (tên từ phiên).
const phien = (permissions: PermissionCode[], o: { partyId?: string | null; fullName?: string } = {}) => ({
  id: "nv-xem",
  fullName: o.fullName ?? "Hướng Dẫn Viên A",
  partyId: o.partyId === undefined ? "pty-nv-xem" : o.partyId,
  permissions,
});

test("nguoiPhuTrachTuPhien: chỉ-HDV → người phụ trách = chính mình (tên + tài khoản + hồ sơ từ phiên), KHÔNG cần hỏi máy chủ", () => {
  assert.deepEqual(nguoiPhuTrachTuPhien(phien(["FIELD"])), { partyId: "pty-nv-xem", staffId: "nv-xem", name: "Hướng Dẫn Viên A" });
});

test("nguoiPhuTrachTuPhien: người xem mọi đơn / Đối tác / Thực tập / tài khoản ghép HDV+Thực tập hoặc HDV+Đối tác → undefined (trang hỏi máy chủ như cũ)", () => {
  for (const perms of [["SALES"], ["ACCOUNTING"], ["ADMIN"], ["SUPER_ADMIN"], ["PARTNER"], ["INTERN"], ["FIELD", "INTERN"], ["FIELD", "PARTNER"], ["FIELD", "SALES"]] as PermissionCode[][]) {
    assert.equal(nguoiPhuTrachTuPhien(phien(perms)), undefined, JSON.stringify(perms));
  }
});

test("nguoiPhuTrachTuPhien: 1024 tập con quyền — có giá trị KHI VÀ CHỈ KHI máy chủ chỉ trả đơn đang phụ trách (nhánh (3) của GET /api/orders: không 'mọi đơn', không 'mình lập', có 'mình phụ trách')", () => {
  const moiTapCon = <T,>(mang: readonly T[]): T[][] => (mang.length === 0 ? [[]] : ((con) => [...con, ...con.map((t) => [mang[0] as T, ...t])])(moiTapCon(mang.slice(1))));
  const tapCon = moiTapCon(PERMISSION_CODES as readonly PermissionCode[]);
  assert.equal(tapCon.length, 1024); // 10 mã quyền (ADR-0040 D3 thêm DRIVER, ADR-0048 D2 thêm DRIVER_PARTNER, ADR-0071 thêm HR)
  let soCaTuPhien = 0;
  for (const permissions of tapCon) {
    const s = phien(permissions);
    // Suy từ bảng quyền bằng đúng ba câu hỏi route danh sách đơn đặt (src/modules/orders/index.ts, ADR-0030 S23-4), không chép tay tên quyền.
    const chiDonPhuTrach = !can(s, "order.view") && !can(s, "order.view", { ownerId: s.id }) && can(s, "order.view", { assigned: true });
    const kq = nguoiPhuTrachTuPhien(s);
    assert.equal(kq !== undefined, chiDonPhuTrach, `permissions=${JSON.stringify(permissions)}`);
    if (kq) soCaTuPhien++;
  }
  assert.ok(soCaTuPhien > 0, "phải có tập quyền thật (FIELD) rơi vào ca tự phiên");
});

test("nguoiPhuTrachTuPhien: phiên thiếu hồ sơ hoặc tên rỗng → undefined (không dựng người phụ trách từ dữ liệu thiếu — trang hỏi máy chủ, ra 'chưa biết' như cũ)", () => {
  assert.equal(nguoiPhuTrachTuPhien(phien(["FIELD"], { partyId: null })), undefined);
  assert.equal(nguoiPhuTrachTuPhien(phien(["FIELD"], { fullName: "   " })), undefined);
});

// L2 (lỗi báo 30/9): GET /api/dispatch/handlers hỏi `order.view` KHÔNG ngữ cảnh (src/modules/dispatch/index.ts) → 403 với Đối tác, Thực tập, HDV; trang đơn
// của Đối tác/Thực tập từng luôn hiện "Chưa tải được người phụ trách." + Thử lại. Giao diện chỉ gọi route đó khi hàm này đúng (cùng câu hỏi với route).
test("hoiDuocNguoiPhuTrach: chỉ người xem được mọi đơn (văn phòng) — Đối tác, Thực tập, HDV, tài khoản lai của họ, tài xế thì không", () => {
  for (const code of ["SALES", "ACCOUNTING", "ADMIN", "SUPER_ADMIN"] as const) assert.equal(hoiDuocNguoiPhuTrach(who("x", code)), true, code);
  for (const perms of [["PARTNER"], ["INTERN"], ["FIELD"], ["FIELD", "INTERN"], ["PARTNER", "FIELD"], ["DRIVER"], ["DRIVER_PARTNER"]] as PermissionCode[][]) {
    assert.equal(hoiDuocNguoiPhuTrach(who("x", ...perms)), false, perms.join("+"));
  }
  assert.equal(hoiDuocNguoiPhuTrach(who("x", "SALES", "PARTNER")), true, "lai văn phòng + Đối tác vẫn xem mọi đơn");
  // Cùng câu hỏi với route: mọi tổ hợp quyền.
  for (let mask = 0; mask < 1 << PERMISSION_CODES.length; mask++) {
    const w = { id: "x", permissions: PERMISSION_CODES.filter((_, i) => mask & (1 << i)) };
    assert.equal(hoiDuocNguoiPhuTrach(w), can(w, "order.view"));
  }
});
