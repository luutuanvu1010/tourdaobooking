// DTO TÀI XẾ (ADR-0049 D3; kế hoạch mục 1.8; ruling R-P11, R-P17 — Task A15). Dựng MỚI TỪNG KHOÁ (khuôn `pool.ts` — không trải đối tượng nguồn): danh sách
// trắng. Họ tên + năm sinh khách, liên hệ (tên + SĐT người liên hệ của đơn) CHỈ trong ngày chạy — ngoài ngày chạy các khoá đó VẮNG MẶT. KHÔNG BAO GIỜ: tiền,
// dịch vụ khác, ghi chú đơn, người lập, người phụ trách, số giấy tờ, hạn GPLX, khoá so sánh nơi (`L:…` / `T:…`), id người bấm, SĐT người bấm.
import type { LienHeTaiXe } from "../orders";
import type { CuocChiTietResponse, CuocCuaToiItemDto, DieuKienConThieuDto, DiemChuyenDto, SuatChuyenDto } from "../../shared/contracts";
import type { LyDoGiu } from "../../shared/ly-do-giu";
import type { AllocRow, StopRow, TripRow, XeDieuPhoiRow } from "./chuyen-repo";
import { NHAN_TRANG_THAI_CHUYEN, gioVn, mocTienDo } from "./dieu-phoi-dto";
import type { EventRow } from "./chuyen-repo";

export const dieuKienConThieuDto = (l: LyDoGiu): DieuKienConThieuDto => ({ ma: l.ma, loiNhan: l.loiNhan, aiXuLy: l.aiXuLy });
const suKienCuoi = (events: readonly EventRow[], tripId: string, loai: readonly string[]): EventRow | undefined =>
  [...events].reverse().find((e) => e.trip_id === tripId && loai.includes(e.kind));

/** Route 19 — một chuyến của "Cuốc của tôi" (R-P17): mã, giờ xuất bến dự kiến, trạng thái, biển số, số khách, số điểm đón / trả, điều kiện còn thiếu. */
export function cuocCuaToiItem(t: TripRow, v: { xe: XeDieuPhoiRow | undefined; stops: readonly StopRow[]; allocs: readonly AllocRow[]; conThieu: readonly LyDoGiu[] }): CuocCuaToiItemDto {
  const diemCon = v.stops.filter((s) => s.trip_id === t.id && s.status !== "SKIPPED" && s.status !== "MOVED");
  return {
    id: t.id,
    ma: t.code,
    gioXuatBen: gioVn(t.planned_start_ms),
    trangThai: t.status,
    trangThaiNhan: NHAN_TRANG_THAI_CHUYEN[t.status],
    bienSo: v.xe?.plate_number ?? "",
    soKhach: v.allocs.filter((a) => a.trip_id === t.id && a.valid_to_at === null && a.kind === "PASSENGER").length,
    soDiemDon: diemCon.filter((s) => s.kind === "PICKUP").length,
    soDiemTra: diemCon.filter((s) => s.kind === "DROPOFF").length,
    dieuKienConThieu: v.conThieu.map(dieuKienConThieuDto),
  };
}

/**
 * Route 20 (và phản hồi lệnh tiến độ của tài xế). `diem` / `suat` lấy từ DTO văn phòng rồi CHỌN TỪNG KHOÁ (một chỗ tính giờ hẹn, mốc) — không trải. Trong ngày
 * chạy: `suat[].hoTen/namSinh` (khi có tên) + `lienHe` (khi route đọc — chỉ GET chi tiết). Ngoài ngày chạy: ba khoá đó vắng mặt.
 */
export function cuocChiTietDto(v: {
  trip: TripRow;
  xe: XeDieuPhoiRow | undefined;
  events: readonly EventRow[];
  diem: readonly DiemChuyenDto[];
  suat: readonly SuatChuyenDto[];
  lienHe: readonly LienHeTaiXe[] | null;
  conThieu: readonly LyDoGiu[];
  lyDo: readonly { code: string; label: string }[];
  nhan: ReadonlyMap<string, string> | null;
  trongNgay: boolean;
}): CuocChiTietResponse {
  const t = v.trip;
  const maDonCuaSuat = new Set(v.suat.flatMap((s) => (s.maDon ? [s.maDon] : [])));
  return {
    chuyen: {
      id: t.id,
      ma: t.code,
      bienSo: v.xe?.plate_number ?? "",
      soCho: v.xe?.passenger_capacity ?? 0,
      gioBatDau: gioVn(t.planned_start_ms),
      gioKetThuc: gioVn(t.planned_end_ms),
      trangThai: t.status,
      trangThaiNhan: NHAN_TRANG_THAI_CHUYEN[t.status],
      xuatBen: mocTienDo(suKienCuoi(v.events, t.id, ["DEPARTED"]), v.nhan),
      ketThucThat: mocTienDo(suKienCuoi(v.events, t.id, ["ENDED", "ENDED_INTERRUPTED"]), v.nhan),
    },
    diem: v.diem.map((d) => ({
      id: d.id, thuTu: d.thuTu, loai: d.loai, tenNoi: d.tenNoi, gioHen: d.gioHen, gioXeToi: d.gioXeToi, trangThai: d.trangThai, soNguoi: d.soNguoi, daToi: d.daToi,
    })),
    suat: v.suat.map((s) => ({
      id: s.id, maDon: s.maDon, diemLen: s.diemLen, diemXuong: s.diemXuong, trangThai: s.trangThai, daDon: s.daDon, daTra: s.daTra,
      ...(v.trongNgay && s.hoTen !== undefined && s.namSinh !== undefined ? { hoTen: s.hoTen, namSinh: s.namSinh } : {}),
    })),
    ...(v.trongNgay && v.lienHe !== null
      ? { lienHe: v.lienHe.filter((x) => maDonCuaSuat.has(x.orderCode)).map((x) => ({ maDon: x.orderCode, tenLienHe: x.tenLienHe, sdtLienHe: x.sdtLienHe })) }
      : {}),
    dieuKienConThieu: v.conThieu.map(dieuKienConThieuDto),
    lyDo: v.lyDo.map((r) => ({ code: r.code, nhan: r.label })),
    trongNgayChay: v.trongNgay,
  };
}
