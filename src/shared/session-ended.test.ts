import { test } from "node:test";
import assert from "node:assert/strict";
import { LY_DO_BI_THAY, parseSessionEnded, sessionEndedMessage } from "./session-ended.ts";

test("parseSessionEnded: chỉ nhận thân có lý do chữ", () => {
  assert.equal(parseSessionEnded(null), null);
  assert.equal(parseSessionEnded({ reason: null, endedAt: null }), null);
  assert.equal(parseSessionEnded({ reason: "", endedAt: null }), null);
  assert.deepEqual(parseSessionEnded({ reason: "Đã đăng xuất", endedAt: 5 }), { reason: "Đã đăng xuất", endedAt: null });
  assert.deepEqual(parseSessionEnded({ reason: LY_DO_BI_THAY, endedAt: "2026-10-01T03:05:00.000Z" }), { reason: LY_DO_BI_THAY, endedAt: "2026-10-01T03:05:00.000Z" });
});

test("sessionEndedMessage: 'bị thay' có giờ Việt Nam; lý do khác có chữ lý do", () => {
  assert.equal(sessionEndedMessage({ reason: LY_DO_BI_THAY, endedAt: "2026-10-01T03:05:00.000Z" }), "Tài khoản vừa đăng nhập trên máy khác lúc 10:05");
  assert.equal(sessionEndedMessage({ reason: LY_DO_BI_THAY, endedAt: "2026-10-01T18:30:00.000Z" }), "Tài khoản vừa đăng nhập trên máy khác lúc 01:30", "qua nửa đêm theo giờ VN");
  assert.equal(sessionEndedMessage({ reason: LY_DO_BI_THAY, endedAt: null }), "Tài khoản vừa đăng nhập trên máy khác.");
  assert.equal(sessionEndedMessage({ reason: "Bị đặt lại PIN", endedAt: "2026-10-01T03:05:00.000Z" }), "Máy này đã bị đăng xuất. Lý do: Bị đặt lại PIN.");
});
