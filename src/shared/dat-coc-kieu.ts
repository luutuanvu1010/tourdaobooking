// Kiểu của hàm tiêm «Khách đặt cọc trước» (ADR-0159): tệp riêng vì nhắc kiểu D1 của Worker; giao diện chỉ import `dat-coc-truoc.ts`.
import type { BanChup } from "./hoa-hong-dong.ts";

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
