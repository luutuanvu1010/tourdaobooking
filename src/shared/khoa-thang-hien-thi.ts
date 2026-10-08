// Chữ và thứ tự hiển thị của màn "Khoá sổ tháng" (web/khoa-thang.ts; đặc tả sổ đại lý đợt 1 §8, §13). Luật thuần đặt ở đây để bài kiểm khoá được các câu quan trọng — nhất là
// câu hộp xác nhận phải nói rõ "KHÔNG mở lại được" (khoá nhầm tháng chỉ cứu được bằng khôi phục cả cơ sở dữ liệu, lỗ HC-5.19). Tháng luôn qua `nhanThang` (MM/YYYY), không tự cắt chuỗi.
import { nhanThang } from "./ky-khoa.ts";

/** Gợi ý dưới ô ghi chú khi khoá. Chỉ là chữ giao diện: luật ghi chú (`docGhiChuKy`, máy chủ) chặn dãy ≥ 8 chữ số sau khi bỏ dấu chấm, gạch nối, khoảng trắng — ngày viết
 *  «30/09/2026» không dính luật đó, «30.09.2026» hay «2026-09-30» thì dính (bài `src/modules/ky-so/rules.test.ts` khoá điều này). Độ dài tối đa: `GHI_CHU_KHOA_TOI_DA` ở `ky-khoa.ts`. */
export const GOI_Y_GHI_CHU_KHOA = "Ghi ngày dạng 30/09/2026. Không ghi số điện thoại hay số tài khoản.";

export const CAU_CHUA_KHOA_THANG_NAO = "Chưa khoá tháng nào";
export const CAU_KHONG_CO = "Không có";
export const CAU_HET_THANG_KHOA = "Chưa có tháng nào khoá được (tháng hiện tại chưa qua).";
export const CAU_BANG_KIEM_KHONG_CHAN = "Bảng kiểm chỉ để xem trước khi khoá, không chặn việc khoá — Kế toán tự quyết.";

/** Tháng đã khoá, tháng mới nhất đứng đầu ("YYYY-MM" so chuỗi cũng là so thời gian). Không đổi mảng đầu vào. */
export const thangDaKhoaMoiTruoc = (daKhoa: readonly string[]): string[] => [...daKhoa].sort().reverse();

/** Tiêu đề khối bảng kiểm: "Tháng khoá được kế tiếp: 09/2026"; hết tháng để khoá thì chỉ còn phần đầu. */
export const tieuDeKeTiep = (keTiep: string | null): string => (keTiep === null ? "Tháng khoá được kế tiếp" : `Tháng khoá được kế tiếp: ${nhanThang(keTiep)}`);

/** Chữ nút mở hộp xác nhận: "Khoá tháng 09/2026". */
export const nhanNutKhoa = (period: string): string => `Khoá tháng ${nhanThang(period)}`;

/** Chữ nút chốt trong hộp xác nhận. */
export const nhanNutXacNhanKhoa = (period: string): string => `Xác nhận khoá tháng ${nhanThang(period)}`;

/** Câu hộp xác nhận (đặc tả §8, §13): phải nói rõ không mở lại được và đường cứu duy nhất. */
export const cauXacNhanKhoa = (period: string): string =>
  `Khoá sổ tháng ${nhanThang(period)}? Việc này KHÔNG mở lại được. Muốn sửa sau khi khoá chỉ còn cách khôi phục cả cơ sở dữ liệu.`;

/** Câu báo sau khi khoá xong (thân 201 của máy chủ). */
export const cauDaKhoaXong = (period: string): string => `Đã khoá sổ tháng ${nhanThang(period)}.`;

/** Số khoản của một khối bảng kiểm: "3 khoản"; 0 khoản thì "Không có". */
export const demKhoan = (n: number): string => (n <= 0 ? CAU_KHONG_CO : `${n} khoản`);
