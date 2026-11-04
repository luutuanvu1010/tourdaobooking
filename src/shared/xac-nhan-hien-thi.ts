// Chữ hiển thị của bước xác nhận đơn (ADR-0136, Task 3.5) — thuần, dùng ở giao diện. Hạn do MÁY CHỦ gửi (`hanXacNhan`, bỏ 22:00–06:00); ở đây chỉ đổi ra chữ, KHÔNG tính lại hạn.
import { CHIEU_LABEL, changDauCuaDichVu } from "./chang-dua-don.ts";
import type { LegDto, LyDoCanXacNhan, OrderServiceDto } from "./contracts.ts";
import { vnDateTimeText } from "./vn-date.ts";

/** Nhãn nút (ADR-0136 Đ3, Đ13). «Gửi đơn» là chữ chủ đã duyệt; hai nhãn còn lại lấy từ kế hoạch Task 3.5. */
export const NHAN_NUT_XAC_NHAN = { send: "Gửi kiểm vé", withdraw: "Rút lại", submit: "Gửi đơn" } as const;

/** Nhãn trên thẻ ở danh sách chờ (kế hoạch Task 3.3: «Cần Quản trị đặt gấp» khi đơn vào bước chỉ vì chặng dưới mốc và người xem không giữ ô đặt gấp). */
export const NHAN_CAN_DAT_GAP = "Cần Quản trị đặt gấp";
export const NHAN_QUA_HAN = "Quá hạn";

/** Ba kết quả của người xét duyệt (mã → chữ). */
export const NHAN_KET_QUA = { CON_VE: "Còn vé, xác nhận đơn", HET_VE: "Hết vé", HUY: "Huỷ" } as const;

/**
 * Hộp hỏi lại trước khi bấm «Còn vé, xác nhận đơn» (ADR-0166 câu 4): nút này chốt đơn ngay, không hoàn tác được. Năm hậu quả phải nói đủ:
 * giá bị khoá, hoa hồng được chụp, vé được cấp, tiền cọc khách khai thành khoản thu, không hoàn tác.
 */
export const HOI_CON_VE = {
  tieuDe: "Còn vé, xác nhận đơn?",
  hauQua:
    "Bấm là chốt đơn ngay và không hoàn tác được. Giá của đơn bị khoá, hoa hồng được chụp lại theo mức lúc này, vé được cấp cho đơn, và tiền cọc khách đã khai (nếu có) thành khoản thu trong sổ.",
  nhanNguyHiem: "Xác nhận đơn",
  nhanGiu: "Xem lại",
} as const;

/** Người xét duyệt không sửa được tiền khi đơn đang chờ (chạy tạm Hướng 2 — Task 3.3b hoãn). Chữ này chờ chủ duyệt nhãn. */
export const CAU_TIEN_KHOA_KHI_CHO = "Đơn đang chờ nên tiền chỉ để xem. Muốn đổi tiền, hãy chọn Huỷ để người lập đơn tạo lại.";

const NHAN_VI: Record<LyDoCanXacNhan, string> = {
  DICH_VU: "Có dịch vụ cần xác nhận còn vé.",
  DAT_GAP: "Có lượt đón dưới hạn chốt, cần Quản trị đặt gấp.",
  CHOT_GIO: "Có lượt đưa đón chưa có giờ đón, văn phòng cần ghi giờ.",
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

// ---- Bảng Còn vé: giờ đón theo từng lượt (ADR-0154 Đ1.3, Đ1.4) ----
/** Báo tại chỗ khi lượt bắt buộc chưa có giờ (không gọi máy chủ). */
export const CAU_THIEU_GIO_LUOT = "Chọn giờ đón cho lượt này.";
/** Người xét KHÔNG có ô `order.leg.short_notice` (Kế toán, HDV nội bộ) chọn giờ dưới hạn chốt: nhờ người có ô bấm Còn vé kèm đặt gấp (máy chủ vẫn trả 409 như hôm nay). */
export const CAU_NHO_DAT_GAP = "Giờ này đã qua hạn chốt. Nhờ Bán hàng hoặc Quản trị bấm Còn vé, xác nhận đơn kèm đặt gấp.";
/** Nhãn ô giờ của một lượt: «Giờ đón · Chiều đi · <tên dịch vụ> (bắt buộc)». */
export const nhanGioLuot = (chieu: string, tenDichVu: string, batBuoc: boolean): string => `Giờ đón · ${chieu} · ${tenDichVu}${batBuoc ? " (bắt buộc)" : ""}`;
/** Nhãn ghi chú dịch vụ, đứng trên khối giờ của dịch vụ đó. */
export const nhanGhiChuDichVu = (tenDichVu: string): string => `Ghi chú · ${tenDichVu}`;

export interface LuotGioConVe { leg: LegDto; batBuoc: boolean; nhanChieu: string }
export interface DongGioConVe { serviceId: string; ghiChu: string | null; luot: LuotGioConVe[] }

/**
 * Khối giờ của bảng Còn vé, mỗi dịch vụ MỘT khối: ghi chú dịch vụ (người lập đối tác ghi giờ đón mong muốn vào đây) + MỌI lượt còn mở (có giờ hay chưa — người xét sửa được). `batBuoc` CHỈ khi yêu cầu mang cờ
 * «cần chốt giờ» (`viCoChotGio`) VÀ lượt là LƯỢT ĐẦU của dịch vụ theo `changDauCuaDichVu` (một hàm với máy chủ — chiều đi trước chiều về, rồi ngày, giờ) VÀ lượt chưa có giờ; máy chủ cũng chỉ từ chối
 * (409 `pickup_time_required`) đúng ca đó. Dịch vụ không lượt (Không đón) và không ghi chú thì không có khối. `legs` = chặng còn hiệu lực, giữ thứ tự máy chủ trả.
 */
export function dongGioConVe(services: readonly Pick<OrderServiceDto, "id" | "name" | "note" | "legs">[], viCoChotGio: boolean): DongGioConVe[] {
  return services.flatMap((s) => {
    const ghiChu = s.note !== null && s.note.trim() !== "" ? s.note : null;
    if (s.legs.length === 0 && ghiChu === null) return [];
    const dau = viCoChotGio ? changDauCuaDichVu(s.legs) : null;
    return [{
      serviceId: s.id,
      ghiChu,
      luot: s.legs.map((leg) => ({ leg, batBuoc: dau !== null && leg.id === dau.id && leg.pickupTime === null, nhanChieu: CHIEU_LABEL[leg.direction] })),
    }];
  });
}
