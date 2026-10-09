// LUẬT THUẦN khung bận (ADR-0055 VK2-A; hình dùng chung ADR-0053 D9) — một nguồn cho máy chủ và màn hình. Không I/O, không import module; import kèm đuôi .ts.
// - Khoảng NỬA MỞ [bắt đầu, kết thúc). Chuyến vướng khung so với giờ kết thúc DỰ KIẾN — khớp trigger vc_unavailability_overlaps_trip (K8).
// - "Ngày" là ngày dân sự giờ VN: [00:00 VN ngày, 00:00 VN ngày + 1) — không bao giờ nửa đêm UTC (Review Focus 1).
import type { KhungChuyen } from "./dieu-phoi-kieu.ts";
import { addDays, msToVnLocal, ngayNgan, vnLocalToMs } from "./vn-date.ts";

export const chongNuaMo = (a0: number, a1: number, b0: number, b1: number): boolean => a0 < b1 && b0 < a1;
const ngan = (ms: number, thamChieu: string): string => {
  const { date, time } = msToVnLocal(ms);
  return `${time} ${ngayNgan(date, thamChieu)}`;
};
/** "từ 08:00 03/10 đến 17:00 03/10" (giờ VN) — câu chặn khung bận tài xế (kế hoạch A4 G-A4-9). */
export const nhanTuDen = (batDauMs: number, ketThucMs: number): string => {
  const ref = msToVnLocal(batDauMs).date;
  return `từ ${ngan(batDauMs, ref)} đến ${ngan(ketThucMs, ref)}`;
};
/** "08:00 03/10 → 17:00 03/10" (giờ VN); năm khi khác năm của giờ bắt đầu (Kiểu D — `ngayNgan`). */
export const nhanKhoangGio = (batDauMs: number, ketThucMs: number): string => {
  const ref = msToVnLocal(batDauMs).date;
  return `${ngan(batDauMs, ref)} → ${ngan(ketThucMs, ref)}`;
};
/** Chuyến PLANNED/RUNNING cùng xe chồng khung (nửa mở, so với giờ kết thúc dự kiến — khớp trigger). */
export function chuyenVuongKhung(k: { xeId: string; batDauMs: number; ketThucMs: number }, chuyen: readonly KhungChuyen[]): KhungChuyen[] {
  return chuyen.filter((c) => c.xeId === k.xeId && (c.trangThai === "PLANNED" || c.trangThai === "RUNNING") && chongNuaMo(c.batDauMs, c.ketThucMs, k.batDauMs, k.ketThucMs));
}
/** Khung giao [00:00 VN ngày, 00:00 VN ngày + 1). */
export function khungTrongNgay<T extends { batDauMs: number; ketThucMs: number }>(ds: readonly T[], ngay: string): T[] {
  const tu = vnLocalToMs(ngay, "00:00");
  const den = vnLocalToMs(addDays(ngay, 1), "00:00");
  if (tu === null || den === null) return [];
  return ds.filter((k) => chongNuaMo(k.batDauMs, k.ketThucMs, tu, den));
}
