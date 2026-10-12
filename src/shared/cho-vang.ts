// C59 (đánh giá ERP 7/10): đồng hồ chờ ở điểm đón đã tới — "Đã chờ N phút" để tài xế tự quyết bấm Vắng. CHỈ HIỂN THỊ: không ngưỡng, không khoá nút (chưa có luật
// nào về thời gian chờ). Giờ tới trong DTO tài xế chỉ có "HH:MM" nên đếm theo phút. Hàm thuần.
import type { GioVnDto } from "./contracts.ts";
import { vnLocalToMs } from "./vn-date.ts";

const PHUT = 60_000;

/** Giờ tới (ngày + "HH:MM", giờ VN) → mili-giây; thiếu / sai khuôn → null. */
export function daToiMs(g: GioVnDto | null | undefined): number | null {
  return g ? vnLocalToMs(g.ngay, g.gio) : null;
}

/** Số phút đã qua từ phút tới tới phút hiện tại (cắt giây cả hai đầu); đồng hồ máy chậm hơn giờ tới → 0. */
export function phutDaCho(daToi: number, bayGio: number): number {
  return Math.max(0, Math.floor(bayGio / PHUT) - Math.floor(daToi / PHUT));
}

/** "Vừa tới" (dưới 1 phút) / "Đã chờ 7 phút" / "Đã chờ 1 giờ" / "Đã chờ 1 giờ 5 phút". */
export function cauChoVang(daToi: number, bayGio: number): string {
  const p = phutDaCho(daToi, bayGio);
  if (p < 1) return "Vừa tới";
  if (p < 60) return `Đã chờ ${p} phút`;
  const gio = Math.floor(p / 60);
  const le = p % 60;
  return le === 0 ? `Đã chờ ${gio} giờ` : `Đã chờ ${gio} giờ ${le} phút`;
}
