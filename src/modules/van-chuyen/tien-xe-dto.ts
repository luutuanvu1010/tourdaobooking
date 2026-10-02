// DTO TIỀN XE THUÊ (ADR-0057 T1 B5, T2 C9 — kế hoạch Đợt 4 Task 4, 10). Chỉ dựng hình từ dòng đã đọc; tổng tiền chỉ qua tien-xe.ts (`tongChiPhiChuyen`,
// `tongBangKe`). Giao diện hiển thị số máy chủ trả, KHÔNG cộng (bản vẽ Đợt 4).
import type { BangGiaDto, CoXeDto, TuyenDto } from "../../shared/contracts";
import type { RateRow, RouteRow, SizeRow } from "./tien-xe-repo";

/** Nhãn trạng thái dòng giá theo ngày xem (hai đầu tính cả — TC-12). */
export const trangThaiGia = (r: { valid_from_date: string; valid_to_date: string | null }, ngay: string): BangGiaDto["trangThai"] =>
  r.valid_to_date !== null && r.valid_to_date < ngay ? "DA_KET_THUC" : r.valid_from_date > ngay ? "SAP_AP" : "DANG_AP";

export const tuyenDto = (r: RouteRow): TuyenDto => ({ ma: r.code, ten: r.name, dangDung: r.active === 1, thuTu: r.sort_order });
export const coXeDto = (r: SizeRow, xemGia: boolean): CoXeDto => ({
  ma: r.code, nhan: r.label, tuSoKhach: r.min_passengers, denSoKhach: r.max_passengers, dangDung: r.active === 1, soDongGiaDangAp: xemGia ? r.so_dong_gia_dang_ap : null,
});
export function bangGiaDto(r: RateRow, ngay: string, tuyen: ReadonlyMap<string, RouteRow>, coXe: ReadonlyMap<string, SizeRow>): BangGiaDto {
  const t = r.route_code === null ? null : tuyen.get(r.route_code);
  const c = r.vehicle_size_code === null ? null : coXe.get(r.vehicle_size_code);
  return {
    id: r.id, nhaXePartyId: r.carrier_party_id,
    tuyen: r.route_code === null ? null : { ma: r.route_code, ten: t?.name ?? r.route_code },
    coXe: r.vehicle_size_code === null ? null : { ma: r.vehicle_size_code, nhan: c?.label ?? r.vehicle_size_code },
    soTien: r.amount, tuNgay: r.valid_from_date, denNgay: r.valid_to_date, ghiChu: r.note, thayDongId: r.replaces_id, trangThai: trangThaiGia(r, ngay),
  };
}
