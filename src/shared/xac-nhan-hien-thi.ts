// Chữ hiển thị của bước xác nhận đơn (ADR-0136, Task 3.5) — thuần, dùng ở giao diện. Hạn do MÁY CHỦ gửi (`hanXacNhan`, bỏ 22:00–06:00); ở đây chỉ đổi ra chữ, KHÔNG tính lại hạn.
import type { LyDoCanXacNhan } from "./contracts.ts";
import { vnDateTimeText } from "./vn-date.ts";

/** Nhãn nút (ADR-0136 Đ3, Đ13). «Gửi đơn» là chữ chủ đã duyệt; hai nhãn còn lại lấy từ kế hoạch Task 3.5. */
export const NHAN_NUT_XAC_NHAN = { send: "Gửi xác nhận", withdraw: "Rút lại", submit: "Gửi đơn" } as const;

/** Nhãn trên thẻ ở danh sách chờ (kế hoạch Task 3.3: «Cần Quản trị đặt gấp» khi đơn vào bước chỉ vì chặng dưới mốc và người xem không giữ ô đặt gấp). */
export const NHAN_CAN_DAT_GAP = "Cần Quản trị đặt gấp";
export const NHAN_QUA_HAN = "Quá hạn";

/** Ba kết quả của người xét duyệt (mã → chữ). */
export const NHAN_KET_QUA = { CON_VE: "Còn vé", HET_VE: "Hết vé", HUY: "Huỷ" } as const;

/** Người xét duyệt không sửa được tiền khi đơn đang chờ (chạy tạm Hướng 2 — Task 3.3b hoãn). Chữ này chờ chủ duyệt nhãn. */
export const CAU_TIEN_KHOA_KHI_CHO = "Đơn đang chờ nên tiền chỉ để xem. Muốn đổi tiền, hãy chọn Huỷ để người lập đơn tạo lại.";

const NHAN_VI: Record<LyDoCanXacNhan, string> = {
  DICH_VU: "Có dịch vụ cần xác nhận còn vé.",
  DAT_GAP: "Có lượt đón dưới hạn chốt, cần Quản trị đặt gấp.",
};
export const nhanLyDoCanXacNhan = (vi: readonly LyDoCanXacNhan[]): string => vi.map((v) => NHAN_VI[v]).join(" ");

/**
 * Dải «Chờ xác nhận · …» ở trang đơn. `hanLuc` do máy chủ gửi. Còn không quá 60 phút → «còn N phút» (làm tròn lên); xa hơn (gửi ban đêm, hạn rơi vào sáng hôm sau) → nói giờ hạn
 * theo giờ Việt Nam để khỏi hiện «còn 500 phút». Sau hạn → «Quá hạn» (chỉ cảnh báo — không tự huỷ, Đ9).
 */
export function dongChoXacNhan(i: { hanLuc: string; nowMs: number }): { text: string; quaHan: boolean } {
  const han = Date.parse(i.hanLuc);
  if (i.nowMs > han) return { text: "Chờ xác nhận · Quá hạn", quaHan: true };
  const phut = Math.ceil((han - i.nowMs) / 60_000);
  return { text: phut <= 60 ? `Chờ xác nhận · còn ${phut} phút` : `Chờ xác nhận · hạn ${vnDateTimeText(i.hanLuc)}`, quaHan: false };
}

/** Câu báo ở trang nháp khi ĐÃ lưu mà Gửi đơn thất bại (Review Focus 14): không để người dùng tưởng đơn mất, và không bấm lại tạo nháp trùng. */
export const cauLoiGuiDon = (loiMayChu: string): string =>
  loiMayChu ? `Đơn đã được lưu nháp nhưng chưa gửi được: ${loiMayChu}` : "Đơn đã được lưu nháp nhưng chưa gửi được. Hãy mở đơn và bấm Gửi đơn lại.";
