// TIN CHUYẾN XE (ADR-0052 D6.2) — MỘT hàm thuần người nhận, dùng chung hộp thông báo (locHopThongBao), gõ cửa màn hình khoá (nguoiNhanDay) và nhãn
// Bảng tin (taiXeNhanSuKien). Không I/O. Không đọc `detail` nhật ký. Dữ kiện chỉ gồm khoá + mã chuyến, ngày chạy, mã đơn — không tên, SĐT, nơi.
// Thêm sự kiện D4/D5/ADR-0053: thêm phần tử HANH_DONG_TIN_CHUYEN + một nhánh trong `loaiCho` + một dòng CAU (bảng hai chiều — ADR-0052 dòng 211).
import { can, type PermissionHolder } from "./permissions.ts";
import type { ThayDoiChuyen } from "./bang-tin.ts";
import { msToVnLocal, ngayNgan } from "./vn-date.ts";

/**
 * ADR-0104 Đ1 mục 6: ba lệnh khách (xếp / rút / dời) — sinh tin CÓ ĐIỀU KIỆN (sự kiện mang luật bị bỏ qua — CAO-C, lời chủ 2026-10-08 "Báo mọi lệnh có bỏ qua
 * luật": mọi luật, không chỉ MOC_TOI_THIEU), chỉ cho tài xế đang lái. Phiếu kiểm D1 CAO-3: hộp thông báo đọc nhóm này RIÊNG (trần riêng) để dòng xếp / rút /
 * dời không đẩy tin của nhóm cũ ra khỏi hộp.
 */
export const HANH_DONG_TIN_KHACH = ["trip_allocated", "trip_allocation_removed", "trip_allocation_moved"] as const;
/** ADR-0111 (gói A5): hành động đề nghị chuyển khách CÓ tin (rút lại không có). Sự kiện ghi ở xe nhận; xe nhờ ở `related_trip_id` (đường tin riêng — T10). */
const HANH_DONG_TIN_CHUYEN_KHACH_CO = ["trip_transfer_sent"] as const;
export const HANH_DONG_TIN_CHUYEN = [
  "trip_created", "trip_edited", "trip_cancelled", "trip_ended_interrupted", "trip_passenger_no_show",
  // Vận chuyển Đợt 5 (ADR-0052 D5, D6): văn phòng thay đổi xe ĐANG CHẠY → tài xế đang lái nhận tin. `trip_stops_synced` CHỈ khi chuyến đã xuất bến lúc sự kiện.
  "trip_stop_added_running", "trip_allocation_office_cancelled", "trip_stops_synced",
  // ADR-0097 Đ5 (gói A1, V3-B — chính ADR này là văn bản cho phép mở danh sách đóng, ADR-0052 :210): văn phòng điều chỉnh kết quả một khách / thu hồi xuất
  // bến → tài xế đang lái (dòng lái mở lúc sự kiện) + người có trip.dispatch. Người lập / phụ trách đơn KHÔNG nhận (đợt V5 — BL-CREW-TIN).
  "trip_allocation_corrected", "trip_departure_revoked",
  // ADR-0104 Đ1 mục 6 (văn bản cho phép mở danh sách đóng): lệnh khách xếp / rút / dời — sinh tin CÓ ĐIỀU KIỆN: chỉ khi sự kiện mang luật bị bỏ qua
  // (`DongChuyen.khanCap` — CAO-C, lời chủ 2026-10-08: mọi luật, lệch có chủ ý với chữ ADR-0104 :95, SYSTEM-DESIGN §16) và chỉ cho tài xế có dòng lái lúc sự
  // kiện. Không bỏ qua luật nào → không ai nhận.
  ...HANH_DONG_TIN_KHACH,
  // ADR-0104 Đ2.10 (văn bản cho phép mở danh sách đóng): máy đồng bộ chuyến theo đơn — chỉ tài xế có dòng lái lúc sự kiện nhận ("khach_doi"); nhóm tin THƯỜNG
  // (không thuộc ba lệnh khách: không lọc theo luật vượt mốc). Máy không ghi lên xe đang chạy (Đ2.7) nên chuyến luôn chưa xuất bến lúc sự kiện.
  "trip_order_synced",
  // ADR-0111 Đ3 (d) + ADR-0052 D6.2 (văn bản cho phép mở danh sách đóng — gói A5): đề nghị chuyển khách giữa hai xe. Nhóm THƯỜNG (không lọc theo luật
  // vượt). Gửi → tài xế xe nhận; xác nhận / bác / hết hạn → tài xế xe nhận + tài xế xe nhờ; không nhận → tài xế xe nhờ; leo thang → người có trip.override.
  // Rút lại và tự huỷ (VOID) không sinh tin.
  ...HANH_DONG_TIN_CHUYEN_KHACH_CO,
] as const;
/** Phiếu kiểm D1 CAO-3: hành động sinh tin NGOÀI ba lệnh khách — nhóm cũ của hộp thông báo (trần riêng, không bị dòng xếp / rút / dời đẩy ra). */
export const HANH_DONG_TIN_THUONG: readonly string[] = HANH_DONG_TIN_CHUYEN.filter((a) => !(HANH_DONG_TIN_KHACH as readonly string[]).includes(a));
export const laHanhDongTinChuyen = (a: string): boolean => (HANH_DONG_TIN_CHUYEN as readonly string[]).includes(a);
export type LoaiTinChuyen =
  | "xep_lai" | "go_lai" | "doi_chuyen" | "huy_chuyen" | "gian_doan" | "khach_vang" | "xe_chay_doi" | "thu_hoi_xuat_ben" | "dieu_chinh" | "khan_cap" | "khach_doi"
  // ADR-0111 (gói A5): xe nhận có đề nghị tới; kết quả đề nghị (xe nhận / xe nhờ); đề nghị leo thang chờ duyệt (trip.override).
  | "de_nghi_toi" | "de_nghi_ket_qua" | "de_nghi_can_duyet";
