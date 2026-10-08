// Luật THUẦN tối thiểu về tháng khoá sổ (ADR-0080 phần D1): tháng của một ngày, nhãn tháng, câu báo "tháng đã khoá", độ dài ghi chú khoá. MỘT nguồn duy nhất của mỗi thứ này.
// Đặt ở `shared/` vì luật thuần của `billing` (`ngayPhatSinh`) chạy thẳng bằng `node --test` và không import được `index.ts` của module `ky-so`
// (kéo theo `audit` — đường dẫn không đuôi) lẫn tệp sâu của module khác (bài kiến trúc cấm). `ky-so/rules.ts` tái xuất các hàm này.
// Không cắt chuỗi bằng `slice(5, 7)` / `slice(8, 10)` (bài `src/ngay-mot-ham.test.ts` cấm; đây là nhãn tháng, không phải ngày hiển thị) — tách bằng `split("-")`.
// Tệp này không import gì.

/** Tháng ("YYYY-MM") của một ngày ("YYYY-MM-DD"). */
export const kyCua = (ngay: string): string => ngay.slice(0, 7);
/** Tách "YYYY-MM" thành năm và tháng (số). */
export function tachThang(period: string): { nam: number; thang: number } {
  const [nam, thang] = period.split("-");
  return { nam: Number(nam), thang: Number(thang) };
}
/** "2026-09" → "09/2026". */
export function nhanThang(period: string): string {
  const [nam, thang] = period.split("-");
  return `${thang}/${nam}`;
}
/** Ghi chú khi khoá tháng: tối đa 200 ký tự (khớp CHECK của `ky_period_close.note`). MỘT chỗ — `docGhiChuKy` (máy chủ) và ô ghi chú của trang Khoá sổ tháng cùng dùng. */
export const GHI_CHU_KHOA_TOI_DA = 200;
/** Câu báo tháng đã khoá — dùng cho cả lời kiểm trước lô lẫn lỗi trigger dịch lại (một chữ duy nhất). */
export const cauKyKhoa = (period: string): string => `Tháng ${nhanThang(period)} đã khoá sổ — ghi vào tháng đang mở (điều chỉnh, có lý do)`;
