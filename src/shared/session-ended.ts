// Lời báo "vì sao máy này vừa bị đăng xuất" ở trang đăng nhập (ADR-0075). Thuần: dùng ở giao diện (web/api.ts lưu, web/login.ts hiện) và ở nhãn của máy chủ.
import { vnDateTimeText } from "./vn-date.ts";

/** Nhãn lý do "bị thay" — máy chủ trả đúng chữ này ở `POST /api/auth/session-ended` (`END_REASON_LABEL.bi_thay`), giao diện nhận ra nó để đổi sang câu có giờ. */
export const LY_DO_BI_THAY = "Bị thay bởi máy khác";
/** Khoá sessionStorage mang lý do từ trang vừa bị đá (web/api.ts) sang trang đăng nhập. */
export const SESSION_ENDED_KEY = "td_session_ended";

export interface SessionEndedNotice { reason: string; endedAt: string | null }

/** Đọc thân trả của `session-ended` → lời báo, hoặc null khi không có lý do. */
export function parseSessionEnded(value: unknown): SessionEndedNotice | null {
  if (typeof value !== "object" || value === null) return null;
  const { reason, endedAt } = value as { reason?: unknown; endedAt?: unknown };
  if (typeof reason !== "string" || reason === "") return null;
  return { reason, endedAt: typeof endedAt === "string" ? endedAt : null };
}

/** Câu hiện trên trang đăng nhập. "Bị thay" + có giờ: "Tài khoản vừa đăng nhập trên máy khác lúc HH:MM" (giờ Việt Nam); lý do khác: "Máy này đã bị đăng xuất. Lý do: <lý do>." */
export function sessionEndedMessage(n: SessionEndedNotice): string {
  if (n.reason === LY_DO_BI_THAY) {
    const gio = n.endedAt !== null && Number.isFinite(Date.parse(n.endedAt)) ? vnDateTimeText(n.endedAt).slice(0, 5) : null;
    return gio ? `Tài khoản vừa đăng nhập trên máy khác lúc ${gio}` : "Tài khoản vừa đăng nhập trên máy khác.";
  }
  return `Máy này đã bị đăng xuất. Lý do: ${n.reason}.`;
}

/** Câu dự phòng khi hết phiên mà không có lý do cụ thể (B-7). Chỉ hiện cho máy từng có người đăng nhập (xem `dauHetPhien`). */
export const CAU_HET_PHIEN = "Phiên đăng nhập đã hết. Đăng nhập lại để tiếp tục.";

/** Dấu "không có gì để báo": ghi đè khoá cũ còn sót, trang đăng nhập đọc ra null. */
export const DAU_KHONG_BAO = "-";

/** Giá trị ghi vào `SESSION_ENDED_KEY` khi bị đá ra: có lý do → ghi lý do; không lý do mà máy có bản nhớ khung (từng có người đăng nhập) → chuỗi rỗng; còn lại (liên kết sâu trên máy lạ) → `DAU_KHONG_BAO` (không câu nào). */
export function dauHetPhien(body: unknown, coKhungNho: boolean): string {
  const notice = parseSessionEnded(body);
  return notice ? JSON.stringify(notice) : coKhungNho ? "" : DAU_KHONG_BAO;
}

/** Đọc giá trị đã ghi ở `SESSION_ENDED_KEY` → câu hiện ở trang đăng nhập, hoặc null. */
export function cauTuDauNho(raw: string): string | null {
  if (raw === "") return CAU_HET_PHIEN;
  try {
    const n = parseSessionEnded(JSON.parse(raw));
    return n ? sessionEndedMessage(n) : null;
  } catch {
    return null;
  }
}