/**
 * Đợt 5: hành động văn phòng trên xe đang chạy — loại tin `xe_chay_doi`, loại Bảng tin `xe_chay` (khi chuyến đã xuất bến lúc sự kiện). ADR-0097: điều chỉnh kết
 * quả một khách cùng họ (luôn trên xe đang chạy). Thu hồi xuất bến KHÔNG ở đây: sau lệnh chuyến không còn giờ xuất bến (`xuatBen` null) — nhánh riêng.
 */
const HANH_DONG_XE_CHAY: ReadonlySet<string> = new Set(["trip_stop_added_running", "trip_allocation_office_cancelled", "trip_stops_synced", "trip_allocation_corrected"]);
const HANH_DONG_DIEU_CHINH: ReadonlySet<string> = new Set(["trip_allocation_corrected", "trip_departure_revoked"]);
/** ADR-0104 Đ1 mục 6: lệnh khách có bỏ qua luật — phần hành động của câu (không tên, không SĐT, không nơi). */
const CAU_KHAN_CAP: Readonly<Record<string, string>> = {
  trip_allocated: "xếp thêm khách", trip_allocation_removed: "rút khách", trip_allocation_moved: "chuyển khách tới",
};
/** Dòng cần hỏi dữ kiện THEO SỰ KIỆN (`HoiChuyenChoTin.suKienIds`): khách vắng (đơn của suất) và lệnh khách có thể bỏ qua luật (cờ khanCap, vuotMoc). */
const HANH_DONG_KHAN_CAP: ReadonlySet<string> = new Set(HANH_DONG_TIN_KHACH);
export const canHoiTheoSuKien = (action: string): boolean => action === "trip_passenger_no_show" || HANH_DONG_KHAN_CAP.has(action) || action.startsWith("trip_transfer_");

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
   * ADR-0104 Đ1 mục 6 + CAO-C (lời chủ 2026-10-08 "Báo mọi lệnh có bỏ qua luật"): id sự kiện (trong `suKienIds` được hỏi) mang BẤT KỲ luật bị bỏ qua
   * (`override_rule_code IS NOT NULL`) — cờ tin cho tài xế. Tên giữ từ Đ1 (hợp đồng hàm tiêm). Vắng = không có.
   */
  khanCap?: string[];
  /** CAO-C: tập con của `khanCap` mang `MOC_TOI_THIEU` — câu "điều chỉnh khẩn cấp"; còn lại câu trung tính. Vắng = không có. */
  vuotMoc?: string[];
  /**
   * Phiếu kiểm D1 CAO-2 (ADR-0104 Đ1.6 :95, :232): sự kiện DỜI có bỏ qua luật (id trong `khanCap`) → chuyến NGUỒN (`related_trip_id`; sự kiện ghi ở đích).
   * Chuyến nguồn có mặt trong `chuyen` (kèm khoảng lái). Vắng = không có.
   */
  khanCapNguon?: { suKienId: string; tripId: string }[];
  /**
   * ADR-0111 (gói A5, kế hoạch T10 — đường tin chuyển khách RIÊNG, không qua cờ bỏ qua luật): sự kiện TRANSFER_* (id trong `suKienIds` được hỏi) → chuyến XE NHỜ
   * (`related_trip_id`; sự kiện ghi ở xe nhận). Chuyến nguồn có mặt trong `chuyen` (kèm khoảng lái). Vắng = không có.
   */
  chuyenKhachNguon?: { suKienId: string; tripId: string }[];
  /**
   * MQ-07 (ADR-0052 D6.2): mọi suất KHÁCH của các chặng được hỏi (`legIds`), kèm khoảng hiệu lực — chuyến của chúng có mặt trong `chuyen`. Lọc "mở lúc sự kiện"
   * ở `chuyenCuaChangLuc` (thuần). Vắng = không hỏi chặng nào.
   */
  suatChang?: { legId: string; tripId: string; tu: string; den: string | null }[];
}
/** Câu hỏi dữ kiện chuyến của thongbao (hàm tiêm `ctx.chuyenChoTin`): theo chuyến, theo sự kiện (vắng; cờ bỏ qua luật — `canHoiTheoSuKien`), và (MQ-07) theo chặng. */
export interface HoiChuyenChoTin { tripIds: readonly string[]; suKienIds: readonly string[]; legIds?: readonly string[] }
/** MQ-07: một chuyến đang giữ suất MỞ của chặng lúc sự kiện — ghép sẵn (mã, ngày, khoảng lái) để hộp thông báo lẫn gõ cửa dùng chung một hàm. */
export interface ChuyenCuaChang { tripId: string; ma: string; ngayChay: string; lai: KhoangLai[] }
export interface DongChuyen extends DongChuyenTho {
  maChuyen: string; ngayChay: string; lai: KhoangLai[]; don: DonCuaTin[]; xuatBen: string | null;
  /** ADR-0104 Đ1 mục 6 + CAO-C: sự kiện của dòng mang luật bị bỏ qua — mọi luật (chỉ cờ — không lý do, không người). Cờ SINH TIN của ba lệnh khách. */
  khanCap: boolean;
  /** CAO-C: luật bị bỏ qua là `MOC_TOI_THIEU` — câu "Văn phòng vừa điều chỉnh khẩn cấp …"; false → câu trung tính "Văn phòng vừa điều chỉnh …". */
  vuotMoc: boolean;
  /** Phiếu kiểm D1 CAO-2: dời có bỏ qua luật — chuyến NGUỒN (mã, ngày, khoảng lái) cho tin "chuyển khách đi" của tài xế nguồn. Vắng / null = không có. */
  nguon?: ChuyenCuaChang | null;
}
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
    if (d.khanCap && HANH_DONG_KHAN_CAP.has(d.action)) return "khan_cap"; // ADR-0104 Đ1 mục 6 + CAO-C (mọi luật bị bỏ qua): chỉ tài xế đang lái; văn phòng không nhận
    if (d.action === "trip_order_synced") return "khach_doi"; // ADR-0104 Đ2.10: chỉ tài xế đang lái; người sửa đơn (E3) và văn phòng không nhận
    if (d.action === "trip_transfer_sent") return "de_nghi_toi"; // ADR-0111 Đ3 (d): tài xế xe nhận
    if (KET_QUA_CHO_XE_NHAN.has(d.action)) return "de_nghi_ket_qua";
  }
  if (!can(n, "trip.view")) return null; // không ngữ cảnh = ô any (văn phòng). DRIVER (assigned) / FIELD / PARTNER / INTERN / DRIVER_PARTNER dừng ở đây.
  if (d.action === "trip_ended_interrupted" && can(n, "trip.dispatch")) return "gian_doan";
  if (HANH_DONG_DIEU_CHINH.has(d.action) && can(n, "trip.dispatch")) return "dieu_chinh"; // ADR-0097 Đ5 (khuôn tin "gián đoạn")
  if (d.action === "trip_transfer_escalated" && can(n, "trip.override")) return "de_nghi_can_duyet"; // ADR-0111 Đ1, ADR-0052 D4.2: người duyệt
  if (d.action === "trip_passenger_no_show" && d.don.some((x) => x.ownerId === n.id || x.handlerStaffId === n.id)) return "khach_vang";
  return null;
}

