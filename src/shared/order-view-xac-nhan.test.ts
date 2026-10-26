// ADR-0136 Task 3.5: nút của bước xác nhận (Gửi xác nhận / Rút lại / quyết định / Gửi đơn). Cờ `cho` do MÁY CHỦ gửi (khối `xacNhan` của chi tiết đơn) — luật hiển thị thuần, không DOM.
import { test } from "node:test";
import assert from "node:assert/strict";
import { orderActions, type OrderActions } from "./order-view.ts";

const A = (o: Partial<OrderActions>): OrderActions => ({ edit: false, confirm: false, send: false, withdraw: false, decide: false, submit: false, editTrip: false, cancel: false, noPermission: false, locked: false, ...o });

test("nháp cần xác nhận, người lập KHÔNG giữ Đối tác → «Gửi xác nhận» thay «Xác nhận đơn»; không cần xác nhận → «Xác nhận đơn» như cũ", () => {
  const cho = { canXacNhan: true, dangCho: false, quyetDinhDuoc: false, giuDoiTacLap: false };
  assert.deepEqual(orderActions("draft", true, true, cho), A({ edit: true, send: true, cancel: true }));
  assert.deepEqual(orderActions("draft", true, true, { ...cho, canXacNhan: false }), A({ edit: true, confirm: true, cancel: true }));
});

test("người lập giữ Đối tác (kể cả tài khoản lai) → chỉ «Gửi đơn», không «Xác nhận đơn», không «Gửi xác nhận»", () => {
  for (const canXacNhan of [true, false]) {
    assert.deepEqual(orderActions("draft", true, false, { canXacNhan, dangCho: false, quyetDinhDuoc: false, giuDoiTacLap: true }), A({ edit: true, submit: true, cancel: true }));
  }
});

test("đang chờ → người lập chỉ còn «Rút lại» (khoá sửa, xác nhận, huỷ); người quyết định được có thêm `decide`; người xét duyệt không phải người lập không bị coi là «không có quyền sửa»", () => {
  assert.deepEqual(orderActions("draft", true, false, { canXacNhan: true, dangCho: true, quyetDinhDuoc: false, giuDoiTacLap: true }), A({ withdraw: true }));
  assert.deepEqual(orderActions("draft", true, true, { canXacNhan: true, dangCho: true, quyetDinhDuoc: true, giuDoiTacLap: false }), A({ withdraw: true, decide: true }));
  assert.deepEqual(orderActions("draft", false, false, { canXacNhan: false, dangCho: true, quyetDinhDuoc: true, giuDoiTacLap: false }), A({ decide: true }));
  assert.deepEqual(orderActions("draft", false, false, { canXacNhan: false, dangCho: true, quyetDinhDuoc: false, giuDoiTacLap: false }), A({}));
});

test("đơn đã xác nhận / huỷ không bao giờ có nút của bước xác nhận dù `cho` còn sót", () => {
  const cho = { canXacNhan: true, dangCho: true, quyetDinhDuoc: true, giuDoiTacLap: true };
  for (const st of ["confirmed", "cancelled"] as const) {
    const a = orderActions(st, true, true, cho);
    assert.deepEqual([a.send, a.withdraw, a.decide, a.submit], [false, false, false, false], st);
  }
});

test("không truyền `cho` (máy chủ cũ) → như trước: nháp có «Xác nhận đơn»", () => {
  assert.deepEqual(orderActions("draft", true, true), A({ edit: true, confirm: true, cancel: true }));
});
