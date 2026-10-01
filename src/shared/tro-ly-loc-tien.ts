// Lọc số tiền khỏi câu trả lời của mẫu AI (ADR-0073 Đ7a — lớp máy chủ cho Hiến chương 5.15, không phụ thuộc lời nhắc mà Toàn quyền sửa được). Thuần, không import.
// Mẫu nhận diện RIÊNG, RỘNG hơn mẫu "số tiền" của viPhamChu (huong-dan.ts). Hiến chương 5.15 ("AI không bao giờ nêu tiền") thắng giả định R7 của người lập kế hoạch ⇒ nghiêng về ẨN:
//  1. Số có dấu nhóm nghìn ("350.000", "1,500,000") LUÔN ẩn, trừ khi liền sau là đơn vị không phải tiền (km, m, kg, g, người, khách, chỗ, phòng, %, lượt, đoạn, token, ký tự).
//  2. Tiền ghi TRƯỚC số: "VND 500.000", "VNĐ 500.000", "USD 20", "US$20", "$5" ⇒ ẩn cả cụm.
//  3. Viết tắt tiếng Việt: "1tr2", "2tr5", "1tỷ2", "2 triệu 5", "2 triệu 500 nghìn", "1 triệu rưỡi" ⇒ ẩn cả cụm.
//  4. Số kèm đơn vị: "500.000 đ", "1,2 triệu", "300k", "2 tr", "10 USD"; đơn vị tiền thừa theo sau ("500 nghìn đồng") bị ẩn cùng.
//  5. Dãy ≥ 6 chữ số trần ("1200000") không đứng sau chữ cái hoặc "-" ⇒ ẩn (mã đơn "TD-20261001-001" giữ nguyên).
// KHÔNG bắt số trần ngắn không đơn vị (giờ, ngày, số bước, số khách, năm, phiên bản "1.53", phần trăm). Ranh giới bằng \p{L}: "2 trang", "3 tỉnh", "2 đơn" không bị coi là "2 tr", "3 tỉ", "2 đ".
// GIỚI HẠN ĐÃ BIẾT (không xử lý bằng mã): tiền viết bằng chữ ("hai trăm nghìn", "5 đô", "3 củ") lọt qua; chỉ lời nhắc và kiểm tay chặn được. Ghi ở nhật ký thi công.
// An toàn ReDoS: mọi nhánh bắt đầu sau lookbehind chặn giữa số, không có nhóm lặp lồng nhau.
export const AN_SO_TIEN = "[đã ẩn số tiền]";

const SO = String.raw`\d{1,3}(?:[.,]\d{3})+(?:,\d+)?|\d+(?:[.,]\d+)?`;
const TIEN_THUA = String.raw`(?:\s*(?:đồng|₫|vnđ|vnd|đ))?`;
const DON_VI_KHONG_TIEN = String.raw`km|m|kg|g|người|khách|chỗ|phòng|%|lượt|đoạn|token|ký tự`;
const TIEN = new RegExp(
  [
    // 2. tiền ghi trước số
    String.raw`(?<!\p{L})(?:us\$|\$|vnđ|vnd|usd)\s?\d+(?:[.,]\d+)*`,
    // 3 + 4. số + đơn vị (đơn vị lớn nhận thêm phần lẻ "2", "500 nghìn", "rưỡi"; đơn vị tiền thừa theo sau)
    String.raw`(?<![\p{L}\d.,])(?:${SO})\s*(?:(?:triệu|tr|tỷ|tỉ)(?:\s*(?:\d+(?:[.,]\d+)?|rưỡi)(?:\s*(?:nghìn|ngàn|k))?)?|nghìn|ngàn|đồng|₫|vnđ|vnd|usd|đ|k)${TIEN_THUA}(?![\p{L}\d])`,
    // 1. nhóm nghìn luôn ẩn, trừ khi liền sau là đơn vị không phải tiền
    String.raw`(?<![\p{L}\d.,])(?:\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d{1,3}(?:,\d{3}){2,})(?![\d]|[.,]\d)(?!\s*(?:${DON_VI_KHONG_TIEN})(?!\p{L}))`,
    // 5. dãy số trần dài
    String.raw`(?<![\p{L}\d.,\-])\d{6,}(?!\d)`,
  ].join("|"),
  "giu",
);

/** Thay MỖI chỗ có số tiền bằng "[đã ẩn số tiền]". Gọi trên câu trả lời TRƯỚC khi trả cho người dùng và TRƯỚC khi lưu lịch sử. */
export const anSoTien = (s: string): string => s.replace(TIEN, AN_SO_TIEN);