const hoa = (s: string) => s.charAt(0).toLocaleUpperCase("vi-VN") + s.slice(1);
/** "chuyến <mã> ngày <dd/mm>" — năm khi khác năm của lúc sự kiện (Kiểu D). Một chỗ cho tin chuyến và tin MQ-07. */
const moTaChuyen = (ma: string, ngayChay: string, luc: string) => `chuyến ${ma} ngày ${ngayNgan(ngayChay, msToVnLocal(Date.parse(luc)).date)}`;
/**
 * CAO-C (lời chủ 2026-10-08 "Báo mọi lệnh có bỏ qua luật"): câu tin của ba lệnh khách. Luật bị bỏ qua là MOC_TOI_THIEU (`vuotMoc`) → "điều chỉnh khẩn cấp"
 * (ADR-0104 Đ1.6); luật khác (khoảng nghỉ, cam kết — có thể do Quản trị làm lúc còn xa giờ chạy) → câu TRUNG TÍNH, không nói "khẩn cấp" / "6 giờ".
 */
const cauLenhKhach = (vuotMoc: boolean, chuyen: string, viec: string) =>
  `Văn phòng vừa điều chỉnh ${vuotMoc ? "khẩn cấp " : ""}${chuyen} (${viec}) — mở để xem`;

/** ADR-0111 (gói A5): kết quả đề nghị gửi tới TÀI XẾ XE NHẬN (sự kiện ghi ở xe nhận). */
const KET_QUA_CHO_XE_NHAN: ReadonlySet<string> = new Set(["trip_transfer_confirmed", "trip_transfer_rejected", "trip_transfer_expired"]);
/** ADR-0111 Đ3 (d): câu kết quả cho TÀI XẾ XE NHỜ (chuyến nguồn) — không tên khách, không nơi. Hành động vắng = xe nhờ không nhận tin. */
const CAU_XE_NHO: Readonly<Record<string, (c: string) => string>> = {
  trip_transfer_confirmed: (c) => `Xe nhận đã nhận khách của ${c} — mở để xem`,
  trip_transfer_declined: (c) => `Xe nhận không nhận khách của ${c} — mở để nhờ xe khác`,
  trip_transfer_expired: (c) => `Đề nghị chuyển khách của ${c} đã hết giờ chờ — mở để nhờ xe khác`,
  trip_transfer_rejected: (c) => `Văn phòng không duyệt đề nghị chuyển khách của ${c} — mở để nhờ xe khác`,
};
/** Câu kết quả cho TÀI XẾ XE NHẬN. */
const CAU_XE_NHAN: Readonly<Record<string, (c: string) => string>> = {
  trip_transfer_confirmed: (c) => `Khách đã chuyển sang ${c} — mở để xem điểm đón`,
  trip_transfer_expired: (c) => `Đề nghị chuyển khách tới ${c} đã hết giờ chờ`,
  trip_transfer_rejected: (c) => `Văn phòng không duyệt đề nghị chuyển khách tới ${c}`,
};

