// TIN CHUYẾN XE (ADR-0052 D6.2) — MỘT hàm thuần người nhận, dùng chung hộp thông báo (locHopThongBao), gõ cửa màn hình khoá (nguoiNhanDay) và nhãn
// Bảng tin (taiXeNhanSuKien). Không I/O. Không đọc `detail` nhật ký. Dữ kiện chỉ gồm khoá + mã chuyến, ngày chạy, mã đơn — không tên, SĐT, nơi.
// Thêm sự kiện D4/D5/ADR-0053: thêm phần tử HANH_DONG_TIN_CHUYEN + một nhánh trong `loaiCho` + một dòng CAU (bảng hai chiều — ADR-0052 dòng 211).
import { can, type PermissionHolder } from "./permissions.ts";
import type { ThayDoiChuyen } from "./bang-tin.ts";

export const HANH_DONG_TIN_CHUYEN = ["trip_created", "trip_edited", "trip_cancelled", "trip_ended_interrupted", "trip_passenger_no_show"] as const;
export const laHanhDongTinChuyen = (a: string): boolean => (HANH_DONG_TIN_CHUYEN as readonly string[]).includes(a);
export type LoaiTinChuyen = "xep_lai" | "go_lai" | "doi_chuyen" | "huy_chuyen" | "gian_doan" | "khach_vang";

export interface KhoangLai { partyId: string; tu: string; den: string | null }
export interface DonCuaTin { orderId: string; maDon: string; ownerId: string; handlerStaffId: string | null }
/** Một dòng `v_aud_trip_event` (chỉ khoá — không detail). `id` = id lệnh = id sự kiện `vc_trip_event`. */
export interface DongChuyenTho { id: string; tripId: string; actorId: string | null; action: string; luc: string }
/** Dữ kiện `van-chuyen` cấp qua hàm tiêm (`ctx.chuyenChoTin`) — thongbao không đọc bảng vc_. */
export interface ChuyenChoTin {
  chuyen: { tripId: string; ma: string; ngayChay: string; lai: KhoangLai[] }[];
  vang: { suKienId: string; orderId: string }[];
}
export interface DongChuyen extends DongChuyenTho { maChuyen: string; ngayChay: string; lai: KhoangLai[]; don: DonCuaTin[] }
export interface NguoiNhanChuyen extends PermissionHolder { readonly partyId: string | null }

/** Dòng lái của `partyId` bao mốc `luc`: mở ≤ t và (còn mở hoặc đóng ≥ t) — so CHUỖI ISO (cùng `lucIso` của lệnh). */
export function laiLucSuKien(lai: readonly KhoangLai[], partyId: string, luc: string): KhoangLai | null {
  return lai.find((k) => k.partyId === partyId && k.tu <= luc && (k.den === null || k.den >= luc)) ?? null;
}

function loaiCho(n: NguoiNhanChuyen, d: DongChuyen): LoaiTinChuyen | null {
  if (d.actorId === n.id) return null; // E3: không tự nhận tin của mình
  const k = n.partyId === null ? null : laiLucSuKien(d.lai, n.partyId, d.luc);
  if (k && can(n, "trip.view", { assigned: true })) {
    if (d.action === "trip_created") return "xep_lai";
    if (d.action === "trip_cancelled") return "huy_chuyen";
    if (d.action === "trip_edited") return k.tu === d.luc ? "xep_lai" : k.den === d.luc ? "go_lai" : "doi_chuyen";
  }
  if (!can(n, "trip.view")) return null; // không ngữ cảnh = ô any (văn phòng). DRIVER (assigned) / FIELD / PARTNER / INTERN / DRIVER_PARTNER dừng ở đây.
  if (d.action === "trip_ended_interrupted" && can(n, "trip.dispatch")) return "gian_doan";
  if (d.action === "trip_passenger_no_show" && d.don.some((x) => x.ownerId === n.id || x.handlerStaffId === n.id)) return "khach_vang";
  return null;
}

