// «Khách đặt cọc trước» (ADR-0159): luật THUẦN dùng chung máy chủ ↔ giao diện. Không I/O, không import src/modules/.
// Khi đơn còn nháp đây chỉ là LỜI KHAI: không vào sổ. Khi xác nhận, billing sinh khoản thu cùng lô; sau đó mọi nơi đọc từ sổ.

import type { BanChup } from "./hoa-hong-dong.ts";

/** Trần lời khai — bằng `MAX_SO_TIEN` của billing và CHECK của cột `orders.declared_deposit` (bài dat-coc-truoc.test.ts ghim ba nơi bằng nhau). */
export const TRAN_DAT_COC = 10_000_000_000;

export const NHAN_DAT_COC = "Khách đặt cọc trước";
export const NHAN_DAT_COC_CHO = "Khách đặt cọc trước (chờ xác nhận)";
export const NHAN_CON_PHAI_TRA = "Khách còn phải trả";

export const CAU_VUOT_TONG = "Số khách đặt cọc trước không được lớn hơn tổng tiền của đơn.";
/** Lúc người xét bấm Còn vé mà tổng đang thấp hơn lời khai: người xét không sửa được số khai, người lập phải sửa. */
export const CAU_VUOT_TONG_NGUOI_XET = "Số khách đặt cọc trước đang lớn hơn tổng tiền của đơn. Hãy trả đơn để người lập sửa số khai, rồi xác nhận lại.";
export const CAU_CHUA_GAN_HO_SO = "Tài khoản đối tác chưa gắn hồ sơ nên chưa khai được tiền đặt cọc — nhờ văn phòng.";
export const CAU_KHONG_PHAI_DOI_TAC = "Chỉ tài khoản Đối tác mới khai được tiền khách đặt cọc trước. Văn phòng ghi khoản thu sau khi đơn được xác nhận.";

/** Đầu vào của hàm dựng câu khoản thu (gốc lắp ráp tiêm từ billing — ADR-0024 đ4). `chup` = bản chụp mức của CHÍNH lô xác nhận: quyết vai BOOKER / STAFF. */
export interface VaoCauCoc {
  orderId: string;
  orderCode: string;
  nguoiLapId: string;
  nguoiBamId: string;
  soTien: number;
  chup: readonly BanChup[];
  homNay: string;
}
/** `cau` nhận mốc lô và id nhật ký `confirmed` của chính lô (lính gác). */
export type CauCocXacNhan =
  | { ok: true; cau: (i: { at: string; auditId: string }) => D1PreparedStatement[] }
  | { ok: false; status: 409 | 503; code: string; message: string };
/** Tiền cọc của đơn huỷ để lập lại còn đang giữ — chặn khai lại (ADR-0089 đ7; Tự quyết của ADR-0159 Hệ quả). */
export type ChanKhaiLai = { status: 409 | 503; code: string; message: string } | null;

export type DocLoiKhai = { ok: true; value: number | null } | { ok: false; message: string };

/** Đọc số khai từ thân đơn. Thân không có khoá này (máy còn bản giao diện cũ) ⇒ `null`: giữ số đang lưu, không xoá mất lời khai. */
export function docLoiKhai(raw: unknown): DocLoiKhai {
  if (raw === undefined || raw === null) return { ok: true, value: null };
  if (typeof raw !== "number" || !Number.isInteger(raw) || raw < 0) return { ok: false, message: "Tiền khách đặt cọc trước phải là số nguyên, không âm (đồng)." };
  if (raw > TRAN_DAT_COC) return { ok: false, message: "Tiền khách đặt cọc trước vượt giới hạn." };
  return { ok: true, value: raw };
}

export const vuotTong = (loiKhai: number, tong: number): boolean => loiKhai > tong;

/** Số xem trước ở màn lập đơn; máy chủ tính lại khi lưu. Lời khai vượt tổng thì không hiện số âm (máy chủ sẽ từ chối khi lưu). */
export const conPhaiTra = (tong: number, loiKhai: number): number => Math.max(0, tong - loiKhai);
