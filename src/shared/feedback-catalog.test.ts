import { test } from "node:test";
import assert from "node:assert/strict";
import { FEEDBACK_STATUSES, FEEDBACK_TRANSITIONS, canTransition, nhanNutChuyen, buocGopY, SAC_TRANG_THAI, feedbackCode, isFeedbackKind, isFeedbackStatus, statusAfterSubmitterReply, type FeedbackStatus } from "./feedback-catalog.ts";

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

test("nhãn nút đổi trạng thái: Đã xong / Từ chối → Đã tiếp nhận hiện 'Mở lại' (góp ý T2); các bước khác '→ <trạng thái>'", () => {
  assert.equal(nhanNutChuyen("DONE", "ACK"), "Mở lại");
  assert.equal(nhanNutChuyen("DECLINED", "ACK"), "Mở lại");
  assert.equal(nhanNutChuyen("NEW", "ACK"), "→ Đã tiếp nhận");
  assert.equal(nhanNutChuyen("ACK", "IN_PROGRESS"), "→ Đang xử lý");
  assert.equal(nhanNutChuyen("IN_PROGRESS", "DONE"), "→ Đã xong");
});

test("thanh bước Góp ý (chủ duyệt ảnh c, 30/9): bốn bước Mới → Đã tiếp nhận → Đang xử lý → Đã xong; Từ chối là nhánh rẽ (không thanh bước)", () => {
  const tinh = (s: FeedbackStatus) => buocGopY(s)?.map((b) => b.tinh) ?? null;
  assert.deepEqual(buocGopY("NEW")!.map((b) => b.nhan), ["Mới", "Đã tiếp nhận", "Đang xử lý", "Đã xong"]);
  assert.deepEqual(tinh("NEW"), ["dang", "chua", "chua", "chua"]);
  assert.deepEqual(tinh("ACK"), ["xong", "dang", "chua", "chua"]);
  assert.deepEqual(tinh("IN_PROGRESS"), ["xong", "xong", "dang", "chua"]);
  assert.deepEqual(tinh("DONE"), ["xong", "xong", "xong", "xong"]);
  assert.equal(buocGopY("DECLINED"), null);
  assert.deepEqual(SAC_TRANG_THAI, { NEW: "moi", ACK: "xu-ly", IN_PROGRESS: "xu-ly", DONE: "xong", DECLINED: "tu-choi" });
});
