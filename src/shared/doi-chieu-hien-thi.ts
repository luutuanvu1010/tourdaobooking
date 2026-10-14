// Chữ nhắc cho Kế toán về khoản "Công ty thu" đang đối chiếu (ADR-0118 Điều 1 mục 3) — hàm THUẦN dùng ở Trang chủ và trang đơn của `web/`.
// Số ngày nhắc: MỘT nguồn ở máy chủ (`SO_NGAY_NHAC_DOI_CHIEU`, billing/rules.ts); bản ở đây chỉ để giao diện tự tính "chờ mấy ngày" từ giờ ghi lần thu, và
// bài `doi-chieu-hien-thi.test.ts` khoá hai nơi bằng nhau. Câu nhắc KHÔNG chứa số điện thoại, số tài khoản hay mã giao dịch: chỉ tên người khai, số tiền, số ngày.
import { vnToday } from "./vn-date.ts";

export const NGAY_NHAC_DOI_CHIEU_HIEN_THI = 3;

const MOT_NGAY = 86_400_000;

/** Số ngày dân sự (giờ VN) từ ngày khai tới hôm nay; ghiLuc là dấu thời gian ISO UTC của lần thu. Không âm. */
export function soNgayCho(ghiLuc: string, bayGio: Date): number {
  const khai = Date.parse(`${vnToday(new Date(ghiLuc))}T00:00:00Z`);
  const nay = Date.parse(`${vnToday(bayGio)}T00:00:00Z`);
  return Math.max(0, Math.round((nay - khai) / MOT_NGAY));
}

/** Khoản chờ nhiều HƠN 3 ngày thì nhắc (đúng 3 ngày chưa nhắc) — cùng luật `nhacDoiChieu` của máy chủ. */
export const quaHanDoiChieu = (soNgay: number): boolean => soNgay > NGAY_NHAC_DOI_CHIEU_HIEN_THI;

/** Dòng nhắc dưới một khoản đang đối chiếu ở trang đơn: "Nam HDV khai 100.000 ₫ — đã chờ 4 ngày, quá 3 ngày, cần đối chiếu". */
export function cauNhacKhoan(input: { nguoiKhai: string | null; soTienDaDinhDang: string; soNgay: number }): string {
  const ai = input.nguoiKhai && input.nguoiKhai !== "—" ? `${input.nguoiKhai} khai ` : "Khai ";
  const cho = input.soNgay === 0 ? "mới khai hôm nay" : `đã chờ ${input.soNgay} ngày`;
  return `${ai}${input.soTienDaDinhDang} — ${cho}${quaHanDoiChieu(input.soNgay) ? `, quá ${NGAY_NHAC_DOI_CHIEU_HIEN_THI} ngày, cần đối chiếu` : ""}.`;
}

/** Tiêu đề dòng ở khối "Cần xem lại" của Trang chủ Kế toán. */
export const tieuDeDemDoiChieu = (soKhoan: number): string => `${soKhoan} khoản chuyển khoản đang đối chiếu quá ${NGAY_NHAC_DOI_CHIEU_HIEN_THI} ngày`;
