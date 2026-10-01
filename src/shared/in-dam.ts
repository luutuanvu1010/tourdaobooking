// In đậm trong câu trả lời của trợ lý "Mai" (yêu cầu chủ 2026-10-01): lời nhắc cho phép MỘT định dạng duy nhất là cặp `**…**` (tên nút, mục menu, đường điều hướng).
// Hàm THUẦN cho giao diện: chuỗi → danh sách đoạn {chu, dam}. KHÔNG BAO GIỜ sinh HTML — giao diện dựng `h("strong", …)` / chữ thường từ danh sách này.
// Chỉ nhận cặp khép kín trên CÙNG MỘT dòng, không rỗng, chữ trong không bắt đầu / kết thúc bằng khoảng trắng và không chứa dấu `*`; `**` lẻ / chưa đóng ⇒ nguyên văn.
// Không import gì: nạp ở trang khung chat.

export interface DoanChu { readonly chu: string; readonly dam: boolean }

const CAP_DAM = /\*\*(?=\S)([^*\n]*?\S)\*\*/gu;

export function tachInDam(s: string): DoanChu[] {
  const ra: DoanChu[] = [];
  let tu = 0;
  for (const m of s.matchAll(CAP_DAM)) {
    const dau = m.index ?? 0;
    if (dau > tu) ra.push({ chu: s.slice(tu, dau), dam: false });
    ra.push({ chu: m[1]!, dam: true });
    tu = dau + m[0].length;
  }
  if (tu < s.length) ra.push({ chu: s.slice(tu), dam: false });
  return ra;
}
