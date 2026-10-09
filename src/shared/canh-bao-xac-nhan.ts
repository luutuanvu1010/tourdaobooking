// Cảnh báo sớm LÚC XÁC NHẬN đơn (lời chủ 1/10 "2 — Có": chỉ cảnh báo, KHÔNG chặn; kế hoạch 2026-10-01-giao-dien-dua-don-hanh-khach.md). Luật THUẦN cho giao
// diện. Hai điều kiện gọi CHÍNH hai hàm của cổng xuất bến / cảnh báo lúc xếp (src/shared/dieu-phoi-kiem.ts — một luật, không viết lại):
//   (a) `lyDoNoiTra`: chặng mở chưa có nơi trả (không điểm danh mục, không chữ tự do) ⇔ `coNoiTra` false ⇔ `dropoffLabel === null` của LegDto;
//   (b) `lyDoThieuTen` / `soTenThieu`: số hành khách có tên < số người phải chở của chặng (`soNguoiChang` — MỘT luật số người chặng).
// Khác cổng xuất bến ở một chỗ có chủ đích: trang đơn KHÔNG biết cờ `requireManifest` của chính sách điều phối (route chính sách chỉ văn phòng đọc) → luôn
// coi là bật (chỉ là lời nhắc; xuất bến vẫn theo chính sách thật). Máy chủ KHÔNG đổi `confirmGaps` (xác nhận vẫn thành công).
//   (c) C12 (đánh giá ERP 7/10, việc 11 — C4): KHÔNG thuộc cổng xuất bến — lời nhắc phía bán hàng. Cờ "Xe riêng" không mang tiền (ADR-0056 §3, ADR-0047 A1
//       "chặng không mang tiền") nên khi có chặng bật Xe riêng mà CẢ ĐƠN không có dịch vụ đơn vị giá theo nhóm (`parseUnit(unit).kind === "group"`, chip
//       "Giá theo nhóm"), nhắc người xác nhận kiểm lại tiền xe. Xét theo ĐƠN, không theo dịch vụ: xe riêng hay được bán thành một dịch vụ giá theo nhóm riêng.
//       Chỉ cảnh báo, không chặn, không gắn tiền vào chặng. Dòng nhập tay (`manual`) tính tiền xe vẫn bị nhắc (không biết dòng đó là tiền xe).
import type { OrderServiceDto } from "./contracts.ts";
import { lyDoNoiTra, lyDoThieuTen, soTenThieu } from "./dieu-phoi-kiem.ts";
import { parseUnit } from "./order-lines.ts";
import { soNguoiChang, tongKhach } from "./so-nguoi-chang.ts";

export const CAU_CAN_NOI_TRA = "Cần nơi trả trước khi xếp xe";
export const CAU_XE_RIENG_CHUA_GIA_NHOM = "Có chặng Xe riêng nhưng đơn chưa có dịch vụ Giá theo nhóm — kiểm lại tiền xe";
export const cauThieuTen = (n: number): string => `Còn ${n} khách chưa có tên — cần đủ trước khi xe chạy`;

/** Chặng mở chưa có nơi trả — qua `lyDoNoiTra` (nhãn nơi trả null = không điểm, không chữ). */
export const thieuNoiTra = (l: { dropoffLabel: string | null }): boolean => lyDoNoiTra({ coNoiTra: l.dropoffLabel !== null, orderCode: "" }) !== null;

/** C12: có chặng bật Xe riêng mà không dịch vụ nào của đơn tính giá theo nhóm (perNPax). */
export const xeRiengChuaGiaNhom = (services: readonly Pick<OrderServiceDto, "legs" | "unit">[]): boolean =>
  services.some((s) => s.legs.some((l) => l.exclusiveVehicle)) && !services.some((s) => parseUnit(s.unit).kind === "group");

/**
 * Câu cảnh báo khi xác nhận (thứ tự: nơi trả, tên, xe riêng). `nguoiCuaDon` = khoá người của danh sách hành khách hiện hành (`GET /passengers`); null = không biết (lỗi tải) → bỏ cảnh báo
 * tên (không nói "thiếu" khi không biết). Đơn không chặng → không cảnh báo tên (không có xe chạy). Rỗng = không cảnh báo.
 */
export function canhBaoXacNhan(services: readonly Pick<OrderServiceDto, "pax" | "legs" | "unit">[], nguoiCuaDon: readonly string[] | null): string[] {
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
  if (xeRiengChuaGiaNhom(services)) out.push(CAU_XE_RIENG_CHUA_GIA_NHOM);
  return out;
}
