// Cảnh báo sớm LÚC XÁC NHẬN đơn (lời chủ 1/10 "2 — Có": chỉ cảnh báo, KHÔNG chặn; kế hoạch 2026-10-01-giao-dien-dua-don-hanh-khach.md). Luật THUẦN, một
// nguồn cho giao diện. Hai điều kiện CÙNG NGHĨA cổng xuất bến (`kiemXuatBen`, src/shared/dieu-phoi-kiem.ts) — không viết luật thứ hai:
//   (a) chặng mở chưa có nơi trả (không điểm danh mục, không chữ tự do) ⇔ `coNoiTra` false ⇔ `dropoffLabel === null` của LegDto;
//   (b) số người có tên < số người phải chở của chặng (`soNguoiChang` — MỘT luật số người chặng) ⇔ THIEU_TEN.
// Máy chủ KHÔNG đổi `confirmGaps` (xác nhận vẫn thành công).
import type { LegDto, OrderServiceDto } from "./contracts.ts";
import { soNguoiChang, tongKhach } from "./so-nguoi-chang.ts";

export const CAU_CAN_NOI_TRA = "Cần nơi trả trước khi xếp xe";
export const cauThieuTen = (n: number): string => `Còn ${n} khách chưa có tên — cần đủ trước khi xe chạy`;

/** Chặng mở chưa có nơi trả (nhãn nơi trả null = không điểm, không chữ). */
export const thieuNoiTra = (l: Pick<LegDto, "dropoffLabel">): boolean => l.dropoffLabel === null;

/**
 * Câu cảnh báo khi xác nhận. `soNguoiCoTen` = số người hiện hành của danh sách hành khách (`GET /passengers`); null = không biết (lỗi tải) → bỏ cảnh báo tên
 * (không nói "thiếu" khi không biết). Đơn không chặng → không cảnh báo tên (không có xe chạy). Rỗng = không cảnh báo.
 */
export function canhBaoXacNhan(services: readonly Pick<OrderServiceDto, "pax" | "legs">[], soNguoiCoTen: number | null): string[] {
  const out: string[] = [];
  if (services.some((s) => s.legs.some(thieuNoiTra))) out.push(CAU_CAN_NOI_TRA);
  if (soNguoiCoTen !== null) {
    let canNhieuNhat = 0;
    for (const s of services) for (const l of s.legs) canNhieuNhat = Math.max(canNhieuNhat, soNguoiChang(l, tongKhach(s.pax)));
    const thieu = canNhieuNhat - soNguoiCoTen;
    if (thieu > 0) out.push(cauThieuTen(thieu));
  }
  return out;
}
