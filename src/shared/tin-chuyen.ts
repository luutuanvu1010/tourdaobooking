// TIN CHUYẾN XE (ADR-0052 D6.2) — MỘT hàm thuần người nhận, dùng chung hộp thông báo (locHopThongBao), gõ cửa màn hình khoá (nguoiNhanDay) và nhãn
// Bảng tin (taiXeNhanSuKien). Không I/O. Không đọc `detail` nhật ký. Dữ kiện chỉ gồm khoá + mã chuyến, ngày chạy, mã đơn — không tên, SĐT, nơi.
// Thêm sự kiện D4/D5/ADR-0053: thêm phần tử HANH_DONG_TIN_CHUYEN + một nhánh trong `loaiCho` + một dòng CAU (bảng hai chiều — ADR-0052 dòng 211).
import { can, type PermissionHolder } from "./permissions.ts";
import type { ThayDoiChuyen } from "./bang-tin.ts";
import { msToVnLocal, ngayNgan } from "./vn-date.ts";

export const HANH_DONG_TIN_CHUYEN = [
  "trip_created", "trip_edited", "trip_cancelled", "trip_ended_interrupted", "trip_passenger_no_show",
  // Vận chuyển Đợt 5 (ADR-0052 D5, D6): văn phòng thay đổi xe ĐANG CHẠY → tài xế đang lái nhận tin. `trip_stops_synced` CHỈ khi chuyến đã xuất bến lúc sự kiện.
  "trip_stop_added_running", "trip_allocation_office_cancelled", "trip_stops_synced",
  // ADR-0097 Đ5 (gói A1, V3-B — chính ADR này là văn bản cho phép mở danh sách đóng, ADR-0052 :210): văn phòng điều chỉnh kết quả một khách / thu hồi xuất
  // bến → tài xế đang lái (dòng lái mở lúc sự kiện) + người có trip.dispatch. Người lập / phụ trách đơn KHÔNG nhận (đợt V5 — BL-CREW-TIN).
  "trip_allocation_corrected", "trip_departure_revoked",
] as const;
export const laHanhDongTinChuyen = (a: string): boolean => (HANH_DONG_TIN_CHUYEN as readonly string[]).includes(a);
export type LoaiTinChuyen = "xep_lai" | "go_lai" | "doi_chuyen" | "huy_chuyen" | "gian_doan" | "khach_vang" | "xe_chay_doi" | "thu_hoi_xuat_ben" | "dieu_chinh";
/**
 * Đợt 5: hành động văn phòng trên xe đang chạy — loại tin `xe_chay_doi`, loại Bảng tin `xe_chay` (khi chuyến đã xuất bến lúc sự kiện). ADR-0097: điều chỉnh kết
 * quả một khách cùng họ (luôn trên xe đang chạy). Thu hồi xuất bến KHÔNG ở đây: sau lệnh chuyến không còn giờ xuất bến (`xuatBen` null) — nhánh riêng.
 */
const HANH_DONG_XE_CHAY: ReadonlySet<string> = new Set(["trip_stop_added_running", "trip_allocation_office_cancelled", "trip_stops_synced", "trip_allocation_corrected"]);
const HANH_DONG_DIEU_CHINH: ReadonlySet<string> = new Set(["trip_allocation_corrected", "trip_departure_revoked"]);

