import { test } from "node:test";
import assert from "node:assert/strict";
import { FEEDBACK_STATUSES, FEEDBACK_TRANSITIONS, canTransition, feedbackCode, isFeedbackKind, isFeedbackStatus, statusAfterSubmitterReply, type FeedbackStatus } from "./feedback-catalog.ts";

test("bảng chuyển trạng thái: đúng từng cặp (5 × 5)", () => {
  const ok: Record<FeedbackStatus, FeedbackStatus[]> = {
    NEW: ["ACK"],
    ACK: ["IN_PROGRESS", "DONE", "DECLINED"],
    IN_PROGRESS: ["DONE", "DECLINED"],
    DONE: ["ACK"],
    DECLINED: ["ACK"],
  };
  for (const from of FEEDBACK_STATUSES) for (const to of FEEDBACK_STATUSES) assert.equal(canTransition(from, to), ok[from].includes(to), `${from} → ${to}`);
  assert.deepEqual(Object.keys(FEEDBACK_TRANSITIONS).sort(), [...FEEDBACK_STATUSES].sort());
});

test("người gửi trả lời: DONE/DECLINED mở lại thành ACK, trạng thái khác giữ nguyên", () => {
  assert.equal(statusAfterSubmitterReply("DONE"), "ACK");
  assert.equal(statusAfterSubmitterReply("DECLINED"), "ACK");
  for (const s of ["NEW", "ACK", "IN_PROGRESS"] as const) assert.equal(statusAfterSubmitterReply(s), s);
});

test("mã người đọc và kiểm giá trị lạ", () => {
  assert.equal(feedbackCode(7), "YC-0007");
  assert.equal(feedbackCode(12345), "YC-12345");
  assert.equal(isFeedbackKind("BUG"), true);
  assert.equal(isFeedbackKind("bug"), false);
  assert.equal(isFeedbackStatus("NEW"), true);
  assert.equal(isFeedbackStatus("CLOSED"), false);
  assert.equal(canTransition("NEW", "NEW"), false);
});
