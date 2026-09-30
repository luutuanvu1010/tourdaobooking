// Danh mục Góp ý / Báo lỗi dùng chung server và web/: loại, trạng thái, nhãn, luật chuyển trạng thái. Logic thuần, không import gì.
// Bảng tra cứu fbk_kind / fbk_status trong migration phản chiếu đúng danh sách này (test src/modules/feedback/rules.test.ts đối chiếu).

export const FEEDBACK_KINDS = ["BUG", "IDEA", "QUESTION"] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];
export const FEEDBACK_KIND_NAME: Record<FeedbackKind, string> = { BUG: "Báo lỗi", IDEA: "Đề xuất", QUESTION: "Câu hỏi" };
export const isFeedbackKind = (v: unknown): v is FeedbackKind => typeof v === "string" && (FEEDBACK_KINDS as readonly string[]).includes(v);

export const FEEDBACK_STATUSES = ["NEW", "ACK", "IN_PROGRESS", "DONE", "DECLINED"] as const;
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];
export const FEEDBACK_STATUS_NAME: Record<FeedbackStatus, string> = {
  NEW: "Mới",
  ACK: "Đã tiếp nhận",
  IN_PROGRESS: "Đang xử lý",
  DONE: "Đã xong",
  DECLINED: "Từ chối",
};
export const isFeedbackStatus = (v: unknown): v is FeedbackStatus => typeof v === "string" && (FEEDBACK_STATUSES as readonly string[]).includes(v);

/** Chuyển trạng thái do admin làm. DONE/DECLINED → ACK là "mở lại" (admin, hoặc người gửi trả lời: xem `statusAfterSubmitterReply`). */
export const FEEDBACK_TRANSITIONS: Record<FeedbackStatus, readonly FeedbackStatus[]> = {
  NEW: ["ACK"],
  ACK: ["IN_PROGRESS", "DONE", "DECLINED"],
  IN_PROGRESS: ["DONE", "DECLINED"],
  DONE: ["ACK"],
  DECLINED: ["ACK"],
};
export const canTransition = (from: FeedbackStatus, to: FeedbackStatus): boolean => FEEDBACK_TRANSITIONS[from].includes(to);

/** Chữ trên nút đổi trạng thái (màn Góp ý): từ Đã xong / Từ chối về Đã tiếp nhận là "Mở lại" (góp ý T2) — luật chuyển giữ nguyên. */
export const nhanNutChuyen = (from: FeedbackStatus, to: FeedbackStatus): string =>
  (from === "DONE" || from === "DECLINED") && to === "ACK" ? "Mở lại" : `→ ${FEEDBACK_STATUS_NAME[to]}`;

/** Sắc màu của trạng thái (khối trạng thái + nhãn ở danh sách — chủ duyệt ảnh c, 30/9). */
export const SAC_TRANG_THAI: Record<FeedbackStatus, "moi" | "xu-ly" | "xong" | "tu-choi"> = { NEW: "moi", ACK: "xu-ly", IN_PROGRESS: "xu-ly", DONE: "xong", DECLINED: "tu-choi" };
const THU_TU_BUOC: readonly FeedbackStatus[] = ["NEW", "ACK", "IN_PROGRESS", "DONE"];
/** Thanh bước Mới → Đã tiếp nhận → Đang xử lý → Đã xong. Từ chối là nhánh rẽ → null (màn ghi "Mới → Đã tiếp nhận → Từ chối"). Đã xong: mọi bước "xong". */
export function buocGopY(s: FeedbackStatus): { nhan: string; tinh: "xong" | "dang" | "chua" }[] | null {
  if (s === "DECLINED") return null;
  const i = THU_TU_BUOC.indexOf(s);
  return THU_TU_BUOC.map((b, k) => ({ nhan: FEEDBACK_STATUS_NAME[b], tinh: k < i || s === "DONE" ? "xong" : k === i ? "dang" : "chua" }));
}

/** Người gửi trả lời khi yêu cầu đã đóng → mở lại thành "Đã tiếp nhận". SQL ở repository.ts phản chiếu đúng luật này. */
export const statusAfterSubmitterReply = (s: FeedbackStatus): FeedbackStatus => (s === "DONE" || s === "DECLINED" ? "ACK" : s);

/** Mã người đọc: YC-0007. */
export const feedbackCode = (seq: number): string => `YC-${String(seq).padStart(4, "0")}`;
