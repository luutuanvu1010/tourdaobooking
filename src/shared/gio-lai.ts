// LUẬT THUẦN giờ lái (ADR-0055 VK2-B) — CHỈ CẢNH BÁO: không vào kiemXuatBen, không chặn, không MA_GIU. MỘT nguồn cho lệnh tạo/sửa chuyến và lịch chung.
// - Ngày chạy của chuyến = ngày VN của giờ bắt đầu dự kiến (= vc_trip.service_date, CHECK của 0042) — chuyến qua nửa đêm tính trọn cho ngày bắt đầu.
// - Thời lượng: đã kết thúc = kết thúc thật − xuất bến (giờ XẢY RA, ADR-0050 VK1-A); đang chạy = bây giờ − xuất bến; chưa chạy = dự kiến. Chuyến huỷ không tính.
// - Người lái: dòng lái đang mở (TripRow.driver_party_id; LC-15 cấm đổi khi đang chạy nên là người lái lúc xuất bến). Áp mọi tài xế (công ty và nhà xe).
// - "Quá" = lớn hơn hẳn (K10). Chính sách rỗng → không cảnh báo (CHINH_SACH_RONG đã báo ở lịch).
import type { KhungChuyen } from "./dieu-phoi-kieu.ts";
import { msToVnLocal } from "./vn-date.ts";

export interface ChinhSachGioLai { dutyDayMaxMinutes: number; tripNoBreakMaxMinutes: number }
export type ChuyenGioLai = Pick<KhungChuyen, "id" | "ma" | "taiXePartyId" | "batDauMs" | "ketThucMs" | "ketThucThatMs" | "trangThai"> & { xuatBenMs?: number | null };
const PHUT = 60_000;
const ngayChayCua = (c: ChuyenGioLai): string => msToVnLocal(c.batDauMs).date;
const chuaKetThuc = (c: ChuyenGioLai): boolean => c.trangThai === "PLANNED" || c.trangThai === "RUNNING";

export function thoiLuongChuyenMs(c: ChuyenGioLai, bayGioMs: number): number {
  // xuatBenMs thiếu ở chuyến đã chạy là KHÔNG THỂ (CHECK 0042) — mapper bị ghim bằng bài dieu-phoi-doc.test.ts; dùng giờ dự kiến chỉ để hàm tổng quát.
  const xb = c.xuatBenMs ?? c.batDauMs;
  if (c.trangThai === "RUNNING") return Math.max(0, bayGioMs - xb);
  if (c.trangThai === "ENDED" || c.trangThai === "ENDED_INTERRUPTED") return Math.max(0, (c.ketThucThatMs ?? c.ketThucMs) - xb);
  return Math.max(0, c.ketThucMs - c.batDauMs);
}
const khongTrungId = (ds: readonly ChuyenGioLai[]): ChuyenGioLai[] => [...new Map(ds.map((c) => [c.id, c])).values()];

export function gioLaiTaiXe(taiXePartyId: string, chuyen: readonly ChuyenGioLai[], ngayChay: string, cs: ChinhSachGioLai | null, bayGioMs: number): { tongMs: number; vuot: boolean; chuyenIds: string[] } {
  const cua = khongTrungId(chuyen).filter((c) => c.taiXePartyId === taiXePartyId && c.trangThai !== "CANCELLED" && ngayChayCua(c) === ngayChay);
  const tongMs = cua.reduce((s, c) => s + thoiLuongChuyenMs(c, bayGioMs), 0);
  return { tongMs, vuot: cs !== null && tongMs > cs.dutyDayMaxMinutes * PHUT, chuyenIds: cua.map((c) => c.id).sort() };
}

export type LoaiCanhBaoGioLai = "GIO_LAI_VUOT" | "CHUYEN_DAI_CAN_NGHI";
export const NHAN_CANH_BAO_GIO_LAI: Readonly<Record<LoaiCanhBaoGioLai, string>> = {
  GIO_LAI_VUOT: "Tài xế lái quá giờ tối đa trong ngày",
  CHUYEN_DAI_CAN_NGHI: "Chuyến dài — nhớ cho tài xế nghỉ giữa chuyến",
};
export interface CanhBaoGioLai { loai: LoaiCanhBaoGioLai; tripId: string; taiXePartyId: string; tongPhut: number }

/** Cảnh báo cho các chuyến CHƯA kết thúc có tài xế (lọc thêm bằng `chiChuyen` khi chỉ cần chuyến đang xét). Tổng tính trên MỌI chuyến truyền vào. */
export function canhBaoGioLai(chuyen: readonly ChuyenGioLai[], cs: ChinhSachGioLai | null, bayGioMs: number, chiChuyen?: ReadonlySet<string>): CanhBaoGioLai[] {
  if (!cs) return [];
  const ds = khongTrungId(chuyen);
  const out: CanhBaoGioLai[] = [];
  for (const c of ds) {
    if (!chuaKetThuc(c) || c.taiXePartyId === null || (chiChuyen && !chiChuyen.has(c.id))) continue;
    const g = gioLaiTaiXe(c.taiXePartyId, ds, ngayChayCua(c), cs, bayGioMs);
    if (g.vuot) out.push({ loai: "GIO_LAI_VUOT", tripId: c.id, taiXePartyId: c.taiXePartyId, tongPhut: Math.floor(g.tongMs / PHUT) });
    const dai = thoiLuongChuyenMs(c, bayGioMs);
    if (dai > cs.tripNoBreakMaxMinutes * PHUT) out.push({ loai: "CHUYEN_DAI_CAN_NGHI", tripId: c.id, taiXePartyId: c.taiXePartyId, tongPhut: Math.floor(dai / PHUT) });
  }
  return out;
}