export interface KhoangLai { partyId: string; tu: string; den: string | null }
export interface DonCuaTin { orderId: string; maDon: string; ownerId: string; handlerStaffId: string | null }
/** Một dòng `v_aud_trip_event` (chỉ khoá — không detail). `id` = id lệnh = id sự kiện `vc_trip_event`. */
export interface DongChuyenTho { id: string; tripId: string; actorId: string | null; action: string; luc: string }
/** Dữ kiện `van-chuyen` cấp qua hàm tiêm (`ctx.chuyenChoTin`) — thongbao không đọc bảng vc_. */
export interface ChuyenChoTin {
  /** `xuatBen` = giờ xuất bến (ISO) của chuyến, null = chưa xuất bến (Đợt 5 — tin "cập nhật điểm" chỉ khi xe đang chạy). */
  chuyen: { tripId: string; ma: string; ngayChay: string; lai: KhoangLai[]; xuatBen: string | null }[];
  vang: { suKienId: string; orderId: string }[];
  /**
   * MQ-07 (ADR-0052 D6.2): mọi suất KHÁCH của các chặng được hỏi (`legIds`), kèm khoảng hiệu lực — chuyến của chúng có mặt trong `chuyen`. Lọc "mở lúc sự kiện"
   * ở `chuyenCuaChangLuc` (thuần). Vắng = không hỏi chặng nào.
   */
  suatChang?: { legId: string; tripId: string; tu: string; den: string | null }[];
}
/** Câu hỏi dữ kiện chuyến của thongbao (hàm tiêm `ctx.chuyenChoTin`): theo chuyến, theo sự kiện vắng, và (MQ-07) theo chặng. */
export interface HoiChuyenChoTin { tripIds: readonly string[]; suKienIds: readonly string[]; legIds?: readonly string[] }
/** MQ-07: một chuyến đang giữ suất MỞ của chặng lúc sự kiện — ghép sẵn (mã, ngày, khoảng lái) để hộp thông báo lẫn gõ cửa dùng chung một hàm. */
export interface ChuyenCuaChang { tripId: string; ma: string; ngayChay: string; lai: KhoangLai[] }
export interface DongChuyen extends DongChuyenTho { maChuyen: string; ngayChay: string; lai: KhoangLai[]; don: DonCuaTin[]; xuatBen: string | null }
export interface NguoiNhanChuyen extends PermissionHolder { readonly partyId: string | null }

/** Dòng lái của `partyId` bao mốc `luc`: mở ≤ t và (còn mở hoặc đóng ≥ t) — so CHUỖI ISO (cùng `lucIso` của lệnh). */
export function laiLucSuKien(lai: readonly KhoangLai[], partyId: string, luc: string): KhoangLai | null {
  return lai.find((k) => k.partyId === partyId && k.tu <= luc && (k.den === null || k.den >= luc)) ?? null;
}

/** Chuyến đã xuất bến TRƯỚC (hoặc đúng) lúc sự kiện — so CHUỖI ISO. Dữ kiện cũ thiếu khoá → coi như chưa xuất bến (không đoán). */
export const dangChayLucSuKien = (d: Pick<DongChuyen, "xuatBen" | "luc">): boolean => typeof d.xuatBen === "string" && d.xuatBen <= d.luc;

function loaiCho(n: NguoiNhanChuyen, d: DongChuyen): LoaiTinChuyen | null {
  if (d.actorId === n.id) return null; // E3: không tự nhận tin của mình
  const k = n.partyId === null ? null : laiLucSuKien(d.lai, n.partyId, d.luc);
  if (k && can(n, "trip.view", { assigned: true })) {
    if (d.action === "trip_created") return "xep_lai";
    if (d.action === "trip_cancelled") return "huy_chuyen";
    // Dòng ĐÓNG đúng mốc xét trước dòng MỞ đúng mốc: dòng vừa tạo rồi bị đổi ra trong cùng mili-giây (chỉ xảy ra ở đồng hồ giả) vẫn là "không còn lái".
    if (d.action === "trip_edited") return k.den === d.luc ? "go_lai" : k.tu === d.luc ? "xep_lai" : "doi_chuyen";
    if (HANH_DONG_XE_CHAY.has(d.action) && dangChayLucSuKien(d)) return "xe_chay_doi";
    if (d.action === "trip_departure_revoked") return "thu_hoi_xuat_ben";
  }
  if (!can(n, "trip.view")) return null; // không ngữ cảnh = ô any (văn phòng). DRIVER (assigned) / FIELD / PARTNER / INTERN / DRIVER_PARTNER dừng ở đây.
  if (d.action === "trip_ended_interrupted" && can(n, "trip.dispatch")) return "gian_doan";
  if (HANH_DONG_DIEU_CHINH.has(d.action) && can(n, "trip.dispatch")) return "dieu_chinh"; // ADR-0097 Đ5 (khuôn tin "gián đoạn")
  if (d.action === "trip_passenger_no_show" && d.don.some((x) => x.ownerId === n.id || x.handlerStaffId === n.id)) return "khach_vang";
  return null;
}

const hoa = (s: string) => s.charAt(0).toLocaleUpperCase("vi-VN") + s.slice(1);
/** "chuyến <mã> ngày <dd/mm>" — năm khi khác năm của lúc sự kiện (Kiểu D). Một chỗ cho tin chuyến và tin MQ-07. */
const moTaChuyen = (ma: string, ngayChay: string, luc: string) => `chuyến ${ma} ngày ${ngayNgan(ngayChay, msToVnLocal(Date.parse(luc)).date)}`;

