// Khoá so tên (ADR-0117): bỏ dấu, gấp đ/Đ về d, thường hoá, gọn khoảng trắng — "nhan vien SPA" trùng "Nhân viên spa". MỘT định nghĩa cho tên loại đối tác (parties, lần 1)
// và tên mức TA (pricing, lần 2: máy chủ ghi vào cột `prc_rate_tier.name_key` UNIQUE). Chỉ để SO; không bao giờ hiển thị.
export const khoaTen = (s: string): string => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "d").toLowerCase().replace(/\s+/g, " ").trim();