/**
 * Phiếu kiểm D1 CAO-2 (ADR-0104 Đ1.6 :95 "tin tới tài xế đang lái", :232 "chỉ chuyến có tài xế"; tiền lệ ADR-0052 D6.2 "tài xế nguồn, tài xế đích"): dời có
 * bỏ qua luật (CAO-C: mọi luật) — với chuyến NGUỒN lệnh dời là một lần rút khách ⇒ tài xế đang lái chuyến nguồn lúc sự kiện cũng nhận tin `khan_cap`
 * ("chuyển khách đi", liên kết chuyến nguồn; câu theo `vuotMoc`). Cùng dòng nhật ký, không thêm hành động. Người làm không nhận; người lái cả hai chuyến nhận
 * tin chuyến đích (một tin mỗi dòng).
 */
function tinNguonCho(n: NguoiNhanChuyen, d: DongChuyen): { loai: LoaiTinChuyen; cau: string; lienKet: string } | null {
  const g = d.nguon;
  const cauXeNho = CAU_XE_NHO[d.action];
  if (g && cauXeNho && d.actorId !== n.id && n.partyId !== null) {
    // ADR-0111 Đ3 (d) (T10): tài xế xe NHỜ (dòng lái chuyến nguồn bao lúc sự kiện) nhận kết quả đề nghị — không đòi cờ bỏ qua luật.
    if (!laiLucSuKien(g.lai, n.partyId, d.luc) || !can(n, "trip.view", { assigned: true })) return null;
    return { loai: "de_nghi_ket_qua", cau: cauXeNho(moTaChuyen(g.ma, g.ngayChay, d.luc)), lienKet: `/cuoc-chuyen?id=${encodeURIComponent(g.tripId)}` };
  }
  if (!g || !d.khanCap || d.action !== "trip_allocation_moved" || d.actorId === n.id || n.partyId === null) return null;
  if (!laiLucSuKien(g.lai, n.partyId, d.luc) || !can(n, "trip.view", { assigned: true })) return null;
  return {
    loai: "khan_cap", cau: cauLenhKhach(d.vuotMoc, moTaChuyen(g.ma, g.ngayChay, d.luc), "chuyển khách đi"),
    lienKet: `/cuoc-chuyen?id=${encodeURIComponent(g.tripId)}`,
  };
}

