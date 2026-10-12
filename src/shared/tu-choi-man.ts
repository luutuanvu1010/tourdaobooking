// LUẬT THUẦN màn tài xế cho Từ chối chuyến + Báo bận (ADR-0053 D7.2, D8, D9; kế hoạch A4 T9, G-A4-16). Không I/O, không DOM — giao diện chỉ vẽ. Import kèm
// đuôi .ts (bài thuần chạy bằng node --test). Câu không lộ chữ Anh, không mã thô.
import type { GioVnDto } from "./contracts.ts";
import { ngayNgan } from "./vn-date.ts";

/** "00:30 12/03" (năm khi khác năm của hôm nay). */
export const gioNgan = (g: GioVnDto, homNay: string): string => `${g.gio} ${ngayNgan(g.ngay, homNay)}`;

export interface DaiHanTuChoi {
  /** `con_han` = còn Từ chối được (nút theo `tuChoiDuoc` của máy chủ); `qua_han` = đã quá hạn, chuyến chưa chạy (nút "Gọi văn phòng" khi có số). */
  loai: "con_han" | "qua_han";
  tieuDe: string;
  dong: string[];
  /** Số văn phòng cho nút "Gọi văn phòng" (`tel:`); `null` = chưa nhập → ẩn nút (lời chủ 6.3). */
  sdt: string | null;
}
/**
 * Dải hạn Từ chối trên màn một chuyến CHƯA chạy. Chỉ người có vế hạn (máy chủ gửi `hanTuChoi`); tài xế công ty (không khoá) → null. Nút "Từ chối chuyến" hiện
 * CHỈ theo cờ máy chủ `tuChoiDuoc` (G-A4-16) — hàm không tự so giờ.
 */
export function daiHanTuChoi(v: { trangThai: string; tuChoiDuoc: boolean; hanTuChoi?: GioVnDto; sdtVanPhong?: string }, homNay: string): DaiHanTuChoi | null {
  if (v.trangThai !== "PLANNED" || !v.hanTuChoi) return null;
  const han = gioNgan(v.hanTuChoi, homNay);
  const sdt = v.sdtVanPhong ?? null;
  if (v.tuChoiDuoc) {
    return { loai: "con_han", tieuDe: `Từ chối được tới ${han}`, dong: ["Không chạy được chuyến này thì bấm Từ chối chuyến trước giờ đó — văn phòng sẽ xếp người khác."], sdt };
  }
  return { loai: "qua_han", tieuDe: `Đã quá hạn từ chối (${han})`, dong: [sdt ? "Không chạy được thì gọi văn phòng ngay." : "Không chạy được thì báo văn phòng ngay."], sdt };
}

/** Thẻ "Thấy danh sách khách từ …" (ngoài khung, mốc mở còn ở tương lai — máy chủ chỉ gửi khi đó). */
export const cauThayKhach = (thayKhachTu: GioVnDto | undefined, homNay: string): string | null =>
  thayKhachTu ? `Bạn thấy tên khách và mã đơn từ ${gioNgan(thayKhachTu, homNay)}.` : null;

export interface LoiTuChoi {
  cau: string;
  /** `doc_lai` = tải lại chi tiết chuyến rồi vẽ lại; `ve_cuoc` = chuyến không còn của mình → về danh sách Cuốc; `giu` = giữ hộp, sửa rồi bấm lại. */
  hanhDong: "doc_lai" | "ve_cuoc" | "giu";
}
/** Lỗi của lệnh Từ chối → câu + việc màn làm (ánh xạ kế hoạch A4 T9: stale → dải đổi; quá hạn → trạng thái quá hạn; không còn chưa chạy → đọc lại). */
export function loiTuChoi(e: { status: number; code: string; message: string }): LoiTuChoi {
  if (e.status === 409 && e.code === "stale") return { cau: "Văn phòng vừa sửa chuyến này — đã tải lại, xem lại rồi quyết.", hanhDong: "doc_lai" };
  if (e.status === 409 && e.code === "refuse_deadline_passed") return { cau: "Đã quá hạn từ chối — không chạy được thì gọi văn phòng.", hanhDong: "doc_lai" };
  if (e.status === 409 && e.code === "trip_not_planned") return { cau: "Chuyến đã xuất bến, kết thúc hoặc bị huỷ — đã tải lại.", hanhDong: "doc_lai" };
  if (e.status === 404) return { cau: "Chuyến này không còn giao cho bạn.", hanhDong: "ve_cuoc" };
  return { cau: e.message, hanhDong: "giu" };
}

/** Giá trị ô `datetime-local` ("YYYY-MM-DDTHH:MM", giờ VN treo tường) ↔ `{ngay, gio}` của thân route. Sai khuôn → null. */
export function tuODatetime(v: string): GioVnDto | null {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/.exec(v);
  return m ? { ngay: m[1]!, gio: m[2]! } : null;
}
export const sangODatetime = (g: GioVnDto): string => `${g.ngay}T${g.gio}`;