export function tinChuyenCho(n: NguoiNhanChuyen, d: DongChuyen): { loai: LoaiTinChuyen; cau: string; lienKet: string } | null {
  const loai = loaiCho(n, d);
  if (!loai) return null;
  const c = moTaChuyen(d.maChuyen, d.ngayChay, d.luc);
  const id = encodeURIComponent(d.tripId);
  switch (loai) {
    case "xep_lai": return { loai, cau: `Bạn được xếp lái ${c}`, lienKet: `/cuoc-chuyen?id=${id}` };
    case "go_lai": return { loai, cau: `Bạn không còn lái ${c}`, lienKet: "/cuoc" };
    case "doi_chuyen": return { loai, cau: `Văn phòng vừa sửa ${c} — mở để xem giờ, xe, điểm`, lienKet: `/cuoc-chuyen?id=${id}` };
    case "huy_chuyen": return { loai, cau: `${hoa(c)} đã bị huỷ`, lienKet: "/cuoc" };
    case "gian_doan": return { loai, cau: `${hoa(c)} kết thúc giữa chừng — cần xếp xe cho khách còn lại`, lienKet: `/chuyen?id=${id}` };
    case "xe_chay_doi": {
      // Lời chủ 5.3: tài xế xem giờ đón + tổng khách ở màn chuyến (liên kết) — câu tin không mang nơi / số / tên.
      const cau = d.action === "trip_stop_added_running" ? `Văn phòng vừa thêm khách vào ${c} — mở để xem điểm, giờ đón và số khách`
        : d.action === "trip_allocation_office_cancelled" ? `Văn phòng báo có khách huỷ ở ${c} — mở để xem`
        : d.action === "trip_allocation_corrected" ? `Văn phòng vừa điều chỉnh kết quả một khách ở ${c} — mở để xem`
        : `Văn phòng vừa đổi điểm đón ở ${c} — mở để xem`;
      return { loai, cau, lienKet: `/cuoc-chuyen?id=${id}` };
    }
    case "thu_hoi_xuat_ben": return { loai, cau: `Văn phòng vừa thu hồi xuất bến ${c} — chuyến về chưa chạy, bấm Xuất bến lại khi xe thật sự chạy`, lienKet: `/cuoc-chuyen?id=${id}` };
    case "dieu_chinh": {
      const cau = d.action === "trip_departure_revoked" ? `${hoa(c)} vừa được thu hồi xuất bến — mở để xem` : `${hoa(c)}: văn phòng vừa điều chỉnh kết quả một khách — mở để xem`;
      return { loai, cau, lienKet: `/chuyen?id=${id}` };
    }
    case "khach_vang": {
      const ma = d.don.find((x) => x.ownerId === n.id || x.handlerStaffId === n.id)!.maDon;
      return { loai, cau: `Có khách vắng ở ${c} (đơn ${ma})`, lienKet: `/chuyen?id=${id}` };
    }
  }
}

// ---- MQ-07 (ADR-0052 D6.2 dòng "giờ hẹn chặng đổi khi đã xếp"; chống trùng với tin đơn đổi — ADR-0062 Đ3) ----------------------------------------------
/** Hành động nhật ký sinh tin MQ-07 (D6.1: `order_leg_updated` của chặng đang có suất mở). Nguồn: view `v_aud_order_change` (cột `leg_id`), không phải v_aud_trip_event. */
export const HANH_DONG_TIN_GIO_HEN = ["order_leg_updated"] as const;
/** Một lần sửa chặng đã xếp: KHOÁ (người làm, lúc, đơn, người lập, người phụ trách) + chuyến giữ suất mở lúc sự kiện. Không tên, SĐT, nơi. */
export interface DongGioHen {
  actorId: string | null; luc: string; maDon: string; ownerId: string; handlerStaffId: string | null; chuyen: readonly ChuyenCuaChang[];
}

/** Chuyến giữ suất KHÁCH mở của chặng `legId` lúc `luc` (mở ≤ t và còn mở hoặc đóng ≥ t — so CHUỖI ISO), mỗi chuyến một lần, sắp theo mã. Thiếu dữ kiện → bỏ. */
export function chuyenCuaChangLuc(f: ChuyenChoTin, legId: string, luc: string): ChuyenCuaChang[] {
  const id = new Set((f.suatChang ?? []).filter((s) => s.legId === legId && s.tu <= luc && (s.den === null || s.den >= luc)).map((s) => s.tripId));
  return f.chuyen.filter((c) => id.has(c.tripId)).map((c) => ({ tripId: c.tripId, ma: c.ma, ngayChay: c.ngayChay, lai: c.lai })).sort((a, b) => (a.ma < b.ma ? -1 : a.ma > b.ma ? 1 : 0));
}

