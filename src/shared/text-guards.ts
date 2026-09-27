// Luật THUẦN dùng chung server ↔ nơi khác trong repo (không I/O): nhận diện "dãy số dài giống số điện thoại" trong chữ tự do. MỘT nguồn sự thật cho
// regex + ngưỡng (Q-N, chủ dự án: "8 chữ số") — đổi ngưỡng hay cách nhận diện dấu ngăn chỉ sửa Ở ĐÂY. Hai nơi dùng, hai cách xử lý khác nhau:
//  - `src/modules/orders/pool.ts` (`maskLongDigits`, ADR-0030 S23-2): CHE từng chữ số của dãy bằng "•" — hàng chờ nhận vẫn hiện được, chỉ ẩn số.
//  - `src/modules/dispatch/rules.ts` (`parseCancelReason`, lý do "Khác" khi HDV huỷ đơn — ADR-0030 điều 2, sửa đổi sau khi duyệt 2026-09-27): CHẶN HẲN
//    (400, không ghi), vì đây là nhật ký chỉ-thêm không xoá được (`migrations/0017_order_status_audit_guards.sql`) — che rồi vẫn ghi là không đủ.
// Import kèm đuôi .ts (chạy trực tiếp bằng `node --test`). Test cạnh tệp: text-guards.test.ts.

/** Ngưỡng: một dãy từ NGẦN NÀY chữ số trở lên coi là "giống số điện thoại/dãy số dài" (chủ dự án, Q-N: "8 chữ số"). */
export const MIN_LONG_DIGIT_RUN = 8;

/**
 * Một "dãy số": bắt đầu và kết thúc bằng chữ số; giữa hai chữ số được chen dấu ngăn — dấu cách, chấm, gạch nối, ngoặc đơn, dấu cộng, gạch dài (– —).
 * Q-N gốc chỉ nêu dấu cách/chấm/gạch nối; Ruling người thi công Task 1.5 (chặt hơn, đảo ngược được) thêm ngoặc đơn/dấu cộng/gạch dài — số bàn Nha
 * Trang hay viết "(0258) 3521 234", số quốc tế "(+84) 905 …". KHÔNG coi `/`, `,`, `:` là dấu ngăn (hai số cách nhau bằng "/" vẫn tách riêng; giờ
 * "6:30" không bị gộp). Hai lớp ký tự rời nhau (chữ số / dấu ngăn) nên biểu thức chạy tuyến tính, không quay lui bùng nổ.
 */
export const DIGIT_RUN = /\d(?:[\s.()+\-–—]*\d)*/g;

/** `text` có chứa ít nhất một dãy từ `MIN_LONG_DIGIT_RUN` chữ số trở lên không (đếm sau khi bỏ dấu ngăn ở trên)? */
export function hasLongDigitRun(text: string): boolean {
  for (const run of text.matchAll(DIGIT_RUN)) {
    if (run[0].replace(/\D/g, "").length >= MIN_LONG_DIGIT_RUN) return true;
  }
  return false;
}
