// DTO TIỀN XE THUÊ (ADR-0057 T1 B5, T2 C9 — kế hoạch Đợt 4 Task 4, 10). Chỉ dựng hình từ dòng đã đọc; tổng tiền chỉ qua tien-xe.ts (`tongChiPhiChuyen`,
// `tongBangKe`). Giao diện hiển thị số máy chủ trả, KHÔNG cộng (bản vẽ Đợt 4).
import type { BangGiaDto, BangKeDongDto, BangKeNhomDto, BangKeResponse, ChiPhiChuyenDto, CoXeDto, DongChiPhiDto, NhomBangKeDto, TuyenDto } from "../../shared/contracts";
import { laLyDoHeThong } from "../../shared/dieu-phoi-kieu";
import type { TripRow } from "./chuyen-repo";
import {
  LY_DO_DAO_DOI_CHUYEN, daoDuoc, demDieuChinh, loaiNguonGia, nhomBangKe, tongBangKe, tongChiPhiChuyen, tongDieuChinh, type DongChiPhi,
} from "./tien-xe";
import { dongCua } from "./tien-xe-lo";
import type { BangKeTripRow, CostLineRow, RateRow, RouteRow, SizeRow } from "./tien-xe-repo";

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

// ---- Chi phí chuyến (ADR-0057 C9) ---------------------------------------------------------------------------------------------------------------------------
/** Lý do chọn được khi điều chỉnh / đảo: nhóm chi phí xe, đang dùng, không mã hệ thống, không "Giá thoả thuận trước" (chỉ cho giá thoả thuận). */
export const lyDoChonDuoc = (reasons: readonly { code: string; label: string; active: number }[]): { ma: string; nhan: string }[] =>
  reasons.filter((r) => r.active === 1 && !laLyDoHeThong(r.code) && r.code !== "CPX_GIA_THOA_THUAN").map((r) => ({ ma: r.code, nhan: r.label }));

/**
 * DTO chi phí một chuyến — tổng qua `tongChiPhiChuyen`; cờ dòng (đã đảo, đảo do đổi chuyến, đảo được, tự động) do máy chủ áp luật. `nhan` = nhãn người ghi (hàm
 * tiêm của gốc lắp ráp — null thì để trống). Dòng TỰ ĐỘNG (chụp / đảo trong lô lệnh chuyến) có `cmd_id` ≠ `id` (lệnh của Kế toán dùng id dòng làm dấu).
 */
export function chiPhiChuyenDto(v: {
  trip: TripRow; rows: readonly CostLineRow[]; reasons: readonly { code: string; label: string; active: number }[]; nhan: ReadonlyMap<string, string> | null;
  nhaXe: { partyId: string; ten: string } | null; tuyen: { ma: string; ten: string } | null; nhaXeDangHopTac: boolean;
}): ChiPhiChuyenDto {
  const dong: DongChiPhi[] = v.rows.map(dongCua);
  const nhanLyDo = new Map(v.reasons.map((r) => [r.code, r.label]));
  const daoBoi = new Map(dong.filter((d) => d.kind === "REVERSAL").map((d) => [d.reversesId, d]));
  const nguonGia = loaiNguonGia(dong);
  const chuaCoGia = v.trip.status === "PLANNED" && v.trip.rented === 1 && nguonGia === null;
  const dongDto: DongChiPhiDto[] = v.rows.map((r, i) => {
    const d = dong[i]!;
    const tuDong = r.cmd_id !== r.id;
    return {
      id: r.id, loai: r.kind, soTien: r.amount, lyDo: r.reason_code ? { ma: r.reason_code, nhan: nhanLyDo.get(r.reason_code) ?? r.reason_code } : null, ghiChu: r.note,
      ngay: r.occurred_date, daDao: daoBoi.has(r.id), daoDoDoiChuyen: daoBoi.get(r.id)?.reasonCode === LY_DO_DAO_DOI_CHUYEN,
      daoDuoc: daoDuoc(dong, d, v.trip.status), tuDong, nguoi: tuDong || r.created_by === null ? null : (v.nhan?.get(r.created_by) ?? null), luc: r.created_at,
    };
  });
  return {
    tripId: v.trip.id, ma: v.trip.code, trangThai: v.trip.status, thue: v.trip.rented === 1, nhaXe: v.nhaXe, tuyen: v.tuyen, nguonGia,
    tong: tongChiPhiChuyen(dong),
    phienBanChiPhi: v.rows.length, coTheNhapThoaThuan: chuaCoGia && v.nhaXeDangHopTac, coTheChupLai: chuaCoGia && v.nhaXeDangHopTac, dong: dongDto,
    lyDoChon: lyDoChonDuoc(v.reasons),
  };
}

// ---- Bảng kê (ADR-0057 C9; đánh giá bản vẽ §4 mục 9). Mọi tổng / đếm do máy chủ tính — web KHÔNG cộng, không đếm. --------------------------------------
export function bangKeDto(v: {
  tu: string; den: string; nhaXePartyId: string | null; nhom: NhomBangKeDto | null; trips: readonly BangKeTripRow[]; lines: readonly CostLineRow[];
  tenTuyen: ReadonlyMap<string, string>;
}): BangKeResponse {
  const theoChuyen = new Map<string, DongChiPhi[]>();
  for (const r of v.lines) {
    const ds = theoChuyen.get(r.trip_id) ?? [];
    ds.push(dongCua(r));
    theoChuyen.set(r.trip_id, ds);
  }
  const dongTatCa: (BangKeDongDto & { nhaXe: { partyId: string; ten: string } })[] = [];
  for (const t of v.trips) {
    const dong = theoChuyen.get(t.id) ?? [];
    const nguonGia = loaiNguonGia(dong);
    const nhomTrangThai = nhomBangKe(t.status, t.rented === 1, nguonGia !== null);
    if (v.nhom !== null && nhomTrangThai !== v.nhom) continue;
    const dem = demDieuChinh(dong);
    dongTatCa.push({
      tripId: t.id, ma: t.code, ngayChay: t.service_date, bienSo: t.plate_number, tuyen: t.route_code ? { ma: t.route_code, ten: v.tenTuyen.get(t.route_code) ?? t.route_code } : null,
      trangThai: t.status, nhomTrangThai, nguonGia,
      tong: tongChiPhiChuyen(dong),
      tongDieuChinh: tongDieuChinh(dong),
      soDieuChinh: dem.soDieuChinh, soDieuChinhBiDao: dem.soDieuChinhBiDao,
      nhaXe: { partyId: t.carrier_party_id, ten: t.carrier_name ?? "" },
    });
  }
  const nhom: BangKeNhomDto[] = [];
  for (const d of dongTatCa) {
    let g = nhom.find((x) => x.nhaXe.partyId === d.nhaXe.partyId);
    if (!g) {
      g = { nhaXe: d.nhaXe, soChuyen: 0, tongNhom: tongBangKe([]), dong: [] };
      nhom.push(g);
    }
    const { nhaXe: _bo, ...dongDto } = d;
    void _bo;
    g.dong.push(dongDto);
  }
  for (const g of nhom) {
    g.soChuyen = g.dong.length;
    g.tongNhom = tongBangKe(g.dong);
  }
  return {
    tu: v.tu, den: v.den, nhaXePartyId: v.nhaXePartyId, trangThai: v.nhom,
    tongCong: tongBangKe(dongTatCa),
    soChuyen: dongTatCa.length, soNhaXe: nhom.length, soThieuGia: dongTatCa.filter((d) => d.nhomTrangThai === "THIEU_GIA").length, nhom,
  };
}