export function tinChuyenCho(n: NguoiNhanChuyen, d: DongChuyen): { loai: LoaiTinChuyen; cau: string; lienKet: string } | null {
  const loai = loaiCho(n, d);
  if (!loai) return tinNguonCho(n, d);
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
    case "khan_cap": return { loai, cau: cauLenhKhach(d.vuotMoc, c, CAU_KHAN_CAP[d.action] ?? "đổi khách"), lienKet: `/cuoc-chuyen?id=${id}` };
    case "khach_doi": return { loai, cau: `Đơn vừa đổi khách ở ${c} — mở để xem`, lienKet: `/cuoc-chuyen?id=${id}` };
    case "de_nghi_toi": return { loai, cau: `Có đề nghị chuyển khách tới ${c} — mở để Nhận hoặc Không nhận`, lienKet: `/cuoc-chuyen?id=${id}` };
    case "de_nghi_ket_qua": return { loai, cau: (CAU_XE_NHAN[d.action] ?? ((x: string) => `Đề nghị chuyển khách tới ${x} vừa đổi trạng thái`))(c), lienKet: `/cuoc-chuyen?id=${id}` };
    case "de_nghi_can_duyet": return { loai, cau: `Đề nghị chuyển khách tới ${c} cần văn phòng duyệt`, lienKet: "/de-nghi" };
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
  const khanCap = new Set(f.khanCap ?? []);
  const vuotMoc = new Set(f.vuotMoc ?? []);
  const nguonCua = new Map([...(f.khanCapNguon ?? []), ...(f.chuyenKhachNguon ?? [])].map((x) => [x.suKienId, x.tripId]));
  const out: DongChuyen[] = [];
  for (const t of tho) {
    const c = chuyen.get(t.tripId);
    if (!c) continue;
    const ds = f.vang.filter((v) => v.suKienId === t.id).map((v) => donTheoId.get(v.orderId)).filter((x): x is DonCuaTin => x !== undefined);
    const n = chuyen.get(nguonCua.get(t.id) ?? "");
    const nguon = n ? { tripId: n.tripId, ma: n.ma, ngayChay: n.ngayChay, lai: n.lai } : null;
    out.push({ ...t, maChuyen: c.ma, ngayChay: c.ngayChay, lai: c.lai, don: ds, xuatBen: c.xuatBen ?? null, khanCap: khanCap.has(t.id), vuotMoc: vuotMoc.has(t.id), nguon });
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
  // ADR-0104 Đ2.10: máy đồng bộ chuyến theo đơn — loại "cập nhật" (khuôn trip_passengers_synced; kế hoạch T2.15).
  trip_order_synced: "cap_nhat",
};
/** `dangChay` (Đợt 5): chuyến đã xuất bến lúc sự kiện — ba hành động xe đang chạy mang loại `xe_chay` (chuông tài xế gọi lại); còn lại như cũ. */
export const thayDoiCuaHanhDongChuyen = (action: string, dangChay = false): ThayDoiChuyen =>
  dangChay && HANH_DONG_XE_CHAY.has(action) ? "xe_chay" : (THAY_DOI_CUA[action] ?? "sua");

/** Loại thay đổi Bảng tin của các hành động CÓ THỂ sinh tin (suy từ HANH_DONG_TIN_CHUYEN — một nguồn; xét lúc xe đang chạy). Chuông chỉ gọi lại khi đợt có loại này. */
const THAY_DOI_CO_TIN: ReadonlySet<ThayDoiChuyen> = new Set(HANH_DONG_TIN_CHUYEN.map((a) => thayDoiCuaHanhDongChuyen(a, true)));
/**
 * Loại thay đổi của hành động chỉ sinh tin cho TÀI XẾ đang lái: ba lệnh khách (`khan_cap`, ADR-0104 Đ1.6) và máy đồng bộ theo đơn (`khach_doi`, Đ2.10 — loại
 * "cap_nhat", chung với cập nhật điểm / khách trên chuyến chưa chạy: không sinh tin cho ai ⇒ máy văn phòng vẫn không gọi lại).
 */
const HANH_DONG_TIN_CHI_TAI_XE: readonly string[] = [...HANH_DONG_TIN_KHACH, "trip_order_synced"];
const THAY_DOI_CHI_TAI_XE: ReadonlySet<ThayDoiChuyen> = new Set(HANH_DONG_TIN_CHI_TAI_XE.map((a) => thayDoiCuaHanhDongChuyen(a, true)));
/**
 * Chuông có cần gọi lại `/tom-tat` sau đợt sự kiện loại `t` không. `coTheLai` = máy của người có quyền Tài xế (`coCuocCuaToi`): xếp / rút / dời chỉ sinh tin
 * cho tài xế đang lái — máy văn phòng KHÔNG gọi lại sau mỗi lệnh xếp / rút / dời (phiếu kiểm D1 CAO-3; không đổi hợp đồng `SuKienChuyen`).
 */
export const thayDoiCoTheCoTin = (t: ThayDoiChuyen, coTheLai: boolean): boolean => THAY_DOI_CO_TIN.has(t) && (coTheLai || !THAY_DOI_CHI_TAI_XE.has(t));
/**
 * Dòng nhật ký chuyến này CÓ THỂ sinh tin cho ai đó — gốc lắp ráp chỉ gõ cửa khi đúng (phiếu kiểm D1 CAO-3): hành động trong danh sách; ba lệnh khách chỉ khi
 * sự kiện mang cờ bỏ qua luật (`khanCap` — CAO-C: mọi luật; không có cờ thì `tinChuyenCho` không trả tin cho ai — đỡ một lượt đọc máy nhận + tài khoản mỗi
 * lệnh xếp / rút / dời).
 */
export const dongCoTheSinhTin = (d: Pick<DongChuyen, "action" | "khanCap">): boolean => laHanhDongTinChuyen(d.action) && (!HANH_DONG_KHAN_CAP.has(d.action) || d.khanCap);
