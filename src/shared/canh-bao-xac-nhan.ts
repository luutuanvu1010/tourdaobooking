// Cảnh báo sớm LÚC XÁC NHẬN đơn (lời chủ 1/10 "2 — Có": chỉ cảnh báo, KHÔNG chặn; kế hoạch 2026-10-01-giao-dien-dua-don-hanh-khach.md). Luật THUẦN cho giao
// diện. Hai điều kiện gọi CHÍNH hai hàm của cổng xuất bến / cảnh báo lúc xếp (src/shared/dieu-phoi-kiem.ts — một luật, không viết lại):
//   (a) `lyDoNoiTra`: chặng mở chưa có nơi trả (không điểm danh mục, không chữ tự do) ⇔ `coNoiTra` false ⇔ `dropoffLabel === null` của LegDto;
//   (b) `lyDoThieuTen` / `soTenThieu`: số hành khách có tên < số người phải chở của chặng (`soNguoiChang` — MỘT luật số người chặng).
// Khác cổng xuất bến ở một chỗ có chủ đích: trang đơn KHÔNG biết cờ `requireManifest` của chính sách điều phối (route chính sách chỉ văn phòng đọc) → luôn
// coi là bật (chỉ là lời nhắc; xuất bến vẫn theo chính sách thật). Máy chủ KHÔNG đổi `confirmGaps` (xác nhận vẫn thành công).
import type { OrderServiceDto } from "./contracts.ts";
import { lyDoNoiTra, lyDoThieuTen, soTenThieu } from "./dieu-phoi-kiem.ts";
import { soNguoiChang, tongKhach } from "./so-nguoi-chang.ts";

export const CAU_CAN_NOI_TRA = "Cần nơi trả trước khi xếp xe";
export const cauThieuTen = (n: number): string => `Còn ${n} khách chưa có tên — cần đủ trước khi xe chạy`;

/** Chặng mở chưa có nơi trả — qua `lyDoNoiTra` (nhãn nơi trả null = không điểm, không chữ). */
export const thieuNoiTra = (l: { dropoffLabel: string | null }): boolean => lyDoNoiTra({ coNoiTra: l.dropoffLabel !== null, orderCode: "" }) !== null;

/**
 * Câu cảnh báo khi xác nhận. `nguoiCuaDon` = khoá người của danh sách hành khách hiện hành (`GET /passengers`); null = không biết (lỗi tải) → bỏ cảnh báo
 * tên (không nói "thiếu" khi không biết). Đơn không chặng → không cảnh báo tên (không có xe chạy). Rỗng = không cảnh báo.
 */
export function canhBaoXacNhan(services: readonly Pick<OrderServiceDto, "pax" | "legs">[], nguoiCuaDon: readonly string[] | null): string[] {
  const out: string[] = [];
  if (services.some((s) => s.legs.some(thieuNoiTra))) out.push(CAU_CAN_NOI_TRA);
  if (nguoiCuaDon !== null) {
    let thieu = 0;
    for (const s of services) {
      for (const l of s.legs) {
        const ch = { orderCode: "", soNguoi: soNguoiChang(l, tongKhach(s.pax)), nguoiCuaDon: [...nguoiCuaDon] };
        if (lyDoThieuTen(ch, true) !== null) thieu = Math.max(thieu, soTenThieu(ch));
      }
    }
    if (thieu > 0) out.push(cauThieuTen(thieu));
  }
  return out;
}