const ngayNgan = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const hoa = (s: string) => s.charAt(0).toLocaleUpperCase("vi-VN") + s.slice(1);

export function tinChuyenCho(n: NguoiNhanChuyen, d: DongChuyen): { loai: LoaiTinChuyen; cau: string; lienKet: string } | null {
  const loai = loaiCho(n, d);
  if (!loai) return null;
  const c = `chuyến ${d.maChuyen} ngày ${ngayNgan(d.ngayChay)}`;
  const id = encodeURIComponent(d.tripId);
  switch (loai) {
    case "xep_lai": return { loai, cau: `Bạn được xếp lái ${c}`, lienKet: `/cuoc-chuyen?id=${id}` };
    case "go_lai": return { loai, cau: `Bạn không còn lái ${c}`, lienKet: "/cuoc" };
    case "doi_chuyen": return { loai, cau: `Văn phòng vừa sửa ${c} — mở để xem giờ, xe, điểm`, lienKet: `/cuoc-chuyen?id=${id}` };
    case "huy_chuyen": return { loai, cau: `${hoa(c)} đã bị huỷ`, lienKet: "/cuoc" };
    case "gian_doan": return { loai, cau: `${hoa(c)} kết thúc giữa chừng — cần xếp xe cho khách còn lại`, lienKet: `/chuyen?id=${id}` };
    case "khach_vang": {
      const ma = d.don.find((x) => x.ownerId === n.id || x.handlerStaffId === n.id)!.maDon;
      return { loai, cau: `Có khách vắng ở ${c} (đơn ${ma})`, lienKet: `/chuyen?id=${id}` };
    }
  }
}

/** Ghép dòng nhật ký với dữ kiện van-chuyen + đơn. Chuyến không có dữ kiện (đã lạ) → bỏ dòng (không đoán). */
export function dungDongChuyen(tho: readonly DongChuyenTho[], f: ChuyenChoTin, don: readonly DonCuaTin[]): DongChuyen[] {
  const chuyen = new Map(f.chuyen.map((c) => [c.tripId, c]));
  const donTheoId = new Map(don.map((x) => [x.orderId, x]));
  const out: DongChuyen[] = [];
  for (const t of tho) {
    const c = chuyen.get(t.tripId);
    if (!c) continue;
    const ds = f.vang.filter((v) => v.suKienId === t.id).map((v) => donTheoId.get(v.orderId)).filter((x): x is DonCuaTin => x !== undefined);
    out.push({ ...t, maChuyen: c.ma, ngayChay: c.ngayChay, lai: c.lai, don: ds });
  }
  return out;
}

/** Bảng tin: id tài khoản tài xế có dòng lái bao mốc `luc` và qua can(trip.view, assigned). Người gọi đưa danh sách ĐANG HOẠT ĐỘNG. */
export function taiXeNhanSuKien(taiKhoan: readonly NguoiNhanChuyen[], lai: readonly KhoangLai[], luc: string): string[] {
  return taiKhoan
    .filter((t) => t.partyId !== null && laiLucSuKien(lai, t.partyId, luc) !== null && can(t, "trip.view", { assigned: true }))
    .map((t) => t.id);
}

const THAY_DOI_CUA: Record<string, ThayDoiChuyen> = {
  trip_created: "tao", trip_edited: "sua", trip_allocated: "xep", trip_allocation_removed: "rut", trip_allocation_moved: "doi", trip_cancelled: "huy",
  trip_stops_synced: "cap_nhat", trip_passengers_synced: "cap_nhat", trip_departed: "xuat_ben", trip_stop_arrived: "tien_do",
  trip_passenger_boarded: "tien_do", trip_passenger_no_show: "tien_do", trip_passenger_cancelled_at_stop: "tien_do", trip_passenger_dropped: "tien_do",
  trip_stops_reordered: "tien_do", trip_ended: "ket_thuc", trip_ended_interrupted: "gian_doan",
};
export const thayDoiCuaHanhDongChuyen = (action: string): ThayDoiChuyen => THAY_DOI_CUA[action] ?? "sua";
