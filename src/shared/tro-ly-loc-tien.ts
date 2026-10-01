// Lọc số tiền khỏi câu trả lời của mẫu AI (ADR-0073 Đ7a — lớp máy chủ cho Hiến chương 5.15, không phụ thuộc lời nhắc mà Toàn quyền sửa được). Thuần, không import.
// Mẫu nhận diện RIÊNG, RỘNG hơn mẫu "số tiền" của viPhamChu (huong-dan.ts): bắt số kèm đơn vị tiền — "500.000 đ", "1,2 triệu", "300k", "2 tr", "$5", "10 USD" —
// và dãy có từ hai nhóm nghìn trở lên ("1.200.000"). KHÔNG bắt số trần không đơn vị (mã đơn, giờ, ngày, số bước, số khách) — giả định bề mặt R7.
// Ranh giới bằng \p{L} (chữ có dấu): "2 trang", "4 khách", "2 đơn", "3 tỉnh" không bị coi là "2 tr", "4 k", "2 đ", "3 tỉ".
export const AN_SO_TIEN = "[đã ẩn số tiền]";

const SO = String.raw`\d{1,3}(?:[.,]\d{3})+(?:,\d+)?|\d+(?:[.,]\d+)?`;
const DON_VI = String.raw`đồng|đ|₫|vnđ|vnd|usd|nghìn|ngàn|triệu|tr|tỷ|tỉ|k`;
const TIEN = new RegExp(
  [
    String.raw`\$\s?\d[\d.,]*`,
    String.raw`(?<![\p{L}\d.,])(?:${SO})\s*(?:${DON_VI})(?![\p{L}\d])`,
    String.raw`(?<![\p{L}\d.,])\d{1,3}(?:\.\d{3}){2,}(?![\d.,]*\d)`,
  ].join("|"),
  "giu",
);

/** Thay MỖI chỗ có số tiền bằng "[đã ẩn số tiền]". Gọi trên câu trả lời TRƯỚC khi trả cho người dùng và TRƯỚC khi lưu lịch sử. */
export const anSoTien = (s: string): string => s.replace(TIEN, AN_SO_TIEN);