/**
 * Người nhận tin MQ-07 — MỘT hàm thuần (hộp thông báo + gõ cửa qua locHopThongBao). Nhận khi (và chỉ khi), không phải người làm:
 *   - tài xế có dòng lái bao lúc sự kiện trên một chuyến giữ suất của chặng, qua `can(trip.view, { assigned: true })` → "mở để xem" (không mã đơn);
 *   - người LẬP hoặc người PHỤ TRÁCH đơn, qua `can(trip.view)` (ô any) VÀ `can(trip.call_ack, { ownerId, assigned })` → "gọi báo khách". Quản trị có call_ack any
 *     nhưng không lập / không phụ trách thì KHÔNG nhận (việc gọi là của người phụ trách đơn — ADR-0051).
 * HDV, Đối tác, Thực tập (không trip.view) không bao giờ nhận — họ nhận tin đơn đổi (ADR-0062) nếu đủ điều kiện, do locHopThongBao quyết.
 */
export function tinGioHenCho(n: NguoiNhanChuyen, d: DongGioHen): { cau: string; lienKet: string } | null {
  if (d.actorId === n.id || d.chuyen.length === 0) return null;
  if (n.partyId !== null && can(n, "trip.view", { assigned: true })) {
    const pid = n.partyId;
    const c = d.chuyen.find((x) => laiLucSuKien(x.lai, pid, d.luc) !== null);
    if (c) return { cau: `Văn phòng vừa đổi giờ đón ở ${moTaChuyen(c.ma, c.ngayChay, d.luc)} — mở để xem`, lienKet: `/cuoc-chuyen?id=${encodeURIComponent(c.tripId)}` };
  }
  const assigned = d.handlerStaffId === n.id;
  if (!(d.ownerId === n.id || assigned) || !can(n, "trip.view") || !can(n, "trip.call_ack", { ownerId: d.ownerId, assigned })) return null;
  const c = d.chuyen[0]!;
  return { cau: `Đơn ${d.maDon}: giờ hẹn đổi ở ${moTaChuyen(c.ma, c.ngayChay, d.luc)} — gọi báo khách`, lienKet: `/chuyen?id=${encodeURIComponent(c.tripId)}` };
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
    out.push({ ...t, maChuyen: c.ma, ngayChay: c.ngayChay, lai: c.lai, don: ds, xuatBen: c.xuatBen ?? null });
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
  trip_passenger_boarded: "tien_do", trip_passenger_no_show: "vang", trip_passenger_cancelled_at_stop: "tien_do", trip_passenger_dropped: "tien_do",
  trip_stops_reordered: "tien_do", trip_ended: "ket_thuc", trip_ended_interrupted: "gian_doan",
  trip_stop_added_running: "xe_chay", trip_allocation_office_cancelled: "xe_chay",
  // ADR-0097: điều chỉnh khi xe đang chạy → "xe_chay" (họ HANH_DONG_XE_CHAY); thu hồi xuất bến → "sua" (văn phòng sửa chuyến; loại sẵn có tin — chuông gọi lại).
  trip_allocation_corrected: "xe_chay", trip_departure_revoked: "sua",
};
/** `dangChay` (Đợt 5): chuyến đã xuất bến lúc sự kiện — ba hành động xe đang chạy mang loại `xe_chay` (chuông tài xế gọi lại); còn lại như cũ. */
export const thayDoiCuaHanhDongChuyen = (action: string, dangChay = false): ThayDoiChuyen =>
  dangChay && HANH_DONG_XE_CHAY.has(action) ? "xe_chay" : (THAY_DOI_CUA[action] ?? "sua");

/** Loại thay đổi Bảng tin của các hành động CÓ THỂ sinh tin (suy từ HANH_DONG_TIN_CHUYEN — một nguồn; xét lúc xe đang chạy). Chuông chỉ gọi lại khi đợt có loại này. */
const THAY_DOI_CO_TIN: ReadonlySet<ThayDoiChuyen> = new Set(HANH_DONG_TIN_CHUYEN.map((a) => thayDoiCuaHanhDongChuyen(a, true)));
export const thayDoiCoTheCoTin = (t: ThayDoiChuyen): boolean => THAY_DOI_CO_TIN.has(t);
